import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const canela = localFont({
  src: [
    { path: "../../public/fonts/canela/Canela-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/canela/Canela-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/canela/Canela-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/canela/Canela-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-canela",
  display: "swap",
});

const canelaText = localFont({
  src: [
    { path: "../../public/fonts/canela-text/CanelaText-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/canela-text/CanelaText-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/canela-text/CanelaText-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-canela-text",
  display: "swap",
});

const sohne = localFont({
  src: [
    { path: "../../public/fonts/sohne/Sohne-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/sohne/Sohne-Regular.otf", weight: "400", style: "normal" },
    { path: "../../public/fonts/sohne/Sohne-Medium.otf", weight: "500", style: "normal" },
    { path: "../../public/fonts/sohne/Sohne-Semibold.otf", weight: "600", style: "normal" },
    { path: "../../public/fonts/sohne/Sohne-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-sohne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swanblade — Diamonds or Silence",
  description: "Your sound. Finally. For creators who ship.",
  manifest: "/manifest.json",
  themeColor: "#0A0A0A",
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
    <html lang="en" className={`${canela.variable} ${canelaText.variable} ${sohne.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sohne.className} antialiased bg-black`}>
        {children}
      </body>
    </html>
  );
}
