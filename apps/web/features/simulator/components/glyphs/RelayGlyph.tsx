/**
 * Hand-authored SVG relay module — original artwork (P2-4b rollout),
 * modeled on a real Arduino-style relay module: a blue PCB with a black
 * relay can and an indicator LED. `contactClosed` drives the indicator
 * LED's fill directly, the same "attribute, not a file swap" pattern.
 * Labels sized deliberately large relative to the glyph (Part 4
 * pedagogical priority) — "COIL" spans its symmetric pair of leads
 * (no real polarity to distinguish), "COM"/"NO" each label their own
 * distinct contact lead, spaced apart so they don't run together.
 */

export const RELAY_PIN_POSITIONS = {
  coilA: { x: 9, y: 58 },
  coilB: { x: 24, y: 58 },
  contactA: { x: 42, y: 58 },
  contactB: { x: 61, y: 58 },
};

export function RelayGlyph({
  contactClosed = false,
  width = 70,
  height = 58,
}: {
  contactClosed?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 70 58"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Relay module, contact ${contactClosed ? "closed" : "open"}`}
    >
      {/* four leads: coilA, coilB, contactA (common), contactB (normally-open) */}
      <line x1="9" y1="44" x2="9" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="24" y1="44" x2="24" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="42" y1="44" x2="42" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="61" y1="44" x2="61" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      {/* blue PCB */}
      <rect x="2" y="24" width="66" height="20" rx="1.5" fill="#3B6FD6" />
      {/* relay can */}
      <rect x="8" y="2" width="32" height="24" rx="1.5" fill="#1a1a1a" />
      {/* indicator LED */}
      <circle cx="54" cy="34" r="3" fill={contactClosed ? "#3FA6A6" : "#22314F"} />
      {/* pin labels */}
      <text
        x="16"
        y="55"
        fontSize="9"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        COIL
      </text>
      <text
        x="42"
        y="55"
        fontSize="8"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        COM
      </text>
      <text
        x="61"
        y="55"
        fontSize="8"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        NO
      </text>
    </svg>
  );
}
