import { Snowflake } from "@phosphor-icons/react/dist/ssr";

// The one marquee on the page: a ticker of connections going cold RIGHT NOW.
// It is the product's whole reason to exist, scrolling past you. CSS-only
// animation (transform), frozen under prefers-reduced-motion.

const COLD: { name: string; role: string; days: number }[] = [
  { name: "Bob Chen", role: "Recruiter, Google", days: 12 },
  { name: "Prof. James Torres", role: "Northwestern", days: 19 },
  { name: "Maya Patel", role: "Design mentor", days: 9 },
  { name: "Devon King", role: "Mentor, Stripe", days: 26 },
  { name: "Sarah Lin", role: "Hiring manager", days: 15 },
  { name: "Aisha Khan", role: "Founder you interned for", days: 31 },
  { name: "Coach Rivera", role: "Career center", days: 22 },
  { name: "Elena Vasquez", role: "Alumni connect", days: 17 },
];

function Chip({ name, role, days }: { name: string; role: string; days: number }) {
  return (
    <span className="mx-2 inline-flex shrink-0 items-center gap-2.5 rounded-full border border-hairline bg-surface py-2 pl-3 pr-4 shadow-card">
      <Snowflake size={14} className="shrink-0 text-accent" weight="fill" />
      <span className="text-sm">
        <span className="font-medium text-ink">{name}</span>
        <span className="text-muted"> · {role} · </span>
        <span className="font-medium text-cold">{days}d silent</span>
      </span>
    </span>
  );
}

export function ColdTicker() {
  return (
    <section aria-label="Connections going cold" className="overflow-hidden border-y border-hairline bg-bg py-5">
      <div className="flex w-max animate-marquee" aria-hidden>
        {[...COLD, ...COLD].map((p, i) => (
          <Chip key={`${p.name}-${i}`} {...p} />
        ))}
      </div>
      <p className="sr-only">
        Somewhere in your network, someone is going cold. Dialed catches it.
      </p>
    </section>
  );
}
