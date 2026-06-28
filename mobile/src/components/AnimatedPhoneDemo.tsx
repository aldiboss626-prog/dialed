import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import { FontFamily } from '@/constants/theme'

/**
 * A self-playing "video" of the product, rendered inside a phone frame. It loops
 * a full demo:
 *   1. Home — a push banner warns you forgot to reply to Bob.
 *   2. Inbox — you open Bob's waiting email.
 *   3. Reply — the AI drafts a response and you send it.
 *   4. Home — your network health visibly grows; Bob is warm again.
 *
 * The interior uses a fixed light product palette (independent of the live app
 * theme) so the mockup always looks like the marketing shot. Everything animates
 * on transform/opacity where possible to stay smooth.
 */

const SCREEN = '#FFFFFF'
const INK = '#101828'
const SUB = '#667085'
const FAINT = '#98A2B3'
const HAIR = '#EEF0F3'
const CHIP = '#F2F4F7'
const ACCENT = '#2563EB'
const RED = '#EF4444'
const AMBER = '#F59E0B'
const GREEN = '#16A34A'
const FRAME = '#0A0E17'
const HERO_BG = '#0C1E35'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Dial ring geometry.
const RING = 26
const RING_C = 2 * Math.PI * RING
const offsetForPct = (p: number) => RING_C * (1 - p / 100)

type Scene = 'home' | 'inbox' | 'reply' | 'grown'

function Ring({ dashoffset, color }: { dashoffset: Animated.Animated | number; color: string }) {
  return (
    <Svg width={62} height={62}>
      <Circle cx={31} cy={31} r={RING} stroke="rgba(255,255,255,0.14)" strokeWidth={6} fill="none" />
      <AnimatedCircle
        cx={31} cy={31} r={RING}
        stroke={color} strokeWidth={6} fill="none"
        strokeDasharray={RING_C}
        strokeDashoffset={dashoffset as any}
        strokeLinecap="round"
        transform="rotate(-90 31 31)"
      />
    </Svg>
  )
}

