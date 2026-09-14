import type { Config } from "tailwindcss";

// Design tokens for the Office Attendance app.
//
// This is an internal operations tool, not a marketing site: the palette
// favors legibility and quick status recognition (present/late/on-leave/
// missing-checkout) over decoration. Ink-navy for structure, a single teal
// for primary actions, and reserved semantic colors that are used *only*
// for their meaning (never decoratively) so a red badge always means the
// same thing everywhere in the app.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F5F6F7",
          100: "#E7E9EC",
          200: "#C7CCD3",
          400: "#7C8593",
          600: "#4B5563",
          800: "#232833",
          900: "#14171D",
        },
        teal: {
          50: "#EEF7F6",
          100: "#D3EBE8",
          500: "#0F766E",
          600: "#0B5D57",
          700: "#094A45",
        },
        status: {
          present: "#0F766E",
          late: "#B42318",
          leave: "#B45309",
          wfh: "#4338CA",
          off: "#6B7280",
          missing: "#B42318",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
