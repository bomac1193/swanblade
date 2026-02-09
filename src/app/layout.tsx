import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swanblade — Sound Design Lab",
  description: "Prompt-driven audio generation with game-state awareness.",
  manifest: "/manifest.json",
  themeColor: "#66023C",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Swanblade",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

// Script to prevent flash of wrong theme - reset to light mode
const themeScript = `
  (function() {
    try {
      // Force reset to light mode
      localStorage.removeItem('swanblade-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
