interface StarsProps {
  count: number
  size?: number
  className?: string
}

export function Stars({ count, size = 12, className = '' }: StarsProps) {
  return (
    <span className={`flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          style={{ fontSize: size, color: i <= count ? '#C9A84C' : '#2C2A34' }}
        >
          ★
        </span>
      ))}
    </span>
  )
}
