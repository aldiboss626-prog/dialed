import { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { FontFamily, Radius } from '@/constants/theme'
import { haptic } from '@/lib/haptics'

type UpgradeView = 'features' | 'referral' | 'redeem' | 'trial' | 'downsell' | 'tutorial'

const DEV_PRO_KEY = 'dialed_dev_pro_override'

// ── Pricing ───────────────────────────────────────────────────────────────────
const MONTHLY        = 9.99
const ANNUAL_MO      = 6.67   // $6.67/mo billed annually
const ANNUAL_TOTAL   = 79.99  // $79.99/yr
const DOWNSELL_MO    = 5.99   // one-time offer: $5.99/mo
const DOWNSELL_TOTAL = 71.88  // $71.88/yr

const SAVE_PCT         = Math.round((1 - ANNUAL_MO  / MONTHLY) * 100) // 33
const DOWNSELL_SAVE_PCT = Math.round((1 - DOWNSELL_MO / MONTHLY) * 100) // 40

// Warm amber for premium accents (consistent regardless of theme)
const AMBER       = '#F59E0B'
const AMBER_LIGHT = '#FFF8E6'

// ── Feature list ──────────────────────────────────────────────────────────────
const PRO_FEATURES = [
  { icon: 'people-outline'         as const, label: 'Full Network Orbit',           sub: 'Health scores, cadence tracking, and status for every relationship' },
  { icon: 'notifications-outline'  as const, label: 'Smart Follow-up Reminders',    sub: 'Nudges that tell you exactly when to reach out — before it goes cold' },
  { icon: 'mail-unread-outline'    as const, label: 'Pending Response Alerts',       sub: 'Never let an important email slip through the cracks' },
  { icon: 'trending-up-outline'    as const, label: 'Network Analytics',             sub: 'Watch your relationship health score grow month over month' },
  { icon: 'briefcase-outline'      as const, label: 'Opportunity Tracking + AI',     sub: 'AI-powered suggestions to move every opportunity forward' },
  { icon: 'color-wand-outline'     as const, label: 'AI Content Suite',              sub: 'Resume builder, LinkedIn audit, outfit check, and more' },
]

// ── Timeline items ────────────────────────────────────────────────────────────
const TIMELINE = [
  {
    icon: 'lock-open-outline' as const,
    bg: AMBER_LIGHT, border: AMBER, iconColor: AMBER,
    day: 'Today',
    desc: "Unlock all the app's features including AI tools, smart reminders, and full analytics.",
  },
  {
    icon: 'notifications-outline' as const,
    bg: AMBER_LIGHT, border: AMBER, iconColor: AMBER,
    day: 'In 2 Days – Reminder',
    desc: "We'll send you a reminder that your trial is ending soon if you've allowed us to notify you.",
  },
  {
    icon: 'trophy' as const,
    bg: '#1A1A2E', border: '#1A1A2E', iconColor: '#FFFFFF',
    day: 'In 3 Days – Billing Starts',
    desc: '',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Feature view
// ─────────────────────────────────────────────────────────────────────────────

function FeaturesView({ c, onNext, onDismiss }: { c: ColorPalette; onNext: () => void; onDismiss: () => void }) {
  const s = featStyles(c)
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
            <Ionicons name="close" size={22} color={c.secondary} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={s.badge}>
            <Text style={s.badgeText}>DIALED PRO</Text>
          </View>
          <Text style={s.headline}>
            Turn your network{'\n'}into your career.
          </Text>
          <Text style={s.headlineSub}>
            Every feature you need to stay connected, stay relevant, and stay top of mind.
          </Text>
        </View>

        {/* Feature list */}
        <View style={s.list}>
          {PRO_FEATURES.map((f, i) => (
            <View key={i} style={s.row}>
              <View style={s.iconBox}>
                <Ionicons name={f.icon} size={19} color={AMBER} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{f.label}</Text>
                <Text style={s.rowSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Trial note */}
        <View style={s.trialNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={AMBER} />
          <Text style={s.trialNoteText}>Includes a 3-day free trial. No payment due now.</Text>
        </View>

        {/* CTA */}
        <View style={s.footer}>
          <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
            <Text style={s.btnText}>See Pricing →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={s.dismissRow}>
            <Text style={s.dismissText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function featStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    inner: { paddingHorizontal: 22, paddingBottom: 40 },
    topBar: { paddingTop: 16, paddingBottom: 8, alignItems: 'flex-end' },
    header: { gap: 10, marginBottom: 28 },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: AMBER + '18', borderWidth: 1, borderColor: AMBER + '40',
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5,
    },
    badgeText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: AMBER, letterSpacing: 1.6 },
    headline: { fontFamily: FontFamily.display, fontSize: 34, color: c.primary, lineHeight: 40 },
    headlineSub: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 22 },
    list: { gap: 20, marginBottom: 24 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    iconBox: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: AMBER + '12', borderWidth: 1, borderColor: AMBER + '28',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    rowLabel: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, lineHeight: 20 },
    rowSub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 18, marginTop: 2 },
    trialNote: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: AMBER + '0E', borderRadius: Radius.card,
      borderWidth: 1, borderColor: AMBER + '28',
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24,
    },
    trialNoteText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, flex: 1 },
    footer: { gap: 12 },
    btn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 17, alignItems: 'center',
    },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
    dismissRow: { alignItems: 'center', paddingVertical: 4 },
    dismissText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Referral teaser  (pay to unlock your code — shown right before the paywall)
// ─────────────────────────────────────────────────────────────────────────────

const REFERRAL_LADDER = [
  { months: '1 month',  friend: '2 friends' },
  { months: '2 months', friend: '4 friends' },
  { months: '3 months', friend: '6 friends' },
]

function ReferralView({ c, onNext, onBack, onDismiss }: {
  c: ColorPalette
  onNext: () => void
  onBack: () => void
  onDismiss: () => void
}) {
  const s = referralStyles(c)

  // Light staggered entrance for the ladder nodes, matching the app's feel.
  const nodeAnims = useRef(REFERRAL_LADDER.map(() => new Animated.Value(0))).current
  useEffect(() => {
    Animated.stagger(140, nodeAnims.map(a =>
      Animated.spring(a, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true })
    )).start()
  }, [])

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>

        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={onBack} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={c.secondary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.badge}>
          <Text style={s.badgeText}>INVITE & EARN</Text>
        </View>
        <Text style={s.title}>
          {'Refer friends.\n'}
          <Text style={[s.title, { color: AMBER }]}>Earn free months.</Text>
        </Text>
        <Text style={s.sub}>
          For every 2 friends who subscribe to Pro, you get a free month — on us.
        </Text>

        {/* Reward ladder */}
        <View style={s.ladder}>
          <View style={s.ladderLine} />
          {REFERRAL_LADDER.map((rung, i) => (
            <View key={i} style={s.rung}>
              <Animated.View style={[s.node, {
                opacity: nodeAnims[i],
                transform: [{ scale: nodeAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              }]}>
                <Ionicons name="person" size={18} color="#fff" />
              </Animated.View>
              <Text style={s.rungMonths}>{rung.months}</Text>
              <Text style={s.rungFriend}>{rung.friend}</Text>
            </View>
          ))}
        </View>

        {/* Locked code card */}
        {/* TODO(backend): replace the masked placeholder with the user's real referral code once issued. */}
        <View style={s.codeCard}>
          <View style={s.codeLeft}>
            <View style={s.lockCircle}>
              <Ionicons name="lock-closed" size={16} color={AMBER} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.codeLabel}>Your referral code</Text>
              <Text style={s.codeValue}>DIALED-•••••</Text>
            </View>
          </View>
          <View style={s.lockedPill}>
            <Text style={s.lockedPillText}>LOCKED</Text>
          </View>
        </View>
        <Text style={s.codeHint}>Your referral code unlocks the moment you go Pro.</Text>

        {/* CTA */}
        <View style={s.footer}>
          <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
            <Text style={s.btnText}>Unlock with Pro →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={s.dismissRow}>
            <Text style={s.dismissText}>Maybe later</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function referralStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    inner: { paddingHorizontal: 22, paddingBottom: 40 },
    backBtn: { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },

    badge: {
      alignSelf: 'flex-start',
      backgroundColor: AMBER + '18', borderWidth: 1, borderColor: AMBER + '40',
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
    },
    badgeText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: AMBER, letterSpacing: 1.6 },

    title: { fontFamily: FontFamily.display, fontSize: 34, color: c.primary, lineHeight: 40 },
    sub: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 22, marginTop: 10, marginBottom: 30 },

    // Reward ladder
    ladder: { flexDirection: 'row', position: 'relative', marginBottom: 30, paddingHorizontal: 4 },
    ladderLine: { position: 'absolute', top: 21, left: '18%', right: '18%', height: 2, backgroundColor: AMBER + '45', borderRadius: 1 },
    rung: { flex: 1, alignItems: 'center' },
    node: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: AMBER,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: AMBER, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    rungMonths: { fontFamily: FontFamily.display, fontSize: 15, color: c.primary, marginTop: 10 },
    rungFriend: { fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, marginTop: 2 },

    // Locked code card
    codeCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: AMBER + '30', borderStyle: 'dashed',
      paddingHorizontal: 16, paddingVertical: 16,
    },
    codeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    lockCircle: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: AMBER + '14', borderWidth: 1, borderColor: AMBER + '28',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    codeLabel: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    codeValue: { fontFamily: FontFamily.display, fontSize: 18, color: c.secondary, letterSpacing: 2, marginTop: 2 },
    lockedPill: {
      backgroundColor: AMBER + '18', borderRadius: Radius.full,
      paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: AMBER + '30', flexShrink: 0,
    },
    lockedPillText: { fontFamily: FontFamily.sansMedium, fontSize: 10, color: AMBER, letterSpacing: 1 },

    codeHint: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.tertiary, lineHeight: 18, marginTop: 12, marginBottom: 26, textAlign: 'center' },

    // CTA
    footer: { gap: 12 },
    btn: { backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 17, alignItems: 'center' },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
    dismissRow: { alignItems: 'center', paddingVertical: 4 },
    dismissText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Redeem  (were YOU referred? enter a friend's code — shown before the paywall)
// ─────────────────────────────────────────────────────────────────────────────

function RedeemView({ c, onNext, onSkip, onBack }: {
  c: ColorPalette
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}) {
  const s = redeemStyles(c)
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState(false)
  const hasCode = code.trim().length > 0

  // UI only: applying a code just shows the confirmed state. Real validation/crediting is backend (later).
  function apply() {
    if (!hasCode) return
    haptic.success()
    setApplied(true)
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={onBack} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={22} color={c.secondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={s.badge}>
            <Text style={s.badgeText}>REFERRED BY A FRIEND?</Text>
          </View>
          <Text style={s.title}>Have a referral{'\n'}code?</Text>
          <Text style={s.sub}>
            Enter a friend's code so they get credit toward their free month. No code? Just skip ahead.
          </Text>

          {/* Input → applied state */}
          {applied ? (
            <View style={s.appliedCard}>
              <Ionicons name="checkmark-circle" size={22} color={c.success} />
              <View style={{ flex: 1 }}>
                <Text style={s.appliedTitle}>Code applied</Text>
                <Text style={s.appliedSub}>{code.trim()} — your friend gets credit when you go Pro.</Text>
              </View>
              <TouchableOpacity onPress={() => { setApplied(false); setCode('') }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={c.tertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.inputWrap}>
              <Ionicons name="pricetag-outline" size={18} color={c.tertiary} />
              <TextInput
                style={s.input}
                value={code}
                onChangeText={t => setCode(t.toUpperCase())}
                placeholder="DIALED-XXXXX"
                placeholderTextColor={c.tertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={apply}
              />
            </View>
          )}

          {/* CTA */}
          <View style={s.footer}>
            {applied ? (
              <TouchableOpacity style={s.btn} onPress={onNext} activeOpacity={0.85}>
                <Text style={s.btnText}>Continue →</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[s.btn, !hasCode && s.btnDisabled]} onPress={apply} disabled={!hasCode} activeOpacity={0.85}>
                  <Text style={s.btnText}>Apply code</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSkip} style={s.dismissRow}>
                  <Text style={s.dismissText}>I wasn't referred</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function redeemStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    inner: { paddingHorizontal: 22, paddingBottom: 40 },
    backBtn: { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },

    badge: {
      alignSelf: 'flex-start',
      backgroundColor: AMBER + '18', borderWidth: 1, borderColor: AMBER + '40',
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
    },
    badgeText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: AMBER, letterSpacing: 1.6 },

    title: { fontFamily: FontFamily.display, fontSize: 34, color: c.primary, lineHeight: 40 },
    sub: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 22, marginTop: 10, marginBottom: 26 },

    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1.5, borderColor: c.subtleBorder,
      paddingHorizontal: 16, marginBottom: 28,
    },
    input: {
      flex: 1, fontFamily: FontFamily.display, fontSize: 18, color: c.primary,
      letterSpacing: 1.5, paddingVertical: 16,
    },

    appliedCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.success + '12', borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.success + '30',
      paddingHorizontal: 14, paddingVertical: 14, marginBottom: 28,
    },
    appliedTitle: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary },
    appliedSub: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, lineHeight: 17, marginTop: 2 },

    footer: { gap: 12 },
    btn: { backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 17, alignItems: 'center' },
    btnDisabled: { opacity: 0.35 },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },
    dismissRow: { alignItems: 'center', paddingVertical: 4 },
    dismissText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Trial / paywall view  (matches screenshot 1)
