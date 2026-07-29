import type { StripRow } from "@ds-simboard/circuit-engine";
import { holePosition } from "../../model/layout";

/**
 * Hand-authored SVG breadboard backdrop — original artwork (P2-4b,
 * closing ADR 0031/0032), not a photo. Drawn in the exact same
 * percentage coordinate space `model/layout.ts` already uses for every
 * real, interactive hole (`holePosition()`), so the artwork's rail
 * stripes and hole dimples line up with the actual click targets
 * rendered on top of it — no new calibration needed, since this reuses
 * the coordinates the interaction layer already has.
 */
const STRIP_ROWS_UPPER: StripRow[] = ["a", "b", "c", "d", "e"];
const STRIP_ROWS_LOWER: StripRow[] = ["f", "g", "h", "i", "j"];

export function BreadboardArt({ columns }: { columns: number }) {
  const columnRange = Array.from({ length: columns }, (_, i) => i + 1);
  const railDot = (rail: "top-positive" | "top-negative", column: number) =>
    holePosition({ address: { kind: "rail", rail }, visualColumn: column }, columns);
  const stripDot = (row: StripRow, column: number) =>
    holePosition(
      { address: { kind: "strip", row, column }, visualColumn: column },
      columns
    );

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="100" height="100" rx="2" fill="#f2f1ec" />
      {/* power rails */}
      <rect x="0" y="0" width="100" height="8" fill="#f6d9d9" />
      <rect x="0" y="8" width="100" height="6" fill="#d7e3f6" />
      {/* center groove separating the two strip halves */}
      <rect x="0" y="44" width="100" height="4" fill="#e2e0d8" />

      {columnRange.map((c) => {
        const p = railDot("top-positive", c);
        return (
          <circle key={`p-${c}`} cx={p.xPercent} cy={p.yPercent} r="0.6" fill="#c96b6b" />
        );
      })}
      {columnRange.map((c) => {
        const p = railDot("top-negative", c);
        return (
          <circle key={`n-${c}`} cx={p.xPercent} cy={p.yPercent} r="0.6" fill="#5b7fb5" />
        );
      })}
      {STRIP_ROWS_UPPER.flatMap((row) =>
        columnRange.map((c) => {
          const p = stripDot(row, c);
          return (
            <circle
              key={`${row}-${c}`}
              cx={p.xPercent}
              cy={p.yPercent}
              r="0.55"
              fill="#c9c7bd"
            />
          );
        })
      )}
      {STRIP_ROWS_LOWER.flatMap((row) =>
        columnRange.map((c) => {
          const p = stripDot(row, c);
          return (
            <circle
              key={`${row}-${c}`}
              cx={p.xPercent}
              cy={p.yPercent}
              r="0.55"
              fill="#c9c7bd"
            />
          );
        })
      )}
    </svg>
  );
}
