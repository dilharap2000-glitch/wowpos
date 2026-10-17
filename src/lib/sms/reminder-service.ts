import { getMongoDb } from '../../db/mongodb.ts';
import { sendSms } from './smslen.ts';
import { getColomboToday, addDaysToDateStr, getDaysRemaining } from '../date-utils.ts';
import type { ReminderType, ReminderStatus, MembershipReminder } from '../../types.ts';

// In-memory fallback storage when running without MongoDB
const memoryMembershipReminders: MembershipReminder[] = [];

export interface ReminderProcessResult {
  reminderKey: string;
  memberId: number;
  memberName: string;
  phone: string;
  reminderType: ReminderType;
  scheduledDate: string;
  dueDate: string;
  action: 'sent' | 'skipped_duplicate' | 'skipped_renewed' | 'skipped_partner' | 'failed';
  error?: string;
  campaignId?: string | null;
}

export interface ProcessDueRemindersOptions {
  targetDate?: string; // YYYY-MM-DD in Asia/Colombo (defaults to today)
  businessId?: string; // Optional tenant isolation filter
  gymId?: number;
  maxRetries?: number;
}

/**
 * Service to manage membership renewal reminders, duplicate prevention,
 * and cycle reset upon renewal according to WOW POS business rules.
 */
export class ReminderService {
  private static readonly MAX_RETRIES = 3;

  /**
   * Generates a deterministic, unique reminder key containing:
   * tenant (businessId), member (memberId), membership period (membershipId),
   * reminder type (reminderType), and due/scheduled date.
   */
  static buildReminderKey(
    businessId: string,
    memberId: number,
    membershipId: number,
    reminderType: ReminderType,
    scheduledDate: string
  ): string {
    return `${businessId}:${memberId}:${membershipId}:${reminderType}:${scheduledDate}`;
  }

  /**
   * Setup MongoDB indexes for membershipReminders collection
   */
  static async setupIndexes(): Promise<void> {
    try {
      const db = await getMongoDb();
      if (!db) return;
      await db.collection('membershipReminders').createIndex({ reminderKey: 1 }, { unique: true });
      await db.collection('membershipReminders').createIndex({ businessId: 1, memberId: 1 });
      await db.collection('membershipReminders').createIndex({ businessId: 1, status: 1 });
      await db.collection('membershipReminders').createIndex({ businessId: 1, membershipId: 1 });
      await db.collection('membershipReminders').createIndex({ scheduledDate: 1, status: 1 });
    } catch (err: any) {
      console.warn('Reminder index creation notice:', err?.message || err);
    }
  }

