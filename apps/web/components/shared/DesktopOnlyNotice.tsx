/**
 * Shown in place of a lab's wiring/code canvas below the `lg` breakpoint.
 * These labs (Breadboard/Arduino/ESP32) genuinely need more screen width
 * than a phone or narrow tablet can give a multi-pane wiring/code
 * layout — an honest notice beats silently rendering a squished, broken
 * UI. See docs/architecture/0014-*.md.
 */
export function DesktopOnlyNotice({ labName }: { labName: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center lg:hidden">
      <div className="max-w-sm">
        <p className="font-serif text-[18px] text-charcoal">
          Best experienced on a larger screen
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
          {labName}&rsquo;s wiring canvas needs more room than this screen has. Try a
          laptop, desktop, or a tablet in landscape.
        </p>
      </div>
    </div>
  );
}
