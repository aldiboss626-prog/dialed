import React from 'react'
import { Pressable, type PressableProps } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'

interface Props extends PressableProps {
  children: React.ReactNode
}

export function AnimatedPressable({ children, style, ...rest }: Props) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }) }}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}
