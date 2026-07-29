/**
 * Hand-authored SVG DHT11 sensor — original artwork (P2-4b rollout),
 * modeled on the real DHT11's blue plastic body with a perforated front
 * grille. Its simulated readings are live text, not baked into any
 * image — same live-value pattern as PowerSupplyIcon's voltage label.
 */

export const DHT11_PIN_POSITIONS = {
  lead1: { x: 10, y: 38 },
  lead2: { x: 30, y: 38 },
};

export function Dht11Glyph({
  temperatureCelsius,
  humidityPercent,
  width = 40,
  height = 38,
}: {
  temperatureCelsius?: number;
  humidityPercent?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 38"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Temperature and humidity sensor${
        temperatureCelsius !== undefined ? `, ${temperatureCelsius}°C` : ""
      }${humidityPercent !== undefined ? `, ${humidityPercent}% humidity` : ""}`}
    >
      {/* leads */}
      <line x1="10" y1="28" x2="10" y2="38" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="30" y1="28" x2="30" y2="38" stroke="#b8b8b8" strokeWidth="2" />
      {/* blue plastic body */}
      <rect x="2" y="2" width="36" height="26" rx="2" fill="#3B6FD6" />
      {/* perforated grille */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={7 + col * 6.5}
            cy={8 + row * 6}
            r="1"
            fill="#22314F"
          />
        ))
      )}
      {temperatureCelsius !== undefined && (
        <text
          x="20"
          y="25"
          fontSize="6"
          textAnchor="middle"
          fill="#FAF8F3"
          fontWeight="bold"
        >
          {Math.round(temperatureCelsius)}°C
        </text>
      )}
    </svg>
  );
}
