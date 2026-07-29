/**
 * Hand-authored SVG rain sensor — original artwork (P2-4b rollout),
 * modeled on a real rain-sensing PCB's exposed comb-pattern copper
 * traces. `rainLevel` drives the droplet indicators' opacity directly.
 */

export const RAIN_SENSOR_PIN_POSITIONS = {
  lead1: { x: 6, y: 34 },
  lead2: { x: 34, y: 34 },
};

export function RainSensorGlyph({
  rainLevel = 0,
  width = 40,
  height = 34,
}: {
  rainLevel?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 34"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Rain sensor, ${Math.round(rainLevel * 100)}% wet`}
    >
      {/* leads */}
      <line x1="6" y1="24" x2="6" y2="34" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="34" y1="24" x2="34" y2="34" stroke="#b8b8b8" strokeWidth="2" />
      {/* PCB */}
      <rect x="2" y="2" width="36" height="22" rx="1.5" fill="#2f6e4f" />
      {/* comb-pattern exposed copper traces */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={5 + i * 6.5} y="5" width="3" height="16" fill="#c9a66b" />
      ))}
      {/* rain droplets, appearing as rainLevel rises */}
      <circle
        cx="10"
        cy="12"
        r="2"
        fill="#3B6FD6"
        opacity={Math.min(1, rainLevel * 1.5)}
      />
      <circle
        cx="20"
        cy="9"
        r="2"
        fill="#3B6FD6"
        opacity={Math.max(0, rainLevel * 1.5 - 0.3)}
      />
      <circle
        cx="30"
        cy="14"
        r="2"
        fill="#3B6FD6"
        opacity={Math.max(0, rainLevel * 1.5 - 0.6)}
      />
    </svg>
  );
}
