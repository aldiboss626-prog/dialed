import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SectionLabel } from '../components/ui/SectionLabel'
import { Stars } from '../components/ui/Stars'
import { Avatar } from '../components/ui/Avatar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface TrackerData {
  orbitScore: number
  scoreBreakdown: { overdue: number; dueSoon: number; awaiting: number; recentInteractions: number }
  streakCount: number
  lastActivityDate: string | null
  topRelationships: { id: number; name: string; role: string | null; stars: number; interactions30: number; emails30: number; score: number }[]
  activityHeatmap: { date: string; count: number }[]
  activeDays: number
  totalTouchpoints: number
  mostNeglected: { id: number; name: string; role: string | null; stars: number; days_since_contact: number; cadence_days: number; overdue_days: number }[]
  responseRate: { responded: number; total: number; percent: number | null }
}

function useCountUp(target: number, delay = 0, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const timeout = setTimeout(() => {
      const start = performance.now()
      function frame(now: number) {
        const t = Math.min(1, (now - start) / duration)
        setVal(Math.round((1 - Math.pow(1 - t, 3)) * target))
        if (t < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, delay, duration])
  return val
}

function scoreColor(s: number) {
  if (s >= 80) return '#5BA882'
  if (s >= 60) return '#D4852A'
  return '#E05252'
}
function scoreLabel(s: number) {
  if (s >= 90) return { label: 'Excellent', color: '#5BA882' }
  if (s >= 75) return { label: 'Strong', color: '#5BA882' }
  if (s >= 60) return { label: 'Needs attention', color: '#D4852A' }
  return { label: 'Critical', color: '#E05252' }
}

// ── Orbit Health Score card ────────────────────────────────────────────────

function OrbitHealthCard({ data }: { data: TrackerData }) {
  const score = useCountUp(data.orbitScore, 100)
  const { label, color } = scoreLabel(data.orbitScore)
  const sc = scoreColor(data.orbitScore)

  return (
    <motion.div
      className="rounded-xl p-5 mb-5 border border-border border-l-4"
      style={{ background: '#1E1C24', borderLeftColor: '#C9A84C' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-1">Orbit Health</p>
          <span
            className="font-display font-bold tabular-nums"
            style={{ fontSize: 64, color: sc, lineHeight: 1 }}
          >
            {score}
          </span>
        </div>
        <div className="text-right">
          <p className="font-sans font-medium" style={{ fontSize: 18, color }}>{label}</p>
          <p className="font-sans text-tertiary mt-2" style={{ fontSize: 12 }}>
            {data.scoreBreakdown.overdue} overdue · {data.scoreBreakdown.dueSoon} due soon · {data.scoreBreakdown.awaiting} awaiting
          </p>
          <p className="font-sans text-tertiary mt-0.5" style={{ fontSize: 11 }}>
            +{data.scoreBreakdown.recentInteractions} touchpoints this week
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Consistency Streak ─────────────────────────────────────────────────────

function StreakCard({ data }: { data: TrackerData }) {
  const streak = useCountUp(data.streakCount, 200)

  return (
    <motion.div
      className="rounded-xl p-5 mb-5 border border-border text-center"
      style={{ background: '#1E1C24' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <SectionLabel className="mb-3">Current Streak</SectionLabel>
      <span
        className="font-display font-bold tabular-nums block"
        style={{ fontSize: 48, color: data.streakCount > 0 ? '#C9A84C' : '#5A5760', lineHeight: 1 }}
      >
        {streak}
      </span>
      <p className="font-sans text-tertiary mt-1" style={{ fontSize: 14 }}>
        {data.streakCount === 1 ? 'week streak' : 'week streak'}
      </p>
      <p className="font-sans text-secondary mt-3" style={{ fontSize: 13 }}>
        {data.streakCount > 0
          ? "You've been consistent. Keep it up."
          : 'Start a streak by reaching out today.'}
      </p>
    </motion.div>
  )
}

// ── Top 3 Relationships ────────────────────────────────────────────────────

function TopRelCard({ rel, rank, index }: { rel: TrackerData['topRelationships'][0]; rank: 1 | 2 | 3; index: number }) {
  const navigate = useNavigate()
  const configs = {
    1: { avatarSize: 52, nameSize: 20, nameWeight: 700, borderColor: '#C9A84C', rankSize: 32, rankColor: '#C9A84C', badge: true },
    2: { avatarSize: 44, nameSize: 18, nameWeight: 600, borderColor: '#8A8490', rankSize: 24, rankColor: '#8A8490', badge: false },
    3: { avatarSize: 38, nameSize: 16, nameWeight: 600, borderColor: 'rgba(212,133,42,0.6)', rankSize: 20, rankColor: '#5A5760', badge: false },
  }
  const c = configs[rank]

  return (
    <motion.div
      className="rounded-xl p-4 mb-3 border border-border border-l-4 cursor-pointer"
      style={{ background: '#1E1C24', borderLeftColor: c.borderColor }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.07 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/contact/${rel.id}`)}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-display font-bold tabular-nums flex-shrink-0"
          style={{ fontSize: c.rankSize, color: c.rankColor, minWidth: 36, lineHeight: 1 }}
        >
          {String(rank).padStart(2, '0')}
        </span>
        <Avatar name={rel.name} size={c.avatarSize} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-primary" style={{ fontSize: c.nameSize, fontWeight: c.nameWeight }}>
              {rel.name}
            </span>
            {c.badge && (
              <span className="font-sans text-gold border border-gold px-1.5 py-0.5 rounded-full" style={{ fontSize: 10 }}>
                Top Contact
              </span>
            )}
          </div>
          {rel.role && (
            <p className="font-sans text-secondary truncate" style={{ fontSize: 12 }}>{rel.role}</p>
          )}
          <Stars count={rel.stars} size={10} className="mt-0.5" />
          <p className="font-sans text-tertiary mt-1" style={{ fontSize: 11 }}>
            {rel.interactions30} touchpoints · {rel.emails30} emails
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Activity Heatmap ───────────────────────────────────────────────────────

function HeatmapCell({ count }: { count: number }) {
  const opacity = count === 0 ? 1 : count === 1 ? 0.4 : count === 2 ? 0.7 : 1
  const bg = count === 0 ? '#2C2A34' : `rgba(91,168,130,${opacity})`
  return (
    <div
      className="rounded"
      style={{ background: bg, aspectRatio: '1', minWidth: 0 }}
      title={count > 0 ? `${count} interaction${count > 1 ? 's' : ''}` : 'No activity'}
    />
  )
}

function ActivityHeatmap({ data }: { data: TrackerData }) {
  // 30 cells in 5 rows × 6 columns
  const cells = [...data.activityHeatmap]
  while (cells.length < 30) cells.unshift({ date: '', count: 0 })

  return (
    <motion.div
      className="mb-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <SectionLabel className="mb-3">Your Activity</SectionLabel>
      <div
        className="rounded-xl border border-border p-4"
        style={{ background: '#1E1C24' }}
      >
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}
        >
          {cells.map((cell, i) => (
            <HeatmapCell key={i} count={cell.count} />
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <p className="font-sans text-secondary" style={{ fontSize: 13 }}>
            {data.activeDays} active days this month
          </p>
          <p className="font-sans text-secondary" style={{ fontSize: 13 }}>
            {data.totalTouchpoints} total touchpoints
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Most Neglected ─────────────────────────────────────────────────────────

function MostNeglected({ data }: { data: TrackerData }) {
  const navigate = useNavigate()
  if (data.mostNeglected.length === 0) return null

  return (
    <div className="mb-5">
      <SectionLabel className="mb-3">Needs Your Attention</SectionLabel>
      {data.mostNeglected.map((c, i) => (
        <motion.div
          key={c.id}
          className="flex items-center gap-3 py-3 border-b border-border border-l-[3px] pl-3 cursor-pointer"
          style={{ borderLeftColor: '#E05252' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 + i * 0.06 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/contact/${c.id}`)}
        >
          <Avatar name={c.name} size={38} />
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-primary" style={{ fontSize: 16 }}>{c.name}</p>
            <p className="font-sans text-overdue" style={{ fontSize: 13 }}>
              {c.overdue_days} {c.overdue_days === 1 ? 'day' : 'days'} overdue
            </p>
          </div>
          <Stars count={c.stars} size={11} />
        </motion.div>
      ))}
    </div>
  )
}

// ── Response Rate ──────────────────────────────────────────────────────────

function ResponseRate({ data }: { data: TrackerData }) {
  const { responded, total, percent } = data.responseRate
  if (total === 0 || percent === null) return null

  const pct = useCountUp(percent, 400, 700)
  const pctColor = percent >= 80 ? '#5BA882' : percent >= 50 ? '#D4852A' : '#E05252'
  const filled = Math.round((responded / total) * 10)

  return (
    <motion.div
      className="mb-5 rounded-xl border border-border p-4"
      style={{ background: '#1E1C24' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <SectionLabel className="mb-3">Response Rate</SectionLabel>
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label mb-1">Replied within 24h</p>
          <span className="font-display font-bold tabular-nums" style={{ fontSize: 36, color: pctColor }}>
            {pct}%
          </span>
          <p className="font-sans text-tertiary mt-1" style={{ fontSize: 12 }}>
            {responded} of {total} emails answered
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ width: 8, height: 8, background: i < filled ? pctColor : '#2C2A34' }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Tracker page ──────────────────────────────────────────────────────

export default function Tracker() {
  const [data, setData] = useState<TrackerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/tracker`, { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="font-sans text-tertiary text-sm">Could not load tracker.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 pb-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        <SectionLabel className="mb-1">Your Consistency</SectionLabel>
      </motion.div>
      <motion.h1
        className="font-display font-bold text-primary mb-5"
        style={{ fontSize: 32 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
      >
        Tracker
      </motion.h1>

      <OrbitHealthCard data={data} />
      <StreakCard data={data} />

      <SectionLabel className="mb-3">Top Relationships This Month</SectionLabel>
      {data.topRelationships.length === 0 ? (
        <p className="font-sans text-tertiary text-sm mb-5">Add more contacts to see rankings.</p>
      ) : (
        data.topRelationships.map((rel, i) => (
          <TopRelCard key={rel.id} rel={rel} rank={(i + 1) as 1 | 2 | 3} index={i} />
        ))
      )}
      {data.topRelationships.length < 3 && (
        <p className="font-sans text-tertiary text-sm mb-4">Add more contacts to see rankings.</p>
      )}

      <ActivityHeatmap data={data} />
      <MostNeglected data={data} />
      <ResponseRate data={data} />
    </div>
  )
}
