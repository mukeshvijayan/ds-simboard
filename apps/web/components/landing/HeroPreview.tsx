export function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-sm border border-hairline bg-white shadow-[0_1px_0_rgba(28,27,24,0.04)]">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-charcoal/15" />
          <span className="h-2.5 w-2.5 rounded-full border border-charcoal/15" />
          <span className="h-2.5 w-2.5 rounded-full border border-charcoal/15" />
        </div>
        <span className="font-mono text-[11px] text-charcoal-faint">
          blink_led.ino — running
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-charcoal-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-navy" />
          live
        </span>
      </div>

      <div className="grid grid-cols-2">
        {/* Board + LED mock */}
        <div className="flex items-center justify-center border-r border-hairline bg-ivory p-8">
          <svg
            viewBox="0 0 200 140"
            className="w-full max-w-[220px]"
            role="img"
            aria-label="Arduino Uno with an LED wired to pin 13"
          >
            <rect
              x="10"
              y="20"
              width="150"
              height="100"
              rx="4"
              fill="#3B4C70"
              opacity="0.08"
              stroke="#22314F"
              strokeWidth="1"
            />
            <text x="18" y="36" fontSize="8" fill="#22314F" fontFamily="var(--font-mono)">
              UNO R3
            </text>
            {Array.from({ length: 8 }).map((_, i) => (
              <rect
                key={`top-${i}`}
                x={22 + i * 16}
                y="24"
                width="4"
                height="7"
                fill="#1C1B18"
                opacity="0.35"
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <rect
                key={`bot-${i}`}
                x={22 + i * 16}
                y="109"
                width="4"
                height="7"
                fill="#1C1B18"
                opacity="0.35"
              />
            ))}
            <rect
              x="30"
              y="55"
              width="36"
              height="36"
              rx="2"
              fill="#1C1B18"
              opacity="0.75"
            />
            <path
              d="M 66 73 Q 130 30 168 30"
              fill="none"
              stroke="#22314F"
              strokeWidth="1.5"
            />
            <circle
              cx="172"
              cy="28"
              r="10"
              fill="#FAF8F3"
              stroke="#22314F"
              strokeWidth="1.5"
            />
            <circle cx="172" cy="28" r="4" fill="#22314F" />
          </svg>
        </div>

        {/* Code mock */}
        <div className="bg-[#1C1B18] p-5 font-mono text-[12px] leading-relaxed text-ivory/80">
          <div>
            <span className="text-ivory/40">1</span>{" "}
            <span className="text-[#8FA6C9]">void</span> setup() {"{"}
          </div>
          <div>
            <span className="text-ivory/40">2</span> pinMode(13, OUTPUT);
          </div>
          <div>
            <span className="text-ivory/40">3</span> {"}"}
          </div>
          <div>
            <span className="text-ivory/40">4</span>
          </div>
          <div>
            <span className="text-ivory/40">5</span>{" "}
            <span className="text-[#8FA6C9]">void</span> loop() {"{"}
          </div>
          <div>
            <span className="text-ivory/40">6</span> digitalWrite(13, HIGH);
          </div>
          <div>
            <span className="text-ivory/40">7</span> delay(500);
          </div>
          <div>
            <span className="text-ivory/40">8</span> digitalWrite(13, LOW);
          </div>
          <div>
            <span className="text-ivory/40">9</span> delay(500);
          </div>
          <div>
            <span className="text-ivory/40">10</span> {"}"}
          </div>
        </div>
      </div>
    </div>
  );
}
