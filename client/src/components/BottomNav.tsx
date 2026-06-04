import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, Briefcase, BarChart2, Settings } from 'lucide-react'

const tabs = [
  { path: '/', label: 'Home', Icon: Home },
  { path: '/orbit', label: 'Orbit', Icon: Users },
  { path: '/opportunities', label: 'Opps', Icon: Briefcase },
  { path: '/tracker', label: 'Tracker', Icon: BarChart2 },
  { path: '/settings', label: 'Settings', Icon: Settings },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border"
      style={{ background: '#1E1C24', boxShadow: '0 -4px 24px rgba(0,0,0,0.4)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-screen-sm mx-auto px-2">
        {tabs.map(({ path, label, Icon }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path)
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-opacity"
              style={{ color: isActive ? '#C9A84C' : '#5A5760' }}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className="font-sans text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export const TAB_ORDER = tabs.map(t => t.path)
