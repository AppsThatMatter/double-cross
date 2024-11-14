import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          red: "#E87168",
          blue: '#799F9E',
        },
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
