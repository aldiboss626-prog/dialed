import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { groupsDb } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { Group } from '@/types'

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
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
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: FontFamily.display, fontSize: 20, color: c.primary },
    doneBtn: { fontFamily: FontFamily.sans, fontSize: 15, color: c.gold },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      margin: Spacing.lg, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.border,
    },
    searchInput: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    groupIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.gold + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    rowName: { flex: 1, fontFamily: FontFamily.sans, fontSize: 16, color: c.primary },
    checkbox: {
      width: 22, height: 22, borderRadius: 4,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    createRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 20, gap: 8,
    },
    createText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.gold },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', paddingVertical: 32 },
  })
}

interface Props {
  visible: boolean
  contactId: number
  onClose: () => void
  onSave: () => void
}

export function GroupsModal({ visible, contactId, onClose, onSave }: Props) {
  const c = useColors()
  const styles = makeStyles(c)
  const [groups, setGroups] = useState<Group[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    Promise.all([groupsDb.list(), groupsDb.getContactGroups(contactId)])
      .then(([all, mine]) => {
        setGroups(all)
        setSelected(new Set(mine.map(g => g.id)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [visible, contactId])

  const filtered = groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreateGroup() {
    const name = query.trim()
    if (!name) return
    try {
      const g = await groupsDb.create(name)
      setGroups(prev => [...prev, g].sort((a, b) => a.name.localeCompare(b.name)))
      setSelected(prev => new Set([...prev, g.id]))
      setQuery('')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await groupsDb.setContactGroups(contactId, [...selected])
      onSave()
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onClose}>
              <Ionicons name="chevron-back" size={22} color={c.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add to Groups</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={c.gold} /> : <Text style={styles.doneBtn}>Done</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={c.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search groups…"
              placeholderTextColor={c.tertiary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ paddingVertical: 40 }} color={c.gold} />
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.map(g => {
                const checked = selected.has(g.id)
                return (
                  <TouchableOpacity key={g.id} style={styles.row} onPress={() => toggle(g.id)} activeOpacity={0.7}>
                    <View style={styles.groupIcon}>
                      <Ionicons name="people-outline" size={18} color={c.gold} />
                    </View>
                    <Text style={styles.rowName}>{g.name}</Text>
                    <View style={[styles.checkbox, { borderColor: checked ? c.gold : c.border, backgroundColor: checked ? c.gold : 'transparent' }]}>
                      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                )
              })}

              {query.trim().length > 0 && !groups.find(g => g.name.toLowerCase() === query.toLowerCase().trim()) && (
                <TouchableOpacity style={styles.createRow} onPress={handleCreateGroup} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={20} color={c.gold} />
                  <Text style={styles.createText}>Create "{query.trim()}"</Text>
                </TouchableOpacity>
              )}

              {filtered.length === 0 && !query && (
                <Text style={styles.emptyText}>No groups yet. Type a name to create one.</Text>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}
