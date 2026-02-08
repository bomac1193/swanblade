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
        // Monochrome palette (Starforge aesthetic)
        'brand-bg': '#FAFAFA',
        'brand-surface': '#FFFFFF',
        'brand-text': '#0A0A0A',
        'brand-secondary': '#6A6A6A',
        'brand-border': '#E0E0E0',
        'brand-accent': '#2A2A2A',

        // Status colors (minimal)
        'status-success': '#1A1A1A',
        'status-error': '#8B0000',
        'status-pending': '#6A6A6A',
      },
      fontFamily: {
        // PRIMARY HEADINGS (H1-H3): Presence, naming, orientation
        display: ['Canela', 'Georgia', 'serif'],
        // SECONDARY HEADINGS & BODY: Structural, operational, clear
        sans: ['Söhne', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // H1-H3: Canela (announces, never explains)
        'display-xl': ['48px', { lineHeight: '56px', fontWeight: '500' }],
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '500' }],
        'display-md': ['24px', { lineHeight: '32px', fontWeight: '400' }],

        // H4-H6: Söhne (structural labels)
        'heading-lg': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'heading': ['18px', { lineHeight: '26px', fontWeight: '500' }],
        'heading-sm': ['16px', { lineHeight: '24px', fontWeight: '500' }],

        // Body & UI: Söhne Buch
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'label': ['11px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      letterSpacing: {
        'wider': '0.05em',
        'widest': '0.1em',
      },
      maxWidth: {
        'container': '1200px',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
