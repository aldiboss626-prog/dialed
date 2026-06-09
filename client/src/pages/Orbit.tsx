import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { contactsApi } from '../lib/api'
import { initials, statusColor } from '../lib/utils'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Stars } from '../components/ui/Stars'
import { SectionLabel } from '../components/ui/SectionLabel'
import { AddContactModal } from '../components/AddContactModal'
import type { Contact } from '../types'

type Filter = 'all' | 'overdue' | 'due-soon' | 'good'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'due-soon', label: 'Due Soon' },
  { key: 'good', label: 'Good' },
]

export default function Orbit() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    contactsApi.list()
      .then(setContacts)
      .finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter
    const matchesQuery = query === '' ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.role || '').toLowerCase().includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  })

  return (
    <div className="px-4 pt-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        <SectionLabel className="mb-1">Your Network</SectionLabel>
      </motion.div>
      <div className="flex items-center justify-between mb-4">
        <motion.h1
          className="font-display font-bold text-primary"
          style={{ fontSize: 32 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          Orbit
        </motion.h1>
        <motion.button
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center rounded-full bg-gold"
          style={{ width: 36, height: 36 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Plus size={18} color="#141318" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Search */}
      <motion.div
        className="relative mb-4"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.08 }}
      >
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your Orbit…"
          className="w-full bg-surface rounded-full pl-10 pr-4 py-3 font-sans text-primary placeholder-tertiary focus:outline-none text-sm transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </motion.div>

      {/* Filter tabs */}
      <motion.div
        className="flex gap-2 mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-full font-sans text-sm transition-colors border"
            style={{
              color: filter === f.key ? '#C9A84C' : '#5A5760',
              borderColor: filter === f.key ? '#C9A84C' : '#2C2A34',
              background: filter === f.key ? 'rgba(201,168,76,0.08)' : 'transparent',
            }}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Contact list */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-gold animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter + query}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.length === 0 ? (
              <p className="font-sans text-tertiary text-sm py-8 text-center">No contacts found.</p>
            ) : (
              filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  className="flex items-center gap-3 py-3 cursor-pointer border-b border-border"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/contact/${c.id}`)}
                >
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center rounded-xl bg-elevated flex-shrink-0"
                    style={{ width: 44, height: 44 }}
                  >
                    <span className="font-sans text-secondary" style={{ fontSize: 14 }}>{initials(c.name)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-semibold text-primary truncate" style={{ fontSize: 17 }}>{c.name}</span>
                      {c.gmail_connected ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                      ) : null}
                    </div>
                    <p className="font-sans text-secondary truncate" style={{ fontSize: 12 }}>{c.role}</p>
                    <Stars count={c.stars} size={10} className="mt-0.5" />
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={c.status} />
                    <span className="font-sans text-tertiary" style={{ fontSize: 11 }}>{c.days_since_contact}d ago</span>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <AddContactModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={c => setContacts(prev => [c, ...prev])}
      />

      <div className="h-4" />
    </div>
  )
}
