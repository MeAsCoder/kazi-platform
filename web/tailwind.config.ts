import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4ED",
        card: "#FFFFFF",
        ink: "#1F1B16",
        muted: "#857C6E",
        line: "#E6DFD1",
        acacia: { DEFAULT: "#1A6B45", dark: "#124E33", soft: "#E5F0E8" },
        clay: { DEFAULT: "#C65A2E", soft: "#F7E5DA" },
        gold: "#D9A441",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,27,22,.06), 0 8px 24px -16px rgba(31,27,22,.18)",
        lift: "0 8px 30px -12px rgba(31,27,22,.28)",
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
