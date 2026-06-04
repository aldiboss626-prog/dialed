import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Copy, Mail } from 'lucide-react'
import { draftApi } from '../lib/api'
import type { Contact } from '../types'

interface Props {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  pendingResponseId?: number
}

export function DraftModal({ contact, isOpen, onClose, pendingResponseId }: Props) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const d = await draftApi.generate(contact.id, pendingResponseId)
      setDraft(d.draft)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    if (!draft && !loading) generate()
  }

  function handleClose() {
    onClose()
    setTimeout(() => { setDraft(''); setError('') }, 300)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Following up`)
    const body = encodeURIComponent(draft)
    window.open(`mailto:${contact.email || ''}?subject=${subject}&body=${body}`)
  }

  return (
    <AnimatePresence onExitComplete={() => {}}>
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-elevated rounded-t-3xl"
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } }}
            exit={{ y: '100%', transition: { duration: 0.28 } }}
            onAnimationStart={() => { if (!draft && !loading && !error) handleOpen() }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-primary text-xl">{pendingResponseId ? 'Draft Reply' : 'Draft Follow-up'}</h2>
                <button onClick={handleClose} className="p-2 text-tertiary">
                  <X size={20} />
                </button>
              </div>

              <p className="font-sans text-tertiary text-xs mb-3">For: {contact.name}</p>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw size={24} className="text-gold" />
                  </motion.div>
                  <p className="font-sans text-secondary text-sm">Drafting your message…</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="font-sans text-overdue text-sm mb-4">{error}</p>
                  <button onClick={generate} className="btn-ghost-gold" style={{ width: 'auto', padding: '10px 20px' }}>
                    Try again
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={draft}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      rows={6}
                      className="w-full bg-surface border border-border rounded-xl p-4 font-sans text-primary text-sm leading-relaxed focus:outline-none focus:border-gold resize-none transition-colors mb-4"
                      placeholder="Your draft will appear here…"
                    />

                    <div className="flex gap-3">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 flex-1 justify-center py-3 rounded-xl border border-border font-sans text-sm text-secondary hover:border-secondary transition-colors"
                      >
                        <Copy size={15} />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      {contact.email && (
                        <button
                          onClick={handleEmail}
                          className="flex items-center gap-2 flex-1 justify-center py-3 rounded-xl bg-gold font-sans text-sm text-background font-medium"
                        >
                          <Mail size={15} />
                          Send via Email
                        </button>
                      )}
                    </div>

                    <button
                      onClick={generate}
                      className="flex items-center gap-2 justify-center w-full mt-3 py-2 font-sans text-sm text-tertiary"
                    >
                      <RefreshCw size={13} />
                      Regenerate
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
