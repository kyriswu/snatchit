/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        'primary-light': '#A78BFA',
        accent: '#F97316',
        'bg-light': '#FAF5FF',
        'text-dark': '#4C1D95',
        // Cyber Neon Green Theme
        'cyber-green': '#00FF88',
        'cyber-green-dark': '#00CC6F',
        'cyber-bg': '#0F0F23',
        'cyber-secondary': '#1a1a3e',
      },
      fontFamily: {
        'fira-code': ['Fira Code', 'monospace'],
        'fira-sans': ['Fira Sans', 'sans-serif'],
        'orbitron': ['Orbitron', 'sans-serif'],
        'exo-2': ['Exo 2', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