// ─────────────────────────────────────────────────────────────────────────────

function TrialView({ c, plan, setPlan, onUpgrade, onRestore, onBack, onMaybeLater }: {
  c: ColorPalette
  plan: 'annual' | 'monthly'
  setPlan: (p: 'annual' | 'monthly') => void
  onUpgrade: () => void
  onRestore: () => void
  onBack: () => void
  onMaybeLater: () => void
}) {
  const s = trialStyles(c)
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity style={s.backBtn} onPress={onBack} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={22} color={c.secondary} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={s.title}>
          {'Start your 3-day '}
          <Text style={[s.title, { color: AMBER }]}>FREE</Text>
          {'\ntrial to continue'}
        </Text>

        {/* Timeline */}
        <View style={s.timeline}>
          {TIMELINE.map((item, i) => (
            <View key={i} style={s.timelineItem}>
              {/* Left: node + connector */}
              <View style={s.nodeCol}>
                <View style={[s.node, { backgroundColor: item.bg, borderColor: item.border }]}>
                  <Ionicons name={item.icon} size={16} color={item.iconColor} />
                </View>
                {i < TIMELINE.length - 1 && <View style={s.connector} />}
              </View>
              {/* Right: text */}
              <View style={[s.timelineText, i < TIMELINE.length - 1 && { paddingBottom: 20 }]}>
                <Text style={s.timelineDay}>{item.day}</Text>
                {!!item.desc && <Text style={s.timelineDesc}>{item.desc}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* "3 DAYS FREE" pill */}
        <View style={s.freePill}>
          <Text style={s.freePillText}>3 DAYS FREE</Text>
        </View>

        {/* Plan cards */}
        <View style={s.plans}>
          {/* Annual */}
          <TouchableOpacity
            style={[s.planCard, plan === 'annual' && s.planCardSelected]}
            onPress={() => setPlan('annual')}
            activeOpacity={0.85}
          >
            <View style={[s.checkCircle, plan === 'annual' && s.checkCircleOn]}>
              {plan === 'annual' && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.planLabel, plan === 'annual' && s.planLabelOn]}>
                {`Start for free & save ${SAVE_PCT}%`}
              </Text>
              <Text style={[s.planSub, plan === 'annual' && s.planSubOn]}>
                ${ANNUAL_TOTAL.toFixed(2)} billed annually
              </Text>
            </View>
            <Text style={[s.planPrice, plan === 'annual' && s.planPriceOn]}>
              ${ANNUAL_MO.toFixed(2)}/mo
            </Text>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[s.planCard, plan === 'monthly' && s.planCardSelected]}
            onPress={() => setPlan('monthly')}
            activeOpacity={0.85}
          >
            <View style={[s.checkCircle, plan === 'monthly' && s.checkCircleOn]}>
              {plan === 'monthly' && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.planLabel, plan === 'monthly' && s.planLabelOn]}>Monthly</Text>
            </View>
            <Text style={[s.planPrice, plan === 'monthly' && s.planPriceOn]}>
              ${MONTHLY.toFixed(2)}/mo
            </Text>
          </TouchableOpacity>
        </View>

        {/* No payment due */}
        <View style={s.noPayRow}>
          <Ionicons name="checkmark" size={14} color={c.primary} />
          <Text style={s.noPayText}>No Payment Due Now</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.ctaBtn} onPress={onUpgrade} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>Start My 3-Day Free Trial</Text>
        </TouchableOpacity>

        {/* Fine print */}
        <Text style={s.finePrint}>
          {plan === 'annual'
            ? `3 days free, then $${ANNUAL_TOTAL.toFixed(2)}/year. Billed annually. Plan auto-renews unless you cancel in the App Store.`
            : `3 days free, then $${MONTHLY.toFixed(2)}/month. Plan auto-renews unless you cancel in the App Store.`}
        </Text>

        {/* Footer links */}
        <View style={s.linksRow}>
          <TouchableOpacity onPress={onRestore}>
            <Text style={s.linkText}>Restore</Text>
          </TouchableOpacity>
          <Text style={s.linkDot}>·</Text>
          <TouchableOpacity onPress={onMaybeLater}>
            <Text style={s.linkText}>Maybe later</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function trialStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    inner: { paddingHorizontal: 22, paddingBottom: 40 },
    backBtn: { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
    title: { fontFamily: FontFamily.display, fontSize: 30, color: c.primary, lineHeight: 38, marginBottom: 28 },

    // Timeline
    timeline: { marginBottom: 20 },
    timelineItem: { flexDirection: 'row', gap: 14 },
    nodeCol: { alignItems: 'center', width: 38 },
    node: {
      width: 38, height: 38, borderRadius: 19,
      borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    connector: { width: 2, flex: 1, backgroundColor: AMBER + '50', minHeight: 16, marginVertical: 4 },
    timelineText: { flex: 1, paddingTop: 8 },
    timelineDay: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, lineHeight: 20 },
    timelineDesc: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 19, marginTop: 3 },

    // Free pill
    freePill: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 8, alignItems: 'center', marginBottom: 12,
    },
    freePillText: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: '#fff', letterSpacing: 1.8 },

    // Plan cards
    plans: { gap: 10, marginBottom: 16 },
    planCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: Radius.card, borderWidth: 1.5, borderColor: c.subtleBorder,
      backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 14,
    },
    planCardSelected: { borderColor: c.primary, backgroundColor: c.elevated },
    checkCircle: {
      width: 24, height: 24, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    checkCircleOn: { backgroundColor: c.primary, borderColor: c.primary },
    planLabel: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.secondary, lineHeight: 19 },
    planLabelOn: { color: c.primary },
    planSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, marginTop: 2 },
    planSubOn: { color: c.secondary },
    planPrice: { fontFamily: FontFamily.display, fontSize: 15, color: c.secondary },
    planPriceOn: { color: c.primary },

    // No payment
    noPayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 16 },
    noPayText: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary },

    // CTA
    ctaBtn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 17, alignItems: 'center', marginBottom: 14,
    },
    ctaBtnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },

    // Fine print + links
    finePrint: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, lineHeight: 16, textAlign: 'center', marginBottom: 16 },
    linksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    linkText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    linkDot: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Downsell view  (one-time offer, matches screenshot 2)
