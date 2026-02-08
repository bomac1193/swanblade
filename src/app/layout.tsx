import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swanblade — Sound Design Lab",
  description: "Prompt-driven audio generation with game-state awareness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-brand-bg text-brand-text">
        {children}
      </body>
    </html>
  );
}
