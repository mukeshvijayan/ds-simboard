"use client";

import type { ResolveCircuitResult } from "../model/resolveCircuit";

/** Below this, the supply's net current reads as "nothing is flowing" —
 * matches the near-zero currents a fully open/disconnected board settles
 * to, without needing an exact-zero comparison. */
const CONDUCTING_EPSILON_AMPS = 1e-9;

const COPY: Record<ResolveCircuitResult["status"], { label: string; className: string }> =
  {
    empty: {
      label: "Nothing wired yet",
      className: "bg-charcoal-faint/20 text-charcoal",
    },
    solved: { label: "Circuit is live", className: "bg-navy/10 text-navy" },
    "short-circuit": {
      label: "Short circuit — a component has failed",
      className: "bg-[#8a3b3b]/10 text-[#8a3b3b]",
    },
    unresolved: {
      label: "Couldn't resolve this wiring",
      className: "bg-[#b8862f]/10 text-[#b8862f]",
    },
  };

export function StatusBanner({ result }: { result: ResolveCircuitResult }) {
  const isIdle =
    result.status === "solved" &&
    Math.abs(result.supplyCurrentAmps) < CONDUCTING_EPSILON_AMPS;
  const { label, className } = isIdle
    ? { label: "No current is flowing", className: "bg-charcoal-faint/20 text-charcoal" }
    : COPY[result.status];
  const detail =
    result.status === "unresolved"
      ? result.message
      : result.status === "solved" && !isIdle
        ? `${(result.supplyCurrentAmps * 1000).toFixed(1)}mA flowing`
        : undefined;

  return (
    <div className={`rounded-sm px-4 py-2.5 text-[13px] ${className}`} role="status">
      <span className="font-medium">{label}</span>
      {detail && <span className="ml-2 opacity-80">{detail}</span>}
    </div>
  );
}
