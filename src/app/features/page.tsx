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
            We don&apos;t do demos. We don&apos;t do drafts. Every sound that leaves
            Swanblade belongs in the final cut. If it&apos;s not ready to ship, it doesn&apos;t exist.
          </p>
        </div>
      </section>

      {/* What It Does */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto space-y-12">
          <div>
            <h2 className="text-xl font-display mb-3">Generate</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Say what you hear in your head. Swanblade renders it in seconds.
              No library diving. No tweaking for hours. Just the sound you imagined, ready to use.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-3">Transform</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Feed it a field recording. Tell it what you want. Watch it become
              something you couldn&apos;t have made any other way.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-3">Ship</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Export straight to Wwise, FMOD, Unity, Unreal. Stems, metadata, everything.
              Ready to drop into your project and never think about again.
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
              <h3 className="text-lg font-display mb-3 text-white">This is for you if</h3>
              <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                You&apos;re shipping something real. A game, a film, a project with a deadline
                that isn&apos;t moving. You know exactly what good audio sounds like, and you&apos;re
                tired of tools that waste your time getting there.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-display mb-3 text-white/40">This is not for you if</h3>
              <p className="text-white/30" style={{ fontFamily: "Sohne, sans-serif" }}>
                You&apos;re shopping for the cheapest option. You want tutorials.
                You&apos;re not sure what you need yet. &quot;Good enough&quot; is good enough for you.
              </p>
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
