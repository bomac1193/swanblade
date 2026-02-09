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
            We build instruments, not toys.
          </h1>
          <p className="text-white/50 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            Swanblade exists for one reason: to give professional sound designers
            the tools they deserve. Not the tools they can afford. Not the tools
            that are easy to market. The tools that actually work.
          </p>
        </div>
      </section>

      {/* Belief */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-2xl mx-auto space-y-12">
          <div>
            <h2 className="text-xl font-display mb-4">Quality is non-negotiable</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              Every sound that leaves Swanblade is broadcast-ready. We don&apos;t ship
              interesting experiments. We ship audio you can put in front of millions.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-4">Your time is valuable</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              We respect that you have deadlines, budgets, and stakeholders.
              Swanblade gets out of your way and lets you work.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-display mb-4">Not for everyone</h2>
            <p className="text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
              We deliberately price and position Swanblade for professionals.
              This keeps our focus sharp and our users serious.
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
            For inquiries, partnerships, or enterprise discussions:
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
