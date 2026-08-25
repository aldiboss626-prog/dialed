import Link from "next/link";
import { Sparkle, BellRinging, ChartLineUp, Check } from "@phosphor-icons/react/dist/ssr";
import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";
import { Wordmark } from "@/components/Wordmark";
import { StoreBadges } from "@/components/StoreBadges";
import { Hero } from "@/components/Hero";
import { ColdTicker } from "@/components/ColdTicker";
import { CountUp } from "@/components/CountUp";
import { Magnetic } from "@/components/Magnetic";
import { HealthDial, ColdDecayStack } from "@/components/AppScreens";
import { FAQ } from "@/components/FAQ";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollTextReveal } from "@/components/ScrollTextReveal";
import { DecayScroll } from "@/components/DecayScroll";
import { PhoneJourney } from "@/components/PhoneJourney";
import { DemoVideo } from "@/components/DemoVideo";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dialed",
  operatingSystem: "iOS",
  applicationCategory: "LifestyleApplication",
  description:
    "Dialed reminds you who to reach out to and drafts the message in your voice.",
  offers: { "@type": "Offer", price: "9.99", priceCurrency: "USD" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <ScrollProgress />

      <main>
        {/* ── Hero: bold word-stagger + live demo + floating chips ────── */}
        <Hero />

        {/* ── The one marquee: connections going cold right now ──────── */}
        <ColdTicker />

        {/* ── The problem: bold dark statement + the decay, visualized ── */}
        <section className="overflow-hidden bg-ink py-24 md:py-36">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-5 md:grid-cols-[1.2fr_1fr] md:gap-10 md:px-8">
            {/* words brighten one by one as you scroll through the statement */}
            <ScrollTextReveal
              className="flex flex-col gap-6"
              lines={[
                { text: "Your best connections go cold without you noticing.", className: "text-white" },
                { text: "The recruiter moves on. The mentor stops advocating.", className: "text-white" },
                { text: "Dialed notices first.", className: "text-accent" },
              ]}
            />
            <Reveal delay={0.25} className="justify-self-center md:justify-self-end">
              <ColdDecayStack />
            </Reveal>
          </div>
        </section>

        {/* ── Pinned scroll story: watch a relationship decay + recover ── */}
        <DecayScroll />

        {/* ── How it works: 3-step row with connecting line ──────────── */}
        <section id="features" className="bg-surface py-24 md:py-32">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <Reveal>
              <h2 className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
                How it works
              </h2>
            </Reveal>
            <div className="relative mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                { icon: BellRinging, n: "01", title: "Spot who needs you", body: "Dialed watches your cadence with each person and flags who is drifting before it matters." },
                { icon: Sparkle, n: "02", title: "Draft a reply in one tap", body: "Paste the email or open the thread. Dialed writes the message in your voice, ready to send." },
                { icon: ChartLineUp, n: "03", title: "Stay top of mind", body: "Watch your network health recover as replies go out and relationships warm back up." },
              ].map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08}>
                  <div className="group h-full rounded-2xl border border-hairline bg-bg p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-white transition-transform duration-300 group-hover:scale-110">
                        <s.icon size={22} weight="bold" />
                      </span>
                      <span className="font-display text-3xl font-bold text-hairline transition-colors duration-300 group-hover:text-accent-tint">
                        {s.n}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-ink">{s.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sticky phone journey: nudge → AI reply → streaks ───────── */}
        <PhoneJourney />

        {/* ── Feature: relationship health (bento, breaks the zigzag) ── */}
        <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-32">
          <Reveal>
            <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
              See your whole network at a glance.
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            <Reveal className="md:col-span-1">
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-hairline bg-surface p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-phone">
                <HealthDial score={84} />
                <p className="mt-3 text-center text-sm text-muted">
                  One score for the whole network
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-1">
              <div className="flex h-full flex-col justify-between rounded-2xl bg-accent-tint p-8 transition-all duration-300 hover:-translate-y-1">
                <CountUp to={3} className="font-display text-6xl font-bold text-accent" />
                <div>
                  <p className="mt-4 text-lg font-bold text-ink">need attention</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Dialed sorts your people by urgency, so five minutes a day is
                    enough to stay warm.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.16} className="md:col-span-1">
              <div className="flex h-full flex-col justify-between rounded-2xl bg-ink p-8">
                <BellRinging size={28} className="text-accent-tint" weight="fill" />
                <div>
                  <p className="mt-4 text-lg font-bold text-white">
                    Reminders that escalate
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    A gentle nudge first. A louder one when a deadline or a cold
                    streak is on the line.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── The "video": cinematic demo player (drop /demo.mp4 in public/ to swap in real footage) ── */}
        <DemoVideo />

        {/* ── Testimonials (asymmetric 2 + 1) ────────────────────────── */}
        {/* TODO at launch: replace with real quotes from TestFlight users. */}
        <section className="bg-surface py-24 md:py-32">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Reveal className="md:col-span-2">
                <figure className="flex h-full flex-col justify-between rounded-2xl border border-hairline bg-bg p-8 shadow-card">
                  <blockquote className="font-display text-2xl font-semibold leading-snug text-ink md:text-3xl">
                    &ldquo;A recruiter I met in October emailed me in January. Dialed
                    is the only reason I had already replied to her twice since.&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 text-sm text-muted">
                    <span className="font-medium text-ink">Priya N.</span>, Junior,
                    CS @ UC Berkeley
                  </figcaption>
                </figure>
              </Reveal>
              <div className="flex flex-col gap-5">
                <Reveal delay={0.08}>
                  <figure className="rounded-2xl border border-hairline bg-bg p-6 shadow-card">
                    <blockquote className="text-[15px] leading-relaxed text-ink">
                      &ldquo;The AI drafts actually sound like me. I edit maybe one
                      line.&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 text-sm text-muted">
                      <span className="font-medium text-ink">Marcus D.</span>, Recent
                      grad, Atlanta
                    </figcaption>
                  </figure>
                </Reveal>
                <Reveal delay={0.16}>
                  <figure className="rounded-2xl border border-hairline bg-bg p-6 shadow-card">
                    <blockquote className="text-[15px] leading-relaxed text-ink">
                      &ldquo;It caught two emails I owed replies to in the first ten
                      minutes.&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 text-sm text-muted">
                      <span className="font-medium text-ink">Elena V.</span>, MBA
                      candidate, NYU Stern
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing: one product, 7-day trial, two billing options ─── */}
        <section id="pricing" className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-32">
          <Reveal>
            <h2 className="text-center font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Try everything free for 7 days.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-center text-lg text-muted">
              One plan, the full product. No payment due until the trial ends.
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal>
              <div className="relative h-full rounded-2xl border-2 border-accent bg-surface p-8 shadow-phone transition-transform duration-300 md:scale-[1.03] md:hover:scale-[1.05]">
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
                  Best value
                </span>
                <p className="text-lg font-bold text-ink">Annual</p>
                <p className="mt-2">
                  <span className="text-4xl font-bold text-ink">$6.67</span>
                  <span className="text-muted"> /month</span>
                </p>
                <p className="mt-1 text-sm text-muted">$79.99 billed yearly. Save 33%.</p>
                <ul className="mt-6 flex flex-col gap-2.5 text-[15px] text-ink">
                  {["7-day free trial", "Smart follow-up nudges", "AI replies in your voice", "Gmail inbox detection", "Network health and analytics"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check size={16} weight="bold" className="shrink-0 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <Magnetic className="mt-8">
                  <a
                    href="#download"
                    className="block rounded-full bg-accent py-3.5 text-center text-[15px] font-medium text-white transition-colors hover:bg-accent-press active:scale-[0.98]"
                  >
                    Get the app
                  </a>
                </Magnetic>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-2xl border border-hairline bg-surface p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
                <p className="text-lg font-bold text-ink">Monthly</p>
                <p className="mt-2">
                  <span className="text-4xl font-bold text-ink">$9.99</span>
                  <span className="text-muted"> /month</span>
                </p>
                <p className="mt-1 text-sm text-muted">Billed monthly. Cancel anytime.</p>
                <ul className="mt-6 flex flex-col gap-2.5 text-[15px] text-ink">
                  {["7-day free trial", "Everything in Annual", "Flexible month to month"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check size={16} weight="bold" className="shrink-0 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#download"
                  className="mt-8 block rounded-full border border-hairline bg-bg py-3.5 text-center text-[15px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  Get the app
                </a>
              </div>
            </Reveal>
          </div>
          <p className="mt-6 text-center text-sm text-faint">
            Purchases happen in the app through the App Store or Google Play.
          </p>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section id="faq" className="bg-surface py-24 md:py-32">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <Reveal>
              <h2 className="text-center font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
                Questions, answered.
              </h2>
            </Reveal>
            <div className="mt-12">
              <FAQ />
            </div>
          </div>
        </section>

        {/* ── Final CTA: bold full-bleed dark close ──────────────────── */}
        <section id="download" className="bg-ink">
          <div className="mx-auto max-w-[1200px] px-5 py-28 text-center md:px-8 md:py-40">
            <Reveal>
              <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl">
                Keep your network{" "}
                <span className="italic text-accent">warm.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg text-white/50">
                Start your free week. The people who matter will remember you did.
              </p>
              <Magnetic className="mt-10 inline-block">
                <StoreBadges />
              </Magnetic>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between md:px-8">
          <div>
            <Wordmark withMark />
            <p className="mt-2 max-w-[32ch] text-sm text-muted">
              The app that keeps your professional relationships warm.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm" aria-label="Footer">
            <a href="#features" className="text-muted hover:text-ink">Features</a>
            <Link href="/privacy" className="text-muted hover:text-ink">Privacy Policy</Link>
            <a href="#pricing" className="text-muted hover:text-ink">Pricing</a>
            <Link href="/terms" className="text-muted hover:text-ink">Terms of Service</Link>
            <a href="#faq" className="text-muted hover:text-ink">FAQ</a>
            <Link href="/support" className="text-muted hover:text-ink">Support</Link>
            <Link href="/account" className="text-muted hover:text-ink">Account</Link>
          </nav>
        </div>
        <div className="border-t border-hairline">
          <p className="mx-auto max-w-[1200px] px-5 py-5 text-xs text-faint md:px-8">
            © {new Date().getFullYear()} Dialed. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
