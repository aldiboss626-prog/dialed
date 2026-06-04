import { motion, AnimatePresence } from 'framer-motion'
import { X, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notifApi } from '../lib/api'
import { Stars } from './ui/Stars'
import type { Notification } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  onDismiss: (id: number) => void
  onMarkAllRead: () => void
}

const TYPE_COLORS: Record<string, string> = {
  urgent: '#E05252',
  deadline: '#D4852A',
  cadence: '#D4852A',
  positive: '#5BA882',
  awaiting_reply: '#D4852A',
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

export function NotificationSheet({ isOpen, onClose, notifications, onDismiss, onMarkAllRead }: Props) {
  const navigate = useNavigate()
  const unread = notifications.filter(n => !n.is_read)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{ background: '#1E1C24', maxHeight: '70vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <h2 className="font-sans font-medium text-primary" style={{ fontSize: 16 }}>Alerts</h2>
              {unread.length > 0 && (
                <button onClick={onMarkAllRead} className="font-sans text-tertiary text-xs">
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: 'calc(70vh - 80px)' }}>
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-sans text-tertiary text-sm">You're all caught up.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <motion.div
                    key={n.id}
                    className="flex items-start gap-3 py-3 border-b border-border"
                    style={{ opacity: n.is_read ? 0.45 : 1 }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                  >
                    {n.type === 'awaiting_reply' ? (
                      <CornerDownLeft size={14} color="#D4852A" className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: TYPE_COLORS[n.type] || '#D4852A' }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-medium text-primary leading-snug" style={{ fontSize: 14 }}>
                        {n.title}
                      </p>
                      <p className="font-sans text-secondary mt-0.5 leading-snug" style={{ fontSize: 12 }}>{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.contact && <Stars count={n.contact.stars} size={9} />}
                        <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>{timeSince(n.created_at)}</span>
                        {n.type === 'awaiting_reply' && n.contact_id && (
                          <button
                            onClick={() => { navigate(`/contact/${n.contact_id}`); onClose() }}
                            className="font-sans px-2 py-0.5 rounded-md text-background"
                            style={{ fontSize: 10, background: '#D4852A' }}
                          >
                            Draft reply
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => onDismiss(n.id)} className="p-1 text-tertiary flex-shrink-0 mt-0.5">
                      <X size={13} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
