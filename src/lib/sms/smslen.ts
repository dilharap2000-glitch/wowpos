import { getMongoDb } from '../../db/mongodb.ts';

export interface SmsSendResult {
  success: boolean;
  httpStatus: number;
  apiStatus: string;
  providerStatus: string;
  campaignId?: string | number | null;
  maskedRecipient: string;
  senderId: string;
  endpoint: string;
  status: 'accepted' | 'delivered' | 'failed';
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

// In-memory fallback logs when MongoDB is unavailable
const memorySmsLogs: any[] = [];

/**
 * Normalizes Sri Lankan mobile numbers to standard +947XXXXXXXX format:
 * - 0771234567  -> +94771234567
 * - 94771234567 -> +94771234567
 * - +94771234567 -> +94771234567
 * - 0094771234567 -> +94771234567
 * - 771234567   -> +94771234567
 * - Strips formatting characters (spaces, hyphens, brackets, dots)
 */
export function normalizeSriLankanPhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // If already starts with +94
  if (cleaned.startsWith('+94')) {
    return '+94' + cleaned.slice(3).replace(/\D/g, '');
  }

  // If starts with 0094
  if (cleaned.startsWith('0094')) {
    return '+94' + cleaned.slice(4).replace(/\D/g, '');
  }

  // If starts with 94
  if (cleaned.startsWith('94')) {
    return '+94' + cleaned.slice(2).replace(/\D/g, '');
  }

  // If starts with 0 (e.g. 0771234567)
  if (cleaned.startsWith('0')) {
    return '+94' + cleaned.slice(1).replace(/\D/g, '');
  }

  // If 9 digits starting with 7 (e.g. 771234567)
  if (/^7\d{8}$/.test(cleaned)) {
    return '+94' + cleaned;
  }

  // Other international formats with leading +
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }

  // Digits fallback
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 9 && digitsOnly.startsWith('7')) {
    return '+94' + digitsOnly;
  }
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    return '+94' + digitsOnly.slice(1);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('94')) {
    return '+' + digitsOnly;
  }

  return cleaned;
}

/**
 * Masks a mobile number for safe display and logging without exposing the full phone number:
 * e.g. +94771234567 -> +9477****567
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 6) return '****';
  const start = clean.slice(0, 5);
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

/**
 * Sanitizes any text string to strip out sensitive API keys and tokens before logging or returning to client.
 */
