import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Animated, Easing as RNEasing,
} from 'react-native'
import ReAnimated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { contactsDb, oppsDb, pendingDb, notifDb, getTrackerData } from '@/lib/db'
import { WelcomeOverlay } from '@/components/WelcomeOverlay'
import { TITLE_PREF_KEY } from '@/app/(tabs)/settings'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { StatusBadge } from '@/components/StatusBadge'
import { Stars } from '@/components/Stars'
import { AddContactModal } from '@/components/AddContactModal'
import { AnimatedPressable } from '@/components/AnimatedPressable'
import { useTabBarPadding } from '@/components/FloatingTabBar'
import { useAuth } from '@/hooks/useAuth'
import { ModeToggle } from '@/components/ModeToggle'
import { LearnHome } from '@/components/LearnHome'
import type { Contact, Opportunity, PendingResponse, Notification } from '@/types'

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

function hoursAgo(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000
}

function pendingTimeLabel(h: number) {
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h ago`
  const d = Math.floor(h / 24)
  return `${d}${d === 1 ? ' day' : ' days'} ago`
}

function pendingTimeColor(c: ColorPalette, h: number) {
  if (h < 6) return c.secondary
  if (h < 24) return c.warning
  return c.overdue
}

function scoreColor(c: ColorPalette, s: number) {
  if (s >= 80) return c.success
  if (s >= 60) return c.warning
  return c.overdue
}

function scoreLabel(s: number) {
  if (s >= 90) return 'Excellent'
  if (s >= 75) return 'Strong'
  if (s >= 60) return 'Needs Attention'
  return 'Critical'
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 16, paddingTop: 4 },
    logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
    logoDark: { fontFamily: FontFamily.display, fontSize: 52, color: c.primary, letterSpacing: 1, lineHeight: 56 },
    logoBlue: { fontFamily: FontFamily.display, fontSize: 52, color: c.gold, fontStyle: 'italic', letterSpacing: 1, lineHeight: 56 },
    logoSlashWrap: { position: 'relative' },
    logoSlash: {
      position: 'absolute', width: 3, height: 72,
      backgroundColor: c.surface, top: -8, left: '54%',
      transform: [{ rotate: '-18deg' }],
    },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute', top: 4, right: 4,
      backgroundColor: c.gold, borderRadius: 5,
      width: 10, height: 10,
    },
    badgeText: { fontFamily: FontFamily.sans, fontSize: 9, color: '#fff', fontWeight: 'bold' },
    addBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center',
    },
    healthCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 18, marginBottom: 20,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    healthTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    healthLabel: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, letterSpacing: 2 },
    healthScore: { fontFamily: FontFamily.display, fontSize: 28, lineHeight: 36 },
    healthBarTrack: {
      height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6,
    },
    healthBarFill: { height: 6, borderRadius: 3, overflow: 'hidden' },
    healthStatus: { fontFamily: FontFamily.sans, fontSize: 12 },
    statGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    statCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: Radius.card,
      paddingVertical: 14, alignItems: 'center',
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    statValue: { fontFamily: FontFamily.display, fontSize: 30, lineHeight: 32 },
    statLabel: { fontFamily: FontFamily.sans, fontSize: 9, color: c.tertiary, letterSpacing: 1.5, marginTop: 2, marginBottom: 6 },
    greetingBlock: { marginBottom: 28 },
    greetingText: { fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary },
    greetingName: { fontFamily: FontFamily.display, fontSize: 36, color: c.primary, lineHeight: 40 },
    section: { marginBottom: 28 },
    sectionLabel: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, letterSpacing: 2.5, marginBottom: 12 },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    pendingName: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    pendingSubject: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 1 },
    pendingTime: { fontFamily: FontFamily.sans, fontSize: 11, flexShrink: 0 },
    heroCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    medCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    avatar: {
      width: 48, height: 48, borderRadius: 12,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary },
    heroName: { fontFamily: FontFamily.display, fontSize: 22, color: c.primary, lineHeight: 24 },
    medName: { fontFamily: FontFamily.display, fontSize: 19, color: c.primary, lineHeight: 22 },
    cardRole: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 2 },
    daysRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    heroDays: { fontFamily: FontFamily.display, fontSize: 56, lineHeight: 58 },
    medDays: { fontFamily: FontFamily.display, fontSize: 44, lineHeight: 46 },
    daysAgo: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    urgentBanner: {
      marginTop: 12, marginHorizontal: -16, marginBottom: -16,
      paddingHorizontal: 16, paddingVertical: 8,
      backgroundColor: c.warning + '18',
      borderTopWidth: 1, borderTopColor: c.warning + '33',
      borderBottomLeftRadius: Radius.card, borderBottomRightRadius: Radius.card,
    },
    urgentText: { fontFamily: FontFamily.sans, fontSize: 11, color: c.warning },
    compactRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    compactAvatar: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
    },
    compactAvatarText: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary },
    compactName: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, flex: 1 },
    compactRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    compactDays: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', marginTop: 48 },
    growCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 16, marginTop: 8, marginBottom: 32,
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    growAvatar: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    growText: { flex: 1 },
    growTitle: { fontFamily: FontFamily.display, fontSize: 19, color: c.primary },
    growSub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 3 },
    activitySection: { marginBottom: 28 },
    activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    viewAllText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    activityRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    activityAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    activityAvatarText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary },
    activityName: { fontFamily: FontFamily.display, fontSize: 17, color: c.primary },
    activityLabel: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold, marginTop: 2 },
    activityTime: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, flexShrink: 0 },
  })
}

function StatCard({ label, value, color, icon, onPress }: { label: string; value: number; color: string; icon: string; onPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Ionicons name={icon as any} size={16} color={color} />
    </TouchableOpacity>
  )
}

function NetworkHealthBar({ score }: { score: number }) {
  const c = useColors()
  const styles = makeStyles(c)
  const color = scoreColor(c, score)
  const label = scoreLabel(score)
  const barAnim = useRef(new Animated.Value(0)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const [containerWidth, setContainerWidth] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    if (containerWidth === 0) return
    const targetWidth = (score / 100) * containerWidth

    const startTime = Date.now()
    const duration = 1400
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(eased * score))
      if (t >= 1) clearInterval(interval)
    }, 16)

    barAnim.setValue(0)
    Animated.timing(barAnim, {
      toValue: targetWidth,
      duration: 1400,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return
      if (score < 60) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 4, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start()
      } else if (score >= 80) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: -4, duration: 80, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 4, duration: 80, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -2, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start()
      }
    })

    return () => clearInterval(interval)
  }, [score, containerWidth])

  return (
    <Animated.View style={[styles.healthCard, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={styles.healthTop}>
        <Text style={styles.healthLabel}>NETWORK HEALTH</Text>
        <Text style={[styles.healthScore, { color }]}>{displayScore}</Text>
      </View>
      <View
        style={styles.healthBarTrack}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.healthBarFill, { width: barAnim }]}>
          <LinearGradient
            colors={[c.gold, c.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
      <Text style={[styles.healthStatus, { color }]}>{label}</Text>
    </Animated.View>
  )
}

function HeroCard({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  const hasUrgentOpp = contact.linked_opportunity?.deadline &&
    Math.ceil((new Date(contact.linked_opportunity.deadline).getTime() - Date.now()) / 86_400_000) <= 7
  return (
    <AnimatedPressable style={styles.heroCard} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(contact.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{contact.name}</Text>
            <Text style={styles.cardRole}>{contact.role}</Text>
          </View>
        </View>
        <StatusBadge status="overdue" />
      </View>
      <View style={styles.cardBottom}>
        <Stars count={contact.stars} size={13} />
        <View style={styles.daysRow}>
          <Text style={[styles.heroDays, { color: c.overdue }]}>{contact.days_since_contact}</Text>
          <Text style={styles.daysAgo}>days ago</Text>
        </View>
      </View>
      {hasUrgentOpp && contact.linked_opportunity && (
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentText}>⚡ {contact.linked_opportunity.title} — deadline approaching</Text>
        </View>
      )}
    </AnimatedPressable>
  )
}

function MediumCard({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  const dayColor = contact.status === 'overdue' ? c.overdue : c.warning
  return (
    <AnimatedPressable style={styles.medCard} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { width: 44, height: 44 }]}>
            <Text style={[styles.avatarText, { fontSize: 14 }]}>{initials(contact.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medName}>{contact.name}</Text>
            <Text style={styles.cardRole}>{contact.role}</Text>
          </View>
        </View>
        <StatusBadge status={contact.status} />
      </View>
      <View style={styles.cardBottom}>
        <Stars count={contact.stars} size={11} />
        <View style={styles.daysRow}>
          <Text style={[styles.medDays, { color: dayColor }]}>{contact.days_since_contact}</Text>
          <Text style={styles.daysAgo}>days ago</Text>
        </View>
      </View>
    </AnimatedPressable>
  )
}

function GrowNetworkCard({ onPress }: { onPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  return (
    <TouchableOpacity style={styles.growCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.growAvatar}>
        <Ionicons name="person-add-outline" size={20} color={c.secondary} />
      </View>
      <View style={styles.growText}>
        <Text style={styles.growTitle}>Grow Your Network</Text>
        <Text style={styles.growSub}>A strong orbit always has someone to reach out to.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.tertiary} />
    </TouchableOpacity>
  )
}

function activityLabel(contact: Contact): string {
  if (contact.days_since_contact === 0) return 'Reconnected today'
  if (contact.days_since_contact <= 2) return 'Reconnected'
  if (contact.status === 'due-soon') return 'Follow up due soon'
  if (contact.status === 'overdue') return 'Follow up overdue'
  return 'Keeping in touch'
}

function activityTimeLabel(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function ActivityRow({ contact, last, onPress }: { contact: Contact; last?: boolean; onPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  return (
    <TouchableOpacity
      style={[styles.activityRow, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.activityAvatar}>
        <Text style={styles.activityAvatarText}>{initials(contact.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityName} numberOfLines={1}>{contact.name}</Text>
        <Text style={styles.activityLabel}>{activityLabel(contact)}</Text>
      </View>
      <Text style={styles.activityTime}>{activityTimeLabel(contact.days_since_contact)}</Text>
    </TouchableOpacity>
  )
}

function CompactRow({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  const dotColor = contact.status === 'overdue' ? c.overdue
    : contact.status === 'due-soon' ? c.warning : c.success
  return (
    <AnimatedPressable style={styles.compactRow} onPress={onPress}>
      <View style={styles.compactAvatar}>
        <Text style={styles.compactAvatarText}>{initials(contact.name)}</Text>
      </View>
      <Text style={styles.compactName} numberOfLines={1}>{contact.name}</Text>
      <View style={styles.compactRight}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.compactDays}>{contact.days_since_contact}d</Text>
      </View>
    </AnimatedPressable>
  )
}

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { welcome } = useLocalSearchParams<{ welcome?: string }>()
  const c = useColors()
  const styles = makeStyles(c)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [pending, setPending] = useState<PendingResponse[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [orbitScore, setOrbitScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(welcome === '1')
  const [titlePref, setTitlePref] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)
  const [learnMode, setLearnMode] = useState(false)
  const tabBarPadding = useTabBarPadding()

  useEffect(() => {
    AsyncStorage.getItem(TITLE_PREF_KEY).then(v => setTitlePref(v ?? '')).catch(() => {})
    AsyncStorage.getItem('dialed_home_mode').then(v => { if (v === 'learn') setLearnMode(true) }).catch(() => {})
  }, [])

  function handleModeChange(m: 'learn' | 'maintain') {
    setLearnMode(m === 'learn')
    AsyncStorage.setItem('dialed_home_mode', m).catch(() => {})
  }

  const loadData = useCallback(async () => {
    try {
      const [c, o, p, n, tracker] = await Promise.all([
        contactsDb.list(fresh => setContacts(fresh)),
        oppsDb.list(fresh => setOpps(fresh)),
        pendingDb.list(fresh => setPending(fresh)),
        notifDb.list(fresh => setNotifications(fresh)),
        getTrackerData(),
      ])
      setContacts(c); setOpps(o); setPending(p); setNotifications(n)
      setOrbitScore(tracker.orbitScore)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (!loading && !hasLoaded) setHasLoaded(true) }, [loading])
  useFocusEffect(useCallback(() => { loadData() }, [loadData]))
  function onRefresh() { setRefreshing(true); loadData() }

  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const unread = notifications.filter(n => !n.is_read).length
  const overdueCt = contacts.filter(contact => contact.status === 'overdue').length
  const dueSoonCt = contacts.filter(contact => contact.status === 'due-soon').length
  const awaitingCt = pending.length
  const activeOppsCt = opps.filter(o => o.state === 'active' || o.state === 'upcoming').length
  const overdueOppsCt = opps.filter(o => o.state === 'overdue').length
  const attentionCt = overdueCt + dueSoonCt
  const attentionContacts = contacts.filter(c => c.status === 'overdue' || c.status === 'due-soon')
    .sort((a, b) => {
      const order = { overdue: 0, 'due-soon': 1, good: 2 }
      const statusDiff = order[a.status] - order[b.status]
      if (statusDiff !== 0) return statusDiff
      return b.days_since_contact - a.days_since_contact
    })
  const recentContacts = [...contacts]
    .sort((a, b) => a.days_since_contact - b.days_since_contact)
    .slice(0, 3)

  function tier(contact: Contact): 1 | 2 | 3 {
    if (contact.stars === 5 && contact.status === 'overdue') return 1
    if (contact.stars >= 4 || contact.status === 'due-soon') return 2
    return 3
  }

  const orbitStats = {
    overdue: overdueCt,
    dueSoon: dueSoonCt,
    totalContacts: contacts.length,
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sticky header + toggle — outside the ScrollView so they stay fixed */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoDark}>DI</Text>
          <View style={styles.logoSlashWrap}>
            <Text style={styles.logoBlue}>AL</Text>
            <View style={styles.logoSlash} />
          </View>
          <Text style={styles.logoDark}>ED</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={c.secondary} />
            {unread > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={c.background} />
          </TouchableOpacity>
        </View>
      </View>

      <ModeToggle mode={learnMode ? 'learn' : 'maintain'} onChange={handleModeChange} />

      {learnMode ? (
        <LearnHome orbitStats={orbitStats} />
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.secondary} />}
      >
        {orbitScore !== null && <NetworkHealthBar score={orbitScore} />}

        <View style={styles.statGrid}>
          <StatCard label="OVERDUE" value={overdueCt} color={c.overdue} icon="alarm-outline" onPress={() => router.push('/(tabs)/orbit?filter=overdue')} />
          <StatCard label="DUE SOON" value={dueSoonCt} color={c.warning} icon="calendar-outline" onPress={() => router.push('/(tabs)/orbit?filter=due-soon')} />
          <StatCard label="AWAITING" value={awaitingCt} color={c.warning} icon="hourglass-outline" onPress={() => router.push('/(tabs)/orbit?filter=all')} />
          <StatCard label="ACTIVE" value={activeOppsCt} color={c.success} icon="people-outline" onPress={() => router.push('/(tabs)/opportunities?filter=upcoming')} />
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.greetingText}>{greeting()}</Text>
          <Text style={styles.greetingName}>{firstName}</Text>
        </View>

        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WAITING FOR YOUR REPLY</Text>
            {pending.map(pr => {
              const h = hoursAgo(pr.detected_at)
              return (
                <TouchableOpacity
                  key={pr.id}
                  style={styles.pendingRow}
                  onPress={() => router.push(`/contact/${pr.contact_id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: c.warning, width: 8, height: 8 }]} />
                  <View style={[styles.compactAvatar, { width: 40, height: 40 }]}>
                    <Text style={styles.compactAvatarText}>{initials(pr.contact.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName} numberOfLines={1}>{pr.contact.name}</Text>
                    <Text style={styles.pendingSubject} numberOfLines={1}>{pr.email_subject}</Text>
                  </View>
                  <Text style={[styles.pendingTime, { color: pendingTimeColor(c, h) }]}>
                    {pendingTimeLabel(h)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <Text style={styles.sectionLabel}>NEEDS ATTENTION</Text>

        {loading ? (
          <ActivityIndicator color={c.gold} style={{ marginTop: 32 }} />
        ) : contacts.length === 0 ? (
          <Text style={styles.emptyText}>No contacts yet. Add someone to your orbit.</Text>
        ) : attentionContacts.length === 0 ? (
          <Text style={[styles.emptyText, { marginTop: 16, marginBottom: 8 }]}>
            You're all caught up.
          </Text>
        ) : (
          attentionContacts.map((contact, index) => {
            const t = tier(contact)
            const entering = hasLoaded ? undefined : FadeInDown.delay(Math.min(index, 8) * 60).springify()
            return (
              <ReAnimated.View key={contact.id} entering={entering} exiting={FadeOutUp.duration(300)}>
                {t === 1 && <HeroCard contact={contact} onPress={() => router.push(`/contact/${contact.id}`)} />}
                {t === 2 && <MediumCard contact={contact} onPress={() => router.push(`/contact/${contact.id}`)} />}
                {t === 3 && <CompactRow contact={contact} onPress={() => router.push(`/contact/${contact.id}`)} />}
              </ReAnimated.View>
            )
          })
        )}

        {!loading && contacts.length > 0 && attentionCt < 3 && (
          <GrowNetworkCard onPress={() => setAddOpen(true)} />
        )}

        {!loading && recentContacts.length > 0 && (
          <View style={styles.activitySection}>
            <View style={styles.activityHeader}>
              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orbit')} activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentContacts.map((contact, i) => (
              <ActivityRow
                key={contact.id}
                contact={contact}
                last={i === recentContacts.length - 1}
                onPress={() => router.push(`/contact/${contact.id}`)}
              />
            ))}
          </View>
        )}

        <View style={{ height: tabBarPadding }} />
      </ScrollView>
      )}

      <AddContactModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={contact => setContacts(prev => [contact, ...prev])}
      />

      {showWelcome && user && (
        <WelcomeOverlay
          greeting={greeting()}
          title={titlePref}
          name={titlePref
            ? (user.name.split(' ').slice(-1)[0] ?? user.name)
            : (user.name.split(' ')[0] ?? user.name)
          }
          statLine={
            overdueCt > 0
              ? `You have ${overdueCt} overdue contact${overdueCt !== 1 ? 's' : ''} needing attention`
              : awaitingCt > 0
              ? `You have ${awaitingCt} email${awaitingCt !== 1 ? 's' : ''} awaiting a reply`
              : `Your network is in good shape`
          }
          onDone={() => setShowWelcome(false)}
        />
      )}
    </SafeAreaView>
  )
}
