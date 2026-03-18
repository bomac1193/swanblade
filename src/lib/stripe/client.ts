/**
 * Stripe Client
 *
 * Server-side Stripe operations
 */

import Stripe from "stripe";

// Initialize Stripe (server-side only)
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key || key === "sk_test_your_stripe_secret_key") {
    return null;
  }

  return new Stripe(key, {
    apiVersion: "2025-01-27.acacia" as const as any,
    typescript: true,
  });
};

export const stripe = getStripe();

// Price IDs for membership tiers
export const PRICES = {
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || "",
  },
  studio: {
    monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_STUDIO_YEARLY || "",
  },
} as const;

export type MembershipTier = "professional" | "studio" | "enterprise";
export type BillingInterval = "monthly" | "yearly";

/**
 * Create or get Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string | null> {
  if (!stripe) return null;

  try {
    // Search for existing customer
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        supabase_user_id: userId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    return null;
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<string | null> {
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: true,
    });

    return session.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return null;
  }
}

/**
 * Create a billing portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) return null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (error) {
    console.error("Error creating portal session:", error);
    return null;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) return null;

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return null;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<boolean> {
  if (!stripe) return false;

  try {
    if (immediately) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
    return true;
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return false;
  }
}

/**
 * Map Stripe price ID to membership tier
 */
export function getPriceTier(priceId: string): MembershipTier | null {
  if (
    priceId === PRICES.professional.monthly ||
    priceId === PRICES.professional.yearly
  ) {
    return "professional";
  }
  if (
    priceId === PRICES.studio.monthly ||
    priceId === PRICES.studio.yearly
  ) {
    return "studio";
  }
  return null;
}
