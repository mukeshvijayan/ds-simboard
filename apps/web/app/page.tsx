import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { Features } from "@/components/landing/Features";
import { SupportedBoards } from "@/components/landing/SupportedBoards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
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
