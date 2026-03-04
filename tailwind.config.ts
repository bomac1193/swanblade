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
        sans: ['Sohne', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['Sohne', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'monospace'],
      },
      fontSize: {
        // Imprint brutal scale
        'display-xl': ['8rem', { lineHeight: '0.85', letterSpacing: '-0.04em' }],
        'display-lg': ['5rem', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
        'display-md': ['3rem', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-sm': ['2rem', { lineHeight: '1', letterSpacing: '-0.01em' }],
        'body-lg': ['1.25rem', { lineHeight: '1.5' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
        'overline': ['0.625rem', { lineHeight: '1.2', letterSpacing: '0.1em' }],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        bold: '700',
        black: '900',
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0',
        wide: '0.02em',
        wider: '0.05em',
        widest: '0.1em',
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
