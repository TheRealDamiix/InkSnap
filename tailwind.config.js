/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        ink: {
          black: '#0a0a0b',
          dark: '#111114',
          surface: '#18181c',
          raised: '#1f1f24',
          red: '#e63946',
          text: '#f0eeea',
          muted: '#8a8885',
          faint: '#4a4846',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
