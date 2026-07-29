/**
 * Hand-authored SVG potentiometer — original artwork (P2-4b rollout).
 * The knob's needle rotates directly from the `wiperPosition` prop
 * (0 to 1, mapped across a real pot's ~270° sweep) via an SVG
 * `transform`, not a swapped image.
 */

export const POTENTIOMETER_PIN_POSITIONS = {
  lead1: { x: 6, y: 44 },
  lead2: { x: 38, y: 44 },
};

export function PotentiometerGlyph({
  wiperPosition = 0.5,
  width = 44,
  height = 44,
}: {
  wiperPosition?: number;
  width?: number;
  height?: number;
}) {
  const angle = -135 + wiperPosition * 270;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 44 44"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Potentiometer, ${Math.round(wiperPosition * 100)}%`}
    >
      {/* leads */}
      <line x1="6" y1="34" x2="6" y2="44" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="38" y1="34" x2="38" y2="44" stroke="#b8b8b8" strokeWidth="2" />
      {/* body */}
      <rect x="4" y="4" width="36" height="30" rx="3" fill="#4a4a48" />
      {/* knob */}
      <circle cx="22" cy="19" r="12" fill="#2b2b2b" stroke="#6b6a64" />
      <line
        x1="22"
        y1="19"
        x2="22"
        y2="9"
        stroke="#f5f5f0"
        strokeWidth="2"
        transform={`rotate(${angle} 22 19)`}
      />
    </svg>
  );
}
