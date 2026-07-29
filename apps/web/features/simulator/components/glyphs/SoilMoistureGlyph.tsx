/**
 * Hand-authored SVG soil moisture sensor — original artwork (P2-4b
 * rollout), modeled on a real two-prong resistive probe on a small PCB.
 * `wetness` drives the droplet indicator's fill/opacity directly.
 */

export const SOIL_MOISTURE_PIN_POSITIONS = {
  lead1: { x: 10, y: 8 },
  lead2: { x: 30, y: 8 },
};

export function SoilMoistureGlyph({
  wetness = 0,
  width = 40,
  height = 50,
}: {
  wetness?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 50"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Soil moisture sensor, ${Math.round(wetness * 100)}% wet`}
    >
      {/* leads (top, wired to controller) */}
      <line x1="10" y1="0" x2="10" y2="8" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="30" y1="0" x2="30" y2="8" stroke="#b8b8b8" strokeWidth="2" />
      {/* PCB */}
      <rect x="4" y="8" width="32" height="14" rx="1.5" fill="#2f6e4f" />
      <circle cx="20" cy="15" r="2" fill={wetness > 0.5 ? "#3B6FD6" : "#8a7a5c"} />
      {/* two probe prongs */}
      <rect x="10" y="22" width="4" height="24" fill="#c9c7bd" />
      <rect x="26" y="22" width="4" height="24" fill="#c9c7bd" />
      {/* wetness droplet indicator */}
      <path
        d="M20 30 C24 36 24 40 20 40 C16 40 16 36 20 30 Z"
        fill="#3B6FD6"
        opacity={wetness}
      />
    </svg>
  );
}
