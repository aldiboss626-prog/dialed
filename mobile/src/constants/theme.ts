export type ColorPalette = {
  background: string
  surface: string
  border: string
  elevated: string
  primary: string
  secondary: string
  tertiary: string
  gold: string
  overdue: string
  warning: string
  success: string
  neutral: string
  subtleBorder: string
}

export const DarkColors: ColorPalette = {
  background: '#0B0E1A',
  surface: '#141829',
  border: '#1E2440',
  elevated: '#1B2038',
  primary: '#FFFFFF',
  secondary: '#8592A8',
  tertiary: '#4A5572',
  gold: '#3B6FE8',
  overdue: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
  neutral: '#4A5572',
  subtleBorder: 'rgba(255,255,255,0.06)',
}

export const LightColors: ColorPalette = {
  background: '#EEF1FA',
  surface: '#FFFFFF',
  border: '#DDE3F0',
  elevated: '#F4F7FF',
  primary: '#0D1526',
  secondary: '#5C6B8A',
  tertiary: '#95A2BC',
  gold: '#2563EB',
  overdue: '#EF4444',
  warning: '#F59E0B',
  success: '#16A34A',
  neutral: '#95A2BC',
  subtleBorder: 'rgba(0,0,0,0.07)',
}

// Clean white/light palette (reverted from the warm cream). CalColors is the app
// default; token names are kept identical so every screen's makeStyles(c) keeps working.
export const CalColors: ColorPalette = {
  background: '#FFFFFF', // white
  surface: '#FFFFFF',
  border: '#E6E8EE',
  elevated: '#F4F6FA', // light gray for tiles/cards so they read on white
  primary: '#0D1526', // near-black ink
  secondary: '#5C6B8A',
  tertiary: '#95A2BC',
  gold: '#2563EB', // electric blue accent
  overdue: '#EF4444',
  warning: '#F59E0B',
  success: '#16A34A',
  neutral: '#95A2BC',
  subtleBorder: 'rgba(0,0,0,0.07)',
}

// Relationship-type accent colors (from dialed-kit.jsx `CAT`). Theme-independent.
export const CategoryColors: Record<string, string> = {
  Mentor: '#3B6FE8',
  Friend: '#22C55E',
  Recruiter: '#EF4444',
  Professor: '#F59E0B',
}

// Fallback for unknown/empty relationship types.
export const DEFAULT_CATEGORY_COLOR = '#6B5C48'

// Dark alias kept for any remaining legacy imports
export const Colors = DarkColors

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  card: 18,
  xl: 24,
  sheet: 24,
  full: 999,
} as const

export const FontFamily = {
  sans: 'DMSans-Regular',
  sansMedium: 'DMSans-Medium',
  // Cal AI style: heavy bold sans for titles + numbers.
  // REVERT TO ORIGINAL: change these two lines back to 'CormorantGaramond-Bold' / 'CormorantGaramond-SemiBold'
  display: 'DMSans-Bold',
  displaySemiBold: 'DMSans-Medium',
} as const
