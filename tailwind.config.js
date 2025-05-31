/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#fffefa',
        'text-primary': '#201f1d',
        'accent': '#EB5E28',
      },
    },
  },
  plugins: [],
}

