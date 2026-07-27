import { BOARDS } from "@/lib/simulation/boards";

export function ArduinoUno() {
  const pins = BOARDS.uno.digitalPins;

  return (
    <svg viewBox="0 0 420 260" className="h-full w-full" role="img" aria-label="Arduino Uno board">
      <rect x="10" y="10" width="400" height="240" rx="6" fill="#EDEBE3" stroke="#22314F" strokeWidth="1.5" />
      <text x="26" y="40" fontSize="15" fill="#22314F" fontFamily="var(--font-mono)">ARDUINO UNO R3</text>
      <rect x="150" y="80" width="120" height="90" fill="#1C1B18" opacity="0.75" />
      <text x="210" y="130" fontSize="10" fill="#FAF8F3" fontFamily="var(--font-mono)" textAnchor="middle">
        ATmega328P
      </text>

      {/* Digital pin header, top edge */}
      {pins.map((pin, i) => (
        <g key={`d-${pin}`}>
          <rect x={30 + i * 26} y="18" width="6" height="10" fill="#1C1B18" opacity="0.4" />
          <text x={33 + i * 26} y="16" fontSize="8" fill="#6B6A64" textAnchor="middle">
            {pin}
          </text>
        </g>
      ))}

      {/* Analog pin header, bottom edge */}
      {BOARDS.uno.analogPins.map((pin, i) => (
        <g key={`a-${pin}`}>
          <rect x={220 + i * 26} y="232" width="6" height="10" fill="#1C1B18" opacity="0.4" />
          <text x={223 + i * 26} y="252" fontSize="8" fill="#6B6A64" textAnchor="middle">
            {pin}
          </text>
        </g>
      ))}

      <circle cx="368" cy="220" r="10" fill="#EDEBE3" stroke="#22314F" strokeWidth="1.2" />
    </svg>
  );
}
