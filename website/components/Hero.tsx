"use client";

import { motion, useReducedMotion } from "motion/react";
import { BellSimple, TrendUp } from "@phosphor-icons/react";
import { PhoneDemo } from "./PhoneDemo";
import { StoreBadges } from "./StoreBadges";
import { Magnetic } from "./Magnetic";
import { DialMark } from "./DialMark";

const WORDS = ["Never", "let", "a", "connection"];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-5 pb-16 pt-24 md:grid-cols-2 md:gap-6 md:px-8 md:pb-24 md:pt-28">
      <div>
        {/* Prominent brand lockup (dial mark + wordmark) to anchor the hero */}
        <motion.div
          className="mb-8 flex items-center gap-4"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <DialMark size={52} />
          <span className="font-sans text-3xl font-bold tracking-[0.3em] text-ink md:text-4xl">
            DI<span className="text-accent">AL</span>ED
          </span>
        </motion.div>
        <h1 className="font-display text-[3.4rem] font-bold leading-[1.02] tracking-tight text-ink md:text-7xl">
          {WORDS.map((w, i) => (
            <motion.span
              key={w}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              {w}&nbsp;
            </motion.span>
          ))}
          <motion.em
            className="inline-block pb-1 not-italic"
            initial={reduce ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: WORDS.length * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <em className="font-display italic leading-[1.1] text-accent">go cold.</em>
          </motion.em>
        </h1>
        <motion.p
          className="mt-6 max-w-[40ch] text-lg leading-relaxed text-muted md:text-xl"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          Dialed reminds you who to reach out to and drafts the message in your
          voice.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
        >
          <Magnetic className="mt-9 inline-block">
            <StoreBadges />
          </Magnetic>
        </motion.div>
      </div>

      {/* Phone + floating product chips for depth */}
      <motion.div
        className="relative md:justify-self-end"
        initial={reduce ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <PhoneDemo />
        {/* real product moments, floating around the frame (hidden on small screens) */}
        <div className="animate-floaty absolute -left-16 top-16 hidden items-center gap-2 rounded-2xl border border-hairline bg-surface/95 px-3.5 py-2.5 shadow-card lg:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <BellSimple size={15} weight="fill" className="text-white" />
          </span>
          <span className="text-[13px] leading-tight">
            <span className="block font-medium text-ink">Bob is going cold</span>
            <span className="text-muted">12 days, no reply</span>
          </span>
        </div>
        <div className="animate-floaty-slow absolute -right-10 bottom-24 hidden items-center gap-2 rounded-2xl border border-hairline bg-surface/95 px-3.5 py-2.5 shadow-card lg:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-good/15">
            <TrendUp size={15} weight="bold" className="text-good" />
          </span>
          <span className="text-[13px] leading-tight">
            <span className="block font-medium text-ink">Health +17</span>
            <span className="text-muted">this week</span>
          </span>
        </div>
      </motion.div>
    </section>
  );
}
