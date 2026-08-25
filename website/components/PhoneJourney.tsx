"use client";

import { useEffect } from "react";
import {
  motion, useMotionValue, useTransform, animate, useReducedMotion, type MotionValue,
} from "motion/react";
import { Sparkle, BellSimple, TrendUp } from "@phosphor-icons/react";
import { NetworkScreen } from "./AppScreens";

// ── Auto-playing phone journey ─────────────────────────────────────────────
// Three story beats crossfade next to the phone on a ~18s loop; the screen
// changes to match. No scroll pinning — the tour plays itself and repeats.

const CADENCES = [
  { label: "Recruiters", days: "every 7d", color: "#ef4444" },
  { label: "Professors", days: "every 10d", color: "#f59e0b" },
  { label: "Mentors", days: "every 14d", color: "#3b6fe8" },
  { label: "Friends", days: "every 21d", color: "#22c55e" },
];

function ReplyScene() {
  return (
    <div className="flex h-full flex-col bg-bg p-4">
      <p className="text-center text-[13px] font-bold text-ink">Reply with Dialed</p>
      <div className="mt-4 rounded-xl border border-hairline bg-surface p-3 shadow-card">
        <p className="text-[10px] text-faint">Sarah Chen · Re: Coffee chat follow-up</p>
        <p className="mt-1 text-[12px] leading-snug text-ink">
          Great meeting you! Send me your resume when you get a chance?
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-accent/25 bg-accent-tint/60 p-3">
        <p className="flex items-center gap-1 text-[10px] font-medium text-accent">
          <Sparkle size={10} weight="fill" /> AI draft · in your voice
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink">
          Hi Sarah! Great meeting you too — resume attached. Excited about what
          you said on the new-grad program, would love to hear more.
        </p>
      </div>
      <div className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-accent py-2.5 text-[12.5px] font-medium text-white">
        <Sparkle size={12} weight="fill" /> Generate reply
      </div>
    </div>
  );
}

function StreakScene() {
  const rows = [
    { i: "SC", name: "Sarah Chen", streak: "🔥 9", sub: "Reconnected today", c: "#16a34a" },
    { i: "MJ", name: "Marcus Johnson", streak: "🔥 3", sub: "Last contact 2d ago", c: "#16a34a" },
    { i: "PP", name: "Priya Patel", streak: "⏳ 5", sub: "Due soon — day 8 of 10", c: "#f59e0b" },
    { i: "LP", name: "Linda Park", streak: "🔥 12", sub: "On track", c: "#16a34a" },
  ];
  return (
    <div className="flex h-full flex-col bg-bg p-4">
      <p className="text-center text-[13px] font-bold text-ink">Your streaks</p>
      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 py-2.5 shadow-card">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
              {r.i}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                {r.name} <span className="text-[11px] font-medium">{r.streak}</span>
              </span>
              <span className="block text-[10.5px]" style={{ color: r.c }}>{r.sub}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-good/10 px-3 py-2.5">
        <TrendUp size={14} weight="bold" className="text-good" />
        <span className="text-[12px] font-bold text-good">Network health +17 this week</span>
      </div>
    </div>
  );
}

function Scene({ progress, window: w, children }: {
  progress: MotionValue<number>;
  window: [number, number, number, number];
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, w, [0, 1, 1, 0]);
  const scale = useTransform(progress, w, [0.96, 1, 1, 0.96]);
  return (
    <motion.div style={{ opacity, scale }} className="absolute inset-0">
      {children}
    </motion.div>
  );
}

function Step({ progress, window: w, n, title, body, children }: {
  progress: MotionValue<number>;
  window: [number, number, number, number];
  n: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const opacity = useTransform(progress, w, [0, 1, 1, 0]);
  const y = useTransform(progress, w, [28, 0, 0, -28]);
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center">
      <span className="font-display text-5xl font-bold text-hairline">{n}</span>
      <h3 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">{title}</h3>
      <p className="mt-4 max-w-[42ch] text-lg leading-relaxed text-muted">{body}</p>
      {children}
    </motion.div>
  );
}

