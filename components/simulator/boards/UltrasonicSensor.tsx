export function UltrasonicSensor({ distanceCm }: { distanceCm?: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 70 36" width={70} height={36} role="img" aria-label="Ultrasonic distance sensor">
        <rect x="2" y="2" width="66" height="32" rx="3" fill="#EDEBE3" stroke="#22314F" strokeWidth="1.2" />
        <circle cx="22" cy="18" r="11" fill="#FAF8F3" stroke="#22314F" strokeWidth="1.2" />
        <circle cx="48" cy="18" r="11" fill="#FAF8F3" stroke="#22314F" strokeWidth="1.2" />
      </svg>
      {typeof distanceCm === "number" && (
        <span className="font-mono text-[11px] text-charcoal-muted">{distanceCm} cm</span>
      )}
    </div>
  );
}
