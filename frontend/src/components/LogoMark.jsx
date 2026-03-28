import { useId } from "react";

/**
 * App icon: rounded tile + lightbulb (learning), fills from CSS theme tokens.
 */
export default function LogoMark({ size = 36, className = "", title }) {
  const rawId = useId().replace(/:/g, "");
  const gradId = `logo-mark-grad-${rawId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--site-accent-hover, #4f7942)" />
          <stop offset="100%" stopColor="var(--site-accent, #2e5023)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" ry="8" fill={`url(#${gradId})`} />
      {/* Lucide-style light bulb, scaled into tile */}
      <g
        transform="translate(4, 4)"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </g>
    </svg>
  );
}
