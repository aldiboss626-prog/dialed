import Svg, { Circle, G } from 'react-native-svg'

interface Props {
  size: number
  progress: number
  color: string
  strokeWidth?: number
  trackColor?: string
}

export function ArcProgress({ size, progress, color, strokeWidth = 3, trackColor }: Props) {
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const arcLen = circ * 0.75
  const filled = Math.min(1, Math.max(0, progress)) * arcLen
  const track = trackColor ?? 'rgba(128,128,128,0.15)'

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
      <G rotation={-225} origin={`${cx}, ${cy}`}>
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
        />
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </G>
    </Svg>
  )
}
