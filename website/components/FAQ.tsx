"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "Is my email private?",
    a: "Yes. Dialed reads only what it needs to spot replies you owe, and email text is sent to our AI provider (Anthropic) only when you ask for a draft. It is processed per request, never sold, and never used to train models on a retained basis. Full details are in our Privacy Policy.",
  },
  {
    q: "What happens to a business card I scan?",
    a: "The photo is sent to Anthropic once to read the name, title, company, email, and phone, then used to pre-fill the new contact for your review. Dialed does not store the card image after extraction. Only the fields you confirm are saved.",
  },
  {
    q: "Do I need Gmail?",
    a: "No. Dialed works fully with manually added contacts and reminders. Connecting Gmail unlocks the inbox features: spotting conversations waiting on you and drafting replies in place.",
  },
  {
    q: "How does the AI write in my voice?",
    a: "Dialed looks at the thread you are replying to and the context you have saved about that person, then drafts a reply that matches your tone. You always review and edit before anything is sent.",
  },
  {
    q: "Is there a free version?",
    a: "Dialed is a paid app with a 7-day free trial. You get the full product from day one, and you will not be charged until the trial ends. Cancel anytime in the App Store.",
  },
  {
    q: "What platforms is Dialed on?",
    a: "Dialed launches on iOS first, with Android to follow shortly after.",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto max-w-2xl divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-card">
      {ITEMS.map((item, i) => {
        const open = openIdx === i;
        return (
          <div key={item.q}>
            <button
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
            >
              <span className="text-base font-medium text-ink">{item.q}</span>
              <CaretDown
                size={18}
                className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
