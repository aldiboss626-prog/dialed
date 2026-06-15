import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import { getProgress, markChallengeComplete, recordActivityToday } from '@/lib/learnProgress'

interface Challenge {
  id: string
  title: string
  description: string
}

interface Props {
  topic: string
  challenges: Challenge[]
  onProgressChange?: () => void
}

export function ChallengeSection({ topic, challenges, onProgressChange }: Props) {
  const c = useColors()
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    getProgress(topic).then(p => setCompleted(new Set(p.completedChallenges)))
  }, [topic])

  async function toggle(id: string) {
    if (completed.has(id)) return
    await markChallengeComplete(topic, id)
    await recordActivityToday()
    setCompleted(prev => new Set([...prev, id]))
    onProgressChange?.()
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.secondary }]}>Challenges</Text>
      {challenges.map(ch => {
        const done = completed.has(ch.id)
        return (
          <TouchableOpacity
            key={ch.id}
            style={[styles.row, { backgroundColor: c.surface }]}
            onPress={() => toggle(ch.id)}
            activeOpacity={0.75}
          >
            <View style={[
              styles.checkbox,
              { borderColor: done ? c.gold : c.border, backgroundColor: done ? c.gold : 'transparent' },
            ]}>
              {done && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <View style={styles.textBlock}>
              <Text style={[
                styles.title,
                { color: done ? c.tertiary : c.primary, textDecorationLine: done ? 'line-through' : 'none' },
              ]}>
                {ch.title}
              </Text>
              <Text style={[styles.desc, { color: c.secondary }]}>{ch.description}</Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Spacing.lg, marginBottom: 32 },
  label: { fontFamily: FontFamily.sans, fontSize: 13, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: Radius.lg, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  textBlock: { flex: 1 },
  title: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 20, marginBottom: 3 },
  desc: { fontFamily: FontFamily.sans, fontSize: 12, lineHeight: 17 },
})
