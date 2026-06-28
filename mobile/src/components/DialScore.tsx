import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

// Same thermostat/stove-knob tick style as the Home dial, but it fills to a fixed
// 0–100 score (animates up once on mount, then holds) with the number in the center.
const TICKS = 32
const START = 135
const SWEEP = 270

export function DialScore({ score, color, label, size = 150 }: {
  score: number
  color: string
  label?: string
  size?: number
}) {
  const c = useColors()
  const CX = size / 2, CY = size / 2
  const OUT_R = size / 2 - 6
  const IN_R = OUT_R - size * 0.12
  const DOT_R = OUT_R + 2
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const target = Math.round((TICKS * clamped) / 100)
  const progress = useRef(new Animated.Value(0)).current
  const [lit, setLit] = useState(0)
  const [display, setDisplay] = useState(0)

  // Fill up to the score on a single eased timeline: ticks and the number rise
  // together and decelerate into place, rather than ticking up at a flat rate.
  useEffect(() => {
    progress.setValue(0)
    setLit(0); setDisplay(0)
    if (target <= 0) return
    const id = progress.addListener(({ value }) => {
      setLit(Math.round(target * value))
      setDisplay(Math.round(clamped * value))
    })
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.16, 1, 0.3, 1), // strong ease-out — settles into the score
      useNativeDriver: false,                 // read each frame via the listener
    })
    anim.start()
    return () => { progress.removeListener(id); anim.stop() }
  }, [progress, target, clamped])

  const polar = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
  }
  const litEndDeg = START + (Math.max(lit - 1, 0) / (TICKS - 1)) * SWEEP
  const dot = polar(DOT_R, litEndDeg)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
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
              stroke={on ? color : c.border}
              strokeWidth={on ? 3 : 2}
              strokeLinecap="round"
            />
          )
        })}
        {lit > 0 && <Circle cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)} r={3.5} fill={color} />}
      </Svg>
      <Text style={{ fontFamily: FontFamily.display, fontSize: size * 0.3, lineHeight: size * 0.34, color }}>
        {display}
      </Text>
      {!!label && (
        <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 1.2, color, marginTop: 2 }}>
          {label.toUpperCase()}
        </Text>
      )}
    </View>
  )
}
