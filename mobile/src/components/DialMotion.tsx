import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import { FontFamily } from '@/constants/theme'

// Thermostat / stove-knob style dial: a 270° arc of tick marks that light up
// segment-by-segment (staggered) as the dial turns.
const SIZE = 78
const CX = SIZE / 2, CY = SIZE / 2
const OUT_R = 35   // outer tip of ticks
const IN_R = 27    // inner base of ticks
const DOT_R = OUT_R + 2
const TICKS = 30
const START = 135  // degrees
const SWEEP = 270
const LO = 3       // never fully empty — a dial always shows a little

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

export type DialMode = 'up' | 'down' | 'full'

/**
 * Home "This week" indicator. The dial turns like a stove/thermostat knob:
 *  - 'down' (red, people overdue): lit ticks drain down, then snap back and drain again
 *  - 'up'   (green, only due-soon): lit ticks climb up, then reset and climb again
 *  - 'full' (fully dialed in / zero): ticks climb to full once and HOLD — no number
 * For up/down it alternates the count number with the dial motion.
 */
export function DialMotion({ count, mode }: { count: number; mode: DialMode }) {
  const color = mode === 'down' ? '#FF6B6B' : '#4ADE80'
  const [lit, setLit] = useState(mode === 'down' ? TICKS : LO)
  const [showNumber, setShowNumber] = useState(mode !== 'full')
  const holdRef = useRef(0)

  // Staggered tick stepper — this is the "dial turning" motion.
  useEffect(() => {
    let val = mode === 'down' ? TICKS : LO
    setLit(val)
    holdRef.current = 0
    const id = setInterval(() => {
      if (holdRef.current > 0) { holdRef.current--; return }
      if (mode === 'full') {
        if (val < TICKS) { val++; setLit(val) } else { /* reached full — stop turning */ }
        return
      }
      if (mode === 'up') {
        val++
        if (val >= TICKS) { setLit(TICKS); holdRef.current = 16; val = LO } else setLit(val)
      } else { // down
        val--
        if (val <= LO) { setLit(LO); holdRef.current = 16; val = TICKS } else setLit(val)
      }
    }, 55)
    return () => clearInterval(id)
  }, [mode])

  // Swap the number with the dial motion (never in 'full' mode — no number/zero).
  useEffect(() => {
    if (mode === 'full') { setShowNumber(false); return }
    setShowNumber(true)
    const id = setInterval(() => setShowNumber(v => !v), 2200)
    return () => clearInterval(id)
  }, [mode])

  const litEndDeg = START + (Math.max(lit - 1, 0) / (TICKS - 1)) * SWEEP
  const dot = polar(DOT_R, litEndDeg)

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        {Array.from({ length: TICKS }, (_, i) => {
          const deg = START + (i / (TICKS - 1)) * SWEEP
          const inner = polar(IN_R, deg)
          const outer = polar(OUT_R, deg)
          const on = i < lit
          return (
            <Line
              key={i}
              x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
              x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
              stroke={on ? color : 'rgba(255,255,255,0.13)'}
              strokeWidth={on ? 2.6 : 1.6}
              strokeLinecap="round"
            />
          )
        })}
        {lit > 0 && <Circle cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r={3} fill={color} />}
      </Svg>
      {showNumber && mode !== 'full' && (
        <Text style={{ fontFamily: FontFamily.display, fontSize: 24, color }}>{count}</Text>
      )}
    </View>
  )
}
