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
    priceUSD: 0,
    description: "10 generations/month, MP3 export",
  },
  {
    name: "Pro",
    priceUSD: 29,
    description: "500 generations/month, all formats, commercial license",
    highlighted: true,
  },
  {
    name: "Studio",
    priceUSD: 99,
    description: "Unlimited, team workspaces, game engine plugins",
  },
];

function formatPrice(priceUSD: number, currency: Currency): string {
  if (priceUSD === 0) return "Free";
  const converted = Math.round(priceUSD * EXCHANGE_RATES[currency]);
  return `${CURRENCY_SYMBOLS[currency]}${converted}`;
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("USD");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-display mb-8">
            Pricing
          </h1>

          {/* Currency Toggle */}
          <div className="inline-flex bg-white/5 border border-white/10">
            {(["USD", "GBP", "EUR"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-2 text-sm font-medium transition ${
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
      </section>

      {/* Plans */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto space-y-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`p-6 border flex items-center justify-between ${
                plan.highlighted
                  ? "border-[#66023C] bg-[#66023C]/5"
                  : "border-white/10"
              }`}
            >
              <div>
                <h2 className="text-xl font-display">{plan.name}</h2>
                <p className="text-white/50 mt-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                  {plan.description}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-display">
                  {formatPrice(plan.priceUSD, currency)}
                </span>
                {plan.priceUSD > 0 && (
                  <span className="text-white/40 text-sm ml-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                    /mo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Note */}
        <div className="max-w-3xl mx-auto mt-12 text-center">
          <p className="text-white/40" style={{ fontFamily: "Sohne, sans-serif" }}>
            Need more? <a href="mailto:hello@swanblade.com" className="text-white hover:text-[#66023C] transition">Contact us</a> for enterprise pricing.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <Link
            href="/studio"
            className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-lg font-semibold hover:bg-white/90 transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Start Free
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
