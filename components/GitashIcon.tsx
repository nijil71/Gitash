interface GitashIconProps {
  /** Pixel size (renders as a square) */
  size?: number;
  className?: string;
  /** Render the dark rounded-rect background (use in headers/heroes) */
  withBackground?: boolean;
}

export function GitashIcon({ size = 32, className, withBackground = true }: GitashIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="Gitash"
    >
      <defs>
        <linearGradient id="gitash-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <radialGradient id="gitash-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      {withBackground && (
        <>
          <rect width="32" height="32" rx="7" fill="url(#gitash-bg)" />
          <rect width="32" height="32" rx="7" fill="url(#gitash-glow)" />
        </>
      )}

      {/* G letterform traced as a git-graph circuit */}
      <path
        d="M24,7 L8,7 L8,25 L24,25 L24,16 L15,16"
        stroke="#e4e4e7"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Feature branch diverging from the bar terminus */}
      <line
        x1="15" y1="16" x2="22" y2="9"
        stroke="#a1a1aa"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Commit nodes */}
      <circle cx="24" cy="7"  r="2.4" fill="#e4e4e7" />
      <circle cx="8"  cy="25" r="2.4" fill="#e4e4e7" />
      <circle cx="15" cy="16" r="2.0" fill="#a1a1aa" />
      <circle cx="22" cy="9"  r="1.6" fill="#a1a1aa" opacity="0.7" />
    </svg>
  );
}
