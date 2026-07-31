/**
 * Hand-authored SVG resettable (PTC) fuse — original artwork (ADR 0038
 * rollout): the small yellow disc real polyfuses commonly come in. Glows
 * warm orange while tripped (a real PTC self-heats) rather than showing
 * the standard permanent "failed" tint — it isn't destroyed, so it
 * shouldn't look destroyed, just visibly active.
 */

export const RESETTABLE_FUSE_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

export function ResettableFuseGlyph({
  tripped = false,
  width = 80,
  height = 30,
}: {
  tripped?: boolean;
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
      aria-label={`Resettable fuse${tripped ? ", tripped" : ""}`}
    >
      {/* leads */}
      <line x1="0" y1="15" x2="22" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="58" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
      {/* disc body */}
      <ellipse
        cx="40"
        cy="15"
        rx="18"
        ry="11"
        fill={tripped ? "#e8963c" : "#e8c93c"}
        stroke="#a3822a"
        strokeWidth="1.5"
      />
      <text
        x="40"
        y="18"
        fontSize="7"
        textAnchor="middle"
        fill="#4a3c15"
        fontWeight="bold"
      >
        PTC
      </text>
    </svg>
  );
}
