/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "Courier", "monospace"],
      },
      colors: {
        military: {
          black: "#000000",
          dark: "#030f03",
          card: "#0a140a",
          border: "#166534",
          green: "#4ade80",
          dim: "#16a34a",
          ghost: "#166534",
          accent: "#00ff46",
        },
        alert: {
          red: "#ef4444",
          dark: "#7f1d1d",
          bg: "rgba(127,0,0,0.85)",
        },
        warning: {
          orange: "#f97316",
          yellow: "#eab308",
        },
        honey: {
          purple: "#a855f7",
        },
      },
      animation: {
        "red-pulse": "redAlertPulse 1.2s ease-in-out infinite",
        "honey-pulse": "honeyPulse 1.5s ease-in-out infinite",
        "system-lock": "systemLockFlash 0.8s ease-in-out infinite",
        "terminal-flicker": "terminalFlicker 4s infinite",
        "green-pulse": "greenPulse 2s ease-in-out infinite",
        scanline: "scanline 3s linear infinite",
        "fade-in": "fadeIn 0.2s ease-out forwards",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        redAlertPulse: {
          "0%, 100%": { backgroundColor: "rgba(127,0,0,0.85)" },
          "50%": { backgroundColor: "rgba(185,0,0,0.92)" },
        },
        honeyPulse: {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(168,85,247,0.4)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(168,85,247,0.7)" },
        },
        systemLockFlash: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        terminalFlicker: {
          "0%, 100%": { opacity: "1" },
          "93%": { opacity: "0.8" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.85" },
          "97%": { opacity: "1" },
        },
        greenPulse: {
          "0%, 100%": { boxShadow: "0 0 4px 1px rgba(74,222,128,0.2)" },
          "50%": { boxShadow: "0 0 12px 3px rgba(74,222,128,0.4)" },
        },
        scanline: {
          "0%": { top: "-10%" },
          "100%": { top: "110%" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      borderRadius: {
        military: "4px",
      },
    },
  },
  plugins: [],
};
