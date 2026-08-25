"use client";

// Live web port of the app's AnimatedPhoneDemo (WEBSITE_SPEC.md §5.2).
// A faithful miniature of the real product screens (home.tsx): the Network pane
// with the tick-mark health gauge and Needs-Attention card, a push banner, the
// Inbox pane with urgency bars and Dismiss / Marked replied actions, the AI
// reply drafting, then home again with health grown 72 -> 89. Loops.
// Fully static (final "grown" state) under prefers-reduced-motion.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sparkle, Check, CaretLeft, CaretRight, BellSimple, EnvelopeSimple,
  Users, PlusCircle, MagnifyingGlass, Clock, ArrowUp, CheckCircle, LockSimple,
} from "@phosphor-icons/react";

type Scene = "home" | "inbox" | "reply" | "grown";

const RED = "#ef4444";
const AMBER = "#f59e0b";
const GREEN = "#16a34a";

// ── Mini tick-mark DialGauge (the app's real gauge) ─────────────────────────
const G_TICKS = 24;
const G_START = 135;
const G_SWEEP = 270;

function MiniGauge({ score }: { score: number }) {
  const col = score >= 80 ? GREEN : score >= 50 ? AMBER : RED;
  const label = score >= 80 ? "STRONG" : score >= 50 ? "FAIR" : "COLD";
  const nLit = Math.round(G_TICKS * (score / 100));
  const pt = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 30 + r * Math.cos(rad), y: 30 + r * Math.sin(rad) };
  };
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" role="img" aria-label={`Network health ${score}`}>
      <circle cx="30" cy="30" r="28" fill="#0B1A2C" />
      {Array.from({ length: G_TICKS }, (_, i) => {
        const deg = G_START + (i / (G_TICKS - 1)) * G_SWEEP;
        const a = pt(18, deg);
        const b = pt(24, deg);
        const lit = i < nLit;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={lit ? col : "rgba(255,255,255,0.12)"}
            strokeWidth={lit ? 2 : 1.4}
            strokeLinecap="round"
          />
        );
      })}
      <text x="30" y="35" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff">{score}</text>
      <text x="30" y="44" textAnchor="middle" fontSize="5" letterSpacing="1" fill={col}>{label}</text>
    </svg>
  );
}

// ── Shared chrome ────────────────────────────────────────────────────────────
function ScreenHeader() {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-1">
      <span className="font-sans text-[14px] font-bold tracking-[0.06em] text-ink">
        DI<span className="text-accent">AL</span>ED
      </span>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4f6fa] text-[9px] font-bold text-muted">
        AK
      </span>
    </div>
  );
}

function MiniPillBar({ active }: { active: "network" | "inbox" }) {
  const items = [
    { id: "network", label: "Network", Icon: Users },
    { id: "inbox", label: "Inbox", Icon: EnvelopeSimple },
    { id: "add", label: "Add", Icon: PlusCircle },
    { id: "search", label: "Search", Icon: MagnifyingGlass },
  ];
  return (
    <div className="absolute inset-x-3 bottom-2.5 flex rounded-full border border-hairline bg-white/95 py-1.5 shadow-[0_5px_14px_rgba(13,21,38,0.12)]">
      {items.map(({ id, label, Icon }) => {
        const on = id === active;
        return (
          <span key={id} className="relative flex flex-1 flex-col items-center gap-0.5">
            <Icon size={13} weight={on ? "fill" : "regular"} className={on ? "text-accent" : "text-faint"} />
            <span className={`text-[6.5px] ${on ? "font-medium text-accent" : "text-faint"}`}>{label}</span>
            {on && <span className="absolute -bottom-1 h-[2px] w-4 rounded-full bg-accent" />}
          </span>
        );
      })}
    </div>
  );
}

