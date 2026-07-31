/**
 * Hand-authored SVG USB power breakout — original artwork (ADR 0038
 * rollout): a small board with a USB-A port and screw-terminal-style
 * +/- output, labeled the same way `LiIonCellGlyph` is (a real
 * meaningful polarity, even though this simulator's transparent
 * pass-through model doesn't electrically enforce it).
 */

export const USB_POWER_BREAKOUT_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function UsbPowerBreakoutGlyph({
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
      aria-label={`USB power breakout, ${suppliedVoltageVolts} volts`}
    >
      {/* leads */}
      <line x1="0" y1="15" x2="14" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="66" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* breakout board */}
      <rect x="14" y="4" width="52" height="22" rx="2" fill="#245A45" stroke="#1c1b18" />
      {/* USB-A port */}
      <rect x="18" y="9" width="14" height="10" fill="#b0b0a8" stroke="#6a6a62" />
      <rect x="21" y="12" width="8" height="4" fill="#3a3a3a" />
      {/* output terminals */}
      <circle cx="52" cy="14" r="3" fill="#b0b0a8" stroke="#6a6a62" />
      <circle cx="52" cy="21" r="3" fill="#b0b0a8" stroke="#6a6a62" />
      <text x="58" y="17" fontSize="6.5" fill="#e8e6df" fontWeight="bold">
        +
      </text>
      <text x="58" y="24" fontSize="6.5" fill="#e8e6df" fontWeight="bold">
        −
      </text>
    </svg>
  );
}
