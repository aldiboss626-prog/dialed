"use client";

import { useEffect } from "react";
import {
  motion, useMotionValue, useTransform, animate, useReducedMotion, type MotionValue,
} from "motion/react";

// ── The auto-playing decay story ───────────────────────────────────────────
// A relationship goes cold in real time on a ~20s loop: the health dial
// drains 92 → 8, the streak flame turns to an hourglass and breaks — then
// Dialed steps in and the dial swings back. No scroll pinning; the story
// plays itself and repeats. Pure motion values throughout; nothing
// re-renders per frame.

const TICKS = 44;
const START_DEG = 135;
const SWEEP_DEG = 270;
const SIZE = 320;
const CX = SIZE / 2;
const R_OUT = 138;
const R_IN = 112;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  // Round to 2dp: raw trig floats serialize differently between the server
  // and client renders, which trips React hydration on every <line>.
  return {
    x: Number((CX + r * Math.cos(rad)).toFixed(2)),
    y: Number((CX + r * Math.sin(rad)).toFixed(2)),
  };
}

// One tick = faint base line + colored overlay that lights up when the score
// reaches it. Subcomponent so each gets its own derived motion value.
function Tick({ i, score, color }: { i: number; score: MotionValue<number>; color: MotionValue<string> }) {
  const deg = START_DEG + (i / (TICKS - 1)) * SWEEP_DEG;
  const a = polar(R_IN, deg);
  const b = polar(R_OUT, deg);
  const opacity = useTransform(score, (v) => ((v / 100) * TICKS > i ? 1 : 0));
  return (
    <>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,0.10)" strokeWidth={3} strokeLinecap="round" />
      <motion.line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ opacity, stroke: color }} strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

