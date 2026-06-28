import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Modal, Pressable,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb } from '@/lib/db'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import { ContactAvatar } from '@/components/ContactAvatar'
import { AddContactModal } from '@/components/AddContactModal'
import { FloatingNav } from '@/components/FloatingNav'
import type { Contact } from '@/types'

// ── Types / helpers ───────────────────────────────────────────────────────────

type SortMode = 'urgency' | 'az'

const PRESET_TAG_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444', Professor: '#F59E0B',
}
const CUSTOM_TAG_PALETTE = ['#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6']
function typeColor(t?: string | null): string {
  const tag = t ?? ''
  if (PRESET_TAG_COLORS[tag]) return PRESET_TAG_COLORS[tag]
  if (!tag) return '#6B7280'
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff
  return CUSTOM_TAG_PALETTE[h % CUSTOM_TAG_PALETTE.length]
}

const STATUS_ORDER: Record<string, number> = { overdue: 0, 'due-soon': 1, good: 2 }

function applyFilters(
  list: Contact[],
  query: string,
  sort: SortMode,
  typeFilter: string | null,
) {
  let out = list

  if (query.trim()) {
    const q = query.trim().toLowerCase()
    out = out.filter(ct =>
      ct.name.toLowerCase().includes(q) ||
      (ct.role ?? '').toLowerCase().includes(q) ||
      (ct.position ?? '').toLowerCase().includes(q) ||
      (ct.relationship_type ?? '').toLowerCase().includes(q)
    )
  }

  if (typeFilter) {
    out = out.filter(ct => ct.relationship_type === typeFilter)
  }

  if (sort === 'az') {
    return [...out].sort((a, b) => a.name.localeCompare(b.name))
  }
  return [...out].sort((a, b) => {
    const d = (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2)
    return d !== 0 ? d : b.days_since_contact - a.days_since_contact
  })
}

// ── FilterSheet ───────────────────────────────────────────────────────────────

