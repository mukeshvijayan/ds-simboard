import { Container } from "@/components/ui/Container";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const BOARDS = [
  { name: "Arduino Uno", detail: "ATmega328P · 14 digital pins · 6 analog inputs" },
  { name: "ESP32 Dev Board", detail: "Dual-core · Wi-Fi & Bluetooth · 34 GPIO pins" },
];

const COMPONENTS = [
  "LED",
  "Micro servo",
  "Ultrasonic distance sensor",
  "16×2 LCD display",
];

export function SupportedBoards() {
  return (
    <section id="boards" className="border-t border-hairline py-20 md:py-28">
      <Container>
        <ScrollReveal>
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-charcoal-muted">
            Supported today
          </p>
          <h2 className="mt-3 max-w-[24ch] font-serif text-[32px] leading-tight text-charcoal md:text-[38px]">
            Two boards. The components that get you building.
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {BOARDS.map((board, i) => (
            <ScrollReveal key={board.name} delayMs={i * 80}>
              <div className="rounded-sm border border-hairline p-7">
                <h3 className="font-serif text-[21px] text-charcoal">{board.name}</h3>
                <p className="mt-2 text-[14px] text-charcoal-muted">{board.detail}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delayMs={120}>
          <div className="mt-10 flex flex-wrap gap-3">
            {COMPONENTS.map((component) => (
              <span
                key={component}
                className="rounded-sm border border-hairline px-4 py-2 text-[13.5px] text-charcoal-muted"
              >
                {component}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
