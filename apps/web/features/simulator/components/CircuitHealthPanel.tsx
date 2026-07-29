"use client";

import { PART_LABELS } from "../constants";
import {
  firstHealthReason,
  overallHealthStatus,
  type ResolveCircuitResult,
} from "../model/resolveCircuit";
import type { PlacedComponent } from "../model/types";
import type { HealthStatus } from "@ds-simboard/component-library";

const STATUS_COLOR: Record<HealthStatus, string> = {
  nominal: "#3a9c4a",
  stressed: "#b8862f",
  failed: "#8a3b3b",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  nominal: "Nominal",
  stressed: "Stressed",
  failed: "Failed",
};

/**
 * The right panel's breadboard-selected view (Part 5, docs/architecture/
 * 0035-*.md) — every placed component's live health status and, once
 * the circuit actually resolves, the supply current. Distinct from
 * `StatusBanner` (one-line overall status shown in the toolbar
 * regardless of selection): this is the per-component detail a student
 * gets specifically by selecting the breadboard itself.
 */
export function CircuitHealthPanel({
  components,
  result,
}: {
  components: PlacedComponent[];
  result: ResolveCircuitResult;
}) {
  return (
    <aside
      aria-label="Circuit health"
      className="flex w-[240px] shrink-0 flex-col gap-3 border-l border-hairline bg-ivory p-4"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
        Circuit Health
      </p>

      {result.status === "solved" && (
        <p className="text-[13px] text-charcoal">
          Supply current: {(result.supplyCurrentAmps * 1000).toFixed(1)} mA
        </p>
      )}
      {result.status === "no-power" && (
        <p className="text-[13px] text-charcoal-muted">{result.message}</p>
      )}
      {result.status === "unresolved" && (
        <p className="text-[13px] text-[#b8862f]">{result.message}</p>
      )}
      {result.status === "short-circuit" && (
        <p className="text-[13px] text-[#8a3b3b]">
          Short circuit — see which component failed below.
        </p>
      )}

      {components.length === 0 ? (
        <p className="text-[13px] text-charcoal-muted">No components placed yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {components.map((component) => {
            const componentResult = result.componentResults.get(component.id);
            const status: HealthStatus = componentResult
              ? overallHealthStatus(componentResult.health)
              : "nominal";
            const reason = componentResult
              ? firstHealthReason(componentResult.health)
              : undefined;
            return (
              <li
                key={component.id}
                className="flex flex-col gap-0.5 border-b border-hairline pb-2 text-[13px]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[status] }}
                    aria-hidden="true"
                  />
                  <span className="text-charcoal">{PART_LABELS[component.type]}</span>
                  <span className="ml-auto font-mono text-[11px] text-charcoal-muted">
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <span className="pl-4 font-mono text-[11px] text-charcoal-muted">
                  {component.id}
                </span>
                {reason && (
                  <span className="pl-4 text-[11px] text-[#8a3b3b]">{reason}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
