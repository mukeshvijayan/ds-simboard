/**
 * Blink demo: toggles Arduino Uno pin 13 (PB5) with a busy-wait delay
 * between toggles. This is the AVR-assembly equivalent of:
 *
 * ```c
 * void setup() { pinMode(13, OUTPUT); }
 * void loop() {
 *   digitalWrite(13, !digitalRead(13)); // toggle
 *   delay(...);
 * }
 * ```
 *
 * The machine code below was generated *once*, at development time, from
 * this AVR assembly source using `avr8js`'s own bundled assembler (MIT
 * licensed, same package as the runtime) — not at runtime, and not
 * shipped as a dependency of this file. See
 * docs/architecture/0007-*.md for why: that assembler is an internal,
 * non-publicly-documented utility (not exported from `avr8js`'s package
 * entry point), so it's used only as a one-time dev-time code-generation
 * tool, never inside the running app.
 *
 * The triple-nested delay loop (~1.58M cycles between toggles) is tuned
 * for a comfortably visible blink rate when stepped at roughly 26,000
 * instructions per animation frame at 60fps in the Arduino Lab UI (about
 * a 1-second toggle interval) — not an attempt to match real 16MHz
 * hardware timing exactly, the same "tuned for demo responsiveness"
 * tradeoff the existing `SketchEngine` interpreter already makes.
 *
 * ```asm
 *   ldi r16, 0x20      ; bit 5 (pin 13) mask
 *   out 0x04, r16      ; DDRB = 0x20 (PB5 as output)
 * main_loop:
 *   out 0x03, r16      ; writing to PINB toggles the corresponding PORTB bit
 *   ldi r18, 0xff
 *   ldi r19, 0xff
 *   ldi r20, 0x08
 * delay_loop:
 *   dec r18
 *   brne delay_loop
 *   dec r19
 *   brne delay_loop
 *   dec r20
 *   brne delay_loop
 *   rjmp main_loop
 * ```
 *
 * To regenerate after editing the assembly above: assemble it with
 * `avr8js`'s bundled assembler (`avr8js/dist/cjs/utils/test-utils.js`'s
 * `asmProgram`) and paste the resulting words below.
 */
export const BLINK_PROGRAM = new Uint16Array([
  0xe200, 0xb904, 0xb903, 0xef2f, 0xef3f, 0xe048, 0x952a, 0xf7f1, 0x953a, 0xf7e1, 0x954a,
  0xf7d1, 0xcff5,
]);

/** Approximate CPU cycles between toggles for {@link BLINK_PROGRAM}, measured empirically. */
export const BLINK_CYCLES_PER_TOGGLE = 1_576_208;
