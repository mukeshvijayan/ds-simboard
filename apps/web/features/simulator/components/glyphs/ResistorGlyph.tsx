import { resistorBandColors } from "../../model/resistorColorCode";

/**
 * Hand-authored SVG resistor — original artwork, no external image, no
 * generation (P2-4b, closing ADR 0031/0032; approach modeled on
 * @wokwi/elements' pattern of authoring components as SVG-in-code with
 * hand-placed pin coordinates, reference only — no wokwi-elements
 * artwork or paths are used here).
 */

/** Pin positions in this component's own SVG coordinate space (viewBox
 * units) — hand-placed at authoring time, exactly where the leads are
 * drawn, so there is no separate calibration step. */
export const RESISTOR_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function ResistorGlyph({
  resistanceOhms,
  width = 80,
  height = 30,
}: {
  resistanceOhms: number;
  width?: number;
  height?: number;
}) {
  const [band1, band2, band3, band4] = resistorBandColors(resistanceOhms);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 30"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Resistor, ${resistanceOhms} ohm`}
    >
      {/* leads */}
      <line x1="0" y1="15" x2="20" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="60" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* body */}
      <rect x="20" y="6" width="40" height="18" rx="9" fill="#d9bd94" stroke="#b89a6f" />
      {/* bands */}
      <rect x="28" y="6" width="4" height="18" fill={band1} />
      <rect x="36" y="6" width="4" height="18" fill={band2} />
      <rect x="44" y="6" width="4" height="18" fill={band3} />
      <rect x="52" y="6" width="4" height="18" fill={band4} />
    </svg>
  );
}
