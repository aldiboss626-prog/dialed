// The Dialed dial mark: a radial tick gauge turned ~80% "up" (dialed in), with the
// opening at the right and an indicator dot at the last lit tick. This is a faithful
// SVG port of the in-app DialWordmark (mobile/src/components/DialWordmark.tsx):
// same 26 ticks, 135deg start, 270deg sweep, 80% fill.

const N_TICKS = 26;
const START_DEG = 135;
const SWEEP_DEG = 270;
const FILL_PCT = 0.8;
const N_LIT = Math.round(N_TICKS * FILL_PCT); // 21 lit

const CX = 17;
const CY = 17;
const R_IN = 11;
const R_OUT = 15;
const R_DOT = 16;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export function DialMark({ size = 34, className }: { size?: number; className?: string }) {
  const litEndDeg = START_DEG + ((N_LIT - 1) / (N_TICKS - 1)) * SWEEP_DEG;
  const dot = polar(R_DOT, litEndDeg);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      className={className}
      role="img"
      aria-label="Dialed"
    >
      {Array.from({ length: N_TICKS }, (_, i) => {
        const deg = START_DEG + (i / (N_TICKS - 1)) * SWEEP_DEG;
        const a = polar(R_IN, deg);
        const b = polar(R_OUT, deg);
        const lit = i < N_LIT;
        return (
          <line
            key={i}
            x1={a.x.toFixed(2)}
            y1={a.y.toFixed(2)}
            x2={b.x.toFixed(2)}
            y2={b.y.toFixed(2)}
            stroke={lit ? "var(--color-accent, #2563eb)" : "var(--color-hairline, #e6e8ee)"}
            strokeWidth={lit ? 2.4 : 1.6}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r={2.2} fill="var(--color-accent, #2563eb)" />
    </svg>
  );
}
