import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, useWindowDimensions,
} from 'react-native'
import ReAnimated, { FadeInDown } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb } from '@/lib/db'
import { scheduleContactReminders } from '@/lib/pushNotifications'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { useTabBarPadding } from '@/components/FloatingTabBar'
import { ContactAvatar } from '@/components/ContactAvatar'
import { HeaderBell } from '@/components/HeaderBell'
import { FilterSortSheet, DEFAULT_FILTERS } from '@/components/FilterSortSheet'
import type { FilterState } from '@/components/FilterSortSheet'
import { SkeletonBlock } from '@/components/SkeletonBlock'
import { LineChart } from '@/components/charts/LineChart'
import { contactHealthScore, healthColor } from '@/lib/health'
import type { Contact } from '@/types'

// ── Relationship type ring colors ─────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8',
  Friend: '#22C55E',
  Recruiter: '#EF4444',
  Professor: '#F59E0B',
  Other: '#6B7280',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

function buildRealScoreHistory(contacts: Contact[], periods: number): number[] {
  return Array.from({ length: periods }, (_, i) => {
    const daysAgo = (periods - 1 - i) * 30
    const existing = contacts.filter(c => daysSince(c.created_at) >= daysAgo)
    if (existing.length === 0) return 100
    let overdue = 0, due = 0
    for (const c of existing) {
      const eff = Math.max(0, c.days_since_contact - daysAgo)
      if (eff > c.cadence_days) overdue++
      else if (eff > c.cadence_days - 3) due++
    }
    return Math.max(0, Math.min(100, 100 - overdue * 12 - due * 5))
  })
}

function networkScore(contacts: Contact[]): number {
  if (!contacts.length) return 100
  const overdue = contacts.filter(c => c.status === 'overdue').length
  const due = contacts.filter(c => c.status === 'due-soon').length
  return Math.max(8, Math.min(100, Math.round(100 - overdue * 12 - due * 5)))
}

function networkScoreLabel(s: number) {
  if (s >= 85) return 'Strong'
  if (s >= 65) return 'Good'
  if (s >= 40) return 'Needs work'
  return 'At risk'
}

export function roleLabel(contact: Contact) {
  if (contact.position && contact.role) return `${contact.position} at ${contact.role}`
  return contact.position ?? contact.role ?? ''
}

// ── DonutRing ─────────────────────────────────────────────────────────────────

function DonutRing({ score, size, c }: { score: number; size: number; c: ColorPalette }) {
  const sw = Math.max(4, Math.round(size * 0.088))
  const r = (size - sw * 2) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const col = score >= 70 ? c.success : score >= 45 ? c.gold : score >= 25 ? c.warning : c.overdue
  const dash = circ * (score / 100)
  const showLabel = size >= 64

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cx} r={r} fill="none" stroke={c.border} strokeWidth={sw} />
          <Circle
            cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
          />
        </Svg>
      </View>
      <Text style={{ fontFamily: FontFamily.display, fontSize: Math.round(size * 0.27), color: c.primary, lineHeight: Math.round(size * 0.32) }}>
        {score}
      </Text>
      {showLabel && (
        <Text style={{ fontFamily: FontFamily.sans, fontSize: Math.round(size * 0.13), color: col, marginTop: 1 }}>
          {networkScoreLabel(score)}
        </Text>
      )}
    </View>
  )
}

// ── RingAvatar ────────────────────────────────────────────────────────────────

function RingAvatar({ contact, size = 46 }: { contact: Contact; size?: number }) {
  const ringColor = TYPE_COLORS[contact.relationship_type ?? 'Other'] ?? TYPE_COLORS.Other
  const inner = size - 5
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 2.5, borderColor: ringColor,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <ContactAvatar
        name={contact.name}
        avatarUrl={contact.avatar_url}
        size={inner}
        borderRadius={inner / 2}
      />
    </View>
  )
}

