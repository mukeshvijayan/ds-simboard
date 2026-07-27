import { BOARDS } from "@/lib/simulation/boards";

export function ESP32() {
  const pins = BOARDS.esp32.digitalPins;
  const half = Math.ceil(pins.length / 2);
  const left = pins.slice(0, half);
  const right = pins.slice(half);

  return (
    <svg
      viewBox="0 0 300 420"
      className="h-full w-full"
      role="img"
      aria-label="ESP32 development board"
    >
      <rect
        x="20"
        y="10"
        width="260"
        height="400"
        rx="6"
        fill="#EDEBE3"
        stroke="#22314F"
        strokeWidth="1.5"
      />
      <text
        x="150"
        y="40"
        fontSize="14"
        fill="#22314F"
        fontFamily="var(--font-mono)"
        textAnchor="middle"
      >
        ESP32 DEVKIT
      </text>
      <rect x="100" y="150" width="100" height="90" fill="#1C1B18" opacity="0.8" />
      <rect x="120" y="70" width="60" height="50" fill="#6B6A64" opacity="0.5" />

      {left.map((pin, i) => (
        <g key={`l-${pin}`}>
          <rect
            x="12"
            y={70 + i * 18}
            width="10"
            height="6"
            fill="#1C1B18"
            opacity="0.4"
          />
          <text x="34" y={75 + i * 18} fontSize="8" fill="#6B6A64">
            {pin}
          </text>
        </g>
      ))}

      {right.map((pin, i) => (
        <g key={`r-${pin}`}>
          <rect
            x="278"
            y={70 + i * 18}
            width="10"
            height="6"
            fill="#1C1B18"
            opacity="0.4"
          />
          <text x="255" y={75 + i * 18} fontSize="8" fill="#6B6A64" textAnchor="end">
            {pin}
          </text>
        </g>
      ))}
    </svg>
  );
}
