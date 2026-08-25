"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";

// Word-by-word scrub reveal: each word brightens as it crosses the reading
// zone. Driven entirely by motion values — no per-frame re-renders.

type Line = { text: string; className?: string };

function Word({
  word,
  progress,
  range,
  className,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  className?: string;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={`inline-block ${className ?? ""}`}>
      {word}&nbsp;
    </motion.span>
  );
}

export function ScrollTextReveal({ lines, className = "" }: { lines: Line[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.45"],
  });

  const words = lines.flatMap((line, li) =>
    line.text.split(" ").map((w) => ({ w, className: line.className, li }))
  );
  const n = words.length;

  return (
    <div ref={ref} className={className}>
      {lines.map((line, li) => (
        <p
          key={li}
          className="font-display text-4xl font-semibold leading-[1.12] tracking-tight md:text-5xl lg:text-6xl"
        >
          {reduce
            ? <span className={line.className}>{line.text}</span>
            : words
                .filter((x) => x.li === li)
                .map((x, wi) => {
                  const idx = words.findIndex((y) => y === x);
                  // each word gets a small window; windows overlap for a smooth wash
                  const start = (idx / n) * 0.85;
                  return (
                    <Word
                      key={wi}
                      word={x.w}
                      progress={scrollYProgress}
                      range={[start, Math.min(start + 0.18, 1)]}
                      className={x.className}
                    />
                  );
                })}
        </p>
      ))}
    </div>
  );
}