function HeroCard({ score, grown }: { score: number; grown?: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0C1E35] to-[#081018] px-3 pb-2.5 pt-2.5">
      <p className="text-[7px] font-medium tracking-[0.12em] text-white/45">
        {grown ? "NETWORK HEALTH" : "THIS WEEK"}
      </p>
      <div className="mt-1.5 flex items-center gap-2.5">
        <MiniGauge score={score} />
        <div className="min-w-0">
          {grown ? (
            <>
              <p className="flex items-center gap-1 font-display text-[14px] font-semibold text-white">
                <ArrowUp size={11} weight="bold" className="text-[#16a34a]" /> +17 this week
              </p>
              <p className="mt-0.5 text-[8.5px] text-white/50">Bob is warm again.</p>
            </>
          ) : (
            <>
              <p className="font-display text-[14px] font-semibold text-white">Need you this week</p>
              <p className="mt-0.5 text-[8.5px] text-white/50">1 cooling off.</p>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.07] py-1.5">
        <EnvelopeSimple size={10} className="text-white/55" />
        <span className="text-[8.5px] font-medium text-white/75">
          {grown ? "2 waiting on your reply" : "3 waiting on your reply"}
        </span>
        <CaretRight size={8} className="text-white/40" />
      </div>
    </div>
  );
}

// ── Scenes ───────────────────────────────────────────────────────────────────
function HomeScreen() {
  return (
    <div className="px-2.5">
      <HeroCard score={72} />
      <div className="mt-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[7.5px] font-medium tracking-[0.1em] text-muted">NEEDS ATTENTION</p>
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ef4444] text-[7px] font-medium text-white">1</span>
        </div>
        <div className="rounded-xl border border-[rgba(0,0,0,0.07)] bg-white">
          <div className="flex items-center gap-2 p-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdecec] text-[10px] font-bold text-[#ef4444]">BC</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[12px] font-semibold text-ink">Bob Chen</span>
              <span className="block text-[8.5px] text-muted">Last contact 12d ago, every 7d</span>
            </span>
            <span className="rounded-full bg-[#ef4444]/15 px-1.5 py-0.5 text-[7.5px] font-medium text-[#ef4444]">Overdue</span>
          </div>
          <div className="flex gap-1.5 border-t border-[rgba(0,0,0,0.07)] p-2">
            <span className="flex flex-1 items-center justify-center gap-1 rounded-md border border-hairline py-1.5 text-[8px] font-medium text-accent">+ Draft a note</span>
            <span className="flex flex-1 items-center justify-center gap-1 rounded-md bg-accent py-1.5 text-[8px] font-medium text-white">
              <Check size={9} weight="bold" /> Reached out
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2.5">
        <p className="mb-1.5 text-[7.5px] font-medium tracking-[0.1em] text-muted">ON TRACK</p>
        <div className="rounded-xl border border-[rgba(0,0,0,0.07)] bg-white">
          {[
            { i: "SL", n: "Sarah Lin", s: "Last contact 3d ago", t: RED, bg: "#fdecec" },
            { i: "MP", n: "Maya Patel", s: "Reconnected today", t: AMBER, bg: "#fdf3e2" },
          ].map((r, idx) => (
            <div key={r.n} className={`flex items-center gap-2 p-2 ${idx > 0 ? "border-t border-hairline" : ""}`}>
              <span className="flex shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold" style={{ backgroundColor: r.bg, color: r.t, width: 26, height: 26 }}>{r.i}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[10.5px] font-semibold text-ink">{r.n}</span>
                <span className="block text-[7.5px] text-muted">{r.s}</span>
              </span>
              <CaretRight size={9} className="text-faint" />
            </div>
          ))}
        </div>
      </div>
      <MiniPillBar active="network" />
    </div>
  );
}

function InboxScreen() {
  const rows = [
    { n: "Bob Chen", s: "Re: Project deck", p: "Hey, can you send over the latest deck before Friday?", i: "BC", t: RED, bg: "#fdecec", time: "26h" },
    { n: "Maya Patel", s: "Re: Portfolio review", p: "Would love your eyes on the new case study.", i: "MP", t: AMBER, bg: "#fdf3e2", time: "9h" },
    { n: "Aisha Khan", s: "Re: Fundraising playbook", p: "Attaching the intro list we talked about.", i: "AK", t: "#98a2b3", bg: "#f1f3f7", time: "2h" },
  ];
  return (
    <div className="px-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[7.5px] font-medium tracking-[0.1em] text-muted">3 WAITING</p>
        <span className="flex items-center gap-1 rounded-full border border-hairline bg-white px-1.5 py-0.5">
          <Clock size={8} className="text-accent" />
          <span className="text-[7.5px] font-medium text-ink">Reply within 24h</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.n} className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.07)] bg-white">
            <div className="h-[2.5px] opacity-70" style={{ backgroundColor: r.t }} />
            <div className="p-2">
              <div className="flex items-center gap-1.5">
                <span className="flex shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold" style={{ backgroundColor: r.bg, color: r.t, width: 26, height: 26 }}>{r.i}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between">
                    <span className="truncate font-display text-[10.5px] font-semibold text-ink">{r.n}</span>
                    <span className="text-[7.5px] font-medium" style={{ color: r.t }}>{r.time}</span>
                  </span>
                  <span className="block truncate text-[8px] font-medium text-ink">{r.s}</span>
                  <span className="block truncate text-[7.5px] text-muted">{r.p}</span>
                </span>
              </div>
              <div className="mt-1.5 flex gap-1">
                <span className="flex flex-1 items-center justify-center rounded-md border border-hairline py-1 text-[7.5px] font-medium text-faint">Dismiss</span>
                <span className="flex flex-[2] items-center justify-center gap-1 rounded-md bg-accent py-1 text-[7.5px] font-medium text-white">
                  <Check size={8} weight="bold" /> Marked replied
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <MiniPillBar active="inbox" />
    </div>
  );
}

