// Static component previews of real Dialed screens (server-rendered).
// Same visual language as the app: one blue accent, DM Sans, soft cards.

import { Snowflake, BellSimple } from "@phosphor-icons/react/dist/ssr";

// ── The decay stack: one relationship visibly going cold (dark-section visual) ──
// Mirrors the app's contact rows in dark mode; warmth drains row by row.
const DECAY = [
  { days: "3d ago", label: "Warm", color: "#22c55e", opacity: 1 },
  { days: "12d ago", label: "Cooling", color: "#f59e0b", opacity: 0.82 },
  { days: "26d ago", label: "Cold", color: "#ef4444", opacity: 0.62 },
];

export function ColdDecayStack() {
  return (
    <div className="flex w-[300px] max-w-full flex-col gap-3">
      {DECAY.map((d, i) => (
        <div
          key={d.days}
          className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 ${i === 2 ? "animate-floaty" : ""}`}
          style={{ opacity: d.opacity, marginLeft: i * 18 }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
            style={{ backgroundColor: `${d.color}22`, color: d.color }}
          >
            BC
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-semibold text-white">Bob Chen</span>
            <span className="block text-[12px] text-white/50">Recruiter · Google · {d.days}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${d.color}1f`, color: d.color }}>
            {i === 2 && <Snowflake size={11} weight="fill" />}
            {d.label}
          </span>
        </div>
      ))}
      <p className="mt-1 pl-1 text-[13px] text-white/40">
        Three weeks of silence, one relationship gone. Dialed steps in at row two.
      </p>
    </div>
  );
}

// ── The push notification, exactly as the app sends it ─────────────────────────
export function PushCard({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-[310px] max-w-full items-center gap-2.5 rounded-2xl border border-hairline bg-surface p-3 shadow-card ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
        <BellSimple size={18} weight="fill" className="text-white" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wide text-ink">DIALED</span>
          <span className="text-[11px] text-faint">now</span>
        </span>
        <span className="block text-[13px] leading-snug text-muted">
          You forgot to reply to <span className="font-medium text-ink">Bob</span>. He&rsquo;s going cold.
        </span>
      </span>
    </div>
  );
}

const PEOPLE = [
  { initials: "SL", name: "Sarah Lin", role: "Recruiter · Google", days: "3d ago", status: "#16a34a", tint: "#e9f6ee" },
  { initials: "JT", name: "Prof. James Torres", role: "Professor · Northwestern", days: "12d ago", status: "#f59e0b", tint: "#fdf3e2" },
  { initials: "DK", name: "Devon King", role: "Mentor · Stripe", days: "26d ago", status: "#ef4444", tint: "#fdecec" },
];

export function NetworkScreen() {
  return (
    <div className="w-[270px] max-w-full rounded-2xl border border-hairline bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-bold text-ink">Your network</p>
        <p className="text-[11px] text-faint">18 people</p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {PEOPLE.map((p) => (
          <div key={p.name} className="flex items-center gap-2.5 rounded-xl border border-hairline p-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: p.tint, color: p.status }}
            >
              {p.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-ink">{p.name}</span>
              <span className="block truncate text-[10.5px] text-muted">{p.role}</span>
            </span>
            <span className="text-right">
              <span className="mx-auto block h-2 w-2 rounded-full" style={{ backgroundColor: p.status }} />
              <span className="mt-1 block text-[9.5px] text-faint">{p.days}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-accent-tint p-2.5 text-[11px] leading-snug text-ink">
        <span className="font-medium text-accent">Nudge:</span> Devon is going cold. A quick
        hello keeps the door open.
      </div>
    </div>
  );
}

export function HealthDial({ score = 84 }: { score?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Network health score ${score} out of 100`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eceff3" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="#2563eb" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0e1726">{score}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#5b6573">health</text>
      </svg>
    </div>
  );
}
