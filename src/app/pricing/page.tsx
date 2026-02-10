"use client";

import { useState } from "react";
import Link from "next/link";
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
    name: "Professional",
    monthlyUSD: 299,
    annualUSD: 2999,
    description: "For those who ship. Individual membership.",
  },
  {
    name: "Studio",
    monthlyUSD: 999,
    annualUSD: 9999,
    description: "For teams who don't compromise. 5 seats.",
    highlighted: true,
  },
  {
    name: "Enterprise",
    monthlyUSD: null,
    annualUSD: 25000,
    description: "Custom terms. Minimum commitment.",
  },
];

function formatPrice(priceUSD: number | null, currency: Currency): string {
  if (priceUSD === null) return "Custom";
  const converted = Math.round(priceUSD * EXCHANGE_RATES[currency]);
  return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString()}`;
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Membership
          </p>
          <h1 className="text-4xl font-display mb-8">
            Diamonds or Silence.
          </h1>
          <p className="text-white/50 leading-relaxed mb-8" style={{ fontFamily: "Sohne, sans-serif" }}>
            No free tier. No trials. No compromises.
            Swanblade is for those who ship.
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
                style={{ fontFamily: "Sohne, sans-serif" }}
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
                style={{ fontFamily: "Sohne, sans-serif" }}
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
                  style={{ fontFamily: "Sohne, sans-serif" }}
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
            return (
              <div
                key={plan.name}
                className={`p-8 border ${
                  plan.highlighted
                    ? "border-[#66023C]"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-display">{plan.name}</h2>
                    <p className="text-white/40 text-sm mt-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                      {plan.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-display">
                      {formatPrice(price, currency)}
                    </span>
                    {price && (
                      <span className="text-white/30 text-sm ml-1" style={{ fontFamily: "Sohne, sans-serif" }}>
                        /{billing === "annual" ? "year" : "month"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Annual savings note */}
        {billing === "annual" && (
          <div className="max-w-2xl mx-auto mt-6">
            <p className="text-white/30 text-sm" style={{ fontFamily: "Sohne, sans-serif" }}>
              Annual membership includes two months.
            </p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="border border-white/10 p-6 mb-8 inline-block">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-1 font-mono"
            >
              Q1 2026
            </p>
            <p className="text-white/70" style={{ fontFamily: "Sohne, sans-serif" }}>
              <span className="text-white font-display text-2xl">12</span> seats remaining
            </p>
          </div>
          <div>
            <Link
              href="/apply"
              className="inline-block border border-white/30 text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Join Swanblade
            </Link>
          </div>
          <p
            className="text-xs uppercase tracking-widest text-white/20 mt-8"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Not for everyone
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
