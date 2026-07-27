import { Container } from "@ds-simboard/design-system";

const BADGES = ["DPIIT Recognised", "AICTE Approved", "Startup India Registered"];

export function TrustBadges() {
  return (
    <div className="border-y border-hairline py-6">
      <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {BADGES.map((badge) => (
          <span
            key={badge}
            className="text-[12px] font-medium uppercase tracking-[0.12em] text-charcoal-muted"
          >
            {badge}
          </span>
        ))}
      </Container>
    </div>
  );
}