// ─────────────────────────────────────────────────────────────────────────────

function DownsellView({ c, onUpgrade, onDismiss }: {
  c: ColorPalette
  onUpgrade: () => void
  onDismiss: () => void
}) {
  const s = downsellStyles(c)
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>

        {/* Close */}
        <TouchableOpacity style={s.closeBtn} onPress={onDismiss} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
          <Ionicons name="close" size={20} color={c.secondary} />
        </TouchableOpacity>

        {/* Price card with sparkles */}
        <View style={s.cardWrap}>
          {/* Sparkles */}
          <Text style={[s.sparkle, { top: 8, left: 24, fontSize: 18 }]}>✦</Text>
          <Text style={[s.sparkle, { top: 20, right: 20, fontSize: 12 }]}>✧</Text>
          <Text style={[s.sparkle, { bottom: 16, left: 18, fontSize: 11 }]}>✧</Text>
          <Text style={[s.sparkle, { bottom: 8, right: 28, fontSize: 16 }]}>✦</Text>
          <Text style={[s.sparkle, { top: '40%', left: 6, fontSize: 9 }]}>✦</Text>
          <Text style={[s.sparkle, { top: '35%', right: 8, fontSize: 10 }]}>✧</Text>

          {/* Card */}
          <View style={s.priceCard}>
            <Text style={s.oldPrice}>${ANNUAL_MO.toFixed(2)}/mo</Text>
            <Text style={s.newPrice}>${DOWNSELL_MO.toFixed(2)}/mo</Text>
            <Text style={s.newPriceSub}>billed annually</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={s.headline}>Pay {DOWNSELL_SAVE_PCT}% less</Text>
        <Text style={s.headlineSub}>than monthly subscribers</Text>

        {/* One-time badge */}
        <View style={s.oneTimeBadge}>
          <Text style={s.oneTimeBadgeText}>⚡ ONE TIME ONLY OFFER</Text>
        </View>

        {/* Plan row */}
        <View style={s.planSection}>
          <View style={s.freePill}>
            <Text style={s.freePillText}>3 DAYS FREE</Text>
          </View>
          <View style={s.planRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.planName}>Yearly Plan</Text>
              <Text style={s.planBilled}>${DOWNSELL_TOTAL.toFixed(2)} billed yearly</Text>
            </View>
            <Text style={s.planPerMo}>Only ${DOWNSELL_MO.toFixed(2)}/mo</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.ctaBtn} onPress={onUpgrade} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>Start Free Trial</Text>
        </TouchableOpacity>

        {/* Commitment note */}
        <View style={s.commitRow}>
          <Ionicons name="checkmark" size={13} color={c.secondary} />
          <Text style={s.commitText}>No Commitment · Cancel Anytime</Text>
        </View>

        {/* Fine print */}
        <Text style={s.finePrint}>
          ${DOWNSELL_TOTAL.toFixed(2)}/year. Billed annually. Subscription auto-renews each year unless you cancel. Cancel anytime in the App Store.
        </Text>

        {/* Links */}
        <View style={s.linksRow}>
          <Text style={s.linkText}>Terms</Text>
          <Text style={s.linkDot}>·</Text>
          <Text style={s.linkText}>Privacy</Text>
          <Text style={s.linkDot}>·</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Text style={s.linkText}>Maybe later</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function downsellStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    inner: { paddingHorizontal: 22, paddingBottom: 40, alignItems: 'center' },
    closeBtn: { alignSelf: 'flex-start', paddingTop: 16, paddingBottom: 8 },

    // Sparkle card
    cardWrap: {
      position: 'relative', width: '80%', marginBottom: 28, marginTop: 8,
    },
    sparkle: { position: 'absolute', color: AMBER, zIndex: 1 },
    priceCard: {
      backgroundColor: c.primary, borderRadius: 20,
      paddingVertical: 32, paddingHorizontal: 28,
      alignItems: 'center', gap: 4,
    },
    oldPrice: {
      fontFamily: FontFamily.sans, fontSize: 16,
      color: 'rgba(255,255,255,0.45)',
      textDecorationLine: 'line-through',
    },
    newPrice: { fontFamily: FontFamily.display, fontSize: 42, color: '#fff', lineHeight: 48 },
    newPriceSub: { fontFamily: FontFamily.sans, fontSize: 14, color: 'rgba(255,255,255,0.55)' },

    // Headline
    headline: { fontFamily: FontFamily.display, fontSize: 34, color: c.primary, textAlign: 'center', lineHeight: 40 },
    headlineSub: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, textAlign: 'center', marginBottom: 20 },

    oneTimeBadge: {
      backgroundColor: AMBER + '14', borderWidth: 1, borderColor: AMBER + '38',
      borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
    },
    oneTimeBadgeText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: AMBER, letterSpacing: 1.4 },

    // Plan section
    planSection: {
      width: '100%', backgroundColor: c.surface,
      borderRadius: Radius.card, borderWidth: 1.5, borderColor: c.subtleBorder,
      overflow: 'hidden', marginBottom: 14,
    },
    freePill: {
      backgroundColor: c.primary,
      paddingVertical: 7, alignItems: 'center',
    },
    freePillText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: '#fff', letterSpacing: 1.8 },
    planRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, gap: 8,
    },
    planName: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary },
    planBilled: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 2 },
    planPerMo: { fontFamily: FontFamily.display, fontSize: 14, color: c.primary },

    // CTA
    ctaBtn: {
      width: '100%', backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 17, alignItems: 'center', marginBottom: 12,
    },
    ctaBtnText: { fontFamily: FontFamily.display, fontSize: 17, color: c.background },

    // Commit + fine print
    commitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    commitText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.secondary },
    finePrint: {
      fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary,
      textAlign: 'center', lineHeight: 16, marginBottom: 16,
    },
    linksRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    linkText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    linkDot: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial view
