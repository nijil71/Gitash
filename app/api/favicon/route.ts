import { NextResponse } from "next/server";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0b1220"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#bg)"/>
  <path d="M24 7L8 7L8 25L24 25L24 16L15 16"
        stroke="#22c55e" stroke-width="2.5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="15" y1="16" x2="22" y2="9"
        stroke="#4ade80" stroke-width="1.8"
        stroke-linecap="round" opacity="0.55"/>
  <circle cx="24" cy="7" r="2.5" fill="#22c55e"/>
  <circle cx="8" cy="25" r="2.5" fill="#22c55e"/>
  <circle cx="15" cy="16" r="2" fill="#4ade80"/>
  <circle cx="22" cy="9" r="1.6" fill="#4ade80" opacity="0.7"/>
</svg>`;

export async function GET() {
  return new NextResponse(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
