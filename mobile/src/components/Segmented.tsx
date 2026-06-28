import { useRef, useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutChangeEvent } from 'react-native'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'

interface Props {
  tabs: string[]
  active: number
  onChange: (index: number) => void
  /** Optional badge count per tab index (e.g. unread Inbox count). 0/undefined hides it. */
  badges?: (number | undefined)[]
}

/**
 * Reusable segmented control with an animated sliding pill + optional per-tab badge.
 * Ported from the v2 `Segmented` (dialed2-app.jsx); generalised to N tabs.
 */
export function Segmented({ tabs, active, onChange, badges }: Props) {
  const c = useColors()
  const styles = makeStyles(c)
  const [trackW, setTrackW] = useState(0)
  const slide = useRef(new Animated.Value(active)).current

  useEffect(() => {
    Animated.spring(slide, {
      toValue: active,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start()
  }, [active, slide])

  const pad = 4
  const cellW = trackW > 0 ? (trackW - pad * 2) / tabs.length : 0
  const translateX = slide.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * cellW),
  })

  function onTrackLayout(e: LayoutChangeEvent) {
    setTrackW(e.nativeEvent.layout.width)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.track} onLayout={onTrackLayout}>
        {cellW > 0 && (
          <Animated.View
            style={[styles.pill, { width: cellW, transform: [{ translateX }] }]}
          />
        )}
        {tabs.map((label, i) => {
          const activeTab = i === active
          const badge = badges?.[i]
          return (
            <TouchableOpacity
              key={label}
              style={styles.tab}
              onPress={() => onChange(i)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.label,
                  { color: activeTab ? c.primary : c.secondary },
                  activeTab && { fontFamily: FontFamily.sansMedium },
                ]}
              >
                {label}
              </Text>
              {!!badge && badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
    track: {
      flexDirection: 'row',
      backgroundColor: c.elevated,
      borderRadius: 14,
      padding: 4,
      position: 'relative',
    },
    pill: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      backgroundColor: c.surface,
      borderRadius: 11,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    tab: {
      flex: 1,
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    label: { fontFamily: FontFamily.sans, fontSize: 15 },
    badge: {
      minWidth: 19,
      height: 19,
      paddingHorizontal: 5,
      borderRadius: 99,
      backgroundColor: c.overdue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#fff',
      fontFamily: FontFamily.sansMedium,
      fontSize: 11,
      lineHeight: 14,
    },
  })
}
