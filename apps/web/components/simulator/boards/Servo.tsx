export function Servo({ angle = 90 }: { angle?: number }) {
  return (
    <svg
      viewBox="0 0 60 50"
      width={60}
      height={50}
      role="img"
      aria-label={`Servo, ${angle} degrees`}
    >
      <rect
        x="8"
        y="14"
        width="44"
        height="30"
        rx="2"
        fill="#EDEBE3"
        stroke="#22314F"
        strokeWidth="1.2"
      />
      <circle cx="30" cy="14" r="6" fill="#EDEBE3" stroke="#22314F" strokeWidth="1.2" />
      <g style={{ transform: `rotate(${angle - 90}deg)`, transformOrigin: "30px 14px" }}>
        <rect x="28" y="-6" width="4" height="20" rx="1.5" fill="#22314F" />
      </g>
    </svg>
  );
}
