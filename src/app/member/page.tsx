"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface MemberData {
  id: string;
  name: string;
  email: string;
  membership_tier: string;
  membership_status: string;
  invite_code: string | null;
  invites_remaining: number;
  created_at: string;
  stripe_subscription_id: string | null;
}

interface UsageStats {
  sounds_generated: number;
  total_duration_ms: number;
}

export default function MemberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const [member, setMember] = useState<MemberData | null>(null);
  const [usage, setUsage] = useState<UsageStats>({ sounds_generated: 0, total_duration_ms: 0 });
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadMemberData();
  }, []);

  const loadMemberData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/member");
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setMember({
          id: user.id,
          name: profile.name || user.email?.split("@")[0] || "Member",
          email: user.email || "",
          membership_tier: profile.membership_tier || "pending",
          membership_status: profile.membership_status || "pending",
          invite_code: profile.invite_code,
          invites_remaining: profile.invites_remaining || 0,
          created_at: profile.created_at,
          stripe_subscription_id: profile.stripe_subscription_id,
        });
      } else {
        // Profile doesn't exist yet (dev mode)
        setMember({
          id: user.id,
          name: user.email?.split("@")[0] || "Member",
          email: user.email || "",
          membership_tier: "pending",
          membership_status: "pending",
          invite_code: null,
          invites_remaining: 0,
          created_at: new Date().toISOString(),
          stripe_subscription_id: null,
        });
      }

      // Get usage stats (if table exists)
      try {
        const { data: usageData } = await supabase
          .from("sounds")
          .select("id, duration_ms")
          .eq("user_id", user.id);

        if (usageData) {
          setUsage({
            sounds_generated: usageData.length,
            total_duration_ms: usageData.reduce((sum, s) => sum + (s.duration_ms || 0), 0),
          });
        }
      } catch {
        // Table might not exist yet
      }
    } catch (error) {
      console.error("Error loading member data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      alert("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (member?.invite_code) {
      navigator.clipboard.writeText(member.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getTierDisplay = (tier: string) => {
    switch (tier) {
      case "professional":
        return "Professional";
      case "studio":
        return "Studio";
      case "enterprise":
        return "Enterprise";
      default:
        return "Pending";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400";
      case "past_due":
        return "text-yellow-400";
      case "cancelled":
        return "text-red-400";
      default:
        return "text-white/40";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Not authenticated</p>
          <Link href="/login" className="text-white/70 hover:text-white underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-display text-lg tracking-wide">
            Swanblade
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/studio"
              className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition"
             
            >
              Enter Studio
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs uppercase tracking-widest text-white/30 hover:text-white/60 transition"
             
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {success && (
        <div className="max-w-3xl mx-auto px-6 pt-6">
          <div className="border border-green-500/30 bg-green-500/10 p-4 text-center">
            <p className="text-green-400 text-sm">
              Welcome to Swanblade. Your membership is now active.
            </p>
          </div>
        </div>
      )}

      {/* Member Info */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-16">
          <p className="font-mono text-xs text-white/30 tracking-wider mb-2">
            {member.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="text-3xl font-display">{member.name}</h1>
          <p className="text-white/40 mt-1">
            {member.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          <div className="border border-white/10 p-6">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-2"
             
            >
              Membership
            </p>
            <p className="text-xl font-display">{getTierDisplay(member.membership_tier)}</p>
            <p className={`text-xs mt-1 ${getStatusColor(member.membership_status)}`}>
              {member.membership_status}
            </p>
          </div>
          <div className="border border-white/10 p-6">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-2"
             
            >
              Sounds Generated
            </p>
            <p className="text-xl font-display">{usage.sounds_generated.toLocaleString()}</p>
            <p className="text-xs text-white/30 mt-1">
              {formatDuration(usage.total_duration_ms)} total
            </p>
          </div>
          <div className="border border-white/10 p-6">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-2"
             
            >
              Invites Left
            </p>
            <p className="text-xl font-display">{member.invites_remaining}</p>
          </div>
        </div>

        {/* Invite Code */}
        {member.invite_code && (
          <div className="border border-white/10 p-8 mb-8">
            <p
              className="text-xs uppercase tracking-widest text-white/30 mb-4"
             
            >
              Your Invite Code
            </p>
            <div className="flex items-center gap-4">
              <p className="font-mono text-2xl tracking-wider text-white/70">
                {member.invite_code}
              </p>
              <button
                onClick={handleCopyInviteCode}
                className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition border border-white/20 px-3 py-1"
               
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-white/30 text-sm mt-4">
              Share with colleagues. Referred members receive priority review.
            </p>
          </div>
        )}

        {/* Membership Actions */}
        <div className="border border-white/10 p-8 mb-16">
          <p
            className="text-xs uppercase tracking-widest text-white/30 mb-6"
           
          >
            Membership
          </p>

          {member.membership_status === "active" && member.stripe_subscription_id ? (
            <div className="space-y-4">
              <p className="text-white/50">
                Manage your subscription, update payment method, or view invoices.
              </p>
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="border border-white/30 text-white py-3 px-6 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition disabled:opacity-50"
               
              >
                {portalLoading ? "..." : "Manage Billing"}
              </button>
            </div>
          ) : member.membership_status === "pending" ? (
            <div className="space-y-4">
              <p className="text-white/50">
                Upgrade to unlock the full Swanblade studio.
              </p>
              <Link
                href="/pricing"
                className="inline-block border border-white/30 text-white py-3 px-6 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
               
              >
                View Plans
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/50">
                Your membership is {member.membership_status}. Reactivate to continue.
              </p>
              <Link
                href="/pricing"
                className="inline-block border border-white/30 text-white py-3 px-6 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition"
               
              >
                Reactivate
              </Link>
            </div>
          )}
        </div>

        {/* Twin OS Connection */}
        <div className="border border-white/10 p-8 mb-16">
          <p
            className="text-xs uppercase tracking-widest text-white/30 mb-6"
           
          >
            Twin OS
          </p>
          <p className="text-white/50 mb-4">
            Connect to Starforge to sync your Audio DNA and enhance sound generation with your personal taste profile.
          </p>
          <Link
            href="/settings"
            className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition"
           
          >
            Configure in Settings
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-white/5 pt-16">
          <p
            className="text-xs uppercase tracking-widest text-white/20 mb-2"
           
          >
            Diamonds or Silence
          </p>
          <p className="font-display text-xl text-white/40 italic">Swanblade</p>
        </div>
      </main>
    </div>
  );
}