export function sanitizeSensitiveText(text: string, sensitiveKey?: string): string {
  if (!text) return '';
  let cleaned = text;
  if (sensitiveKey && sensitiveKey.length >= 4) {
    cleaned = cleaned.replaceAll(sensitiveKey, '[REDACTED_API_KEY]');
  }
  // Mask generic api_key patterns
  cleaned = cleaned.replace(/(["']?api[_-]?key["']?\s*[:=]\s*["'])([^"'&\s]+)(["']?)/gi, '$1[REDACTED_API_KEY]$3');
  cleaned = cleaned.replace(/(api_key=)([^&\s]+)/gi, '$1[REDACTED_API_KEY]');
  return cleaned;
}

/**
 * Fetch SMS gateway configuration strictly for a specific Gym tenant.
 * Defaults strictly to the approved ZENERGY GYM sender ID and official SMSlenz endpoint.
 */
export async function getGymSmsConfig(gymIdOrBusinessId: number | string = 1): Promise<SmsGatewayConfig> {
  try {
    const db = await getMongoDb();
    const gymId = typeof gymIdOrBusinessId === 'number' ? gymIdOrBusinessId : parseInt(String(gymIdOrBusinessId).replace(/\D/g, ''), 10) || 1;
    const businessId = typeof gymIdOrBusinessId === 'string' && gymIdOrBusinessId.startsWith('biz_') ? gymIdOrBusinessId : `biz_${gymId}`;

    let g: any = null;
    const setMap = new Map<string, string>();

    if (db) {
      g = await db.collection('businesses').findOne({ $or: [{ id: gymId }, { businessId }] });
      const gymSettings = await db.collection('settings').find({ $or: [{ gymId }, { businessId }] }).toArray();
      gymSettings.forEach((s: any) => setMap.set(s.key, s.value));
    }

    const active =
      setMap.get('sms_active') !== undefined
        ? setMap.get('sms_active') === 'true'
        : (g?.smsEnabled ?? 'true') === 'true';

    // API Key: Database setting -> Business doc -> Environment variables
    const rawApiKey =
      setMap.get('sms_api_key') ||
      g?.smsApiKey ||
      process.env.SMSLENZ_API_KEY ||
      process.env.SMSLEN_API_KEY ||
      '';

    // User ID: Database setting -> Business doc -> Environment variables
    const rawUserId =
      setMap.get('sms_user_id') ||
      g?.smsUserId ||
      process.env.SMSLENZ_USER_ID ||
      process.env.SMSLEN_USER_ID ||
      '';

    // Sender ID: MUST remain "ZENERGY GYM" (approved by SMSlenz). Never replace with SMSlenzDEMO or generic placeholders.
    let configuredSenderId = setMap.get('sms_sender_id') || g?.smsSenderId || process.env.SMSLEN_SENDER_ID || 'ZENERGY GYM';
    if (!configuredSenderId || configuredSenderId === 'GYMFIT' || configuredSenderId === 'TITANFIT' || configuredSenderId === 'WOWPOS' || configuredSenderId === 'SMSlenzDEMO') {
      configuredSenderId = 'ZENERGY GYM';
    }

    // Official SMSlenz endpoint
    let configuredUrl = setMap.get('sms_api_url') || g?.smsUrl || process.env.SMSLEN_API_URL || 'https://www.smslenz.lk/api/send-sms';
    if (!configuredUrl || configuredUrl.includes('api.smslen.com')) {
      configuredUrl = 'https://www.smslenz.lk/api/send-sms';
    }

    const providerName = setMap.get('sms_provider_name') || 'SMSlenz Sri Lanka';
    const apiMethod = ((setMap.get('sms_api_method') as 'GET' | 'POST') || 'POST').toUpperCase() as 'GET' | 'POST';

    return {
      active,
      apiKey: rawApiKey,
      userId: rawUserId,
      senderId: configuredSenderId,
      providerName,
      apiUrl: configuredUrl,
      apiMethod,
      customParams: setMap.get('sms_custom_params') || '',
    };
  } catch (err) {
    console.error('Failed to load gym SMS config:', err);
    return {
      active: true,
      apiKey: process.env.SMSLENZ_API_KEY || process.env.SMSLEN_API_KEY || '',
      userId: process.env.SMSLENZ_USER_ID || process.env.SMSLEN_USER_ID || '',
      senderId: 'ZENERGY GYM',
      providerName: 'SMSlenz Sri Lanka',
      apiUrl: 'https://www.smslenz.lk/api/send-sms',
      apiMethod: 'POST',
    };
  }
}

/**
 * Sends SMS via official SMSlenz Sri Lanka API (https://www.smslenz.lk/api/send-sms).
 * 
 * Required parameters:
 * - user_id
 * - api_key
 * - sender_id
 * - contact (normalized +947XXXXXXXX)
 * - message
 * 
 * Critical constraints respected:
 * 1. Normalized Sri Lankan phone number (+94...)
 * 2. URLSearchParams used for GET with "+" properly encoded as %2B
 * 3. POST preferred as primary method
 * 4. Sender ID remains "ZENERGY GYM"
 * 5. Credentials remain server-side only; never logged, never sent to browser
 * 6. Safely logs only: HTTP status, success, provider status, campaign_id, masked recipient, error message
 * 7. Does NOT report "SMS Delivered" merely for HTTP 200 (distinguishes accepted/queued from delivered)
 * 8. Returns comprehensive diagnostic object for UI feedback
 */
export async function sendSms(params: {
  gymId?: number;
  businessId?: string;
  memberId?: number;
  phone: string;
  messageType: 'activation' | 'payment' | 'expiring_soon' | 'due_today' | 'expired' | 'manual';
  message: string;
}): Promise<SmsSendResult> {
  const { gymId = 1, memberId, phone, messageType, message } = params;
  const config = await getGymSmsConfig(gymId);

  // 1. Normalize recipient phone number
  const normalizedPhone = normalizeSriLankanPhone(phone);
  const maskedPhone = maskPhoneNumber(normalizedPhone);

  const endpointUrl = config.apiUrl || 'https://www.smslenz.lk/api/send-sms';
  const senderId = config.senderId || 'ZENERGY GYM';

  // Base log structure
  const logEntry: any = {
    id: Date.now(),
    businessId: `biz_${gymId}`,
    gymId,
    memberId: memberId || null,
    phone: maskedPhone, // RECIPIENT NUMBER MASKED IN LOGS
    senderId,
    messageType,
    message,
    httpStatus: 0,
    success: false,
    providerStatus: 'pending',
    campaignId: null,
    status: 'failed',
    errorMessage: null,
    apiResponse: null,
    createdAt: new Date(),
  };

  // Check if gateway is toggled active
  if (!config.active) {
    const errorMsg = 'SMS Gateway is currently Inactive (OFF) in Gym Settings';
    logEntry.errorMessage = errorMsg;
    logEntry.status = 'failed';
    logEntry.providerStatus = 'disabled';

    await saveSmsLog(logEntry);

    return {
      success: false,
      httpStatus: 0,
      apiStatus: 'Gateway Disabled',
      providerStatus: 'inactive',
      campaignId: null,
      maskedRecipient: maskedPhone,
      senderId,
      endpoint: endpointUrl,
      status: 'failed',
      error: errorMsg,
      logId: logEntry.id,
    };
  }

  // Validate phone format
  if (!normalizedPhone || normalizedPhone.length < 10) {
    const errorMsg = `Invalid phone number format: "${phone}". Expected Sri Lankan mobile number (e.g. 0771234567 or +94771234567).`;
    logEntry.errorMessage = errorMsg;
    logEntry.status = 'failed';
    logEntry.providerStatus = 'invalid_recipient';

    await saveSmsLog(logEntry);

    return {
      success: false,
      httpStatus: 400,
      apiStatus: 'HTTP 400 Bad Request (Validation)',
      providerStatus: 'invalid_recipient',
      campaignId: null,
      maskedRecipient: maskedPhone || phone,
      senderId,
      endpoint: endpointUrl,
      status: 'failed',
      error: errorMsg,
      logId: logEntry.id,
    };
  }

  try {
    let httpStatus = 0;
    let rawResponseText = '';
    let responseJson: any = null;
    let providerStatus = 'unknown';
    let campaignId: string | number | null = null;
    let isSuccess = false;
    let isDelivered = false;
    let errorMessage: string | undefined;

    // Check if live credentials exist
    const hasLiveCredentials = Boolean(config.apiKey && config.userId);

    if (hasLiveCredentials) {
      if (config.apiMethod === 'GET') {
        // Construct GET request with URLSearchParams.
        // URLSearchParams automatically encodes '+' as '%2B' for the contact number.
        const urlObj = new URL(endpointUrl);
        urlObj.searchParams.set('user_id', config.userId);
        urlObj.searchParams.set('api_key', config.apiKey);
        urlObj.searchParams.set('sender_id', senderId);
        urlObj.searchParams.set('contact', normalizedPhone); // '+' is encoded as '%2B'
        urlObj.searchParams.set('message', message);

        const response = await fetch(urlObj.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json, text/plain, */*',
          },
        });

        httpStatus = response.status;
        rawResponseText = await response.text();
      } else {
        // Preferred Method: POST (JSON body)
        const payload = {
          user_id: config.userId,
          api_key: config.apiKey,
          sender_id: senderId,
          contact: normalizedPhone,
          message: message,
        };

        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*',
          },
          body: JSON.stringify(payload),
        });

        httpStatus = response.status;
        rawResponseText = await response.text();
      }

      // Try parsing response as JSON
      try {
        responseJson = JSON.parse(rawResponseText);
      } catch {
        responseJson = null;
      }

      // Extract details from SMSlenz response format
      if (responseJson) {
        // Extract Campaign ID
        campaignId =
          responseJson.campaign_id ??
          responseJson.campaignId ??
          responseJson.data?.campaign_id ??
          responseJson.data?.campaignId ??
          responseJson.id ??
          null;

        // Extract Provider Status
        providerStatus =
          responseJson.status ??
          responseJson.provider_status ??
          responseJson.delivery_status ??
          (httpStatus >= 200 && httpStatus < 300 ? 'accepted' : 'error');

        // Check success
        if (httpStatus >= 200 && httpStatus < 300) {
          // If the gateway returns success or accepted
          if (responseJson.success !== false && responseJson.status !== 'error' && !responseJson.errors) {
            isSuccess = true;
            // CRITICAL: Check if provider explicitly confirmed delivery vs queued/accepted
            if (responseJson.delivery_status === 'delivered' || responseJson.status === 'delivered') {
              isDelivered = true;
            }
          } else {
            isSuccess = false;
            errorMessage = extractErrorMessage(responseJson) || 'Gateway returned an error';
          }
        } else {
          isSuccess = false;
          errorMessage = extractErrorMessage(responseJson) || `SMSlenz Gateway returned HTTP ${httpStatus}`;
        }
      } else {
        // Non-JSON response
        if (httpStatus >= 200 && httpStatus < 300) {
          isSuccess = true;
          providerStatus = 'accepted';
        } else {
          isSuccess = false;
          providerStatus = `http_error_${httpStatus}`;
          errorMessage = `Gateway HTTP ${httpStatus}: ${rawResponseText.slice(0, 150)}`;
        }
      }
    } else {
      // Missing credentials diagnostic
      httpStatus = 400;
      providerStatus = 'missing_credentials';
      errorMessage = 'SMSlenz User ID and API Key are required. Please configure them in SMS Gateway Settings or environment.';
      isSuccess = false;
    }

    // Sanitize response to ensure NO API key is ever logged or returned
    const sanitizedApiResponse = sanitizeSensitiveText(
      responseJson ? JSON.stringify(responseJson) : rawResponseText,
      config.apiKey
    );
    const sanitizedError = errorMessage ? sanitizeSensitiveText(errorMessage, config.apiKey) : undefined;

    // Status: distinguish 'delivered' vs 'accepted' (queued) vs 'failed'
    const finalStatus: 'accepted' | 'delivered' | 'failed' = isSuccess
      ? isDelivered
        ? 'delivered'
        : 'accepted'
      : 'failed';

    const apiStatusText = isSuccess
      ? `HTTP ${httpStatus} OK (Accepted by SMSlenz Gateway)`
      : httpStatus > 0
      ? `HTTP ${httpStatus} (${providerStatus})`
      : 'Gateway Communication Error';

    // Update log entry with safe diagnostic info
    logEntry.httpStatus = httpStatus;
    logEntry.success = isSuccess;
    logEntry.providerStatus = providerStatus;
    logEntry.campaignId = campaignId ? String(campaignId) : null;
    logEntry.status = finalStatus;
    logEntry.errorMessage = sanitizedError || null;
    logEntry.apiResponse = sanitizedApiResponse.slice(0, 500);

    await saveSmsLog(logEntry);

    return {
      success: isSuccess,
      httpStatus,
      apiStatus: apiStatusText,
      providerStatus,
      campaignId: campaignId ? String(campaignId) : null,
      maskedRecipient: maskedPhone,
      senderId,
      endpoint: endpointUrl,
      status: finalStatus,
      error: sanitizedError,
      logId: logEntry.id,
      apiResponse: sanitizedApiResponse,
    };
  } catch (networkErr: any) {
    const errorMsg = sanitizeSensitiveText(networkErr.message || 'Network request failed', config.apiKey);
    logEntry.httpStatus = 500;
    logEntry.success = false;
    logEntry.status = 'failed';
    logEntry.providerStatus = 'network_failure';
    logEntry.errorMessage = errorMsg;

    await saveSmsLog(logEntry);

    return {
      success: false,
      httpStatus: 500,
      apiStatus: 'Network Error',
      providerStatus: 'network_failure',
      campaignId: null,
      maskedRecipient: maskedPhone,
      senderId,
      endpoint: endpointUrl,
      status: 'failed',
      error: errorMsg,
      logId: logEntry.id,
    };
  }
}

/**
 * Helper to safely extract error messages from SMSlenz response (including Laravel error structures).
 */
function extractErrorMessage(responseJson: any): string | null {
  if (!responseJson) return null;
  if (responseJson.errors && typeof responseJson.errors === 'object') {
    const errorList = Object.values(responseJson.errors).flat().join(', ');
    if (errorList) return errorList;
  }
  if (responseJson.message && typeof responseJson.message === 'string') {
    return responseJson.message;
  }
  if (responseJson.error && typeof responseJson.error === 'string') {
    return responseJson.error;
  }
  return null;
}

/**
 * Check SMSlenz account status and balance at https://www.smslenz.lk/api/account-status
 */
export async function checkAccountStatus(gymIdOrBusinessId: number | string = 1): Promise<any> {
  const config = await getGymSmsConfig(gymIdOrBusinessId);
  if (!config.apiKey || !config.userId) {
    return {
      success: false,
      httpStatus: 400,
      providerStatus: 'missing_credentials',
      error: 'SMSlenz User ID and API Key must be configured to check account status.',
    };
  }

  const endpoint = 'https://www.smslenz.lk/api/account-status';
  try {
    const payload = {
      user_id: config.userId,
      api_key: config.apiKey,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const httpStatus = response.status;
    const rawText = await response.text();
    let responseJson: any = null;
    try {
      responseJson = JSON.parse(rawText);
    } catch {
      responseJson = null;
    }

    const sanitizedText = sanitizeSensitiveText(rawText, config.apiKey);

    return {
      success: response.ok,
      httpStatus,
      endpoint,
      data: responseJson || sanitizedText,
      error: !response.ok ? extractErrorMessage(responseJson) || `HTTP ${httpStatus}` : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      httpStatus: 500,
      endpoint,
      error: sanitizeSensitiveText(err.message || 'Account status check failed', config.apiKey),
    };
  }
}

/**
 * Retrieve audit logs for a gym tenant from MongoDB or in-memory fallback.
 */
export async function getSmsLogs(gymIdOrBusinessId: number | string = 1): Promise<any[]> {
  try {
    const db = await getMongoDb();
    const gymId = typeof gymIdOrBusinessId === 'number' ? gymIdOrBusinessId : parseInt(String(gymIdOrBusinessId).replace(/\D/g, ''), 10) || 1;
    const businessId = typeof gymIdOrBusinessId === 'string' && gymIdOrBusinessId.startsWith('biz_') ? gymIdOrBusinessId : `biz_${gymId}`;

    if (db) {
      const logs = await db
        .collection('smsLogs')
        .find({ $or: [{ gymId }, { businessId }] })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      return logs;
    }

    return memorySmsLogs
      .filter((l) => l.gymId === gymId || l.businessId === businessId)
      .slice(-100)
      .reverse();
  } catch (err) {
    console.error('Error fetching SMS logs:', err);
    return memorySmsLogs.slice(-100).reverse();
  }
}

/**
 * Internal helper to safely persist an SMS log entry.
 */
async function saveSmsLog(logEntry: any): Promise<void> {
  try {
    const db = await getMongoDb();
    if (db) {
      await db.collection('smsLogs').insertOne(logEntry);
    } else {
      memorySmsLogs.push(logEntry);
      if (memorySmsLogs.length > 500) memorySmsLogs.shift();
    }
  } catch (err) {
    console.error('Failed to persist SMS log:', err);
    memorySmsLogs.push(logEntry);
  }
}
