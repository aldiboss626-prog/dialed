import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontFamily, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

interface Props {
  title: string
  accentColor: string
  completedCount: number
  totalItems: number
}

export function TopicPageHeader({ title, accentColor, completedCount, totalItems }: Props) {
  const c = useColors()
  const insets = useSafeAreaInsets()
  const progress = totalItems > 0 ? Math.min(1, completedCount / totalItems) : 0

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: c.background }]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: c.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.primary }]}>{title}</Text>
        <View style={styles.spacer} />
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
      </View>
      {totalItems > 0 && (
        <Text style={[styles.progressLabel, { color: c.secondary }]}>
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
  backArrow: { fontSize: 32, lineHeight: 36, fontFamily: 'DMSans-Regular' },
  title: { flex: 1, textAlign: 'center', fontFamily: 'DMSans-Bold', fontSize: 20 },
  spacer: { width: 40 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  progressLabel: { fontFamily: 'DMSans-Regular', fontSize: 11, marginTop: 6, textAlign: 'right' },
})
