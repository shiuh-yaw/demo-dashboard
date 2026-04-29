import { Figtree } from "next/font/google";
import localFont from "next/font/local";

// Body — Figtree via Google Fonts (per SPARK26 brand guide, body font)
export const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

// Display — Ufficio Fireblocks (brand headline font, pp. 7-9 of guide).
// 500/700 are the weights documented in the spec; 600 is included as a
// middle weight for UI affordances (labels, secondary headings).
export const ufficio = localFont({
  src: [
    {
      path: "./fonts/UfficioFireblocks-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/UfficioFireblocks-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/UfficioFireblocks-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ufficio",
  display: "swap",
});
