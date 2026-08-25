"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

// Counts from `from` to `to` when scrolled into view. Instant under reduced motion.
export function CountUp({
  to,
  from = 0,
  duration = 900,
  className,
  suffix = "",
}: {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(from);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setVal(to); return; }
    const steps = 24;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) ** 0.6; // ease-out
      timers.push(setTimeout(() => setVal(Math.round(from + (to - from) * t)), (duration / steps) * i));
    }
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {val}
      {suffix}
    </span>
  );
}
