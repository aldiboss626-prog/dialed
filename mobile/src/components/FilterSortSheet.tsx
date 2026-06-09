import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'

export type SortOption = 'last_interaction' | 'name_az' | 'name_za' | 'health' | 'date_added'
export type HealthFilter = 'all' | 'overdue' | 'due-soon' | 'good'

export interface FilterState {
  sort: SortOption
  health: HealthFilter
  favoritesOnly: boolean
  neverContacted: boolean
  newThisMonth: boolean
}

export const DEFAULT_FILTERS: FilterState = {
  sort: 'last_interaction',
  health: 'all',
  favoritesOnly: false,
  neverContacted: false,
  newThisMonth: false,
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'last_interaction', label: 'Last Interaction' },
  { value: 'name_az', label: 'Name (A – Z)' },
  { value: 'name_za', label: 'Name (Z – A)' },
  { value: 'health', label: 'Relationship Health' },
  { value: 'date_added', label: 'Date Added' },
]

const HEALTH_OPTIONS: { value: HealthFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Needs Attention' },
  { value: 'due-soon', label: 'Strong' },
  { value: 'good', label: 'Good' },
]

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.elevated, borderTopLeftRadius: Radius.sheet,
      borderTopRightRadius: Radius.sheet, maxHeight: '88%',
    },
    handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { fontFamily: FontFamily.display, fontSize: 20, color: c.primary },
    resetBtn: { fontFamily: FontFamily.sans, fontSize: 14, color: c.gold },
    section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 4 },
    sectionTitle: { fontFamily: FontFamily.sans, fontSize: 13, fontWeight: '600', color: c.primary, marginBottom: 12 },
    radioRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    radioLabel: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    radioDot: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    radioDotInner: { width: 10, height: 10, borderRadius: 5 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
    chip: {
      borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8,
      borderWidth: 1,
    },
    chipText: { fontFamily: FontFamily.sans, fontSize: 14 },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    toggleLabel: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    footer: {
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    applyBtn: {
      backgroundColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 14, alignItems: 'center',
    },
    applyText: { fontFamily: FontFamily.display, fontSize: 16, color: '#fff' },
    divider: { height: 1, backgroundColor: c.border, marginHorizontal: Spacing.lg },
  })
}

interface Props {
  visible: boolean
  initial: FilterState
  onApply: (f: FilterState) => void
  onClose: () => void
}

export function FilterSortSheet({ visible, initial, onApply, onClose }: Props) {
  const c = useColors()
  const styles = makeStyles(c)
  const [state, setState] = useState<FilterState>(initial)

  function patch(partial: Partial<FilterState>) {
    setState(prev => ({ ...prev, ...partial }))
  }

  function handleApply() {
    onApply(state)
    onClose()
  }

  function handleReset() {
    setState(DEFAULT_FILTERS)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={22} color={c.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetBtn}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Sort By */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              {SORT_OPTIONS.map((opt, i) => {
                const active = state.sort === opt.value
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.radioRow, i === SORT_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => patch({ sort: opt.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.radioLabel}>{opt.label}</Text>
                    <View style={[styles.radioDot, { borderColor: active ? c.gold : c.border }]}>
                      {active && <View style={[styles.radioDotInner, { backgroundColor: c.gold }]} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.divider} />

            {/* Filter by health */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter By</Text>
              <Text style={[styles.toggleLabel, { marginBottom: 12, color: c.secondary }]}>Relationship Health</Text>
              <View style={styles.chipRow}>
                {HEALTH_OPTIONS.map(opt => {
                  const active = state.health === opt.value
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, {
                        backgroundColor: active ? c.gold : 'transparent',
                        borderColor: active ? c.gold : c.border,
                      }]}
                      onPress={() => patch({ health: opt.value })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : c.secondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Other filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other Filters</Text>
              {[
                { key: 'favoritesOnly' as const, label: 'Favorites Only' },
                { key: 'neverContacted' as const, label: 'People I Haven\'t Contacted' },
                { key: 'newThisMonth' as const, label: 'New This Month' },
              ].map(({ key, label }, i, arr) => (
                <View
                  key={key}
                  style={[styles.toggleRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Switch
                    value={state[key]}
                    onValueChange={v => patch({ [key]: v })}
                    trackColor={{ false: c.border, true: c.gold }}
                    thumbColor="#fff"
                    ios_backgroundColor={c.border}
                  />
                </View>
              ))}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
