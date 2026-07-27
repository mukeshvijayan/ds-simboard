import Link from "next/link";
import { Button, Container } from "@ds-simboard/design-system";

const NAV_LINKS = [
  { label: "Boards", href: "#boards" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Breadboard Lab", href: "/breadboard-lab" },
  { label: "Simulator", href: "/simulator" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ivory">
      <Container className="flex h-[72px] items-center justify-between">
        <Link href="/" className="font-serif text-[20px] font-semibold text-charcoal">
          DS SimBoard
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14.5px] text-charcoal-muted transition-colors hover:text-charcoal"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button href="/simulator" variant="primary">
          Open simulator
        </Button>
      </Container>
    </header>
  );
}
