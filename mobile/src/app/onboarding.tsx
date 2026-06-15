import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { FontFamily, Radius, Spacing } from '@/constants/theme'

export const ONBOARDED_KEY = 'dialed_onboarded'
const PROFILE_KEY = 'dialed_onboarding_profile'

// ── Step map ─────────────────────────────────────────────────────────────────
// 0   first name        (text input)
// 1   age range         (select)
// 2   career stage      (select)
// 3   main goal         (select)
// 4   biggest blocker   (select)
// 5   recognition       (tappable feature-preview checklist)
// 6   consequence slide (animated cards)
// 7   social proof
// 8   loading           (auto-advances → 9)
// 9   trust slide       (thank you graphic)
// 10  results           (animated chart)
// 11  save progress     (account creation)

const TOTAL_PROGRESS_STEPS = 11 // steps 0–10 show the bar

const AGE_OPTIONS = [
  { label: '18 – 20', value: '18_20' },
  { label: '21 – 23', value: '21_23' },
  { label: '24 – 26', value: '24_26' },
  { label: '27 or older', value: '27_plus' },
]

const STAGE_OPTIONS = [
  { label: 'Freshman / Sophomore', value: 'freshman_sophomore' },
  { label: 'Junior / Senior', value: 'junior_senior' },
  { label: 'Recent Graduate', value: 'recent_grad' },
  { label: 'Early Career', value: 'early_career' },
]

const GOAL_OPTIONS = [
  { label: 'Land an internship or job', value: 'land_job' },
  { label: 'Grow my network', value: 'grow_network' },
  { label: "Stay in touch with people I've met", value: 'stay_in_touch' },
  { label: 'Find a mentor', value: 'find_mentor' },
]

const BLOCKER_OPTIONS = [
  { label: "I don't know who to reach out to", value: 'dont_know_who' },
  { label: 'I never follow up', value: 'never_follow_up' },
  { label: 'Starting conversations feels awkward', value: 'conversations_awkward' },
  { label: 'I lose track of contacts', value: 'lose_track' },
]

const CONSEQUENCES = [
  {
    icon: 'time-outline' as const,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.06)',
    title: 'The recruiter moves on.',
    body: "You emailed them months ago and never followed up. They're filling the role with someone who stayed in touch.",
  },
  {
    icon: 'people-outline' as const,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    title: 'The referral goes to someone else.',
    body: "Your contact has an open role. They think of three people who reached out this month. You're not one of them.",
  },
  {
    icon: 'trending-down-outline' as const,
    color: '#8592A8',
    bg: 'rgba(133,146,168,0.06)',
    title: 'The mentor stops advocating.',
    body: "They would have put your name forward — but you went quiet, and they assumed you figured it out on your own.",
  },
]

const LOADING_ITEMS = [
  'Mapping your relationship gaps',
  'Setting up follow-up alerts',
  'Identifying who\'s going cold',
  'Building your outreach cadence',
]

const HEALTH_BARS = [28, 42, 55, 68, 80, 93]

// ── Social proof slide ────────────────────────────────────────────────────────

