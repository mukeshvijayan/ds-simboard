import { BOARDS } from "@/lib/simulation/boards";

/** Digital pins with real PWM output on an Uno-class board — drawn with
 * a "~" prefix on the silkscreen, same convention the real board prints. */
const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);

/**
 * Hand-authored SVG Arduino Uno — original artwork (P2-4b/Part 3),
 * researched against real Uno R3 reference photos for proportions,
 * component layout, and pin count/positions (a factual/technical
 * reference, not a copy of any vendor's specific artwork) — but
 * deliberately without the ARDUINO wordmark or infinity-symbol brand
 * mark; "UNO" is a plain functional label, not a logo. Real elements
 * (USB port, DC jack, reset button, crystal, ICSP header, onboard
 * LEDs) are drawn in DS SimBoard's own style, not traced from a photo.
 *
 * Viewbox and every *interactive* pin's header-tick position
 * (`x = 30 + i*26`, `y = 18` for digital; the power-row `5V`/`GND`
 * positions below) must stay in sync with `model/boardPins.ts`'s own
 * copy of this same math — this is decorative/backdrop art
 * (`pointer-events-none` in `BoardGlyph.tsx`); the actual clickable pin
 * buttons are separate elements positioned from that file.
 */
export function ArduinoUno() {
  const pins = BOARDS.uno.digitalPins;

  return (
    <svg
      viewBox="0 0 420 260"
      className="h-full w-full"
      role="img"
      aria-label="Microcontroller board (Uno-compatible)"
    >
      <rect
        x="10"
        y="10"
        width="400"
        height="240"
        rx="6"
        fill="#136F72"
        stroke="#0B4C4E"
        strokeWidth="1.5"
      />

      {/* USB-B port, protruding from the left edge */}
      <rect x="0" y="32" width="38" height="34" rx="2" fill="#C9C7BD" stroke="#6B6A64" />
      <rect x="6" y="38" width="26" height="22" rx="1" fill="#8A8A8A" />

      {/* DC barrel power jack, below the USB port */}
      <rect x="2" y="150" width="34" height="34" rx="4" fill="#1a1a1a" />
      <circle cx="19" cy="167" r="8" fill="#3a3a3a" stroke="#6B6A64" />

      {/* crystal oscillator */}
      <rect
        x="90"
        y="42"
        width="20"
        height="9"
        rx="1.5"
        fill="#C9C7BD"
        stroke="#8A8A8A"
      />

      {/* reset button */}
      <rect
        x="184"
        y="40"
        width="15"
        height="15"
        rx="2"
        fill="#8a3b3b"
        stroke="#5a2620"
      />

      {/* onboard indicator LEDs: power, pin-13 (L), TX, RX */}
      <circle cx="270" cy="46" r="3" fill="#3a9c4a" />
      <text x="270" y="58" fontSize="6" fill="#EDEBE3" textAnchor="middle">
        ON
      </text>
      <circle cx="288" cy="46" r="3" fill="#e8791f" />
      <text x="288" y="58" fontSize="6" fill="#EDEBE3" textAnchor="middle">
        L
      </text>
      <circle cx="306" cy="46" r="3" fill="#2a6fd6" />
      <text x="306" y="58" fontSize="6" fill="#EDEBE3" textAnchor="middle">
        TX
      </text>
      <circle cx="324" cy="46" r="3" fill="#2a6fd6" />
      <text x="324" y="58" fontSize="6" fill="#EDEBE3" textAnchor="middle">
        RX
      </text>

      {/* ATmega328P — a generic part number, not a brand mark */}
      <rect x="150" y="90" width="120" height="90" fill="#1C1B18" opacity="0.85" />
      <text
        x="210"
        y="140"
        fontSize="10"
        fill="#FAF8F3"
        fontFamily="var(--font-mono)"
        textAnchor="middle"
      >
        ATmega328P
      </text>
      {/* ICSP header, next to the chip */}
      {[0, 1, 2].map((row) =>
        [0, 1].map((col) => (
          <circle
            key={`icsp-${row}-${col}`}
            cx={296 + col * 7}
            cy={170 + row * 7}
            r="1.5"
            fill="#C9C7BD"
          />
        ))
      )}

      <text
        x="210"
        y="205"
        fontSize="13"
        fill="#EDEBE3"
        fontFamily="var(--font-mono)"
        textAnchor="middle"
      >
        UNO
      </text>

      {/* Digital pin header, top edge — D0-D13, PWM pins marked with "~" */}
      {pins.map((pin, i) => (
        <g key={`d-${pin}`}>
          <rect
            x={30 + i * 26}
            y="18"
            width="6"
            height="10"
            fill="#1C1B18"
            opacity="0.55"
          />
          <text x={33 + i * 26} y="16" fontSize="8" fill="#EDEBE3" textAnchor="middle">
            {PWM_PINS.has(pin) ? `~${pin}` : pin}
          </text>
        </g>
      ))}
      {/* AREF + GND, silkscreen-only (not separately modeled pins — the
       * digital net's own GND is the same physical rail as the power
       * header's GND below) */}
      <rect x="388" y="18" width="6" height="10" fill="#1C1B18" opacity="0.55" />
      <text x="391" y="16" fontSize="7" fill="#EDEBE3" textAnchor="middle">
        AREF
      </text>
      <rect x="404" y="18" width="6" height="10" fill="#1C1B18" opacity="0.55" />
      <text x="407" y="16" fontSize="7" fill="#EDEBE3" textAnchor="middle">
        GND
      </text>

      {/* Power header, bottom edge — IOREF/RESET/3.3V/5V/GND/GND/VIN, real
       * Uno order. Only 5V and GND are wired as real clickable connection
       * points (`model/boardPins.ts`'s UNO_POWER_PINS); the rest are
       * accurate silkscreen labels only — the real board's full power
       * row, kept legible per Part 4, without silently expanding this
       * app's electrical pin model as a side effect of an art pass.
       *
       * The label sits *above* its tick (same convention the digital
       * header above already uses) — the clickable pin button `BoardGlyph`
       * draws is centered on the tick itself, and an earlier version that
       * put the label there too had the button visually swallow its own
       * label whole, silently un-labeling the two pins a student is most
       * likely to actually click. */}
      {["IOREF", "RESET", "3.3V", "5V", "GND", "GND", "VIN"].map((label, i) => (
        <g key={`pwr-${label}-${i}`}>
          <text x={43 + i * 26} y="228" fontSize="7" fill="#EDEBE3" textAnchor="middle">
            {label}
          </text>
          <rect
            x={40 + i * 26}
            y="232"
            width="6"
            height="10"
            fill="#1C1B18"
            opacity="0.55"
          />
        </g>
      ))}

      {/* Analog pin header, bottom edge — same label-above-tick fix. */}
      {BOARDS.uno.analogPins.map((pin, i) => (
        <g key={`a-${pin}`}>
          <text x={255 + i * 26} y="228" fontSize="8" fill="#EDEBE3" textAnchor="middle">
            {pin}
          </text>
          <rect
            x={252 + i * 26}
            y="232"
            width="6"
            height="10"
            fill="#1C1B18"
            opacity="0.55"
          />
        </g>
      ))}
    </svg>
  );
}
