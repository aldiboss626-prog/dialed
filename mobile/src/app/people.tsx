import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { roleLabel } from './(tabs)/orbit'
import { ContactAvatar } from '@/components/ContactAvatar'
import { contactHealthScore, healthBand, healthColor, healthLabel } from '@/lib/health'
import type { HealthBandKey } from '@/lib/health'
import type { Contact } from '@/types'

type Band = 'all' | HealthBandKey

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingVertical: 14, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontFamily: FontFamily.display, fontSize: 22, color: c.primary },
    addBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center',
    },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: Spacing.lg, marginBottom: 12,
    },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.surface, borderRadius: Radius.card,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    searchInput: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    chipsRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8,
      paddingHorizontal: Spacing.lg, marginBottom: 14,
    },
    chip: { borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
    chipActive: { backgroundColor: c.gold, borderColor: c.gold },
    chipInactive: { backgroundColor: 'transparent', borderColor: c.border },
    chipTextActive: { fontFamily: FontFamily.sans, fontSize: 13, color: '#fff', fontWeight: '600' },
    chipTextInactive: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    sectionHeader: {
      paddingHorizontal: Spacing.lg, paddingVertical: 8,
      backgroundColor: c.background,
    },
    sectionLetter: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: Spacing.lg, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    avatar: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: c.gold + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarText: { fontFamily: FontFamily.display, fontSize: 15, color: c.gold },
    rowInfo: { flex: 1 },
    rowName: { fontFamily: FontFamily.display, fontSize: 16, color: c.primary },
    rowRole: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, flexShrink: 0 },
    statusChipText: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.tertiary },
  })
}

const BAND_CHIPS: { key: Band; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'strong', label: 'Strong' },
  { key: 'good', label: 'Good' },
  { key: 'needs-attention', label: 'Needs attention' },
  { key: 'critical', label: 'Critical' },
]

const VALID_BANDS: Band[] = ['all', 'strong', 'good', 'needs-attention', 'critical']

export default function PeopleScreen() {
  const c = useColors()
  const styles = makeStyles(c)
  const router = useRouter()
  const params = useLocalSearchParams<{ filter?: string }>()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const initialBand = VALID_BANDS.includes(params.filter as Band) ? (params.filter as Band) : 'all'
  const [filter, setFilter] = useState<Band>(initialBand)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [query, filter])

  const load = useCallback(async () => {
    try {
      const data = await contactsDb.list()
      setContacts(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return contacts
      .filter(ct => filter === 'all' || healthBand(contactHealthScore(ct)) === filter)
      .filter(ct => !q || ct.name.toLowerCase().includes(q) || roleLabel(ct).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [contacts, filter, query])

  // Alphabetical grouping
  const sections = useMemo(() => {
    const map = new Map<string, Contact[]>()
    for (const ct of filtered) {
      const letter = ct.name[0]?.toUpperCase() ?? '#'
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(ct)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const chipCounts = useMemo(() => {
    const counts: Record<Band, number> = { all: contacts.length, strong: 0, good: 0, 'needs-attention': 0, critical: 0 }
    for (const ct of contacts) counts[healthBand(contactHealthScore(ct))]++
    return counts
  }, [contacts])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All People</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/orbit' as any)} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={c.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people…"
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
      </View>

      <View style={styles.chipsRow}>
        {BAND_CHIPS.map(item => {
          const active = filter === item.key
          const count = chipCounts[item.key]
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => setFilter(item.key)}
              activeOpacity={0.75}
            >
              <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>
                {item.label}{count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={c.gold} />
      ) : sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No contacts found.</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
        >
          {sections.map(([letter, people]) => (
            <View key={letter}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLetter}>{letter}</Text>
              </View>
              {people.map((ct) => {
                const score = contactHealthScore(ct)
                const color = healthColor(c, score)
                return (
                  <TouchableOpacity
                    key={ct.id}
                    style={styles.row}
                    onPress={() => router.push(`/contact/${ct.id}` as any)}
                    activeOpacity={0.75}
                  >
                    <ContactAvatar name={ct.name} avatarUrl={ct.avatar_url} size={46} borderRadius={23} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{ct.name}</Text>
                      {!!roleLabel(ct) && <Text style={styles.rowRole}>{roleLabel(ct)}</Text>}
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: color + '18' }]}>
                      <Text style={[styles.statusChipText, { color }]}>{healthLabel(score)}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
          <View style={{ height: 112 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
