import { Capacitor, registerPlugin } from '@capacitor/core';
import { SubscriptionPlan } from '../types';

export interface PlayProductDetails {
  productId: string;
  title: string;
  description: string;
  productType: 'subs' | 'inapp';
  formattedPrice?: string;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
  billingPeriod?: string;
  offerToken?: string;
}

export interface PlayPurchase {
  orderId: string;
  purchaseToken: string;
  purchaseTime: number;
  purchaseState: number; // 1 = PURCHASED, 2 = PENDING, 0 = UNSPECIFIED
  isAcknowledged: boolean;
  isAutoRenewing: boolean;
  originalJson: string;
  signature: string;
  products: string[];
}

export interface GooglePlayBillingPluginInterface {
  isAvailable(): Promise<{ available: boolean; isReady: boolean }>;
  initialize(): Promise<{ connected: boolean; message?: string }>;
  queryProductDetails(options: { productIds: string[]; productType?: 'subs' | 'inapp' }): Promise<{ products: PlayProductDetails[] }>;
  launchBillingFlow(options: { productId: string; offerToken?: string; obfuscatedAccountId?: string }): Promise<{
    success: boolean;
    purchases?: PlayPurchase[];
    cancelled?: boolean;
    message?: string;
  }>;
  acknowledgePurchase(options: { purchaseToken: string }): Promise<{ acknowledged: boolean }>;
  queryPurchases(options: { productType?: 'subs' | 'inapp' }): Promise<{ purchases: PlayPurchase[] }>;
  consumePurchase(options: { purchaseToken: string }): Promise<{ consumed: boolean }>;
}

export const GooglePlayBilling = registerPlugin<GooglePlayBillingPluginInterface>('GooglePlayBillingPlugin');

// Standard Google Play Subscription SKUs
export const PLAY_BILLING_SKUS: Record<SubscriptionPlan, { monthly: string; yearly: string }> = {
  [SubscriptionPlan.BASIC]: {
    monthly: 'docufolio_basic',
    yearly: 'docufolio_basic'
  },
  [SubscriptionPlan.PREMIUM]: {
    monthly: 'docufolio_premium_monthly',
    yearly: 'docufolio_premium_yearly'
  },
  [SubscriptionPlan.PRO]: {
    monthly: 'docufolio_pro_monthly',
    yearly: 'docufolio_pro_yearly'
  },
  [SubscriptionPlan.ELITE]: {
    monthly: 'docufolio_elite_monthly',
    yearly: 'docufolio_elite_yearly'
  },
  [SubscriptionPlan.BUSINESS]: {
    monthly: 'docufolio_business_monthly',
    yearly: 'docufolio_business_yearly'
  },
  [SubscriptionPlan.WINDOWS_INDIVIDUAL]: {
    monthly: 'docufolio_windows_ind_monthly',
    yearly: 'docufolio_windows_ind_yearly'
  },
  [SubscriptionPlan.WINDOWS_BUSINESS]: {
    monthly: 'docufolio_windows_biz_monthly',
    yearly: 'docufolio_windows_biz_yearly'
  }
};

// Reverse lookup to map Google Play SKU to DocuFolio SubscriptionPlan
export const mapSkuToPlan = (productId: string): { plan: SubscriptionPlan; cycle: 'monthly' | 'yearly' } | null => {
  for (const [planKey, skus] of Object.entries(PLAY_BILLING_SKUS)) {
    if (skus.monthly === productId) {
      return { plan: planKey as SubscriptionPlan, cycle: 'monthly' };
    }
    if (skus.yearly === productId) {
      return { plan: planKey as SubscriptionPlan, cycle: 'yearly' };
    }
  }
  return null;
};

export const getAllPlaySubscriptionSkus = (): string[] => {
  const skus: string[] = [];
  Object.values(PLAY_BILLING_SKUS).forEach(item => {
    if (item.monthly && item.monthly !== 'docufolio_basic') skus.push(item.monthly);
    if (item.yearly && item.yearly !== 'docufolio_basic') skus.push(item.yearly);
  });
  return Array.from(new Set(skus));
};

let isBillingInitialized = false;

/**
 * Checks if running on native Android and Google Play Billing is supported.
 */
export const isGooglePlayBillingSupported = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await GooglePlayBilling.isAvailable();
      return !!res.available;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Connects to the Google Play Billing client.
 */
export const initializeGooglePlayBilling = async (): Promise<boolean> => {
  const supported = await isGooglePlayBillingSupported();
  if (!supported) return false;

  try {
    const res = await GooglePlayBilling.initialize();
    isBillingInitialized = !!res.connected;
    return isBillingInitialized;
  } catch (err) {
    console.warn('Google Play Billing initialization error:', err);
    return false;
  }
};

/**
 * Queries localized Google Play product details & pricing from Google Play Store.
 */
