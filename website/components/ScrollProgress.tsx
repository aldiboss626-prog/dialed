"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";

// Thin accent line under the nav showing page progress. Pure motion values —
// zero React re-renders while scrolling.
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-16 z-40 h-[2px] origin-left bg-accent"
      style={{ scaleX }}
    />
  );
}
