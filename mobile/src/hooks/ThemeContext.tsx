import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DarkColors, LightColors, CalColors } from '@/constants/theme'
import type { ColorPalette } from '@/constants/theme'

const THEME_KEY = 'dialed_theme'

// 'cal' = Cal AI-inspired light theme (current default)
// 'dark' = original Dialed dark theme
// To default back to dark: change the useState below to useState<ThemeMode>('dark')
export type ThemeMode = 'dark' | 'light' | 'cal'

interface ThemeCtx {
  mode: ThemeMode
  toggle: () => void
  colors: ColorPalette
}

const ThemeContext = createContext<ThemeCtx>({
  mode: 'cal',
  toggle: () => {},
  colors: CalColors,
})

function paletteFor(m: ThemeMode): ColorPalette {
  if (m === 'dark') return DarkColors
  if (m === 'cal') return CalColors
  return LightColors
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('cal')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(v => { if (v === 'light' || v === 'dark' || v === 'cal') setMode(v as ThemeMode) })
      .catch(() => {})
  }, [])

  function toggle() {
    // Cycles: cal → dark → cal
    const next: ThemeMode = mode === 'cal' ? 'dark' : 'cal'
    setMode(next)
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {})
  }

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors: paletteFor(mode) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors
}

export function useThemeMode() {
  return useContext(ThemeContext)
}
