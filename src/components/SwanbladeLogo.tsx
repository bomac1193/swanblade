export function SwanbladeLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  // Mark aspect ratio ~1:3.5 (width:height) — tall calligraphic stroke
  const height = size;
  const width = Math.round(size * (34 / 120));

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 34 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Swanblade"
    >
      {/* Mask / Swan / Blade — face right, elements extend right */}
      {/* Brow — sweeps up-right, hooks at tip */}
      <path
        d="M6 34 C7 24, 14 14, 20 7 C24 3, 28 2, 29 6 C30 9, 28 12, 25 11"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Spiral eye — 2+ turns, sits right of blade */}
      <path
        d="M6 42 C6 37, 10.5 34, 15 34 C19.5 34, 22 38, 22 42 C22 46, 18.5 48.5, 15 48.5 C11.5 48.5, 9.5 45.5, 9.5 42 C9.5 39.5, 12 37.5, 15 37.5 C17.5 37.5, 18.5 39.5, 18.5 42 C18.5 44, 17 45, 15 45 C13.5 45, 12.5 43.5, 12.5 42 C12.5 41, 14 40.5, 14.8 41.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Vertical stroke — the blade */}
      <path
        d="M6 34 L6 106"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Chin / tail curl — kicks right */}
      <path
        d="M6 106 C6 110, 10 114, 16 115 C20 116, 22 114, 20 112"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
