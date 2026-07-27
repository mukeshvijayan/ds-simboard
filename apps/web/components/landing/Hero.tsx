import { Button, Container, ScrollReveal } from "@ds-simboard/design-system";
import { HeroPreview } from "@/components/landing/HeroPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      <Container>
        <div className="grid items-center gap-14 md:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.14em] text-charcoal-muted">
              For DS BlockCode builders, ready for the next step
            </p>
            <h1 className="font-serif text-[42px] leading-[1.08] tracking-[-0.01em] text-charcoal md:text-[54px]">
              Simulate real circuits before you build them.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-charcoal-muted">
              Wire an Arduino Uno or ESP32 on screen, write the sketch that drives it, and
              watch the circuit respond in real time — then flash the exact same code to
              the board sitting on your desk.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button href="/simulator" variant="primary">
                Open the simulator
              </Button>
              <Button href="#how-it-works" variant="ghost">
                See how it works →
              </Button>
            </div>
          </div>

          <ScrollReveal direction="right">
            <HeroPreview />
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
