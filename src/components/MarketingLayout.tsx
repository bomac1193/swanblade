"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MarketingLayoutProps {
  children: ReactNode;
}

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 flex items-center justify-center border border-white/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight font-display">
              Swanblade
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  pathname === link.href
                    ? "text-white"
                    : "text-white/60 hover:text-white"
                }`}
                style={{ fontFamily: "Sohne, sans-serif" }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/studio"
              className="bg-white text-black px-5 py-2 text-sm font-medium hover:bg-white/90 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Open Studio
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-24">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <span className="text-lg font-semibold font-display">Swanblade</span>
              <p className="mt-3 text-sm text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                AI-powered sound design for games and media.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ fontFamily: "Sohne, sans-serif" }}>Product</h4>
              <ul className="space-y-2 text-sm text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/studio" className="hover:text-white transition">Studio</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ fontFamily: "Sohne, sans-serif" }}>Resources</h4>
              <ul className="space-y-2 text-sm text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition">Changelog</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ fontFamily: "Sohne, sans-serif" }}>Company</h4>
              <ul className="space-y-2 text-sm text-white/50" style={{ fontFamily: "Sohne, sans-serif" }}>
                <li><Link href="/about" className="hover:text-white transition">About</Link></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex items-center justify-between text-sm text-white/40" style={{ fontFamily: "Sohne, sans-serif" }}>
            <p>&copy; {new Date().getFullYear()} Swanblade. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MarketingLayout;
