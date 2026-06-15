import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Line } from 'react-native-svg'
import * as ContactsAPI from 'expo-contacts'
import * as NotificationsAPI from 'expo-notifications'
import * as ImagePickerAPI from 'expo-image-picker'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { FontFamily } from '@/constants/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

type PermKey = 'contacts' | 'notifications' | 'gmail' | 'calendar' | 'photos'
type GrantStatus = 'granted' | 'denied' | 'skipped'

interface Perm {
  key: PermKey
  icon: string
  accent: string
  eyebrow: string
  title: string
  body: string
  pro?: boolean
  comingSoon?: boolean
  requestable: boolean
}

// ── Permission definitions ────────────────────────────────────────────────────

const PERMS: Perm[] = [
  {
    key: 'contacts', icon: 'people-outline', accent: '#2563EB',
    eyebrow: 'Step 1 of 5',
    title: 'Bring in your people',
    body: "Dialed reads your contacts so you can add the people who matter in seconds — no typing every name by hand.",
    requestable: true,
  },
  {
    key: 'notifications', icon: 'notifications-outline', accent: '#F59E0B',
    eyebrow: 'Step 2 of 5',
    title: 'Never let one go cold',
    body: "We'll nudge you the moment a key relationship is overdue — louder as deadlines near, quiet when all is well.",
    requestable: true,
  },
  {
    key: 'gmail', icon: 'mail-outline', accent: '#16A34A',
    eyebrow: 'Step 3 of 5 · Pro',
    title: 'Catch the replies you owe',
    body: "Connect Gmail and Dialed spots conversations waiting on you, so no opportunity slips through your inbox.",
    pro: true,
    requestable: false,
  },
  {
    key: 'calendar', icon: 'calendar-outline', accent: '#EF4444',
    eyebrow: 'Step 4 of 5',
    title: 'Time your reach-outs',
    body: "See deadlines and meetings alongside your contacts, so you reconnect before it actually counts.",
    comingSoon: true,
    requestable: false,
  },
  {
    key: 'photos', icon: 'images-outline', accent: '#2563EB',
    eyebrow: 'Step 5 of 5',
    title: 'Make it personal',
    body: "Add faces to your contacts and use AI tools like outfit check. Photos stay on your device until you choose to use them.",
    requestable: true,
  },
]

const TOTAL_STEPS = PERMS.length + 2 // thank-you + perms + all-set

async function requestNativePermission(key: PermKey): Promise<GrantStatus> {
  try {
    if (key === 'contacts') {
      const { status } = await ContactsAPI.requestPermissionsAsync()
      return status === 'granted' ? 'granted' : 'denied'
    }
    if (key === 'notifications') {
      const { status } = await NotificationsAPI.requestPermissionsAsync()
      return status === 'granted' ? 'granted' : 'denied'
    }
    if (key === 'photos') {
      const { status } = await ImagePickerAPI.requestMediaLibraryPermissionsAsync()
      return status === 'granted' ? 'granted' : 'denied'
    }
    return 'granted'
  } catch {
    return 'denied'
  }
}

// ── Orbit graphic ─────────────────────────────────────────────────────────────

