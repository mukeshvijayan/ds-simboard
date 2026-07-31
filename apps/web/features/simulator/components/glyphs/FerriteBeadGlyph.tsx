/**
 * Hand-authored SVG ferrite bead — original artwork (ADR 0038 rollout):
 * a small cylindrical bead threaded on a straight wire, the real part's
 * recognizable shape (unlike the inductor's coil-loop schematic symbol,
 * a ferrite bead looks nothing like its own schematic symbol — it just
 * looks like a bead — so this draws the physical part instead).
 */

export const FERRITE_BEAD_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function FerriteBeadGlyph({
  width = 80,
  height = 30,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 30"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ferrite bead"
    >
      {/* wire */}
      <line x1="0" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* bead */}
      <rect x="26" y="4" width="28" height="22" rx="11" fill="#3B3B3B" stroke="#1c1b18" />
      <text
        x="40"
        y="19"
        fontSize="7"
        textAnchor="middle"
        fill="#e8e6df"
        fontWeight="bold"
      >
        FB
      </text>
    </svg>
  );
}
