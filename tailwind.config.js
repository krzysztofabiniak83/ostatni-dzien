/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#F5F3EE',
        'bg-card': '#FFFFFF',
        'bg-subtle': '#EDEAE3',
        'ink-primary': '#0D1F1A',
        'ink-secondary': '#5C6661',
        'ink-tertiary': '#9AA09C',
        accent: '#1F3D33',
        'accent-hover': '#2A5444',
        'accent-soft': '#E8EEEB',
        alert: '#B85C3C',
        'alert-soft': '#F5E4DC',
        'alert-bg': '#FAF1EC',
        hairline: '#E0DDD5',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Geist', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
      spacing: {
        's-1': '4px',
        's-2': '8px',
        's-3': '12px',
        's-4': '16px',
        's-5': '24px',
        's-6': '32px',
        's-7': '48px',
        's-8': '64px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
      letterSpacing: {
        mono: '0.12em',
        'mono-wide': '0.14em',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
