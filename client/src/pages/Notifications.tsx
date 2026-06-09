import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notifApi, oppsApi } from '../lib/api'
import { SectionLabel } from '../components/ui/SectionLabel'
import { Stars } from '../components/ui/Stars'
import { getEscalationIntensity } from '../lib/escalation'
import type { Notification, Opportunity } from '../types'

const TYPE_COLORS: Record<string, string> = {
  urgent: '#E05252',
  deadline: '#D4852A',
  cadence: '#D4852A',
  positive: '#5BA882',
  awaiting_reply: '#D4852A',
}

function awaitingHoursLabel(createdAt: string): string {
  const h = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h waiting`
  return `${Math.floor(h / 24)}d waiting`
}

function awaitingHoursColor(createdAt: string): string {
  const h = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (h < 6) return '#8A8490'
  if (h < 24) return '#D4852A'
  return '#E05252'
}

function PulsingDot({ color }: { color: string }) {
  return (
    <motion.div
      className="rounded-full flex-shrink-0"
      style={{ width: 8, height: 8, backgroundColor: color }}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function IntensityBar({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: 16, height: 4,
            background: i <= level ? color : '#2C2A34',
          }}
        />
      ))}
    </div>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([notifApi.list(), oppsApi.list()])
      .then(([n, o]) => { setNotifs(n); setOpps(o) })
      .finally(() => setLoading(false))
  }, [])

  async function dismiss(id: number) {
    await notifApi.delete(id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  async function markAllRead() {
    await notifApi.markAllRead()
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })))
  }

  const unread = notifs.filter(n => !n.is_read)

  // High-urgency awaiting_reply: 4-5 star contact, notification exists (implies waiting 24h+ for seeded data)
  const urgentAwaiting = unread.filter(n =>
    n.type === 'awaiting_reply' && n.contact && n.contact.stars >= 4
  )
  const nonAwaitingUnread = unread.filter(n => n.type !== 'awaiting_reply' || !urgentAwaiting.includes(n))
  const hero = nonAwaitingUnread[0] || null
  const secondary = nonAwaitingUnread.slice(1)

  // Upcoming escalations: active/upcoming opps with contact linked
  const escalations = opps
    .filter(o => (o.state === 'upcoming' || o.state === 'active') && o.contact && o.days_left !== null && o.days_left <= 14)
    .sort((a, b) => (a.days_left ?? 99) - (b.days_left ?? 99))
    .slice(0, 3)

  return (
    <div className="px-4 pt-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        <SectionLabel className="mb-1">Alerts & Actions</SectionLabel>
      </motion.div>
      <div className="flex items-center justify-between mb-5">
        <motion.h1
          className="font-display font-bold text-primary"
          style={{ fontSize: 30 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          Notifications
        </motion.h1>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="font-sans text-tertiary text-xs">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-sans text-tertiary text-sm">You're all caught up.</p>
        </div>
      ) : (
        <>
          {/* Hero notification */}
          <AnimatePresence>
            {hero && (
              <motion.div
                className="rounded-[18px] p-4 mb-4"
                style={{
                  minHeight: 120,
                  background: '#1E1C24',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PulsingDot color={TYPE_COLORS[hero.type] || '#D4852A'} />
                    <span className="font-display font-bold text-primary" style={{ fontSize: 20 }}>
                      {hero.contact?.name || 'Alert'}
                    </span>
                  </div>
                  <button onClick={() => dismiss(hero.id)} className="p-1 text-tertiary">
                    <X size={16} />
                  </button>
                </div>
                <p className="font-sans text-secondary mb-3" style={{ fontSize: 14, lineHeight: 1.5 }}>{hero.body}</p>
                <div className="flex items-center gap-2">
                  {hero.contact && <Stars count={hero.contact.stars} size={11} />}
                  <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>
                    {hero.type === 'urgent' ? '· Daily alerts active' : hero.type === 'deadline' ? '· Deadline approaching' : ''}
                    {' · '}{timeSince(hero.created_at)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* High-urgency awaiting_reply — between hero and secondary */}
          <AnimatePresence>
            {urgentAwaiting.map((n, i) => (
              <motion.div
                key={n.id}
                className="rounded-[18px] p-4 mb-3"
                style={{ background: '#1E1C24', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CornerDownLeft size={16} color="#D4852A" />
                    <span className="font-display font-semibold text-primary" style={{ fontSize: 17 }}>
                      {n.contact?.name || 'Contact'} is waiting for your reply
                    </span>
                  </div>
                  <button onClick={() => dismiss(n.id)} className="p-1 text-tertiary flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
                <p className="font-sans text-secondary mb-2" style={{ fontSize: 13 }}>{n.body}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {n.contact && <Stars count={n.contact.stars} size={10} />}
                    <span className="font-sans" style={{ fontSize: 11, color: awaitingHoursColor(n.created_at) }}>
                      {awaitingHoursLabel(n.created_at)}
                    </span>
                  </div>
                  {n.contact_id && (
                    <button
                      onClick={() => navigate(`/contact/${n.contact_id}`)}
                      className="font-sans font-medium px-3 py-1 rounded-lg text-background"
                      style={{ fontSize: 11, background: '#D4852A' }}
                    >
                      Draft reply
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Secondary notifications */}
          <AnimatePresence>
            {secondary.map((n, i) => (
              <motion.div
                key={n.id}
                className="flex items-start gap-3 py-3 border-b border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: TYPE_COLORS[n.type] || '#D4852A' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-primary" style={{ fontSize: 15 }}>{n.title}</p>
                  <p className="font-sans text-secondary truncate" style={{ fontSize: 13 }}>{n.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {n.contact && <Stars count={n.contact.stars} size={10} />}
                    <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>{timeSince(n.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => dismiss(n.id)} className="p-1 text-tertiary flex-shrink-0">
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Read notifications (dimmed) */}
          {notifs.filter(n => n.is_read).map(n => (
            <div key={n.id} className="flex items-start gap-3 py-3 border-b border-border opacity-40">
              <div className="w-1.5 h-1.5 rounded-full bg-border flex-shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-secondary" style={{ fontSize: 14 }}>{n.title}</p>
              </div>
              <button onClick={() => dismiss(n.id)} className="p-1 text-tertiary flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </>
      )}

      {/* Upcoming escalations */}
      {escalations.length > 0 && (
        <div className="mt-6">
          <SectionLabel className="mb-3">Upcoming Escalations</SectionLabel>
          {escalations.map((opp, i) => {
            const { level, label } = getEscalationIntensity(opp.contact?.stars ?? 3, opp.days_left ?? 99)
            const color = opp.days_left !== null && opp.days_left <= 3 ? '#E05252' : '#D4852A'
            return (
              <motion.div
                key={opp.id}
                className="flex items-center gap-3 py-3 border-b border-border"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-primary" style={{ fontSize: 15 }}>{opp.contact?.name}</p>
                  <p className="font-sans text-secondary" style={{ fontSize: 12 }}>
                    {opp.title} · {opp.days_left}d left
                  </p>
                  {opp.contact && <Stars count={opp.contact.stars} size={10} className="mt-0.5" />}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>{label}</span>
                  <IntensityBar level={level} color={color} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
