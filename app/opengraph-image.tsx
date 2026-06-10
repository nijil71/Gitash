import { ImageResponse } from "next/og";

// Social-share card (og:image + twitter:image), generated at the edge.
// Mirrors the app's monochrome theme and the Gitash git-graph mark.

export const runtime = "edge";
export const alt = "Gitash — browse GitHub issues and get an AI contribution plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(80% 60% at 50% 0%, #1f1f1f 0%, #0a0a0a 70%)",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
        }}
      >
        {/* Mark */}
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path
            d="M24,7 L8,7 L8,25 L24,25 L24,16 L15,16"
            stroke="#e4e4e7"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="15"
            y1="16"
            x2="22"
            y2="9"
            stroke="#a1a1aa"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.6"
          />
          <circle cx="24" cy="7" r="2.4" fill="#e4e4e7" />
          <circle cx="8" cy="25" r="2.4" fill="#e4e4e7" />
          <circle cx="15" cy="16" r="2" fill="#a1a1aa" />
          <circle cx="22" cy="9" r="1.6" fill="#a1a1aa" opacity="0.7" />
        </svg>

        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginTop: 32,
          }}
        >
          Gitash
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#a1a1aa",
            marginTop: 16,
            maxWidth: 820,
            textAlign: "center",
          }}
        >
          Browse any GitHub repo&apos;s issues and get a step-by-step AI
          contribution plan
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 44,
            fontSize: 22,
            color: "#71717a",
            border: "1px solid #27272a",
            borderRadius: 999,
            padding: "12px 28px",
            backgroundColor: "#131313",
          }}
        >
          Claude · GPT · Gemini — your key, your choice
        </div>
      </div>
    ),
    size
  );
}
