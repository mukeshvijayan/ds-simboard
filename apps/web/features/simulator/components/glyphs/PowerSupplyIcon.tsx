/**
 * Hand-authored SVG power supply icon — original artwork (P2-4b,
 * closing ADR 0031/0032). The supply voltage itself is a live UI
 * overlay (plain text, driven by the same `supplyVoltage` state already
 * shown in the toolbar's number input), never baked into the artwork —
 * the whole reason the original pilot scope called this out separately.
 */
export function PowerSupplyIcon({
  supplyVoltageVolts,
  width = 28,
  height = 34,
}: {
  supplyVoltageVolts: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 34"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Power supply, ${supplyVoltageVolts} volts`}
    >
      {/* barrel-jack cable */}
      <line x1="14" y1="26" x2="14" y2="32" stroke="#8a8a8a" strokeWidth="2" />
      <rect x="11" y="30" width="6" height="4" rx="1" fill="#4a4a4a" />
      {/* adapter body */}
      <rect x="4" y="2" width="20" height="24" rx="3" fill="#f2f2ee" stroke="#c9c9c2" />
      <circle cx="14" cy="9" r="1.4" fill="#b8b8b0" />
      <text
        x="14"
        y="19"
        textAnchor="middle"
        fontSize="7"
        fontFamily="var(--font-mono, monospace)"
        fill="#3B4C70"
      >
        {supplyVoltageVolts}V
      </text>
    </svg>
  );
}
