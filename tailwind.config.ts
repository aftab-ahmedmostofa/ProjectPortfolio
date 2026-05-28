import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bcd2ff",
          300: "#8eb4ff",
          400: "#598bff",
          500: "#3563f0",
          600: "#1f44d6",
          700: "#1a36ac",
          800: "#1b3088",
          900: "#1c2d6c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
