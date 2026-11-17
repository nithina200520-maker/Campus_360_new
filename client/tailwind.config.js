/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          dark: '#060b18',
          card: '#0d1b33',
          border: 'rgba(6, 182, 212, 0.25)',
          cyan: '#00f2fe',
          cyanGlow: '#06b6d4',
          accent: '#38bdf8',
          textMuted: '#94a3b8',
        }
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 242, 254, 0.35)',
        'neon-lg': '0 0 35px rgba(0, 242, 254, 0.6)',
        'neon-card': '0 0 25px rgba(6, 182, 212, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 15px rgba(0,242,254,0.6))' },
          '50%': { opacity: 0.8, filter: 'drop-shadow(0 0 5px rgba(0,242,254,0.3))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}

