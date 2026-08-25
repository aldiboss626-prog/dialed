"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { PhoneDemo } from "./PhoneDemo";

// ── Cinematic demo player ──────────────────────────────────────────────────
// Renders /demo.mp4 from public/ the moment one exists (drop in a screen
// recording — no code change needed). Until then, the live animated product
// demo plays inside the same "video player" chrome, so the section already
// reads as a video. The whole player scales up slightly as it enters view.

export function DemoVideo() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hasVideo, setHasVideo] = useState(false);

  // Show the live demo by default; swap in /demo.mp4 only once we've verified
  // it actually exists. (Relying on <video onError> misses errors that fire
  // before hydration, which left a blank player.)
  useEffect(() => {
    let cancelled = false;
    fetch("/demo.mp4", { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") ?? "";
        if (!cancelled && r.ok && type.startsWith("video/")) setHasVideo(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "start 0.35"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], reduce ? [1, 1] : [0.4, 1]);

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-32" aria-label="Product demo video">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
          Watch a week with Dialed.
        </h2>
        <p className="mt-4 text-lg text-muted">
          Nudge → draft → send → streak. The whole loop, in under a minute.
        </p>
      </div>

      <motion.div ref={ref} style={{ scale, opacity }} className="mt-12">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-phone">
          {/* player chrome */}
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cold/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-good/80" />
            <span className="ml-3 text-xs font-medium tracking-wide text-white/50">
              DIALED · live demo
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-white/50">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cold" />
              REC
            </span>
          </div>

          {hasVideo ? (
            <video
              className="aspect-video w-full object-cover"
              src="/demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              onError={() => setHasVideo(false)}
            />
          ) : (
            <div className="relative flex justify-center overflow-hidden py-12 md:py-16">
              {/* stage glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
                style={{ background: "radial-gradient(closest-side, #2563eb66, transparent)" }}
              />
              <PhoneDemo />
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-faint">
          Live product demo — what you see is the real app flow.
        </p>
      </motion.div>
    </section>
  );
}