function OrbitGraphic({ icon, accent, granted }: {
  icon: string
  accent: string
  granted: boolean
}) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(scale, {
      toValue: granted ? 1.06 : 1,
      damping: 14, stiffness: 180, useNativeDriver: true,
    }).start()
  }, [granted])

  return (
    <View style={{ width: 300, height: 232, alignSelf: 'center' }}>
      {/* soft halo */}
      <View style={{
        position: 'absolute', top: 4, left: 58,
        width: 196, height: 196, borderRadius: 98,
        backgroundColor: accent, opacity: 0.11,
      }} />

      {/* connector lines */}
      <Svg width={300} height={232} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Path
          d="M86 150 Q122 150 138 120"
          fill="none" stroke="rgba(13,21,38,0.18)"
          strokeWidth="1.6" strokeLinecap="round"
        />
        <Path
          d="M150 108 Q176 96 190 74"
          fill="none" stroke="rgba(13,21,38,0.18)"
          strokeWidth="1.6" strokeLinecap="round"
        />
        <Path
          d="M150 116 Q150 150 196 162"
          fill="none" stroke="rgba(13,21,38,0.18)"
          strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray="2 5"
        />
      </Svg>

      {/* hero permission tile */}
      <Animated.View style={{
        position: 'absolute', top: 26, left: 170,
        width: 78, height: 78, borderRadius: 20,
        backgroundColor: accent,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: accent, shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
        transform: [{ scale }],
      }}>
        <Ionicons name={icon as any} size={38} color="#fff" />
      </Animated.View>

      {/* secondary contact tile */}
      <View style={{
        position: 'absolute', top: 120, left: 44,
        width: 58, height: 58, borderRadius: 16,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10, shadowRadius: 14, elevation: 6,
      }}>
        <View style={{
          width: 34, height: 34, borderRadius: 11,
          backgroundColor: accent + '22',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: FontFamily.display, fontSize: 12, color: accent }}>
            MK
          </Text>
        </View>
      </View>

      {/* central check node */}
      <View style={{
        position: 'absolute', top: 96, left: 130,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: granted ? accent : '#fff',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
      }}>
        <Ionicons name="checkmark" size={14} color={granted ? '#fff' : accent} />
      </View>

      {/* floating name labels */}
      <Text style={{ position: 'absolute', top: 18, left: 24, fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#5C6B8A' }}>
        Prof. Lee
      </Text>
      <Text style={{ position: 'absolute', top: 188, left: 96, fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#5C6B8A' }}>
        Maya K.
      </Text>
      <Text style={{ position: 'absolute', top: 150, left: 198, fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#95A2BC' }}>
        Recruiter
      </Text>
    </View>
  )
}

// ── Constellation (all-set screen) ────────────────────────────────────────────

const PENTA: { x: number; y: number }[] = [
  { x: 150, y: 56 },
  { x: 224, y: 110 },
  { x: 196, y: 192 },
  { x: 104, y: 192 },
  { x: 76, y: 110 },
]

function ConstellationGraphic({ results, accent }: {
  results: Partial<Record<PermKey, GrantStatus>>
  accent: string
}) {
  return (
    <View style={{ width: 300, height: 244, alignSelf: 'center' }}>
      <Svg width={300} height={244} style={{ position: 'absolute', top: 0, left: 0 }}>
        {PENTA.map((p, i) => {
          const n = PENTA[(i + 1) % PENTA.length]
          return (
            <Line key={i}
              x1={p.x} y1={p.y} x2={n.x} y2={n.y}
              stroke="rgba(13,21,38,0.12)" strokeWidth="1.4"
            />
          )
        })}
      </Svg>
      {/* center glow */}
      <View style={{
        position: 'absolute', top: 80, left: 108,
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: accent, opacity: 0.12,
      }} />
      {PERMS.map((perm, i) => {
        const on = results[perm.key] === 'granted'
        const p = PENTA[i]
        return (
          <View key={perm.key} style={{
            position: 'absolute',
            top: p.y - 25, left: p.x - 25,
            width: 50, height: 50, borderRadius: 15,
            backgroundColor: on ? perm.accent : '#fff',
            borderWidth: on ? 0 : 1.5, borderColor: 'rgba(0,0,0,0.07)',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: on ? perm.accent : '#000',
            shadowOffset: { width: 0, height: on ? 8 : 4 },
            shadowOpacity: on ? 0.30 : 0.06,
            shadowRadius: on ? 16 : 10, elevation: on ? 8 : 2,
          }}>
            <Ionicons name={perm.icon as any} size={24} color={on ? '#fff' : '#95A2BC'} />
          </View>
        )
      })}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4, gap: 16,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(13,21,38,0.05)',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    progressTrack: {
      flex: 1, height: 4, borderRadius: 99,
      backgroundColor: 'rgba(13,21,38,0.08)', overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 99 },
    // graphic area
    graphicWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8,
    },
    // copy
    copy: { paddingHorizontal: 28 },
    eyebrow: {
      fontFamily: FontFamily.sansMedium, fontSize: 11,
      letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12,
    },
    title: {
      fontFamily: FontFamily.display, fontSize: 31,
      color: '#0D1526', lineHeight: 37,
    },
    body: {
      marginTop: 14, fontFamily: FontFamily.sans,
      fontSize: 15.5, color: '#5C6B8A', lineHeight: 24,
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, marginTop: 10,
    },
    badgeText: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
    // cta
    cta: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 28, gap: 6 },
    primaryBtn: {
      height: 56, borderRadius: 18, backgroundColor: '#0D1526',
      alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: {
      fontFamily: FontFamily.display, fontSize: 17, color: c.background,
    },
    ghostBtn: {
      height: 44, alignItems: 'center', justifyContent: 'center',
    },
    ghostText: {
      fontFamily: FontFamily.sans, fontSize: 15,
      fontWeight: '500', color: '#95A2BC',
    },
    // thank-you
    tyWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 36,
    },
    tyHalo: {
      width: 96, height: 96, borderRadius: 48,
      alignItems: 'center', justifyContent: 'center', marginBottom: 34,
    },
    tyIconInner: {
      width: 60, height: 60, borderRadius: 30,
      alignItems: 'center', justifyContent: 'center',
    },
    tyEyebrow: {
      fontFamily: FontFamily.sansMedium, fontSize: 11,
      letterSpacing: 1.8, textTransform: 'uppercase',
      marginBottom: 14, textAlign: 'center',
    },
    tyTitle: {
      fontFamily: FontFamily.display, fontSize: 40,
      color: '#0D1526', lineHeight: 46, textAlign: 'center',
    },
    tyBody: {
      marginTop: 18, fontFamily: FontFamily.sans,
      fontSize: 15.5, color: '#5C6B8A', lineHeight: 25, textAlign: 'center',
    },
    // all-set copy
    asCopy: { paddingHorizontal: 28 },
    asBadge: {
      fontFamily: FontFamily.sansMedium, fontSize: 11,
      letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12,
    },
    asTitle: {
      fontFamily: FontFamily.display, fontSize: 44,
      color: '#0D1526', lineHeight: 50,
    },
    asSub: {
      marginTop: 14, fontFamily: FontFamily.sans,
      fontSize: 15.5, color: '#5C6B8A', lineHeight: 24,
    },
  })
}

// ── Sub-screens ───────────────────────────────────────────────────────────────

function ThankYouScreen({ c, s, accent, onContinue }: {
  c: ColorPalette
  s: ReturnType<typeof makeStyles>
  accent: string
  onContinue: () => void
}) {
  return (
    <>
      <View style={s.tyWrap}>
        <View style={[s.tyHalo, { backgroundColor: accent + '1A' }]}>
          <View style={[s.tyIconInner, {
            backgroundColor: accent,
            shadowColor: accent, shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4, shadowRadius: 24, elevation: 10,
          }]}>
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
        </View>
        <Text style={[s.tyEyebrow, { color: accent }]}>You're in good hands</Text>
        <Text style={s.tyTitle}>Thank you for{'\n'}trusting us.</Text>
        <Text style={s.tyBody}>
          Your network is yours alone. Everything Dialed learns stays private — we'll only ever use it to help you show up for the people who matter.
        </Text>
      </View>
      <View style={s.cta}>
        <TouchableOpacity style={s.primaryBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Set up Dialed</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

function PermScreen({ s, perm, granted, onAllow, onSkip }: {
  s: ReturnType<typeof makeStyles>
  perm: Perm
  granted: boolean
  onAllow: () => void
  onSkip: () => void
}) {
  return (
    <>
      <View style={s.graphicWrap}>
        <OrbitGraphic icon={perm.icon} accent={perm.accent} granted={granted} />
      </View>
      <View style={s.copy}>
        <Text style={[s.eyebrow, { color: perm.accent }]}>{perm.eyebrow}</Text>
        <Text style={s.title}>{perm.title}</Text>
        <Text style={s.body}>{perm.body}</Text>
        {perm.pro && (
          <View style={[s.badge, { backgroundColor: '#16A34A' + '18', borderColor: '#16A34A' + '28' }]}>
            <Text style={[s.badgeText, { color: '#16A34A' }]}>Requires Pro · Connect in Settings</Text>
          </View>
        )}
        {perm.comingSoon && (
          <View style={[s.badge, { backgroundColor: 'rgba(149,162,188,0.14)', borderColor: 'rgba(149,162,188,0.25)' }]}>
            <Text style={[s.badgeText, { color: '#95A2BC' }]}>Coming soon</Text>
          </View>
        )}
      </View>
      <View style={s.cta}>
        <TouchableOpacity style={s.primaryBtn} onPress={onAllow} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>
            {perm.requestable ? 'Allow access' : 'Continue'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ghostBtn} onPress={onSkip} activeOpacity={0.7}>
          <Text style={s.ghostText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

function AllSetScreen({ s, accent, results, grantedCount, onContinue }: {
  s: ReturnType<typeof makeStyles>
  accent: string
  results: Partial<Record<PermKey, GrantStatus>>
  grantedCount: number
  onContinue: () => void
}) {
  return (
    <>
      <View style={s.graphicWrap}>
        <ConstellationGraphic results={results} accent={accent} />
      </View>
      <View style={s.asCopy}>
        <Text style={[s.asBadge, { color: accent }]}>
          {grantedCount} of {PERMS.length} connected
        </Text>
        <Text style={s.asTitle}>You're{'\n'}all set.</Text>
        <Text style={s.asSub}>
          Dialed is ready to keep your circle warm. Unlock Pro to get the most out of your network.
        </Text>
      </View>
      <View style={s.cta}>
        <TouchableOpacity style={s.primaryBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Unlock Dialed Pro</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ghostBtn} onPress={onContinue} activeOpacity={0.7}>
          <Text style={s.ghostText}>I'll finish later</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function PermissionsScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [results, setResults] = useState<Partial<Record<PermKey, GrantStatus>>>({})
  const [grantedFx, setGrantedFx] = useState(false)

  const isThanks = step === 0
  const isAllSet = step === TOTAL_STEPS - 1
  const permIndex = step - 1
  const perm = (!isThanks && !isAllSet) ? PERMS[permIndex] : null
  const accent = perm ? perm.accent : '#2563EB'
  const progress = step / (TOTAL_STEPS - 1)

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    fadeAnim.setValue(0)
    slideAnim.setValue(20)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
    ]).start()
    setGrantedFx(false)
  }, [step])

  const advance = useCallback(() => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)), [])
  const back = useCallback(() => setStep(s => Math.max(s - 1, 0)), [])

  async function onAllow() {
    if (!perm) return
    const status = perm.requestable
      ? await requestNativePermission(perm.key)
      : 'granted'
    setResults(r => ({ ...r, [perm.key]: status }))
    setGrantedFx(status === 'granted')
    setTimeout(advance, status === 'granted' ? 520 : 0)
  }

  function onSkip() {
    if (perm) setResults(r => ({ ...r, [perm.key]: 'skipped' }))
    advance()
  }

  function finish() {
    router.replace('/upgrade' as any)
  }

  const grantedCount = Object.values(results).filter(v => v === 'granted').length

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={back}
          disabled={step === 0}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={step === 0 ? 'transparent' : '#0D1526'}
          />
        </TouchableOpacity>
        <View style={[s.progressTrack, { opacity: isThanks ? 0 : 1 }]}>
          <View style={[s.progressFill, {
            width: `${Math.round(progress * 100)}%` as any,
            backgroundColor: accent,
          }]} />
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {isThanks && (
          <ThankYouScreen c={c} s={s} accent={accent} onContinue={advance} />
        )}
        {perm && (
          <PermScreen
            s={s} perm={perm}
            granted={grantedFx || results[perm.key] === 'granted'}
            onAllow={onAllow}
            onSkip={onSkip}
          />
        )}
        {isAllSet && (
          <AllSetScreen
            s={s} accent={accent}
            results={results}
            grantedCount={grantedCount}
            onContinue={finish}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  )
}
