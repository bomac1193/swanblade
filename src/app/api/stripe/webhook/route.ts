/**
 * Stripe Webhook Handler
 *
 * Handles subscription events from Stripe
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getPriceTier } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";

// Use service role for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("No user_id in checkout session metadata");
    return;
  }

  // Determine tier from the subscription's price
  let tier: string = "professional";
  if (stripe && subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      if (priceId) {
        tier = getPriceTier(priceId) || "professional";
      }
    } catch {
      console.warn("Could not retrieve subscription for tier — defaulting to professional");
    }
  }

  // Update profile with Stripe IDs and activate membership immediately
  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      membership_tier: tier,
      membership_status: "active",
      application_status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", userId);

  console.log(`Checkout completed for user ${userId}: ${tier} (active)`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No profile found for customer ${customerId}`);
    return;
  }

  // Get tier from price
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getPriceTier(priceId || "") || "professional";

  // Map subscription status
  let membershipStatus: string;
  switch (subscription.status) {
    case "active":
    case "trialing":
      membershipStatus = "active";
      break;
    case "past_due":
      membershipStatus = "past_due";
      break;
    case "canceled":
    case "unpaid":
      membershipStatus = "cancelled";
      break;
    default:
      membershipStatus = "pending";
  }

  // Update profile
  await supabaseAdmin
    .from("profiles")
    .update({
      membership_tier: tier,
      membership_status: membershipStatus,
      stripe_subscription_id: subscription.id,
    })
    .eq("id", profile.id);

  console.log(`Subscription updated for user ${profile.id}: ${tier} (${membershipStatus})`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No profile found for customer ${customerId}`);
    return;
  }

  // Downgrade to pending
  await supabaseAdmin
    .from("profiles")
    .update({
      membership_tier: "pending",
      membership_status: "cancelled",
      stripe_subscription_id: null,
    })
    .eq("id", profile.id);

  console.log(`Subscription cancelled for user ${profile.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No profile found for customer ${customerId}`);
    return;
  }

  // Mark as past due
  await supabaseAdmin
    .from("profiles")
    .update({
      membership_status: "past_due",
    })
    .eq("id", profile.id);

  console.log(`Payment failed for user ${profile.id}`);
}
