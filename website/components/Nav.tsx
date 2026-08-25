"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-hairline bg-bg/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Dialed home">
          <Wordmark withMark />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/account"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Account
          </Link>
          <a
            href="#download"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-press active:scale-[0.98]"
          >
            Get the app
          </a>
        </div>

        <button
          className="flex h-11 w-11 items-center justify-center text-ink md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-hairline bg-bg px-5 pb-6 pt-2 md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-base font-medium text-ink"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block py-3 text-base font-medium text-ink"
          >
            Account
          </Link>
          <a
            href="#download"
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-full bg-accent px-5 py-3 text-center text-base font-medium text-white"
          >
            Get the app
          </a>
        </div>
      )}
    </header>
  );
}
