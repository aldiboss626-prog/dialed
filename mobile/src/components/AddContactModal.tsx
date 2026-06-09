import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb, tagsDb } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { Contact, Tag } from '@/types'

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: Radius.sheet,
      borderTopRightRadius: Radius.sheet,
      maxHeight: '94%',
      // KAV is the sheet — these ensure it fills correctly
      width: '100%',
      overflow: 'hidden',
    },
    // Header
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: 12,
    },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    skipText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.gold },
    // Hero
    hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 28 },
    avatarCircle: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: c.gold + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    heroTitle: {
      fontFamily: FontFamily.display, fontSize: 26, color: c.primary,
      textAlign: 'center', marginBottom: 6, paddingHorizontal: Spacing.lg,
    },
    heroSub: {
      fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary,
      textAlign: 'center', lineHeight: 18, paddingHorizontal: 40,
    },
    // Form
    formCard: {
      marginHorizontal: Spacing.lg,
      backgroundColor: c.surface,
      borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder,
      overflow: 'hidden',
      marginBottom: 20,
    },
    field: {
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    },
    fieldBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    fieldLabel: {
      fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary,
      marginBottom: 3,
    },
    fieldInput: {
      fontFamily: FontFamily.sans, fontSize: 15, color: c.primary,
      paddingVertical: 0, minHeight: 22,
    },
    // Tags
    tagsRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8,
      marginHorizontal: Spacing.lg, marginBottom: 24,
    },
    tagPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7,
      backgroundColor: c.gold + '18', borderWidth: 1, borderColor: c.gold + '30',
    },
    tagText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    addTagBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    // Tag picker
    pickerSheet: {
      marginHorizontal: Spacing.lg, marginBottom: 20,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden',
    },
    pickerSearch: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    pickerSearchInput: { flex: 1, fontFamily: FontFamily.sans, fontSize: 14, color: c.primary },
    pickerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 14, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    pickerRowText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.primary },
    pickerRowTextGold: { color: c.gold },
    pickerEmpty: {
      fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary,
      textAlign: 'center', paddingVertical: 20,
    },
    // Save button
    saveBtn: {
      marginHorizontal: Spacing.lg, backgroundColor: c.gold,
      borderRadius: Radius.full, paddingVertical: 16,
      alignItems: 'center', marginBottom: 8,
    },
    saveBtnText: { fontFamily: FontFamily.display, fontSize: 18, color: '#fff' },
    errorText: {
      fontFamily: FontFamily.sans, fontSize: 13, color: c.overdue,
      marginHorizontal: Spacing.lg, marginBottom: 12, textAlign: 'center',
    },
  })
}

interface Props {
  visible: boolean
  onClose: () => void
  onAdd?: (c: Contact) => void
  onAdded?: (c: Contact) => void
}