  /**
   * Reset reminder cycle when a membership is renewed:
   * 1. Invalidate/cancel all pending and failed reminders from the old membership period(s).
   * 2. Prevent any overdue or weekly reminders from previous cycles from being sent.
   * 3. Pre-schedule future reminders based ONLY on the new expiry date:
   *    - 2 days before new expiry (renewal reminder)
   *    - On new expiry date (due today reminder)
   *    - 3 days after new expiry (overdue reminder)
   * 4. For Couple memberships, reset the cycle for both partners without duplicating.
   */
  static async onMembershipRenewed(params: {
    businessId: string;
    gymId: number;
    memberId: number;
    memberName: string;
    memberPhone: string;
    memberType?: 'individual' | 'couple';
    partnerMemberNumber?: string | null;
    oldMembershipId?: number | null;
    newMembershipId: number;
    newStartDate: string;
    newExpiryDate: string;
    packageType: string;
  }): Promise<{ cancelledCount: number; scheduledCount: number }> {
    const {
      businessId,
      gymId,
      memberId,
      memberName,
      memberPhone,
      memberType = 'individual',
      partnerMemberNumber,
      newMembershipId,
      newStartDate,
      newExpiryDate,
      packageType,
    } = params;

    const db = await getMongoDb();
    const isCouple = memberType === 'couple';

    // 1. Determine all member IDs to reset (member + partner if couple)
    const affectedMemberIds: number[] = [memberId];
    if (isCouple && partnerMemberNumber) {
      try {
        if (db) {
          const partnerDoc = await db.collection('members').findOne({
            businessId,
            memberNumber: partnerMemberNumber,
          });
          if (partnerDoc && partnerDoc.id) {
            affectedMemberIds.push(partnerDoc.id);
          }
        }
      } catch (e) {
        console.warn('Could not locate partner for reminder reset:', e);
      }
    }

    // 2. Invalidate / cancel all pending/processing/failed reminders from OLD cycles
    let cancelledCount = 0;
    if (db) {
      const cancelRes = await db.collection('membershipReminders').updateMany(
        {
          businessId,
          memberId: { $in: affectedMemberIds },
          membershipId: { $ne: newMembershipId },
          status: { $in: ['pending', 'processing', 'failed'] },
        },
        {
          $set: {
            status: 'cancelled',
            cancelledReason: 'renewed',
            invalidatedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      cancelledCount = cancelRes.modifiedCount || 0;
    } else {
      for (const r of memoryMembershipReminders) {
        if (
          r.businessId === businessId &&
          affectedMemberIds.includes(r.memberId) &&
          r.membershipId !== newMembershipId &&
          (r.status === 'pending' || r.status === 'processing' || r.status === 'failed')
        ) {
          r.status = 'cancelled';
          r.cancelledReason = 'renewed';
          r.updatedAt = new Date();
          cancelledCount++;
        }
      }
    }

    // 3. Pre-schedule the 3 future reminders for the NEW cycle
    // Note: For couples, only schedule the reminders for the primary member to avoid duplicate partner SMS.
    const scheduledCount = await this.scheduleRemindersForPeriod({
      businessId,
      gymId,
      memberId,
      memberName,
      memberPhone,
      memberType,
      partnerMemberNumber,
      membershipId: newMembershipId,
      packageType,
      startDate: newStartDate,
      expiryDate: newExpiryDate,
    });

    return { cancelledCount, scheduledCount };
  }

  /**
   * Pre-schedules standard reminder records for a newly created or renewed membership period:
   * - 2 days before expiry (renewal reminder)
   * - On expiry date (due today reminder)
   * - 3 days after expiry (overdue reminder)
   */
  static async scheduleRemindersForPeriod(params: {
    businessId: string;
    gymId: number;
    memberId: number;
    memberName: string;
    memberPhone: string;
    memberType?: 'individual' | 'couple';
    partnerMemberNumber?: string | null;
    membershipId: number;
    packageType: string;
    startDate: string;
    expiryDate: string;
  }): Promise<number> {
    const {
      businessId,
      gymId,
      memberId,
      memberName,
      memberPhone,
      memberType = 'individual',
      partnerMemberNumber,
      membershipId,
      packageType,
      startDate,
      expiryDate,
    } = params;

    const db = await getMongoDb();
    const remindersToCreate: Array<{
      type: ReminderType;
      scheduledDate: string;
    }> = [
      {
        type: 'reminder_2_days',
        scheduledDate: addDaysToDateStr(expiryDate, -2),
      },
      {
        type: 'due_today',
        scheduledDate: expiryDate,
      },
      {
        type: 'overdue_3_days',
        scheduledDate: addDaysToDateStr(expiryDate, 3),
      },
    ];

    let createdCount = 0;
    for (const item of remindersToCreate) {
      const key = this.buildReminderKey(businessId, memberId, membershipId, item.type, item.scheduledDate);
      const reminderDoc: MembershipReminder = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        reminderKey: key,
        businessId,
        gymId,
        memberId,
        memberName,
        memberPhone,
        memberType,
        partnerMemberNumber: partnerMemberNumber || null,
        membershipId,
        package: packageType,
        membershipStartDate: startDate,
        membershipExpiryDate: expiryDate,
        reminderType: item.type,
        scheduledDate: item.scheduledDate,
        dueDate: expiryDate,
        status: 'pending',
        attemptCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (db) {
        try {
          const res = await db.collection('membershipReminders').updateOne(
            { reminderKey: key },
            { $setOnInsert: reminderDoc },
            { upsert: true }
          );
          if (res.upsertedCount > 0) createdCount++;
        } catch (e) {
          // Key collision or already exists - safe ignore
        }
      } else {
        const existingIdx = memoryMembershipReminders.findIndex((r) => r.reminderKey === key);
        if (existingIdx === -1) {
          memoryMembershipReminders.push(reminderDoc);
          createdCount++;
        }
      }
    }

    return createdCount;
  }

  /**
   * Main scheduler execution engine:
   * Evaluates all active memberships for the target date (defaulting to Asia/Colombo today).
   * Safe against concurrent executions, idempotent, and completely isolates tenants.
   */
  static async processDueReminders(options: ProcessDueRemindersOptions = {}): Promise<{
    success: boolean;
    date: string;
    timezone: string;
    processed: number;
    sent: number;
    failed: number;
    skippedDuplicates: number;
    skippedRenewed: number;
    results: ReminderProcessResult[];
  }> {
    const targetDate = options.targetDate || getColomboToday();
    const maxRetries = options.maxRetries || this.MAX_RETRIES;
    const db = await getMongoDb();

    const results: ReminderProcessResult[] = [];
    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skippedDuplicates = 0;
    let skippedRenewed = 0;

    // 1. Fetch businesses to evaluate
    let businesses: any[] = [];
    if (db) {
      const query: any = { status: 'active' };
      if (options.businessId) {
        query.businessId = options.businessId;
      }
      businesses = await db.collection('businesses').find(query).toArray();
    } else {
      // Memory fallback
      businesses = [{ id: 1, businessId: options.businessId || 'biz_1', gymName: 'ZENERGY FITNESS' }];
    }

    for (const biz of businesses) {
      const businessId = biz.businessId || `biz_${biz.id}`;
      const gymId = biz.id || 1;

      // Fetch all non-archived members for this tenant
      let members: any[] = [];
      if (db) {
        members = await db.collection('members').find({
          businessId,
          status: { $ne: 'archived' },
          archivedAt: null,
        }).toArray();
      }

      // Track couple members already reminded in this run to avoid partner duplicates
      const processedCouplesInRun = new Set<string>();

      for (const member of members) {
        processed++;

        // Get member's latest membership
        let latestMembership: any = null;
        if (db) {
          latestMembership = await db.collection('memberships')
            .find({ businessId, memberId: member.id })
            .sort({ expiryDate: -1, createdAt: -1, id: -1 })
            .limit(1)
            .next();
        }

        if (!latestMembership || !latestMembership.expiryDate) {
          continue;
        }

        const isCouple = (member.memberType || latestMembership.memberType) === 'couple';

        // Couple Membership Duplicate Prevention:
        // If this member is a secondary partner (e.g. 0 amount or linked to a primary partner memberNumber),
        // and we have already processed the primary partner in this run, skip sending to partner.
        if (isCouple && member.partnerMemberNumber) {
          const coupleKey = [member.memberNumber, member.partnerMemberNumber].sort().join(':');
          if (processedCouplesInRun.has(coupleKey)) {
            results.push({
              reminderKey: `couple_skipped_${member.id}`,
              memberId: member.id,
              memberName: member.fullName,
              phone: member.phone,
              reminderType: 'due_today',
              scheduledDate: targetDate,
              dueDate: latestMembership.expiryDate,
              action: 'skipped_partner',
            });
            continue;
          }
        }

        const expiryDate = latestMembership.expiryDate;
        const daysRemaining = getDaysRemaining(expiryDate, targetDate);

        // Determine if any reminder is scheduled for targetDate according to business rules:
        // - 2 days before expiry: reminder_2_days (daysRemaining === 2)
        // - On expiry date: due_today (daysRemaining === 0)
        // - 3 days after expiry: overdue_3_days (daysRemaining === -3)
        // - Every 7 days after 3-day overdue: overdue_weekly (daysRemaining <= -10 && (-daysRemaining - 3) % 7 === 0)
        let activeReminderType: ReminderType | null = null;

        if (daysRemaining === 2) {
          activeReminderType = 'reminder_2_days';
        } else if (daysRemaining === 0) {
          activeReminderType = 'due_today';
        } else if (daysRemaining === -3) {
          activeReminderType = 'overdue_3_days';
        } else if (daysRemaining <= -10 && (-daysRemaining - 3) % 7 === 0) {
          activeReminderType = 'overdue_weekly';
        }

        if (!activeReminderType) {
          // No reminder due on this date for this member
          continue;
        }

        // Construct unique reminder key
        const reminderKey = this.buildReminderKey(
          businessId,
          member.id,
          latestMembership.id,
          activeReminderType,
          targetDate
        );

        // ATOMIC CLAIM & DUPLICATE PREVENTION:
        // 1. Check if this reminder was already processed or cancelled
        let existingReminder: any = null;
        if (db) {
          existingReminder = await db.collection('membershipReminders').findOne({ reminderKey });
        } else {
          existingReminder = memoryMembershipReminders.find((r) => r.reminderKey === reminderKey);
        }

        if (existingReminder) {
          if (existingReminder.status === 'sent' || existingReminder.status === 'delivered') {
            skippedDuplicates++;
            results.push({
              reminderKey,
              memberId: member.id,
              memberName: member.fullName,
              phone: member.phone,
              reminderType: activeReminderType,
              scheduledDate: targetDate,
              dueDate: expiryDate,
              action: 'skipped_duplicate',
            });
            continue;
          }

          if (existingReminder.status === 'cancelled' || existingReminder.status === 'invalidated') {
            skippedRenewed++;
            results.push({
              reminderKey,
              memberId: member.id,
              memberName: member.fullName,
              phone: member.phone,
              reminderType: activeReminderType,
              scheduledDate: targetDate,
              dueDate: expiryDate,
              action: 'skipped_renewed',
            });
            continue;
          }

          // Safe concurrency lock check
          if (
            existingReminder.status === 'processing' &&
            existingReminder.lockUntil &&
            new Date(existingReminder.lockUntil).getTime() > Date.now()
          ) {
            continue;
          }

          // Check if retry limit exceeded for failed reminders
          if (existingReminder.status === 'failed' && (existingReminder.attemptCount || 0) >= maxRetries) {
            continue;
          }
        }

        // DOUBLE-CHECK RENEWAL STATUS:
        // If the membership being reminded is not the latest or has already expired and member renewed
        let newestCheck: any = null;
        if (db) {
          newestCheck = await db.collection('memberships').findOne(
            { businessId, memberId: member.id, expiryDate: { $gt: expiryDate } }
          );
        }
        if (newestCheck) {
          // Member has already renewed for a newer period!
          if (db) {
            await db.collection('membershipReminders').updateOne(
              { reminderKey },
              {
                $set: {
                  status: 'cancelled',
                  cancelledReason: 'renewed',
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            );
          }
          skippedRenewed++;
          results.push({
            reminderKey,
            memberId: member.id,
            memberName: member.fullName,
            phone: member.phone,
            reminderType: activeReminderType,
            scheduledDate: targetDate,
            dueDate: expiryDate,
            action: 'skipped_renewed',
          });
          continue;
        }

        // Atomically claim the reminder record for sending
        const lockUntil = new Date(Date.now() + 60000); // 1-minute concurrency lock
        const reminderBaseDoc: MembershipReminder = {
          id: existingReminder?.id || Date.now() + Math.floor(Math.random() * 1000),
          reminderKey,
          businessId,
          gymId,
          memberId: member.id,
          memberName: member.fullName,
          memberPhone: member.phone,
          memberType: isCouple ? 'couple' : 'individual',
          partnerMemberNumber: member.partnerMemberNumber || null,
          membershipId: latestMembership.id,
          package: latestMembership.package || 'monthly',
          membershipStartDate: latestMembership.startDate || targetDate,
          membershipExpiryDate: expiryDate,
          reminderType: activeReminderType,
          scheduledDate: targetDate,
          dueDate: expiryDate,
          status: 'processing',
          attemptCount: (existingReminder?.attemptCount || 0) + 1,
          lastAttemptAt: new Date(),
          createdAt: existingReminder?.createdAt || new Date(),
          updatedAt: new Date(),
        };

        if (db) {
          await db.collection('membershipReminders').updateOne(
            { reminderKey },
            {
              $set: {
                status: 'processing',
                lockUntil,
                lastAttemptAt: new Date(),
                updatedAt: new Date(),
              },
              $inc: { attemptCount: 1 },
              $setOnInsert: {
                id: reminderBaseDoc.id,
                businessId,
                gymId,
                memberId: member.id,
                memberName: member.fullName,
                memberPhone: member.phone,
                memberType: isCouple ? 'couple' : 'individual',
                partnerMemberNumber: member.partnerMemberNumber || null,
                membershipId: latestMembership.id,
                package: latestMembership.package || 'monthly',
                membershipStartDate: latestMembership.startDate || targetDate,
                membershipExpiryDate: expiryDate,
                reminderType: activeReminderType,
                scheduledDate: targetDate,
                dueDate: expiryDate,
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );
        } else {
          const idx = memoryMembershipReminders.findIndex((r) => r.reminderKey === reminderKey);
          if (idx !== -1) {
            memoryMembershipReminders[idx].status = 'processing';
            memoryMembershipReminders[idx].attemptCount = (memoryMembershipReminders[idx].attemptCount || 0) + 1;
            memoryMembershipReminders[idx].lastAttemptAt = new Date();
          } else {
            memoryMembershipReminders.push(reminderBaseDoc);
          }
        }

        // Construct customized message copy
        const gymName = biz.gymName || 'ZENERGY FITNESS';
        const cleanPkg = (latestMembership.package || 'monthly').replace(/_/g, ' ').toUpperCase();
        const couplePrefix = isCouple ? 'COUPLE ' : '';

        let smsMessage = '';
        let providerMsgType: 'expiring_soon' | 'due_today' | 'expired' = 'expiring_soon';

        if (activeReminderType === 'reminder_2_days') {
          providerMsgType = 'expiring_soon';
          smsMessage = `Reminder: Dear ${member.fullName}, your ${couplePrefix}${cleanPkg} membership at ${gymName} will expire in 2 days on ${expiryDate}. Please renew to continue seamless access.`;
        } else if (activeReminderType === 'due_today') {
          providerMsgType = 'due_today';
          smsMessage = `Payment Due Today: Dear ${member.fullName}, your ${couplePrefix}${cleanPkg} membership at ${gymName} expires today (${expiryDate}). Please renew today to maintain your membership.`;
        } else if (activeReminderType === 'overdue_3_days') {
          providerMsgType = 'expired';
          smsMessage = `Overdue Notice: Dear ${member.fullName}, your ${couplePrefix}${cleanPkg} membership at ${gymName} expired on ${expiryDate} and is now overdue. Please renew today to reactivate access.`;
        } else {
          providerMsgType = 'expired';
          smsMessage = `Renewal Reminder: Dear ${member.fullName}, your ${couplePrefix}${cleanPkg} membership at ${gymName} remains expired since ${expiryDate}. Please contact us or visit reception to renew.`;
        }

        // Dispatch SMS via existing SMSlenz service
        try {
          const sendRes = await sendSms({
            gymId,
            businessId,
            memberId: member.id,
            phone: member.phone,
            messageType: providerMsgType,
            message: smsMessage,
          });

          const finalStatus: ReminderStatus = sendRes.success
            ? sendRes.status === 'delivered'
              ? 'delivered'
              : 'sent'
            : 'failed';

          if (db) {
            await db.collection('membershipReminders').updateOne(
              { reminderKey },
              {
                $set: {
                  status: finalStatus,
                  httpStatus: sendRes.httpStatus,
                  campaignId: sendRes.campaignId ? String(sendRes.campaignId) : null,
                  providerResponse: sendRes.apiResponse || sendRes.apiStatus,
                  errorMessage: sendRes.error || null,
                  sentAt: sendRes.success ? new Date() : undefined,
                  deliveredAt: sendRes.status === 'delivered' ? new Date() : undefined,
                  lockUntil: null,
                  updatedAt: new Date(),
                },
              }
            );
          } else {
            const idx = memoryMembershipReminders.findIndex((r) => r.reminderKey === reminderKey);
            if (idx !== -1) {
              memoryMembershipReminders[idx].status = finalStatus;
              memoryMembershipReminders[idx].httpStatus = sendRes.httpStatus;
              memoryMembershipReminders[idx].campaignId = sendRes.campaignId ? String(sendRes.campaignId) : null;
              memoryMembershipReminders[idx].errorMessage = sendRes.error || null;
              if (sendRes.success) memoryMembershipReminders[idx].sentAt = new Date();
              memoryMembershipReminders[idx].updatedAt = new Date();
            }
          }

          if (sendRes.success) {
            sent++;
            results.push({
              reminderKey,
              memberId: member.id,
              memberName: member.fullName,
              phone: member.phone,
              reminderType: activeReminderType,
              scheduledDate: targetDate,
              dueDate: expiryDate,
              action: 'sent',
              campaignId: sendRes.campaignId ? String(sendRes.campaignId) : null,
            });

            // Mark couple as processed in this run to avoid duplicate partner SMS
            if (isCouple && member.partnerMemberNumber) {
              const coupleKey = [member.memberNumber, member.partnerMemberNumber].sort().join(':');
              processedCouplesInRun.add(coupleKey);
            }
          } else {
            failed++;
            results.push({
              reminderKey,
              memberId: member.id,
              memberName: member.fullName,
              phone: member.phone,
              reminderType: activeReminderType,
              scheduledDate: targetDate,
              dueDate: expiryDate,
              action: 'failed',
              error: sendRes.error || 'Provider rejected request',
            });
          }
        } catch (smsErr: any) {
          failed++;
          const errText = smsErr.message || 'SMS dispatch exception';
          if (db) {
            await db.collection('membershipReminders').updateOne(
              { reminderKey },
              {
                $set: {
                  status: 'failed',
                  errorMessage: errText,
                  lockUntil: null,
                  updatedAt: new Date(),
                },
              }
            );
          } else {
            const idx = memoryMembershipReminders.findIndex((r) => r.reminderKey === reminderKey);
            if (idx !== -1) {
              memoryMembershipReminders[idx].status = 'failed';
              memoryMembershipReminders[idx].errorMessage = errText;
            }
          }

          results.push({
            reminderKey,
            memberId: member.id,
            memberName: member.fullName,
            phone: member.phone,
            reminderType: activeReminderType,
            scheduledDate: targetDate,
            dueDate: expiryDate,
            action: 'failed',
            error: errText,
          });
        }
      }
    }

    return {
      success: true,
      date: targetDate,
      timezone: 'Asia/Colombo',
      processed,
      sent,
      failed,
      skippedDuplicates,
      skippedRenewed,
      results,
    };
  }

  /**
   * Retrieves reminder records for a tenant
   */
  static async getReminders(
    businessId: string,
    filter?: { status?: string; memberId?: number; limit?: number }
  ): Promise<MembershipReminder[]> {
    const db = await getMongoDb();
    const limit = filter?.limit || 100;
    const query: any = { businessId };
    if (filter?.status) query.status = filter.status;
    if (filter?.memberId) query.memberId = filter.memberId;

    if (db) {
      return (await db
        .collection('membershipReminders')
        .find(query)
        .sort({ scheduledDate: -1, createdAt: -1 })
        .limit(limit)
        .toArray()) as any[];
    }

    return memoryMembershipReminders
      .filter((r) => {
        if (r.businessId !== businessId) return false;
        if (filter?.status && r.status !== filter.status) return false;
        if (filter?.memberId && r.memberId !== filter.memberId) return false;
        return true;
      })
      .slice(-limit)
      .reverse();
  }

  /**
   * Returns summary counts of reminders for a tenant
   */
  static async getReminderStats(businessId: string): Promise<{
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    cancelled: number;
    total: number;
  }> {
    const reminders = await this.getReminders(businessId, { limit: 1000 });
    const stats = {
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      total: reminders.length,
    };
    for (const r of reminders) {
      if (r.status === 'pending') stats.pending++;
      else if (r.status === 'sent') stats.sent++;
      else if (r.status === 'delivered') stats.delivered++;
      else if (r.status === 'failed') stats.failed++;
      else if (r.status === 'cancelled' || r.status === 'invalidated') stats.cancelled++;
    }
    return stats;
  }
}