function Phase({
  progress, window: w, kicker, title, body, accent = false,
}: {
  progress: MotionValue<number>;
  window: [number, number, number, number];
  kicker: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  const opacity = useTransform(progress, w, [0, 1, 1, 0]);
  const y = useTransform(progress, w, [24, 0, 0, -24]);
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${accent ? "text-accent" : "text-white/40"}`}>
        {kicker}
      </p>
      <h3 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-5xl">
        {title}
      </h3>
      <p className="mt-5 max-w-[38ch] text-lg leading-relaxed text-white/60">{body}</p>
    </motion.div>
  );
}

export function DecayScroll() {
  const reduce = useReducedMotion();

  // Loop timeline: 0 → 1 over ~20s, hold the recovered ending briefly, repeat.
  const progress = useMotionValue(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(progress, [0, 1, 1], {
      duration: 22,
      times: [0, 0.92, 1],
      ease: "linear",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [reduce, progress]);

  // The arc of the story: warm → drained → Dialed steps in → recovered.
  const score = useTransform(progress, [0.06, 0.72, 0.8, 0.94], [92, 8, 8, 97], { clamp: true });
  const day = useTransform(score, (v) => Math.round(33 - (v / 100) * 33));
  const scoreText = useTransform(score, (v) => `${Math.round(v)}`);
  const color = useTransform(score, [8, 38, 62, 95], ["#ef4444", "#f59e0b", "#22c55e", "#22c55e"]);
  const band = useTransform(score, (v): string =>
    v > 75 ? "STRONG" : v > 50 ? "GOOD" : v > 25 ? "COOLING" : "CRITICAL"
  );

  // Indicator dot rides the last lit tick via a rotated wrapper.
  const dotRotate = useTransform(score, (v) => START_DEG + (v / 100) * SWEEP_DEG + 180);

  // Streak badge states on the contact card.
  const flameOp = useTransform(progress, [0, 0.3, 0.38], [1, 1, 0]);
  const hourglassOp = useTransform(progress, [0.38, 0.42, 0.62, 0.68], [0, 1, 1, 0]);
  const brokenOp = useTransform(progress, [0.68, 0.72, 0.8, 0.84], [0, 1, 1, 0]);
  const rebornOp = useTransform(progress, [0.86, 0.92, 0.98, 1], [0, 1, 1, 0]);
  const dayOp = useTransform(progress, [0.74, 0.82], [1, 0]);

  if (reduce) {
    // Static mid-story frame for reduced motion — the message without the ride.
    return (
      <section className="bg-ink py-24">
        <div className="mx-auto max-w-[1200px] px-5 text-center md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Day 26 · no contact</p>
          <h3 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold text-white md:text-5xl">
            Every relationship is quietly decaying. Dialed catches it before it breaks.
          </h3>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Watch a relationship decay and recover" className="relative overflow-hidden bg-ink py-24 md:py-32">
      {/* faint radial glow behind the dial */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
        style={{ background: "radial-gradient(closest-side, #2563eb55, transparent)" }}
      />
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-5 md:grid-cols-2 md:gap-6 md:px-8">
        {/* ── Left: the live dial + contact card ── */}
        <div className="flex flex-col items-center gap-7">
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
              <circle cx={CX} cy={CX} r={SIZE / 2 - 4} fill="#0B1A2C" />
              {Array.from({ length: TICKS }, (_, i) => (
                <Tick key={i} i={i} score={score} color={color} />
              ))}
            </svg>
            {/* indicator dot on a rotating arm */}
            <motion.div aria-hidden className="absolute inset-0" style={{ rotate: dotRotate }}>
              <motion.div
                className="absolute left-1/2 top-[9px] h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: color }}
              />
            </motion.div>
            {/* score readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span className="font-display text-7xl font-bold text-white">{scoreText}</motion.span>
              <motion.span className="mt-1 text-[11px] font-bold tracking-[0.22em]" style={{ color }}>
                {band}
              </motion.span>
            </div>
          </div>

          {/* contact card with the streak living and dying */}
          <div className="flex w-[300px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[13px] font-bold text-accent">
              SC
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-bold text-white">
                Sarah Chen
                <span className="relative inline-block h-5 w-12">
                  <motion.span style={{ opacity: flameOp }} className="absolute inset-0 text-[13px]">🔥 8</motion.span>
                  <motion.span style={{ opacity: hourglassOp }} className="absolute inset-0 text-[13px]">⏳ 8</motion.span>
                  <motion.span style={{ opacity: rebornOp }} className="absolute inset-0 text-[13px]">🔥 1</motion.span>
                </span>
              </span>
              <motion.span style={{ opacity: dayOp }} className="flex items-baseline gap-1 text-[12.5px] text-white/50">
                Day <motion.span className="font-bold text-white/80">{day}</motion.span> since contact
              </motion.span>
            </span>
            <motion.span
              style={{ opacity: brokenOp }}
              className="shrink-0 rounded-full bg-cold/15 px-2.5 py-1 text-[11px] font-bold text-cold"
            >
              Streak lost
            </motion.span>
          </div>
        </div>

        {/* ── Right: the story phases ── */}
        <div className="relative h-[16rem] md:h-[20rem]">
          <Phase
            progress={progress}
            window={[0.02, 0.08, 0.2, 0.28]}
            kicker="Day 2 · after the coffee chat"
            title="This is Sarah. It went great."
            body="A recruiter who actually liked you. Health 92, streak alive. Watch what happens next — it happens to everyone."
          />
          <Phase
            progress={progress}
            window={[0.3, 0.38, 0.5, 0.58]}
            kicker="Day 14 · life got busy"
            title="You meant to follow up."
            body="Midterms, work, everything. She hasn't heard from you — and the score is bleeding out a little more every single day."
          />
          <Phase
            progress={progress}
            window={[0.58, 0.66, 0.72, 0.78]}
            kicker="Day 26 · the window is closing"
            title="Now it's awkward to reach out."
            body="The streak breaks. The warmth is gone. This is where opportunities quietly die — and you never even see it happen."
          />
          <Phase
            progress={progress}
            window={[0.8, 0.88, 0.96, 1]}
            kicker="With Dialed"
            title="It never gets that far."
            body="Dialed nudges you at the right moment and drafts the message in your voice. Thirty seconds, streak alive, back to 97."
            accent
          />
        </div>
      </div>
    </section>
  );
}
