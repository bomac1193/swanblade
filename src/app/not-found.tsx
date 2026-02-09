import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="text-center">
        <p
          className="font-mono text-xs text-white/20 mb-8 tracking-wider"
        >
          SB-ERR-404
        </p>
        <h1 className="text-4xl font-display mb-4">Nothing here.</h1>
        <p
          className="text-white/40 mb-12"
          style={{ fontFamily: "Sohne, sans-serif" }}
        >
          The path you followed doesn&apos;t lead anywhere.
        </p>
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition"
          style={{ fontFamily: "Sohne, sans-serif" }}
        >
          Return
        </Link>
      </div>
    </div>
  );
}
