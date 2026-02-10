"use client";

import Link from "next/link";
import MarketingLayout from "@/components/MarketingLayout";

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Capabilities
          </p>
          <h1 className="text-4xl font-display mb-8">
            Your sound. Finally.
          </h1>
          <p className="text-white/50 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            Swanblade don&apos;t compromise. Every sound is broadcast-ready.
            Every output belongs in the final cut. Diamonds or silence.
          </p>
        </div>
      </section>

      {/* What It Does */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto space-y-12">
          <div>
            <h2 className="text-xl font-display mb-3">Generate</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Describe what you need. Get broadcast-quality results in seconds, not days.
              No sample library diving. No endless tweaking.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-3">Transform</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Take existing audio and reshape it with language. Turn a field recording
              into something otherworldly while preserving what matters.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-3">Ship</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              One-click export to Wwise, FMOD, Unity, Unreal. Stems, metadata,
              implementation-ready. Your middleware, not ours.
            </p>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-[0.3em] text-white/30 mb-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Swanblade
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-display mb-3 text-white">You belong here if:</h3>
              <ul className="space-y-2 text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li>You ship. Games, films, projects with real deadlines.</li>
                <li>You know what good audio sounds like.</li>
                <li>You value your time more than learning another tool.</li>
                <li>You refuse to settle.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-display mb-3 text-white/40">This is not for you if:</h3>
              <ul className="space-y-2 text-white/30" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li>You&apos;re looking for the cheapest option.</li>
                <li>You need tutorials and hand-holding.</li>
                <li>You&apos;re still exploring.</li>
                <li>&quot;Good enough&quot; is good enough.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <Link
            href="/apply"
            className="inline-block border border-white/30 text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Join Swanblade
          </Link>
          <p
            className="text-xs text-white/20 uppercase tracking-widest mt-6"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Not for everyone
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
