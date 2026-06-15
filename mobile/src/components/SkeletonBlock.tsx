import { useEffect, useRef } from 'react'
import { Animated, ViewStyle } from 'react-native'
import { Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'

interface Props {
  height?: number
  width?: number | `${number}%`
  borderRadius?: number
  style?: ViewStyle
}

export function SkeletonBlock({ height = 60, width, borderRadius, style }: Props) {
  const c = useColors()
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          height,
          width: width as any ?? '100%',
          borderRadius: borderRadius ?? Radius.md,
          backgroundColor: c.elevated,
          opacity,
        },
        style,
      ]}
    />
  )
}
