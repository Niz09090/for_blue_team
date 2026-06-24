/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          dark: '#0a0e27',
          darker: '#050814',
          accent: '#00d4ff',
          danger: '#ff4757',
          warning: '#ffa502',
          success: '#2ed573',
        }
      }
    },
  },
  plugins: [],
}
