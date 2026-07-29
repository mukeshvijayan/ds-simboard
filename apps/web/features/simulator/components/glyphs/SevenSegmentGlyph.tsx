/**
 * Hand-authored SVG 7-segment display — original artwork (P2-4b
 * rollout). Each segment's fill is driven live by its own lit boolean
 * (`segments` prop), the same "attribute changes, not a file swap"
 * pattern as every other glyph here — a real 7-segment digit is
 * literally seven independently-controllable LED dies, and this mirrors
 * that directly instead of swapping between ten pre-drawn digit images.
 *
 * Labeling (Part 4): the individual segment/dp leads aren't labeled on
 * the glyph itself — nine labels legible at this component's scale
 * would be unreadable clutter, and unlike an unmarked transistor pin, a
 * segment's own function is directly observable (wire "segment a",
 * watch the top bar light). The one pin that *isn't* self-evident this
 * way — the shared common leg — gets an explicit label.
 */

export const SEVEN_SEGMENT_PIN_POSITIONS = {
  common: { x: 2, y: 60 },
  a: { x: 10, y: 60 },
  b: { x: 16, y: 60 },
  c: { x: 22, y: 60 },
  d: { x: 28, y: 60 },
  e: { x: 34, y: 60 },
  f: { x: 40, y: 60 },
  g: { x: 46, y: 60 },
  dp: { x: 52, y: 60 },
};

const LIT_COLOR = "#D64545";
const UNLIT_COLOR = "#A7A59D";

export function SevenSegmentGlyph({
  segments,
  decimalPointLit,
  width = 34,
  height = 68,
}: {
  segments: Record<"a" | "b" | "c" | "d" | "e" | "f" | "g", boolean>;
  decimalPointLit: boolean;
  width?: number;
  height?: number;
}) {
  const color = (lit: boolean) => (lit ? LIT_COLOR : UNLIT_COLOR);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 68"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="7-segment display"
    >
      {/* dark digit backing */}
      <rect x="2" y="2" width="30" height="50" rx="2" fill="#1a1a1a" />
      <text
        x="17"
        y="65"
        fontSize="10"
        textAnchor="middle"
        fill="#22314F"
        fontWeight="bold"
      >
        COM
      </text>
      {/* a: top */}
      <rect x="9" y="5" width="16" height="4" rx="2" fill={color(segments.a)} />
      {/* b: top-right */}
      <rect x="25" y="8" width="4" height="15" rx="2" fill={color(segments.b)} />
      {/* c: bottom-right */}
      <rect x="25" y="26" width="4" height="15" rx="2" fill={color(segments.c)} />
      {/* d: bottom */}
      <rect x="9" y="42" width="16" height="4" rx="2" fill={color(segments.d)} />
      {/* e: bottom-left */}
      <rect x="7" y="26" width="4" height="15" rx="2" fill={color(segments.e)} />
      {/* f: top-left */}
      <rect x="7" y="8" width="4" height="15" rx="2" fill={color(segments.f)} />
      {/* g: middle */}
      <rect x="9" y="24" width="16" height="4" rx="2" fill={color(segments.g)} />
      {/* decimal point */}
      <circle cx="31" cy="46" r="2" fill={color(decimalPointLit)} />
    </svg>
  );
}
