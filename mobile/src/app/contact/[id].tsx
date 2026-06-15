import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Linking, Share, PanResponder,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { contactsDb, pendingDb, tagsDb, toggleFavorite, uploadAvatar } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { contactHealthScore, healthColor, healthLabel } from '@/lib/health'
import { DatePicker } from '@/components/DatePicker'
import { JoySlide } from '@/components/JoySlide'
import { TagsModal } from '@/components/TagsModal'
import { ContactAvatar } from '@/components/ContactAvatar'
import type { Contact, PendingResponse, Tag } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_TAG_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444', Professor: '#F59E0B',
}
const PRESET_TAGS = Object.keys(PRESET_TAG_COLORS)
const CUSTOM_PALETTE = ['#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6']

function tagColor(tag?: string | null): string {
  const t = tag ?? ''
  if (PRESET_TAG_COLORS[t]) return PRESET_TAG_COLORS[t]
  if (!t) return '#6B7280'
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) & 0xffff
  return CUSTOM_PALETTE[h % CUSTOM_PALETTE.length]
}

const STAR_CADENCE: Record<number, number> = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function firstName(name: string) { return name.split(' ')[0] }

function hoursAgo(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000
}

function pendingTimeLabel(h: number) {
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h ago`
  const d = Math.floor(h / 24)
  return `${d}${d === 1 ? ' day' : ' days'} ago`
}

function relativeLabel(daysAgo: number) {
  if (daysAgo === 0) return 'today'
  if (daysAgo < 7) return `${daysAgo}d ago`
  if (daysAgo < 30) return `${Math.round(daysAgo / 7)}w ago`
  return `${Math.round(daysAgo / 30)}mo ago`
}

// ── Edit sheet (unchanged) ────────────────────────────────────────────────────

function makeEditStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      backgroundColor: c.elevated, borderTopLeftRadius: Radius.sheet,
      borderTopRightRadius: Radius.sheet, maxHeight: '92%', paddingHorizontal: Spacing.lg,
    },
    handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 },
    title: { fontFamily: FontFamily.display, fontSize: 24, color: c.primary },
    cancelText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary },
    fieldCard: {
      backgroundColor: c.surface, borderRadius: Radius.md,
      paddingHorizontal: 14, marginBottom: 10,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    fieldLabel: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, letterSpacing: 0.5, paddingTop: 10 },
    fieldInput: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, paddingBottom: 12, paddingTop: 4 },
    legacyLabel: { fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary, letterSpacing: 2, marginBottom: 6, marginTop: 16 },
    starsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    hint: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, marginTop: 4 },
    dateTrigger: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 10, marginBottom: 4,
    },
    dateTriggerText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    input: {
      fontFamily: FontFamily.sans, fontSize: 15, color: c.primary,
      borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 10,
    },
    saveBtn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 14, alignItems: 'center', marginTop: 24,
    },
    saveBtnText: { fontFamily: FontFamily.display, fontSize: 18, color: c.surface },
  })
}

function EditSheet({ contact, visible, onClose, onSaved }: {
  contact: Contact; visible: boolean; onClose: () => void; onSaved: (c: Contact) => void
}) {
  const c = useColors()
  const es = makeEditStyles(c)
  const [name, setName] = useState(contact.name)
  const [role, setRole] = useState(contact.role ?? '')
  const [position, setPosition] = useState(contact.position ?? '')
  const [email, setEmail] = useState(contact.email ?? '')
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [location, setLocation] = useState(contact.location ?? '')
  const [linkedin, setLinkedin] = useState(contact.linkedin ?? '')
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [stars, setStars] = useState(contact.stars)
  const [relTag, setRelTag] = useState(contact.relationship_type ?? 'Mentor')
  const [customTagDraft, setCustomTagDraft] = useState('')
  const [customTagOpen, setCustomTagOpen] = useState(false)
  const [lastContacted, setLastContacted] = useState(contact.last_contact_date.slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setName(contact.name); setRole(contact.role ?? ''); setPosition(contact.position ?? '')
      setEmail(contact.email ?? ''); setPhone(contact.phone ?? ''); setLocation(contact.location ?? '')
      setLinkedin(contact.linkedin ?? ''); setNotes(contact.notes ?? ''); setStars(contact.stars)
      setRelTag(contact.relationship_type ?? 'Mentor')
      setCustomTagDraft(''); setCustomTagOpen(false)
      setLastContacted(contact.last_contact_date.slice(0, 10))
    }
  }, [visible, contact])

  function commitCustomTag() {
    const trimmed = customTagDraft.trim()
    if (trimmed) setRelTag(trimmed)
    setCustomTagOpen(false)
  }

  async function save() {
    setLoading(true)
    try {
      const updated = await contactsDb.update(contact.id, {
        name: name.trim(), role: role.trim() || undefined, position: position.trim() || undefined,
        email: email.trim() || undefined, phone: phone.trim() || undefined,
        location: location.trim() || undefined, linkedin: linkedin.trim() || undefined,
        notes: notes.trim() || undefined, stars, last_contact_date: lastContacted,
        relationship_type: relTag || undefined,
      } as any)
      onSaved(updated)
      onClose()
    } catch { Alert.alert('Error', 'Could not save changes.') }
    finally { setLoading(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={es.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={es.sheet}>
          <View style={es.handleRow}><View style={es.handle} /></View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={es.headerRow}>
              <Text style={es.title}>Edit Contact</Text>
              <TouchableOpacity onPress={onClose}><Text style={es.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
            <View style={es.fieldCard}>
              <Text style={es.fieldLabel}>Full Name</Text>
              <TextInput value={name} onChangeText={setName} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="Name" />
            </View>
            <View style={es.fieldCard}>
              <Text style={es.fieldLabel}>Company</Text>
              <TextInput value={role} onChangeText={setRole} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="Company" />
            </View>
            <View style={es.fieldCard}>
              <Text style={es.fieldLabel}>Position</Text>
              <TextInput value={position} onChangeText={setPosition} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="Job title" />
            </View>
            <View style={es.fieldCard}>
              <Text style={es.fieldLabel}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={es.fieldCard}>
              <Text style={es.fieldLabel}>Phone</Text>
              <TextInput value={phone} onChangeText={setPhone} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="(415) 555-0123" keyboardType="phone-pad" />
            </View>
            <View style={es.fieldCard}>
              <Text style={es.fieldLabel}>Location</Text>
              <TextInput value={location} onChangeText={setLocation} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="San Francisco, CA" />
            </View>
            <View style={[es.fieldCard, { marginBottom: 16 }]}>
              <Text style={es.fieldLabel}>LinkedIn</Text>
              <TextInput value={linkedin} onChangeText={setLinkedin} style={es.fieldInput} placeholderTextColor={c.tertiary} placeholder="linkedin.com/in/username" autoCapitalize="none" autoCorrect={false} />
            </View>
            {/* Tag selector */}
            <Text style={es.legacyLabel}>TAG</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: customTagOpen ? 8 : 16 }}>
              {PRESET_TAGS.map(tag => {
                const active = relTag === tag && !customTagOpen
                const color = tagColor(tag)
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => { setRelTag(tag); setCustomTagOpen(false) }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? color : c.border,
                      backgroundColor: active ? color + '14' : c.elevated,
                    }}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
                    <Text style={{
                      fontFamily: active ? FontFamily.sansMedium : FontFamily.sans,
                      fontSize: 13, color: active ? color : c.secondary,
                    }}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                )
              })}
              {!PRESET_TAGS.includes(relTag) && !customTagOpen && (
                <TouchableOpacity
                  onPress={() => { setCustomTagDraft(relTag); setCustomTagOpen(true) }}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                    borderWidth: 1.5, borderColor: tagColor(relTag),
                    backgroundColor: tagColor(relTag) + '14',
                  }}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tagColor(relTag) }} />
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: tagColor(relTag) }}>
                    {relTag}
                  </Text>
                  <TouchableOpacity onPress={() => setRelTag('Mentor')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Ionicons name="close" size={13} color={tagColor(relTag)} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setCustomTagDraft(''); setCustomTagOpen(true) }}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
                  borderWidth: 1, borderColor: c.border,
                  backgroundColor: c.elevated, borderStyle: 'dashed',
                }}
              >
                <Ionicons name="add" size={15} color={c.tertiary} />
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary }}>Custom</Text>
              </TouchableOpacity>
            </View>
            {customTagOpen && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
                backgroundColor: c.elevated, borderRadius: 12,
                borderWidth: 1.5, borderColor: c.gold,
                paddingHorizontal: 12, paddingVertical: 2,
              }}>
                <TextInput
                  value={customTagDraft}
                  onChangeText={setCustomTagDraft}
                  placeholder="e.g. Law Enforcement"
                  placeholderTextColor={c.tertiary}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={commitCustomTag}
                  style={{
                    flex: 1, fontFamily: FontFamily.sans, fontSize: 14,
                    color: c.primary, paddingVertical: 9,
                  }}
                />
                <TouchableOpacity onPress={commitCustomTag} activeOpacity={0.75}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold }}>Set</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={es.legacyLabel}>STARS (affects cadence)</Text>
            <View style={es.starsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setStars(i)} activeOpacity={0.7}>
                  <Text style={{ fontSize: 32, color: i <= stars ? c.warning : c.border }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={es.legacyLabel}>LAST CONTACTED</Text>
            <TouchableOpacity style={es.dateTrigger} onPress={() => setDatePickerOpen(true)} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={16} color={c.tertiary} />
              <Text style={es.dateTriggerText}>{lastContacted || 'Select date'}</Text>
            </TouchableOpacity>
            <Text style={es.hint}>Back-date this to simulate overdue status</Text>
            <DatePicker
              visible={datePickerOpen}
              value={lastContacted}
              onChange={setLastContacted}
              onClose={() => setDatePickerOpen(false)}
              label="LAST CONTACTED"
            />
            <Text style={es.legacyLabel}>NOTES</Text>
            <TextInput value={notes} onChangeText={setNotes} style={[es.input, { minHeight: 64 }]} placeholderTextColor={c.tertiary} placeholder="Notes" multiline textAlignVertical="top" />
            <TouchableOpacity onPress={save} disabled={loading} style={es.saveBtn} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={c.surface} /> : <Text style={es.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ── CadenceSlider ─────────────────────────────────────────────────────────────

function CadenceSlider({ value, min = 1, max = 60, onChange, c }: {
  value: number; min?: number; max?: number; onChange: (v: number) => void; c: ColorPalette
}) {
  const [trackW, setTrackW] = useState(200)
  const trackRef = useRef<View>(null)
  // Mutable state kept in a ref so PanResponder callbacks (created once) never go stale
  const live = useRef({ trackW: 200, trackPageX: 0, min, max, onChange })
  live.current = { ...live.current, trackW, min, max, onChange }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        const { trackW: w, trackPageX: px, min: lo, max: hi, onChange: cb } = live.current
        const p = Math.max(0, Math.min(1, (e.nativeEvent.pageX - px) / Math.max(1, w)))
        cb(Math.round(lo + p * (hi - lo)))
      },
      onPanResponderMove: (e) => {
        const { trackW: w, trackPageX: px, min: lo, max: hi, onChange: cb } = live.current
        const p = Math.max(0, Math.min(1, (e.nativeEvent.pageX - px) / Math.max(1, w)))
        cb(Math.round(lo + p * (hi - lo)))
      },
    })
  ).current

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const thumbLeft = Math.max(0, Math.min(trackW - 22, pct * trackW - 11))

  return (
    <View
      ref={trackRef}
      style={{ flex: 1, height: 36, justifyContent: 'center' }}
      onLayout={() => {
        trackRef.current?.measure((_fx, _fy, w, _h, px) => {
          live.current.trackPageX = px
          live.current.trackW = w
          setTrackW(w)
        })
      }}
      {...panResponder.panHandlers}
    >
      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.border }}>
        <View style={{ width: pct * trackW, height: 6, borderRadius: 3, backgroundColor: c.gold }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: thumbLeft,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: '#fff', borderWidth: 2, borderColor: c.gold,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
        }}
      />
    </View>
  )
}

// ── Main styles ───────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    nav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: 4,
    },
    navBtn: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    },
    navRight: { flexDirection: 'row', gap: 10 },
    // Hero
    identity: { alignItems: 'center', paddingTop: 8, paddingBottom: 20, paddingHorizontal: 20 },
    name: { fontFamily: FontFamily.display, fontSize: 25, color: c.primary, marginTop: 14, textAlign: 'center', letterSpacing: -0.4 },
    roleText: { fontFamily: FontFamily.sans, fontSize: 14.5, color: c.secondary, marginTop: 3, textAlign: 'center' },
    typeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: 12, paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: Radius.full,
    },
    typeDot: { width: 7, height: 7, borderRadius: 3.5 },
    typeBadgeText: { fontFamily: FontFamily.sansMedium, fontSize: 13 },
    starsRow: { flexDirection: 'row', gap: 5, marginTop: 12 },
    // Section card
    card: {
      marginHorizontal: 16, marginTop: 12, padding: 18,
      backgroundColor: c.surface, borderRadius: 20,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    cardTitle: { fontFamily: FontFamily.display, fontSize: 17, color: c.primary, marginBottom: 14 },
    // Day counter card
    statusLabel: {
      fontFamily: FontFamily.sansMedium, fontSize: 12,
      letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6,
    },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bigNumber: { fontFamily: FontFamily.display, fontSize: 48, lineHeight: 52 },
    daysLabel: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary },
    cadenceSub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 4 },
    checkCircle: {
      width: 52, height: 52, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
    },
    talkedBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: 52, borderRadius: 15, marginTop: 14,
    },
    talkedBtnText: { fontFamily: FontFamily.display, fontSize: 16, color: '#fff' },
    // Quick actions
    quickActions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
    actionBtn: {
      flex: 1, height: 64, borderRadius: 15, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    actionBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 11.5 },
    // Cadence card
    sectionLabel: {
      fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.6,
      textTransform: 'uppercase', color: c.secondary,
    },
    cadenceRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
    },
    cadenceTagText: { fontFamily: FontFamily.sansMedium, fontSize: 12 },
    stepperBtn: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    cadenceNumber: { fontFamily: FontFamily.display, fontSize: 26, color: c.primary },
    cadenceDaysLabel: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary },
    cadenceHint: {
      marginTop: 14, padding: 11, borderRadius: 12,
      backgroundColor: c.elevated,
    },
    cadenceHintText: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, lineHeight: 18 },
    // History
    historyHeader: {
      fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.8,
      textTransform: 'uppercase', color: c.secondary,
      marginHorizontal: 20, marginTop: 22, marginBottom: 10,
    },
    historyCard: {
      marginHorizontal: 16, backgroundColor: c.surface,
      borderRadius: 20, borderWidth: 1, borderColor: c.subtleBorder,
      paddingVertical: 4,
    },
    historyRow: {
      flexDirection: 'row', gap: 12, padding: 14,
    },
    historyIconWrap: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    historyTitle: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary, lineHeight: 20 },
    historySub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 },
    historySep: { height: 1, backgroundColor: c.subtleBorder, marginLeft: 16 },
    // About
    aboutRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    aboutRowLast: { borderBottomWidth: 0 },
    aboutValue: { fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, flex: 1 },
    aboutLink: { color: c.gold },
    // Tags
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagPill: { borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: c.gold + '15' },
    tagText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    addTagCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
    },
    // Pending
    pendingCard: {
      backgroundColor: c.warning + '12', borderRadius: 20,
      padding: 16, marginHorizontal: 16, marginTop: 12,
    },
    pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    pendingTitle: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.warning },
    pendingSubject: { fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, marginBottom: 4 },
    pendingTime: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary },
    dismissBtn: { alignSelf: 'flex-start', marginTop: 8 },
    dismissText: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    // Bottom bar
    bottomBar: {
      flexDirection: 'row', gap: 12,
      paddingHorizontal: 20, paddingVertical: 14,
      backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
    },
    editBtn: {
      flex: 1, paddingVertical: 14, borderRadius: Radius.full,
      borderWidth: 1.5, borderColor: c.border, alignItems: 'center',
    },
    editBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary },
    shareBtn: {
      flex: 1, paddingVertical: 14, borderRadius: Radius.full,
      backgroundColor: c.primary, alignItems: 'center',
    },
    shareBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.surface },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.tertiary, textAlign: 'center', marginTop: 80 },
  })
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const c = useColors()
  const s = makeStyles(c)

  const [contact, setContact] = useState<Contact | null>(null)
  const [pending, setPending] = useState<PendingResponse | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [talkLoading, setTalkLoading] = useState(false)
  const [talkSuccess, setTalkSuccess] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)

  // Cadence save state — explicit Save button, not debounced
  const [lastSavedCadence, setLastSavedCadence] = useState(0)
  const [cadenceSaving, setCadenceSaving] = useState(false)
  const [cadenceSaved, setCadenceSaved] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const numId = parseInt(id)
    try {
      const ct = await contactsDb.get(numId)
      setContact(ct)
      setLastSavedCadence(ct.cadence_days)
      setPending(ct.pending_response ?? null)
      setIsFavorite(ct.is_favorite ?? false)
      setAvatarUrl(ct.avatar_url ?? null)
      tagsDb.getContactTags(numId).then(setTags).catch(() => {})
    } catch {}
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const healthScore = contact ? contactHealthScore(contact) : 0
  const hColor = healthColor(c, healthScore)
  const typeColor = tagColor(contact?.relationship_type)

  // ── Action handlers ───────────────────────────────────────────────────────

  async function handleTalked() {
    if (!contact || talkLoading) return
    setTalkLoading(true)
    try {
      const updated = await contactsDb.talked(contact.id)
      setContact(prev => prev ? { ...updated, email_threads: (prev as any).email_threads, interactions: (prev as any).interactions, opportunities: (prev as any).opportunities } : updated)
      setPending(null)
      setTalkSuccess(true)
      setShowCelebration(true)
      setTimeout(() => setTalkSuccess(false), 2500)
    } catch { Alert.alert('Error', 'Could not mark as talked. Try again.') }
    finally { setTalkLoading(false) }
  }

  async function handleToggleFavorite() {
    if (!contact) return
    try {
      await toggleFavorite(contact.id, isFavorite)
      setIsFavorite(prev => !prev)
    } catch { Alert.alert('Error', 'Could not update favorite.') }
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access in Settings to add a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
    })
    if (result.canceled || !result.assets[0]) return
    setAvatarUploading(true)
    try {
      const asset = result.assets[0]
      const url = await uploadAvatar(contact!.id, asset.uri, asset.base64 ?? undefined)
      setAvatarUrl(url)
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Unknown error')
    } finally { setAvatarUploading(false) }
  }

  async function handleStarChange(stars: number) {
    if (!contact) return
    const cadence_days = STAR_CADENCE[stars] ?? 14
    setContact(prev => prev ? { ...prev, stars, cadence_days } : prev)
    setLastSavedCadence(cadence_days)
    try { await contactsDb.update(contact.id, { stars, cadence_days } as any) } catch {}
  }

  function handleCadenceChange(val: number) {
    setContact(prev => prev ? { ...prev, cadence_days: val } : prev)
    setCadenceSaved(false)
  }

  async function saveCadence() {
    if (!contact) return
    setCadenceSaving(true)
    try {
      const updated = await contactsDb.update(contact.id, { cadence_days: contact.cadence_days } as any)
      // Merge back so email_threads / interactions / opportunities are preserved
      setContact(prev => prev ? {
        ...updated,
        email_threads: (prev as any).email_threads,
        interactions: (prev as any).interactions,
        opportunities: (prev as any).opportunities,
      } : updated)
      setLastSavedCadence(updated.cadence_days)
      setCadenceSaved(true)
      setTimeout(() => setCadenceSaved(false), 2200)
    } catch { Alert.alert('Error', 'Could not save cadence.') }
    finally { setCadenceSaving(false) }
  }

  function handleMore() {
    Alert.alert(contact?.name ?? 'Contact', undefined, [
      { text: isFavorite ? 'Remove from Favorites' : 'Add to Favorites', onPress: handleToggleFavorite },
      { text: 'Edit Contact', onPress: () => setEditOpen(true) },
      { text: 'Remove from Orbit', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function confirmDelete() {
    Alert.alert('Remove Contact', `Remove ${contact?.name} from your orbit?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { if (!contact) return; await contactsDb.delete(contact.id); router.back() } },
    ])
  }

  async function handleShare() {
    if (!contact) return
    const lines = [
      contact.name,
      contact.position && contact.role ? `${contact.position} at ${contact.role}` : (contact.position ?? contact.role ?? ''),
      contact.email ?? '', contact.phone ?? '', contact.linkedin ?? '',
    ].filter(Boolean)
    Share.share({ message: lines.join('\n') })
  }

  function openSms() { if (contact?.phone) Linking.openURL(`sms:${contact.phone}`) }
  function openEmail() { if (contact?.email) Linking.openURL(`mailto:${contact.email}`) }
  function openLinkedin() {
    if (!contact?.linkedin) return
    const url = contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`
    Linking.openURL(url)
  }

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={c.gold} size="large" />
      </View>
    )
  }

  if (!contact) {
    return (
      <View style={s.root}>
        <SafeAreaView edges={['top']}>
          <View style={s.nav}>
            <TouchableOpacity style={s.navBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={c.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <Text style={s.emptyText}>Contact not found.</Text>
      </View>
    )
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const roleText = contact.position && contact.role
    ? `${contact.position} · ${contact.role}`
    : (contact.position ?? contact.role ?? '')

  const overdueBy = Math.max(0, contact.days_since_contact - contact.cadence_days)
  const statusLabel = contact.status === 'overdue' ? 'Overdue'
    : contact.status === 'due-soon' ? 'Due soon' : 'On track'
  const cadenceSubText = contact.status === 'overdue'
    ? `${overdueBy} day${overdueBy !== 1 ? 's' : ''} past your ${contact.cadence_days}-day cadence`
    : `Cadence: every ${contact.cadence_days} days`

  const defaultCadence = STAR_CADENCE[contact.stars] ?? 14
  const isCustomCadence = contact.cadence_days !== defaultCadence

  // Timeline — built from available data
  const timeline: { icon: string; title: string; sub: string }[] = []
  const interactions = (contact as any).interactions
  if (Array.isArray(interactions) && interactions.length > 0) {
    interactions.slice(0, 2).forEach((i: any) => {
      const d = Math.floor((Date.now() - new Date(i.date ?? i.created_at).getTime()) / 86_400_000)
      timeline.push({
        icon: i.type === 'email' ? 'mail-outline' : 'chatbubble-outline',
        title: `${i.type === 'email' ? 'Email detected' : 'You reached out'} · ${relativeLabel(d)}`,
        sub: i.notes ?? '',
      })
    })
  } else {
    timeline.push({
      icon: 'mail-outline',
      title: `Last contact · ${relativeLabel(contact.days_since_contact)}`,
      sub: contact.notes ?? '',
    })
  }
  const addedD = Math.floor((Date.now() - new Date(contact.created_at).getTime()) / 86_400_000)
  timeline.push({
    icon: 'person-add-outline',
    title: `Added to network · ${relativeLabel(addedD)}`,
    sub: contact.relationship_type ? `Tagged as ${contact.relationship_type}.` : '',
  })

  const aboutRows = [
    contact.position && contact.role ? { icon: 'briefcase-outline', value: `${contact.position} at ${contact.role}` } : null,
    !contact.position && contact.role ? { icon: 'business-outline', value: contact.role } : null,
    contact.position && !contact.role ? { icon: 'briefcase-outline', value: contact.position } : null,
    contact.location ? { icon: 'location-outline', value: contact.location } : null,
    contact.email ? { icon: 'mail-outline', value: contact.email, onPress: openEmail, link: true } : null,
    contact.phone ? { icon: 'call-outline', value: contact.phone, link: true } : null,
    contact.linkedin ? { icon: 'logo-linkedin', value: 'LinkedIn', onPress: openLinkedin, link: true } : null,
  ].filter(Boolean) as { icon: string; value: string; onPress?: () => void; link?: boolean }[]

  const activeBg = talkSuccess ? c.success : hColor

  return (
    <View style={s.root}>
      {/* Nav */}
      <SafeAreaView edges={['top']}>
        <View style={s.nav}>
          <TouchableOpacity style={s.navBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={s.navRight}>
            <TouchableOpacity style={s.navBtn} onPress={handleToggleFavorite} activeOpacity={0.7}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? c.gold : c.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.navBtn} onPress={handleMore} activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={20} color={c.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} bounces>

        {/* Hero */}
        <View style={s.identity}>
          <ContactAvatar
            name={contact.name}
            avatarUrl={avatarUrl}
            size={84}
            borderRadius={42}
            bgColor={typeColor}
            editable
            uploading={avatarUploading}
            onPress={handlePickAvatar}
          />
          <Text style={s.name}>{contact.name}</Text>
          {!!roleText && <Text style={s.roleText}>{roleText}</Text>}

          {/* Type badge */}
          <View style={[s.typeBadge, { backgroundColor: typeColor + '14' }]}>
            <View style={[s.typeDot, { backgroundColor: typeColor }]} />
            <Text style={[s.typeBadgeText, { color: typeColor }]}>
              {contact.relationship_type ?? 'Other'}
            </Text>
          </View>

          {/* Stars (read-only in hero) */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons
                key={i}
                name={i <= contact.stars ? 'star' : 'star-outline'}
                size={18}
                color={i <= contact.stars ? c.gold : c.border}
              />
            ))}
          </View>
        </View>

        {/* Pending response */}
        {pending && (
          <View style={s.pendingCard}>
            <View style={s.pendingHeader}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.warning }} />
              <Text style={s.pendingTitle}>Waiting for your reply</Text>
            </View>
            <Text style={s.pendingSubject} numberOfLines={2}>{pending.email_subject}</Text>
            <Text style={s.pendingTime}>{pendingTimeLabel(hoursAgo(pending.detected_at))}</Text>
            <TouchableOpacity
              onPress={() => pendingDb.dismiss(pending.id).catch(() => {}).then(() => setPending(null))}
              style={s.dismissBtn}
              activeOpacity={0.7}
            >
              <Text style={s.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Day counter card */}
        <View style={[s.card, {
          backgroundColor: activeBg + '10',
          borderColor: activeBg + '28',
        }]}>
          <Text style={[s.statusLabel, { color: activeBg }]}>
            {talkSuccess ? 'Just now' : statusLabel}
          </Text>
          <View style={s.counterRow}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={[s.bigNumber, { color: talkSuccess ? c.success : c.primary }]}>
                  {talkSuccess ? 0 : contact.days_since_contact}
                </Text>
                <Text style={s.daysLabel}>days since contact</Text>
              </View>
              <Text style={s.cadenceSub}>
                {talkSuccess ? 'Interaction logged!' : cadenceSubText}
              </Text>
            </View>
            <View style={[s.checkCircle, {
              backgroundColor: talkSuccess ? c.success : c.surface,
              borderWidth: talkSuccess ? 0 : 1.5, borderColor: hColor + '40',
            }]}>
              <Ionicons name="checkmark" size={26} color={talkSuccess ? '#fff' : hColor} />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleTalked}
            disabled={talkLoading || talkSuccess}
            style={[s.talkedBtn, { backgroundColor: talkSuccess ? c.success : c.primary }]}
            activeOpacity={0.85}
          >
            {talkLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={s.talkedBtnText}>{talkSuccess ? 'Logged!' : 'We talked'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={s.quickActions}>
          {[
            { icon: 'sparkles-outline', label: 'Draft follow-up', primary: true, onPress: () => Alert.alert('AI Draft', 'Coming soon — tap Edit to add notes.') },
            { icon: 'chatbubble-outline', label: 'Message', primary: false, onPress: openSms, disabled: !contact.phone },
            { icon: 'mail-outline', label: 'Email', primary: false, onPress: openEmail, disabled: !contact.email },
          ].map(({ icon, label, primary, onPress, disabled }) => (
            <TouchableOpacity
              key={label}
              style={[s.actionBtn, {
                backgroundColor: primary ? c.gold + '12' : c.surface,
                borderColor: primary ? c.gold + '30' : c.border,
                opacity: disabled ? 0.38 : 1,
              }]}
              onPress={onPress}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <Ionicons name={icon as any} size={20} color={primary ? c.gold : c.secondary} />
              <Text style={[s.actionBtnText, { color: primary ? c.gold : c.secondary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminder cadence */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Reminder cadence</Text>

          <View style={s.cadenceRow}>
            <Text style={s.sectionLabel}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => handleStarChange(i)} activeOpacity={0.7}>
                  <Ionicons
                    name={i <= contact.stars ? 'star' : 'star-outline'}
                    size={22}
                    color={i <= contact.stars ? c.gold : c.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[s.cadenceRow, { marginBottom: 12 }]}>
            <Text style={s.sectionLabel}>Reach out every</Text>
            <View style={{
              borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3,
              backgroundColor: isCustomCadence ? c.gold + '14' : 'transparent',
            }}>
              <Text style={[s.cadenceTagText, { color: isCustomCadence ? c.gold : c.secondary }]}>
                {isCustomCadence ? 'Custom' : `Default · ${contact.stars}★`}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              style={s.stepperBtn}
              onPress={() => handleCadenceChange(Math.max(1, contact.cadence_days - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color={c.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.stepperBtn}
              onPress={() => handleCadenceChange(Math.min(60, contact.cadence_days + 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={c.primary} />
            </TouchableOpacity>
            <CadenceSlider
              value={contact.cadence_days}
              onChange={handleCadenceChange}
              c={c}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            <Text style={s.cadenceNumber}>{contact.cadence_days}</Text>
            <Text style={s.cadenceDaysLabel}>day{contact.cadence_days !== 1 ? 's' : ''}</Text>
          </View>

          <View style={s.cadenceHint}>
            <Text style={s.cadenceHintText}>
              {isCustomCadence
                ? `Custom cadence — overrides the ${contact.stars}★ default of ${defaultCadence} days.`
                : `Using the ${contact.stars}★ default. Dialed nudges you every ${contact.cadence_days} days.`}
            </Text>
          </View>

          {/* Save button — appears only when cadence has been changed */}
          {contact.cadence_days !== lastSavedCadence && !cadenceSaved && (
            <TouchableOpacity
              onPress={saveCadence}
              disabled={cadenceSaving}
              activeOpacity={0.85}
              style={{
                marginTop: 14, backgroundColor: c.gold,
                borderRadius: 999, paddingVertical: 13,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {cadenceSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: '#fff' }}>
                    Save cadence
                  </Text>
              }
            </TouchableOpacity>
          )}

          {cadenceSaved && (
            <View style={{
              marginTop: 14, borderRadius: 999, paddingVertical: 13,
              backgroundColor: c.success + '18',
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
            }}>
              <Ionicons name="checkmark-circle" size={17} color={c.success} />
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.success }}>
                Saved!
              </Text>
            </View>
          )}
        </View>

        {/* Relationship history */}
        <Text style={s.historyHeader}>Relationship history</Text>
        <View style={s.historyCard}>
          {timeline.map((item, i) => (
            <View key={i}>
              {i > 0 && <View style={s.historySep} />}
              <View style={s.historyRow}>
                <View style={s.historyIconWrap}>
                  <Ionicons name={item.icon as any} size={17} color={c.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.historyTitle}>{item.title}</Text>
                  {!!item.sub && <Text style={s.historySub} numberOfLines={2}>{item.sub}</Text>}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* About */}
        {aboutRows.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>About {firstName(contact.name)}</Text>
            {aboutRows.map((row, i) => (
              <TouchableOpacity
                key={i}
                style={[s.aboutRow, i === aboutRows.length - 1 && s.aboutRowLast]}
                onPress={row.onPress}
                activeOpacity={row.onPress ? 0.7 : 1}
                disabled={!row.onPress}
              >
                <Ionicons name={row.icon as any} size={17} color={row.link ? c.gold : c.tertiary} />
                <Text style={[s.aboutValue, row.link && s.aboutLink]} numberOfLines={1}>{row.value}</Text>
                {!!row.onPress && <Ionicons name="chevron-forward" size={14} color={c.tertiary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tags */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Tags</Text>
          <View style={s.tagsWrap}>
            {tags.map(t => (
              <View key={t.id} style={s.tagPill}>
                <Text style={s.tagText}>{t.name}</Text>
              </View>
            ))}
            <TouchableOpacity style={s.addTagCircle} onPress={() => setTagsOpen(true)} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color={c.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        {!!contact.notes && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Notes</Text>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21 }}>
              {contact.notes}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Bottom bar */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditOpen(true)} activeOpacity={0.75}>
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={s.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <JoySlide visible={showCelebration} onDone={() => setShowCelebration(false)} />

      {contact && (
        <EditSheet
          contact={contact}
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={updated => setContact(prev => prev
            ? { ...updated, email_threads: (prev as any).email_threads, interactions: (prev as any).interactions, opportunities: (prev as any).opportunities }
            : updated
          )}
        />
      )}

      <TagsModal
        visible={tagsOpen}
        contactId={contact.id}
        onClose={() => setTagsOpen(false)}
        onSave={() => tagsDb.getContactTags(contact.id).then(setTags).catch(() => {})}
      />
    </View>
  )
}
