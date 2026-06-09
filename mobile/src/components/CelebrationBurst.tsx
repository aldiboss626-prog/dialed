import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated'

const EMOJIS = ['🎉', '⭐', '🔥', '💪', '🏆', '✨', '🎊', '💥']

// Each particle: emoji, horizontal drift, height, delay
const PARTICLES = EMOJIS.map((emoji, i) => ({
  emoji,
  dx: (i % 2 === 0 ? 1 : -1) * (30 + (i * 22) % 90),
  dy: -(140 + (i * 28) % 100),
  delay: i * 45,
}))

function Particle({ emoji, dx, dy, delay, onDone }: {
  emoji: string; dx: number; dy: number; delay: number; onDone?: () => void
}) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.3)

  useEffect(() => {
    const run = () => {
      opacity.value = withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(300, withTiming(0, { duration: 300 }, (finished) => {
          if (finished && onDone) runOnJS(onDone)()
        }))
      )
      scale.value = withSpring(1.2, { damping: 8, stiffness: 200 })
      translateX.value = withSpring(dx, { damping: 12, stiffness: 120 })
      translateY.value = withSpring(dy, { damping: 10, stiffness: 100 })
    }

    const t = setTimeout(run, delay)
    return () => clearTimeout(t)
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.Text style={[styles.emoji, style]}>
      {emoji}
    </Animated.Text>
  )
}

interface Props {
  visible: boolean
  onDone: () => void
}

export function CelebrationBurst({ visible, onDone }: Props) {
  if (!visible) return null

  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Particle
          key={i}
          emoji={p.emoji}
          dx={p.dx}
          dy={p.dy}
          delay={p.delay}
          onDone={i === PARTICLES.length - 1 ? onDone : undefined}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  emoji: {
    position: 'absolute',
    fontSize: 36,
  },
})