function FilterSheet({
  visible, onClose,
  sort, onSort,
  typeFilter, onTypeFilter,
  availableTypes,
}: {
  visible: boolean
  onClose: () => void
  sort: SortMode
  onSort: (s: SortMode) => void
  typeFilter: string | null
  onTypeFilter: (t: string | null) => void
  availableTypes: string[]
}) {
  const c = useColors()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
        onPress={onClose}
      >
        {/* Sheet — stop propagation so tapping inside doesn't close */}
        <Pressable
          onPress={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: c.surface,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          <Text style={{
            fontFamily: FontFamily.display, fontSize: 20, color: c.primary,
            paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4,
          }}>
            Sort & Filter
          </Text>

          {/* ── Sort section ── */}
          <Text style={{
            fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 1,
            textTransform: 'uppercase', color: c.secondary,
            paddingHorizontal: 20, marginBottom: 10,
          }}>
            Sort by
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 }}>
            {(['urgency', 'az'] as SortMode[]).map(s => {
              const active = sort === s
              const label = s === 'urgency' ? 'Urgency' : 'A – Z'
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => onSort(s)}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, height: 44, borderRadius: 12,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? c.gold : c.border,
                    backgroundColor: active ? c.gold + '12' : c.background,
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'row', gap: 6,
                  }}
                >
                  <Ionicons
                    name={s === 'urgency' ? 'flame' : 'text'}
                    size={15}
                    color={active ? c.gold : c.tertiary}
                  />
                  <Text style={{
                    fontFamily: active ? FontFamily.sansMedium : FontFamily.sans,
                    fontSize: 14, color: active ? c.gold : c.secondary,
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* ── Type filter section ── */}
          {availableTypes.length > 0 && (
            <>
              <Text style={{
                fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 1,
                textTransform: 'uppercase', color: c.secondary,
                paddingHorizontal: 20, marginBottom: 10,
              }}>
                Filter by type
              </Text>
              <View style={{
                flexDirection: 'row', flexWrap: 'wrap',
                gap: 10, paddingHorizontal: 20, marginBottom: 8,
              }}>
                {/* "All" chip */}
                {(() => {
                  const active = typeFilter === null
                  return (
                    <TouchableOpacity
                      onPress={() => onTypeFilter(null)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? c.primary : c.border,
                        backgroundColor: active ? c.primary + '12' : c.background,
                      }}
                    >
                      <Text style={{
                        fontFamily: active ? FontFamily.sansMedium : FontFamily.sans,
                        fontSize: 14, color: active ? c.primary : c.secondary,
                      }}>
                        All
                      </Text>
                    </TouchableOpacity>
                  )
                })()}

                {availableTypes.map(t => {
                  const active = typeFilter === t
                  const tc = typeColor(t)
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => onTypeFilter(active ? null : t)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 7,
                        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? tc : c.border,
                        backgroundColor: active ? tc + '14' : c.background,
                      }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tc }} />
                      <Text style={{
                        fontFamily: active ? FontFamily.sansMedium : FontFamily.sans,
                        fontSize: 14, color: active ? tc : c.secondary,
                      }}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          {/* Done button */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              marginHorizontal: 20, marginTop: 16, backgroundColor: c.gold,
              borderRadius: 999, paddingVertical: 15, alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: '#fff' }}>
              Done
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AllContactsScreen() {
  const c = useColors()
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('urgency')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  const load = useCallback(async () => {
    const cts = await contactsDb.list(fresh => setContacts(fresh))
    setContacts(cts)
  }, [])

  useEffect(() => { load() }, [load])

  // Build available type list dynamically from actual data
  const availableTypes = Array.from(
    new Set(contacts.map(ct => ct.relationship_type).filter(Boolean) as string[])
  ).sort()

  const results = applyFilters(contacts, query, sort, typeFilter)

  // Badge count for active filters (not counting sort, only type filter)
  const activeFilterCount = (typeFilter ? 1 : 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={c.primary} />
        </TouchableOpacity>

        <Text style={{
          flex: 1, fontFamily: FontFamily.display, fontSize: 26,
          color: c.primary, letterSpacing: 0.2,
        }}>
          All contacts
        </Text>

        <TouchableOpacity
          onPress={() => setAddOpen(true)}
          activeOpacity={0.75}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: c.surface,
            borderWidth: 1, borderColor: c.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Search + filter row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, gap: 10, marginBottom: 14,
      }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: c.surface, borderRadius: 12,
          borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, height: 44,
        }}>
          <Ionicons name="search-outline" size={17} color={c.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search contacts"
            placeholderTextColor={c.tertiary}
            style={{
              flex: 1, fontFamily: FontFamily.sans, fontSize: 15,
              color: c.primary, paddingVertical: 0,
            }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter button — shows badge if a type filter is active */}
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          activeOpacity={0.75}
          style={{
            height: 44, paddingHorizontal: 14, borderRadius: 12,
            backgroundColor: (activeFilterCount > 0 || sort !== 'urgency') ? c.gold + '14' : c.surface,
            borderWidth: 1,
            borderColor: (activeFilterCount > 0 || sort !== 'urgency') ? c.gold : c.border,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 6,
          }}
        >
          <Ionicons
            name="options-outline"
            size={17}
            color={(activeFilterCount > 0 || sort !== 'urgency') ? c.gold : c.secondary}
          />
          <Text style={{
            fontFamily: FontFamily.sansMedium, fontSize: 14,
            color: (activeFilterCount > 0 || sort !== 'urgency') ? c.gold : c.primary,
          }}>
            {typeFilter ?? (sort === 'az' ? 'A – Z' : 'Filter')}
          </Text>
          {activeFilterCount > 0 && (
            <View style={{
              width: 16, height: 16, borderRadius: 8,
              backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10, color: '#fff' }}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Count */}
      <Text style={{
        fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 1,
        textTransform: 'uppercase', color: c.secondary,
        paddingHorizontal: 18, marginBottom: 10,
      }}>
        {results.length} {results.length === 1 ? 'person' : 'people'}
      </Text>

      {/* Contact list */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 112 }}
      >
        {results.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
            <Ionicons name="search-outline" size={36} color={c.border} />
            <Text style={{ fontFamily: FontFamily.display, fontSize: 18, color: c.primary }}>
              {query || typeFilter ? 'No results' : 'No contacts yet'}
            </Text>
            {query || typeFilter ? (
              <TouchableOpacity
                onPress={() => { setQuery(''); setTypeFilter(null) }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold }}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setAddOpen(true)} activeOpacity={0.75}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold }}>
                  Add your first contact
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{
            backgroundColor: c.surface, borderRadius: 20,
            borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden',
          }}>
            {results.map((ct, i) => {
              const tc = typeColor(ct.relationship_type)
              const statusColor =
                ct.status === 'overdue' ? c.overdue :
                ct.status === 'due-soon' ? c.warning : c.success
              const subtitle = [ct.position, ct.role].filter(Boolean).join(' · ')

              return (
                <TouchableOpacity
                  key={ct.id}
                  onPress={() => router.push(`/contact/${ct.id}` as any)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border,
                  }}
                >
                  {/* Colored left border */}
                  <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: tc }} />

                  {/* Avatar */}
                  <View style={{ paddingLeft: 12, paddingVertical: 14 }}>
                    <ContactAvatar
                      name={ct.name}
                      avatarUrl={ct.avatar_url}
                      size={46}
                      borderRadius={23}
                      bgColor={tc}
                    />
                  </View>

                  {/* Name + subtitle */}
                  <View style={{ flex: 1, paddingLeft: 12, paddingRight: 8, paddingVertical: 14, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text
                        style={{ fontFamily: FontFamily.display, fontSize: 15.5, color: c.primary }}
                        numberOfLines={1}
                      >
                        {ct.name}
                      </Text>
                      {ct.is_favorite && (
                        <Ionicons name="heart" size={13} color={c.gold} />
                      )}
                    </View>
                    {!!subtitle && (
                      <Text
                        style={{ fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {subtitle}
                      </Text>
                    )}
                  </View>

                  {/* Right: status + days + cadence */}
                  <View style={{ alignItems: 'flex-end', paddingRight: 16, paddingVertical: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor }} />
                      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13.5, color: statusColor }}>
                        {ct.days_since_contact}d
                      </Text>
                    </View>
                    <Text style={{ fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, marginTop: 2 }}>
                      {ct.cadence_days}d cadence
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter sheet */}
      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sort={sort}
        onSort={setSort}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        availableTypes={availableTypes}
      />

      <AddContactModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={ct => { setContacts(prev => [ct, ...prev]); setAddOpen(false) }}
      />

      <FloatingNav
        items={[
          { id: 'network', label: 'Network', icon: 'people-outline', onPress: () => router.navigate({ pathname: '/(tabs)/home', params: { tab: 'network' } } as any) },
          { id: 'inbox',   label: 'Inbox',   icon: 'mail-outline',   onPress: () => router.navigate({ pathname: '/(tabs)/home', params: { tab: 'inbox' } } as any) },
          { id: 'add',     label: 'Add',     icon: 'add-circle-outline', onPress: () => setAddOpen(true) },
          { id: 'search',  label: 'Search',  icon: 'search', onPress: () => scrollRef.current?.scrollTo({ y: 0, animated: true }) },
        ]}
      />
    </SafeAreaView>
  )
}
