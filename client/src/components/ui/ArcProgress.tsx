interface Props {
  size: number
  progress: number  // 0 to 1+ (capped at 1 internally)
  color: string
  strokeWidth?: number
}

export function ArcProgress({ size, progress, color, strokeWidth = 3 }: Props) {
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  // 270° sweep = 75% of full circumference
  const arcLen = circ * 0.75
  const filled = Math.min(1, Math.max(0, progress)) * arcLen

  return (
    <svg
      width={size}
      height={size}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-225deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
        />
        {/* Filled */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
      </g>
    </svg>
  )
}
