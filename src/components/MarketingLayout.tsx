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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-display text-lg">
            Swanblade
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition ${
                  pathname === link.href
                    ? "text-white"
                    : "text-white/50 hover:text-white"
                }`}
                style={{ fontFamily: "Sohne, sans-serif" }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/studio"
              className="bg-white text-black px-4 py-2 text-sm hover:bg-white/90 transition"
              style={{ fontFamily: "Sohne, sans-serif" }}
            >
              Studio
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">{children}</main>

      {/* Footer - Minimal */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-white/30" style={{ fontFamily: "Sohne, sans-serif" }}>
          <span>&copy; {new Date().getFullYear()} Swanblade</span>
          <a href="mailto:hello@swanblade.com" className="hover:text-white transition">
            hello@swanblade.com
          </a>
        </div>
      </footer>
    </div>
  );
}

export default MarketingLayout;
