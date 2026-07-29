/**
 * Hand-authored SVG diode — original artwork (P2-4b rollout), modeled on
 * a real axial diode (e.g. 1N4001): a black cylindrical body with a
 * silver cathode band. Same polarity-labeling treatment as LedGlyph:
 * a "+"/"−" label at each lead, not just the band, since a young
 * student may not yet know the band-means-cathode convention. Labels
 * are sized deliberately large relative to the glyph (Part 4: a label
 * too small to actually read doesn't count as labeled).
 */

export const DIODE_PIN_POSITIONS = {
  anode: { x: 0, y: 20 },
  cathode: { x: 78, y: 20 },
};

export function DiodeGlyph({
  failed = false,
  width = 78,
  height = 40,
}: {
  failed?: boolean;
  width?: number;
  height?: number;
}) {
  const bodyColor = failed ? "#8a3b3b" : "#2b2b2b";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 78 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Diode${failed ? ", failed" : ""}`}
    >
      {/* leads */}
      <line x1="0" y1="20" x2="20" y2="20" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="58" y1="20" x2="78" y2="20" stroke="#b8b8b8" strokeWidth="2" />
      {/* body */}
      <rect x="20" y="11" width="38" height="18" rx="3" fill={bodyColor} />
      {/* cathode band */}
      <rect x="49" y="11" width="4" height="18" fill="#d9d9d4" />
      {/* polarity labels, below the leads */}
      <text
        x="10"
        y="38"
        fontSize="11"
        textAnchor="middle"
        fill="#3a9c4a"
        fontWeight="bold"
      >
        +
      </text>
      <text
        x="68"
        y="38"
        fontSize="11"
        textAnchor="middle"
        fill="#d6342c"
        fontWeight="bold"
      >
        −
      </text>
    </svg>
  );
}
