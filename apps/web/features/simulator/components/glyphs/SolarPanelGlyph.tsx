/**
 * Hand-authored SVG solar panel — original artwork (ADR 0038 rollout): a
 * small panel with a visible cell grid, brightening as the simulated
 * sunlight input rises — the same "the human provides the input this
 * simulator can't sense" visual feedback LDR-style sensors already give.
 */

export const SOLAR_PANEL_PIN_POSITIONS = {
  lead1: { x: 0, y: 25 },
  lead2: { x: 80, y: 25 },
};

export function SolarPanelGlyph({
  sunlightLevel,
  width = 80,
  height = 40,
}: {
  sunlightLevel: number;
  width?: number;
  height?: number;
}) {
  const panelFill = `rgb(${Math.round(30 + sunlightLevel * 60)}, ${Math.round(50 + sunlightLevel * 90)}, ${Math.round(110 + sunlightLevel * 100)})`;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Solar panel, sunlight ${Math.round(sunlightLevel * 100)}%`}
    >
      {/* leads */}
      <line x1="0" y1="25" x2="18" y2="25" stroke="#b8b8b8" strokeWidth="2" />
      <line x1="62" y1="25" x2="80" y2="25" stroke="#b8b8b8" strokeWidth="2" />
      {/* panel frame */}
      <rect x="10" y="4" width="60" height="24" rx="1.5" fill="#3a3a3a" />
      {/* cell grid */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={12 + col * 14.5}
            y={6 + row * 7}
            width="13"
            height="6"
            fill={panelFill}
            stroke="#1c1b18"
            strokeWidth="0.5"
          />
        ))
      )}
      {/* connector post down to the leads */}
      <line x1="18" y1="28" x2="18" y2="25" stroke="#3a3a3a" strokeWidth="2" />
      <line x1="62" y1="28" x2="62" y2="25" stroke="#3a3a3a" strokeWidth="2" />
    </svg>
  );
}
