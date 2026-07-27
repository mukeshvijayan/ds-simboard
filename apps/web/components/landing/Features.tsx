import { Container, ScrollReveal } from "@ds-simboard/design-system";

const FEATURES = [
  {
    title: "Wire it like you would on a desk",
    body: "Drag real components onto a breadboard canvas — an Arduino Uno or ESP32, an LED, a servo, an ultrasonic sensor, an LCD — and connect them the same way you would with jumper wires.",
  },
  {
    title: "Write the actual sketch",
    body: "No dumbed-down blocks here — a real code editor with syntax highlighting for the same C++-style sketches that run on physical Arduino and ESP32 hardware.",
  },
  {
    title: "Watch the circuit respond",
    body: "Run the sketch and see pins change state, the LED light up, the servo turn, and sensor readings arrive over a live serial monitor — before a single wire touches real hardware.",
  },
  {
    title: "Then build the real thing",
    body: "Nothing about the simulation is make-believe wiring. When the circuit works on screen, the same layout and the same code are ready to move to physical components.",
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <ScrollReveal>
          <h2 className="max-w-[22ch] font-serif text-[32px] leading-tight text-charcoal md:text-[38px]">
            Everything you need before you touch real hardware.
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <ScrollReveal key={feature.title} delayMs={i * 60}>
              <div className="border-t border-hairline pt-6">
                <h3 className="font-serif text-[19px] text-charcoal">{feature.title}</h3>
                <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-charcoal-muted">
                  {feature.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
