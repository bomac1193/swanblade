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
    name: "Professional",
    priceUSD: 149,
    interval: "month",
    description: "For individual sound designers and composers working on commercial projects.",
    includes: "Unlimited generations, all export formats, commercial license, priority rendering",
  },
  {
    name: "Studio",
    priceUSD: 449,
    interval: "month",
    description: "For teams shipping games, films, or interactive media.",
    includes: "Everything in Professional, plus 5 seats, shared palettes, Wwise/FMOD integration, dedicated support",
    highlighted: true,
  },
  {
    name: "Enterprise",
    priceUSD: null,
    interval: null,
    description: "For large studios with custom requirements.",
    includes: "Unlimited seats, on-premise option, custom model training, SLA, dedicated account manager",
  },
];

function formatPrice(priceUSD: number | null, currency: Currency): string {
  if (priceUSD === null) return "Custom";
  const converted = Math.round(priceUSD * EXCHANGE_RATES[currency]);
  return `${CURRENCY_SYMBOLS[currency]}${converted}`;
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("USD");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Investment
          </p>
          <h1 className="text-4xl font-display mb-8">
            Priced for professionals.
          </h1>
          <p className="text-white/50 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            We don&apos;t offer a free tier. If you&apos;re exploring or unsure,
            this isn&apos;t the right tool yet. When you&apos;re ready to invest
            in your audio, we&apos;re here.
          </p>

          {/* Currency Toggle */}
          <div className="mt-8 inline-flex border border-white/10">
            {(["USD", "GBP", "EUR"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-2 text-xs uppercase tracking-widest transition ${
                  currency === c
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white"
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
        <div className="max-w-2xl mx-auto space-y-8">
          {PLANS.map((plan) => (
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
                  <p className="text-white/40 text-sm mt-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                    {plan.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-display">
                    {formatPrice(plan.priceUSD, currency)}
                  </span>
                  {plan.interval && (
                    <span className="text-white/30 text-sm ml-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                      /{plan.interval}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-white/50 text-sm" style={{ fontFamily: "Sohne, sans-serif" }}>
                {plan.includes}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Annual Note */}
      <section className="py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/30 text-sm" style={{ fontFamily: "Sohne, sans-serif" }}>
            Annual billing available. Two months included.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-white/40 mb-6" style={{ fontFamily: "Sohne, sans-serif" }}>
            Ready to elevate your audio?
          </p>
          <Link
            href="/studio"
            className="inline-block border border-white/30 text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Apply for Access
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
