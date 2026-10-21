/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gym: {
          bg: '#0A0A0A',
          // Gold theme (matches the live RV Fitness login design).
          surface: '#18181B',
          surfaceHover: '#27272A',
          border: '#27272A',
          primary: '#D4AF37',
          primaryHover: '#E6C65C',
          goldLight: '#FDE68A',
          goldDark: '#997E25',
          text: '#FFFFFF',
          muted: '#A1A1AA',
          success: '#22C55E',
          danger: '#EF4444',
          card: '#141414',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FDE68A, #D4AF37, #997E25)',
      },
      boxShadow: {
        // Names kept so existing classes pick up the gold glow.
        'yellow-glow': '0 4px 15px -3px rgba(212, 175, 55, 0.35)',
        'yellow-lg': '0 8px 28px -4px rgba(212, 175, 55, 0.5)',
      },
    },
  },
  plugins: [],
}
