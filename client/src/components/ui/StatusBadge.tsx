import { statusLabel } from '../../lib/utils'

interface StatusBadgeProps {
  status: 'overdue' | 'due-soon' | 'good'
  className?: string
  animate?: boolean
}

const colors = {
  overdue: { bg: 'rgba(224,82,82,0.15)', text: '#E05252', border: 'rgba(224,82,82,0.3)' },
  'due-soon': { bg: 'rgba(212,133,42,0.15)', text: '#D4852A', border: 'rgba(212,133,42,0.3)' },
  good: { bg: 'rgba(91,168,130,0.15)', text: '#5BA882', border: 'rgba(91,168,130,0.3)' },
}

export function StatusBadge({ status, className = '', animate }: StatusBadgeProps) {
  const c = colors[status]
  return (
    <span
      className={`section-label px-2 py-0.5 rounded-full border ${animate && status === 'overdue' ? 'animate-overdue-appear' : ''} ${className}`}
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {statusLabel[status]}
    </span>
  )
}
