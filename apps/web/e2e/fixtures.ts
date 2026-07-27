import { test as base, expect } from "@playwright/test";

/**
 * Every test gets `prefers-reduced-motion: reduce`. Without it,
 * scroll-triggered fade-ins (ScrollReveal) leave axe's color-contrast
 * check racing an in-flight opacity transition — a real timing
 * flakiness, not a real contrast bug. This also genuinely exercises the
 * `prefers-reduced-motion: reduce` CSS this app already ships
 * (globals.css). See docs/architecture/0012-*.md.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await use(page);
  },
});

export { expect };
