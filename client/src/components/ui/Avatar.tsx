import { initials } from '../../lib/utils'

interface AvatarProps {
  name: string
  size?: number
  className?: string
}

export function Avatar({ name, size = 44, className = '' }: AvatarProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    >
      <span className="font-sans font-500 text-secondary" style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </span>
    </div>
  )
}
