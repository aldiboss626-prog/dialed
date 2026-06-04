import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Bell } from 'lucide-react'
import { contactsApi, oppsApi, pendingApi, notifApi } from '../lib/api'
import { greeting, initials, statusColor, daysUntil } from '../lib/utils'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Stars } from '../components/ui/Stars'
import { SectionLabel } from '../components/ui/SectionLabel'
import { AddContactModal } from '../components/AddContactModal'
import { NotificationSheet } from '../components/NotificationSheet'
import { useAuth } from '../hooks/useAuth'
import type { Contact, Opportunity, PendingResponse, Notification } from '../types'

// Count-up animation hook
function useCountUp(target: number, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const timeout = setTimeout(() => {
      const start = performance.now()
      const dur = 800
      function frame(now: number) {
        const t = Math.min(1, (now - start) / dur)
        const eased = 1 - Math.pow(1 - t, 3)
        setVal(Math.round(eased * target))
        if (t < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, delay])
  return val
}

function StatCard({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const count = useCountUp(value, delay)
  return (
    <motion.div
      className="flex-1 bg-surface rounded-xl px-3 py-3 border-l-[3px]"
      style={{ borderLeftColor: color, borderTop: '1px solid #2C2A34', borderRight: '1px solid #2C2A34', borderBottom: '1px solid #2C2A34' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
    >
      <div className="font-display font-bold tabular-nums" style={{ fontSize: 28, color, lineHeight: 1 }}>
        {count}
      </div>
      <p className="section-label mt-1" style={{ fontSize: 9 }}>{label}</p>
    </motion.div>
  )
}

// TIER 1: 5-star + overdue
function HeroCard({ contact, onClick, index }: { contact: Contact; onClick: () => void; index: number }) {
  const hasUrgentOpp = contact.linked_opportunity?.deadline &&
    daysUntil(contact.linked_opportunity.deadline) <= 7

  return (
    <motion.div
      className="w-full rounded-xl p-4 cursor-pointer border border-[#2C2A34] border-l-4 shadow-overdue mb-3"
      style={{ borderLeftColor: '#E05252', minHeight: 160 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0"
            style={{ width: 48, height: 48 }}
          >
            <span className="font-sans text-secondary" style={{ fontSize: 16 }}>{initials(contact.name)}</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-primary" style={{ fontSize: 22, lineHeight: 1.1 }}>
              {contact.name}
            </h3>
            <p className="font-sans text-secondary mt-0.5" style={{ fontSize: 13 }}>{contact.role}</p>
          </div>
        </div>
        <StatusBadge status="overdue" animate />
      </div>

      <div className="flex items-end justify-between">
        <Stars count={contact.stars} size={13} />
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-bold tabular-nums" style={{ fontSize: 42, color: '#E05252', lineHeight: 1 }}>
            {contact.days_since_contact}
          </span>
          <span className="font-sans text-tertiary" style={{ fontSize: 12 }}>days ago</span>
        </div>
      </div>

      {hasUrgentOpp && contact.linked_opportunity && (
        <div
          className="mt-3 -mx-4 -mb-4 px-4 py-2 rounded-b-xl flex items-center gap-1.5"
          style={{ background: 'rgba(212,133,42,0.12)', borderTop: '1px solid rgba(212,133,42,0.2)' }}
        >
          <span style={{ fontSize: 11 }}>⚡</span>
          <span className="font-sans text-warning" style={{ fontSize: 11 }}>
            {contact.linked_opportunity.title} deadline in {daysUntil(contact.linked_opportunity.deadline!)} days — escalating
          </span>
        </div>
      )}
    </motion.div>
  )
}

// TIER 2: 4-star or due-soon
function MediumCard({ contact, onClick, index }: { contact: Contact; onClick: () => void; index: number }) {
  const borderColor = contact.status === 'overdue' ? '#E05252' : '#D4852A'
  const dayColor = contact.status === 'overdue' ? '#E05252' : '#D4852A'

  return (
    <motion.div
      className="w-full rounded-xl p-4 cursor-pointer border border-[#2C2A34] border-l-4 mb-3"
      style={{ borderLeftColor: borderColor, minHeight: 120 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.06 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0"
            style={{ width: 44, height: 44 }}
          >
            <span className="font-sans text-secondary" style={{ fontSize: 14 }}>{initials(contact.name)}</span>
          </div>
          <div>
            <h3 className="font-display font-semibold text-primary" style={{ fontSize: 19, lineHeight: 1.1 }}>
              {contact.name}
            </h3>
            <p className="font-sans text-secondary mt-0.5" style={{ fontSize: 12 }}>{contact.role}</p>
          </div>
        </div>
        <StatusBadge status={contact.status} animate={contact.status === 'overdue'} />
      </div>
      <div className="flex items-end justify-between">
        <Stars count={contact.stars} size={11} />
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold tabular-nums" style={{ fontSize: 32, color: dayColor, lineHeight: 1 }}>
            {contact.days_since_contact}
          </span>
          <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>days ago</span>
        </div>
      </div>
    </motion.div>
  )
}

// TIER 3: compact row
function CompactRow({ contact, onClick, index }: { contact: Contact; onClick: () => void; index: number }) {
  const dotColor = statusColor[contact.status]
  return (
    <motion.div
      className="flex items-center gap-3 py-3 cursor-pointer border-b border-border"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.1 + index * 0.04 }}
      whileTap={{ opacity: 0.7 }}
      onClick={onClick}
    >
      <div
        className="flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0"
        style={{ width: 36, height: 36 }}
      >
        <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>{initials(contact.name)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-sans font-medium text-primary" style={{ fontSize: 15 }}>{contact.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="rounded-full" style={{ width: 6, height: 6, background: dotColor }} />
        <span className="font-sans text-tertiary" style={{ fontSize: 12 }}>{contact.days_since_contact}d</span>
      </div>
    </motion.div>
  )
}

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 3600000
}

function pendingTimeColor(h: number): string {
  if (h < 6) return '#8A8490'
  if (h < 24) return '#D4852A'
  return '#E05252'
}

function pendingTimeLabel(h: number): string {
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)} hours ago`
  const d = Math.floor(h / 24)
  return `${d} ${d === 1 ? 'day' : 'days'} ago`
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [pending, setPending] = useState<PendingResponse[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  useEffect(() => {
    Promise.all([contactsApi.list(), oppsApi.list(), pendingApi.list(), notifApi.list()])
      .then(([c, o, p, n]) => { setContacts(c); setOpps(o); setPending(p); setNotifications(n) })
      .finally(() => setLoading(false))
  }, [])

  function handleDismissNotif(id: number) {
    notifApi.delete(id).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  function handleMarkAllRead() {
    notifApi.markAllRead().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const overdueCt = contacts.filter(c => c.status === 'overdue').length
  const dueSoonCt = contacts.filter(c => c.status === 'due-soon').length
  const awaitingCt = pending.length
  const activeOppsCt = opps.filter(o => o.state === 'active' || o.state === 'upcoming').length
  const overdueOppsCt = opps.filter(o => o.state === 'overdue').length

  function getTier(c: Contact): 1 | 2 | 3 {
    if (c.stars === 5 && c.status === 'overdue') return 1
    if (c.stars >= 4 || c.status === 'due-soon') return 2
    return 3
  }

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.h1 layoutId="dialed-wordmark" className="wordmark" style={{ fontSize: 26, letterSpacing: '0.12em' }}>DIALED</motion.h1>
        <div className="flex items-center gap-2">
          {/* Bell / alerts */}
          <motion.button
            onClick={() => setAlertsOpen(true)}
            className="relative flex items-center justify-center"
            style={{ width: 36, height: 36 }}
            whileTap={{ scale: 0.9 }}
          >
            <Bell size={20} color="#8A8490" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-overdue font-sans font-bold text-white"
                style={{ width: 16, height: 16, fontSize: 9 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>
          {/* Add contact */}
          <motion.button
            onClick={() => setAddOpen(true)}
            className="flex items-center justify-center rounded-full bg-gold"
            style={{ width: 36, height: 36 }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus size={18} color="#141318" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      {/* Summary strip — 5 cards, scrollable */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4">
        <StatCard label="OVERDUE" value={overdueCt} color="#E05252" delay={0} />
        <StatCard label="DUE SOON" value={dueSoonCt} color="#D4852A" delay={100} />
        <StatCard label="AWAITING" value={awaitingCt} color="#D4852A" delay={200} />
        <StatCard label="ACTIVE OPPS" value={activeOppsCt} color="#C9A84C" delay={300} />
        <StatCard label="OVERDUE OPPS" value={overdueOppsCt} color="#E05252" delay={400} />
      </div>

      {/* Greeting */}
      <motion.div
        className="mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <p className="font-sans text-secondary" style={{ fontSize: 16 }}>{greeting()}</p>
        <div className="relative inline-block">
          <p className="font-display font-bold text-primary" style={{ fontSize: 32, lineHeight: 1.1 }}>{firstName}.</p>
          <div className="absolute bottom-1 left-0 rounded-full bg-gold" style={{ width: 40, height: 2 }} />
        </div>
      </motion.div>

      {/* Waiting for your reply — only renders if there are pending responses */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <SectionLabel className="mb-3">Waiting for Your Reply</SectionLabel>
            {pending.map((pr, i) => {
              const h = hoursAgo(pr.detected_at)
              const timeColor = pendingTimeColor(h)
              return (
                <motion.div
                  key={pr.id}
                  className="flex items-center gap-3 py-3 cursor-pointer border-b border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ opacity: 0.7 }}
                  onClick={() => navigate(`/contact/${pr.contact_id}`)}
                >
                  {/* Amber pulsing dot */}
                  <motion.div
                    className="rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, background: '#D4852A' }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0"
                    style={{ width: 40, height: 40 }}
                  >
                    <span className="font-sans text-secondary" style={{ fontSize: 13 }}>
                      {initials(pr.contact.name)}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-primary truncate" style={{ fontSize: 17 }}>
                      {pr.contact.name}
                    </p>
                    <p className="font-sans text-secondary truncate" style={{ fontSize: 13 }}>
                      {pr.email_subject}
                    </p>
                    <Stars count={pr.contact.stars} size={10} className="mt-0.5" />
                  </div>
                  {/* Time */}
                  <span className="font-sans flex-shrink-0" style={{ fontSize: 12, color: timeColor }}>
                    {pendingTimeLabel(h)}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Needs attention */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="mb-3"
      >
        <SectionLabel>Needs Attention</SectionLabel>
      </motion.div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-sans text-tertiary text-sm">No contacts yet. Add someone to your orbit.</p>
        </div>
      ) : (
        <div>
          {contacts.map((c, i) => {
            const tier = getTier(c)
            if (tier === 1) return <HeroCard key={c.id} contact={c} onClick={() => navigate(`/contact/${c.id}`)} index={i} />
            if (tier === 2) return <MediumCard key={c.id} contact={c} onClick={() => navigate(`/contact/${c.id}`)} index={i} />
            return <CompactRow key={c.id} contact={c} onClick={() => navigate(`/contact/${c.id}`)} index={i} />
          })}
        </div>
      )}

      <AddContactModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={c => setContacts(prev => [c, ...prev])}
      />

      <NotificationSheet
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        notifications={notifications}
        onDismiss={handleDismissNotif}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  )
}
