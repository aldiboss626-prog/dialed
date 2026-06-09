import { useState, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { ImportCandidate } from '@/types'

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      backgroundColor: c.elevated, borderTopLeftRadius: Radius.sheet,
      borderTopRightRadius: Radius.sheet, maxHeight: '92%', flex: 1,
    },
    handleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title: { fontFamily: FontFamily.display, fontSize: 24, color: c.primary },
    closeBtn: { padding: 8 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: Spacing.lg, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    searchInput: {
      flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary,
      paddingVertical: 4,
    },
    toolbar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: 10,
    },
    toolbarCount: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    selectAll: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    list: { flex: 1 },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 8 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    rowDisabled: { opacity: 0.38 },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.gold + '20', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: FontFamily.display, fontSize: 14, color: c.gold },
    rowInfo: { flex: 1 },
    rowName: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    rowSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 1 },
    alreadyTag: {
      fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary,
      borderWidth: 1, borderColor: c.border, borderRadius: Radius.full,
      paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3,
    },
    footer: {
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    importBtn: {
      backgroundColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    },
    importBtnDisabled: { opacity: 0.4 },
    importBtnText: { fontFamily: FontFamily.display, fontSize: 16, color: '#fff' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, marginTop: 12 },
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    successText: { fontFamily: FontFamily.display, fontSize: 22, color: c.primary, marginTop: 16 },
    successSub: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, marginTop: 6 },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', paddingVertical: 40 },
  })
}

interface Props {
  visible: boolean
  candidates: ImportCandidate[]
  loading: boolean
  onClose: () => void
  onImport: (selected: ImportCandidate[]) => Promise<void>
}

export function ImportSelectionModal({ visible, candidates, loading, onClose, onImport }: Props) {
  const c = useColors()
  const styles = makeStyles(c)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [success, setSuccess] = useState(0)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return candidates.filter(cand =>
      cand.name.toLowerCase().includes(q) ||
      cand.email?.toLowerCase().includes(q) ||
      cand.role?.toLowerCase().includes(q)
    )
  }, [candidates, query])

  const selectable = useMemo(() => filtered.filter(c => !c.alreadyExists), [filtered])
  const allSelected = selectable.length > 0 && selectable.every(c => selected.has(key(c)))

  function key(c: ImportCandidate) {
    return c.email ?? c.phone ?? c.name
  }

  function toggle(cand: ImportCandidate) {
    if (cand.alreadyExists) return
    const k = key(cand)
    setSelected(prev => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        selectable.forEach(c => next.delete(key(c)))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        selectable.forEach(c => next.add(key(c)))
        return next
      })
    }
  }

  async function handleImport() {
    const picks = candidates.filter(c => selected.has(key(c)))
    if (!picks.length) return
    setImporting(true)
    try {
      await onImport(picks)
      setSuccess(picks.length)
      setTimeout(() => {
        setSuccess(0)
        setSelected(new Set())
        setQuery('')
        onClose()
      }, 1500)
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    setQuery('')
    setSelected(new Set())
    setSuccess(0)
    onClose()
  }

  const selectedCount = candidates.filter(c => selected.has(key(c))).length

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Import Contacts</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={22} color={c.tertiary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={c.gold} />
              <Text style={styles.loadingText}>Fetching contacts…</Text>
            </View>
          ) : success > 0 ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={56} color={c.success} />
              <Text style={styles.successText}>{success} contact{success !== 1 ? 's' : ''} imported!</Text>
              <Text style={styles.successSub}>They're now in your network.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={c.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search…"
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

              <View style={styles.toolbar}>
                <Text style={styles.toolbarCount}>
                  {query ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `${candidates.length} contact${candidates.length !== 1 ? 's' : ''}`}
                  {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
                </Text>
                {selectable.length > 0 && (
                  <TouchableOpacity onPress={toggleAll}>
                    <Text style={styles.selectAll}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
                {filtered.length === 0 ? (
                  <Text style={styles.emptyText}>No contacts found.</Text>
                ) : (
                  filtered.map((cand, i) => {
                    const k = key(cand)
                    const isSelected = selected.has(k)
                    const sub = [cand.role, cand.email ?? cand.phone].filter(Boolean).join(' · ')
                    return (
                      <Pressable
                        key={`${k}-${i}`}
                        style={[styles.row, cand.alreadyExists && styles.rowDisabled]}
                        onPress={() => toggle(cand)}
                      >
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{initials(cand.name)}</Text>
                        </View>
                        <View style={styles.rowInfo}>
                          <Text style={styles.rowName}>{cand.name}</Text>
                          {!!sub && <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>}
                          {cand.alreadyExists && <Text style={styles.alreadyTag}>Already added</Text>}
                        </View>
                        {!cand.alreadyExists && (
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={22}
                            color={isSelected ? c.gold : c.border}
                          />
                        )}
                      </Pressable>
                    )
                  })
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.importBtn, (selectedCount === 0 || importing) && styles.importBtnDisabled]}
                  onPress={handleImport}
                  disabled={selectedCount === 0 || importing}
                >
                  {importing
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.importBtnText}>
                        Import {selectedCount > 0 ? `${selectedCount} Contact${selectedCount !== 1 ? 's' : ''}` : 'Contacts'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
