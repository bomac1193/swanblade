"use client";

import Link from "next/link";
import { generateInviteCode } from "@/lib/serialNumber";

// Mock member data - in production this would come from auth
const MOCK_MEMBER = {
  number: "SBM-2024-4729",
  name: "Alex Chen",
  email: "alex@studio.com",
  plan: "Studio",
  since: "2024-09-15",
  soundsForged: 847,
  invitesRemaining: 3,
};

export default function MemberPage() {
  const inviteCode = generateInviteCode();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-lg tracking-wide">
            Swanblade
          </Link>
          <Link
            href="/studio"
            className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Enter Studio
          </Link>
        </div>
      </header>

      {/* Member Info */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-16">
          <p
            className="font-mono text-xs text-white/30 tracking-wider mb-2"
          >
            {MOCK_MEMBER.number}
          </p>
          <h1 className="text-3xl font-display">{MOCK_MEMBER.name}</h1>
          <p className="text-white/40 mt-1" style={{ fontFamily: "Sohne, sans-serif" }}>
            Member since {new Date(MOCK_MEMBER.since).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          <div className="border border-white/10 p-6">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-2"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Plan
            </p>
            <p className="text-xl font-display">{MOCK_MEMBER.plan}</p>
          </div>
          <div className="border border-white/10 p-6">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-2"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Sounds Forged
            </p>
            <p className="text-xl font-display">{MOCK_MEMBER.soundsForged.toLocaleString()}</p>
          </div>
          <div className="border border-white/10 p-6">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-2"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Invites
            </p>
            <p className="text-xl font-display">{MOCK_MEMBER.invitesRemaining}</p>
          </div>
        </div>

        {/* Invite Code */}
        <div className="border border-white/10 p-8 mb-16">
          <p
            className="text-xs uppercase tracking-widest text-white/30 mb-4"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Your Invite Code
          </p>
          <p className="font-mono text-2xl tracking-wider text-white/70 mb-4">
            {inviteCode}
          </p>
          <p className="text-white/30 text-sm" style={{ fontFamily: "Sohne, sans-serif" }}>
            Share with colleagues. Referred members receive priority review.
          </p>
        </div>

        {/* Engine Badge */}
        <div className="text-center border-t border-white/5 pt-16">
          <p
            className="text-xs uppercase tracking-widest text-white/20 mb-2"
            style={{ fontFamily: "Sohne, sans-serif" }}
          >
            Powered by
          </p>
          <p className="font-display text-xl text-white/40">Obsidian Engine</p>
        </div>
      </main>
    </div>
  );
}
