import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { BottomNav } from './components/BottomNav'
import { JarvisGreeting } from './components/JarvisGreeting'
import Login from './pages/Login'
import Home from './pages/Home'
import Orbit from './pages/Orbit'
import ContactDetail from './pages/ContactDetail'
import Opportunities from './pages/Opportunities'
import Notifications from './pages/Notifications'
import Tracker from './pages/Tracker'
import Settings from './pages/Settings'

const TAB_PATHS = ['/', '/orbit', '/opportunities', '/tracker', '/settings']

function ProtectedApp() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [greetingDone, setGreetingDone] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background">
        <div className="wordmark text-2xl tracking-wordmark">DIALED</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const isTabScreen = TAB_PATHS.some(
    p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p))
  )

  return (
    <div className="bg-background min-h-dvh">
      {/* Greeting overlay — plays once per page load, only on home screen */}
      {!greetingDone && location.pathname === '/' && (
        <JarvisGreeting onComplete={() => setGreetingDone(true)} />
      )}

      <div className="pb-16">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname.split('/')[1] || 'home'}>
            <Route path="/" element={<Home />} />
            <Route path="/orbit" element={<Orbit />} />
            <Route path="/contact/:id" element={<ContactDetail />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
      {isTabScreen && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Login />
}
