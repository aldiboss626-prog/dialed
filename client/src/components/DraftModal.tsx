import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Copy, Mail, Camera, ExternalLink } from 'lucide-react'
import { draftApi } from '../lib/api'
import type { Contact } from '../types'

interface Props {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  pendingResponseId?: number
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function openGmail() {
  // Try Gmail app deep link first, fall back to web
  const appLink = 'googlegmail://'
  const webLink = 'https://mail.google.com'
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = appLink
  document.body.appendChild(iframe)
  setTimeout(() => {
    document.body.removeChild(iframe)
  }, 500)
  setTimeout(() => {
    window.open(webLink, '_blank')
  }, 300)
}

export function DraftModal({ contact, isOpen, onClose, pendingResponseId }: Props) {
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailContent, setEmailContent] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageSelect(file: File) {
    const base64 = await fileToBase64(file)
    setImageBase64(base64)
    setImagePreview(URL.createObjectURL(file))
    setShowPaste(false)
    setEmailContent('')
  }

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const d = await draftApi.generate(
        contact.id,
        pendingResponseId,
        emailContent || undefined,
        imageBase64 || undefined
      )
      setDraft(d.draft)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    if (!pendingResponseId && !draft && !loading) generate()
  }

  function handleClose() {
    onClose()
    setTimeout(() => {
      setDraft('')
      setError('')
      setEmailContent('')
      setShowPaste(false)
      setImagePreview(null)
      setImageBase64(null)
    }, 300)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleEmail() {
    const subject = encodeURIComponent('Following up')
    const body = encodeURIComponent(draft)
    window.open(`mailto:${contact.email || ''}?subject=${subject}&body=${body}`)
  }

  const hasInput = !!imageBase64 || !!emailContent

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
                <h2 className="font-display font-bold text-primary text-xl">
                  {pendingResponseId ? 'Draft Reply' : 'Draft Follow-up'}
                </h2>
                <button onClick={handleClose} className="p-2 text-tertiary">
                  <X size={20} />
                </button>
              </div>

              <p className="font-sans text-tertiary text-xs mb-4">For: {contact.name}</p>

              {/* Reply mode: Gmail button + screenshot upload */}
              {pendingResponseId && !draft && (
                <div className="mb-5">
                  {/* Open Gmail */}
                  <button
                    onClick={openGmail}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-[16px] font-sans text-sm text-secondary mb-3"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <ExternalLink size={14} />
                    Open Gmail to view the email
                  </button>

                  {/* Screenshot drop zone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(file)
                    }}
                  />

                  {imagePreview ? (
                    <div className="relative rounded-[16px] overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={imagePreview} alt="Email screenshot" className="w-full max-h-40 object-cover object-top" />
                      <button
                        onClick={() => { setImagePreview(null); setImageBase64(null) }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background text-secondary"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 font-sans text-xs text-secondary"
                        style={{ background: 'linear-gradient(transparent, rgba(20,19,24,0.9))' }}>
                        Screenshot attached — Claude will read it
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-[16px] font-sans text-sm text-secondary"
                      style={{ border: '1px dashed rgba(255,255,255,0.12)' }}
                    >
                      <Camera size={20} className="text-tertiary" />
                      <span>Attach screenshot of the email</span>
                      <span className="text-xs text-tertiary">Claude reads it — no login required</span>
                    </button>
                  )}

                  {/* Text paste fallback */}
                  {!imagePreview && (
                    <button
                      onClick={() => setShowPaste(p => !p)}
                      className="font-sans text-xs text-tertiary mt-2 flex items-center gap-1"
                    >
                      <span style={{ fontSize: 10 }}>{showPaste ? '▾' : '▸'}</span>
                      or paste the email text instead
                    </button>
                  )}
                  {showPaste && !imagePreview && (
                    <textarea
                      value={emailContent}
                      onChange={e => setEmailContent(e.target.value)}
                      rows={4}
                      placeholder="Paste the email content here…"
                      className="w-full bg-surface rounded-[14px] p-3 font-sans text-primary text-sm leading-relaxed focus:outline-none resize-none mt-2"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    />
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw size={24} className="text-gold" />
                  </motion.div>
                  <p className="font-sans text-secondary text-sm">
                    {imageBase64 ? 'Reading screenshot…' : 'Drafting your message…'}
                  </p>
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
                    {pendingResponseId && !draft ? (
                      <button
                        onClick={generate}
                        className="w-full py-4 rounded-[18px] font-sans text-sm font-medium"
                        style={{
                          background: hasInput ? '#C9A84C' : 'rgba(201,168,76,0.15)',
                          color: hasInput ? '#141318' : '#C9A84C',
                          border: hasInput ? 'none' : '1px solid rgba(201,168,76,0.3)'
                        }}
                      >
                        {hasInput ? 'Generate Draft' : 'Generate from subject only'}
                      </button>
                    ) : (
                      <>
                        <textarea
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          rows={6}
                          className="w-full bg-surface rounded-[18px] p-4 font-sans text-primary text-sm leading-relaxed focus:outline-none resize-none transition-colors mb-4"
                          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                          placeholder="Your draft will appear here…"
                        />

                        <div className="flex gap-3">
                          <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 flex-1 justify-center py-3 rounded-[18px] font-sans text-sm text-secondary transition-colors"
                            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <Copy size={15} />
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          {contact.email && (
                            <button
                              onClick={handleEmail}
                              className="flex items-center gap-2 flex-1 justify-center py-3 rounded-[18px] bg-gold font-sans text-sm text-background font-medium"
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
                      </>
                    )}
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
