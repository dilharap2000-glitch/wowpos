import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../lib/api.ts';
import { BusinessSettings } from '../types.ts';

interface BusinessContextType {
  business: BusinessSettings;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
  updateBusiness: (updates: Partial<BusinessSettings>) => Promise<void>;
  formatCurrency: (amount: number | string | null | undefined) => string;
}

const defaultBusiness: BusinessSettings = {
  gymName: 'Gym Management',
  logo: null,
  phone: '',
  address: '',
  email: '',
  currency: 'Rs.',
  description: 'Fitness, Strength & Conditioning',
  receiptFooter: 'Thank you for training with us!',
  monthlyPrice: 4500,
  threeMonthsPrice: 12000,
  sixMonthsPrice: 22000,
  annualPrice: 38000,
  admissionFee: 1000,
  coupleMonthlyPrice: 8000,
  coupleThreeMonthsPrice: 20000,
  coupleSixMonthsPrice: 36000,
  coupleAnnualPrice: 65000,
};

const BusinessContext = createContext<BusinessContextType>({
  business: defaultBusiness,
  loading: false,
  refreshBusiness: async () => {},
  updateBusiness: async () => {},
  formatCurrency: (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`,
});

export const BusinessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [business, setBusiness] = useState<BusinessSettings>(() => {
    // Try reading cached business profile from localStorage for immediate flicker-free display
    try {
      const cached = localStorage.getItem('gym_cached_business_profile');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return defaultBusiness;
  });
  const [loading, setLoading] = useState(false);

  const applyBusinessData = useCallback((data: Partial<BusinessSettings> | Record<string, string>) => {
    setBusiness((prev) => {
      const next: BusinessSettings = {
        ...prev,
        gymName: (data as any).gym_name || (data as any).gymName || prev.gymName,
        logo: (data as any).logo !== undefined ? (data as any).logo : prev.logo,
        phone: (data as any).phone !== undefined ? (data as any).phone : prev.phone,
        address: (data as any).address !== undefined ? (data as any).address : prev.address,
        email: (data as any).email !== undefined ? (data as any).email : prev.email,
        currency: (data as any).currency || prev.currency || 'Rs.',
        description: (data as any).description !== undefined ? (data as any).description : prev.description,
        receiptFooter: (data as any).receipt_footer || (data as any).receiptFooter || prev.receiptFooter,
        monthlyPrice: (data as any).monthly_price ? Number((data as any).monthly_price) : (data as any).monthlyPrice !== undefined ? Number((data as any).monthlyPrice) : prev.monthlyPrice,
        threeMonthsPrice: (data as any).three_months_price ? Number((data as any).three_months_price) : (data as any).threeMonthsPrice !== undefined ? Number((data as any).threeMonthsPrice) : prev.threeMonthsPrice,
        sixMonthsPrice: (data as any).six_months_price ? Number((data as any).six_months_price) : (data as any).sixMonthsPrice !== undefined ? Number((data as any).sixMonthsPrice) : prev.sixMonthsPrice,
        annualPrice: (data as any).annual_price ? Number((data as any).annual_price) : (data as any).annualPrice !== undefined ? Number((data as any).annualPrice) : prev.annualPrice,
        admissionFee: (data as any).admission_fee !== undefined ? Number((data as any).admission_fee) : (data as any).admissionFee !== undefined ? Number((data as any).admissionFee) : (prev.admissionFee ?? 1000),
        coupleMonthlyPrice: (data as any).couple_monthly_price !== undefined ? Number((data as any).couple_monthly_price) : (data as any).coupleMonthlyPrice !== undefined ? Number((data as any).coupleMonthlyPrice) : (prev.coupleMonthlyPrice ?? 8000),
        coupleThreeMonthsPrice: (data as any).couple_three_months_price !== undefined ? Number((data as any).couple_three_months_price) : (data as any).coupleThreeMonthsPrice !== undefined ? Number((data as any).coupleThreeMonthsPrice) : (prev.coupleThreeMonthsPrice ?? 20000),
        coupleSixMonthsPrice: (data as any).couple_six_months_price !== undefined ? Number((data as any).couple_six_months_price) : (data as any).coupleSixMonthsPrice !== undefined ? Number((data as any).coupleSixMonthsPrice) : (prev.coupleSixMonthsPrice ?? 36000),
        coupleAnnualPrice: (data as any).couple_annual_price !== undefined ? Number((data as any).couple_annual_price) : (data as any).coupleAnnualPrice !== undefined ? Number((data as any).coupleAnnualPrice) : (prev.coupleAnnualPrice ?? 65000),
      };

      try {
        localStorage.setItem('gym_cached_business_profile', JSON.stringify(next));
      } catch (e) {}

      // Keep browser document title updated
      if (next.gymName) {
        document.title = `${next.gymName.toUpperCase()} • WOW POS Gym Management & POS`;
      }

      return next;
    });
  }, []);

  const refreshBusiness = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gym_auth_token');
      // If authenticated, fetch the current tenant's active settings
      if (token) {
        try {
          const settingsMap = await api.getSettings();
          if (settingsMap && (settingsMap.gym_name || settingsMap.currency)) {
            applyBusinessData(settingsMap);
            return;
          }
        } catch (authErr) {
          // Soft fallback to public endpoint if needed
        }
      }

      // If unauthenticated or no custom settings yet, fetch public business info
      try {
        const publicInfo = await api.getPublicGymInfo();
        if (publicInfo && publicInfo.gymName) {
          applyBusinessData(publicInfo);
        }
      } catch (publicErr) {
        console.warn('Could not fetch business info:', publicErr);
      }
    } finally {
      setLoading(false);
    }
  }, [applyBusinessData]);

  useEffect(() => {
    refreshBusiness();
  }, [refreshBusiness]);

  // Update business configuration in MongoDB Atlas and state
  const updateBusiness = async (updates: Partial<BusinessSettings>) => {
    setLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (updates.gymName !== undefined) payload['gym_name'] = updates.gymName.trim();
      if (updates.logo !== undefined) payload['logo'] = updates.logo || '';
      if (updates.phone !== undefined) payload['phone'] = updates.phone ? updates.phone.trim() : '';
      if (updates.address !== undefined) payload['address'] = updates.address ? updates.address.trim() : '';
      if (updates.email !== undefined) payload['email'] = updates.email ? updates.email.trim() : '';
      if (updates.currency !== undefined) payload['currency'] = updates.currency ? updates.currency.trim() : 'Rs.';
      if (updates.description !== undefined) payload['description'] = updates.description ? updates.description.trim() : '';
      if (updates.receiptFooter !== undefined) payload['receipt_footer'] = updates.receiptFooter ? updates.receiptFooter.trim() : '';
      if (updates.monthlyPrice !== undefined) payload['monthly_price'] = String(updates.monthlyPrice);
      if (updates.threeMonthsPrice !== undefined) payload['three_months_price'] = String(updates.threeMonthsPrice);
      if (updates.sixMonthsPrice !== undefined) payload['six_months_price'] = String(updates.sixMonthsPrice);
      if (updates.annualPrice !== undefined) payload['annual_price'] = String(updates.annualPrice);
      if (updates.admissionFee !== undefined) payload['admission_fee'] = String(updates.admissionFee);
      if (updates.coupleMonthlyPrice !== undefined) payload['couple_monthly_price'] = String(updates.coupleMonthlyPrice);
      if (updates.coupleThreeMonthsPrice !== undefined) payload['couple_three_months_price'] = String(updates.coupleThreeMonthsPrice);
      if (updates.coupleSixMonthsPrice !== undefined) payload['couple_six_months_price'] = String(updates.coupleSixMonthsPrice);
      if (updates.coupleAnnualPrice !== undefined) payload['couple_annual_price'] = String(updates.coupleAnnualPrice);

      await api.updateSettings(payload);
      applyBusinessData(updates);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = useCallback(
    (amount: number | string | null | undefined): string => {
      const num = Math.round(Number(amount || 0));
      return `${business.currency} ${num.toLocaleString()}`;
    },
    [business.currency]
  );

  return (
    <BusinessContext.Provider
      value={{
        business,
        loading,
        refreshBusiness,
        updateBusiness,
        formatCurrency,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export function useBusiness() {
  return useContext(BusinessContext);
}
