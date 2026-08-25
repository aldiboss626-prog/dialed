import { AppleLogo, GooglePlayLogo } from "@phosphor-icons/react/dist/ssr";

// TODO at launch: replace these with the OFFICIAL App Store / Google Play badge
// art (per Apple/Google brand guidelines) + real store URLs. Until then these
// are placeholder buttons in the standard badge layout, pointing at #download.
export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href="#download"
        aria-label="Download on the App Store (coming soon)"
        className="flex h-14 min-w-[168px] items-center gap-3 rounded-xl bg-ink px-5 text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <AppleLogo size={26} weight="fill" />
        <span className="leading-tight">
          <span className="block text-[11px] text-white/70">Download on the</span>
          <span className="block text-[17px] font-medium">App Store</span>
        </span>
      </a>
      <a
        href="#download"
        aria-label="Get it on Google Play (coming soon)"
        className="flex h-14 min-w-[168px] items-center gap-3 rounded-xl bg-ink px-5 text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <GooglePlayLogo size={24} weight="fill" />
        <span className="leading-tight">
          <span className="block text-[11px] text-white/70">Get it on</span>
          <span className="block text-[17px] font-medium">Google Play</span>
        </span>
      </a>
    </div>
  );
}
