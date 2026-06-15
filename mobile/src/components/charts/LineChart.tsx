import { useEffect, useState } from 'react'
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle } from 'react-native-svg'

interface Props {
  data: number[]
  width: number
  height: number
  color: string
  gradId: string
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

export function LineChart({ data, width, height, color, gradId }: Props) {
  const [prog, setProg] = useState(0)

  useEffect(() => {
    setProg(0)
    const start = Date.now()
    const duration = 700
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration)
      setProg(easeOutCubic(p))
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [data, color])

  if (data.length < 2 || width <= 0) return null

  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const range = max - min || 1
  const pad = 6
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }))

  // Path length for draw animation
  let pathLength = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    pathLength += Math.sqrt(dx * dx + dy * dy)
  }

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`
  const last = pts[pts.length - 1]

  const dashOffset = pathLength * (1 - prog)
  const dotOpacity = prog >= 0.92 ? (prog - 0.92) / 0.08 : 0

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={area} fill={`url(#${gradId})`} opacity={prog} />
      <Path
        d={line}
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
      />
      <Circle cx={last.x} cy={last.y} r={4.5} fill={color} opacity={dotOpacity} />
    </Svg>
  )
}
