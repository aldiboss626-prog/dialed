import { useEffect, useState } from 'react'
import Svg, { Path } from 'react-native-svg'

export interface DonutSlice {
  count: number
  color: string
}

interface Props {
  cats: DonutSlice[]
  size: number
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

function buildSlicePath(
  cx: number, cy: number, R: number, r: number,
  startAngle: number, sweepAngle: number,
): string {
  if (sweepAngle <= 0.001) return 'M0,0'
  const end = startAngle + sweepAngle
  const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle)
  const x2 = cx + R * Math.cos(end),        y2 = cy + R * Math.sin(end)
  const ix1 = cx + r * Math.cos(end),       iy1 = cy + r * Math.sin(end)
  const ix2 = cx + r * Math.cos(startAngle),iy2 = cy + r * Math.sin(startAngle)
  const lg = sweepAngle > Math.PI ? 1 : 0
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${r},${r} 0 ${lg},0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z`
}

export function DonutChart({ cats, size }: Props) {
  const [prog, setProg] = useState(0)

  useEffect(() => {
    setProg(0)
    const start = Date.now()
    const duration = 800
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration)
      setProg(easeOutCubic(p))
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [cats])

  const total = cats.reduce((s, c) => s + c.count, 0) || 1
  const cx = size / 2, cy = size / 2
  const R = size * 0.42, r = size * 0.27

  // Pre-compute full sweep angles
  let a = -Math.PI / 2
  const slices = cats.map(cat => {
    const fullSweep = (cat.count / total) * Math.PI * 2
    const startAngle = a
    a += fullSweep
    return { startAngle, fullSweep, color: cat.color }
  })

  // Sequential proportional fill: each slice animates in proportion to its arc size
  // Global progress maps across all slices — slice i starts at cumulativeFraction
  let cumulative = 0
  const animatedSlices = slices.map(sl => {
    const fraction = sl.fullSweep / (Math.PI * 2)
    const sliceStart = cumulative
    const sliceEnd = cumulative + fraction
    cumulative += fraction
    const localP = Math.max(0, Math.min(1, (prog - sliceStart) / Math.max(fraction, 0.001)))
    return {
      ...sl,
      animatedSweep: sl.fullSweep * localP,
    }
  })

  return (
    <Svg width={size} height={size}>
      {animatedSlices.map((s, i) => (
        <Path
          key={i}
          d={buildSlicePath(cx, cy, R, r, s.startAngle, s.animatedSweep)}
          fill={s.color}
        />
      ))}
    </Svg>
  )
}
