/**
 * Hand-authored SVG pushbutton — original artwork (P2-4b rollout). The
 * cap visibly sinks and darkens when `pressed` — driven by the prop
 * directly (fill/transform), no separate pressed/unpressed image.
 */

export const PUSHBUTTON_PIN_POSITIONS = {
  lead1: { x: 8, y: 40 },
  lead2: { x: 32, y: 40 },
};

export function PushbuttonGlyph({
  pressed = false,
  isMomentary = true,
  width = 40,
  height = 40,
}: {
  pressed?: boolean;
  isMomentary?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${isMomentary ? "Pushbutton" : "Toggle switch"}, ${pressed ? "pressed" : "not pressed"}`}
    >
      {/* leads */}
      <line x1="8" y1="26" x2="8" y2="40" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="32" y1="26" x2="32" y2="40" stroke="#b8b8b8" strokeWidth="2" />
      {/* base */}
      <rect x="2" y="18" width="36" height="10" rx="1.5" fill="#c9c7bd" />
      {/* cap — sinks 2px and darkens when pressed */}
      <rect
        x="9"
        y={pressed ? 12 : 10}
        width="22"
        height="10"
        rx="2"
        fill={pressed ? "#8a3b2e" : "#d6453b"}
        stroke="#5a2620"
      />
    </svg>
  );
}
