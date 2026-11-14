import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-khmer)", "var(--font-inter)", "sans-serif"],
      },
      colors: {
        navy: {
          950: "#070c1a",
          900: "#0b1329",
          850: "#0f1a36",
          800: "#142247",
          700: "#1e3160",
        },
      },
    },
  },
  plugins: [],
};
export default config;
