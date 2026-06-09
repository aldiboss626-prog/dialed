import Svg, { Path } from 'react-native-svg'

export interface DonutSlice {
  count: number
  color: string
}

interface Props {
  cats: DonutSlice[]
  size: number
}

export function DonutChart({ cats, size }: Props) {
  const total = cats.reduce((s, c) => s + c.count, 0) || 1
  const cx = size / 2, cy = size / 2
  const R = size * 0.42, r = size * 0.27
  let a = -Math.PI / 2
  const slices = cats.map(cat => {
    const sweep = (cat.count / total) * Math.PI * 2
    const e = a + sweep
    const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a)
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e)
    const ix1 = cx + r * Math.cos(e), iy1 = cy + r * Math.sin(e)
    const ix2 = cx + r * Math.cos(a), iy2 = cy + r * Math.sin(a)
    const lg = sweep > Math.PI ? 1 : 0
    const d = `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${r},${r} 0 ${lg},0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z`
    const out = { d, color: cat.color }
    a = e
    return out
  })
  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => <Path key={i} d={s.d} fill={s.color} />)}
    </Svg>
  )
}
