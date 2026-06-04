import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { oppsApi, contactsApi } from '../lib/api'
import { SectionLabel } from '../components/ui/SectionLabel'
import { Stars } from '../components/ui/Stars'
import type { Opportunity, Contact } from '../types'

type Filter = 'all' | 'active' | 'upcoming' | 'overdue' | 'completed'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
]

function OppCard({ opp, onStatusChange }: { opp: Opportunity; onStatusChange: (id: number, status: string) => void }) {
  if (opp.state === 'overdue') {
    return (
      <div
        className="rounded-xl p-4 mb-3 border border-[#2C2A34] border-l-4 shadow-overdue-sm"
        style={{ borderLeftColor: '#E05252' }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-sans font-semibold text-primary" style={{ fontSize: 16 }}>{opp.title}</h3>
            {opp.contact && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-sans text-secondary" style={{ fontSize: 13 }}>{opp.contact.name}</span>
                <Stars count={opp.contact.stars} size={10} />
              </div>
            )}
          </div>
          <button
            onClick={() => onStatusChange(opp.id, 'Missed')}
            className="p-1 text-tertiary hover:text-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-bold tabular-nums" style={{ fontSize: 24, color: '#E05252', lineHeight: 1 }}>
            {opp.days_left}
          </span>
          <span className="font-sans text-overdue" style={{ fontSize: 13 }}>days overdue</span>
        </div>
        <p className="font-sans text-tertiary mt-1" style={{ fontSize: 11 }}>Notifications paused — deadline passed</p>
      </div>
    )
  }

  if (opp.state === 'upcoming') {
    return (
      <div
        className="rounded-xl p-4 mb-3 border border-[#2C2A34] border-l-4"
        style={{ borderLeftColor: '#D4852A' }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-sans font-semibold text-primary" style={{ fontSize: 16 }}>{opp.title}</h3>
            {opp.contact && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-sans text-secondary" style={{ fontSize: 13 }}>{opp.contact.name}</span>
                <Stars count={opp.contact.stars} size={10} />
              </div>
            )}
          </div>
          <button
            onClick={() => onStatusChange(opp.id, 'Completed')}
            className="font-sans text-success text-xs px-2 py-1 border border-success rounded-full"
          >
            Done
          </button>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-bold tabular-nums" style={{ fontSize: 24, color: '#D4852A', lineHeight: 1 }}>
            {opp.days_left}
          </span>
          <span className="font-sans text-warning" style={{ fontSize: 13 }}>days left</span>
        </div>
        {opp.contact && opp.contact.stars === 5 && (
          <p className="font-sans text-warning mt-1" style={{ fontSize: 11 }}>
            ⚡ Escalating — {opp.contact.name} notified daily
          </p>
        )}
      </div>
    )
  }

  if (opp.state === 'completed') {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-border opacity-50">
        <div className="flex-1 min-w-0">
          <span className="font-sans text-secondary line-through" style={{ fontSize: 15 }}>{opp.title}</span>
        </div>
        <span
          className="font-sans text-success text-xs px-2 py-0.5 rounded-full border border-success"
          style={{ fontSize: 10 }}
        >
          COMPLETED
        </span>
      </div>
    )
  }

  // Active
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border border-l-2 pl-3" style={{ borderLeftColor: '#5A5760' }}>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-primary" style={{ fontSize: 15 }}>{opp.title}</p>
        {opp.contact && (
          <p className="font-sans text-secondary" style={{ fontSize: 12 }}>{opp.contact.name}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        {opp.days_left !== null && (
          <span className="font-sans text-secondary" style={{ fontSize: 12 }}>{opp.days_left}d left</span>
        )}
        <button
          onClick={() => onStatusChange(opp.id, 'Completed')}
          className="font-sans text-success text-xs"
          style={{ fontSize: 11 }}
        >
          Mark done
        </button>
      </div>
    </div>
  )
}

function AddOppForm({ contacts, onAdd, onCancel }: {
  contacts: Contact[]
  onAdd: (opp: Opportunity) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [contactId, setContactId] = useState('')
  const [status, setStatus] = useState('Active')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title) return
    setLoading(true)
    try {
      const opp = await oppsApi.create({
        title,
        contact_id: contactId ? parseInt(contactId) : undefined,
        status: status as Opportunity['status'],
        deadline: deadline || undefined,
      })
      onAdd(opp)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-4 mb-4"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Opportunity title *"
        required
        className="w-full bg-transparent border-b border-border pb-2 mb-3 font-sans text-primary placeholder-tertiary focus:outline-none focus:border-gold text-sm"
      />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <select
          value={contactId}
          onChange={e => setContactId(e.target.value)}
          className="bg-elevated border border-border rounded-lg px-3 py-2 font-sans text-sm text-primary focus:outline-none"
        >
          <option value="">No contact</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="bg-elevated border border-border rounded-lg px-3 py-2 font-sans text-sm text-primary focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-gold" style={{ flex: 1, padding: '10px 16px', fontSize: 14 }}>
          {loading ? 'Adding…' : 'Add Opportunity'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 font-sans text-secondary text-sm border border-border rounded-xl">
          Cancel
        </button>
      </div>
    </motion.form>
  )
}

export default function Opportunities() {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    Promise.all([oppsApi.list(), contactsApi.list()])
      .then(([o, c]) => { setOpps(o); setContacts(c) })
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id: number, status: string) {
    const updated = await oppsApi.update(id, { status: status as Opportunity['status'] })
    setOpps(prev => prev.map(o => o.id === id ? updated : o))
  }

  const filtered = filter === 'all' ? opps : opps.filter(o => o.state === filter)

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <motion.h1
          className="font-display font-bold text-primary"
          style={{ fontSize: 30 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          Opportunities
        </motion.h1>
        <motion.button
          onClick={() => setAddOpen(v => !v)}
          className="flex items-center justify-center rounded-full bg-gold"
          style={{ width: 36, height: 36 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={18} color="#141318" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full font-sans text-sm border whitespace-nowrap flex-shrink-0 transition-colors"
            style={{
              color: filter === f.key ? '#C9A84C' : '#5A5760',
              borderColor: filter === f.key ? '#C9A84C' : '#2C2A34',
              background: filter === f.key ? 'rgba(201,168,76,0.08)' : 'transparent',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {addOpen && (
          <AddOppForm
            contacts={contacts}
            onAdd={opp => { setOpps(prev => [opp, ...prev]); setAddOpen(false) }}
            onCancel={() => setAddOpen(false)}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.length === 0 ? (
              <p className="font-sans text-tertiary text-sm py-8 text-center">No opportunities here.</p>
            ) : (
              filtered.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <OppCard opp={o} onStatusChange={handleStatusChange} />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <div className="h-4" />
    </div>
  )
}
