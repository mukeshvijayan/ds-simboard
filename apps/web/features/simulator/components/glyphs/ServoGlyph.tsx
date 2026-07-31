/**
 * Hand-authored SVG servo motor — original artwork (ADR 0039), modeled
 * on a real micro servo (e.g. SG90): a blue plastic case with mounting
 * flange tabs, a white rotating horn on top, and three leads (power,
 * ground, signal) — real servo wire colors (red/brown/orange) carried
 * through to the lead labels below, the same "+/−/function" labeling
 * every other part gets. The horn visibly rotates to `angleDegrees`,
 * driven by the real solved simulated-pulse-width mapping (ADR 0039),
 * never a scripted animation.
 */

export const SERVO_PIN_POSITIONS = {
  power: { x: 12, y: 68 },
  ground: { x: 27, y: 68 },
  signal: { x: 42, y: 68 },
};

export function ServoGlyph({
  angleDegrees,
  failed = false,
  width = 70,
  height = 70,
}: {
  angleDegrees: number;
  failed?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 70 70"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Servo motor, ${Math.round(angleDegrees)} degrees${failed ? ", failed" : ""}`}
    >
      {/* leads */}
      <line x1="12" y1="52" x2="12" y2="66" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="27" y1="52" x2="27" y2="66" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="42" y1="52" x2="42" y2="66" stroke="#b8b8b8" strokeWidth="2" />
      {/* mounting flange tabs */}
      <rect
        x="0"
        y="30"
        width="10"
        height="10"
        rx="1.5"
        fill={failed ? "#8a3b3b" : "#3B6FD6"}
      />
      <rect
        x="50"
        y="30"
        width="10"
        height="10"
        rx="1.5"
        fill={failed ? "#8a3b3b" : "#3B6FD6"}
      />
      <circle cx="5" cy="35" r="1.6" fill="#22314F" />
      <circle cx="55" cy="35" r="1.6" fill="#22314F" />
      {/* body */}
      <rect
        x="10"
        y="18"
        width="40"
        height="34"
        rx="2"
        fill={failed ? "#8a3b3b" : "#3B6FD6"}
        stroke="#22314F"
        strokeWidth="1.2"
      />
      {/* horn hub */}
      <circle cx="30" cy="18" r="8" fill="#EDEBE3" stroke="#22314F" strokeWidth="1.2" />
      {/* rotating horn arm — angle is the real solved value, not scripted */}
      <g
        style={{
          transform: `rotate(${angleDegrees - 90}deg)`,
          transformOrigin: "30px 18px",
        }}
      >
        <rect x="28" y="2" width="4" height="18" rx="1.5" fill="#22314F" />
      </g>
      {/* pin labels — real servo wire-color convention (red/black/orange) */}
      <text
        x="12"
        y="45"
        fontSize="9"
        textAnchor="middle"
        fill="#3a9c4a"
        fontWeight="bold"
      >
        +
      </text>
      <text
        x="27"
        y="45"
        fontSize="9"
        textAnchor="middle"
        fill="#d6342c"
        fontWeight="bold"
      >
        −
      </text>
      <text
        x="42"
        y="45"
        fontSize="8"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        S
      </text>
    </svg>
  );
}
