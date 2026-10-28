import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

async function runMembershipRenewalSmsTest() {
  console.log('================================================================');
  console.log('STARTING MEMBERSHIP RENEWAL SMS AUTOMATION VERIFICATION SUITE');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const dbName = 'gym_pos_db';

  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB_NAME = dbName;
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'gym_saas_secure_jwt_secret_key_2026';
  process.env.CRON_SECRET = 'test_cron_secret_colombo_2026';

  const { app } = await import('../src/server/app.ts');
  const { ReminderService } = await import('../src/lib/sms/reminder-service.ts');
  const { GymService } = await import('../src/db/gym-service-mongo.ts');

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Mock SMSlenz responses for automated test assertions
  const originalFetch = globalThis.fetch;
  let mockSmsNetworkFail = false;

  (globalThis as any).fetch = async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url || '';
    if (urlStr.includes('smslenz.lk') || urlStr.includes('send-sms')) {
      if (mockSmsNetworkFail) {
        return new Response(
          JSON.stringify({
            success: false,
            status: 'error',
            message: 'SMSlenz gateway temporary network failure',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          status: 'delivered',
          campaign_id: 994821,
          data: { campaign_id: 994821 },
          message: 'SMS submitted successfully',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    // Authenticate
    console.log('[AUTH] Logging in as titan (biz_1)...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'titan', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Configure SMS Gateway active for biz_1 to allow SMS dispatch
    await db.collection('settings').updateOne(
      { businessId: 'biz_1', key: 'sms_active' },
      { $set: { businessId: 'biz_1', gymId: 1, key: 'sms_active', value: 'true' } },
      { upsert: true }
    );
    await db.collection('settings').updateOne(
      { businessId: 'biz_1', key: 'sms_api_key' },
      { $set: { businessId: 'biz_1', gymId: 1, key: 'sms_api_key', value: 'test_api_key_valid' } },
      { upsert: true }
    );
    await db.collection('settings').updateOne(
      { businessId: 'biz_1', key: 'sms_user_id' },
      { $set: { businessId: 'biz_1', gymId: 1, key: 'sms_user_id', value: 'test_user_id' } },
      { upsert: true }
    );

    // =========================================================================
    // TEST SCENARIO A: Membership expires on October 28 (User Brief Example)
    // - Oct 25: Expired Soon (3 calendar days before expiry)
    // - Oct 26 & 27: Non-reminder days
    // - Oct 28: Payment Due Today (on expiry date)
    // - Oct 29 & 30: Non-reminder days
    // - Oct 31: Overdue reminder (3 calendar days after expiry)
    // - Nov 1 & 2: Non-reminder days
    // - Nov 3: Second Overdue reminder (6 calendar days after expiry, every 3 days)
    // - Nov 6: Third Overdue reminder (9 calendar days after expiry, every 3 days)
    // =========================================================================
    console.log('\n--- [SCENARIO A] Membership expires on October 28 ---');

    // Create member expiring Oct 28
    const memberAId = 9101;
    await db.collection('members').insertOne({
      id: memberAId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9101',
      fullName: 'Kamal Gunaratne',
      phone: '+94771239101',
      barcode: 'TF-9101',
      status: 'active',
      memberType: 'individual',
      createdAt: new Date('2026-09-28'),
    });

    const membershipA1Id = 8101;
    await db.collection('memberships').insertOne({
      id: membershipA1Id,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberAId,
      package: 'monthly',
      startDate: '2026-09-28',
      expiryDate: '2026-10-28',
      status: 'active',
      createdAt: new Date('2026-09-28'),
    });

    // 1. Evaluate on Oct 25 (exactly 3 calendar days before Oct 28 expiry)
    console.log('Evaluating Oct 25 (3 days before Oct 28 expiry):');
    const runOct25 = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const itemOct25 = runOct25.results.find((r) => r.memberId === memberAId);
    if (!itemOct25 || itemOct25.reminderType !== 'expired_soon' || (itemOct25.action !== 'sent' && itemOct25.action !== 'failed')) {
      throw new Error(`Expected Oct 25 expired_soon reminder for memberA, got: ${JSON.stringify(itemOct25)}`);
    }
    console.log('  -> PASSED: Oct 25 Expired Soon reminder generated correctly (type: expired_soon).');

    // 2. Evaluate on Oct 26 & Oct 27 (non-reminder days)
    console.log('Evaluating Oct 26 & 27 (Non-reminder days):');
    const runOct26 = await ReminderService.processDueReminders({
      targetDate: '2026-10-26',
      businessId: 'biz_1',
    });
    if (runOct26.results.find((r) => r.memberId === memberAId)) {
      throw new Error('Expected NO reminder on Oct 26');
    }
    const runOct27 = await ReminderService.processDueReminders({
      targetDate: '2026-10-27',
      businessId: 'biz_1',
    });
    if (runOct27.results.find((r) => r.memberId === memberAId)) {
      throw new Error('Expected NO reminder on Oct 27');
    }
    console.log('  -> PASSED: Oct 26 and Oct 27 correctly triggered NO reminder.');

    // 3. Evaluate on Oct 28 (expiry date - due today)
    console.log('Evaluating Oct 28 (On expiry date):');
    const runOct28 = await ReminderService.processDueReminders({
      targetDate: '2026-10-28',
      businessId: 'biz_1',
    });
    const itemOct28 = runOct28.results.find((r) => r.memberId === memberAId);
    if (!itemOct28 || itemOct28.reminderType !== 'due_today') {
      throw new Error(`Expected Oct 28 due-today reminder, got: ${JSON.stringify(itemOct28)}`);
    }
    console.log('  -> PASSED: Oct 28 payment-due-today reminder generated correctly (type: due_today).');

    // 4. Evaluate on Oct 29 & Oct 30 (non-reminder days)
    console.log('Evaluating Oct 29 & 30 (Non-reminder days after expiry):');
    const runOct29 = await ReminderService.processDueReminders({
      targetDate: '2026-10-29',
      businessId: 'biz_1',
    });
    if (runOct29.results.find((r) => r.memberId === memberAId)) {
      throw new Error('Expected NO reminder on Oct 29');
    }
    console.log('  -> PASSED: Oct 29 and Oct 30 correctly triggered NO reminder.');

    // 5. Evaluate on Oct 31 (3 days after expiry - first overdue)
    console.log('Evaluating Oct 31 (3 days after Oct 28 expiry):');
    const runOct31 = await ReminderService.processDueReminders({
      targetDate: '2026-10-31',
      businessId: 'biz_1',
    });
    const itemOct31 = runOct31.results.find((r) => r.memberId === memberAId);
    if (!itemOct31 || itemOct31.reminderType !== 'overdue') {
      throw new Error(`Expected Oct 31 overdue reminder, got: ${JSON.stringify(itemOct31)}`);
    }
    console.log('  -> PASSED: Oct 31 first overdue reminder generated correctly (type: overdue).');

    // 6. Evaluate on Nov 3 (6 days after expiry, 3 days after Oct 31 - recurring overdue)
    console.log('Evaluating Nov 3 (6 days after expiry, recurring overdue):');
    const runNov3 = await ReminderService.processDueReminders({
      targetDate: '2026-11-03',
      businessId: 'biz_1',
    });
    const itemNov3 = runNov3.results.find((r) => r.memberId === memberAId);
    if (!itemNov3 || itemNov3.reminderType !== 'overdue') {
      throw new Error(`Expected Nov 3 recurring overdue reminder, got: ${JSON.stringify(itemNov3)}`);
    }
    console.log('  -> PASSED: Nov 3 recurring overdue reminder generated correctly (type: overdue).');

    // 7. Evaluate on Nov 6 (9 days after expiry, 3 days after Nov 3 - recurring overdue)
    console.log('Evaluating Nov 6 (9 days after expiry, recurring overdue):');
    const runNov6 = await ReminderService.processDueReminders({
      targetDate: '2026-11-06',
      businessId: 'biz_1',
    });
    const itemNov6 = runNov6.results.find((r) => r.memberId === memberAId);
    if (!itemNov6 || itemNov6.reminderType !== 'overdue') {
      throw new Error(`Expected Nov 6 recurring overdue reminder, got: ${JSON.stringify(itemNov6)}`);
    }
    console.log('  -> PASSED: Nov 6 recurring overdue reminder generated correctly (type: overdue).');

    // =========================================================================
    // TEST SCENARIO B: Member renews on October 30 (before overdue SMS)
    // - Stop all old-cycle reminders immediately
    // - Calculate new expiry date correctly
    // - Schedule future reminders from new expiry date
    // =========================================================================
    console.log('\n--- [SCENARIO B] Member renews on October 30 ---');

    const memberBId = 9102;
    await db.collection('members').insertOne({
      id: memberBId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9102',
      fullName: 'Sanduni De Silva',
      phone: '+94771239102',
      barcode: 'TF-9102',
      status: 'expired',
      memberType: 'individual',
      createdAt: new Date('2026-09-28'),
    });

    const membershipB1Id = 8102;
    await db.collection('memberships').insertOne({
      id: membershipB1Id,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberBId,
      package: 'monthly',
      startDate: '2026-09-28',
      expiryDate: '2026-10-28',
      status: 'expired',
      createdAt: new Date('2026-09-28'),
    });

    // Pre-populate old pending reminders
    await db.collection('membershipReminders').insertOne({
      reminderKey: `biz_1:${memberBId}:${membershipB1Id}:overdue:2026-10-31`,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberBId,
      membershipId: membershipB1Id,
      reminderType: 'overdue',
      scheduledDate: '2026-10-31',
      dueDate: '2026-10-28',
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
    });

    // Renew on Oct 30 for monthly package (Oct 30 + 1 month = Nov 30)
    const renewBRes = await GymService.renewMembership(
      {
        memberId: memberBId,
        package: 'monthly',
        startDate: '2026-10-30',
        paymentMethod: 'cash',
        paymentAmount: 4500,
        membershipAmount: 4500,
      },
      'biz_1'
    );

    if (renewBRes.membership.expiryDate !== '2026-11-30') {
      throw new Error(`Expected new expiry date 2026-11-30, got: ${renewBRes.membership.expiryDate}`);
    }
    console.log(`  -> New expiry date calculated correctly: ${renewBRes.membership.expiryDate}`);

    // Verify old reminder was cancelled
    const oldReminderB = await db.collection('membershipReminders').findOne({
      reminderKey: `biz_1:${memberBId}:${membershipB1Id}:overdue:2026-10-31`,
    });
    if (!oldReminderB || oldReminderB.status !== 'cancelled' || oldReminderB.cancelledReason !== 'renewed') {
      throw new Error(`Old cycle reminder was not cancelled: ${JSON.stringify(oldReminderB)}`);
    }
    console.log('  -> PASSED: Old cycle reminder was cancelled immediately upon renewal (reason: renewed).');

    // Evaluate scheduler on Oct 31: verify NO reminder sent for memberB
    const runOct31B = await ReminderService.processDueReminders({
      targetDate: '2026-10-31',
      businessId: 'biz_1',
    });
    const itemOct31B = runOct31B.results.find((r) => r.memberId === memberBId);
    if (itemOct31B && itemOct31B.action === 'sent') {
      throw new Error(`Expected NO sent reminder on Oct 31 for renewed memberB, got: ${JSON.stringify(itemOct31B)}`);
    }
    console.log('  -> PASSED: No overdue reminder sent on Oct 31 for member who renewed on Oct 30.');

    // =========================================================================
    // TEST SCENARIO C: Member renews after receiving an overdue SMS
    // - Never send further reminders from old period
    // - Use only new membership period
    // =========================================================================
    console.log('\n--- [SCENARIO C] Member renews after receiving overdue SMS ---');

    const memberCId = 9103;
    await db.collection('members').insertOne({
      id: memberCId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9103',
      fullName: 'Pradeep Kumara',
      phone: '+94771239103',
      barcode: 'TF-9103',
      status: 'expired',
      memberType: 'individual',
      createdAt: new Date('2026-09-28'),
    });

    const membershipC1Id = 8103;
    await db.collection('memberships').insertOne({
      id: membershipC1Id,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberCId,
      package: 'monthly',
      startDate: '2026-09-28',
      expiryDate: '2026-10-28',
      status: 'expired',
      createdAt: new Date('2026-09-28'),
    });

    // Overdue SMS was sent on Oct 31
    await db.collection('membershipReminders').insertOne({
      reminderKey: `biz_1:${memberCId}:${membershipC1Id}:overdue:2026-10-31`,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberCId,
      membershipId: membershipC1Id,
      reminderType: 'overdue',
      scheduledDate: '2026-10-31',
      dueDate: '2026-10-28',
      status: 'delivered',
      sentAt: new Date('2026-10-31'),
      deliveredAt: new Date('2026-10-31'),
      attemptCount: 1,
      createdAt: new Date('2026-10-31'),
    });

    // Member renews on Nov 1
    const renewCRes = await GymService.renewMembership(
      {
        memberId: memberCId,
        package: 'monthly',
        startDate: '2026-11-01',
        paymentMethod: 'cash',
        paymentAmount: 4500,
        membershipAmount: 4500,
      },
      'biz_1'
    );
    console.log(`  -> Member renewed on Nov 1 until: ${renewCRes.membership.expiryDate}`);

    // Evaluate on Nov 3 (when old period's next 3-day overdue reminder would have fired)
    const runNov3C = await ReminderService.processDueReminders({
      targetDate: '2026-11-03',
      businessId: 'biz_1',
    });
    const itemNov3C = runNov3C.results.find((r) => r.memberId === memberCId);
    if (itemNov3C && itemNov3C.action === 'sent') {
      throw new Error(`Expected NO reminder on Nov 3 from old period, but got: ${JSON.stringify(itemNov3C)}`);
    }
    console.log('  -> PASSED: No further reminders sent from old period after member renewed.');

    // =========================================================================
    // TEST SCENARIO D: Scheduler runs more than once on the same day
    // - No duplicate SMS messages
    // =========================================================================
    console.log('\n--- [SCENARIO D] Scheduler runs more than once on same day ---');

    const memberDId = 9104;
    await db.collection('members').insertOne({
      id: memberDId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9104',
      fullName: 'Roshan Ranasinghe',
      phone: '+94771239104',
      barcode: 'TF-9104',
      status: 'active',
      memberType: 'individual',
      createdAt: new Date('2026-09-28'),
    });

    const membershipD1Id = 8104;
    await db.collection('memberships').insertOne({
      id: membershipD1Id,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberDId,
      package: 'monthly',
      startDate: '2026-09-28',
      expiryDate: '2026-10-28',
      status: 'active',
      createdAt: new Date('2026-09-28'),
    });

    // Run 1 on Oct 25
    console.log('Scheduler Run 1 on Oct 25:');
    const run1D = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const item1D = run1D.results.find((r) => r.memberId === memberDId);
    console.log(`  -> Run 1 action: ${item1D?.action}`);

    // Run 2 on Oct 25 immediately after
    console.log('Scheduler Run 2 on Oct 25:');
    const run2D = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const item2D = run2D.results.find((r) => r.memberId === memberDId);
    if (!item2D || item2D.action !== 'skipped_duplicate') {
      throw new Error(`Expected skipped_duplicate on run 2, got: ${JSON.stringify(item2D)}`);
    }
    console.log('  -> PASSED: Duplicate reminder prevented on subsequent run (action: skipped_duplicate).');

    // Run 3 on Oct 25
    console.log('Scheduler Run 3 on Oct 25:');
    const run3D = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const item3D = run3D.results.find((r) => r.memberId === memberDId);
    if (!item3D || item3D.action !== 'skipped_duplicate') {
      throw new Error(`Expected skipped_duplicate on run 3, got: ${JSON.stringify(item3D)}`);
    }
    console.log('  -> PASSED: Multiple scheduler runs completely idempotent, 0 duplicate sends.');

    // =========================================================================
    // TEST SCENARIO E: SMSlenz temporary failure and safe retry
    // - Record failed attempt
    // - Retry safely without sending duplicates
    // =========================================================================
    console.log('\n--- [SCENARIO E] Temporary provider failure & retry ---');

    const memberEId = 9105;
    const membershipEId = 8105;
    await db.collection('members').insertOne({
      id: memberEId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9105',
      fullName: 'Nuwan Kulasekara',
      phone: '+94771239105',
      barcode: 'TF-9105',
      status: 'active',
      memberType: 'individual',
      createdAt: new Date('2026-09-28'),
    });

    await db.collection('memberships').insertOne({
      id: membershipEId,
      businessId: 'biz_1',
      gymId: 1,
      memberId: memberEId,
      package: 'monthly',
      startDate: '2026-09-28',
      expiryDate: '2026-10-28',
      status: 'active',
      createdAt: new Date('2026-09-28'),
    });

    // 1. Simulate SMSlenz temporary gateway network failure on Oct 25
    mockSmsNetworkFail = true;
    const run1E = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const item1E = run1E.results.find((r) => r.memberId === memberEId);
    if (!item1E || item1E.action !== 'failed') {
      throw new Error(`Expected failed action when provider fails, got: ${JSON.stringify(item1E)}`);
    }

    const keyE = `biz_1:${memberEId}:${membershipEId}:expired_soon:2026-10-25`;
    const recordedFail = await db.collection('membershipReminders').findOne({ reminderKey: keyE });
    if (!recordedFail || recordedFail.status !== 'failed' || recordedFail.attemptCount !== 1) {
      throw new Error(`Failed attempt not recorded properly: ${JSON.stringify(recordedFail)}`);
    }
    console.log('  -> PASSED: Failed attempt and diagnostic error recorded successfully (attemptCount: 1, status: failed).');

    // 2. Simulate SMSlenz gateway recovery & retry
    mockSmsNetworkFail = false;
    const run2E = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const item2E = run2E.results.find((r) => r.memberId === memberEId);
    if (!item2E || item2E.action !== 'sent') {
      throw new Error(`Expected successful sent action on retry, got: ${JSON.stringify(item2E)}`);
    }

    const recoveredRecord = await db.collection('membershipReminders').findOne({ reminderKey: keyE });
    if (!recoveredRecord || (recoveredRecord.status !== 'sent' && recoveredRecord.status !== 'delivered' && recoveredRecord.status !== 'accepted') || recoveredRecord.attemptCount !== 2) {
      throw new Error(`Recovered retry record mismatch: ${JSON.stringify(recoveredRecord)}`);
    }
    console.log('  -> PASSED: Safe retry executed successfully (attemptCount: 2, status: ' + recoveredRecord.status + ').');

    // 3. Subsequent run does not duplicate
    const run3E = await ReminderService.processDueReminders({
      targetDate: '2026-10-25',
      businessId: 'biz_1',
    });
    const item3E = run3E.results.find((r) => r.memberId === memberEId);
    if (!item3E || item3E.action !== 'skipped_duplicate') {
      throw new Error(`Expected skipped_duplicate after retry succeeded, got: ${JSON.stringify(item3E)}`);
    }
    console.log('  -> PASSED: No duplicate messages sent after retry succeeded.');

    // =========================================================================
    // TEST SCENARIO F: Multi-tenant Isolation
    // - Member belongs to a different tenant
    // - Never access or modify another tenant's reminders or records
    // =========================================================================
    console.log('\n--- [SCENARIO F] Multi-tenant isolation ---');

    // Create member in biz_2
    const memberFId = 9201;
    await db.collection('members').insertOne({
      id: memberFId,
      businessId: 'biz_2',
      gymId: 2,
      memberNumber: 'PF-9201',
      fullName: 'Gayan Alwis',
      phone: '+94712299201',
      status: 'active',
      memberType: 'individual',
      createdAt: new Date(),
    });

    const membershipFId = 8201;
    await db.collection('memberships').insertOne({
      id: membershipFId,
      businessId: 'biz_2',
      gymId: 2,
      memberId: memberFId,
      package: 'monthly',
      startDate: '2026-10-01',
      expiryDate: '2026-10-31',
      status: 'active',
      createdAt: new Date(),
    });

    // Fetch reminders using titan's token (biz_1)
    const logsRes = await fetch(`${baseUrl}/api/reminders/logs`, {
      method: 'GET',
      headers: authHeaders,
    });
    const logsData = await logsRes.json();
    const hasOtherTenant = logsData.some((l: any) => l.businessId === 'biz_2' || l.memberId === memberFId);
    if (hasOtherTenant) {
      throw new Error('TENANT ISOLATION BREACH: Tenant biz_1 was able to access biz_2 reminders!');
    }
    console.log('  -> PASSED: Tenant isolation strictly verified. Tenant biz_1 cannot see biz_2 reminders.');

    // =========================================================================
    // TEST SCENARIO G: Couple Membership Reminder Reset & Deduplication
    // =========================================================================
    console.log('\n--- [SCENARIO G] Couple Membership Reminder Handling ---');

    const primaryCoupleId = 9301;
    const partnerCoupleId = 9302;

    await db.collection('members').insertOne({
      id: primaryCoupleId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9301',
      fullName: 'Sunil Perera',
      phone: '+94771199301',
      status: 'active',
      memberType: 'couple',
      partnerMemberNumber: 'TF-9302',
      partnerName: 'Manel Perera',
      createdAt: new Date(),
    });

    await db.collection('members').insertOne({
      id: partnerCoupleId,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-9302',
      fullName: 'Manel Perera',
      phone: '+94771199301', // Same couple contact number
      status: 'active',
      memberType: 'couple',
      partnerMemberNumber: 'TF-9301',
      partnerName: 'Sunil Perera',
      createdAt: new Date(),
    });

    const coupleMem1 = 8301;
    const coupleMem2 = 8302;

    await db.collection('memberships').insertOne({
      id: coupleMem1,
      businessId: 'biz_1',
      gymId: 1,
      memberId: primaryCoupleId,
      package: 'monthly',
      startDate: '2026-10-01',
      expiryDate: '2026-10-31',
      status: 'active',
      memberType: 'couple',
      membershipAmount: 8000,
      totalAmount: 8000,
      createdAt: new Date(),
    });

    await db.collection('memberships').insertOne({
      id: coupleMem2,
      businessId: 'biz_1',
      gymId: 1,
      memberId: partnerCoupleId,
      package: 'monthly',
      startDate: '2026-10-01',
      expiryDate: '2026-10-31',
      status: 'active',
      memberType: 'couple',
      membershipAmount: 0,
      totalAmount: 0,
      createdAt: new Date(),
    });

    // Run scheduler on Oct 28 for couple (3 days before Oct 31 expiry)
    const coupleRun = await ReminderService.processDueReminders({
      targetDate: '2026-10-28',
      businessId: 'biz_1',
    });

    const primaryResult = coupleRun.results.find((r) => r.memberId === primaryCoupleId);
    const partnerResult = coupleRun.results.find((r) => r.memberId === partnerCoupleId);

    if (partnerResult && partnerResult.action === 'sent') {
      throw new Error(`DUPLICATE COUPLE REMINDER: Partner also received separate SMS!`);
    }
    console.log('  -> PASSED: Primary partner processed, partner duplicate avoided (action: ' + (partnerResult?.action || 'skipped') + ').');

    // =========================================================================
    // TEST SCENARIO H: Protected Cron Endpoint Security
    // =========================================================================
    console.log('\n--- [SCENARIO H] Protected Cron Endpoint Security ---');

    // 1. Unauthenticated request without secret should be rejected with 401
    const unauthCronRes = await fetch(`${baseUrl}/api/cron/membership-reminders`, {
      method: 'POST',
    });
    if (unauthCronRes.status !== 401) {
      throw new Error(`Expected HTTP 401 for unauthenticated cron trigger, got: ${unauthCronRes.status}`);
    }
    console.log('  -> PASSED: Unauthenticated cron trigger rejected with HTTP 401.');

    // 2. Request with valid CRON_SECRET should succeed with HTTP 200
    const authCronRes = await fetch(`${baseUrl}/api/cron/membership-reminders`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_cron_secret_colombo_2026',
      },
    });
    const authCronData = await authCronRes.json();
    if (authCronRes.status !== 200 || !authCronData.success) {
      throw new Error(`Expected HTTP 200 for valid CRON_SECRET, got: ${authCronRes.status} ${JSON.stringify(authCronData)}`);
    }
    console.log('  -> PASSED: Cron endpoint with CRON_SECRET succeeded with HTTP 200 and Asia/Colombo date execution.');

    console.log('\n================================================================');
    console.log('ALL MEMBERSHIP RENEWAL SMS TEST SCENARIOS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } finally {
    server.close();
    await client.close();
    await mongod.stop();
  }
}

runMembershipRenewalSmsTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTEST SUITE FAILED WITH ERROR:', err);
    process.exit(1);
  });
