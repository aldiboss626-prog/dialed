import { View, Text } from 'react-native'
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

// ── Math ──────────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// ── Config ────────────────────────────────────────────────────────────────────
// Dial arc: 135 → 405 (270° sweep), gap sits at the bottom — same as the
// network health gauge. "Dialed in" fill = 80 % (almost fully turned up).

const SZ        = 34
const CX        = 17, CY = 17
const R_OUT     = 15        // outer tip of tick marks
const R_IN      = 11        // inner base of tick marks
const R_DOT     = R_OUT + 1 // indicator dot sits just outside the ticks
const N_TICKS   = 26        // resolution of the dial
const START_DEG = 135
const SWEEP_DEG = 270
const FILL_PCT  = 0.80
const N_LIT     = Math.round(N_TICKS * FILL_PCT) // 21 ticks lit

// ── Component ─────────────────────────────────────────────────────────────────

export function DialWordmark({ textSize = 26 }: { textSize?: number }) {
  const c = useColors()

  // Last lit tick position → indicator dot
  const litEndDeg = START_DEG + ((N_LIT - 1) / (N_TICKS - 1)) * SWEEP_DEG
  const dot = polar(CX, CY, R_DOT, litEndDeg)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`}>
        {/* Radial tick marks — lit ones in brand color, unlit ones dim */}
        {Array.from({ length: N_TICKS }, (_, i) => {
          const deg = START_DEG + (i / (N_TICKS - 1)) * SWEEP_DEG
          const inner = polar(CX, CY, R_IN, deg)
          const outer = polar(CX, CY, R_OUT, deg)
          const lit = i < N_LIT

          return (
            <Line
              key={i}
              x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
              x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
              stroke={lit ? c.gold : c.border}
              strokeWidth={lit ? 2.4 : 1.6}
              strokeLinecap="round"
            />
          )
        })}

        {/* Indicator dot at the last lit tick */}
        <SvgCircle
          cx={dot.x.toFixed(2)}
          cy={dot.y.toFixed(2)}
          r={2.2}
          fill={c.gold}
        />
      </Svg>

      <Text
        style={{
          fontFamily: FontFamily.display,
          fontSize: textSize,
          letterSpacing: 0.5,
          lineHeight: textSize * 1.22,
        }}
      >
        <Text style={{ color: c.primary }}>DI</Text>
        <Text style={{ color: c.gold }}>AL</Text>
        <Text style={{ color: c.primary }}>ED</Text>
      </Text>
    </View>
  )
}
