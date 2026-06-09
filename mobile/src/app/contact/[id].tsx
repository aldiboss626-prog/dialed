import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Linking, Share,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { contactsDb, pendingDb, tagsDb, toggleFavorite, uploadAvatar } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { StatusBadge } from '@/components/StatusBadge'
import { DatePicker } from '@/components/DatePicker'
import { JoySlide } from '@/components/JoySlide'
import { TagsModal } from '@/components/TagsModal'
import { ContactAvatar } from '@/components/ContactAvatar'
import { LineChart } from '@/components/charts/LineChart'
import type { Contact, PendingResponse, Tag } from '@/types'

const HERO_BG = '#2563EB'

function firstName(name: string) {
  return name.split(' ')[0]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function hoursAgo(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000
}

function pendingTimeLabel(h: number) {
  if (h < 1) return 'just now'
  if (h < 24) return `${Math.round(h)}h ago`
  const d = Math.floor(h / 24)
  return `${d}${d === 1 ? ' day' : ' days'} ago`
}

function healthTrendData(score: number, seed: number): number[] {
  const start = Math.max(10, score - 30)
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6
    const noise = ((i * seed + i * 5 + 7) % 9) - 4
    return Math.max(0, Math.min(100, Math.round(start + (score - start) * t + noise)))
  })
}

