export function LED({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 40 56"
      width={40}
      height={56}
      role="img"
      aria-label={on ? "LED, lit" : "LED, off"}
    >
      <rect x="14" y="34" width="12" height="18" fill="#8a8a86" />
      <rect x="10" y="50" width="3" height="6" fill="#3B4C70" />
      <rect x="27" y="50" width="3" height="6" fill="#3B4C70" />
      <path
        d="M20 6 C10 6 6 14 6 22 C6 30 12 34 20 34 C28 34 34 30 34 22 C34 14 30 6 20 6 Z"
        fill={on ? "#F4C542" : "#EDEBE3"}
        stroke="#22314F"
        strokeWidth="1.2"
        opacity={on ? 1 : 0.6}
      />
    </svg>
  );
}
