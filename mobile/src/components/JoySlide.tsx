import { useEffect, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

const MESSAGES = [
  "That's the move.",
  'Orbit updated.',
  'Stay warm.',
  'Relationship maintained.',
  'Keep it up.',
  "That's what I'm talking about.",
]

interface Props {
  visible: boolean
  onDone: () => void
}

export function JoySlide({ visible, onDone }: Props) {
  const c = useColors()
  const translateX = useSharedValue(340)
  const messageRef = useRef(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])

  useEffect(() => {
    if (!visible) return

    messageRef.current = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]

    // Spring in from the right
    translateX.value = withSpring(0, { damping: 16, stiffness: 180 }, () => {
      // Hold for ~1.2s then spring back out
      translateX.value = withDelay(
        1200,
        withSpring(340, { damping: 18, stiffness: 160 }, (finished) => {
          if (finished) runOnJS(onDone)()
        })
      )
    })
  }, [visible])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  if (!visible) return null

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: c.elevated, borderColor: c.success }, animStyle]}
      pointerEvents="none"
    >
      <Text style={styles.check}>✓</Text>
      <View style={styles.text}>
        <Text style={[styles.title, { color: c.success }]}>We Talked</Text>
        <Text style={[styles.sub, { color: c.secondary }]}>{messageRef.current}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: '42%',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 12,
    maxWidth: 220,
  },
  check: {
    fontSize: 22,
    color: '#1A6B3C',
    fontWeight: 'bold',
  },
  text: { flex: 1 },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 17,
    lineHeight: 19,
  },
  sub: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    marginTop: 2,
  },
})
