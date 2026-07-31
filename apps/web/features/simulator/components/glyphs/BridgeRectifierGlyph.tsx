/**
 * Hand-authored SVG bridge rectifier — original artwork (ADR 0038 diode
 * follow-up): a real 4-pin bridge rectifier package (the common square/
 * diamond GBU-style body), with the classic four-diode bridge schematic
 * drawn on its face — the same "print the schematic symbol on the
 * physical part" idea a real component often uses to show which pin is
 * which. AC~ spans its symmetric pair of leads (either can be either AC
 * input, no polarity to distinguish, the same "COIL" treatment
 * `RelayGlyph` gives its own symmetric pair) — the DC+/DC- leads each
 * get their own distinct label, since those genuinely are polarized.
 */

export const BRIDGE_RECTIFIER_PIN_POSITIONS = {
  acLead1: { x: 9, y: 58 },
  acLead2: { x: 24, y: 58 },
  dcPositiveLead: { x: 42, y: 58 },
  dcNegativeLead: { x: 61, y: 58 },
};

export function BridgeRectifierGlyph({
  width = 70,
  height = 58,
}: {
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
      aria-label="Bridge rectifier"
    >
      {/* four leads */}
      <line x1="9" y1="44" x2="9" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="24" y1="44" x2="24" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="42" y1="44" x2="42" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="61" y1="44" x2="61" y2="46" stroke="#b8b8b8" strokeWidth="2" />
      {/* package body */}
      <rect x="2" y="4" width="66" height="40" rx="2" fill="#1a1a1a" stroke="#3B4C70" />
      {/* classic four-diode bridge schematic, printed on the body */}
      <g stroke="#c9c6bb" strokeWidth="1" fill="none">
        <path d="M35 10 L35 38" />
        <path d="M12 24 L58 24" />
        <path d="M27 17 L35 24 L27 31 Z" fill="#c9c6bb" />
        <path d="M43 17 L35 24 L43 31 Z" fill="#c9c6bb" />
        <path d="M27 17 L35 10" />
        <path d="M43 31 L35 38" />
      </g>
      {/* pin labels */}
      <text
        x="16"
        y="55"
        fontSize="9"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        AC~
      </text>
      <text
        x="42"
        y="55"
        fontSize="9"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        +
      </text>
      <text
        x="61"
        y="55"
        fontSize="9"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        −
      </text>
    </svg>
  );
}
