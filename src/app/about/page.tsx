"use client";

import MarketingLayout from "@/components/MarketingLayout";

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-display mb-8">
            About
          </h1>
          <p className="text-xl text-white/60 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            Swanblade makes sound design fast. We build tools that let you create,
            transform, and export game-ready audio without the usual friction.
          </p>
        </div>
      </section>

      {/* Core Belief */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display mb-6">What We Believe</h2>
          <p className="text-lg text-white/60 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            Every game deserves great audio. Budget and timeline shouldn&apos;t be the barrier.
            We&apos;re building tools that give small teams the same capabilities as AAA studios.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display mb-6">Get in Touch</h2>
          <a
            href="mailto:hello@swanblade.com"
            className="text-lg text-white hover:text-[#66023C] transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            hello@swanblade.com
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
