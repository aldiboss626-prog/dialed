import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { contactsApi, pendingApi, oppsApi } from '../lib/api'

interface Props {
  onComplete: () => void
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning,'
  if (h >= 12 && h < 17) return 'Good afternoon,'
  if (h >= 17 && h < 21) return 'Good evening,'
  return 'Good night,'
}

export function JarvisGreeting({ onComplete }: Props) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [step, setStep] = useState(0)
  const [contextLine, setContextLine] = useState<string>('')
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete()
      return
    }

    // Fetch context data in background while animation plays
    Promise.all([
      contactsApi.list().catch(() => []),
      pendingApi.list().catch(() => []),
      oppsApi.list().catch(() => []),
    ]).then(([contacts, pending, opps]) => {
      const overdue = contacts.filter((c: { status: string }) => c.status === 'overdue')
      const upcomingOpps = opps.filter(
        (o: { state: string; days_left: number | null; title: string }) =>
          o.state === 'upcoming' && o.days_left !== null && o.days_left <= 7
      )
      if (overdue.length > 0) {
        setContextLine(`You have ${overdue.length} contact${overdue.length > 1 ? 's' : ''} waiting.`)
      } else if (pending.length > 0) {
        setContextLine(`${pending[0].contact.name} is waiting for your reply.`)
      } else if (upcomingOpps.length > 0) {
        setContextLine(`${upcomingOpps[0].title} deadline in ${upcomingOpps[0].days_left} days.`)
      } else {
        setContextLine('Your Orbit is looking healthy.')
      }
    })

    const timers = [
      setTimeout(() => setStep(1), 0),      // wordmark visible at mount
      setTimeout(() => setStep(2), 500),    // greeting line
      setTimeout(() => setStep(3), 900),    // "Master Lawrence."
      setTimeout(() => setStep(4), 1500),   // context line
      setTimeout(() => setExiting(true), 2200), // begin exit
      setTimeout(() => onComplete(), 2600), // hand off to home screen
    ]

    return () => timers.forEach(clearTimeout)
  }, [])

  if (prefersReducedMotion) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#141318' }}
      animate={exiting ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Wordmark — uses layoutId so Framer Motion FLIPs it to Home header on exit */}
      <motion.span
        layoutId="dialed-wordmark"
        className="wordmark"
        style={{ fontSize: 18, letterSpacing: '0.16em' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        DIALED
      </motion.span>

      {/* Greeting line */}
      <motion.p
        className="font-sans text-secondary mt-4"
        style={{ fontSize: 16 }}
        initial={{ opacity: 0 }}
        animate={exiting
          ? { opacity: 0, y: -8 }
          : { opacity: step >= 2 ? 1 : 0 }
        }
        transition={exiting
          ? { duration: 0.3, ease: 'easeIn' }
          : { duration: 0.35 }
        }
      >
        {getTimeGreeting()}
      </motion.p>

      {/* "Master Lawrence." */}
      <motion.p
        className="font-display font-bold text-primary"
        style={{ fontSize: 36 }}
        initial={{ opacity: 0, y: 8 }}
        animate={exiting
          ? { opacity: 0, y: -8 }
          : { opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 8 }
        }
        transition={exiting
          ? { duration: 0.3, ease: 'easeIn' }
          : { duration: 0.4 }
        }
      >
        Master Lawrence.
      </motion.p>

      {/* Context line */}
      <AnimatePresence>
        {contextLine && step >= 4 && (
          <motion.p
            className="font-sans text-secondary mt-3"
            style={{ fontSize: 14 }}
            initial={{ opacity: 0 }}
            animate={exiting ? { opacity: 0, y: -8 } : { opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={exiting
              ? { duration: 0.3, ease: 'easeIn' }
              : { duration: 0.3 }
            }
          >
            {contextLine}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
