import { View, Text, StyleSheet } from 'react-native'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

type Status = 'overdue' | 'due-soon' | 'good'

export function StatusBadge({ status }: { status: Status }) {
  const c = useColors()
  const color = status === 'overdue' ? c.overdue : status === 'due-soon' ? c.warning : c.success
  const label = status === 'overdue' ? 'Overdue' : status === 'due-soon' ? 'Fair' : 'Good'
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontFamily: FontFamily.sans, fontSize: 10, letterSpacing: 0.5 },
})
