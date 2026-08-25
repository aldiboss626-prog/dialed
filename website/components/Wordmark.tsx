import { DialMark } from "./DialMark";

// The DIALED wordmark: all caps, ink with the blue "AL" (matching the in-app
// header). Pass `withMark` to prepend the dial logo (the full lockup).
export function Wordmark({
  className = "text-xl",
  withMark = false,
  markSize = 26,
}: {
  className?: string;
  withMark?: boolean;
  markSize?: number;
}) {
  const text = (
    <span className={`font-sans font-bold tracking-[0.14em] text-ink ${className}`}>
      DI<span className="text-accent">AL</span>ED
    </span>
  );
  if (!withMark) return text;
  return (
    <span className="inline-flex items-center gap-2">
      <DialMark size={markSize} />
      {text}
    </span>
  );
}
