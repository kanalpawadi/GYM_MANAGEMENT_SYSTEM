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
          surface: '#1A1A1A',
          surfaceHover: '#242424',
          border: '#2E2E2E',
          primary: '#FFD400',
          primaryHover: '#FFB800',
          text: '#FFFFFF',
          muted: '#B3B3B3',
          success: '#22C55E',
          danger: '#EF4444',
          card: '#141414',
        },
      },
      fontFamily: {
        heading: ['"Poppins"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Lora"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        'yellow-glow': '0 0 20px rgba(255, 212, 0, 0.25)',
        'yellow-lg': '0 0 35px rgba(255, 212, 0, 0.35)',
      },
    },
  },
  plugins: [],
}
