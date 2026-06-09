import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tagsDb } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { Tag } from '@/types'

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
    headerTitle: { fontFamily: FontFamily.display, fontSize: 20, color: c.primary },
    doneBtn: { fontFamily: FontFamily.sans, fontSize: 15, color: c.gold },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      margin: Spacing.lg, paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.border,
    },
    searchInput: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    sectionLabel: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, letterSpacing: 1.5, paddingHorizontal: Spacing.lg, marginBottom: 10 },
    suggestedRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    suggestedName: { fontFamily: FontFamily.sans, fontSize: 16, color: c.primary },
    myTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: 12 },
    tagPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: c.gold + '18', borderWidth: 1, borderColor: c.gold + '40',
    },
    tagText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', paddingVertical: 32, paddingHorizontal: Spacing.lg },
  })
}

interface Props {
  visible: boolean
  contactId: number
  onClose: () => void
  onSave: () => void
}

export function TagsModal({ visible, contactId, onClose, onSave }: Props) {
  const c = useColors()
  const styles = makeStyles(c)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    Promise.all([tagsDb.list(), tagsDb.getContactTags(contactId)])
      .then(([all, mine]) => {
        setAllTags(all)
        setSelected(new Set(mine.map(t => t.id)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [visible, contactId])

  const q = query.toLowerCase()
  const suggested = allTags.filter(t => !selected.has(t.id) && t.name.toLowerCase().includes(q))
  const myTags = allTags.filter(t => selected.has(t.id))

  function remove(id: number) {
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  function add(id: number) {
    setSelected(prev => new Set([...prev, id]))
  }

  async function createAndAdd() {
    const name = query.trim()
    if (!name) return
    try {
      const t = await tagsDb.create(name)
      setAllTags(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
      setSelected(prev => new Set([...prev, t.id]))
      setQuery('')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await tagsDb.setContactTags(contactId, [...selected])
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
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="chevron-back" size={22} color={c.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Tags</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={c.gold} /> : <Text style={styles.doneBtn}>Done</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={c.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or create tags…"
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
              {suggested.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>SUGGESTED TAGS</Text>
                  {suggested.map(t => (
                    <TouchableOpacity key={t.id} style={styles.suggestedRow} onPress={() => add(t.id)} activeOpacity={0.7}>
                      <Text style={styles.suggestedName}>{t.name}</Text>
                      <Ionicons name="add" size={22} color={c.gold} />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {query.trim().length > 0 && !allTags.find(t => t.name.toLowerCase() === query.toLowerCase().trim()) && (
                <TouchableOpacity
                  style={[styles.suggestedRow, { borderBottomWidth: 0 }]}
                  onPress={createAndAdd}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestedName, { color: c.gold }]}>Create "{query.trim()}"</Text>
                  <Ionicons name="add-circle-outline" size={22} color={c.gold} />
                </TouchableOpacity>
              )}

              {myTags.length > 0 && (
                <>
                  <View style={{ height: 16 }} />
                  <Text style={styles.sectionLabel}>MY TAGS</Text>
                  <View style={styles.myTagsWrap}>
                    {myTags.map(t => (
                      <TouchableOpacity key={t.id} style={styles.tagPill} onPress={() => remove(t.id)} activeOpacity={0.75}>
                        <Text style={styles.tagText}>{t.name}</Text>
                        <Ionicons name="close" size={13} color={c.gold} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {suggested.length === 0 && myTags.length === 0 && !query && (
                <Text style={styles.emptyText}>No tags yet. Type a name above to create your first tag.</Text>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}
