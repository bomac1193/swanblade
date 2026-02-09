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
            Built for studios that ship.
          </h1>
          <p className="text-white/50 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            Swanblade is not a toy. It&apos;s not for hobbyists exploring sound design
            on weekends. It&apos;s for professionals under deadline who need production-ready
            audio without the wait.
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
            Fit
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-display mb-3 text-white">This is for you if:</h3>
              <ul className="space-y-2 text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li>You&apos;re shipping a game or film with real deadlines</li>
                <li>You know what good audio sounds like</li>
                <li>You value your time more than learning another tool</li>
                <li>You need results, not experiments</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-display mb-3 text-white/40">This is not for you if:</h3>
              <ul className="space-y-2 text-white/30" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li>You&apos;re looking for the cheapest option</li>
                <li>You want tutorials and hand-holding</li>
                <li>You&apos;re not sure what you need yet</li>
                <li>&quot;Good enough&quot; is good enough</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto text-center">
          <Link
            href="/pricing"
            className="inline-block border border-white/30 text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            View Pricing
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
