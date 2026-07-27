/**
 * How many AVR instructions to step per animation frame. Tuned (alongside
 * the delay-loop length baked into `BLINK_PROGRAM`) for a comfortably
 * visible ~1-second toggle interval at 60fps — not an attempt to match
 * real 16MHz hardware timing. See packages/chip-emulation's
 * programs/blink.ts and docs/architecture/0007-*.md.
 */
export const INSTRUCTIONS_PER_FRAME = 26_000;

/** The human-readable AVR assembly source actually running on the emulated CPU. */
export const BLINK_SOURCE = `; Blink demo — toggles pin 13 (PB5) with a busy-wait delay.
; This is real AVR machine code executing on a real, instruction-stepping
; CPU emulator (avr8js) — not a scripted animation.
  ldi r16, 0x20      ; bit 5 (pin 13) mask
  out 0x04, r16      ; DDRB = 0x20 (PB5 as output)
main_loop:
  out 0x03, r16      ; writing to PINB toggles the corresponding PORTB bit
  ldi r18, 0xff
  ldi r19, 0xff
  ldi r20, 0x08
delay_loop:
  dec r18
  brne delay_loop
  dec r19
  brne delay_loop
  dec r20
  brne delay_loop
  rjmp main_loop
`;
