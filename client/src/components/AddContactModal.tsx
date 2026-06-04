import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { contactsApi } from '../lib/api'
import { starToCadence } from '../lib/utils'
import type { Contact, Suggestion } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdded: (c: Contact) => void
}

const REL_TYPES = ['Mentor', 'Professor', 'Recruiter', 'Friend', 'Other'] as const

const starLabels: Record<number, string> = {
  1: 'Following up every 30 days',
  2: 'Following up every 21 days',
  3: 'Following up every 14 days',
  4: 'Following up every 10 days',
  5: 'Following up every 5 days',
}
const starSubLabels: Record<number, string> = {
  1: 'Minimal — record only',
  2: 'Light — single reminder only',
  3: 'Steady — one nudge per cycle',
  4: 'Regular — escalates near deadlines',
  5: 'High — escalates daily near deadlines',
}

export function AddContactModal({ isOpen, onClose, onAdded }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [relType, setRelType] = useState<string>('')
  const [stars, setStars] = useState(3)
  const [hovered, setHovered] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      contactsApi.suggestions().then(setSuggestions).catch(() => {})
    }
  }, [isOpen])

  function reset() {
    setName(''); setEmail(''); setRelType(''); setStars(3); setNotes(''); setError('')
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const c = await contactsApi.create({ name, email, relationship_type: relType as Contact['relationship_type'], stars, notes })
      onAdded(c)
      reset()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  function addFromSuggestion(s: Suggestion) {
    setName(s.name); setEmail(s.email)
    setDismissedSuggestions(d => [...d, s.id])
  }

  const displayStar = hovered || stars
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.includes(s.id))

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-elevated rounded-t-3xl overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-5 pb-6 overflow-y-auto max-h-[85vh]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-primary text-2xl">Add to Orbit</h2>
                <button onClick={handleClose} className="p-2 text-tertiary hover:text-secondary transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Name *"
                  className="w-full bg-transparent border-b border-border pb-3 font-sans text-primary placeholder-tertiary focus:outline-none focus:border-gold text-base transition-colors"
                />

                {/* Email */}
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-transparent border-b border-border pb-3 font-sans text-primary placeholder-tertiary focus:outline-none focus:border-gold text-base transition-colors"
                />

                {/* Relationship type */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {REL_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRelType(relType === t ? '' : t)}
                      className="px-3 py-1.5 rounded-full font-sans text-sm border transition-colors"
                      style={{
                        borderColor: relType === t ? '#C9A84C' : '#2C2A34',
                        color: relType === t ? '#C9A84C' : '#8A8490',
                        background: relType === t ? 'rgba(201,168,76,0.08)' : 'transparent',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Star selector */}
                <div className="py-4 text-center">
                  <div className="flex justify-center gap-3 mb-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <motion.button
                        key={i}
                        type="button"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setStars(i)}
                        whileTap={{ scale: 1.3 }}
                        animate={{ scale: i <= stars ? 1 : 0.9 }}
                        transition={{ duration: 0.2 }}
                        style={{ fontSize: 40, color: i <= displayStar ? '#C9A84C' : '#2C2A34', background: 'none', border: 'none', padding: '0 4px', lineHeight: 1 }}
                      >
                        ★
                      </motion.button>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stars}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="font-display italic text-primary text-base">{starLabels[stars]}</p>
                      <p className="font-sans text-tertiary text-xs mt-1">{starSubLabels[stars]}</p>
                    </motion.div>
                  </AnimatePresence>
                  <p className="font-sans text-tertiary text-xs mt-1">
                    Auto-cadence: every {starToCadence[stars]} days
                  </p>
                </div>

                {/* Notes */}
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add a note (optional)"
                  rows={2}
                  className="w-full bg-transparent border-b border-border pb-3 font-sans text-primary placeholder-tertiary focus:outline-none focus:border-gold text-sm transition-colors resize-none"
                />

                {/* Gmail suggestions */}
                {visibleSuggestions.length > 0 && (
                  <div>
                    <p className="section-label mb-3">Gmail Suggestions</p>
                    {visibleSuggestions.map(s => (
                      <div key={s.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div>
                          <p className="font-sans text-primary text-sm font-medium">{s.name}</p>
                          <p className="font-sans text-tertiary text-xs">{s.hint}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => addFromSuggestion(s)}
                            className="font-sans text-gold text-xs px-3 py-1.5 border border-gold rounded-full"
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setDismissedSuggestions(d => [...d, s.id])}
                            className="font-sans text-tertiary text-xs"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && <p className="font-sans text-overdue text-sm">{error}</p>}

                <button type="submit" disabled={loading} className="btn-gold font-display font-semibold text-lg">
                  {loading ? 'Adding…' : 'Add to Orbit'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
