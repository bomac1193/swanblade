"use client";

import MarketingLayout from "@/components/MarketingLayout";

const FEATURES = [
  {
    category: "Generation",
    items: [
      {
        title: "AI Sound Generation",
        description: "Generate production-ready sounds from text prompts. Describe what you need and get instant results.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: "Sound Lineage & Variations",
        description: "Track the ancestry of your sounds and generate intelligent variations that maintain sonic consistency.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8v4M9 14l-1.5 1.5M15 14l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: "Sound Transformation",
        description: "Upload existing audio and transform it with natural language. Turn a door slam into a sci-fi impact.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: "Voice + Sound Fusion",
        description: "Create creature vocalizations, alien languages, and effort sounds by fusing voice with synthesis.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Game Audio",
    items: [
      {
        title: "Procedural Audio Recipes",
        description: "Build recipes for sounds that never repeat. Footsteps, ambiences, and UI sounds that stay fresh.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
            <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        title: "Adaptive Audio Engine",
        description: "Create music and sound that responds to game state in real-time. Map parameters to audio behavior.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 12h2l2-8 3 16 3-8 2 4 2-4 3 8 3-16 2 8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: "State Machine Editor",
        description: "Visual editor for audio state machines. Define transitions, conditions, and crossfades intuitively.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="19" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="19" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        title: "Game Engine Export",
        description: "One-click export to Unity, Unreal, Wwise, and FMOD. Complete with scripts and event setup.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Intelligence",
    items: [
      {
        title: "Scene Analysis",
        description: "Upload video and get AI-suggested sound design. Automatic scene detection and emotional mapping.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
          </svg>
        ),
      },
      {
        title: "Sound DNA",
        description: "Every sound has a unique DNA fingerprint. Use it for similarity matching and intelligent organization.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2v20M8 4v4M16 4v4M8 16v4M16 16v4M4 8h16M4 12h16M4 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: "Provenance Tracking",
        description: "Stamp every sound with cryptographic provenance. Track ownership and generation history.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    category: "Collaboration",
    items: [
      {
        title: "Team Workspaces",
        description: "Shared sound palettes with role-based permissions. Owner, Lead, Designer, and Viewer roles.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="19" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M23 21v-1.5a2.5 2.5 0 00-2.5-2.5h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: "Real-time Sync",
        description: "See team members working in real-time. Cursors, selections, and changes sync instantly.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 11-9-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: "Approval Workflows",
        description: "Sound approval system for quality control. Leads can approve or reject additions to palettes.",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-display mb-6">
            Everything You Need for
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Professional Sound Design
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto" style={{ fontFamily: "Sohne, sans-serif" }}>
            From AI generation to game engine integration, Swanblade provides the complete toolkit for modern audio production.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      {FEATURES.map((section) => (
        <section key={section.category} className="py-16 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-display mb-12">{section.category}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {section.items.map((feature) => (
                <div
                  key={feature.title}
                  className="group p-6 border border-white/10 hover:border-white/30 transition-all hover:bg-white/5"
                >
                  <div className="w-12 h-12 bg-white/10 flex items-center justify-center mb-4 text-white/70 group-hover:text-white transition">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-display mb-2">{feature.title}</h3>
                  <p className="text-white/60" style={{ fontFamily: "Sohne, sans-serif" }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-display mb-6">Ready to Transform Your Workflow?</h2>
          <p className="text-lg text-white/60 mb-8" style={{ fontFamily: "Sohne, sans-serif" }}>
            Start creating professional game audio with AI assistance today.
          </p>
          <a
            href="/studio"
            className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 text-lg font-semibold hover:bg-white/90 transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Open Studio
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
