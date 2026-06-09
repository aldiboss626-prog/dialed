import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="text-center mb-10">
          <h1 className="wordmark text-4xl mb-3">DIALED</h1>
          <p className="font-sans text-secondary text-sm leading-relaxed">
            Who in your network is going cold?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-surface rounded-[18px] px-4 py-4 font-sans text-primary placeholder-tertiary focus:outline-none text-base transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-surface rounded-[18px] px-4 py-4 font-sans text-primary placeholder-tertiary focus:outline-none text-base transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            />
          </div>

          {error && (
            <p className="font-sans text-overdue text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="font-sans text-tertiary text-xs text-center mt-8">
          Demo: alex@miami.edu / dialed123
        </p>
      </motion.div>
    </div>
  )
}
