/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        // Space background layers
        space:   "#080818",
        deep:    "#0d0d24",
        // Glass surfaces
        glass:   "rgba(255,255,255,0.06)",
        "glass-hover": "rgba(255,255,255,0.10)",
        "glass-active":"rgba(255,255,255,0.14)",
        // Borders
        "glass-border": "rgba(255,255,255,0.10)",
        "glass-border-strong": "rgba(255,255,255,0.18)",
        // Brand
        indigo:  "#6366f1",
        "indigo-light": "#818cf8",
        violet:  "#7c3aed",
        // Semantic
        success: "#22c55e",
        danger:  "#f87171",
        warning: "#fbbf24",
        // Text
        "t1": "#f1f5f9",
        "t2": "#94a3b8",
        "t3": "#475569",
      },
      backgroundImage: {
        "space-gradient": "linear-gradient(135deg, #0f0c29 0%, #1a1040 30%, #24243e 60%, #0f0c29 100%)",
        "glow-indigo":    "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
        "glow-violet":    "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
      },
      boxShadow: {
        "glass":       "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass-sm":    "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glow-indigo": "0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)",
        "glow-sm":     "0 0 12px rgba(99,102,241,0.4)",
        "canvas":      "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
      },
      backdropBlur: { glass: "12px" },
      animation: {
        "pulse-dot": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "float":     "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
