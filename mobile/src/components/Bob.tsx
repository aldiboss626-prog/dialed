import { useEffect, useRef } from 'react'
import { Animated, Easing, Image, Pressable } from 'react-native'
import { haptic } from '@/lib/haptics'

// Bob — the network-health blob. Uses the real illustrated frames (one per state)
// and layers procedural life on top, nested so each effect stays independent:
//   hop      — occasional jump with anticipation + landing squash (energy-gated)
//   breathe  — gentle idle float + jelly jiggle + sway
//   react    — squash-and-settle on mood change, shiver when critical
//   poke     — tap him and he giggles (squish + wiggle + haptic)
// Steam/sparkles are baked into the artwork itself.

export type BobTier = 'critical' | 'low' | 'okay' | 'good' | 'great' | 'super'

export function bobTier(score: number): BobTier {
  if (score > 100) return 'super'
  if (score >= 88) return 'great'
  if (score >= 63) return 'good'
  if (score >= 38) return 'okay'
  if (score >= 13) return 'low'
  return 'critical'
}

const IMAGES: Record<BobTier, number> = {
  critical: require('../../assets/bob/bob-critical.png'),
  low: require('../../assets/bob/bob-low.png'),
  okay: require('../../assets/bob/bob-okay.png'),
  good: require('../../assets/bob/bob-good.png'),
  great: require('../../assets/bob/bob-great.png'),
  super: require('../../assets/bob/bob-super.png'),
}

const CFG: Record<BobTier, { label: string; color: string; amp: number; dur: number; squash: number; sway: number }> = {
  critical: { label: 'Critical', color: '#8AA9C9', amp: 1.5, dur: 2300, squash: 0.012, sway: 0.4 },
  low:      { label: 'Low',      color: '#6E97D6', amp: 2.5, dur: 2000, squash: 0.020, sway: 0.6 },
  okay:     { label: 'Okay',     color: '#4F86E8', amp: 4,   dur: 1700, squash: 0.030, sway: 1.0 },
  good:     { label: 'Good',     color: '#3B82F6', amp: 6,   dur: 1450, squash: 0.042, sway: 1.4 },
  great:    { label: 'Great',    color: '#2563EB', amp: 8,   dur: 1200, squash: 0.052, sway: 1.8 },
  super:    { label: 'Super',    color: '#2F6BFF', amp: 10,  dur: 1050, squash: 0.062, sway: 2.2 },
}

// Hop tuning per state. Critical/Low are too low-energy to jump (they just breathe).
const HOP: Partial<Record<BobTier, { h: number; min: number; max: number }>> = {
  okay:  { h: 9,  min: 2600, max: 4200 },
  good:  { h: 15, min: 1900, max: 3200 },
  great: { h: 21, min: 1500, max: 2600 },
  super: { h: 27, min: 1100, max: 2100 },
}

export function bobMoodLabel(score: number): string { return CFG[bobTier(score)].label }
export function bobColor(score: number): string { return CFG[bobTier(score)].color }

export function Bob({ score, size = 150, onPoke }: { score: number; size?: number; onPoke?: () => void }) {
  const tier = bobTier(score)
  const cfg = CFG[tier]

  const idle = useRef(new Animated.Value(0)).current
  const pop = useRef(new Animated.Value(1)).current
  const shiver = useRef(new Animated.Value(0)).current
  const hopY = useRef(new Animated.Value(0)).current
  const hopSq = useRef(new Animated.Value(0)).current // -1 squat, +1 stretch
  const poke = useRef(new Animated.Value(0)).current  // tap squish
  const wiggle = useRef(new Animated.Value(0)).current

  // Idle float + jelly jiggle + sway. Amplitude/speed scale with energy.
  useEffect(() => {
    idle.setValue(0)
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: cfg.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(idle, { toValue: 0, duration: cfg.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [idle, cfg.dur])

  // Squash-and-settle on mood change.
  useEffect(() => {
    pop.setValue(0.82)
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }).start()
  }, [tier, pop])

  // Shiver only when critical.
  useEffect(() => {
    if (tier !== 'critical') { shiver.stopAnimation(() => shiver.setValue(0)); return }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(shiver, { toValue: 1, duration: 95, useNativeDriver: true }),
      Animated.timing(shiver, { toValue: -1, duration: 95, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [tier, shiver])

  // Occasional hop (only the lively states). Anticipation → launch → land squash.
  useEffect(() => {
    const h = HOP[tier]
    if (!h) { hopY.stopAnimation(() => hopY.setValue(0)); hopSq.stopAnimation(() => hopSq.setValue(0)); return }
    let alive = true
    let t: ReturnType<typeof setTimeout>
    const jump = () => {
      Animated.sequence([
        Animated.timing(hopSq, { toValue: -1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(hopY, { toValue: -h.h, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hopSq, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(hopY, { toValue: 0, duration: 230, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(hopSq, { toValue: -0.7, duration: 230, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.spring(hopSq, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start()
      t = setTimeout(() => { if (alive) jump() }, h.min + Math.random() * (h.max - h.min))
    }
    t = setTimeout(() => { if (alive) jump() }, 700 + Math.random() * 1400)
    return () => { alive = false; clearTimeout(t) }
  }, [tier, hopY, hopSq])

  // Tap to play — a quick giggle.
  function giggle() {
    haptic.light()
    poke.stopAnimation(); wiggle.stopAnimation()
    Animated.parallel([
      Animated.sequence([
        Animated.timing(poke, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(poke, { toValue: 0, friction: 3.2, tension: 220, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 110, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0.6, duration: 100, useNativeDriver: true }),
        Animated.spring(wiggle, { toValue: 0, friction: 3.2, tension: 200, useNativeDriver: true }),
      ]),
    ]).start()
    onPoke?.()
  }

  // ── transforms ────────────────────────────────────────────────────────────────
  const s = cfg.squash
  const breatheY = idle.interpolate({ inputRange: [0, 1], outputRange: [-cfg.amp, cfg.amp * 0.3] })
  const jigX = idle.interpolate({ inputRange: [0, 1], outputRange: [1 + s, 1 - s * 0.6] })
  const jigY = idle.interpolate({ inputRange: [0, 1], outputRange: [1 - s, 1 + s * 0.6] })
  const sway = idle.interpolate({ inputRange: [0, 1], outputRange: [`-${cfg.sway}deg`, `${cfg.sway}deg`] })
  const shiverX = shiver.interpolate({ inputRange: [-1, 1], outputRange: [-1.8, 1.8] })
  const hopX = hopSq.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.1, 1, 0.9] })
  const hopSY = hopSq.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.88, 1, 1.12] })
  const pokeScale = poke.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] })
  const wiggleDeg = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] })

  return (
    <Pressable onPress={giggle} hitSlop={6} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* hop layer */}
      <Animated.View style={{ transform: [{ translateY: hopY }, { scaleX: hopX }, { scaleY: hopSY }] }}>
        {/* breathe + sway layer */}
        <Animated.View style={{ transform: [{ translateY: breatheY }, { rotate: sway }, { scaleX: jigX }, { scaleY: jigY }] }}>
          {/* react + poke layer */}
          <Animated.View style={{ transform: [{ translateX: shiverX }, { scale: pop }, { scale: pokeScale }, { rotate: wiggleDeg }] }}>
            <Image source={IMAGES[tier]} style={{ width: size, height: size }} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}