export function PhoneJourney() {
  const reduce = useReducedMotion();

  // Loop timeline: 0 → 1 over ~18s, repeat forever.
  const progress = useMotionValue(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(progress, [0, 1], {
      duration: 18,
      ease: "linear",
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [reduce, progress]);

  const chipOpacity = useTransform(progress, [0, 0.05, 0.28, 0.34], [0, 1, 1, 0]);

  const steps: Array<{
    window: [number, number, number, number];
    n: string; title: string; body: string; extra?: React.ReactNode;
  }> = [
    {
      window: [0, 0.06, 0.26, 0.36],
      n: "01",
      title: "It tells you who's going cold.",
      body: "Every person gets a cadence. Miss it and Dialed nudges you — louder as it matters more, quiet when everything is warm.",
      extra: (
        <div className="mt-6 flex flex-wrap gap-2">
          {CADENCES.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12.5px] shadow-card">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="font-medium text-ink">{c.label}</span>
              <span className="text-muted">{c.days}</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      window: [0.36, 0.42, 0.6, 0.68],
      n: "02",
      title: "Then it writes the reply for you.",
      body: "Paste the email or open the thread. Dialed drafts the message in your voice — review, tweak, send in one tap.",
    },
    {
      window: [0.68, 0.76, 0.94, 1],
      n: "03",
      title: "And keeps your streaks alive.",
      body: "Every relationship builds a streak like Snapchat — 🔥 while you're consistent, ⏳ when the window is closing. Don't let the flame die.",
    },
  ];

  if (reduce) {
    // No animation under reduced motion: stack the three beats statically.
    return (
      <section className="mx-auto flex max-w-[1200px] flex-col gap-16 px-5 py-24 md:px-8">
        {steps.map((s) => (
          <div key={s.n}>
            <span className="font-display text-4xl font-bold text-hairline">{s.n}</span>
            <h3 className="mt-3 font-display text-3xl font-bold text-ink">{s.title}</h3>
            <p className="mt-3 max-w-[46ch] text-lg text-muted">{s.body}</p>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section aria-label="Product tour" className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-8 px-5 md:grid-cols-2 md:px-8">
        {/* copy beats */}
        <div className="relative order-2 h-[19rem] md:order-1 md:h-[24rem]">
          {steps.map((s) => (
            <Step key={s.n} progress={progress} window={s.window} n={s.n} title={s.title} body={s.body}>
              {s.extra}
            </Step>
          ))}
        </div>

        {/* the phone */}
        <div className="relative order-1 justify-self-center md:order-2 md:justify-self-end">
          <div className="relative w-[280px] rounded-[42px] border-[10px] border-ink bg-ink shadow-phone">
            <div className="absolute left-1/2 top-2.5 z-20 h-[20px] w-[80px] -translate-x-1/2 rounded-full bg-ink" />
            <div className="relative h-[540px] overflow-hidden rounded-[32px] bg-bg">
              <Scene progress={progress} window={[0, 0.06, 0.26, 0.36]}>
                <div className="flex h-full items-center justify-center bg-bg [&>*]:scale-[0.93]">
                  <NetworkScreen />
                </div>
              </Scene>
              <Scene progress={progress} window={[0.36, 0.42, 0.6, 0.68]}>
                <ReplyScene />
              </Scene>
              <Scene progress={progress} window={[0.68, 0.76, 0.94, 1]}>
                <StreakScene />
              </Scene>
            </div>
          </div>
          {/* floating notification chip, riding above the phone */}
          <motion.div
            style={{ opacity: chipOpacity }}
            className="absolute -left-24 top-16 hidden items-center gap-2 rounded-2xl border border-hairline bg-surface/95 px-3.5 py-2.5 shadow-card lg:flex"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
              <BellSimple size={15} weight="fill" className="text-white" />
            </span>
            <span className="text-[13px] leading-tight">
              <span className="block font-medium text-ink">Sarah is going cold</span>
              <span className="text-muted">day 8 of 10 · reach out</span>
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
