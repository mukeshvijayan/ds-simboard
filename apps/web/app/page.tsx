import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { Features } from "@/components/landing/Features";
import { SupportedBoards } from "@/components/landing/SupportedBoards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

/**
 * WebApplication structured data (spec Phase 10's "structured data" line
 * item) — a static, code-defined object with no user input, so injecting
 * it via `dangerouslySetInnerHTML` carries no XSS risk here.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "DS SimBoard",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (runs in a web browser)",
  description:
    "Wire up Arduino Uno and ESP32 circuits in the browser, write real code, and watch it run against a live circuit simulation.",
  url: "https://simboard.dsinventek.com",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <Header />
      <main>
        <Hero />
        <TrustBadges />
        <Features />
        <SupportedBoards />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
