import { View, Text, TouchableOpacity } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily } from '@/constants/theme'
import { useColors, useThemeMode } from '@/hooks/use-theme'

// The same floating pill as Home's tab bar, but for detached screens (e.g. All
// People) so the main sections stay reachable. Navigation-only — no active tab.

export interface FloatingNavItem {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  badge?: number
}

export function FloatingNav({ items }: { items: FloatingNavItem[] }) {
  const c = useColors()
  const { mode } = useThemeMode()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'dark'

  return (
    <View style={{
      position: 'absolute', bottom: 12 + Math.max(insets.bottom, 0),
      left: 16, right: 16, borderRadius: 999, overflow: 'hidden',
      shadowColor: isDark ? '#000' : '#0D1526',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.5 : 0.13, shadowRadius: 22, elevation: 14,
    }}>
      <BlurView
        intensity={isDark ? 60 : 75}
        tint={isDark ? 'dark' : 'light'}
        style={{
          paddingVertical: 8, paddingHorizontal: 4, borderRadius: 999, borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)',
          backgroundColor: isDark ? 'rgba(22,20,30,0.80)' : 'rgba(255,255,255,0.55)',
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          {items.map(item => {
            const color = isDark ? c.secondary : c.tertiary
            return (
              <TouchableOpacity
                key={item.id}
                onPress={item.onPress}
                activeOpacity={0.65}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 5 }}
              >
                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={item.icon} size={24} color={color} />
                  {!!item.badge && item.badge > 0 && (
                    <View style={{
                      position: 'absolute', top: -4, right: -7,
                      backgroundColor: c.overdue, borderRadius: 8,
                      minWidth: 16, height: 16, paddingHorizontal: 3,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5, borderColor: isDark ? 'rgba(22,20,30,0.95)' : c.surface,
                    }}>
                      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10, color: '#fff' }}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10.5, color, letterSpacing: 0.1 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </BlurView>
    </View>
  )
}
