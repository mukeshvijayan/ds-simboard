import type { Metadata } from "next";
import { Container, Button } from "@ds-simboard/design-system";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Docs — DS SimBoard",
  description: "How to use the simulator: pick a part, wire it up, and watch it work.",
};

const STEPS = [
  {
    title: "1. Pick a part",
    body: "On the left side of the simulator is a list of parts — resistors, LEDs, sensors, and more. Click one to start placing it.",
  },
  {
    title: "2. Wire it up",
    body: 'Click two holes on the breadboard to connect a part between them. Need to connect two things that are already placed? Click "Draw wire," then click the two holes you want to join.',
  },
  {
    title: "3. Watch it work",
    body: "As soon as a part is wired into a complete loop with the power rails, the circuit comes alive — the banner at the top tells you what's happening, and parts like LEDs light up for real, computed from the actual current flowing through them.",
  },
  {
    title: "4. Move around",
    body: "Drag anywhere on the empty background to pan around, and scroll to zoom in or out. You can also drag the breadboard itself to a new spot.",
  },
  {
    title: "5. Adjust and explore",
    body: "Click any part you've placed to see its details on the right, and change things like a potentiometer's position or a sensor's simulated reading. Try changing the supply voltage at the top and see what happens.",
  },
];

export default function DocsPage() {
  return (
    <>
      <Header />
      <main>
        <Container className="py-16">
          <h1 className="font-serif text-[32px] font-semibold text-charcoal">
            How to use the simulator
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-charcoal-muted">
            The simulator is a real circuit — every light, sound, and reading you see
            comes from an actual electrical calculation, not a scripted animation.
            Here&apos;s how to get started.
          </p>

          <ol className="mt-10 flex flex-col gap-8">
            {STEPS.map((step) => (
              <li key={step.title}>
                <h2 className="font-serif text-[20px] font-semibold text-charcoal">
                  {step.title}
                </h2>
                <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-charcoal-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-sm border border-hairline bg-ivory p-6">
            <h2 className="font-serif text-[18px] font-semibold text-charcoal">
              A few things worth knowing
            </h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] leading-relaxed text-charcoal-muted">
              <li>
                A part that draws too much current can be damaged — the simulator marks it
                &quot;failed&quot; and it stays that way until you remove it, just like a
                real part that&apos;s burned out.
              </li>
              <li>
                Some sensors (like light, sound, and motion sensors) let you drag a slider
                to simulate what they&apos;d be sensing, since there&apos;s no real light
                or sound for the simulator to detect.
              </li>
              <li>The simulator works best on a laptop or desktop — not on a phone.</li>
            </ul>
          </div>

          <div className="mt-10">
            <Button href="/simulator" variant="primary">
              Open the simulator
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
