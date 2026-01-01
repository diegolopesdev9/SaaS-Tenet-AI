
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyan: {
          DEFAULT: "#00FFFF",
          50: "#E5FFFF",
          100: "#CCFFFF",
          200: "#99FFFF",
          300: "#66FFFF",
          400: "#33FFFF",
          500: "#00FFFF",
          600: "#00CCCC",
          700: "#009999",
          800: "#006666",
          900: "#003333",
        },
        anthracite: {
          DEFAULT: "#1A1A1A",
          light: "#2D2D2D",
          dark: "#0F0F0F",
        },
        silver: {
          DEFAULT: "#C0C0C0",
          light: "#E8E8E8",
          dark: "#A0A0A0",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
