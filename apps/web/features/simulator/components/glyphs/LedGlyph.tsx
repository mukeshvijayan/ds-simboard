/**
 * Hand-authored SVG LED — original artwork (P2-4b, closing ADR
 * 0031/0032). Real anatomy: the anode lead is longer than the cathode
 * lead, and the flange has a flat edge on the cathode side — both are
 * how a real 5mm LED is actually polarized, not decorative choices.
 * Visual state (off/lit/burned) drives `fill`/`opacity` directly; no
 * separate image per state.
 */

export type LedVisualStatus = "off" | "lit" | "burned";

const LIT_COLOR: Record<string, string> = {
  red: "#ff4d4d",
  green: "#4dff88",
  blue: "#4d88ff",
  yellow: "#fff04d",
  white: "#ffffff",
};

const DIM_COLOR: Record<string, string> = {
  red: "#8a3b3b",
  green: "#3b8a55",
  blue: "#3b558a",
  yellow: "#8a8442",
  white: "#c9c9c4",
};

/** Pin positions in this component's own SVG coordinate space — the
 * anode (longer lead) sits further from the flange than the cathode
 * (shorter lead, on the flat-edge side), matching a real 5mm LED. */
export const LED_PIN_POSITIONS = {
  anode: { x: 14, y: 58 },
  cathode: { x: 26, y: 52 },
};

export function LedGlyph({
  color = "red",
  status,
  brightness = 1,
  width = 38,
  height = 68,
}: {
  color?: string;
  status: LedVisualStatus;
  brightness?: number;
  width?: number;
  height?: number;
}) {
  const domeColor =
    status === "burned"
      ? "#2b2b2b"
      : status === "lit"
        ? (LIT_COLOR[color] ?? LIT_COLOR.red)
        : (DIM_COLOR[color] ?? DIM_COLOR.red);
  const glowOpacity = status === "lit" ? 0.3 + brightness * 0.5 : 0;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${color} LED, ${status}`}
    >
      {status === "lit" && (
        <ellipse cx="20" cy="16" rx="17" ry="17" fill={domeColor} opacity={glowOpacity} />
      )}
      {/* anode lead (longer) */}
      <line x1="14" y1="30" x2="14" y2="58" stroke="#b8b8b8" strokeWidth="2" />
      {/* cathode lead (shorter) */}
      <line x1="26" y1="30" x2="26" y2="52" stroke="#b8b8b8" strokeWidth="2" />
      {/* explicit polarity labels, in addition to the real lead-length cue
       * — sized deliberately large relative to the glyph (pedagogical
       * priority, Part 4: a label a student can't actually read at normal
       * screen size doesn't count as labeled) */}
      <text
        x="14"
        y="44"
        fontSize="11"
        textAnchor="middle"
        fill="#3a9c4a"
        fontWeight="bold"
      >
        +
      </text>
      <text
        x="26"
        y="44"
        fontSize="11"
        textAnchor="middle"
        fill="#d6342c"
        fontWeight="bold"
      >
        −
      </text>
      {/* flange, with a flat edge on the cathode (right) side — real LED polarity marker */}
      <path
        d="M4 30 L36 30 L36 27 Q 20 22 4 27 Z"
        fill={status === "burned" ? "#1a1a1a" : "#d9d9d4"}
      />
      {/* dome */}
      <path d="M6 30 A14 20 0 0 1 34 30 Z" fill={domeColor} stroke="#00000022" />
      {status === "burned" && (
        <path
          d="M12 24 L17 16 L14 20 L20 10 L18 18 L23 12 L20 20"
          fill="none"
          stroke="#8a7a5c"
          strokeWidth="1.25"
          opacity="0.85"
        />
      )}
    </svg>
  );
}
