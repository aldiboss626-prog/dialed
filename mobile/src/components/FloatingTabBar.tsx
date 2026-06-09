import { View, Pressable, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

export function useTabBarPadding() {
  const insets = useSafeAreaInsets()
  return Math.max(insets.bottom, 0) + 56 + 16
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IoniconName; activeIcon: IoniconName }[] = [
  { name: 'home',          title: 'Home',     icon: 'home-outline',        activeIcon: 'home' },
  { name: 'orbit',         title: 'Network',  icon: 'people-outline',      activeIcon: 'people' },
  { name: 'opportunities', title: 'Ops',      icon: 'briefcase-outline',   activeIcon: 'briefcase' },
  { name: 'tracker',       title: 'Analytics', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { name: 'settings',      title: 'Settings', icon: 'settings-outline',    activeIcon: 'settings' },
]

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors()
  const insets = useSafeAreaInsets()

  function handlePress(index: number, routeName: string) {
    const isFocused = state.index === index
    const event = navigation.emit({ type: 'tabPress', target: routeName, canPreventDefault: true })
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName)
    }
  }

  return (
    <View style={[styles.wrapper, {
      backgroundColor: c.surface,
      borderTopColor: c.border,
      paddingBottom: Math.max(insets.bottom, 8),
    }]}>
      {TABS.map((tab, index) => {
        const focused = state.index === index
        const color = focused ? c.gold : c.tertiary
        return (
          <Pressable
            key={tab.name}
            style={styles.tab}
            onPress={() => handlePress(index, tab.name)}
            accessibilityRole="button"
            accessibilityLabel={tab.title}
          >
            <Ionicons name={focused ? tab.activeIcon : tab.icon} size={22} color={color} />
            <Text style={[styles.label, { color, fontFamily: focused ? FontFamily.sansMedium : FontFamily.sans }]}>
              {tab.title}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0,
  },
})