const DRAFT_LINES = [
  "Hi Bob, absolutely.",
  "Sending the latest deck now,",
  "let me know if Friday still works.",
];

// Miniature of the app's real "Reply with Dialed" screen (mobile reply.tsx):
// email context card with Open in Mail, the Paste-the-email box, the privacy
// note, the Reply preview with its status chip, and the Generate reply ->
// Mark as replied CTA flow.
function ReplyScreen({ typed, generating, sent }: { typed: number; generating: boolean; sent: boolean }) {
  const draftDone = typed > 0;
  return (
    <div className="px-2.5">
      {/* header: back · title · avatar */}
      <div className="flex items-center gap-1.5">
        <CaretLeft size={10} className="text-ink" />
        <p className="flex-1 font-display text-[12px] font-semibold text-ink">Reply with Dialed</p>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f4f6fa] text-[7.5px] font-bold text-muted">BC</span>
      </div>

      {/* email context card */}
      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.07)] bg-white p-1.5">
        <span className="flex items-center justify-center rounded-md bg-accent/10" style={{ width: 22, height: 22 }}>
          <EnvelopeSimple size={11} className="text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[9.5px] font-semibold text-ink">Re: Project deck</span>
          <span className="block text-[7.5px] text-muted">Bob Chen · 26h ago</span>
        </span>
        <span className="text-[7.5px] font-medium text-accent">Open in Mail ↗</span>
      </div>

      {/* paste the email */}
      <p className="mt-2 font-display text-[11.5px] font-semibold text-ink">Paste the email</p>
      <p className="text-[7.5px] text-muted">I&rsquo;ll read it and write a response for you.</p>
      <div className="mt-1 rounded-lg border border-hairline bg-white p-1.5">
        <p className="text-[8.5px] leading-snug text-ink">
          Hey, can you send over the latest deck before Friday?
          <br /><br />- Bob
        </p>
      </div>

      {/* privacy */}
      <p className="mt-1 flex items-center justify-center gap-1 text-[6.5px] text-faint">
        <LockSimple size={7} /> Your content stays private.
      </p>

      {/* reply preview */}
      <div className="mt-1.5 flex items-center justify-between">
        <p className="font-display text-[11.5px] font-semibold text-ink">Reply preview</p>
        <span className="flex items-center gap-1 text-[7.5px] font-medium text-accent">
          <Sparkle size={8} weight="fill" />
          {generating ? "Generating…" : draftDone ? "Draft ready" : "Ready to generate"}
        </span>
      </div>
      <div className={`mt-1 flex min-h-[54px] flex-col justify-center rounded-lg p-2 ${draftDone ? "border border-[rgba(0,0,0,0.07)] bg-white" : "bg-[#f4f6fa]"}`}>
        {draftDone ? (
          <span>
            {DRAFT_LINES.slice(0, typed).map((l) => (
              <span key={l} className="block text-[8.5px] leading-snug text-ink">{l}</span>
            ))}
          </span>
        ) : (
          <span className={`text-center text-[8px] leading-snug ${generating ? "animate-pulse text-accent" : "text-muted"}`}>
            {generating ? "Reading the email and drafting your reply…" : "Paste an email above and Dialed will draft a response here."}
          </span>
        )}
      </div>

      {/* primary CTA: Generate reply -> Mark as replied */}
      <div
        className={`mt-1.5 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[9.5px] font-medium text-white transition-colors duration-300 ${sent ? "bg-good" : "bg-accent"}`}
      >
        {sent ? (
          <><Check size={10} weight="bold" /> Marked replied</>
        ) : draftDone ? (
          <><Check size={10} weight="bold" /> Mark as replied</>
        ) : (
          <><Sparkle size={10} weight="fill" /> Generate reply</>
        )}
      </div>
    </div>
  );
}

