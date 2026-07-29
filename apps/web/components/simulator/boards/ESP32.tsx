import { BOARDS } from "@/lib/simulation/boards";

/**
 * Hand-authored SVG ESP32 DevKit — original artwork (P2-4b/Part 3),
 * researched against real ESP32 DevKit reference photos for
 * proportions/layout (a factual/technical reference, not a copy of any
 * vendor's specific artwork). "ESP32" is the chip family's own generic
 * technical name (like "ATmega328P" on the Uno board), not a reproduced
 * logo — unlike ADR's Arduino-wordmark concern, there's no equivalent
 * brand mark here to avoid. Real elements (micro-USB port, BOOT/EN
 * buttons, RF-shielded module can, onboard LED) are drawn in DS
 * SimBoard's own style, not traced from a photo.
 *
 * Viewbox and every pin header's tick position must stay in sync with
 * `model/boardPins.ts`'s own copy of this same math — this is
 * decorative/backdrop art (`pointer-events-none` in `BoardGlyph.tsx`);
 * the actual clickable pin buttons are separate elements positioned
 * from that file.
 */
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
        fill="#1C1B18"
        stroke="#3a3a3a"
        strokeWidth="1.5"
      />

      {/* micro-USB port, top edge */}
      <rect x="128" y="0" width="44" height="20" rx="2" fill="#C9C7BD" stroke="#6B6A64" />

      {/* BOOT / EN buttons, either side of the USB port */}
      <rect x="90" y="26" width="16" height="16" rx="2" fill="#2b2b2b" stroke="#6B6A64" />
      <text x="98" y="52" fontSize="6" fill="#EDEBE3" textAnchor="middle">
        EN
      </text>
      <rect
        x="194"
        y="26"
        width="16"
        height="16"
        rx="2"
        fill="#2b2b2b"
        stroke="#6B6A64"
      />
      <text x="202" y="52" fontSize="6" fill="#EDEBE3" textAnchor="middle">
        BOOT
      </text>

      {/* onboard indicator LED */}
      <circle cx="150" cy="60" r="3" fill="#2a6fd6" />

      {/* RF-shielded module can over the chip */}
      <rect x="100" y="72" width="100" height="90" fill="#8A8A8A" stroke="#5c5c5c" />
      <text
        x="150"
        y="122"
        fontSize="13"
        fill="#1C1B18"
        fontFamily="var(--font-mono)"
        textAnchor="middle"
      >
        ESP32
      </text>
      {/* antenna trace, printed on the shield's edge */}
      <path
        d="M104 76 L104 84 L112 84 L112 92 L120 92"
        fill="none"
        stroke="#5c5c5c"
        strokeWidth="1"
      />

      {left.map((pin, i) => (
        <g key={`l-${pin}`}>
          <rect
            x="12"
            y={70 + i * 18}
            width="10"
            height="6"
            fill="#EDEBE3"
            opacity="0.6"
          />
          <text x="34" y={75 + i * 18} fontSize="8" fill="#EDEBE3">
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
            fill="#EDEBE3"
            opacity="0.6"
          />
          <text x="255" y={75 + i * 18} fontSize="8" fill="#EDEBE3" textAnchor="end">
            {pin}
          </text>
        </g>
      ))}

      {/* power pins, bottom edge — 3V3 and GND, matching model/boardPins.ts.
       * Label sits *above* its tick, not below: the clickable pin button
       * is centered on the tick (model/boardPins.ts's y=400), and a
       * label placed too close beneath it gets visually swallowed by the
       * button (the same bug ArduinoUno.tsx's power row hit and fixed). */}
      <text x="40" y="386" fontSize="8" fill="#EDEBE3" textAnchor="middle">
        3V3
      </text>
      <rect x="35" y="394" width="10" height="6" fill="#EDEBE3" opacity="0.6" />
      <text x="260" y="386" fontSize="8" fill="#EDEBE3" textAnchor="middle">
        GND
      </text>
    </svg>
  );
}
