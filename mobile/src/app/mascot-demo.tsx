import { useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { Bob, bobMoodLabel, bobColor } from '@/components/Bob'

const MAX = 110
const PRESETS = [
  { label: 'Critical', score: 5 },
  { label: 'Low', score: 25 },
  { label: 'Okay', score: 50 },
  { label: 'Good', score: 75 },
  { label: 'Great', score: 100 },
  { label: 'Super', score: 110 },
]

export default function MascotDemoScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()
  const [score, setScore] = useState(72)
  const trackWRef = useRef(0)

  const setFromX = (x: number) => {
    const w = trackWRef.current
    if (w > 0) setScore(Math.max(0, Math.min(MAX, Math.round((x / w) * MAX))))
  }
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: e => setFromX(e.nativeEvent.locationX),
    })
  ).current

  const col = bobColor(score)
  const label = bobMoodLabel(score)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={26} color={c.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Meet Bob</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.stage}>
        <Bob score={score} size={200} />
        <Text style={[s.mood, { color: col }]}>{label}</Text>
        <Text style={s.scoreLine}>Network health · <Text style={{ color: col, fontFamily: FontFamily.display }}>{score}</Text></Text>
      </View>

      <View style={s.controls}>
        {/* Drag slider */}
        <View
          style={s.track}
          onLayout={e => { trackWRef.current = e.nativeEvent.layout.width }}
          {...pan.panHandlers}
        >
          <View style={[s.fill, { width: `${(score / MAX) * 100}%`, backgroundColor: col }]} />
          <View style={[s.thumb, { left: `${(score / MAX) * 100}%`, borderColor: col }]} />
        </View>
        <Text style={s.hint}>Drag to change Bob's health</Text>

        {/* Presets */}
        <View style={s.presetRow}>
          {PRESETS.map(p => {
            const active = Math.abs(p.score - score) < 8
            return (
              <TouchableOpacity
                key={p.label}
                onPress={() => setScore(p.score)}
                activeOpacity={0.8}
                style={[s.chip, active && { borderColor: bobColor(p.score), backgroundColor: bobColor(p.score) + '14' }]}
              >
                <Text style={[s.chipText, active && { color: bobColor(p.score) }]}>{p.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </SafeAreaView>
  )
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 8,
    },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontFamily: FontFamily.sansMedium, fontSize: 17, color: c.primary },

    stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    mood: { fontFamily: FontFamily.display, fontSize: 30, marginTop: 8 },
    scoreLine: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary },

    controls: { paddingHorizontal: 28, paddingBottom: 36, gap: 14 },
    track: {
      height: 10, borderRadius: 5, backgroundColor: c.elevated,
      justifyContent: 'center', marginTop: 8,
    },
    fill: { position: 'absolute', left: 0, height: 10, borderRadius: 5 },
    thumb: {
      position: 'absolute', width: 26, height: 26, borderRadius: 13, marginLeft: -13,
      backgroundColor: c.surface, borderWidth: 3,
      shadowColor: '#0B1220', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
    },
    hint: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.tertiary, textAlign: 'center' },

    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, justifyContent: 'center' },
    chip: {
      flexBasis: '30%', flexGrow: 1, paddingVertical: 10, borderRadius: Radius.full,
      borderWidth: 1.5, borderColor: c.subtleBorder, alignItems: 'center',
    },
    chipText: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.secondary },
  })
}
