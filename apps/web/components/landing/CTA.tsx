import { Button, Container, ScrollReveal } from "@ds-simboard/design-system";

export function CTA() {
  return (
    <section className="border-t border-hairline py-20 md:py-28">
      <Container className="flex flex-col items-center text-center">
        <ScrollReveal>
          <h2 className="max-w-[20ch] font-serif text-[34px] leading-tight text-charcoal md:text-[42px]">
            Wire your first circuit in under a minute.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[16px] text-charcoal-muted">
            No account needed to try it. Open the simulator and start from a blank Arduino
            Uno or ESP32.
          </p>
          <div className="mt-8">
            <Button href="/simulator" variant="primary">
              Open the simulator
            </Button>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
