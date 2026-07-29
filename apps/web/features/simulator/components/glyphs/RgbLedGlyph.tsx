/**
 * Hand-authored SVG RGB LED — original artwork (P2-4b rollout), the
 * same LED anatomy as `LedGlyph` (dome + flange) but with four leads
 * (common + red + green + blue) and a dome color driven live by the
 * mixed color of whichever channels are actually lit. Pin labels sized
 * deliberately large relative to the glyph (Part 4 pedagogical
 * priority — a label too small to read doesn't count as labeled).
 */

export const RGB_LED_PIN_POSITIONS = {
  common: { x: 9, y: 68 },
  red: { x: 24, y: 68 },
  green: { x: 39, y: 68 },
  blue: { x: 54, y: 68 },
};

export function RgbLedGlyph({
  mixedColor,
  anyLit,
  width = 58,
  height = 68,
}: {
  mixedColor: string;
  anyLit: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 58 68"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`RGB LED, ${anyLit ? "lit" : "off"}`}
    >
      {anyLit && (
        <ellipse cx="29" cy="18" rx="22" ry="22" fill={mixedColor} opacity="0.4" />
      )}
      {/* four leads: common, red, green, blue */}
      <line x1="9" y1="35" x2="9" y2="68" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="24" y1="35" x2="24" y2="68" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="39" y1="35" x2="39" y2="68" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="54" y1="35" x2="54" y2="68" stroke="#b8b8b8" strokeWidth="2" />
      {/* flange */}
      <rect x="2" y="33" width="52" height="4" fill="#d9d9d4" />
      {/* dome */}
      <path
        d="M4 35 A23 28 0 0 1 52 35 Z"
        fill={anyLit ? mixedColor : "#A7A59D"}
        stroke="#00000022"
      />
      {/* pin labels, below the leads */}
      <text
        x="9"
        y="65"
        fontSize="10"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        C
      </text>
      <text
        x="24"
        y="65"
        fontSize="10"
        textAnchor="middle"
        fill="#D64545"
        fontWeight="bold"
      >
        R
      </text>
      <text
        x="39"
        y="65"
        fontSize="10"
        textAnchor="middle"
        fill="#3a9c4a"
        fontWeight="bold"
      >
        G
      </text>
      <text
        x="54"
        y="65"
        fontSize="10"
        textAnchor="middle"
        fill="#3B6FD6"
        fontWeight="bold"
      >
        B
      </text>
    </svg>
  );
}
