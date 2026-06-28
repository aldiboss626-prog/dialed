import { useRef, useEffect } from 'react'
import { Animated, Easing, ViewStyle, StyleProp } from 'react-native'

interface Props {
  children: React.ReactNode
  /** ms to wait before animating in (use for staggered lists) */
  delay?: number
  /** starting vertical offset in px (default 10) */
  offset?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Fade + slide-up on mount. Ports the v2 `Reveal` staggered entrance.
 * Transform/opacity only (useNativeDriver) so it stays smooth on device.
 */
export function Reveal({ children, delay = 0, offset = 10, style }: Props) {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 380,
      delay,
      // Strong ease-out: starts fast so the entrance feels responsive, not sluggish.
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    })
    anim.start()
    return () => anim.stop()
  }, [t, delay])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
            // Settle in from a near-full scale — nothing in the real world springs from nothing.
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}
