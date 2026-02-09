"use client";

import Link from "next/link";
import MarketingLayout from "@/components/MarketingLayout";

const FEATURES = [
  {
    title: "Generate",
    description: "Create production-ready sounds from text. Describe what you need, get instant results.",
  },
  {
    title: "Transform",
    description: "Upload audio and reshape it with words. Turn any sound into something new.",
  },
  {
    title: "Export",
    description: "One-click export to Unity, Unreal, Wwise, and FMOD. Ready for your game engine.",
  },
  {
    title: "Collaborate",
    description: "Share palettes with your team. Real-time sync, approval workflows, role-based access.",
  },
];

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-display mb-8">
            What Swanblade Does
          </h1>
          <p className="text-xl text-white/60" style={{ fontFamily: "Sohne, sans-serif" }}>
            Sound design tools that get out of your way.
          </p>
        </div>
      </section>

      {/* Features - Simple List */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto space-y-16">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className="flex gap-8">
              <span className="text-white/20 text-sm font-mono" style={{ fontFamily: "Sohne, sans-serif" }}>
                0{i + 1}
              </span>
              <div>
                <h2 className="text-2xl font-display mb-3">{feature.title}</h2>
                <p className="text-lg text-white/60" style={{ fontFamily: "Sohne, sans-serif" }}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
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
            Try It Now
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
