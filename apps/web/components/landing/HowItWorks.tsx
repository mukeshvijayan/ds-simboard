import { Container, ScrollReveal } from "@ds-simboard/design-system";

const STEPS = [
  {
    n: "01",
    title: "Pick a board",
    body: "Start from an Arduino Uno or ESP32 on a blank canvas.",
  },
  {
    n: "02",
    title: "Add components",
    body: "Drop in an LED, servo, ultrasonic sensor, or LCD and wire it to a pin.",
  },
  {
    n: "03",
    title: "Write the sketch",
    body: "Use the built-in editor to write the code that drives the circuit.",
  },
  {
    n: "04",
    title: "Run and observe",
    body: "Press run and watch pin states, motion, and serial output update live.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-hairline py-20 md:py-28">
      <Container>
        <ScrollReveal>
          <h2 className="max-w-[20ch] font-serif text-[32px] leading-tight text-charcoal md:text-[38px]">
            From blank canvas to a working circuit.
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-10 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.n} delayMs={i * 70}>
              <p className="font-serif text-[15px] text-navy">{step.n}</p>
              <h3 className="mt-3 text-[17px] font-medium text-charcoal">{step.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-charcoal-muted">
                {step.body}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
