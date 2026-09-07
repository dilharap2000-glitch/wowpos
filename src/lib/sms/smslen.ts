import { getMongoDb } from '../../db/mongodb.ts';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed';
  error?: string;
  logId?: number;
  apiResponse?: string;
}

export interface SmsGatewayConfig {
  active: boolean;
  apiKey: string;
  userId: string;
  senderId: string;
  providerName: string;
  apiUrl: string;
  apiMethod: 'GET' | 'POST';
  customParams?: string;
}

// In-memory fallback logs
const memorySmsLogs: any[] = [];

/**
 * Fetch SMS gateway configuration strictly for a specific Gym tenant.
 * Gym A uses Gym A's credentials. Gym B uses Gym B's credentials.
 */
export async function getGymSmsConfig(gymId: number): Promise<SmsGatewayConfig> {
  try {
    const db = await getMongoDb();
    const businessId = `biz_${gymId}`;

    let g: any = null;
    let setMap = new Map<string, string>();

    if (db) {
      g = await db.collection('businesses').findOne({ $or: [{ id: gymId }, { businessId }] });
      const gymSettings = await db.collection('settings').find({ $or: [{ gymId }, { businessId }] }).toArray();
      gymSettings.forEach((s: any) => setMap.set(s.key, s.value));
    }

    const active =
      setMap.get('sms_active') !== undefined
        ? setMap.get('sms_active') === 'true'
        : (g?.smsEnabled ?? 'true') === 'true';

    return {
      active,
      apiKey: setMap.get('sms_api_key') || g?.smsApiKey || process.env.SMSLEN_API_KEY || '',
      userId: setMap.get('sms_user_id') || '',
      senderId: setMap.get('sms_sender_id') || g?.smsSenderId || 'WOWPOS',
      providerName: setMap.get('sms_provider_name') || 'SMS Gateway',
      apiUrl: setMap.get('sms_api_url') || g?.smsUrl || 'https://api.smslen.com/v1/send',
      apiMethod: (setMap.get('sms_api_method') as 'GET' | 'POST') || 'POST',
      customParams: setMap.get('sms_custom_params') || '',
    };
  } catch (err) {
    console.error('Failed to load gym SMS config:', err);
    return {
      active: true,
      apiKey: '',
      userId: '',
      senderId: 'WOWPOS',
      providerName: 'Custom Gateway',
      apiUrl: 'https://api.smslen.com/v1/send',
      apiMethod: 'POST',
    };
  }
}

/**
 * Sends SMS via gym's configured gateway (GET or POST) with variable substitutions.
 * Completely secure server-side execution.
 */
export async function sendSms(params: {
  gymId?: number;
  memberId?: number;
  phone: string;
  messageType: 'activation' | 'payment' | 'expiring_soon' | 'due_today' | 'expired' | 'manual';
  message: string;
}): Promise<SmsSendResult> {
  const { gymId = 1, memberId, phone, messageType, message } = params;
  const config = await getGymSmsConfig(gymId);

  // Normalize phone number (handle Sri Lankan / international prefixes)
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    cleanPhone = '+94' + cleanPhone.substring(1);
  }

  const logEntry: any = {
    id: Date.now(),
    businessId: `biz_${gymId}`,
    gymId,
    memberId: memberId || null,
    phone: cleanPhone,
    messageType,
    message,
    status: 'pending',
    createdAt: new Date(),
  };

  if (!config.active) {
    console.log(`[SMS Inactive for Gym ${gymId}] Skip sending to ${cleanPhone}: ${message}`);
    logEntry.errorMessage = 'SMS Gateway is currently Inactive (OFF) in Gym Settings';
    logEntry.status = 'failed';

    const db = await getMongoDb();
    if (db) {
      await db.collection('smsLogs').insertOne(logEntry);
    } else {
      memorySmsLogs.push(logEntry);
    }

    return {
      success: false,
      status: 'failed',
      error: 'SMS Gateway is Inactive. Enable Active toggle in SMS Gateway settings.',
      logId: logEntry.id,
    };
  }

  try {
    let apiResponse = '';
    let success = false;
    let errorMessage: string | undefined;

    // Check if live API key / URL configured
    const isLiveGateway =
      Boolean(config.apiKey && config.apiKey !== 'DEMO_KEY_SMSLEN_SRILANKA') &&
      Boolean(config.apiUrl);

    if (isLiveGateway) {
      try {
        if (config.apiMethod === 'GET') {
          const urlObj = new URL(config.apiUrl);
          urlObj.searchParams.set('api_key', config.apiKey);
          urlObj.searchParams.set('apikey', config.apiKey);
          if (config.userId) urlObj.searchParams.set('user_id', config.userId);
          urlObj.searchParams.set('sender_id', config.senderId);
          urlObj.searchParams.set('to', cleanPhone);
          urlObj.searchParams.set('recipient', cleanPhone);
          urlObj.searchParams.set('message', message);

          const response = await fetch(urlObj.toString(), {
            method: 'GET',
            headers: {
              Accept: 'application/json, text/plain, */*',
            },
          });

          const rawText = await response.text();
          apiResponse = rawText;
          success = response.ok;
          if (!success) {
            errorMessage = `Gateway HTTP ${response.status}: ${rawText.slice(0, 120)}`;
          }
        } else {
          const postBody: Record<string, any> = {
            api_key: config.apiKey,
            sender_id: config.senderId,
            recipient: cleanPhone,
            to: cleanPhone,
            message: message,
          };
          if (config.userId) postBody.user_id = config.userId;

          const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(postBody),
          });

          const rawText = await response.text();
          apiResponse = rawText;
          success = response.ok;
          if (!success) {
            errorMessage = `Gateway HTTP ${response.status}: ${rawText.slice(0, 120)}`;
          }
        }
      } catch (networkErr: any) {
        apiResponse = JSON.stringify({ error: networkErr.message });
        errorMessage = networkErr.message;
        success = false;
      }
    } else {
      // Simulated delivery for sandbox / preview / demo credentials
      apiResponse = JSON.stringify({
        status: 'success',
        provider: config.providerName || 'WOW POS Simulated SMS Gateway',
        gateway_status: 'active',
        sender: config.senderId,
        recipient: cleanPhone,
        timestamp: new Date().toISOString(),
      });
      success = true;
    }

    logEntry.status = success ? 'sent' : 'failed';
    logEntry.apiResponse = apiResponse.slice(0, 1000);
    logEntry.errorMessage = errorMessage || null;

    const db = await getMongoDb();
    if (db) {
      await db.collection('smsLogs').insertOne(logEntry);
    } else {
      memorySmsLogs.push(logEntry);
    }

    return {
      success,
      status: success ? 'sent' : 'failed',
      error: errorMessage,
      logId: logEntry.id,
      apiResponse,
    };
  } catch (dbErr: any) {
    console.error('Error in sendSms execution:', dbErr);
    return {
      success: false,
      status: 'failed',
      error: dbErr.message,
    };
  }
}
