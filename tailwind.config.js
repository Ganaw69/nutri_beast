/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#d90429",
        "primary-dark": "#b0021f",
        "primary-light": "#ff2846",
        background: "#131313",
        "card-dark": "#181818",
        "input-dark": "#0e0e0e",
        "card-teal": "#00a896",
        "card-maroon": "#1c0d12",
        "image-canvas": "#f4f4f6",
        "surface-dark": "#0e0e0e",
        "surface-low": "#1c1b1b",
        surface: "#20201f",
        "surface-high": "#2a2a2a",
        "surface-highest": "#353535",
        "on-surface": "#e5e2e1",
        "on-surface-muted": "#a0a0a0",
      },
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      animation: {
        "wave-pulse": "wave-animation 3s infinite linear",
        "shimmer": "shimmer 2.5s infinite linear",
        "float": "float 4s ease-in-out infinite",
      },
      keyframes: {
        "wave-animation": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
}