export function AnimatedPhoneDemo() {
  const { width: screenW } = useWindowDimensions()
  const PHONE_W = Math.min(Math.max(screenW * 0.62, 208), 244)
  const PHONE_H = Math.round(PHONE_W * 2.02)
  const bezel = 6

  // Scene cross-fade opacities.
  const op = useRef<Record<Scene, Animated.Value>>({
    home: new Animated.Value(1),
    inbox: new Animated.Value(0),
    reply: new Animated.Value(0),
    grown: new Animated.Value(0),
  }).current

  const bannerY = useRef(new Animated.Value(-60)).current
  const bannerOp = useRef(new Animated.Value(0)).current
  const grow = useRef(new Animated.Value(0)).current        // drives the grown dial 72 → 89
  const shimmer = useRef(new Animated.Value(0)).current     // "Generating…" pulse
  const bobRipple = useRef(new Animated.Value(0)).current
  const sendRipple = useRef(new Animated.Value(0)).current
  const draftLines = useRef([0, 1, 2].map(() => new Animated.Value(0))).current

  const [generating, setGenerating] = useState(false)
  const [sent, setSent] = useState(false)
  const [grownNum, setGrownNum] = useState(72)

  // Count the grown dial number up alongside the ring.
  useEffect(() => {
    const id = grow.addListener(({ value }) => setGrownNum(Math.round(72 + value * 17)))
    return () => grow.removeListener(id)
  }, [grow])

  // Always-running shimmer used by the "Generating…" state.
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [shimmer])

  // The looping demo timeline. One pending timeout at a time → clean teardown.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const crossTo = (name: Scene) => {
      (Object.keys(op) as Scene[]).forEach(k => {
        Animated.timing(op[k], { toValue: k === name ? 1 : 0, duration: 360, easing: Easing.out(Easing.ease), useNativeDriver: true }).start()
      })
    }
    const fire = (v: Animated.Value) => {
      v.setValue(0)
      Animated.timing(v, { toValue: 1, duration: 620, easing: Easing.out(Easing.ease), useNativeDriver: true }).start()
    }

    const beats: { run: () => void; hold: number }[] = [
      {
        run: () => {
          crossTo('home')
          bannerY.setValue(-60); bannerOp.setValue(0)
          grow.setValue(0)
          draftLines.forEach(v => v.setValue(0))
          setGenerating(false); setSent(false)
        },
        hold: 750,
      },
      {
        run: () => {
          Animated.parallel([
            Animated.spring(bannerY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
            Animated.timing(bannerOp, { toValue: 1, duration: 260, useNativeDriver: true }),
          ]).start()
        },
        hold: 2100,
      },
      {
        run: () => {
          crossTo('inbox')
          Animated.parallel([
            Animated.timing(bannerOp, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(bannerY, { toValue: -60, duration: 250, useNativeDriver: true }),
          ]).start()
        },
        hold: 1000,
      },
      { run: () => fire(bobRipple), hold: 950 },
      { run: () => crossTo('reply'), hold: 650 },
      { run: () => { setSent(false); draftLines.forEach(v => v.setValue(0)); setGenerating(true) }, hold: 950 },
      {
        run: () => {
          setGenerating(false)
          Animated.stagger(140, draftLines.map(v =>
            Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          )).start()
        },
        hold: 1050,
      },
      { run: () => { fire(sendRipple); setSent(true) }, hold: 950 },
      { run: () => crossTo('grown'), hold: 600 },
      {
        run: () => {
          Animated.timing(grow, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
        },
        hold: 2300,
      },
    ]

    let i = 0
    const tick = () => {
      const beat = beats[i % beats.length]
      beat.run()
      i++
      timer = setTimeout(tick, beat.hold)
    }
    tick()
    return () => clearTimeout(timer)
  }, [op, bannerY, bannerOp, grow, bobRipple, sendRipple, draftLines])

  // ── Shared chrome ─────────────────────────────────────────────────────────────
  const sceneStyle = (s: Scene) => ({
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    opacity: op[s],
    transform: [{ translateY: op[s].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  })

  return (
    <View style={{
      width: PHONE_W, height: PHONE_H, borderRadius: 38, backgroundColor: FRAME, padding: bezel,
      shadowColor: '#0B1220', shadowOffset: { width: 0, height: 22 }, shadowOpacity: 0.28, shadowRadius: 34, elevation: 16,
    }}>
      <View style={{ flex: 1, borderRadius: 32, backgroundColor: SCREEN, overflow: 'hidden' }}>
        {/* Status bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2, zIndex: 2 }}>
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, color: INK }}>9:41</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="cellular" size={11} color={INK} />
            <Ionicons name="wifi" size={11} color={INK} />
            <Ionicons name="battery-full" size={13} color={INK} />
          </View>
        </View>
        <View style={{ position: 'absolute', top: 9, alignSelf: 'center', width: PHONE_W * 0.3, height: 18, borderRadius: 12, backgroundColor: '#000', zIndex: 6 }} />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, zIndex: 2 }}>
          <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: INK, letterSpacing: 1 }}>
            DI<Text style={{ color: ACCENT }}>AL</Text>ED
          </Text>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5E7FB', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 9, color: ACCENT }}>AK</Text>
          </View>
        </View>

        {/* Scene area */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* ── Scene: HOME ── */}
          <Animated.View style={sceneStyle('home')} pointerEvents="none">
            <View style={{ paddingHorizontal: 12, gap: 10 }}>
              <View style={{ borderRadius: 16, backgroundColor: HERO_BG, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Ring dashoffset={offsetForPct(72)} color={AMBER} />
                  <Text style={{ position: 'absolute', fontFamily: FontFamily.display, fontSize: 18, color: '#fff' }}>72</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>THIS WEEK</Text>
                  <Text style={{ fontFamily: FontFamily.display, fontSize: 15, color: '#fff', marginTop: 2 }}>1 going cold</Text>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>Bob needs a reply</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, borderWidth: 1, borderColor: HAIR, padding: 10 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FDE8E8', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10.5, color: RED }}>BC</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11.5, color: INK }}>Bob Chen</Text>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 10, color: RED }}>12 days overdue</Text>
                </View>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: RED }} />
              </View>
            </View>
          </Animated.View>

          {/* ── Scene: INBOX ── */}
          <Animated.View style={sceneStyle('inbox')} pointerEvents="none">
            <View style={{ marginHorizontal: 14, height: 30, borderRadius: 9, backgroundColor: CHIP, flexDirection: 'row', padding: 3 }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, color: FAINT }}>Network</Text>
              </View>
              <View style={{ flex: 1, borderRadius: 7, backgroundColor: SCREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, color: INK }}>Inbox</Text>
                <View style={{ minWidth: 14, height: 14, borderRadius: 7, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 8.5, color: '#fff' }}>3</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11.5, color: INK, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 }}>Waiting on you</Text>
            <View style={{ paddingHorizontal: 12, gap: 8 }}>
              {[
                { n: 'Bob Chen', s: 'Re: Project deck — can you send…', i: 'BC', t: RED, top: true },
                { n: 'Maya Patel', s: 'Portfolio review this week?', i: 'MP', t: AMBER },
                { n: 'Aisha Khan', s: 'Fundraising playbook + intros', i: 'AK', t: FAINT },
              ].map((r, idx) => (
                <View key={idx} style={{ borderRadius: 12, borderWidth: 1, borderColor: r.top ? '#FBD5D5' : HAIR, backgroundColor: r.top ? '#FFF7F7' : SCREEN, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
                  {r.top && (
                    <Animated.View pointerEvents="none" style={{
                      position: 'absolute', left: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT,
                      opacity: bobRipple.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.16, 0] }),
                      transform: [{ scale: bobRipple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 4] }) }],
                    }} />
                  )}
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: r.t + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10.5, color: r.t }}>{r.i}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FontFamily.sansMedium, fontSize: 11.5, color: INK }}>{r.n}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: SUB }}>{r.s}</Text>
                  </View>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: r.t }} />
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Scene: REPLY ── */}
          <Animated.View style={sceneStyle('reply')} pointerEvents="none">
            <View style={{ paddingHorizontal: 12, gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="chevron-back" size={15} color={SUB} />
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: INK }}>Bob Chen</Text>
              </View>
              {/* incoming email */}
              <View style={{ borderRadius: 12, backgroundColor: CHIP, padding: 10, gap: 2 }}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10, color: SUB }}>Bob · Re: Project deck</Text>
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: INK, lineHeight: 15 }}>Hey — can you send over the latest deck before Friday?</Text>
              </View>
              {/* AI draft */}
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#D6E2FD', backgroundColor: '#F6F9FF', padding: 10, gap: 6, minHeight: 86 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="sparkles" size={11} color={ACCENT} />
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10, color: ACCENT }}>AI draft</Text>
                </View>
                {generating ? (
                  <Animated.Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: ACCENT, opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
                    Generating reply…
                  </Animated.Text>
                ) : (
                  <View style={{ gap: 4 }}>
                    {['Hi Bob — absolutely.', 'Sending the latest deck now;', 'let me know if Friday still works.'].map((line, k) => (
                      <Animated.Text key={k} style={{ fontFamily: FontFamily.sans, fontSize: 11, color: INK, lineHeight: 14, opacity: draftLines[k], transform: [{ translateY: draftLines[k].interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
                        {line}
                      </Animated.Text>
                    ))}
                  </View>
                )}
              </View>
              {/* send button */}
              <View style={{ height: 36, borderRadius: 11, backgroundColor: sent ? GREEN : ACCENT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, overflow: 'hidden' }}>
                <Animated.View pointerEvents="none" style={{
                  position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
                  opacity: sendRipple.interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 0.3, 0] }),
                  transform: [{ scale: sendRipple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 5] }) }],
                }} />
                <Ionicons name={sent ? 'checkmark' : 'paper-plane'} size={13} color="#fff" />
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: '#fff' }}>{sent ? 'Sent' : 'Send reply'}</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Scene: HOME (grown) ── */}
          <Animated.View style={sceneStyle('grown')} pointerEvents="none">
            <View style={{ paddingHorizontal: 12, gap: 10 }}>
              <View style={{ borderRadius: 16, backgroundColor: HERO_BG, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Ring dashoffset={grow.interpolate({ inputRange: [0, 1], outputRange: [offsetForPct(72), offsetForPct(89)] })} color={GREEN} />
                  <Text style={{ position: 'absolute', fontFamily: FontFamily.display, fontSize: 18, color: '#fff' }}>{grownNum}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>NETWORK HEALTH</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="arrow-up" size={12} color={GREEN} />
                    <Text style={{ fontFamily: FontFamily.display, fontSize: 15, color: '#fff' }}>+17 this week</Text>
                  </View>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>Bob is warm again</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, borderWidth: 1, borderColor: '#CDEAD7', backgroundColor: '#F1FAF4', padding: 10 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#DCF2E4', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10.5, color: GREEN }}>BC</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11.5, color: INK }}>Bob Chen</Text>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 10, color: GREEN }}>Replied · sent just now</Text>
                </View>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Push notification banner (over the home scene) */}
        <Animated.View style={{
          position: 'absolute', top: 30, left: 10, right: 10, zIndex: 8,
          opacity: bannerOp, transform: [{ translateY: bannerY }],
          flexDirection: 'row', alignItems: 'center', gap: 9,
          backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14,
          borderWidth: 1, borderColor: HAIR, paddingHorizontal: 10, paddingVertical: 9,
          shadowColor: '#0B1220', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 8,
        }} pointerEvents="none">
          <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="notifications" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 9.5, color: INK, letterSpacing: 0.4 }}>DIALED</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 9, color: FAINT }}>now</Text>
            </View>
            <Text numberOfLines={2} style={{ fontFamily: FontFamily.sans, fontSize: 10.5, color: SUB, lineHeight: 14, marginTop: 1 }}>
              You forgot to reply to <Text style={{ fontFamily: FontFamily.sansMedium, color: INK }}>Bob</Text> — he's going cold.
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  )
}
