import { View, Text } from 'react-native'
import { useColors } from '@/hooks/use-theme'

export function Stars({ count, size = 12 }: { count: number; size?: number }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < count ? c.warning : c.border, lineHeight: size * 1.3 }}>
          ★
        </Text>
      ))}
    </View>
  )
}