// ── TodaysAction ──────────────────────────────────────────────────────────────

function TodaysAction({ contacts, c, onOpen, onReachedOut }: {
  contacts: Contact[]
  c: ColorPalette
  onOpen: (id: number) => void
  onReachedOut: (id: number) => void
}) {
  const urgent = contacts
    .filter(ct => ct.status !== 'good')
    .sort((a, b) => b.days_since_contact - a.days_since_contact)
    .slice(0, 3)

  return (
    <LinearGradient
      colors={['#131C30', '#0D1526']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22, padding: 18, overflow: 'hidden' }}
    >
      {/* accent halo */}
      <View style={{
        position: 'absolute', top: -40, right: -30,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(37,99,235,0.16)',
      }} />

      {/* label row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Ionicons name="flame" size={18} color={urgent.length ? c.warning : c.success} />
        <Text style={{
          fontFamily: FontFamily.sansMedium, fontSize: 11,
          letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)',
        }}>
          Today's action
        </Text>
        <View style={{ flex: 1 }} />
        {urgent.length > 0 && (
          <View style={{ backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 2 }}>
            <Text style={{ fontFamily: FontFamily.display, fontSize: 13, color: '#fff' }}>{urgent.length}</Text>
          </View>
        )}
      </View>

      {urgent.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(22,163,74,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={22} color={c.success} />
          </View>
          <View>
            <Text style={{ fontFamily: FontFamily.display, fontSize: 17, color: '#fff' }}>You're all caught up</Text>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>No one's going cold today.</Text>
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {urgent.map(ct => {
            const overdueBy = Math.max(0, ct.days_since_contact - ct.cadence_days)
            return (
              <View key={ct.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => onOpen(ct.id)} activeOpacity={0.8}>
                  <RingAvatar contact={ct} size={44} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => onOpen(ct.id)} activeOpacity={0.8}>
                  <Text style={{ fontFamily: FontFamily.display, fontSize: 15.5, color: '#fff' }} numberOfLines={1}>
                    {ct.name}
                  </Text>
                  <Text style={{
                    fontFamily: FontFamily.sansMedium, fontSize: 13,
                    color: ct.status === 'overdue' ? 'rgba(239,68,68,0.95)' : 'rgba(245,158,11,0.95)',
                    marginTop: 1,
                  }}>
                    {ct.status === 'overdue' ? `${overdueBy}d overdue` : 'Due soon'} · {ct.cadence_days}d cadence
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: 11,
                    backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center',
                  }}
                  onPress={() => onReachedOut(ct.id)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#fff' }}>Reached out</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      )}
    </LinearGradient>
  )
}

// ── HealthPanel ───────────────────────────────────────────────────────────────

function HealthPanel({ contacts, c, chartWidth, filter, setFilter }: {
  contacts: Contact[]
  c: ColorPalette
  chartWidth: number
  filter: string
  setFilter: (f: string) => void
}) {
  const [open, setOpen] = useState(false)
  const score = networkScore(contacts)
  const needs = contacts.filter(ct => ct.status !== 'good').length
  const strong = contacts.filter(ct => ct.status === 'good').length
  const favs = contacts.filter(ct => ct.is_favorite).length
  const hist = buildRealScoreHistory(contacts, 6)

  const stats = [
    { key: 'needs', label: 'Needs attention', val: needs, col: c.overdue },
    { key: 'good', label: 'On track', val: strong, col: c.success },
    { key: 'fav', label: 'Favorites', val: favs, col: c.gold },
  ]

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden' }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.75}
      >
        <DonutRing score={score} size={44} c={c} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: c.primary }}>Network health</Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 }}>
            {open ? 'Tap to hide' : 'Tap to view analytics'}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.tertiary} />
      </TouchableOpacity>

      {open && (
        <ReAnimated.View entering={FadeInDown.duration(250)} style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 16 }}>
            <DonutRing score={score} size={92} c={c} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.secondary, marginBottom: 4 }}>
                6-month trend
              </Text>
              <LineChart data={hist} width={chartWidth} height={46} color={c.gold} gradId="orbit-health" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {stats.map(({ key, label, val, col }) => (
              <TouchableOpacity
                key={key}
                style={{
                  flex: 1, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: filter === key ? col : c.border,
                  backgroundColor: filter === key ? col + '14' : c.surface,
                  alignItems: 'center',
                }}
                onPress={() => setFilter(filter === key ? 'all' : key)}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FontFamily.display, fontSize: 20, color: col }}>{val}</Text>
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 11.5, color: c.secondary, marginTop: 2, textAlign: 'center' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ReAnimated.View>
      )}
    </View>
  )
}

// ── ContactRow ────────────────────────────────────────────────────────────────

function ContactRow({ contact, c, onOpen }: {
  contact: Contact
  c: ColorPalette
  onOpen: (id: number) => void
}) {
  const score = contactHealthScore(contact)
  const col = healthColor(c, score)

  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, paddingHorizontal: 16, paddingLeft: 18, position: 'relative' }}
      onPress={() => onOpen(contact.id)}
      activeOpacity={0.75}
    >
      {/* health band left bar */}
      <View style={{
        position: 'absolute', left: 0, top: 10, bottom: 10, width: 3.5,
        borderRadius: 99, backgroundColor: col,
        opacity: contact.status === 'good' ? 0.35 : 1,
      }} />
      <RingAvatar contact={contact} size={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: FontFamily.display, fontSize: 15.5, color: c.primary, flexShrink: 1 }} numberOfLines={1}>
            {contact.name}
          </Text>
          {contact.is_favorite && <Ionicons name="heart" size={13} color={c.gold} />}
        </View>
        {!!roleLabel(contact) && (
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 }} numberOfLines={1}>
            {roleLabel(contact)}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: col }} />
          <Text style={{ fontFamily: FontFamily.display, fontSize: 14, color: col }}>
            {contact.days_since_contact}d
          </Text>
        </View>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary }}>
          {contact.cadence_days}d cadence
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 4,
    },
    headerTitle: {
      fontFamily: FontFamily.display, fontSize: 30, color: c.primary, letterSpacing: -0.6,
    },
    headerRight: { flexDirection: 'row', gap: 10 },
    iconBtn: {
      width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 6,
    },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9,
      height: 44, paddingHorizontal: 14,
      backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    },
    searchInput: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    filterIconBtn: {
      width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
    },
    chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingBottom: 10 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      height: 34, paddingHorizontal: 15, borderRadius: Radius.full, borderWidth: 1,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipInactive: { backgroundColor: c.surface, borderColor: c.border },
    chipTextActive: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#fff' },
    chipTextInactive: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.secondary },
    chipCount: { fontFamily: FontFamily.display, fontSize: 12 },
    scrollContent: { paddingHorizontal: Spacing.lg, gap: 14 },
    listHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 4, paddingBottom: 10,
    },
    listHeaderTitle: {
      fontFamily: FontFamily.sansMedium, fontSize: 13,
      letterSpacing: 0.8, textTransform: 'uppercase', color: c.secondary,
    },
    listHeaderCount: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.tertiary },
    listCard: {
      backgroundColor: c.surface, borderRadius: 20,
      borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden', paddingVertical: 2,
    },
    rowSeparator: { height: 1, backgroundColor: c.subtleBorder, marginLeft: 75 },
    emptyCard: {
      backgroundColor: c.surface, borderRadius: 20,
      borderWidth: 1, borderColor: c.subtleBorder,
      padding: 32, alignItems: 'center',
    },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyTitle: { fontFamily: FontFamily.display, fontSize: 17, color: c.primary, marginBottom: 5 },
    emptyBody: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 20, textAlign: 'center', maxWidth: 240 },
    // Loading skeletons
    skeletonWrap: { padding: Spacing.lg, gap: 12 },
    // Search overlay
    searchOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: c.background, zIndex: 50,
    },
    dropdownItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: Spacing.lg, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    dropdownName: { fontFamily: FontFamily.display, fontSize: 16, color: c.primary },
    dropdownRole: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 },
    dropdownEmpty: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', paddingTop: 48 },
  })
}

