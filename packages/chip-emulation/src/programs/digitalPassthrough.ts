/**
 * Digital-passthrough demo: configures pin 13 (PB5) as output and pin 2
 * (PD2) as input, then continuously mirrors pin 2's real input state onto
 * pin 13 — the AVR-assembly equivalent of:
 *
 * ```c
 * void setup() { pinMode(13, OUTPUT); pinMode(2, INPUT); }
 * void loop() { digitalWrite(13, digitalRead(2)); }
 * ```
 *
 * This exists to prove genuine *bidirectional* pin bridging (P2-3,
 * docs/architecture/0027-*.md): `BLINK_PROGRAM` only ever writes a pin, so
 * it can't demonstrate the circuit graph driving a value *into* the
 * emulator via `AVRIOPort.setPin()` (wrapped by
 * `AtmegaRuntime.setDigitalInput`) and the CPU genuinely reading it back
 * out through a real `sbic` instruction — this program does exactly that.
 *
 * Generated once, at development time, the same way as `BLINK_PROGRAM` —
 * see docs/architecture/0007-*.md for why this stays a one-time code-gen
 * step, never a runtime dependency.
 *
 * ```asm
 *   sbi 0x04, 5        ; DDRB |= (1<<5)  -> pin 13 output
 *   cbi 0x0a, 2        ; DDRD &= ~(1<<2) -> pin 2 input
 * main_loop:
 *   sbic 0x09, 2       ; skip next instruction if PIND bit 2 is 0 (LOW)
 *   rjmp set_high
 *   cbi 0x05, 5        ; PORTB &= ~(1<<5) -> pin 13 LOW
 *   rjmp main_loop
 * set_high:
 *   sbi 0x05, 5        ; PORTB |= (1<<5) -> pin 13 HIGH
 *   rjmp main_loop
 * ```
 *
 * To regenerate after editing the assembly above: assemble it with
 * `avr8js`'s bundled assembler (`avr8js/dist/cjs/utils/test-utils.js`'s
 * `asmProgram`) and paste the resulting words below.
 */
export const DIGITAL_PASSTHROUGH_PROGRAM = new Uint16Array([
  0x9a25, 0x9852, 0x994a, 0xc002, 0x982d, 0xcffc, 0x9a2d, 0xcffa,
]);
