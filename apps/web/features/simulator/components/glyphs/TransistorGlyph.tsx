/**
 * Hand-authored SVG NPN transistor — original artwork (P2-4b rollout),
 * modeled on a real TO-92 package: a flat-faced black plastic dome with
 * three leads in a row. Pin labels (B/C/E) are drawn directly on the
 * component, not only in the side panel — students need to be able to
 * read a pin's function by looking at the part itself.
 *
 * The render footprint is kept at its original size deliberately: this
 * glyph's three leads can span a wide, uneven area (e.g. base/collector
 * on the strip but emitter on a distant rail), so its centered position
 * already sits over open canvas — enlarging the box further started
 * intercepting clicks meant for nearby breadboard holes. Legibility
 * comes from a bold, high-contrast label instead (the real bug this
 * fixed: white-on-white text, not merely "too small").
 */

export const TRANSISTOR_PIN_POSITIONS = {
  base: { x: 15, y: 62 },
  collector: { x: 30, y: 62 },
  emitter: { x: 45, y: 62 },
};

export function TransistorGlyph({
  isOn = false,
  width = 60,
  height = 68,
}: {
  isOn?: boolean;
  width?: number;
  height?: number;
}) {
  const glowColor = isOn ? "#3FA6A6" : "#3B4C70";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 68"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Transistor, ${isOn ? "on" : "off"}`}
    >
      {/* leads */}
      <line x1="15" y1="38" x2="15" y2="62" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="30" y1="34" x2="30" y2="62" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="45" y1="38" x2="45" y2="62" stroke="#b8b8b8" strokeWidth="2" />
      {/* TO-92 body: flat-faced dome */}
      <path
        d="M6 38 A24 30 0 0 1 54 38 L54 40 L6 40 Z"
        fill="#2b2b2b"
        stroke={glowColor}
        strokeWidth="1.5"
      />
      <rect
        x="6"
        y="34"
        width="48"
        height="6"
        fill="#2b2b2b"
        stroke={glowColor}
        strokeWidth="1.5"
      />
      {/* on-state indicator */}
      {isOn && <circle cx="30" cy="20" r="3" fill={glowColor} />}
      {/* pin labels — must match TRANSISTOR_PIN_POSITIONS (base=15, collector=30, emitter=45).
       * Dark, bold, and directly below the leads: high-contrast against the
       * light canvas, not white-on-white (the real bug this fixed). */}
      <text
        x="15"
        y="67"
        fontSize="10"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        B
      </text>
      <text
        x="30"
        y="67"
        fontSize="10"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        C
      </text>
      <text
        x="45"
        y="67"
        fontSize="10"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        E
      </text>
    </svg>
  );
}
