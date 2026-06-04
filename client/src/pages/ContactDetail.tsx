import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { ChevronLeft, CheckCircle } from 'lucide-react'
import { contactsApi, pendingApi } from '../lib/api'
import { formatDateShort, formatDate, statusColor } from '../lib/utils'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Stars } from '../components/ui/Stars'
import { SectionLabel } from '../components/ui/SectionLabel'
import { DraftModal } from '../components/DraftModal'
import type { Contact, PendingResponse } from '../types'

// Animated count up/down hook
function useAnimatedNumber(target: number, duration = 600) {
  const [val, setVal] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = target
    if (from === target) return

    const start = performance.now()
    function frame(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [target, duration])

  return val
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [talkLoading, setTalkLoading] = useState(false)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftPendingId, setDraftPendingId] = useState<number | undefined>()
  const [pendingResponse, setPendingResponse] = useState<PendingResponse | null>(null)
  const btnControls = useAnimation()

  useEffect(() => {
    if (!id) return
    contactsApi.get(parseInt(id))
      .then(c => {
        setContact(c)
        setPendingResponse(c.pending_response ?? null)
      })
      .finally(() => setLoading(false))
  }, [id])

  const dayCount = useAnimatedNumber(contact?.days_since_contact ?? 0, 600)

  function openDraft(pendingId?: number) {
    setDraftPendingId(pendingId)
    setDraftOpen(true)
  }

  async function dismissPending() {
    if (!pendingResponse) return
    await pendingApi.dismiss(pendingResponse.id).catch(() => {})
    setPendingResponse(null)
  }

  async function handleTalked() {
    if (!contact || talkLoading) return
    setTalkLoading(true)

    // Flash button gold
    await btnControls.start({ backgroundColor: '#C9A84C', color: '#141318', borderColor: '#C9A84C', transition: { duration: 0.15 } })
    await btnControls.start({ backgroundColor: 'transparent', color: '#C9A84C', borderColor: '#C9A84C', transition: { duration: 0.25 } })

    try {
      const updated = await contactsApi.talked(contact.id)
      setContact({ ...updated, email_threads: contact.email_threads, interactions: contact.interactions, opportunities: contact.opportunities })
      setPendingResponse(null) // server auto-resolves; clear it here too
      setShowCheckmark(true)
      setTimeout(() => setShowCheckmark(false), 1800)
    } catch (err) {
      console.error(err)
    } finally {
      setTalkLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <p className="font-sans text-secondary">Contact not found.</p>
        <button onClick={() => navigate(-1)} className="font-sans text-gold text-sm">Go back</button>
      </div>
    )
  }

  const dayColor = statusColor[contact.status]
  const urgentOpp = contact.opportunities?.find(o => o.state === 'upcoming' || o.state === 'overdue')
  const daysUntilDeadline = urgentOpp?.deadline
    ? Math.ceil((new Date(urgentOpp.deadline).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
    : null
  const isHighAlert = contact.stars === 5 && contact.status === 'overdue' && daysUntilDeadline !== null && daysUntilDeadline <= 3

  return (
    <motion.div
      className="px-4 pt-4 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-secondary mb-5">
        <ChevronLeft size={20} />
        <span className="font-sans text-sm">Back</span>
      </button>

      {/* Header - LEFT ALIGNED */}
      <div className="flex items-start gap-4 mb-4">
        <motion.div
          className="flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0"
          style={{ width: 68, height: 68 }}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <span className="font-sans text-secondary" style={{ fontSize: 22 }}>
            {contact.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
          </span>
        </motion.div>

        <motion.div
          className="flex-1 min-w-0"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <h1 className="font-display font-bold text-primary leading-tight" style={{ fontSize: 26 }}>
            {contact.name}
          </h1>
          <p className="font-sans text-secondary mt-0.5" style={{ fontSize: 14 }}>{contact.role}</p>
          <Stars count={contact.stars} size={14} className="mt-1.5" />
          <div className="mt-2">
            <StatusBadge status={contact.status} animate={contact.status === 'overdue'} />
          </div>
        </motion.div>
      </div>

      {/* Pending response banner */}
      <AnimatePresence>
        {pendingResponse && (
          <motion.div
            className="rounded-xl p-3 mb-4 border-l-4"
            style={{
              background: 'rgba(212,133,42,0.08)',
              borderLeftColor: '#D4852A',
              border: '1px solid rgba(212,133,42,0.2)',
              borderLeftWidth: 4,
            }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start gap-2">
              <motion.div
                className="rounded-full flex-shrink-0 mt-1"
                style={{ width: 7, height: 7, background: '#D4852A' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-sans font-medium text-primary" style={{ fontSize: 14 }}>
                  {contact.name} replied to your email
                </p>
                <p className="font-sans text-secondary truncate" style={{ fontSize: 13 }}>
                  "{pendingResponse.email_subject}"
                </p>
                <p className="font-sans text-tertiary mt-0.5" style={{ fontSize: 12 }}>
                  {(() => {
                    const h = (Date.now() - new Date(pendingResponse.detected_at).getTime()) / 3600000
                    return h < 24 ? `${Math.round(h)} hours ago` : `${Math.floor(h / 24)} days ago`
                  })()}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                <button
                  onClick={() => openDraft(pendingResponse.id)}
                  className="font-sans font-medium px-3 py-1.5 rounded-lg text-background"
                  style={{ fontSize: 12, background: '#D4852A' }}
                >
                  Draft reply
                </button>
                <button
                  onClick={dismissPending}
                  className="font-sans text-tertiary"
                  style={{ fontSize: 12 }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gmail connected indicator */}
      {contact.gmail_connected ? (
        <motion.div
          className="flex items-center gap-1.5 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="font-sans text-success" style={{ fontSize: 12 }}>Gmail connected ✓</span>
        </motion.div>
      ) : null}

      {/* Escalation indicator */}
      <motion.div
        className="mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
      >
        {isHighAlert ? (
          <p className="font-sans text-warning" style={{ fontSize: 12 }}>
            🔴 High alert — {urgentOpp?.title} deadline in {daysUntilDeadline} days
          </p>
        ) : contact.stars === 5 && contact.status === 'overdue' ? (
          <p className="font-sans text-warning" style={{ fontSize: 12 }}>
            ⚡ Escalating — notifying daily
          </p>
        ) : (
          <p className="font-sans text-tertiary" style={{ fontSize: 12 }}>
            Regular cadence — every {contact.cadence_days} days
          </p>
        )}
      </motion.div>

      {/* Asymmetric stats */}
      <motion.div
        className="flex gap-3 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.12 }}
      >
        {/* Left 60%: big day counter */}
        <div className="flex-[3] bg-surface rounded-xl border border-border px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.span
              key={contact.days_since_contact}
              className="font-display font-bold tabular-nums block"
              style={{ fontSize: 54, lineHeight: 1, color: dayColor }}
            >
              {dayCount}
            </motion.span>
          </AnimatePresence>
          <p className="font-sans text-tertiary mt-1" style={{ fontSize: 11 }}>days since contact</p>
        </div>

        {/* Right 40%: two tiles */}
        <div className="flex-[2] flex flex-col gap-2">
          <div className="bg-surface rounded-xl border border-border px-3 py-3 flex-1">
            <p className="font-display font-semibold text-primary" style={{ fontSize: 16 }}>Every {contact.cadence_days}d</p>
            <p className="font-sans text-tertiary" style={{ fontSize: 11 }}>cadence</p>
          </div>
          <div className="bg-surface rounded-xl border border-border px-3 py-3 flex-1 flex items-center gap-1">
            <Stars count={contact.stars} size={12} />
          </div>
        </div>
      </motion.div>

      {/* Recent emails */}
      {contact.email_threads && contact.email_threads.length > 0 && (
        <div className="mb-6">
          <SectionLabel className="mb-3">Recent Emails</SectionLabel>
          {contact.email_threads.map((email, i) => (
            <div
              key={email.id}
              className={i === 0 ? 'bg-surface border border-border rounded-xl p-4 mb-2' : 'flex items-center gap-3 py-2 border-b border-border'}
            >
              {i === 0 ? (
                <>
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-sans font-medium text-primary" style={{ fontSize: 14 }}>
                      {email.is_from_user ? 'You' : email.sender.split(' ')[0]}
                    </span>
                    <span className="font-sans text-tertiary" style={{ fontSize: 12 }}>{formatDateShort(email.date)}</span>
                  </div>
                  <p className="font-display text-primary mb-1" style={{ fontSize: 15 }}>{email.subject}</p>
                  <p className="font-sans text-secondary truncate" style={{ fontSize: 13 }}>{email.preview}</p>
                </>
              ) : (
                <>
                  <span className="font-sans text-secondary flex-1 truncate" style={{ fontSize: 13 }}>
                    <span className="text-tertiary">{email.is_from_user ? 'You' : email.sender.split(' ')[0]}</span>
                    {' · '}{email.subject}
                  </span>
                  <span className="font-sans text-tertiary flex-shrink-0" style={{ fontSize: 11 }}>{formatDateShort(email.date)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {contact.interactions && contact.interactions.length > 0 && (
        <div className="mb-8">
          <SectionLabel className="mb-3">History</SectionLabel>
          <div className="relative pl-4">
            <div className="absolute left-0 top-1 bottom-1 w-px bg-border" />
            {contact.interactions.map((interaction, i) => (
              <div key={interaction.id} className="relative mb-4 last:mb-0">
                <div
                  className="absolute -left-4 top-1.5 w-2 h-2 rounded-full border border-border"
                  style={{ background: i === 0 ? '#C9A84C' : '#2C2A34', transform: 'translateX(-3px)' }}
                />
                <p className="font-sans text-primary" style={{ fontSize: 14 }}>{interaction.note}</p>
                <p className="font-sans text-secondary mt-0.5" style={{ fontSize: 12 }}>
                  {formatDate(interaction.date)} · {interaction.type}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex flex-col gap-3">
        {/* Checkmark that rises above button */}
        <AnimatePresence>
          {showCheckmark && (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -8 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle size={28} color="#5BA882" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className="btn-ghost-gold"
          animate={btnControls}
          onClick={handleTalked}
          disabled={talkLoading}
        >
          {talkLoading ? 'Logging…' : 'We talked'}
        </motion.button>

        <button
          className="btn-gold"
          onClick={() => openDraft()}
        >
          {pendingResponse ? 'Draft reply' : 'Draft follow-up'}
        </button>
      </div>

      {/* Draft modal */}
      <DraftModal
        contact={contact}
        isOpen={draftOpen}
        onClose={() => { setDraftOpen(false); setDraftPendingId(undefined) }}
        pendingResponseId={draftPendingId}
      />
    </motion.div>
  )
}
