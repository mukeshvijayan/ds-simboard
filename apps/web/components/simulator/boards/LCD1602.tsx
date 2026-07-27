export function LCD1602({ lines = ["", ""] }: { lines?: [string, string] | string[] }) {
  const [line1 = "", line2 = ""] = lines;

  return (
    <div
      className="rounded-sm border border-charcoal/20 bg-[#22314F] p-3"
      role="img"
      aria-label="16 by 2 character LCD display"
    >
      <div className="rounded-[2px] bg-[#3B4C70] px-2 py-1.5 font-mono text-[11px] leading-[1.6] text-ivory/90">
        <div className="whitespace-pre">{line1.padEnd(16, " ").slice(0, 16)}</div>
        <div className="whitespace-pre">{line2.padEnd(16, " ").slice(0, 16)}</div>
      </div>
    </div>
  );
}