// ─────────────────────────────────────────────────────────────────────────────

const TUTORIAL_SLIDES = [
  {
    icon: 'people-circle-outline' as const,
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    label: 'YOUR NETWORK',
    title: "See who's going cold\nbefore it's too late.",
    body: "Every contact has a health score. Dialed tracks how long it's been and flags relationships that need your attention — before the silence becomes permanent.",
  },
  {
    icon: 'notifications-circle-outline' as const,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    label: 'SMART REMINDERS',
    title: 'The right nudge at\nthe right moment.',
    body: 'Dialed tells you exactly when to reach out. No guessing, no guilt — just a simple prompt that keeps your relationships warm without the awkwardness.',
  },
  {
    icon: 'briefcase' as const,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    label: 'OPPORTUNITY TRACKER',
    title: 'Track every door\nthat could open.',
    body: "Log internships, referrals, and conversations. AI suggests what to do next so nothing slips through the cracks when it matters most.",
  },
  {
    icon: 'color-wand' as const,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
    label: 'AI TOOLS',
    title: 'Show up ready\nfor every opportunity.',
    body: 'Resume builder, LinkedIn audit, outfit check, and more — AI-powered tools that help you put your best foot forward every single time.',
  },
]

function TutorialView({ c, firstName, onFinish }: { c: ColorPalette; firstName: string; onFinish: () => void }) {
  const [slide, setSlide] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const iconScale = useRef(new Animated.Value(0.7)).current
  const iconOpacity = useRef(new Animated.Value(0)).current

  function animateIn() {
    iconScale.setValue(0.7)
    iconOpacity.setValue(0)
    fadeAnim.setValue(0)
    slideAnim.setValue(30)
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
    ]).start()
  }

  useEffect(() => { animateIn() }, [slide])

  function next() {
    if (slide < TUTORIAL_SLIDES.length - 1) {
      setSlide(s => s + 1)
    } else {
      onFinish()
    }
  }

  const current = TUTORIAL_SLIDES[slide]
  const isLast = slide === TUTORIAL_SLIDES.length - 1
  const s = tutStyles(c)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        {/* Top: greeting + progress dots */}
        <View style={s.top}>
          {slide === 0 && (
            <Text style={s.greeting}>
              {firstName ? `Welcome, ${firstName}. Here's your app.` : "Welcome. Here's your app."}
            </Text>
          )}
          <View style={s.dots}>
            {TUTORIAL_SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === slide && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* Icon */}
        <Animated.View
          style={[
            s.iconWrap,
            { backgroundColor: current.bg },
            { opacity: iconOpacity, transform: [{ scale: iconScale }] },
          ]}
        >
          <Ionicons name={current.icon} size={72} color={current.color} />
        </Animated.View>

        {/* Text */}
        <Animated.View style={[s.textBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={[s.label, { color: current.color }]}>{current.label}</Text>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.body}>{current.body}</Text>
        </Animated.View>

        {/* CTA */}
        <View style={s.footer}>
          <TouchableOpacity style={[s.btn, { backgroundColor: current.color }]} onPress={next} activeOpacity={0.85}>
            <Text style={s.btnText}>{isLast ? "Let's go →" : 'Next →'}</Text>
          </TouchableOpacity>
          {!isLast && (
            <TouchableOpacity onPress={onFinish} style={s.skipBtn}>
              <Text style={s.skipText}>Skip tour</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

function tutStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    wrap: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, justifyContent: 'space-between' },
    top: { gap: 16 },
    greeting: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 22 },
    dots: { flexDirection: 'row', gap: 7 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.border },
    dotActive: { width: 24, backgroundColor: c.primary },
    iconWrap: {
      alignSelf: 'flex-start', borderRadius: 28,
      padding: 24, marginVertical: 8,
    },
    textBlock: { flex: 1, justifyContent: 'center', gap: 12 },
    label: { fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 1.6 },
    title: { fontFamily: FontFamily.display, fontSize: 36, color: c.primary, lineHeight: 42 },
    body: { fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary, lineHeight: 25 },
    footer: { gap: 12 },
    btn: { borderRadius: Radius.full, paddingVertical: 17, alignItems: 'center' },
    btnText: { fontFamily: FontFamily.display, fontSize: 17, color: '#fff' },
    skipBtn: { alignItems: 'center', paddingVertical: 4 },
    skipText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const c = useColors()
  const router = useRouter()
  const navigation = useNavigation()
  const [view, setView] = useState<UpgradeView>('features')
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual')
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    AsyncStorage.getItem('dialed_onboarding_profile').then(raw => {
      if (!raw) return
      try { setFirstName(JSON.parse(raw).firstName ?? '') } catch {}
    })
  }, [])

  function hardDismiss() {
    if (navigation.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)/home' as any)
    }
  }

  async function handleUpgrade() {
    await AsyncStorage.setItem(DEV_PRO_KEY, '1')
    setView('tutorial')
  }

  function handleRestore() {
    console.log('restore purchases')
  }

  function finishTutorial() {
    router.replace('/(tabs)/home' as any)
  }

  if (view === 'tutorial') {
    return <TutorialView c={c} firstName={firstName} onFinish={finishTutorial} />
  }

  if (view === 'features') {
    return <FeaturesView c={c} onNext={() => setView('referral')} onDismiss={hardDismiss} />
  }

  if (view === 'referral') {
    return (
      <ReferralView
        c={c}
        onNext={() => setView('redeem')}
        onBack={() => setView('features')}
        onDismiss={hardDismiss}
      />
    )
  }

  if (view === 'redeem') {
    return (
      <RedeemView
        c={c}
        onNext={() => setView('trial')}
        onSkip={() => setView('trial')}
        onBack={() => setView('referral')}
      />
    )
  }

  if (view === 'trial') {
    return (
      <TrialView
        c={c}
        plan={plan}
        setPlan={setPlan}
        onUpgrade={handleUpgrade}
        onRestore={handleRestore}
        onBack={() => setView('redeem')}
        onMaybeLater={() => setView('downsell')}
      />
    )
  }

  return (
    <DownsellView
      c={c}
      onUpgrade={handleUpgrade}
      onDismiss={hardDismiss}
    />
  )
}
