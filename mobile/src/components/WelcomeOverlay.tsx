import { useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'

interface Props {
  title: string
  name: string
  greeting: string
  statLine: string
  onDone: () => void
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0, right: 0, top: 0, bottom: 0,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    wordmark: {
      fontFamily: FontFamily.display,
      fontSize: 22,
      color: c.gold,
      letterSpacing: 8,
      marginBottom: 48,
    },
    greetingBlock: { alignItems: 'center' },
    greeting: {
      fontFamily: FontFamily.sans,
      fontSize: 18,
      color: c.secondary,
      marginBottom: 6,
    },
    name: {
      fontFamily: FontFamily.display,
      fontSize: 42,
      color: c.primary,
      lineHeight: 46,
      textAlign: 'center',
      marginBottom: 20,
    },
    stat: {
      fontFamily: FontFamily.sans,
      fontSize: 13,
      color: c.tertiary,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  })
}

export function WelcomeOverlay({ title, name, greeting, statLine, onDone }: Props) {
  const c = useColors()
  const styles = makeStyles(c)
  const opacity = useRef(new Animated.Value(0)).current
  const wordmarkY = useRef(new Animated.Value(12)).current
  const greetingY = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(wordmarkY, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(greetingY, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDone()
      })
    }, 2600)

    return () => clearTimeout(timer)
  }, [])

  const address = title ? `${title} ${name}` : name

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.Text style={[styles.wordmark, { transform: [{ translateY: wordmarkY }] }]}>
        DIALED
      </Animated.Text>

      <Animated.View style={[styles.greetingBlock, { transform: [{ translateY: greetingY }] }]}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{address}</Text>
        {!!statLine && <Text style={styles.stat}>{statLine}</Text>}
      </Animated.View>
    </Animated.View>
  )
}
