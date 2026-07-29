/**
 * Hand-authored SVG sound sensor — original artwork (P2-4b rollout),
 * modeled on a real condenser-mic module (round metal can on a small
 * PCB). `loudness` drives the sound-wave rings' opacity directly.
 */

export const SOUND_SENSOR_PIN_POSITIONS = {
  lead1: { x: 8, y: 36 },
  lead2: { x: 32, y: 36 },
};

export function SoundSensorGlyph({
  loudness = 0,
  width = 40,
  height = 36,
}: {
  loudness?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 36"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Sound sensor, ${Math.round(loudness * 100)}% loud`}
    >
      {/* leads */}
      <line x1="8" y1="26" x2="8" y2="36" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="32" y1="26" x2="32" y2="36" stroke="#b8b8b8" strokeWidth="2" />
      {/* PCB */}
      <rect x="2" y="18" width="36" height="8" fill="#2f6e4f" />
      {/* condenser mic can */}
      <circle cx="20" cy="14" r="10" fill="#8a8a8a" stroke="#5c5c5c" />
      <circle cx="20" cy="14" r="6" fill="#3a3a3a" />
      {/* sound-wave rings, fading in with loudness */}
      <path
        d="M32 14 A12 12 0 0 0 20 2"
        fill="none"
        stroke="#C9A63B"
        strokeWidth="1.5"
        opacity={loudness}
      />
      <path
        d="M36 14 A16 16 0 0 0 20 -2"
        fill="none"
        stroke="#C9A63B"
        strokeWidth="1.5"
        opacity={Math.max(0, loudness - 0.3)}
      />
    </svg>
  );
}