function SocialProofSlide({ c, onNext }: { c: ColorPalette; onNext: () => void }) {
  const card1 = useRef({ op: new Animated.Value(0), ty: new Animated.Value(20) }).current
  const arr1  = useRef(new Animated.Value(0)).current
  const card2 = useRef({ op: new Animated.Value(0), ty: new Animated.Value(20) }).current
  const arr2  = useRef(new Animated.Value(0)).current
  const card3 = useRef({ op: new Animated.Value(0), ty: new Animated.Value(20) }).current
  const btm   = useRef(new Animated.Value(0)).current

  function animCard(ref: { op: Animated.Value; ty: Animated.Value }) {
    return Animated.parallel([
      Animated.timing(ref.op, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(ref.ty, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: true }),
    ])
  }

  useEffect(() => {
    Animated.sequence([
      animCard(card1),
      Animated.timing(arr1, { toValue: 1, duration: 120, useNativeDriver: true }),
      animCard(card2),
      Animated.timing(arr2, { toValue: 1, duration: 120, useNativeDriver: true }),
      animCard(card3),
      Animated.timing(btm, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
  }, [])

  const s = spStyles(c)
  return (
    <View style={s.wrap}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>
          {'Your network is your '}
          <Text style={s.titleAccent}>unfair advantage.</Text>
        </Text>
        <Text style={s.sub}>
          {'The best opportunities don\'t come from applications.\n'}
          <Text style={s.subAccent}>They come from people.</Text>
        </Text>
      </View>

      {/* Flow */}
      <View style={s.flow}>
        {/* Card 1 — Relationship */}
        <Animated.View style={[s.card, s.card1, { opacity: card1.op, transform: [{ translateY: card1.ty }] }]}>
          <View style={s.badge}>
            <Ionicons name="link-outline" size={9} color={c.gold} />
            <Text style={[s.badgeTxt, { color: c.gold }]}>RELATIONSHIP</Text>
          </View>
          <View style={s.row}>
            <View style={s.avatar}>
              <Ionicons name="person" size={15} color={c.secondary} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={s.cardName}>Sarah Kim</Text>
              <Text style={s.cardSub}>Recruiter at Google</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 1 }}>
              <Text style={s.metaLbl}>Last contact</Text>
              <Text style={s.metaVal}>3 days ago</Text>
            </View>
          </View>
          <View style={s.healthRow}>
            <Ionicons name="checkmark-circle-outline" size={11} color={c.success} />
            <Text style={[s.warnTxt, { color: c.success }]} numberOfLines={1}>Relationship strong — keep it up</Text>
            <View style={[s.scorePill, { backgroundColor: c.success + '14', borderColor: c.success + '24' }]}>
              <Text style={[s.scoreNum, { color: c.success }]}>92</Text>
            </View>
          </View>
        </Animated.View>

        {/* Arrow 1 */}
        <Animated.View style={[s.arrowRow, { opacity: arr1 }]}>
          <Ionicons name="arrow-down" size={14} color={c.warning} />
        </Animated.View>

        {/* Card 2 — Opportunity */}
        <Animated.View style={[s.card, s.card2, { opacity: card2.op, transform: [{ translateY: card2.ty }] }]}>
          <View style={s.badge}>
            <Text style={[s.badgeTxt, { color: '#F59E0B' }]}>OPPORTUNITY</Text>
          </View>
          <View style={s.row}>
            <View style={[s.iconCircle, { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.22)' }]}>
              <Ionicons name="briefcase" size={15} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={s.cardName}>Google Summer Internship</Text>
              <Text style={s.cardSub}>Referral Opportunity</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 1 }}>
              <Text style={s.metaLbl}>Deadline</Text>
              <Text style={[s.metaVal, { color: c.overdue }]}>5 days</Text>
            </View>
          </View>
          <View style={[s.healthRow, { gap: 4 }]}>
            <Ionicons name="person-outline" size={10} color={c.tertiary} />
            <Text style={[s.warnTxt, { color: c.tertiary, flex: 0 }]}>From Sarah Kim</Text>
          </View>
        </Animated.View>

        {/* Arrow 2 */}
        <Animated.View style={[s.arrowRow, { opacity: arr2 }]}>
          <Ionicons name="arrow-down" size={14} color={c.success} />
        </Animated.View>

        {/* Card 3 — Outcome */}
        <Animated.View style={[s.card, s.card3, { opacity: card3.op, transform: [{ translateY: card3.ty }] }]}>
          <View style={s.badge}>
            <Text style={[s.badgeTxt, { color: c.success }]}>OUTCOME</Text>
          </View>
          <View style={[s.row, { alignItems: 'center' }]}>
            <View style={[s.iconCircle, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.22)' }]}>
              <Ionicons name="trophy" size={15} color={c.success} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[s.cardName, { color: c.success }]}>Interview Scheduled!</Text>
              <Text style={s.cardSub}>You're one step closer.</Text>
            </View>
            <Ionicons name="checkmark-circle" size={26} color={c.success} />
          </View>
        </Animated.View>
      </View>

      {/* Bottom */}
      <Animated.View style={[s.bottom, { opacity: btm }]}>
        <View style={s.bottomRow}>
          <Ionicons name="heart-outline" size={13} color={c.gold} style={{ marginTop: 2, flexShrink: 0 }} />
          <Text style={s.bottomTxt}>
            {'The people on your contact list right now could open doors that applications never will. '}
            <Text style={[s.bottomTxt, { color: c.gold }]}>But only if the relationship is still warm.</Text>
          </Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
          <Text style={s.btnTxt}>Let's build your network</Text>
          <Ionicons name="arrow-forward" size={16} color={c.background} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

function spStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22, justifyContent: 'space-between' },
    header: { gap: 6 },
    title: { fontFamily: FontFamily.display, fontSize: 28, color: c.primary, lineHeight: 34 },
    titleAccent: { fontFamily: FontFamily.display, fontSize: 28, color: c.gold, lineHeight: 34 },
    sub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 19 },
    subAccent: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    flow: { gap: 0 },
    card: {
      borderRadius: Radius.card, borderWidth: 1.5,
      paddingHorizontal: 13, paddingTop: 9, paddingBottom: 11, gap: 7,
    },
    card1: { backgroundColor: c.surface, borderColor: c.subtleBorder },
    card2: { backgroundColor: c.surface, borderColor: c.subtleBorder },
    card3: { backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.22)' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    badgeTxt: { fontFamily: FontFamily.sansMedium, fontSize: 9, letterSpacing: 1.4 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    avatar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    iconCircle: {
      width: 34, height: 34, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    cardName: { fontFamily: FontFamily.display, fontSize: 14, color: c.primary, lineHeight: 18 },
    cardSub: { fontFamily: FontFamily.sans, fontSize: 11, color: c.secondary, lineHeight: 15 },
    metaLbl: { fontFamily: FontFamily.sans, fontSize: 9, color: c.tertiary },
    metaVal: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: c.primary },
    healthRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    warnTxt: { fontFamily: FontFamily.sans, fontSize: 10, color: c.warning, flex: 1 },
    scorePill: {
      backgroundColor: c.gold + '14', borderRadius: 7,
      paddingHorizontal: 7, paddingVertical: 2,
      borderWidth: 1, borderColor: c.gold + '24',
    },
    scoreNum: { fontFamily: FontFamily.display, fontSize: 13, color: c.gold },
    arrowRow: { alignItems: 'center', paddingVertical: 4 },
    bottom: { gap: 12 },
    bottomRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
    bottomTxt: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, lineHeight: 18, flex: 1 },
    btn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 15, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8,
    },
    btnTxt: { fontFamily: FontFamily.display, fontSize: 16, color: c.background },
  })
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, c }: { step: number; c: ColorPalette }) {
  const pct = Math.min(((step + 1) / TOTAL_PROGRESS_STEPS) * 100, 100)
  return (
    <View style={{ height: 3, backgroundColor: c.border, borderRadius: 2 }}>
      <View style={{ height: 3, backgroundColor: c.gold, borderRadius: 2, width: `${pct}%` }} />
    </View>
  )
}

