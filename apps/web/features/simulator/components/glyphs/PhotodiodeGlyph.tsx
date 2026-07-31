/**
 * Hand-authored SVG photodiode — original artwork (ADR 0038 diode
 * follow-up): a clear-domed component (unlike a plain diode's opaque
 * body, a real photodiode's package is transparent so light can reach
 * the die), with small arrows pointing *into* the dome — the standard
 * schematic convention for a light-sensitive part, the mirror image of
 * an LED's arrows pointing *away* from its dome. The dome's tint
 * brightens with the simulated light level (`lightLevel`), the same
 * kind of live visual feedback a solar panel's cell grid gets, so a
 * student can see the input they're controlling, not just read a number
 * in the Inspector. Same +/- labeling convention as `DiodeGlyph`.
 */

export const PHOTODIODE_PIN_POSITIONS = {
  anode: { x: 0, y: 20 },
  cathode: { x: 78, y: 20 },
};

export function PhotodiodeGlyph({
  lightLevel,
  failed = false,
  width = 78,
  height = 40,
}: {
  lightLevel: number;
  failed?: boolean;
  width?: number;
  height?: number;
}) {
  const domeColor = failed
    ? "#8a3b3b"
    : `rgb(${Math.round(150 + lightLevel * 90)}, ${Math.round(170 + lightLevel * 80)}, ${Math.round(190 + lightLevel * 60)})`;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 78 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Photodiode, ${Math.round(lightLevel * 100)}% light${failed ? ", failed" : ""}`}
    >
      {/* incoming light arrows, pointing into the dome */}
      <path
        d="M24 2 L24 10 M20 6 L24 10 L28 6"
        stroke="#c9a339"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M34 2 L34 10 M30 6 L34 10 L38 6"
        stroke="#c9a339"
        strokeWidth="1.5"
        fill="none"
      />
      {/* leads */}
      <line x1="0" y1="20" x2="20" y2="20" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="58" y1="20" x2="78" y2="20" stroke="#b8b8b8" strokeWidth="2" />
      {/* clear domed body */}
      <rect
        x="20"
        y="11"
        width="38"
        height="18"
        rx="6"
        fill={domeColor}
        stroke="#6a7a8a"
        fillOpacity="0.85"
      />
      {/* cathode flat edge marker */}
      <rect x="49" y="11" width="4" height="18" fill="#3a3a3a" opacity="0.6" />
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
