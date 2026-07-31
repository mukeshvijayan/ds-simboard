/**
 * Hand-authored SVG Li-ion/LiPo cell — original artwork (ADR 0038
 * rollout): a real Li-ion cell always has a real, physically meaningful
 * polarity (unlike a plain resistor's interchangeable leads), so its +/-
 * terminals are labeled even though this simulator's transparent
 * pass-through model (docs/architecture/0016-*.md, 0038-*.md) doesn't
 * electrically enforce which way it's wired — the label teaches the real
 * part's convention, a documented simplification rather than a silently
 * missing one.
 */

export const LI_ION_CELL_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function LiIonCellGlyph({
  suppliedVoltageVolts,
  width = 80,
  height = 30,
}: {
  suppliedVoltageVolts: number;
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
      aria-label={`Li-ion/LiPo cell, ${suppliedVoltageVolts} volts`}
    >
      {/* leads */}
      <line x1="0" y1="15" x2="14" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="66" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* cell body */}
      <rect x="14" y="6" width="52" height="18" rx="4" fill="#2F6E4F" stroke="#1c1b18" />
      <rect x="14" y="6" width="6" height="18" rx="2" fill="#245A3F" />
      <text x="24" y="19" fontSize="7.5" fill="#e8e6df" fontWeight="bold">
        +
      </text>
      <text x="58" y="19" fontSize="7.5" fill="#e8e6df" fontWeight="bold">
        −
      </text>
      <text x="41" y="19" fontSize="6" textAnchor="middle" fill="#e8e6df">
        {suppliedVoltageVolts}V
      </text>
    </svg>
  );
}
