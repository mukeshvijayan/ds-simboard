/**
 * Hand-authored SVG PIR motion sensor — original artwork (P2-4b
 * rollout), modeled on a real PIR module's white Fresnel dome on a
 * small PCB. `motionDetected` drives the indicator LED's fill directly.
 */

export const PIR_PIN_POSITIONS = {
  lead1: { x: 10, y: 42 },
  lead2: { x: 34, y: 42 },
};

export function PirGlyph({
  motionDetected = false,
  width = 44,
  height = 42,
}: {
  motionDetected?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 44 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Motion sensor, ${motionDetected ? "motion detected" : "no motion"}`}
    >
      {/* leads */}
      <line x1="10" y1="32" x2="10" y2="42" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="34" y1="32" x2="34" y2="42" stroke="#b8b8b8" strokeWidth="2" />
      {/* PCB */}
      <rect x="2" y="24" width="40" height="8" fill="#2f6e4f" />
      {/* Fresnel dome */}
      <path d="M4 24 A18 20 0 0 1 40 24 Z" fill="#f2f1ec" stroke="#c9c7bd" />
      {/* faceted lens lines */}
      <line x1="14" y1="24" x2="14" y2="10" stroke="#c9c7bd" />
      <line x1="22" y1="24" x2="22" y2="5" stroke="#c9c7bd" />
      <line x1="30" y1="24" x2="30" y2="10" stroke="#c9c7bd" />
      {/* indicator LED */}
      <circle cx="22" cy="28" r="2.5" fill={motionDetected ? "#d6342c" : "#8a3b3b"} />
    </svg>
  );
}
