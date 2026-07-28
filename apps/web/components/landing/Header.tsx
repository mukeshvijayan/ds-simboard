"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button, Container } from "@ds-simboard/design-system";

// Site navigation is deliberately just these two — the unified canvas
// (docs/architecture/0024-*.md) replaced three separate lab routes, and
// "Open simulator" below is the third destination, not a fourth link.
const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ivory">
      <Container className="flex h-[72px] items-center justify-between">
        <Link href="/" className="font-serif text-[20px] font-semibold text-charcoal">
          DS SimBoard
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
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

        <div className="flex items-center gap-3">
          <Button href="/simulator" variant="primary" className="hidden sm:inline-flex">
            Open simulator
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-sm border border-hairline p-2 text-charcoal md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-hairline bg-ivory md:hidden"
          aria-label="Mobile"
        >
          <Container className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-sm px-2 py-2.5 text-[15px] text-charcoal-muted transition-colors hover:bg-white hover:text-charcoal"
              >
                {link.label}
              </Link>
            ))}
            <Button href="/simulator" variant="primary" className="mt-2 sm:hidden">
              Open simulator
            </Button>
          </Container>
        </nav>
      )}
    </header>
  );
}