export const queryGooglePlayProducts = async (): Promise<Record<string, PlayProductDetails>> => {
  const supported = await isGooglePlayBillingSupported();
  if (!supported) {
    return {};
  }

  try {
    if (!isBillingInitialized) {
      await initializeGooglePlayBilling();
    }

    const skus = getAllPlaySubscriptionSkus();
    const res = await GooglePlayBilling.queryProductDetails({
      productIds: skus,
      productType: 'subs'
    });

    const map: Record<string, PlayProductDetails> = {};
    if (res && res.products) {
      res.products.forEach(p => {
        map[p.productId] = p;
      });
    }
    return map;
  } catch (err) {
    console.error('Failed to query Google Play products:', err);
    return {};
  }
};

/**
 * Launches the native Google Play Billing purchase flow for a subscription.
 */
export const purchasePlaySubscription = async (
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly',
  userId?: string
): Promise<{
  success: boolean;
  purchase?: PlayPurchase;
  error?: string;
  cancelled?: boolean;
}> => {
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const sku = PLAY_BILLING_SKUS[plan]?.[billingCycle];

  if (!sku) {
    return { success: false, error: 'Invalid plan or billing cycle selected.' };
  }

  if (!isNativeAndroid) {
    // Graceful web/dev simulation
    return {
      success: true,
      purchase: {
        orderId: `GPA.SIMULATED-${Date.now()}`,
        purchaseToken: `simulated_token_${Date.now()}`,
        purchaseTime: Date.now(),
        purchaseState: 1,
        isAcknowledged: true,
        isAutoRenewing: true,
        originalJson: JSON.stringify({ productId: sku, purchaseTime: Date.now() }),
        signature: 'simulated_sig',
        products: [sku]
      }
    };
  }

  try {
    if (!isBillingInitialized) {
      await initializeGooglePlayBilling();
    }

    const flowRes = await GooglePlayBilling.launchBillingFlow({
      productId: sku,
      obfuscatedAccountId: userId
    });

    if (flowRes.cancelled) {
      return { success: false, cancelled: true, error: 'Google Play purchase was cancelled.' };
    }

    if (flowRes.success && flowRes.purchases && flowRes.purchases.length > 0) {
      const purchase = flowRes.purchases[0];

      // Acknowledge immediately with Google Play
      try {
        if (!purchase.isAcknowledged) {
          await GooglePlayBilling.acknowledgePurchase({ purchaseToken: purchase.purchaseToken });
          purchase.isAcknowledged = true;
        }
      } catch (ackErr) {
        console.warn('Purchase acknowledgment warning (will retry on next sync):', ackErr);
      }

      // Verify on backend if available
      verifyPurchaseOnBackend(purchase, userId).catch(err => {
        console.warn('Backend purchase verification log:', err);
      });

      return {
        success: true,
        purchase
      };
    }

    return {
      success: false,
      error: flowRes.message || 'Google Play purchase did not complete.'
    };
  } catch (err: any) {
    console.error('Google Play Billing error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to complete Google Play purchase flow.'
    };
  }
};

/**
 * Restores existing purchases for the user from Google Play Store.
 */
export const restorePlayPurchases = async (): Promise<{
  success: boolean;
  activePlan?: SubscriptionPlan;
  purchases: PlayPurchase[];
  message: string;
}> => {
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  if (!isNativeAndroid) {
    return {
      success: true,
      purchases: [],
      message: 'Restore Purchases is supported on Google Play enabled Android devices.'
    };
  }

  try {
    if (!isBillingInitialized) {
      await initializeGooglePlayBilling();
    }

    const res = await GooglePlayBilling.queryPurchases({ productType: 'subs' });
    const purchases = res.purchases || [];

    if (purchases.length === 0) {
      return {
        success: true,
        purchases: [],
        message: 'No active Google Play subscriptions found for this Google account.'
      };
    }

    // Find highest tier active subscription
    let highestPlan: SubscriptionPlan | undefined;
    for (const p of purchases) {
      if (p.purchaseState === 1) { // PURCHASED
        for (const prodId of p.products) {
          const mapped = mapSkuToPlan(prodId);
          if (mapped) {
            highestPlan = mapped.plan;
            break;
          }
        }
      }
    }

    return {
      success: true,
      activePlan: highestPlan,
      purchases,
      message: highestPlan 
        ? `Successfully restored ${highestPlan} subscription from Google Play!`
        : 'Active Google Play purchase found.'
    };
  } catch (err: any) {
    console.error('Error restoring Google Play purchases:', err);
    return {
      success: false,
      purchases: [],
      message: err?.message || 'Failed to restore purchases from Google Play.'
    };
  }
};

/**
 * Optional server-side verification of Google Play Purchase Token.
 */
export const verifyPurchaseOnBackend = async (
  purchase: PlayPurchase,
  userId?: string
): Promise<{ verified: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/play-billing/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: purchase.orderId,
        purchaseToken: purchase.purchaseToken,
        products: purchase.products,
        userId
      })
    });

    if (res.ok) {
      const data = await res.json();
      return { verified: !!data.verified };
    }
    return { verified: false, error: 'Server verification returned non-OK status' };
  } catch (err: any) {
    return { verified: false, error: err?.message };
  }
};