function GrownScreen({ score }: { score: number }) {
  return (
    <div className="px-2.5">
      <HeroCard score={score} grown />
      <div className="mt-2.5">
        <p className="mb-1.5 text-[7.5px] font-medium tracking-[0.1em] text-muted">NEEDS ATTENTION</p>
        <div className="flex items-center gap-2 rounded-xl border border-[#cdead7] bg-[#f1faf4] p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcf2e4] text-[10px] font-bold text-[#16a34a]">BC</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[12px] font-semibold text-ink">Bob Chen</span>
            <span className="block text-[8.5px] text-[#16a34a]">Replied · sent just now</span>
          </span>
          <CheckCircle size={15} weight="fill" className="text-[#16a34a]" />
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.07)] bg-white p-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16a34a]/10">
          <Check size={14} weight="bold" className="text-[#16a34a]" />
        </span>
        <span>
          <span className="block font-display text-[11px] font-semibold text-ink">You&rsquo;re all caught up</span>
          <span className="block text-[8.5px] text-muted">No one is going cold today.</span>
        </span>
      </div>
      <MiniPillBar active="network" />
    </div>
  );
}

// ── The looping demo ─────────────────────────────────────────────────────────
export function PhoneDemo() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState<Scene>("home");
  const [banner, setBanner] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [typed, setTyped] = useState(0);
  const [sent, setSent] = useState(false);
  const [grownNum, setGrownNum] = useState(72);

  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
    };
    const cycle = () => {
      at(0, () => { setScene("home"); setBanner(false); setGenerating(false); setTyped(0); setSent(false); setGrownNum(72); });
      at(900, () => setBanner(true));
      at(3000, () => { setBanner(false); setScene("inbox"); });
      // reply screen: ready -> generating -> draft -> mark as replied
      at(4900, () => setScene("reply"));
      at(5600, () => setGenerating(true));
      at(6700, () => { setGenerating(false); setTyped(1); });
      at(7100, () => setTyped(2));
      at(7500, () => setTyped(3));
      at(8500, () => setSent(true));
      at(9400, () => setScene("grown"));
      // count the gauge up 72 -> 89 in steps
      for (let s = 0; s <= 17; s++) at(9500 + s * 55, () => setGrownNum(72 + s));
      at(12300, cycle);
    };
    cycle();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [reduce]);

  return (
    <div className="relative mx-auto w-[300px] max-w-full">
      <div className="rounded-[44px] bg-ink p-[10px] shadow-phone">
        <div className="relative h-[600px] overflow-hidden rounded-[36px] bg-bg">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-ink" />

          {/* push notification banner */}
          <AnimatePresence>
            {banner && (
              <motion.div
                initial={{ y: -56, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -56, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="absolute inset-x-2.5 top-9 z-10 flex items-center gap-2 rounded-2xl border border-hairline bg-white/95 p-2 shadow-[0_8px_20px_rgba(11,18,32,0.14)]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
                  <BellSimple size={13} weight="fill" className="text-white" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between">
                    <span className="text-[8px] font-medium tracking-wide text-ink">DIALED</span>
                    <span className="text-[7.5px] text-faint">now</span>
                  </span>
                  <span className="block text-[9px] leading-tight text-muted">
                    You forgot to reply to <span className="font-medium text-ink">Bob</span>. He&rsquo;s going cold.
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-9">
            <ScreenHeader />
            {reduce ? (
              <GrownScreen score={89} />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={scene}
                  className="relative h-[510px]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {scene === "home" && <HomeScreen />}
                  {scene === "inbox" && <InboxScreen />}
                  {scene === "reply" && <ReplyScreen typed={typed} generating={generating} sent={sent} />}
                  {scene === "grown" && <GrownScreen score={grownNum} />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
