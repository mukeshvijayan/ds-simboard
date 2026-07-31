/**
 * Hand-authored SVG inductor — original artwork (ADR 0038 rollout), the
 * standard schematic coil-loop symbol rather than a photorealistic
 * winding, the same "recognizable schematic shape" convention
 * `ResistorGlyph`'s band-coded body already uses.
 */

export const INDUCTOR_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function InductorGlyph({
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
      aria-label="Inductor"
    >
      {/* leads */}
      <line x1="0" y1="15" x2="16" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="64" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* coil loops — the standard schematic inductor symbol */}
      <path
        d="M16 15 a6 9 0 0 1 12 0 a6 9 0 0 1 12 0 a6 9 0 0 1 12 0 a6 9 0 0 1 12 0"
        fill="none"
        stroke="#3B4C70"
        strokeWidth="2.5"
      />
    </svg>
  );
}
