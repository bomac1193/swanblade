import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/lib/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#050608",
        ember: "#f4bba7",
        rosewood: "#7f3b47",
        smoke: "#cbbcbc",
        moss: "#6a7d6b",
      },
      boxShadow: {
        glow: "0 0 30px rgba(244, 187, 167, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
