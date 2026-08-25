import Link from "next/link";
import { Wordmark } from "./Wordmark";
import type { ReactNode } from "react";

export function LegalShell({ title, updated, children }: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-16 max-w-[760px] items-center justify-between px-5">
          <Link href="/" aria-label="Dialed home"><Wordmark withMark /></Link>
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-faint">Last updated: {updated}</p>
        <div className="legal mt-10 flex flex-col gap-8 text-[15px] leading-relaxed text-muted [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1.5 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[760px] items-center gap-5 px-5 py-6 text-xs text-faint">
          <span>© {new Date().getFullYear()} Dialed</span>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <Link href="/support" className="underline">Support</Link>
        </div>
      </footer>
    </>
  );
}
