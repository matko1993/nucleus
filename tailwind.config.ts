import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        violet: "#8b5cf6",
        teal: "#14b8a6",
        warn: "#f0b93d",
      },
    },
  },
  plugins: [],
};

export default config;
