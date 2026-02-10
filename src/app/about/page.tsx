"use client";

import MarketingLayout from "@/components/MarketingLayout";

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Philosophy
          </p>
          <h1 className="text-4xl font-display mb-8">
            The rest is noise.
          </h1>
          <p className="text-white/50 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            Swanblade exists for creators who ship. Not hobbyists. Not experimenters.
            Those who put sound in front of millions and refuse to compromise.
          </p>
        </div>
      </section>

      {/* Belief */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto space-y-12">
          <div>
            <h2 className="text-xl font-display mb-4">Diamonds or nothing</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Every sound that leaves Swanblade is broadcast-ready. We don&apos;t ship
              interesting experiments. We ship audio that belongs in the final cut.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-4">Your sound. Finally.</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              You&apos;ve compromised long enough. Swanblade delivers the sound you&apos;ve
              always heard in your head. The search ends here.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-4">Not for everyone</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              We price for commitment. We design for professionals.
              Swanblade is a tribe of those who refuse to settle.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Contact
          </p>
          <p className="text-white/50 mb-4" style={{ fontFamily: "Sohne, sans-serif" }}>
            For enterprise inquiries and partnerships:
          </p>
          <a
            href="mailto:studio@swanblade.com"
            className="text-white hover:text-[#66023C] transition font-display text-xl"
          >
            studio@swanblade.com
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