// ── Edit sheet ────────────────────────────────────────────────────────────────

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
      backgroundColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 14, alignItems: 'center', marginTop: 24,
    },
    saveBtnText: { fontFamily: FontFamily.display, fontSize: 18, color: c.background },
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
  const [lastContacted, setLastContacted] = useState(contact.last_contact_date.slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setName(contact.name); setRole(contact.role ?? ''); setPosition(contact.position ?? '')
      setEmail(contact.email ?? ''); setPhone(contact.phone ?? ''); setLocation(contact.location ?? '')
      setLinkedin(contact.linkedin ?? ''); setNotes(contact.notes ?? ''); setStars(contact.stars)
      setLastContacted(contact.last_contact_date.slice(0, 10))
    }
  }, [visible, contact])

  async function save() {
    setLoading(true)
    try {
      const updated = await contactsDb.update(contact.id, {
        name: name.trim(), role: role.trim() || undefined, position: position.trim() || undefined,
        email: email.trim() || undefined, phone: phone.trim() || undefined,
        location: location.trim() || undefined, linkedin: linkedin.trim() || undefined,
        notes: notes.trim() || undefined, stars, last_contact_date: lastContacted,
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
              {loading ? <ActivityIndicator color={c.background} /> : <Text style={es.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ── Main styles ───────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: HERO_BG },
    // Floating nav (absolute, over scroll)
    navOverlay: { position: 'absolute', left: 0, right: 0, zIndex: 20 },
    heroNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
    },
    // Hero identity section (scrolls with page)
    heroIdentity: { alignItems: 'center', paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20 },
    avatarRing: {
      borderRadius: 50, borderWidth: 3.5, borderColor: 'rgba(255,255,255,0.9)',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    heroName: { fontFamily: FontFamily.display, fontSize: 26, color: '#fff', marginTop: 14, textAlign: 'center' },
    heroRole: { fontFamily: FontFamily.sans, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, textAlign: 'center' },
    heroBadge: { marginTop: 10 },
    // White content sheet slides over blue
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingTop: 8, overflow: 'hidden',
    },
    // Action row
    actionRow: {
      flexDirection: 'row',
      paddingVertical: 20, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    actionItem: { flex: 1, alignItems: 'center', gap: 6 },
    actionCircle: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: HERO_BG + '12', alignItems: 'center', justifyContent: 'center',
    },
    actionLabel: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary },
    // Cards
    card: {
      marginHorizontal: 16, marginTop: 16, padding: 18,
      backgroundColor: c.elevated, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    cardTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary, marginBottom: 14 },
    // Health
    healthScoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
    healthNumber: { fontFamily: FontFamily.display, fontSize: 52, lineHeight: 54 },
    healthLabel: { fontFamily: FontFamily.sansMedium, fontSize: 16, marginBottom: 8 },
    healthDesc: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 19, marginBottom: 6 },
    healthSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    // About
    aboutRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    aboutRowLast: { borderBottomWidth: 0 },
    aboutValue: { fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, flex: 1 },
    aboutLink: { color: HERO_BG },
    // Tags
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagPill: {
      borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6,
      backgroundColor: HERO_BG + '15', borderWidth: 1, borderColor: HERO_BG + '40',
    },
    tagText: { fontFamily: FontFamily.sans, fontSize: 13, color: HERO_BG },
    addTagCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    // Talked
    talkedBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: HERO_BG, borderRadius: Radius.full,
      paddingVertical: 15, marginHorizontal: 16, marginTop: 16,
    },
    talkedBtnSuccess: { backgroundColor: c.success },
    talkedText: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: '#fff' },
    // Pending
    pendingCard: {
      backgroundColor: c.warning + '12', borderRadius: Radius.card,
      padding: 16, marginHorizontal: 16, marginTop: 16,
      borderWidth: 1, borderColor: c.warning + '33',
    },
    pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    pendingTitle: { fontFamily: FontFamily.sans, fontSize: 13, color: c.warning, fontWeight: '600' },
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
      backgroundColor: HERO_BG, alignItems: 'center',
    },
    shareBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#fff' },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 15, color: c.tertiary, textAlign: 'center', marginTop: 80 },
  })
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const c = useColors()
  const styles = makeStyles(c)
  const insets = useSafeAreaInsets()

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

  const load = useCallback(async () => {
    if (!id) return
    const numId = parseInt(id)
    try {
      const ct = await contactsDb.get(numId)
      setContact(ct)
      setPending(ct.pending_response ?? null)
      setIsFavorite(ct.is_favorite ?? false)
      setAvatarUrl(ct.avatar_url ?? null)
      tagsDb.getContactTags(numId).then(setTags).catch(() => {})
    } catch {}
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const healthScore = contact
    ? Math.max(0, Math.min(100, Math.round((1 - contact.days_since_contact / contact.cadence_days) * 100)))
    : 0
  const healthColor = healthScore >= 75 ? c.success : healthScore >= 40 ? c.warning : c.overdue
  const healthLabel = healthScore >= 90 ? 'Excellent' : healthScore >= 75 ? 'Strong' : healthScore >= 40 ? 'Needs Attention' : 'Critical'
  const trendData = contact ? healthTrendData(healthScore, contact.id % 13 + 3) : []

  async function handleTalked() {
    if (!contact || talkLoading) return
    setTalkLoading(true)
    try {
      const updated = await contactsDb.talked(contact.id)
      setContact(prev => prev ? { ...updated, email_threads: prev.email_threads, interactions: prev.interactions, opportunities: prev.opportunities } : updated)
      setPending(null)
      setTalkSuccess(true)
      setShowCelebration(true)
      setTimeout(() => setTalkSuccess(false), 2000)
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
      contact.email ?? '',
      contact.phone ?? '',
      contact.linkedin ?? '',
    ].filter(Boolean)
    Share.share({ message: lines.join('\n') })
  }

  function openSms() { if (contact?.phone) Linking.openURL(`sms:${contact.phone}`) }
  function openCall() { if (contact?.phone) Linking.openURL(`tel:${contact.phone}`) }
  function openEmail() { if (contact?.email) Linking.openURL(`mailto:${contact.email}`) }
  function openLinkedin() {
    if (!contact?.linkedin) return
    const url = contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`
    Linking.openURL(url)
  }

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.8)" size="large" />
      </View>
    )
  }

  if (!contact) {
    return (
      <View style={styles.root}>
        <View style={[styles.navOverlay, { paddingTop: insets.top }]}>
          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View />
          </View>
        </View>
        <Text style={styles.emptyText}>Contact not found.</Text>
      </View>
    )
  }

  const roleText = contact.position && contact.role
    ? `${contact.position} at ${contact.role}`
    : (contact.position ?? contact.role ?? '')

  const aboutRows = [
    contact.position && contact.role ? { icon: 'briefcase-outline', value: `${contact.position} at ${contact.role}`, onPress: undefined } : null,
    !contact.position && contact.role ? { icon: 'business-outline', value: contact.role, onPress: undefined } : null,
    contact.position && !contact.role ? { icon: 'briefcase-outline', value: contact.position, onPress: undefined } : null,
    contact.location ? { icon: 'location-outline', value: contact.location, onPress: undefined } : null,
    contact.email ? { icon: 'mail-outline', value: contact.email, onPress: openEmail, link: true } : null,
    contact.phone ? { icon: 'call-outline', value: contact.phone, onPress: openCall, link: true } : null,
    contact.linkedin ? { icon: 'logo-linkedin', value: 'LinkedIn', onPress: openLinkedin, link: true } : null,
  ].filter(Boolean) as { icon: string; value: string; onPress?: () => void; link?: boolean }[]

  const healthDesc = healthScore >= 75
    ? `Great job! You've kept a strong connection with ${firstName(contact.name)}.`
    : healthScore >= 40
    ? `You're doing okay — try to reach out to ${firstName(contact.name)} soon.`
    : `It's been a while. Time to reconnect with ${firstName(contact.name)}!`

  return (
    <View style={styles.root}>

      {/* ── Floating nav (always visible above scroll) ── */}
      <View style={[styles.navOverlay, { paddingTop: insets.top }]}>
        <View style={styles.heroNav}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMore} activeOpacity={0.7}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main scroll — blue shows behind identity section, white sheet below ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        bounces
      >
        {/* Spacer so scroll starts below the nav buttons */}
        <View style={{ height: insets.top + 52 }} />

        {/* Avatar + name + status — sits on blue background */}
        <View style={styles.heroIdentity}>
          <View style={styles.avatarRing}>
            <ContactAvatar
              name={contact.name}
              avatarUrl={avatarUrl}
              size={92}
              borderRadius={46}
              editable
              uploading={avatarUploading}
              onPress={handlePickAvatar}
            />
          </View>
          <Text style={styles.heroName}>{contact.name}</Text>
          {!!roleText && <Text style={styles.heroRole}>{roleText}</Text>}
          <View style={styles.heroBadge}>
            <StatusBadge status={contact.status} />
          </View>
        </View>

        {/* ── White content sheet slides up over blue as you scroll ── */}
        <View style={styles.sheet}>

          {/* Action row */}
          <View style={styles.actionRow}>
            {[
              { icon: 'chatbubble-outline', label: 'Message', onPress: openSms, disabled: !contact.phone },
              { icon: 'call-outline', label: 'Call', onPress: openCall, disabled: !contact.phone },
              { icon: 'mail-outline', label: 'Email', onPress: openEmail, disabled: !contact.email },
              { icon: 'ellipsis-horizontal', label: 'More', onPress: handleMore, disabled: false },
            ].map(action => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionItem, action.disabled && { opacity: 0.38 }]}
                onPress={action.onPress}
                disabled={action.disabled}
                activeOpacity={0.75}
              >
                <View style={styles.actionCircle}>
                  <Ionicons name={action.icon as any} size={22} color={HERO_BG} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pending response */}
          {pending && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.warning }} />
                <Text style={styles.pendingTitle}>Waiting for Your Reply</Text>
              </View>
              <Text style={styles.pendingSubject} numberOfLines={2}>{pending.email_subject}</Text>
              <Text style={styles.pendingTime}>{pendingTimeLabel(hoursAgo(pending.detected_at))}</Text>
              <TouchableOpacity
                onPress={() => pendingDb.dismiss(pending.id).catch(() => {}).then(() => setPending(null))}
                style={styles.dismissBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Relationship Health */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Relationship Health</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={styles.healthScoreRow}>
                  <Text style={[styles.healthNumber, { color: healthColor }]}>{healthScore}</Text>
                  <Text style={[styles.healthLabel, { color: healthColor }]}>{healthLabel}</Text>
                </View>
                <Text style={styles.healthDesc}>{healthDesc}</Text>
                <Text style={styles.healthSub}>
                  Last interaction {contact.days_since_contact} day{contact.days_since_contact !== 1 ? 's' : ''} ago
                </Text>
              </View>
              <View style={{ paddingTop: 4 }}>
                <LineChart data={trendData} width={90} height={52} color={healthColor} gradId="contact-health" />
              </View>
            </View>
          </View>

          {/* About */}
          {aboutRows.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About {firstName(contact.name)}</Text>
              {aboutRows.map((row, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.aboutRow, i === aboutRows.length - 1 && styles.aboutRowLast]}
                  onPress={row.onPress}
                  activeOpacity={row.onPress ? 0.7 : 1}
                  disabled={!row.onPress}
                >
                  <Ionicons name={row.icon as any} size={17} color={row.link ? HERO_BG : c.tertiary} />
                  <Text style={[styles.aboutValue, row.link && styles.aboutLink]} numberOfLines={1}>
                    {row.value}
                  </Text>
                  {!!row.onPress && <Ionicons name="chevron-forward" size={14} color={c.tertiary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tags */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tags</Text>
            <View style={styles.tagsWrap}>
              {tags.map(t => (
                <View key={t.id} style={styles.tagPill}>
                  <Text style={styles.tagText}>{t.name}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.addTagCircle} onPress={() => setTagsOpen(true)} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={c.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          {!!contact.notes && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notes</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21 }}>
                {contact.notes}
              </Text>
            </View>
          )}

          {/* We Talked */}
          <TouchableOpacity
            onPress={handleTalked}
            disabled={talkLoading}
            style={[styles.talkedBtn, talkSuccess && styles.talkedBtnSuccess]}
            activeOpacity={0.85}
          >
            {talkLoading ? (
              <ActivityIndicator color="#fff" />
            ) : talkSuccess ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.talkedText}>Logged!</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.talkedText}>We Talked</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── Bottom bar ── */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditOpen(true)} activeOpacity={0.75}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={styles.shareBtnText}>Share</Text>
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
            ? { ...updated, email_threads: prev.email_threads, interactions: prev.interactions, opportunities: prev.opportunities }
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
