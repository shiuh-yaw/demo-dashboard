import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Earn Dashboard color scheme
        earn: {
          primary: "#FF0000",
          dark: "#282828",
          light: "#F9F9F9",
          text: {
            primary: "#030303",
            secondary: "#606060",
          },
          border: "#DADADA",
          active: {
            bg: "#E8F0FE",
            text: "#1967D2",
          },
        },
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

