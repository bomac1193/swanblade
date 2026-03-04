"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MarketingLayout from "@/components/MarketingLayout";

type Currency = "USD" | "GBP" | "EUR";
type Billing = "monthly" | "annual";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
};

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
};

const PLANS = [
  {
    id: "professional",
    name: "Professional",
    monthlyUSD: 299,
    annualUSD: 2999,
    description: "For those who ship. Individual membership.",
    features: [
      "Unlimited sound generation",
      "Full studio access",
      "Provenance tracking",
      "2 invite codes",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    monthlyUSD: 999,
    annualUSD: 9999,
    description: "For teams who don't compromise. 5 seats.",
    highlighted: true,
    features: [
      "Everything in Professional",
      "5 team seats",
      "Game State Engine",
      "Stem bundles",
      "Twin OS integration",
      "5 invite codes",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyUSD: null,
    annualUSD: 25000,
    description: "Custom terms. Minimum commitment.",
    features: [
      "Everything in Studio",
      "Unlimited seats",
      "Custom API access",
      "Dedicated support",
      "White-label options",
      "Priority processing",
    ],
  },
];

function formatPrice(priceUSD: number | null, currency: Currency): string {
  if (priceUSD === null) return "Custom";
  const converted = Math.round(priceUSD * EXCHANGE_RATES[currency]);
  return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString()}`;
}

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled");

  const [currency, setCurrency] = useState<Currency>("USD");
  const [billing, setBilling] = useState<Billing>("annual");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (planId === "enterprise") {
      // Redirect to contact/apply for enterprise
      router.push("/apply?tier=enterprise");
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: planId,
          interval: billing === "annual" ? "yearly" : "monthly",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "Not authenticated") {
        // Redirect to login, then back to pricing
        router.push(`/login?redirect=/pricing`);
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <MarketingLayout>
      {/* Cancelled Message */}
      {cancelled && (
        <div className="max-w-2xl mx-auto px-6 pt-8">
          <div className="border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
            <p className="text-yellow-400 text-sm">
              Checkout was cancelled. Ready when you are.
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
           
          >
            Membership
          </p>
          <h1 className="text-4xl font-display mb-8">
            Diamonds or Silence
          </h1>
          <p className="text-white/50 leading-relaxed mb-8">
            No free tier. No trials. If you need to &quot;try before you buy,&quot;
            this probably isn&apos;t for you. Swanblade is for people who already
            know what they want.
          </p>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {/* Billing Toggle */}
            <div className="inline-flex border border-white/10">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-4 py-2 text-xs uppercase tracking-widest transition ${
                  billing === "monthly"
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white"
                }`}
               
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-4 py-2 text-xs uppercase tracking-widest transition ${
                  billing === "annual"
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white"
                }`}
               
              >
                Annual
              </button>
            </div>

            {/* Currency Toggle */}
            <div className="inline-flex border border-white/10">
              {(["USD", "GBP", "EUR"] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2 text-xs uppercase tracking-widest transition ${
                    currency === c
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white"
                  }`}
                 
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto space-y-6">
          {PLANS.map((plan) => {
            const price = billing === "annual" ? plan.annualUSD : plan.monthlyUSD;
            const isLoading = loading === plan.id;

            return (
              <div
                key={plan.name}
                className={`p-8 border ${
                  plan.highlighted
                    ? "border-[#66023C]"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-display">{plan.name}</h2>
                    <p className="text-white/40 text-sm mt-1">
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-display">
                      {formatPrice(price, currency)}
                    </span>
                    {price && (
                      <span className="text-white/30 text-sm ml-1">
                        /{billing === "annual" ? "year" : "month"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="text-white/50 text-sm flex items-center gap-2"
                     
                    >
                      <span className="text-white/20">-</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading}
                  className={`w-full border py-3 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
                    plan.highlighted
                      ? "border-[#66023C] text-white hover:bg-[#66023C]"
                      : "border-white/30 text-white hover:bg-white hover:text-black"
                  }`}
                 
                >
                  {isLoading
                    ? "..."
                    : plan.id === "enterprise"
                    ? "Contact Us"
                    : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Annual savings note */}
        {billing === "annual" && (
          <div className="max-w-2xl mx-auto mt-6">
            <p className="text-white/30 text-sm">
              Annual membership includes two months.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="border border-white/10 p-6 mb-8 inline-block">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-1 font-mono"
            >
              Q1 2026
            </p>
            <p className="text-white/70">
              <span className="text-white font-display text-2xl">12</span> seats remaining
            </p>
          </div>
          <p
            className="text-xs uppercase tracking-widest text-white/20 mt-8"
           
          >
            Not for everyone
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
