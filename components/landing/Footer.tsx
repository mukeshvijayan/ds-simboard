import Link from "next/link";
import { Container } from "@/components/ui/Container";

const FOOTER_LINKS = [
  { label: "Simulator", href: "/simulator" },
  { label: "DS BlockCode", href: "https://blockcode-omega.vercel.app/" },
  { label: "Privacy", href: "#" },
];

export function Footer() {
  return (
    <footer className="py-8">
      <Container className="flex flex-col items-center justify-between gap-4 text-[13px] text-charcoal-faint md:flex-row">
        <span>© {new Date().getFullYear()} DS SimBoard</span>

        <nav className="flex items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-charcoal-muted">
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href="https://dsinventek.com"
          className="text-charcoal-faint hover:text-charcoal-muted"
        >
          A DS Inventek product
        </a>
      </Container>
    </footer>
  );
}