export function AddContactModal({ visible, onClose, onAdd, onAdded }: Props) {
  const c = useColors()
  const styles = makeStyles(c)

  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [tagQuery, setTagQuery] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) tagsDb.list().then(setAllTags).catch(() => {})
  }, [visible])

  function reset() {
    setName(''); setTitle(''); setCompany(''); setEmail(''); setPhone('')
    setSelectedTags([]); setAllTags([]); setTagPickerOpen(false); setTagQuery(''); setError('')
  }

  function handleClose() { reset(); onClose() }

  function removeTag(id: number) {
    setSelectedTags(prev => prev.filter(t => t.id !== id))
  }

  async function addTag(tag: Tag) {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag])
    }
    setTagQuery('')
    setTagPickerOpen(false)
  }

  async function createAndAddTag() {
    const tagName = tagQuery.trim()
    if (!tagName) return
    try {
      const existing = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
      if (existing) { addTag(existing); return }
      const newTag = await tagsDb.create(tagName)
      setAllTags(prev => [...prev, newTag])
      await addTag(newTag)
    } catch { /* silent */ }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      let contact: Contact
      try {
        // Try with all fields (requires migration to have been run)
        contact = await contactsDb.create({
          name: name.trim(),
          position: title.trim() || undefined,
          role: company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          stars: 3,
        })
      } catch {
        // Fallback: create with only base columns that definitely exist
        contact = await contactsDb.create({
          name: name.trim(),
          role: company.trim() || undefined,
          email: email.trim() || undefined,
          stars: 3,
        })
      }
      // Apply tags independently — don't fail the save if tags table missing
      if (selectedTags.length > 0) {
        tagsDb.setContactTags(contact.id, selectedTags.map(t => t.id)).catch(() => {})
      }
      const cb = onAdd ?? onAdded
      cb?.(contact)
      reset()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add contact')
    } finally {
      setLoading(false)
    }
  }

  const q = tagQuery.toLowerCase()
  const filteredTags = allTags.filter(
    t => !selectedTags.find(s => s.id === t.id) && t.name.toLowerCase().includes(q)
  )
  const showCreate = tagQuery.trim().length > 0
    && !allTags.find(t => t.name.toLowerCase() === tagQuery.trim().toLowerCase())

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={c.secondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Connection</Text>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Hero */}
              <View style={styles.hero}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person-add-outline" size={32} color={c.gold} />
                </View>
                <Text style={styles.heroTitle}>Add someone to{'\n'}your network</Text>
                <Text style={styles.heroSub}>Build stronger relationships{'\n'}and unlock new opportunities.</Text>
              </View>

              {/* Form */}
              <View style={styles.formCard}>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    value={name} onChangeText={setName}
                    placeholder="Maya Patel" placeholderTextColor={c.tertiary}
                    style={styles.fieldInput}
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput
                    value={title} onChangeText={setTitle}
                    placeholder="Product Designer" placeholderTextColor={c.tertiary}
                    style={styles.fieldInput}
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>Company</Text>
                  <TextInput
                    value={company} onChangeText={setCompany}
                    placeholder="Linear" placeholderTextColor={c.tertiary}
                    style={styles.fieldInput}
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.field, styles.fieldBorder]}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    value={email} onChangeText={setEmail}
                    placeholder="maya@linear.app" placeholderTextColor={c.tertiary}
                    keyboardType="email-address" autoCapitalize="none"
                    style={styles.fieldInput}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Phone (optional)</Text>
                  <TextInput
                    value={phone} onChangeText={setPhone}
                    placeholder="+1 (415) 123-4567" placeholderTextColor={c.tertiary}
                    keyboardType="phone-pad"
                    style={styles.fieldInput}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Tags row */}
              <View style={styles.tagsRow}>
                {selectedTags.map(t => (
                  <TouchableOpacity key={t.id} style={styles.tagPill} onPress={() => removeTag(t.id)} activeOpacity={0.75}>
                    <Text style={styles.tagText}>{t.name}</Text>
                    <Ionicons name="close" size={12} color={c.gold} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addTagBtn}
                  onPress={() => setTagPickerOpen(prev => !prev)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add" size={18} color={c.secondary} />
                </TouchableOpacity>
              </View>

              {/* Tag picker */}
              {tagPickerOpen && (
                <View style={styles.pickerSheet}>
                  <View style={styles.pickerSearch}>
                    <Ionicons name="search-outline" size={15} color={c.tertiary} />
                    <TextInput
                      value={tagQuery}
                      onChangeText={setTagQuery}
                      placeholder="Search or create tag…"
                      placeholderTextColor={c.tertiary}
                      style={styles.pickerSearchInput}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={createAndAddTag}
                    />
                  </View>
                  {filteredTags.slice(0, 5).map(t => (
                    <TouchableOpacity key={t.id} style={styles.pickerRow} onPress={() => addTag(t)} activeOpacity={0.7}>
                      <Text style={styles.pickerRowText}>{t.name}</Text>
                      <Ionicons name="add" size={18} color={c.gold} />
                    </TouchableOpacity>
                  ))}
                  {showCreate && (
                    <TouchableOpacity style={[styles.pickerRow, { borderBottomWidth: 0 }]} onPress={createAndAddTag} activeOpacity={0.7}>
                      <Text style={[styles.pickerRowText, styles.pickerRowTextGold]}>Create "{tagQuery.trim()}"</Text>
                      <Ionicons name="add-circle-outline" size={18} color={c.gold} />
                    </TouchableOpacity>
                  )}
                  {filteredTags.length === 0 && !showCreate && (
                    <Text style={styles.pickerEmpty}>No tags yet — type a name to create one</Text>
                  )}
                </View>
              )}

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn} activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Connection</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
