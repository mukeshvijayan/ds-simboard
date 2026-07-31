/**
 * Hand-authored SVG fast-blow fuse — original artwork (ADR 0038
 * rollout): a glass cylinder with a thin fusible wire visible inside,
 * matching a real cartridge fuse's look. The wire visibly breaks and
 * the glass darkens once blown — the same "failure is a visible fact,
 * not just an inspector status" convention every other protected part
 * (LED, diode, resistor) already follows.
 */

export const FAST_BLOW_FUSE_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function FastBlowFuseGlyph({
  blown = false,
  width = 80,
  height = 30,
}: {
  blown?: boolean;
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
      aria-label={`Fast-blow fuse${blown ? ", blown" : ""}`}
    >
      {/* leads */}
      <line x1="0" y1="15" x2="18" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="62" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* glass cylinder */}
      <rect
        x="18"
        y="6"
        width="44"
        height="18"
        rx="9"
        fill={blown ? "#3a332b" : "#dce7e7"}
        stroke="#8a8a80"
        fillOpacity={blown ? 1 : 0.55}
      />
      {/* fusible wire — a broken zigzag once blown, a straight wire while intact */}
      {blown ? (
        <path
          d="M22 15 L34 15 L37 10 L41 20 L44 15 L58 15"
          fill="none"
          stroke="#8a3b3b"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
      ) : (
        <line x1="22" y1="15" x2="58" y2="15" stroke="#b8862f" strokeWidth="1.5" />
      )}
    </svg>
  );
}
