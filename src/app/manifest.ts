import type { MetadataRoute } from "next";

/**
 * PWA manifest (Next's MetadataRoute.Manifest convention — it serves this at
 * /manifest.webmanifest and links it from the layout automatically, so there
 * is no public/manifest.json to keep in sync).
 *
 * Icons are the app's own brand tile, generated from brand tokens by
 * scripts/gen-icons.ps1. The 512 is the maskable (full-bleed, glyph inside the
 * safe zone) — the one Android launchers request; 192 stays rounded for lists.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pepcal — Peptide & Health Log",
    short_name: "Pepcal",
    description:
      "A reconstituted-peptide concentration calculator and injection record-keeper. Calculation and record-keeping only.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The light surface token; the dark value (#101512) is handled per-scheme
    // by the viewport themeColor — a manifest carries exactly one of each.
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
