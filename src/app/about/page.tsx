"use client";

import MarketingLayout from "@/components/MarketingLayout";

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-display mb-6">
            Burn The Square
          </h1>
          <p className="text-xl text-white/60 max-w-2xl" style={{ fontFamily: "Sohne, sans-serif" }}>
            We&apos;re building tools that break the constraints of traditional sound design.
            No more endless sample libraries. No more repetitive asset creation.
            Just pure creative flow.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display mb-8">Our Mission</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="text-lg text-white/70 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
                Swanblade exists to democratize professional sound design. We believe every game
                developer, filmmaker, and content creator deserves access to high-quality audio
                tools—regardless of budget or technical expertise.
              </p>
            </div>
            <div>
              <p className="text-lg text-white/70 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
                Traditional audio production is slow, expensive, and often inaccessible.
                We&apos;re changing that by combining generative AI with professional audio engineering
                to create tools that are both powerful and intuitive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display mb-12">What We Believe</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Quality Over Quantity",
                description: "Every generated sound should be production-ready. We don't ship mediocre outputs.",
              },
              {
                title: "Transparent Provenance",
                description: "Know exactly where your sounds come from. Full ownership, clear licensing, no surprises.",
              },
              {
                title: "Creator First",
                description: "Our tools enhance human creativity, not replace it. You're the artist. We're the instrument.",
              },
            ].map((value) => (
              <div key={value.title} className="border border-white/10 p-6">
                <h3 className="text-xl font-display mb-3">{value.title}</h3>
                <p className="text-white/60" style={{ fontFamily: "Sohne, sans-serif" }}>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display mb-8">The Story</h2>
          <div className="space-y-6 text-lg text-white/70 leading-relaxed" style={{ fontFamily: "Sohne, sans-serif" }}>
            <p>
              Swanblade started from a simple frustration: creating unique, high-quality game audio
              was taking too long and costing too much. Hours spent searching sample libraries.
              Days spent tweaking synthesizers. Weeks waiting for custom recordings.
            </p>
            <p>
              We saw how generative AI was transforming image and text creation, and asked:
              why not audio? But existing tools produced sounds that were interesting experiments,
              not production-ready assets.
            </p>
            <p>
              So we built something different. Swanblade combines state-of-the-art generative models
              with professional audio engineering pipelines. The result: sounds that are ready to
              drop into your project, with the quality your audience expects.
            </p>
            <p>
              Today, Swanblade powers audio for indie games, AAA titles, films, and content creators
              worldwide. But we're just getting started.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display mb-12">Built With</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Multiple AI Providers",
              "Web Audio API",
              "Professional DSP",
              "Real-time Collaboration",
              "Wwise Integration",
              "FMOD Integration",
              "Unity Plugin",
              "Unreal Plugin",
            ].map((tech) => (
              <div
                key={tech}
                className="p-4 border border-white/10 text-center text-sm text-white/60 hover:border-white/30 transition"
                style={{ fontFamily: "Sohne, sans-serif" }}
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-display mb-6">Get in Touch</h2>
          <p className="text-lg text-white/60 mb-8" style={{ fontFamily: "Sohne, sans-serif" }}>
            Questions, partnerships, or just want to say hello? We&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@swanblade.com"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 text-lg font-semibold hover:bg-white/90 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8l9-4 9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              hello@swanblade.com
            </a>
            <a
              href="https://twitter.com/swanblade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/30 text-white px-8 py-4 text-lg font-semibold hover:bg-white/10 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @swanblade
            </a>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
