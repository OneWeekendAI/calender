import type { NextConfig } from "next";

// TAURI_BUILD=1 produces a static export in ./out for the desktop shell.
// Static export cannot contain API routes, so for that build only .tsx files
// count as routes (route.ts is skipped) and a separate distDir keeps the web
// build's .next untouched. The web build is unchanged.
const nextConfig: NextConfig = process.env.TAURI_BUILD
  ? { output: "export", images: { unoptimized: true }, pageExtensions: ["tsx"], distDir: ".next-tauri" }
  : {};

export default nextConfig;