// ── Name step ─────────────────────────────────────────────────────────────────

function NameStep({ firstName, setFirstName, onContinue, c }: {
  firstName: string
  setFirstName: (v: string) => void
  onContinue: () => void
  c: ColorPalette
}) {
  const s = nameStyles(c)
  const inputRef = useRef<TextInput>(null)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [])
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.top}>
          <Text style={s.title}>{"First, what's\nyour name?"}</Text>
          <Text style={s.subtitle}>
            We'll use it to make your plan feel like it was built specifically for you — not a template.
          </Text>
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder="First name"
            placeholderTextColor={c.tertiary}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => firstName.trim() && onContinue()}
          />
        </View>
        <TouchableOpacity
          style={[s.btn, !firstName.trim() && s.btnDisabled]}
          onPress={onContinue}
          disabled={!firstName.trim()}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function nameStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 36, justifyContent: 'space-between' },
    top: { gap: 16 },
    title: { fontFamily: FontFamily.display, fontSize: 40, color: c.primary, lineHeight: 46 },
    subtitle: { fontFamily: FontFamily.sans, fontSize: 17, color: c.secondary, lineHeight: 25 },
    input: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: c.subtleBorder,
      paddingHorizontal: 20, paddingVertical: 20,
      fontFamily: FontFamily.display, fontSize: 28, color: c.primary, marginTop: 12,
    },
    btn: { backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 18, alignItems: 'center', marginTop: 32 },
    btnDisabled: { opacity: 0.25 },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
  })
}

// ── Select step ───────────────────────────────────────────────────────────────

