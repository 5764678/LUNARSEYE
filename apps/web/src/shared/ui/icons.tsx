import type { ReactNode } from "react";

/**
 * The one icon set. Sixteen-pixel grid, 1.5 stroke, round joins, `currentColor`, so every
 * icon has the same voice and none depends on the platform's emoji or symbol fonts
 * (a bare ▶ renders as a colour emoji on iOS and Android).
 */
export type IconName =
  | "play"
  | "pause"
  | "close"
  | "site"
  | "chevron"
  | "info"
  | "lower-bound"
  | "check";

const SHAPES: Record<IconName, ReactNode> = {
  play: <path d="M5 3.2v9.6L12.8 8z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="4" y="3" width="2.8" height="10" rx="0.7" fill="currentColor" stroke="none" />
      <rect x="9.2" y="3" width="2.8" height="10" rx="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  site: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: <path d="M4 6.2l4 4 4-4" />,
  info: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 7.4v3.4" />
      <path d="M8 5.2h.01" />
    </>
  ),
  "lower-bound": <path d="M8 3.2l5.2 9.2H2.8z" fill="currentColor" stroke="none" />,
  check: <path d="M3.5 8.5l3 3 6-7" />,
};

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[name]}
    </svg>
  );
}
