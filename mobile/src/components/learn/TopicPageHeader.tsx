import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontFamily, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

interface Props {
  title: string
  completedCount: number
  totalItems: number
}

export function TopicPageHeader({ title, completedCount, totalItems }: Props) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const progress = totalItems > 0 ? Math.min(1, completedCount / totalItems) : 0

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: c.background }]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.primary }]}>{title}</Text>
        <View style={styles.spacer} />
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: c.gold }]} />
      </View>
      {totalItems > 0 && (
        <Text style={[styles.progressLabel, { color: c.tertiary }]}>
          {completedCount} / {totalItems} completed
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  title: { flex: 1, textAlign: 'center', fontFamily: FontFamily.display, fontSize: 18 },
  spacer: { width: 40 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  progressLabel: { fontFamily: FontFamily.sans, fontSize: 11, marginTop: 6, textAlign: 'right' },
})
