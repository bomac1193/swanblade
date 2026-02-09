"use client";

import { useState } from "react";
import Link from "next/link";
import MarketingLayout from "@/components/MarketingLayout";

type Currency = "USD" | "GBP" | "EUR";

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
    name: "Free",
    description: "For hobbyists and exploration",
    priceUSD: 0,
    features: [
      "10 generations per month",
      "Basic sound library",
      "MP3 export only",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For indie developers and freelancers",
    priceUSD: 29,
    features: [
      "500 generations per month",
      "Full sound library",
      "WAV & FLAC export",
      "Sound DNA analysis",
      "Stem separation",
      "Priority support",
      "Commercial license",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Studio",
    description: "For teams and studios",
    priceUSD: 99,
    features: [
      "Unlimited generations",
      "Full sound library",
      "All export formats",
      "Wwise & FMOD integration",
      "Unity & Unreal plugins",
      "Team workspaces (up to 10)",
      "Real-time collaboration",
      "Approval workflows",
      "Dedicated support",
      "Custom training",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    priceUSD: null,
    features: [
      "Everything in Studio",
      "Unlimited team members",
      "Custom model training",
      "On-premise deployment",
      "SLA guarantee",
      "Dedicated account manager",
      "Security audit & compliance",
      "API access",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

const ADD_ONS = [
  { name: "Extra Generations", priceUSD: 10, unit: "100 generations" },
  { name: "Additional Workspace", priceUSD: 15, unit: "per workspace/mo" },
  { name: "API Access", priceUSD: 49, unit: "per month" },
  { name: "Priority Queue", priceUSD: 19, unit: "per month" },
];

function formatPrice(priceUSD: number | null, currency: Currency): string {
  if (priceUSD === null) return "Custom";
  if (priceUSD === 0) return "Free";
  const converted = Math.round(priceUSD * EXCHANGE_RATES[currency]);
  return `${CURRENCY_SYMBOLS[currency]}${converted}`;
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const getPrice = (priceUSD: number | null) => {
    if (priceUSD === null || priceUSD === 0) return formatPrice(priceUSD, currency);
    const price = billingPeriod === "annual" ? priceUSD * 10 : priceUSD; // 2 months free
    return formatPrice(price, currency);
  };

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-display mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto" style={{ fontFamily: "Sohne, sans-serif" }}>
            Choose the plan that fits your needs. Scale up or down anytime.
          </p>

          {/* Controls */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* Billing Toggle */}
            <div className="flex items-center gap-3 bg-white/5 p-1 border border-white/10">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  billingPeriod === "monthly"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
                style={{ fontFamily: "Sohne, sans-serif" }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-2 text-sm font-medium transition flex items-center gap-2 ${
                  billingPeriod === "annual"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
                style={{ fontFamily: "Sohne, sans-serif" }}
              >
                Annual
                <span className="text-xs px-1.5 py-0.5 bg-[#66023C]-500/20 text-[#66023C]-400 font-normal">
                  Save 17%
                </span>
              </button>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/40" style={{ fontFamily: "Sohne, sans-serif" }}>Currency:</span>
              <div className="flex bg-white/5 border border-white/10">
                {(["USD", "GBP", "EUR"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 text-sm font-medium transition ${
                      currency === c
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white"
                    }`}
                    style={{ fontFamily: "Sohne, sans-serif" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 border transition-all ${
                  plan.highlighted
                    ? "border-white bg-white/5 scale-105"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-semibold text-[#66023C]-400 uppercase tracking-wider mb-3" style={{ fontFamily: "Sohne, sans-serif" }}>
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-display">{plan.name}</h3>
                <p className="text-sm text-white/50 mt-1 mb-4" style={{ fontFamily: "Sohne, sans-serif" }}>
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-display">{getPrice(plan.priceUSD)}</span>
                  {plan.priceUSD !== null && plan.priceUSD > 0 && (
                    <span className="text-white/40 text-sm ml-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                      /{billingPeriod === "annual" ? "year" : "month"}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-white/70" style={{ fontFamily: "Sohne, sans-serif" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#66023C]-400 mt-0.5 flex-shrink-0">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "/about" : "/studio"}
                  className={`block w-full py-3 text-center text-sm font-medium transition ${
                    plan.highlighted
                      ? "bg-white text-black hover:bg-white/90"
                      : "border border-white/30 text-white hover:bg-white/10"
                  }`}
                  style={{ fontFamily: "Sohne, sans-serif" }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display mb-8 text-center">Add-ons</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {ADD_ONS.map((addon) => (
              <div
                key={addon.name}
                className="p-4 border border-white/10 flex items-center justify-between hover:border-white/30 transition"
              >
                <div>
                  <h4 className="font-medium" style={{ fontFamily: "Sohne, sans-serif" }}>{addon.name}</h4>
                  <p className="text-sm text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>{addon.unit}</p>
                </div>
                <span className="text-xl font-display">{formatPrice(addon.priceUSD, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "What counts as a generation?",
                a: "Each time you generate a sound from a prompt, that's one generation. Variations and transformations each count as separate generations.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.",
              },
              {
                q: "What's included in commercial license?",
                a: "All Pro and above plans include commercial rights to use generated sounds in games, films, ads, and any other commercial projects.",
              },
              {
                q: "How does team billing work?",
                a: "Studio plans include up to 10 team members. Additional members can be added for a per-seat fee. Enterprise plans offer unlimited seats.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-white/10 pb-6">
                <h4 className="text-lg font-medium mb-2" style={{ fontFamily: "Sohne, sans-serif" }}>{q}</h4>
                <p className="text-white/60" style={{ fontFamily: "Sohne, sans-serif" }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-display mb-6">Still Have Questions?</h2>
          <p className="text-lg text-white/60 mb-8" style={{ fontFamily: "Sohne, sans-serif" }}>
            Our team is happy to help you find the right plan for your needs.
          </p>
          <a
            href="mailto:hello@swanblade.com"
            className="inline-flex items-center gap-3 border border-white/30 text-white px-8 py-4 text-lg font-semibold hover:bg-white/10 transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Contact Us
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
