import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Charte Arena Malachite (stone et sky gardent leurs nuances Tailwind d'origine)
        stone: { ...colors.stone, DEFAULT: '#0d1311' },
        sky: { ...colors.sky, DEFAULT: '#5cc8ff' },
        slab: { DEFAULT: '#151d1a', 2: '#1c2723' },
        line: '#26332e',
        ink: '#e9f1ed',
        mute: '#8fa39a',
        mala: { DEFAULT: '#2fd28a', deep: '#0f7a4f' },
        gold: { DEFAULT: '#f2c14e', deep: '#9a6a12' },
        flame: '#ff8a3d',
        heart: '#ff5470',
      },
      fontFamily: {
        display: ['var(--font-unbounded)', 'system-ui', 'sans-serif'],
        body: ['var(--font-figtree)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '60%': { opacity: '1', transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'ecg-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'heartbeat': {
          '0%, 40%, 100%': { transform: 'scale(1)' },
          '10%': { transform: 'scale(1.18)' },
          '20%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.12)' },
        },
        'flame-flicker': {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)' },
          '25%': { transform: 'scale(1.06, 0.96) rotate(2deg)' },
          '50%': { transform: 'scale(0.97, 1.05) rotate(-1deg)' },
          '75%': { transform: 'scale(1.04, 0.98) rotate(1.5deg)' },
        },
        'cell-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(24px, -36px, 0)' },
        },
        'node-breathe': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-4px) scale(1.07)' },
        },
        'logo-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'gold-dust': {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '20%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-90px)', opacity: '0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'pop-in': 'pop-in 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'ecg-scroll': 'ecg-scroll 3s linear infinite',
        'heartbeat': 'heartbeat 1.4s ease-in-out infinite',
        'heartbeat-fast': 'heartbeat 0.7s ease-in-out infinite',
        'flame-flicker': 'flame-flicker 1.2s ease-in-out infinite',
        'cell-drift': 'cell-drift 18s ease-in-out infinite',
        'node-breathe': 'node-breathe 2.2s ease-in-out infinite',
        'logo-pulse': 'logo-pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.8s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'gold-dust': 'gold-dust 6s ease-in infinite',
      }
    },
  },
  plugins: [],
};
export default config;
