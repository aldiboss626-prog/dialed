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

export const CalColors: ColorPalette = {
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
  card: 18,
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
