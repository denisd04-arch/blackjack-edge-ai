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
        canvas: {
          DEFAULT: "#050807",
          elevated: "#0b100e",
          graphite: "#121a17",
          panel: "#161f1b",
        },
        felt: {
          DEFAULT: "#0d2818",
          deep: "#071a10",
        },
        neon: {
          DEFAULT: "#39ff88",
          dim: "#1fb85c",
          glow: "#6dffb0",
        },
        emerald: {
          mist: "#0f3d2a",
          pulse: "#14a356",
        },
        ink: {
          DEFAULT: "#e8f5ee",
          muted: "#8aa396",
          faint: "#5c7468",
        },
        border: {
          DEFAULT: "#243029",
          bright: "#2f4a3c",
        },
        warn: "#f5c542",
        danger: "#ff4d6a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "emerald-radial":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(57, 255, 136, 0.12), transparent 55%)",
        "felt-gradient":
          "linear-gradient(165deg, #0d2818 0%, #050807 45%, #071a10 100%)",
        "panel-glass":
          "linear-gradient(145deg, rgba(22, 31, 27, 0.92), rgba(11, 16, 14, 0.88))",
      },
      boxShadow: {
        neon: "0 0 24px rgba(57, 255, 136, 0.25)",
        panel: "0 8px 32px rgba(0, 0, 0, 0.45)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;