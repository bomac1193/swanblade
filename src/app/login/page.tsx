"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-white/40">Loading...</p>
        </div>
      }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/studio";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Check your email for the confirmation link.");
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-[280px]">
        {/* Logo — centered */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block">
            <span className="text-lg font-display font-normal text-white tracking-wide">
              Swanblade
            </span>
          </Link>
        </div>

        {/* Header */}
        <p className="text-xs text-white/40 mb-6 text-center">
          {mode === "login" ? "Sign in" : "Create account"}
        </p>

        {/* Message */}
        {message && (
          <div className="border border-white/10 p-3 mb-6">
            <p className="text-xs text-white/50">{message}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        {/* Form */}
        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              style={{ backgroundColor: "#161616" }}
              className="w-full bg-[#161616] border border-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition"
              disabled={loading}
            />
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ backgroundColor: "#161616" }}
            className="w-full bg-[#161616] border border-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition"
            disabled={loading}
          />

          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ backgroundColor: "#161616" }}
            className="w-full bg-[#161616] border border-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs tracking-wide text-white border border-white/20 hover:bg-white hover:text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "..." : mode === "login" ? "Enter" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-black text-[10px] text-white/20">
              or
            </span>
          </div>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 text-xs tracking-wide text-white/60 border border-white/[0.06] hover:border-white/20 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue with Google
        </button>

        {/* Toggle mode */}
        <div className="mt-10 text-center">
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-xs text-white/30 hover:text-white/60 transition"
          >
            {mode === "login" ? "Create account" : "Sign in instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
