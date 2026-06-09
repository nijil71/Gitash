import { NextResponse } from "next/server";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#27272a"/>
      <stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#bg)"/>
  <path d="M24 7L8 7L8 25L24 25L24 16L15 16"
        stroke="#e4e4e7" stroke-width="2.5" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="15" y1="16" x2="22" y2="9"
        stroke="#a1a1aa" stroke-width="1.8"
        stroke-linecap="round" opacity="0.6"/>
  <circle cx="24" cy="7" r="2.5" fill="#e4e4e7"/>
  <circle cx="8" cy="25" r="2.5" fill="#e4e4e7"/>
  <circle cx="15" cy="16" r="2" fill="#a1a1aa"/>
  <circle cx="22" cy="9" r="1.6" fill="#a1a1aa" opacity="0.7"/>
</svg>`;

export async function GET() {
  return new NextResponse(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