// ── Screen ────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'needs' | 'good' | 'fav'

export default function OrbitScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()
  const tabBarPadding = useTabBarPadding()
  const { width: screenWidth } = useWindowDimensions()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  const loadContacts = useCallback(async () => {
    try {
      const data = await contactsDb.list(fresh => setContacts(fresh))
      setContacts(data)
      scheduleContactReminders(data).catch(() => {})
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { loadContacts() }, [loadContacts]))

  async function onRefresh() {
    setRefreshing(true)
    await loadContacts()
    setRefreshing(false)
  }

  async function onReachedOut(id: number) {
    // Optimistic update — UI responds instantly before DB round-trip
    setContacts(prev => prev.map(ct =>
      ct.id === id ? { ...ct, days_since_contact: 0, status: 'good' as Contact['status'] } : ct
    ))
    try {
      await contactsDb.talked(id)
    } catch {
      loadContacts()
    }
  }

  // ── Derived list ─────────────────────────────────────────────────────────

  let list = contacts

  // Primary filter (chip row + health panel stat buttons)
  if (filter === 'needs') list = list.filter(ct => ct.status !== 'good')
  else if (filter === 'good') list = list.filter(ct => ct.status === 'good')
  else if (filter === 'fav') list = list.filter(ct => ct.is_favorite)

  // FilterSortSheet (now actually applied)
  if (filters.health !== 'all') list = list.filter(ct =>
    filters.health === 'overdue' ? ct.status === 'overdue'
    : filters.health === 'due-soon' ? ct.status === 'due-soon'
    : ct.status === 'good'
  )
  if (filters.favoritesOnly) list = list.filter(ct => ct.is_favorite)
  if (filters.newThisMonth) list = list.filter(ct => daysSince(ct.created_at) <= 30)
  if (filters.neverContacted) list = list.filter(ct => ct.days_since_contact > 365)

  list = [...list].sort((a, b) => {
    if (filters.sort === 'name_az') return a.name.localeCompare(b.name)
    if (filters.sort === 'name_za') return b.name.localeCompare(a.name)
    if (filters.sort === 'health') return contactHealthScore(a) - contactHealthScore(b)
    if (filters.sort === 'date_added') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return b.days_since_contact - a.days_since_contact
  })

  const q = query.toLowerCase().trim()
  const searchResults = q
    ? contacts.filter(ct => ct.name.toLowerCase().includes(q) || roleLabel(ct).toLowerCase().includes(q))
    : []

  // Chart width: screen − side padding (18×2) − card padding (16×2) − donut (92) − gap (16)
  const chartWidth = Math.max(80, screenWidth - 36 - 32 - 92 - 16)

  const needsCount = contacts.filter(ct => ct.status !== 'good').length
  const favCount = contacts.filter(ct => ct.is_favorite).length

  const listTitle = filter === 'needs' ? 'Needs attention'
    : filter === 'fav' ? 'Favorites'
    : filter === 'good' ? 'On track'
    : 'All connections'

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.skeletonWrap}>
          <SkeletonBlock width="50%" height={38} borderRadius={10} />
          <SkeletonBlock height={130} borderRadius={22} />
          <SkeletonBlock height={64} borderRadius={20} />
          <SkeletonBlock height={220} borderRadius={20} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Network</Text>
        <View style={s.headerRight}>
          <HeaderBell />
        </View>
      </View>

      {/* Search + filter icon */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={c.tertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search your network…"
            placeholderTextColor={c.tertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={c.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterIconBtn} onPress={() => setFilterOpen(true)} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={20} color={c.secondary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={s.chipsRow}>
        {([
          { key: 'all' as FilterKey, label: 'All', count: contacts.length },
          { key: 'needs' as FilterKey, label: 'Needs attention', count: needsCount },
          { key: 'fav' as FilterKey, label: 'Favorites', count: favCount },
        ]).map(item => {
          const active = filter === item.key
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.chip, active ? s.chipActive : s.chipInactive]}
              onPress={() => setFilter(active && item.key !== 'all' ? 'all' : item.key)}
              activeOpacity={0.75}
            >
              <Text style={active ? s.chipTextActive : s.chipTextInactive}>{item.label}</Text>
              {item.count > 0 && (
                <Text style={[s.chipCount, { color: active ? 'rgba(255,255,255,0.7)' : c.tertiary }]}>
                  {item.count}
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scrollContent, { paddingBottom: tabBarPadding + 64, paddingTop: 4 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* Zone 1 — Today's Action */}
          <ReAnimated.View entering={FadeInDown.duration(350)}>
            <TodaysAction
              contacts={contacts}
              c={c}
              onOpen={id => router.push(`/contact/${id}` as any)}
              onReachedOut={onReachedOut}
            />
          </ReAnimated.View>

          {/* Zone 2 — Collapsible health panel */}
          <ReAnimated.View entering={FadeInDown.delay(60).duration(350)}>
            <HealthPanel
              contacts={contacts}
              c={c}
              chartWidth={chartWidth}
              filter={filter}
              setFilter={v => setFilter(v as FilterKey)}
            />
          </ReAnimated.View>

          {/* Zone 3 — Unified contact list */}
          <ReAnimated.View entering={FadeInDown.delay(120).duration(350)}>
            <View style={s.listHeader}>
              <Text style={s.listHeaderTitle}>{listTitle}</Text>
              <Text style={s.listHeaderCount}>{list.length}</Text>
            </View>

            {list.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={[s.emptyIcon, { backgroundColor: c.gold + '18' }]}>
                  <Ionicons
                    name={contacts.length > 0 ? 'checkmark-circle-outline' : 'people-outline'}
                    size={26}
                    color={c.gold}
                  />
                </View>
                <Text style={s.emptyTitle}>
                  {contacts.length === 0 ? 'Start your network' : 'Nothing here'}
                </Text>
                <Text style={s.emptyBody}>
                  {contacts.length === 0
                    ? 'Add the people who matter and Dialed will keep them from going cold.'
                    : 'No connections match this filter.'}
                </Text>
              </View>
            ) : (
              <View style={s.listCard}>
                {list.map((contact, i) => (
                  <View key={contact.id}>
                    {i > 0 && <View style={s.rowSeparator} />}
                    <ContactRow
                      contact={contact}
                      c={c}
                      onOpen={id => router.push(`/contact/${id}` as any)}
                    />
                  </View>
                ))}
              </View>
            )}
          </ReAnimated.View>
        </ScrollView>

        {/* Search dropdown overlay */}
        {q.length > 0 && (
          <ScrollView
            style={s.searchOverlay}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {searchResults.length === 0 ? (
              <Text style={s.dropdownEmpty}>No contacts match "{query}"</Text>
            ) : (
              searchResults.map(ct => (
                <TouchableOpacity
                  key={ct.id}
                  style={s.dropdownItem}
                  onPress={() => { setQuery(''); router.push(`/contact/${ct.id}` as any) }}
                  activeOpacity={0.75}
                >
                  <RingAvatar contact={ct} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.dropdownName}>{ct.name}</Text>
                    {!!roleLabel(ct) && <Text style={s.dropdownRole}>{roleLabel(ct)}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.tertiary} />
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: tabBarPadding }} />
          </ScrollView>
        )}
      </View>

      <FilterSortSheet
        visible={filterOpen}
        initial={filters}
        onApply={f => setFilters(f)}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  )
}
