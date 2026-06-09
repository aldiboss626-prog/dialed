import { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { getStreak } from '@/lib/learnProgress'

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginHorizontal: Spacing.lg, marginBottom: 16,
    },
    // Left pill — matches Cal AI's 🔥 N badge
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.surface,
      paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: Radius.full,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    flame: { fontSize: 18 },
    count: { fontFamily: 'DMSans-Bold', fontSize: 20, color: c.primary, lineHeight: 24 },
    countLabel: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    // Right — 7-day dot strip
    dotsWrap: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 5,
      backgroundColor: c.surface,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: Radius.full,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    dotCol: { alignItems: 'center', gap: 3 },
    dot: { width: 20, height: 20, borderRadius: 6 },
    dotLabel: { fontFamily: FontFamily.sans, fontSize: 8, color: c.tertiary },
  })
}

export function StreakBanner() {
  const c = useColors()
  const styles = makeStyles(c)
  const [streak, setStreak] = useState(0)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    getStreak().then(s => {
      setStreak(s.count)
      setHistory(s.history)
    })
  }, [])

  const days = last7Days()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <View style={styles.row}>
      {/* Streak pill — like Cal AI's top-right badge but full-label */}
      <View style={styles.pill}>
        <Text style={styles.flame}>🔥</Text>
        <Text style={styles.count}>{streak}</Text>
        <Text style={styles.countLabel}>day streak</Text>
      </View>

      {/* 7-day dot strip */}
      <View style={styles.dotsWrap}>
        {days.map(day => {
          const active = history.includes(day)
          const isToday = day === today
          return (
            <View key={day} style={styles.dotCol}>
              <View style={[
                styles.dot,
                {
                  backgroundColor: active ? '#F97316' : c.elevated,
                  borderWidth: isToday && !active ? 1.5 : 0,
                  borderColor: '#F97316',
                },
              ]} />
              <Text style={[styles.dotLabel, isToday && { color: '#F97316', fontFamily: FontFamily.sansMedium }]}>
                {dayLabel(day)}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
