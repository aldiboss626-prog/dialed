import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator, useWindowDimensions,
} from 'react-native'
import ReAnimated, { FadeInDown } from 'react-native-reanimated'
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
import { FilterSortSheet, DEFAULT_FILTERS } from '@/components/FilterSortSheet'
import type { FilterState } from '@/components/FilterSortSheet'
import { DonutChart } from '@/components/charts/DonutChart'
import { LineChart } from '@/components/charts/LineChart'
import type { Contact } from '@/types'

// ── Analytics helpers ─────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444',
  Professor: '#F59E0B', Other: '#6B7280',
}
const CAT_ORDER = ['Mentor', 'Friend', 'Recruiter', 'Professor', 'Other']

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
}

function deterministicHistory(current: number, periods: number, seed: number): number[] {
  const start = Math.max(5, current - 35)
  return Array.from({ length: periods }, (_, i) => {
    const t = i / Math.max(periods - 1, 1)
    const base = start + (current - start) * t
    const noise = ((i * seed + i * 3 + 11) % 11) - 5
    return Math.max(0, Math.min(100, Math.round(base + noise)))
  })
}

function scoreLabel(s: number) {
  if (s >= 85) return 'Great'
  if (s >= 70) return 'Strong'
  if (s >= 50) return 'Fair'
  return 'Needs Work'
}

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function roleLabel(contact: Contact) {
  if (contact.position && contact.role) return `${contact.position} at ${contact.role}`
  return contact.position ?? contact.role ?? ''
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 12,
    },
    headerTitle: { fontFamily: FontFamily.display, fontSize: 28, color: c.primary },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    addBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center',
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: Spacing.lg, marginBottom: 14,
    },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.surface, borderRadius: Radius.card,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    searchInput: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    filterIconBtn: {
      width: 44, height: 44, borderRadius: Radius.card,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: 20 },
    chip: {
      borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1,
    },
    chipActive: { backgroundColor: c.gold, borderColor: c.gold },
    chipInactive: { backgroundColor: 'transparent', borderColor: c.border },
    chipTextActive: { fontFamily: FontFamily.sans, fontSize: 13, color: '#fff', fontWeight: '600' },
    chipTextInactive: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    content: { paddingHorizontal: Spacing.lg },
    // Health card
    healthCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 18, marginBottom: 16, borderWidth: 1, borderColor: c.subtleBorder,
    },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
    },
    cardTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    viewLink: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    healthMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    healthLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
    healthScore: { fontFamily: FontFamily.display, fontSize: 38, lineHeight: 44, color: c.primary },
    healthStatusLabel: { fontFamily: FontFamily.sans, fontSize: 14, fontWeight: '600', marginTop: 2 },
    healthRight: { flex: 1, alignItems: 'flex-end', minWidth: 0, overflow: 'hidden' },
    healthTrend: { fontFamily: FontFamily.sans, fontSize: 11, marginTop: 4 },
    statRow: { flexDirection: 'row', gap: 8 },
    statBox: {
      flex: 1, backgroundColor: c.elevated, borderRadius: Radius.md,
      paddingVertical: 10, alignItems: 'center',
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    statBoxActive: { borderColor: c.gold, backgroundColor: c.gold + '14' },
    statValue: { fontFamily: FontFamily.display, fontSize: 22, lineHeight: 26 },
    statLabel: { fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary, letterSpacing: 0.4, marginTop: 2 },
    quickFilterHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12,
    },
    quickFilterTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    quickFilterClear: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      backgroundColor: c.elevated, borderRadius: Radius.full,
      borderWidth: 1, borderColor: c.border,
    },
    quickFilterClearTxt: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary },
    // Sections
    sectionCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.subtleBorder,
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
    },
    sectionTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    // Person rows
    personRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    personRowLast: { borderBottomWidth: 0 },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.gold + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarText: { fontFamily: FontFamily.display, fontSize: 15, color: c.gold },
    personInfo: { flex: 1 },
    personName: { fontFamily: FontFamily.display, fontSize: 16, color: c.primary },
    personRole: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 },
    personWarning: { fontFamily: FontFamily.sans, fontSize: 12, marginTop: 2 },
    connectBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.gold + '15', alignItems: 'center', justifyContent: 'center',
    },
    daysWrap: { alignItems: 'flex-end', gap: 5 },
    daysText: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary },
    dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'flex-end' },
    emptyText: {
      fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary,
      textAlign: 'center', paddingVertical: 20,
    },
    dropdownOverlay: {
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
    dropdownEmpty: {
      fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary,
      textAlign: 'center', paddingTop: 48,
    },
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

type ChipFilter = 'all' | 'favorites'
type QuickFilter = 'none' | 'needs-attention' | 'strong' | 'new'

export default function OrbitScreen() {
  const c = useColors()
  const styles = makeStyles(c)
  const router = useRouter()
  const tabBarPadding = useTabBarPadding()
  const { width } = useWindowDimensions()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState<ChipFilter>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('none')
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const base = chip === 'favorites' ? contacts.filter(ct => ct.is_favorite) : contacts

  const overdue = base.filter(ct => ct.status === 'overdue')
  const dueSoon = base.filter(ct => ct.status === 'due-soon')
  const good = base.filter(ct => ct.status === 'good')
  const needs = overdue.length + dueSoon.length
  const newThisMonth = base.filter(ct => daysSince(ct.created_at) <= 30).length
  const favCount = contacts.filter(ct => ct.is_favorite).length

  const orbitScore = Math.max(0, Math.min(100, 100 - overdue.length * 12 - dueSoon.length * 5))
  const catMap: Record<string, number> = { Mentor: 0, Friend: 0, Recruiter: 0, Professor: 0, Other: 0 }
  base.forEach(ct => { const k = ct.relationship_type ?? 'Other'; catMap[k] = (catMap[k] ?? 0) + 1 })
  const cats = CAT_ORDER.filter(k => catMap[k] > 0).map(k => ({ count: catMap[k], color: CAT_COLORS[k] }))
  const scoreHistory = deterministicHistory(orbitScore, 6, base.length + 7)
  const scoreChange = orbitScore - scoreHistory[scoreHistory.length - 2]
  const label = scoreLabel(orbitScore)
  const labelColor = orbitScore >= 70 ? c.success : orbitScore >= 50 ? c.warning : c.overdue

  const toConnect = [...overdue].sort((a, b) => b.days_since_contact - a.days_since_contact).slice(0, 5)
  const recentlyContacted = [...base].sort((a, b) => a.days_since_contact - b.days_since_contact).slice(0, 5)

  const quickFiltered: Contact[] = quickFilter === 'needs-attention' ? [...overdue, ...dueSoon].sort((a, b) => b.days_since_contact - a.days_since_contact)
    : quickFilter === 'strong' ? good.sort((a, b) => a.days_since_contact - b.days_since_contact)
    : quickFilter === 'new' ? base.filter(ct => daysSince(ct.created_at) <= 30).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : []

  const quickFilterLabel: Record<QuickFilter, string> = {
    'none': '', 'needs-attention': 'Needs Attention', 'strong': 'Strong', 'new': 'New This Month'
  }

  const q = query.toLowerCase().trim()
  const searchResults = q
    ? contacts.filter(ct =>
        ct.name.toLowerCase().includes(q) ||
        roleLabel(ct).toLowerCase().includes(q)
      ).sort((a, b) => a.name.localeCompare(b.name))
    : []

  // card padding (18×2) + content padding (Spacing.lg×2) + donut (80) + gap (16) + score column (~88)
  const chartW = Math.max(70, width - Spacing.lg * 2 - 36 - 80 - 16 - 88)

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={c.gold} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network</Text>
      </View>

      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={c.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your network…"
            placeholderTextColor={c.tertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={c.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterIconBtn} onPress={() => setFilterOpen(true)} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={20} color={c.secondary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.chipsRow}>
        {([
          { key: 'all' as ChipFilter, label: `All ${contacts.length}` },
          { key: 'favorites' as ChipFilter, label: favCount > 0 ? `Favorites ${favCount}` : 'Favorites' },
        ]).map(item => {
          const active = chip === item.key
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => setChip(active && item.key !== 'all' ? 'all' : item.key)}
              activeOpacity={0.75}
            >
              <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>{item.label}</Text>
            </TouchableOpacity>
          )
        })}
        <TouchableOpacity
          style={[styles.chip, styles.chipInactive]}
          onPress={() => router.push('/people' as any)}
          activeOpacity={0.75}
        >
          <Text style={styles.chipTextInactive}>Groups</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
      >
        {/* Network Health */}
        <ReAnimated.View entering={FadeInDown.duration(400)}>
          <View style={styles.healthCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Network Health</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tracker' as any)} activeOpacity={0.7}>
                <Text style={styles.viewLink}>View analytics</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.healthMain}>
              <View style={styles.healthLeft}>
                {cats.length > 0
                  ? <DonutChart cats={cats} size={80} />
                  : <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: c.border }} />
                }
                <View>
                  <Text style={styles.healthScore}>{orbitScore}</Text>
                  <Text style={[styles.healthStatusLabel, { color: labelColor }]}>{label}</Text>
                </View>
              </View>

              <View style={styles.healthRight}>
                <LineChart data={scoreHistory} width={chartW} height={44} color={c.success} gradId="orbit-health" />
                <Text style={[styles.healthTrend, { color: scoreChange >= 0 ? c.success : c.overdue }]}>
                  {scoreChange >= 0 ? '+' : ''}{scoreChange} this month
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <TouchableOpacity
                style={[styles.statBox, quickFilter === 'needs-attention' && styles.statBoxActive]}
                onPress={() => setQuickFilter(qf => qf === 'needs-attention' ? 'none' : 'needs-attention')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: c.overdue }]}>{needs}</Text>
                <Text style={styles.statLabel}>Needs attention</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statBox, quickFilter === 'strong' && styles.statBoxActive]}
                onPress={() => setQuickFilter(qf => qf === 'strong' ? 'none' : 'strong')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: c.success }]}>{good.length}</Text>
                <Text style={styles.statLabel}>Strong</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statBox, quickFilter === 'new' && styles.statBoxActive]}
                onPress={() => setQuickFilter(qf => qf === 'new' ? 'none' : 'new')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statValue, { color: c.gold }]}>{newThisMonth}</Text>
                <Text style={styles.statLabel}>New this month</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ReAnimated.View>

        {/* Quick-filter list — replaces sections when a stat box is tapped */}
        {quickFilter !== 'none' ? (
          <ReAnimated.View entering={FadeInDown.delay(80).duration(300)}>
            <View style={styles.sectionCard}>
              <View style={styles.quickFilterHeader}>
                <Text style={styles.quickFilterTitle}>{quickFilterLabel[quickFilter]}</Text>
                <TouchableOpacity style={styles.quickFilterClear} onPress={() => setQuickFilter('none')} activeOpacity={0.7}>
                  <Ionicons name="close" size={13} color={c.secondary} />
                  <Text style={styles.quickFilterClearTxt}>Clear</Text>
                </TouchableOpacity>
              </View>
              {quickFiltered.length === 0 ? (
                <Text style={styles.emptyText}>No contacts in this category.</Text>
              ) : (
                quickFiltered.map((contact, i) => {
                  const dotColor = contact.status === 'overdue' ? c.overdue
                    : contact.status === 'due-soon' ? c.warning : c.success
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={[styles.personRow, i === quickFiltered.length - 1 && styles.personRowLast]}
                      onPress={() => router.push(`/contact/${contact.id}` as any)}
                      activeOpacity={0.75}
                    >
                      <ContactAvatar name={contact.name} avatarUrl={contact.avatar_url} size={44} borderRadius={22} />
                      <View style={styles.personInfo}>
                        <Text style={styles.personName}>{contact.name}</Text>
                        {!!roleLabel(contact) && <Text style={styles.personRole}>{roleLabel(contact)}</Text>}
                      </View>
                      <View style={styles.daysWrap}>
                        <Text style={styles.daysText}>{contact.days_since_contact}d</Text>
                        <View style={[styles.dot, { backgroundColor: dotColor }]} />
                      </View>
                    </TouchableOpacity>
                  )
                })
              )}
            </View>
          </ReAnimated.View>
        ) : (
          <>
        {/* People to Connect With */}
        <ReAnimated.View entering={FadeInDown.delay(80).duration(400)}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>People to Connect With</Text>
              <TouchableOpacity onPress={() => router.push('/people' as any)} activeOpacity={0.7}>
                <Text style={styles.viewLink}>View all</Text>
              </TouchableOpacity>
            </View>

            {toConnect.length === 0 ? (
              <Text style={styles.emptyText}>You're all caught up!</Text>
            ) : (
              toConnect.map((contact, i) => (
                <TouchableOpacity
                  key={contact.id}
                  style={[styles.personRow, i === toConnect.length - 1 && styles.personRowLast]}
                  onPress={() => router.push(`/contact/${contact.id}` as any)}
                  activeOpacity={0.75}
                >
                  <ContactAvatar name={contact.name} avatarUrl={contact.avatar_url} size={44} borderRadius={22} />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{contact.name}</Text>
                    {!!roleLabel(contact) && <Text style={styles.personRole}>{roleLabel(contact)}</Text>}
                    <Text style={[styles.personWarning, { color: c.warning }]}>
                      Haven't connected in {contact.days_since_contact}d
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.connectBtn}
                    onPress={() => router.push(`/contact/${contact.id}` as any)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="person-add-outline" size={16} color={c.gold} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ReAnimated.View>

        {/* Recent Interactions */}
        <ReAnimated.View entering={FadeInDown.delay(160).duration(400)}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Interactions</Text>
              <TouchableOpacity onPress={() => router.push('/people' as any)} activeOpacity={0.7}>
                <Text style={styles.viewLink}>View all</Text>
              </TouchableOpacity>
            </View>

            {recentlyContacted.length === 0 ? (
              <Text style={styles.emptyText}>No contacts yet.</Text>
            ) : (
              recentlyContacted.map((contact, i) => {
                const dotColor = contact.status === 'overdue' ? c.overdue
                  : contact.status === 'due-soon' ? c.warning : c.success
                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={[styles.personRow, i === recentlyContacted.length - 1 && styles.personRowLast]}
                    onPress={() => router.push(`/contact/${contact.id}` as any)}
                    activeOpacity={0.75}
                  >
                    <ContactAvatar name={contact.name} avatarUrl={contact.avatar_url} size={44} borderRadius={22} />
                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>{contact.name}</Text>
                      {!!roleLabel(contact) && <Text style={styles.personRole}>{roleLabel(contact)}</Text>}
                    </View>
                    <View style={styles.daysWrap}>
                      <Text style={styles.daysText}>{contact.days_since_contact}d</Text>
                      <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    </View>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </ReAnimated.View>
          </>
        )}
      </ScrollView>

      {/* Search dropdown — overlays scroll content when query is active */}
      {q.length > 0 && (
        <ScrollView style={styles.dropdownOverlay} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {searchResults.length === 0 ? (
            <Text style={styles.dropdownEmpty}>No contacts match "{query}"</Text>
          ) : (
            searchResults.map(ct => (
              <TouchableOpacity
                key={ct.id}
                style={styles.dropdownItem}
                onPress={() => { setQuery(''); router.push(`/contact/${ct.id}` as any) }}
                activeOpacity={0.75}
              >
                <ContactAvatar name={ct.name} avatarUrl={ct.avatar_url} size={42} borderRadius={21} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownName}>{ct.name}</Text>
                  {!!roleLabel(ct) && <Text style={styles.dropdownRole}>{roleLabel(ct)}</Text>}
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
