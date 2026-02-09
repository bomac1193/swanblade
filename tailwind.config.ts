import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/lib/**/*.{ts,tsx,mdx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for theme support with alpha channel support
        'brand-bg': 'var(--brand-bg)',
        'brand-surface': 'var(--brand-surface)',
        'brand-text': 'var(--brand-text)',
        'brand-secondary': 'var(--brand-secondary)',
        'brand-border': 'rgb(var(--brand-border-rgb) / <alpha-value>)',
        'brand-accent': 'var(--brand-accent)',

        // Status colors
        'status-success': '#16A34A',
        'status-error': '#DC2626',
        'status-warning': '#D97706',
        'status-pending': 'var(--brand-secondary)',
      },
      fontFamily: {
        // PRIMARY HEADINGS (H1-H3): Presence, naming, orientation
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        // SECONDARY HEADINGS & BODY: Structural, operational, clear
        sans: ['Sohne', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        ui: ['Sohne', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
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