function SelectStep({ title, subtitle, options, selected, onSelect, c }: {
  title: string
  subtitle?: string
  options: { label: string; value: string }[]
  selected: string
  onSelect: (v: string) => void
  c: ColorPalette
}) {
  const s = selectStyles(c)
  return (
    <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      <View style={s.options}>
        {options.map(opt => {
          const active = selected === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              style={[s.option, active && s.optionActive]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[s.optionText, active && s.optionTextActive]}>{opt.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={c.gold} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}

function selectStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32, gap: 4 },
    title: { fontFamily: FontFamily.display, fontSize: 36, color: c.primary, lineHeight: 42, marginBottom: 8 },
    subtitle: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 23, marginBottom: 16 },
    options: { gap: 12, marginTop: 4 },
    option: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: c.subtleBorder,
      paddingHorizontal: 20, paddingVertical: 20,
    },
    optionActive: { borderColor: c.gold, backgroundColor: c.elevated },
    optionText: { fontFamily: FontFamily.sans, fontSize: 17, color: c.secondary, flex: 1 },
    optionTextActive: { color: c.primary, fontFamily: FontFamily.sansMedium },
  })
}

// ── Recognition / feature-preview slide ──────────────────────────────────────

const RECOGNITION_ITEMS = [
  {
    icon: 'mail-unread-outline' as const,
    accent: '#2563EB',
    behavior: "I've forgotten to reply to an important email",
    feature: 'Pending response alerts — Dialed flags it before you lose them',
  },
  {
    icon: 'notifications-outline' as const,
    accent: '#F59E0B',
    behavior: "I'd follow up more if something reminded me",
    feature: 'Smart nudges tell you exactly when to reach out',
  },
  {
    icon: 'people-outline' as const,
    accent: '#8B5CF6',
    behavior: "I've lost track of someone I meant to stay close with",
    feature: "Health scores show who's going cold before it's too late",
  },
  {
    icon: 'trending-down-outline' as const,
    accent: '#EF4444',
    behavior: "A good relationship slipped away and I didn't notice",
    feature: 'Escalation alerts catch the silence before it becomes permanent',
  },
]

function RecognitionSlide({ c, onNext }: { c: ColorPalette; onNext: () => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const itemAnims = useRef(RECOGNITION_ITEMS.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(16),
  }))).current
  const btnAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.stagger(120, [
      ...itemAnims.map(({ opacity, translateY }) =>
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 220, useNativeDriver: true }),
        ])
      ),
      Animated.timing(btnAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start()
  }, [])

  function toggle(i: number) {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const s = recogStyles(c)
  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>Be honest.</Text>
        <Text style={s.subtitle}>Tap anything that sounds like you.</Text>
      </View>

      <View style={s.items}>
        {RECOGNITION_ITEMS.map((item, i) => {
          const on = selected.includes(i)
          return (
            <Animated.View
              key={i}
              style={{ opacity: itemAnims[i].opacity, transform: [{ translateY: itemAnims[i].translateY }] }}
            >
              <TouchableOpacity
                style={[s.item, on && { borderColor: item.accent, backgroundColor: item.accent + '07' }]}
                onPress={() => toggle(i)}
                activeOpacity={0.75}
              >
                <View style={[s.iconBox, { backgroundColor: item.accent + '14', borderColor: item.accent + '28' }]}>
                  <Ionicons name={item.icon} size={18} color={item.accent} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[s.behavior, on && { color: c.primary }]}>{item.behavior}</Text>
                  {on && (
                    <Text style={[s.featureHint, { color: item.accent }]}>
                      ✦ {item.feature}
                    </Text>
                  )}
                </View>
                <View style={[s.check, on && { backgroundColor: item.accent, borderColor: item.accent }]}>
                  {on && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )
        })}
      </View>

      <Animated.View style={{ opacity: btnAnim }}>
        <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
          <Text style={s.btnText}>
            {selected.length > 0 ? "That's exactly why we built this →" : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

function recogStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: { flex: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 26, justifyContent: 'space-between' },
    header: { gap: 6 },
    title: { fontFamily: FontFamily.display, fontSize: 36, color: c.primary, lineHeight: 42 },
    subtitle: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 22 },
    items: { gap: 10, flex: 1, justifyContent: 'center', marginVertical: 18 },
    item: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: c.subtleBorder,
      paddingHorizontal: 14, paddingVertical: 13,
    },
    iconBox: {
      width: 38, height: 38, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, flexShrink: 0, marginTop: 1,
    },
    behavior: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 20 },
    featureHint: { fontFamily: FontFamily.sansMedium, fontSize: 12, lineHeight: 17 },
    check: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 1.5, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: 2,
    },
    btn: { backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 17, alignItems: 'center' },
    btnText: { fontFamily: FontFamily.display, fontSize: 16, color: c.background },
  })
}

