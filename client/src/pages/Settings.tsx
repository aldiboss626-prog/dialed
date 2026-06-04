import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Lock } from 'lucide-react'
import { gmailApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { SectionLabel } from '../components/ui/SectionLabel'
import type { GmailStatus } from '../types'

const REL_CADENCES = [
  { type: 'Recruiter', days: 7 },
  { type: 'Professor', days: 10 },
  { type: 'Mentor', days: 14 },
  { type: 'Friend', days: 21 },
]

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 44, height: 24,
        background: enabled ? '#C9A84C' : '#2C2A34',
      }}
    >
      <motion.div
        className="absolute top-0.5 rounded-full bg-white"
        style={{ width: 20, height: 20 }}
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const [gmail, setGmail] = useState<GmailStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [cadences, setCadences] = useState(REL_CADENCES)
  const [editingCadence, setEditingCadence] = useState<string | null>(null)
  const [notifToggles, setNotifToggles] = useState({
    push: true,
    escalation: true,
    digest: false,
    deadline: true,
  })

  useEffect(() => {
    gmailApi.status().then(setGmail).catch(() => {})
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      await gmailApi.sync()
      const status = await gmailApi.status()
      setGmail(status)
    } finally {
      setSyncing(false)
    }
  }

  function updateCadence(type: string, days: number) {
    setCadences(prev => prev.map(c => c.type === type ? { ...c, days } : c))
    setEditingCadence(null)
  }

  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <motion.div
      className="px-4 pt-5 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Account */}
      <SectionLabel className="mb-3">Account</SectionLabel>
      <div className="bg-surface border border-border rounded-xl p-4 mb-5 flex items-center gap-4">
        <div
          className="flex items-center justify-center rounded-xl bg-elevated border border-border flex-shrink-0"
          style={{ width: 48, height: 48 }}
        >
          <span className="font-sans text-secondary font-medium" style={{ fontSize: 16 }}>{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-primary" style={{ fontSize: 18 }}>{user?.name}</p>
          <p className="font-sans text-secondary text-sm truncate">{user?.email}</p>
        </div>
      </div>

      {/* Gmail */}
      <SectionLabel className="mb-3">Gmail Integration</SectionLabel>
      <div className="bg-surface border border-border rounded-xl mb-5 divide-y divide-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <p className="font-sans font-medium text-primary" style={{ fontSize: 15 }}>
                {gmail?.connected ? `Connected: ${gmail.email}` : 'Not connected'}
              </p>
            </div>
            {gmail?.lastSynced && (
              <p className="font-sans text-tertiary mt-0.5" style={{ fontSize: 12 }}>Last synced: {gmail.lastSynced}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <p className="font-sans text-secondary" style={{ fontSize: 15 }}>Sync now</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="font-sans text-gold text-sm px-4 py-2 border border-gold rounded-xl transition-opacity"
            style={{ opacity: syncing ? 0.6 : 1 }}
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Default cadences */}
      <SectionLabel className="mb-3">Default Cadence</SectionLabel>
      <div className="bg-surface border border-border rounded-xl mb-5 divide-y divide-border">
        {cadences.map(c => (
          <div key={c.type} className="flex items-center justify-between p-4">
            <p className="font-sans font-medium text-primary" style={{ fontSize: 15 }}>{c.type}</p>
            {editingCadence === c.type ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={c.days}
                  min={1}
                  max={90}
                  className="w-16 bg-elevated border border-border rounded-lg px-2 py-1 font-sans text-primary text-sm text-center focus:outline-none focus:border-gold"
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateCadence(c.type, parseInt((e.target as HTMLInputElement).value))
                    if (e.key === 'Escape') setEditingCadence(null)
                  }}
                  onBlur={e => updateCadence(c.type, parseInt(e.target.value))}
                  autoFocus
                />
                <span className="font-sans text-tertiary text-sm">days</span>
              </div>
            ) : (
              <button
                onClick={() => setEditingCadence(c.type)}
                className="flex items-center gap-2"
              >
                <span className="font-sans text-secondary" style={{ fontSize: 14 }}>{c.days} days</span>
                <ChevronRight size={14} className="text-tertiary" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Notification preferences */}
      <SectionLabel className="mb-3">Notification Preferences</SectionLabel>
      <div className="bg-surface border border-border rounded-xl mb-5 divide-y divide-border">
        {[
          { key: 'push', label: 'Push notifications' },
          { key: 'escalation', label: 'Escalation alerts' },
          { key: 'digest', label: 'Weekly digest' },
          { key: 'deadline', label: 'Deadline warnings' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between p-4">
            <p className="font-sans font-medium text-primary" style={{ fontSize: 15 }}>{label}</p>
            <Toggle
              enabled={notifToggles[key as keyof typeof notifToggles]}
              onToggle={() => setNotifToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifToggles] }))}
            />
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <SectionLabel className="mb-3">Coming Soon</SectionLabel>
      <div className="bg-surface border border-border rounded-xl mb-8 divide-y divide-border opacity-50">
        {['LinkedIn Integration', 'Calendar Sync'].map(label => (
          <div key={label} className="flex items-center justify-between p-4">
            <p className="font-sans text-secondary" style={{ fontSize: 15 }}>{label}</p>
            <Lock size={14} className="text-tertiary" />
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={logout}
        className="w-full font-sans text-overdue text-sm py-3 text-center opacity-70 hover:opacity-100 transition-opacity"
      >
        Sign out
      </button>
    </motion.div>
  )
}
