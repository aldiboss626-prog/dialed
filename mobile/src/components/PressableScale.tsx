import { useRef } from 'react'
import { Animated, Pressable, PressableProps } from 'react-native'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface Props extends PressableProps {
  /** scale at full press (default 0.97) — keep subtle, 0.95–0.98 */
  scaleTo?: number
}

/**
 * Pressable that springs to a subtle scale on press — the "the button heard you"
 * feedback Emil insists every pressable should have. Transform-only on the native
 * driver, so it stays at 60fps and scales its children with it.
 *
 * Press-in is quick and firm (no bounce); release is snappy with a hair of settle.
 */
export function PressableScale({ scaleTo = 0.97, style, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current

  return (
    <AnimatedPressable
      onPressIn={e => {
        Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
        onPressIn?.(e)
      }}
      onPressOut={e => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()
        onPressOut?.(e)
      }}
      style={[style as any, { transform: [{ scale }] }]}
      {...rest}
    />
  )
}