// ── Consequence slide ─────────────────────────────────────────────────────────

function ConsequenceSlide({ c, onNext }: { c: ColorPalette; onNext: () => void }) {
  const cardAnims = useRef(CONSEQUENCES.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(24),
  }))).current
  const btnAnim = useRef({ opacity: new Animated.Value(0), translateY: new Animated.Value(12) }).current

  useEffect(() => {
    Animated.stagger(260, [
      ...cardAnims.map(({ opacity, translateY }) =>
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: true }),
        ])
      ),
      Animated.parallel([
        Animated.timing(btnAnim.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(btnAnim.translateY, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const s = consequenceStyles(c)
  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>This is what{'\n'}silence costs you.</Text>
        <Text style={s.subtitle}>Every week you don't reach out, this is playing out in real time.</Text>
      </View>
      <View style={s.cards}>
        {CONSEQUENCES.map((item, i) => (
          <Animated.View
            key={i}
            style={[
              s.card,
              { backgroundColor: item.bg },
              { opacity: cardAnims[i].opacity, transform: [{ translateY: cardAnims[i].translateY }] },
            ]}
          >
            <View style={[s.iconBox, { backgroundColor: item.color + '18', borderColor: item.color + '30' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={s.cardBody}>{item.body}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
      <Animated.View style={{ opacity: btnAnim.opacity, transform: [{ translateY: btnAnim.translateY }] }}>
        <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
          <Text style={s.btnText}>Show me the solution</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

function consequenceStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flex: 1, paddingHorizontal: 24,
      paddingTop: 20, paddingBottom: 24,
      justifyContent: 'space-between',
    },
    header: { gap: 8 },
    title: { fontFamily: FontFamily.display, fontSize: 34, color: c.primary, lineHeight: 40 },
    subtitle: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21 },
    cards: { gap: 10, flex: 1, justifyContent: 'center', marginVertical: 16 },
    card: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      borderRadius: Radius.card, borderWidth: 1, borderColor: c.subtleBorder, padding: 14,
    },
    iconBox: {
      width: 40, height: 40, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, flexShrink: 0,
    },
    cardTitle: {
      fontFamily: FontFamily.display, fontSize: 20,
      lineHeight: 24, marginBottom: 4, letterSpacing: -0.2,
    },
    cardBody: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 19 },
    btn: { backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 17, alignItems: 'center' },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
  })
}

// ── Trust slide ───────────────────────────────────────────────────────────────

function TrustSlide({ firstName, c, onNext }: { firstName: string; c: ColorPalette; onNext: () => void }) {
  const iconScale = useRef(new Animated.Value(0.5)).current
  const iconOpacity = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textSlide = useRef(new Animated.Value(20)).current
  const btnOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textSlide, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])

  const s = trustStyles(c)
  return (
    <View style={s.wrap}>
      <View style={s.center}>
        {/* Icon graphic */}
        <Animated.View style={[s.iconWrap, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
          <View style={s.iconRing}>
            <View style={s.iconInner}>
              <Ionicons name="shield-checkmark" size={48} color={c.gold} />
            </View>
          </View>
          {/* Decorative dots */}
          <View style={[s.dot, { top: -6, right: 12, backgroundColor: c.success }]} />
          <View style={[s.dot, { bottom: 4, left: 8, backgroundColor: c.gold, width: 6, height: 6 }]} />
          <View style={[s.dot, { top: 12, left: -4, backgroundColor: c.warning, width: 5, height: 5, borderRadius: 3 }]} />
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textSlide }], gap: 14 }}>
          <Text style={s.title}>
            {firstName ? `Thank you for\ntrusting us, ${firstName}.` : 'Thank you for\ntrusting us.'}
          </Text>
          <Text style={s.body}>
            Building a network takes courage. Reaching out feels awkward. We built Dialed to make it easier — and to make sure the people who matter never forget your name.
          </Text>
          <Text style={s.promise}>
            Your relationships are safe with us.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: btnOpacity, paddingHorizontal: 24, paddingBottom: 16 }}>
        <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
          <Text style={s.btnText}>See my plan →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

function trustStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrap: { flex: 1, justifyContent: 'space-between', paddingTop: 24 },
    center: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 36 },
    iconWrap: { alignSelf: 'flex-start', position: 'relative' },
    iconRing: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: c.gold + '12',
      borderWidth: 1.5, borderColor: c.gold + '30',
      alignItems: 'center', justifyContent: 'center',
    },
    iconInner: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.gold + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    dot: {
      position: 'absolute', width: 8, height: 8,
      borderRadius: 4,
    },
    title: {
      fontFamily: FontFamily.display, fontSize: 38,
      color: c.primary, lineHeight: 44,
    },
    body: {
      fontFamily: FontFamily.sans, fontSize: 16,
      color: c.secondary, lineHeight: 25,
    },
    promise: {
      fontFamily: FontFamily.sansMedium, fontSize: 15,
      color: c.gold,
    },
    btn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 18, alignItems: 'center',
    },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
  })
}

// ── Animated health chart ─────────────────────────────────────────────────────

function HealthChart({ c }: { c: ColorPalette }) {
  const barAnims = useRef(HEALTH_BARS.map(() => new Animated.Value(0))).current

  useEffect(() => {
    Animated.stagger(110, HEALTH_BARS.map((val, i) =>
      Animated.timing(barAnims[i], {
        toValue: (val / 100) * 70,
        duration: 480,
        useNativeDriver: false, // height animation requires JS driver
      })
    )).start()
  }, [])

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 84, gap: 5, paddingHorizontal: 4 }}>
      {HEALTH_BARS.map((_, i) => {
        const color = i < 2 ? c.overdue : i < 4 ? c.warning : c.success
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <Animated.View
              style={{
                width: '100%',
                height: barAnims[i],
                backgroundColor: color,
                borderRadius: 5,
                opacity: 0.88,
              }}
            />
            <Text style={{ fontSize: 9, color: c.tertiary, fontFamily: FontFamily.sans }}>{`M${i + 1}`}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()
  const { login } = useAuth()

  const [step, setStep] = useState(0)

  // Personalization
  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState('')
  const [stage, setStage] = useState('')
  const [goal, setGoal] = useState('')
  const [blocker, setBlocker] = useState('')
  const [checkedItems, setCheckedItems] = useState<number[]>([])

  // Account creation
  const [emailMode, setEmailMode] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Step transition animation
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    fadeAnim.setValue(0)
    slideAnim.setValue(28)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 270, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
    ]).start()
  }, [step])

  // Loading auto-advance → trust slide
  useEffect(() => {
    if (step !== 8) return
    setCheckedItems([])
    const timers: ReturnType<typeof setTimeout>[] = []
    LOADING_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setCheckedItems(prev => [...prev, i]), 400 + i * 550))
    })
    timers.push(setTimeout(() => setStep(9), 2900))
    return () => timers.forEach(clearTimeout)
  }, [step])

  // Pre-fill account name from firstName when entering save step
  useEffect(() => {
    if (step === 11 && !name && firstName) setName(firstName)
  }, [step])

  function selectAndAdvance(setter: (v: string) => void, val: string) {
    setter(val)
    setTimeout(() => setStep(prev => prev + 1), 220)
  }

  function goBack() {
    setStep(prev => Math.max(0, prev - 1))
  }

  async function handleCreateAccount() {
    if (!name.trim()) return Alert.alert('Name required', 'Please enter your name.')
    if (!email.trim()) return Alert.alert('Email required', 'Please enter your email.')
    if (password.length < 6) return Alert.alert('Password too short', 'Minimum 6 characters.')
    setAuthLoading(true)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      })
      if (signUpError) throw new Error(signUpError.message)
      await login(email.trim(), password)
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ firstName, age, stage, goal, blocker }))
      await AsyncStorage.setItem(ONBOARDED_KEY, '1')
      router.replace('/permissions' as any)
    } catch (err: unknown) {
      Alert.alert('Account creation failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleSocialAuth(provider: 'apple' | 'google') {
    Alert.alert('Coming soon', `${provider === 'apple' ? 'Apple' : 'Google'} sign-in is coming soon. Use email for now.`)
  }

  // ── Step renderers ────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return <NameStep firstName={firstName} setFirstName={setFirstName} onContinue={() => setStep(1)} c={c} />

      case 1:
        return (
          <SelectStep
            title={`Nice to meet you,\n${firstName || 'you'}!`}
            subtitle="How old are you? This shapes the urgency and cadence of your plan."
            options={AGE_OPTIONS} selected={age}
            onSelect={v => selectAndAdvance(setAge, v)} c={c}
          />
        )

      case 2:
        return (
          <SelectStep
            title={"Where are you in\nyour journey?"}
            subtitle="We'll calibrate your plan so the right people don't forget your name at the wrong time."
            options={STAGE_OPTIONS} selected={stage}
            onSelect={v => selectAndAdvance(setStage, v)} c={c}
          />
        )

      case 3:
        return (
          <SelectStep
            title={"What's your main\ngoal right now?"}
            subtitle="Most people miss opportunities not because they lack connections — but because they let relationships go silent right before they needed them."
            options={GOAL_OPTIONS} selected={goal}
            onSelect={v => selectAndAdvance(setGoal, v)} c={c}
          />
        )

      case 4:
        return (
          <SelectStep
            title={"Where do\nrelationships break down?"}
            subtitle="An unanswered email doesn't just lose a reply — it loses the relationship. And with it, whatever that person could have opened for you."
            options={BLOCKER_OPTIONS} selected={blocker}
            onSelect={v => selectAndAdvance(setBlocker, v)} c={c}
          />
        )

      case 5:
        return <RecognitionSlide c={c} onNext={() => setStep(6)} />

      case 6:
        return <ConsequenceSlide c={c} onNext={() => setStep(7)} />

      case 7:
        return <SocialProofSlide c={c} onNext={() => setStep(8)} />

      case 8:
        return (
          <View style={s.loadingWrap}>
            <Text style={s.loadingTitle}>
              {firstName ? `Building ${firstName}'s\nnetwork plan…` : 'Building your\nnetwork plan…'}
            </Text>
            <View style={s.checklist}>
              {LOADING_ITEMS.map((item, i) => {
                const done = checkedItems.includes(i)
                return (
                  <View key={i} style={s.checkRow}>
                    <View style={[s.checkCircle, done && s.checkCircleDone]}>
                      {done && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={[s.checkLabel, done && s.checkLabelDone]}>{item}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )

      case 9:
        return <TrustSlide firstName={firstName} c={c} onNext={() => setStep(10)} />

      case 10:
        return (
          <ScrollView contentContainerStyle={s.resultsWrap} showsVerticalScrollIndicator={false}>
            <View style={s.resultsBadge}>
              <Text style={s.resultsBadgeText}>YOUR PLAN IS READY</Text>
            </View>
            <Text style={s.resultsTitle}>
              {firstName ? `${firstName}, 8 relationships\nare going cold.` : '8 relationships\nare going cold.'}
            </Text>
            <Text style={s.resultsSub}>
              These aren't just contacts — they're the people who can refer you, vouch for you, and open doors that applications can't. Every week you don't reach out, someone else does.
            </Text>
            <View style={s.chartWrap}>
              <Text style={s.chartLabel}>Network health with Dialed</Text>
              <HealthChart c={c} />
              <View style={s.chartLegend}>
                <Text style={s.chartLegendText}>Now</Text>
                <Text style={s.chartLegendText}>Month 6</Text>
              </View>
            </View>
            <TouchableOpacity style={s.nextBtn} onPress={() => setStep(11)} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>Let's fix that →</Text>
            </TouchableOpacity>
          </ScrollView>
        )

      case 11:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.saveWrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.saveTitle}>Save your progress</Text>
              <Text style={s.saveSub}>Create an account to lock in your plan and start tracking your network.</Text>

              {!emailMode ? (
                <>
                  <View style={s.socialBtns}>
                    <TouchableOpacity style={s.socialBtn} onPress={() => handleSocialAuth('apple')} activeOpacity={0.8}>
                      <Ionicons name="logo-apple" size={18} color={c.primary} />
                      <Text style={s.socialBtnText}>Continue with Apple</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.socialBtn} onPress={() => handleSocialAuth('google')} activeOpacity={0.8}>
                      <Ionicons name="logo-google" size={17} color={c.primary} />
                      <Text style={s.socialBtnText}>Continue with Google</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.orRow}>
                    <View style={s.orLine} />
                    <Text style={s.orText}>or</Text>
                    <View style={s.orLine} />
                  </View>
                  <TouchableOpacity
                    style={s.emailToggleBtn}
                    onPress={() => { setEmailMode(true); if (!name && firstName) setName(firstName) }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.emailToggleBtnText}>Continue with email</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={s.form}>
                    <TextInput style={s.input} placeholder="Full name" placeholderTextColor={c.tertiary}
                      value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" />
                    <TextInput style={s.input} placeholder="Email" placeholderTextColor={c.tertiary}
                      value={email} onChangeText={setEmail} keyboardType="email-address"
                      autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
                    <TextInput style={s.input} placeholder="Password (min 6 characters)" placeholderTextColor={c.tertiary}
                      value={password} onChangeText={setPassword} secureTextEntry
                      returnKeyType="done" onSubmitEditing={handleCreateAccount} />
                  </View>
                  <TouchableOpacity
                    style={[s.nextBtn, authLoading && { opacity: 0.6 }]}
                    onPress={handleCreateAccount} activeOpacity={0.85} disabled={authLoading}
                  >
                    <Text style={s.nextBtnText}>{authLoading ? 'Creating account…' : 'Create Account'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEmailMode(false)} style={s.backToOptionsBtn}>
                    <Text style={s.backToOptionsText}>← Other sign-in options</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )

      default:
        return null
    }
  }

  const showBack = step >= 1 && step <= 7
  const showProgressBar = step <= 10

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          {showBack && (
            <TouchableOpacity onPress={goBack} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
              <Ionicons name="chevron-back" size={26} color={c.secondary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.headerBar}>
          {showProgressBar && <ProgressBar step={step} c={c} />}
        </View>
        <View style={s.headerRight} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {renderStep()}
      </Animated.View>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 8,
    },
    headerLeft: { width: 36, alignItems: 'flex-start' },
    headerBar: { flex: 1 },
    headerRight: { width: 36 },

    // Loading
    loadingWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 44, alignItems: 'flex-start', gap: 36 },
    loadingTitle: { fontFamily: FontFamily.display, fontSize: 38, color: c.primary, lineHeight: 44 },
    checklist: { gap: 20, width: '100%' },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    checkCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.elevated, borderWidth: 1.5, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    checkCircleDone: { backgroundColor: c.success, borderColor: c.success },
    checkLabel: { fontFamily: FontFamily.sans, fontSize: 17, color: c.tertiary },
    checkLabelDone: { color: c.primary, fontFamily: FontFamily.sansMedium },

    // Results
    resultsWrap: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 36, gap: 18 },
    resultsBadge: {
      alignSelf: 'flex-start', backgroundColor: c.success + '18',
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: c.success + '30',
    },
    resultsBadgeText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: c.success, letterSpacing: 1.4 },
    resultsTitle: { fontFamily: FontFamily.display, fontSize: 36, color: c.primary, lineHeight: 42 },
    resultsSub: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 23 },
    chartWrap: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, padding: 16, gap: 12,
    },
    chartLabel: {
      fontFamily: FontFamily.sansMedium, fontSize: 11,
      color: c.tertiary, letterSpacing: 1.2, textTransform: 'uppercase',
    },
    chartLegend: { flexDirection: 'row', justifyContent: 'space-between' },
    chartLegendText: { fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary },

    // Save progress
    saveWrap: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, gap: 16 },
    saveTitle: { fontFamily: FontFamily.display, fontSize: 34, color: c.primary, lineHeight: 40 },
    saveSub: { fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary, lineHeight: 24, marginBottom: 4 },
    socialBtns: { gap: 12 },
    socialBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: c.subtleBorder, paddingVertical: 16,
    },
    socialBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.primary },
    orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    orLine: { flex: 1, height: 1, backgroundColor: c.border },
    orText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary },
    emailToggleBtn: {
      backgroundColor: c.elevated, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: c.subtleBorder, paddingVertical: 16, alignItems: 'center',
    },
    emailToggleBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.primary },
    form: { gap: Spacing.sm },
    input: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      paddingHorizontal: Spacing.md, paddingVertical: 16,
      fontFamily: FontFamily.sans, fontSize: 16, color: c.primary,
      borderWidth: 1.5, borderColor: c.subtleBorder,
    },
    backToOptionsBtn: { alignItems: 'center', paddingVertical: 4 },
    backToOptionsText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary },

    // Shared
    nextBtn: { backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
    nextBtnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
  })
}
