"use client";

import type { ResolveCircuitResult } from "../model/resolveCircuit";

const COPY: Record<ResolveCircuitResult["status"], { label: string; className: string }> =
  {
    empty: {
      label: "Nothing wired yet",
      className: "bg-charcoal-faint/20 text-charcoal-muted",
    },
    conducting: { label: "Circuit is live", className: "bg-navy/10 text-navy" },
    "non-conducting": {
      label: "No current is flowing",
      className: "bg-charcoal-faint/20 text-charcoal-muted",
    },
    "short-circuit": {
      label: "Short circuit — a component has failed",
      className: "bg-[#8a3b3b]/10 text-[#8a3b3b]",
    },
    "unsupported-topology": {
      label: "Not a complete loop yet",
      className: "bg-[#b8862f]/10 text-[#b8862f]",
    },
  };

export function StatusBanner({ result }: { result: ResolveCircuitResult }) {
  const { label, className } = COPY[result.status];
  const detail =
    result.status === "unsupported-topology"
      ? result.message
      : result.status === "conducting"
        ? `${(result.currentAmps * 1000).toFixed(1)}mA flowing`
        : undefined;

  return (
    <div className={`rounded-sm px-4 py-2.5 text-[13px] ${className}`} role="status">
      <span className="font-medium">{label}</span>
      {detail && <span className="ml-2 opacity-80">{detail}</span>}
    </div>
  );
}
