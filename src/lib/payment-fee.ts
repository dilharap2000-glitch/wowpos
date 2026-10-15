import { PaymentMethod } from '../types.ts';

export interface PaymentMethodMeta {
  id: PaymentMethod;
  label: string;
  defaultFeeRate: number;
  isBnplOrDigital: boolean;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: 'cash',
    label: 'Cash',
    defaultFeeRate: 0,
    isBnplOrDigital: false,
    color: '#F97316',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-400',
  },
  {
    id: 'card',
    label: 'Card',
    defaultFeeRate: 0,
    isBnplOrDigital: false,
    color: '#3B82F6',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    defaultFeeRate: 0,
    isBnplOrDigital: false,
    color: '#10B981',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
  },
  {
    id: 'mintpay',
    label: 'Mintpay',
    defaultFeeRate: 12,
    isBnplOrDigital: true,
    color: '#06B6D4',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
  },
  {
    id: 'payzy',
    label: 'PayZy',
    defaultFeeRate: 12,
    isBnplOrDigital: true,
    color: '#8B5CF6',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
  },
  {
    id: 'koko',
    label: 'Koko',
    defaultFeeRate: 12,
    isBnplOrDigital: true,
    color: '#EC4899',
    badgeBg: 'bg-pink-500/15',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-400',
  },
];

export interface PaymentFeeCalculation {
  baseAmount: number;
  paymentMethod: PaymentMethod;
  paymentFee: number;
  paymentFeeRate: number;
  totalAmount: number;
}

/**
 * Calculates payment fee and total amount strictly according to tenant configuration.
 *
 * Rules:
 * - Base Amount = original membership / invoice amount
 * - If method is Mintpay, PayZy, or Koko:
 *     Payment Fee = Base Amount * feeRate / 100 (Default: 12%)
 *     Final Total = Base Amount + Payment Fee
 * - If method is Cash, Card, or Bank Transfer:
 *     Payment Fee = Rs. 0 (0%)
 *     Final Total = Base Amount
 */
export function calculatePaymentFee(
  baseAmount: number,
  method: PaymentMethod,
  configuredRate?: number | null,
  enabled: boolean = true
): PaymentFeeCalculation {
  const safeBase = Math.max(0, Number(baseAmount) || 0);

  // Determine rate
  let rate = 0;
  if (method === 'mintpay' || method === 'payzy' || method === 'koko') {
    if (enabled !== false) {
      rate = configuredRate !== undefined && configuredRate !== null ? Number(configuredRate) : 12;
    } else {
      rate = 0;
    }
  } else {
    // Cash, Card, Bank Transfer: strictly 0%
    rate = configuredRate !== undefined && configuredRate !== null ? Number(configuredRate) : 0;
  }

  // Ensure non-negative rate
  rate = Math.max(0, rate);

  if (rate === 0) {
    return {
      baseAmount: safeBase,
      paymentMethod: method,
      paymentFee: 0,
      paymentFeeRate: 0,
      totalAmount: safeBase,
    };
  }

  const paymentFee = Math.round((safeBase * rate) / 100);
  const totalAmount = safeBase + paymentFee;

  return {
    baseAmount: safeBase,
    paymentMethod: method,
    paymentFee,
    paymentFeeRate: rate,
    totalAmount,
  };
}

/**
 * Formats a payment method ID into human-friendly label (e.g. 'bank_transfer' -> 'Bank Transfer')
 */
export function formatPaymentMethod(method?: string | null): string {
  if (!method) return 'Cash';
  const found = PAYMENT_METHODS.find((pm) => pm.id === method);
  if (found) return found.label;
  return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Verification test suite for specific financial benchmarks:
 * - Rs. 3,000
 * - Rs. 7,500
 * - Rs. 22,000
 * - Rs. 24,000
 */
export function runFeeVerificationTests() {
  const benchmarks = [
    { base: 3000, expectedFee12: 360, expectedTotal12: 3360 },
    { base: 7500, expectedFee12: 900, expectedTotal12: 8400 },
    { base: 22000, expectedFee12: 2640, expectedTotal12: 24640 },
    { base: 24000, expectedFee12: 2880, expectedTotal12: 26880 },
  ];

  const results = benchmarks.map((b) => {
    const mintpayRes = calculatePaymentFee(b.base, 'mintpay', 12);
    const payzyRes = calculatePaymentFee(b.base, 'payzy', 12);
    const kokoRes = calculatePaymentFee(b.base, 'koko', 12);
    const cashRes = calculatePaymentFee(b.base, 'cash', 0);
    const cardRes = calculatePaymentFee(b.base, 'card', 0);
    const bankRes = calculatePaymentFee(b.base, 'bank_transfer', 0);

    const pass12 =
      mintpayRes.paymentFee === b.expectedFee12 &&
      mintpayRes.totalAmount === b.expectedTotal12 &&
      payzyRes.paymentFee === b.expectedFee12 &&
      payzyRes.totalAmount === b.expectedTotal12 &&
      kokoRes.paymentFee === b.expectedFee12 &&
      kokoRes.totalAmount === b.expectedTotal12;

    const passZero =
      cashRes.paymentFee === 0 &&
      cashRes.totalAmount === b.base &&
      cardRes.paymentFee === 0 &&
      cardRes.totalAmount === b.base &&
      bankRes.paymentFee === 0 &&
      bankRes.totalAmount === b.base;

    return {
      base: b.base,
      expectedFee12: b.expectedFee12,
      actualFee12: mintpayRes.paymentFee,
      expectedTotal12: b.expectedTotal12,
      actualTotal12: mintpayRes.totalAmount,
      passed: pass12 && passZero,
    };
  });

  return results;
}
