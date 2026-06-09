import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

type Mode = 'learn' | 'maintain'

interface Props {
  mode: Mode
  onChange: (m: Mode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  const c = useColors()

  return (
    <View style={[styles.track, { backgroundColor: c.elevated }]}>
      {(['learn', 'maintain'] as Mode[]).map(m => {
        const active = mode === m
        return (
          <TouchableOpacity
            key={m}
            style={[
              styles.pill,
              active && {
                backgroundColor: c.surface,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              },
            ]}
            onPress={() => onChange(m)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.label,
              { color: active ? c.primary : c.tertiary },
              active && { fontFamily: FontFamily.sansMedium },
            ]}>
              {m === 'learn' ? 'Learn' : 'Maintain'}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  label: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
  },
})
