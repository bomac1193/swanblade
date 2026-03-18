/**
 * Stripe Checkout API
 *
 * POST: Create a checkout session for subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  stripe,
  PRICES,
  getOrCreateCustomer,
  createCheckoutSession,
  type MembershipTier,
  type BillingInterval,
} from "@/lib/stripe/client";

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const { tier, interval = "monthly" } = body as {
      tier: MembershipTier;
      interval: BillingInterval;
    };

    // Validate tier
    if (!tier || !["professional", "studio"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'professional' or 'studio'" },
        { status: 400 }
      );
    }

    // Get price ID
    const priceId = (PRICES as Record<string, Record<string, string>>)[tier]?.[interval];
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this tier/interval" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId: string | null = null;

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, name")
      .eq("id", user.id)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Create new customer
      customerId = await getOrCreateCustomer(
        user.id,
        user.email!,
        profile?.name
      );

      if (customerId) {
        // Save to profile
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 }
      );
    }

    // Create checkout session
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const checkoutUrl = await createCheckoutSession(
      customerId,
      priceId,
      `${origin}/member?success=true`,
      `${origin}/pricing?cancelled=true`,
      {
        user_id: user.id,
        tier,
        interval,
      }
    );

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
