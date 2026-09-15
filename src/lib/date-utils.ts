/**
 * Date and Time utilities for Gym Management System
 * Standard timezone: Asia/Colombo (UTC+5:30)
 */

export const COLOMBO_TIMEZONE = 'Asia/Colombo';

export interface TodayInfo {
  date: string; // YYYY-MM-DD
  time: string; // hh:mm A
}

/**
 * Sanitize and correct date strings:
 * Catches accidental year typing such as 2826 (when typing 2026),
 * years beyond sensible boundaries (e.g. 2800-2899), or malformed inputs.
 */
export function sanitizeDateString(dateStr?: string | null): string {
  if (!dateStr) return '';
  let str = String(dateStr).trim();
  if (str.startsWith('2826')) {
    str = str.replace(/^2826/, '2026');
  }
  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    let y = Number(parts[0]);
    if (y === 2826 || (y >= 2800 && y <= 2899)) {
      y -= 800; // 2826 -> 2026
    } else if (y > 2050 && y < 2900 && String(y).endsWith('26')) {
      y = 2026;
    }
    const m = String(parts[1]).padStart(2, '0');
    const d = String(parts[2]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return str;
}

export function getColomboToday(): string {
  try {
    // Return YYYY-MM-DD in Asia/Colombo timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: COLOMBO_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return sanitizeDateString(formatter.format(new Date()));
  } catch (e) {
    const d = new Date();
    let year = d.getFullYear();
    if (year === 2826 || (year >= 2800 && year <= 2899)) year -= 800;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function getColomboCurrentTime(): string {
  // Return hh:mm A in Asia/Colombo timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: COLOMBO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(new Date());
}

export function getColomboTodayInfo(): TodayInfo {
  return {
    date: getColomboToday(),
    time: getColomboCurrentTime(),
  };
}

/**
 * Expiry calculation based on Package:
 * - Monthly: Start Date + 30 days
 * - 3 Months: Start Date + 3 calendar months
 * - 6 Months: Start Date + 6 calendar months
 * - Annual: Start Date + 12 calendar months
 */
export function calculateExpiryDate(startDateStr: string, packageType: string): string {
  if (!startDateStr) return '';
  const sanitized = sanitizeDateString(startDateStr);
  const parts = sanitized.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return '';

  let [year, month, day] = parts;
  if (year === 2826 || (year >= 2800 && year <= 2899)) {
    year -= 800;
  }
  const date = new Date(year, month - 1, day, 12, 0, 0);

  switch (packageType) {
    case 'monthly':
      date.setDate(date.getDate() + 30);
      break;
    case '3_months':
      date.setMonth(date.getMonth() + 3);
      break;
    case '6_months':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setDate(date.getDate() + 30);
  }

  let y = date.getFullYear();
  if (y === 2826 || (y >= 2800 && y <= 2899)) {
    y -= 800;
  }
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates remaining days from today to expiry date.
 * Returns negative if already expired.
 */
export function getDaysRemaining(expiryDateStr: string, todayStr?: string): number {
  const today = sanitizeDateString(todayStr || getColomboToday());
  const expiry = sanitizeDateString(expiryDateStr);

  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = expiry.split('-').map(Number);

  const tDate = new Date(y1, m1 - 1, d1, 12, 0, 0).getTime();
  const eDate = new Date(y2, m2 - 1, d2, 12, 0, 0).getTime();

  const diffMs = eDate - tDate;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type DynamicStatus = 'active' | 'expiring_soon' | 'due_today' | 'due_tomorrow' | 'expired' | 'inactive';

/**
 * Dynamic status evaluator:
 * - If archived: 'inactive'
 * - If remaining == 0: 'due_today'
 * - If remaining == 1: 'due_tomorrow'
 * - If remaining < 0: 'expired'
 * - If 0 < remaining <= 3: 'expiring_soon' (treated as active with warning)
 * - If remaining > 3: 'active'
 */
export function computeMemberStatus(expiryDateStr?: string | null, isArchived: boolean = false, todayStr?: string): {
  status: DynamicStatus;
  daysRemaining: number;
  label: string;
  badgeColor: 'green' | 'orange' | 'red' | 'gray';
} {
  if (isArchived) {
    return {
      status: 'inactive',
      daysRemaining: 0,
      label: 'Inactive',
      badgeColor: 'gray',
    };
  }

  if (!expiryDateStr) {
    return {
      status: 'expired',
      daysRemaining: -999,
      label: 'No Membership',
      badgeColor: 'red',
    };
  }

  const days = getDaysRemaining(expiryDateStr, todayStr);

  if (days < 0) {
    return {
      status: 'expired',
      daysRemaining: days,
      label: 'Expired',
      badgeColor: 'red',
    };
  }

  if (days === 0) {
    return {
      status: 'due_today',
      daysRemaining: 0,
      label: 'Due Today',
      badgeColor: 'orange',
    };
  }

  if (days === 1) {
    return {
      status: 'due_tomorrow',
      daysRemaining: 1,
      label: 'Due Tomorrow',
      badgeColor: 'orange',
    };
  }

  if (days <= 3) {
    return {
      status: 'expiring_soon',
      daysRemaining: days,
      label: `Expires in ${days} day${days > 1 ? 's' : ''}`,
      badgeColor: 'orange',
    };
  }

  return {
    status: 'active',
    daysRemaining: days,
    label: 'Active',
    badgeColor: 'green',
  };
}
