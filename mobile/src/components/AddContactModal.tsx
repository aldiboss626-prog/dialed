import { useRef, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb } from '@/lib/db'
import { loadPhoneContacts } from '@/lib/api'
import { ImportSelectionModal } from '@/components/ImportSelectionModal'
import { FloatingNav } from '@/components/FloatingNav'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { Contact, ImportCandidate } from '@/types'

// ── Tag colours ───────────────────────────────────────────────────────────────

const PRESET_TAG_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444', Professor: '#F59E0B',
}
const PRESET_TAGS = Object.keys(PRESET_TAG_COLORS)
const CUSTOM_PALETTE = ['#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6']

function tagColor(tag?: string | null): string {
  const t = tag ?? ''
  if (PRESET_TAG_COLORS[t]) return PRESET_TAG_COLORS[t]
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) & 0xffff
  return CUSTOM_PALETTE[h % CUSTOM_PALETTE.length]
}

const STAR_CADENCE: Record<number, number> = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 }

type Source = 'manual' | 'phone' | 'email' | 'scan'
const SOURCES: { id: Source; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'manual', label: 'Manual Entry',       icon: 'person-outline' },
  { id: 'phone',  label: 'Phone Contacts',     icon: 'call-outline' },
  { id: 'email',  label: 'Email Contacts',     icon: 'mail-outline' },
  { id: 'scan',   label: 'Scan Business Card', icon: 'scan-outline' },
]

// ── StarRow ───────────────────────────────────────────────────────────────────

function StarRow({ stars, onStars }: { stars: number; onStars: (n: number) => void }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onStars(n)} activeOpacity={0.7} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}>
          <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={22} color={n <= stars ? c.gold : c.border} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean
  onClose: () => void
  onAdd?: (c: Contact) => void
  onAdded?: (c: Contact) => void
}

export function AddContactModal({ visible, onClose, onAdd, onAdded }: Props) {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()

  const [source, setSource] = useState<Source>('manual')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [relType, setRelType] = useState('Mentor')
  const [customTagDraft, setCustomTagDraft] = useState('')
  const [customTagOpen, setCustomTagOpen] = useState(false)
  const [stars, setStars] = useState(3)
  const [cadence, setCadence] = useState(STAR_CADENCE[3])
  const [customCadence, setCustomCadence] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Phone-contacts import
  const [importOpen, setImportOpen] = useState(false)
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const didImport = useRef(false)

  async function getExistingEmails(): Promise<string[]> {
    try {
      const contacts = await contactsDb.list()
      return contacts.map(x => x.email).filter((e): e is string => !!e)
    } catch { return [] }
  }

  async function handleImportPhone() {
    setImportLoading(true)
    setImportCandidates([])
    setImportOpen(true)
    try {
      const existing = await getExistingEmails()
      setImportCandidates(await loadPhoneContacts(existing))
    } catch (err: any) {
      setImportOpen(false)
      if (err?.message === 'LIMITED_ACCESS') {
        Alert.alert(
          'Limited Contacts Access',
          'You only granted access to some contacts. To import your full network, go to iPhone Settings → Privacy & Security → Contacts → Dialed, then choose "Allow Access to All Contacts".',
          [{ text: 'Open Settings', onPress: () => Linking.openSettings() }, { text: 'OK', style: 'cancel' }],
        )
      } else {
        Alert.alert('Could not load contacts', err?.message ?? 'Allow contacts access in Settings.')
      }
    } finally {
      setImportLoading(false)
    }
  }

  async function handleConfirmImport(selected: ImportCandidate[]) {
    const created = await contactsDb.bulkCreate(selected.map(x => ({ name: x.name, email: x.email, phone: x.phone, role: x.role })))
    const cb = onAdd ?? onAdded
    created.forEach(ct => cb?.(ct))
    didImport.current = true
  }

  function handleImportClose() {
    setImportOpen(false)
    if (didImport.current) { didImport.current = false; handleClose() }
  }

  function handleStars(n: number) {
    setStars(n)
    if (!customCadence) setCadence(STAR_CADENCE[n])
  }
  function setCad(v: number) {
    setCadence(Math.max(1, Math.min(90, v)))
    setCustomCadence(true)
  }

  function reset() {
    setSource('manual')
    setName(''); setTitle(''); setCompany(''); setEmail(''); setPhone('')
    setRelType('Mentor'); setCustomTagDraft(''); setCustomTagOpen(false)
    setStars(3); setCadence(STAR_CADENCE[3])
    setCustomCadence(false); setError('')
  }

  function commitCustomTag() {
    const trimmed = customTagDraft.trim()
    if (trimmed) setRelType(trimmed)
    setCustomTagOpen(false)
  }

  function handleClose() { reset(); onClose() }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true)
    try {
      const contact = await contactsDb.create({
        name: name.trim(),
        position: title.trim() || undefined,
        role: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        relationship_type: relType,
        stars,
        cadence_days: cadence,
      })
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

  const isDefault = cadence === STAR_CADENCE[stars] && !customCadence

  const FIELDS = [
    { label: 'Full name *',      value: name,    set: setName,    placeholder: 'Maya Patel',        kb: 'default' as const },
    { label: 'Title',            value: title,   set: setTitle,   placeholder: 'Product Designer',  kb: 'default' as const },
    { label: 'Company',          value: company, set: setCompany, placeholder: 'Linear',            kb: 'default' as const },
    { label: 'Email',            value: email,   set: setEmail,   placeholder: 'maya@linear.app',   kb: 'email-address' as const },
    { label: 'Phone (optional)', value: phone,   set: setPhone,   placeholder: '+1 (415) 123-4567', kb: 'phone-pad' as const },
  ]

  const activeSource = SOURCES.find(x => x.id === source)!

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Back */}
          <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 36, height: 36, justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={26} color={c.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* Title block */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 4 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.title}>Add Connection</Text>
                <Text style={s.subtitle}>Add someone to your network and build stronger relationships.</Text>
              </View>
              <View style={s.heroBadge}>
                <Ionicons name="person-add-outline" size={22} color={c.gold} />
              </View>
            </View>

            {/* Source tabs */}
            <View style={s.tabs}>
              {SOURCES.map((tab, i) => {
                const active = source === tab.id
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => { setSource(tab.id); setError('') }}
                    activeOpacity={0.8}
                    style={[s.tab, { backgroundColor: active ? c.gold + '14' : c.surface, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: c.subtleBorder }]}
                  >
                    <Ionicons name={tab.icon} size={22} color={active ? c.gold : c.primary} />
                    <Text numberOfLines={2} style={{ fontFamily: active ? FontFamily.sansMedium : FontFamily.sans, fontSize: 11, color: active ? c.gold : c.secondary, textAlign: 'center', lineHeight: 14 }}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {source === 'phone' ? (
              /* ── Phone-contacts import ── */
              <View style={{ alignItems: 'center', paddingHorizontal: 36, paddingTop: 56, gap: 12 }}>
                <View style={s.heroCircle}>
                  <Ionicons name="call-outline" size={30} color={c.gold} />
                </View>
                <Text style={{ fontFamily: FontFamily.display, fontSize: 21, color: c.primary, textAlign: 'center' }}>Import from your phone</Text>
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, textAlign: 'center', lineHeight: 20 }}>
                  Pick people from your device contacts to add to your network.
                </Text>
                <TouchableOpacity onPress={handleImportPhone} activeOpacity={0.85} style={s.primaryPill}>
                  <Ionicons name="phone-portrait-outline" size={16} color="#fff" />
                  <Text style={s.primaryPillText}>Choose contacts</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSource('manual')} activeOpacity={0.8} style={s.ghostBtn}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold }}>Add manually instead</Text>
                </TouchableOpacity>
              </View>
            ) : source !== 'manual' ? (
              /* ── Coming-soon panel (Email / Scan) ── */
              <View style={{ alignItems: 'center', paddingHorizontal: 36, paddingTop: 56, gap: 12 }}>
                <View style={s.heroCircle}>
                  <Ionicons name={activeSource.icon} size={30} color={c.gold} />
                </View>
                <Text style={{ fontFamily: FontFamily.display, fontSize: 21, color: c.primary, textAlign: 'center' }}>{activeSource.label}</Text>
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, textAlign: 'center', lineHeight: 20 }}>
                  This import option is coming soon. For now you can add this person by hand.
                </Text>
                <TouchableOpacity onPress={() => setSource('manual')} activeOpacity={0.8} style={s.ghostBtn}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold }}>Add manually instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* CONTACT INFORMATION */}
                <Text style={s.sectionLabel}>CONTACT INFORMATION</Text>
                <View style={s.card}>
                  {FIELDS.map((f, i) => (
                    <View key={f.label} style={{ paddingHorizontal: 16, paddingTop: 11, paddingBottom: 12, borderBottomWidth: i < FIELDS.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
                      <Text style={s.fieldLabel}>{f.label}</Text>
                      <TextInput
                        value={f.value}
                        onChangeText={f.set}
                        placeholder={f.placeholder}
                        placeholderTextColor={c.tertiary}
                        keyboardType={f.kb}
                        autoCapitalize={f.kb === 'email-address' ? 'none' : 'words'}
                        style={s.fieldInput}
                        returnKeyType={i < FIELDS.length - 1 ? 'next' : 'done'}
                      />
                    </View>
                  ))}
                </View>

                {/* TAGS */}
                <Text style={s.sectionLabel}>TAGS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20 }}>
                  {PRESET_TAGS.map(tag => {
                    const active = relType === tag && !customTagOpen
                    const color = tagColor(tag)
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => { setRelType(tag); setCustomTagOpen(false) }}
                        activeOpacity={0.75}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 7,
                          paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                          borderWidth: active ? 1.5 : 1,
                          borderColor: active ? color : c.border,
                          backgroundColor: active ? color + '12' : c.surface,
                        }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                        <Text style={{ fontFamily: active ? FontFamily.sansMedium : FontFamily.sans, fontSize: 14, color: active ? color : c.secondary }}>{tag}</Text>
                      </TouchableOpacity>
                    )
                  })}

                  {/* Active custom tag chip */}
                  {!PRESET_TAGS.includes(relType) && !customTagOpen && (
                    <TouchableOpacity
                      onPress={() => { setCustomTagDraft(relType); setCustomTagOpen(true) }}
                      activeOpacity={0.75}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: tagColor(relType), backgroundColor: tagColor(relType) + '12' }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tagColor(relType) }} />
                      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: tagColor(relType) }}>{relType}</Text>
                      <TouchableOpacity onPress={() => setRelType('Mentor')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                        <Ionicons name="close" size={14} color={tagColor(relType)} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}

                  {/* + Custom tag */}
                  <TouchableOpacity
                    onPress={() => { setCustomTagDraft(''); setCustomTagOpen(true) }}
                    activeOpacity={0.75}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderStyle: 'dashed' }}
                  >
                    <Ionicons name="add" size={16} color={c.tertiary} />
                    <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary }}>Custom tag</Text>
                  </TouchableOpacity>
                </View>

                {customTagOpen && (
                  <View style={{ marginHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: c.gold, paddingHorizontal: 14, paddingVertical: 4 }}>
                    <TextInput
                      value={customTagDraft}
                      onChangeText={setCustomTagDraft}
                      placeholder="e.g. Law Enforcement"
                      placeholderTextColor={c.tertiary}
                      autoFocus
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={commitCustomTag}
                      style={{ flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, paddingVertical: 10 }}
                    />
                    <TouchableOpacity onPress={commitCustomTag} activeOpacity={0.75}>
                      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold }}>Set</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* PRIORITY & CADENCE */}
                <Text style={s.sectionLabel}>PRIORITY & CADENCE</Text>
                <View style={s.card}>
                  {/* Priority */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <Text style={s.rowLabel}>Priority</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <StarRow stars={stars} onStars={handleStars} />
                      <Text style={{ fontFamily: FontFamily.sans, fontSize: 12.5, color: c.tertiary }}>
                        {isDefault ? `Default · ${stars}★` : 'Custom'}
                      </Text>
                    </View>
                  </View>
                  {/* Cadence */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}>
                    <Text style={s.rowLabel}>Reach out every</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => setCad(cadence - 1)} activeOpacity={0.7} style={s.stepBtn}>
                        <Ionicons name="remove" size={18} color={c.primary} />
                      </TouchableOpacity>
                      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, minWidth: 64, textAlign: 'center' }}>{cadence} days</Text>
                      <TouchableOpacity onPress={() => setCad(cadence + 1)} activeOpacity={0.7} style={s.stepBtn}>
                        <Ionicons name="add" size={18} color={c.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Info banner */}
                <View style={s.banner}>
                  <Ionicons name="bulb-outline" size={16} color={c.gold} />
                  <Text style={{ flex: 1, fontFamily: FontFamily.sans, fontSize: 12.5, color: c.gold, lineHeight: 17 }}>
                    We'll remind you to stay in touch based on this cadence.
                  </Text>
                </View>

                {!!error && <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.overdue, marginHorizontal: 20, marginTop: 12, textAlign: 'center' }}>{error}</Text>}

                <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85} style={[s.saveBtn, { marginHorizontal: 20, marginTop: 22 }]}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save Connection</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <ImportSelectionModal
          visible={importOpen}
          candidates={importCandidates}
          loading={importLoading}
          onClose={handleImportClose}
          onImport={handleConfirmImport}
        />

        <FloatingNav
          items={[
            { id: 'network',  label: 'Network',  icon: 'people-outline', onPress: () => { handleClose(); router.navigate({ pathname: '/(tabs)/home', params: { tab: 'network' } } as any) } },
            { id: 'inbox',    label: 'Inbox',    icon: 'mail-outline',   onPress: () => { handleClose(); router.navigate({ pathname: '/(tabs)/home', params: { tab: 'inbox' } } as any) } },
            { id: 'contacts', label: 'Contacts', icon: 'search',         onPress: () => { handleClose(); router.navigate('/search' as any) } },
          ]}
        />
      </SafeAreaView>
    </Modal>
  )
}

function makeStyles(c: ColorPalette) {
  return {
    title: { fontFamily: FontFamily.display, fontSize: 30, color: c.primary, lineHeight: 35 } as const,
    subtitle: { fontFamily: FontFamily.sans, fontSize: 14.5, color: c.secondary, lineHeight: 20, marginTop: 6 } as const,
    heroBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.gold + '14', alignItems: 'center', justifyContent: 'center' } as const,
    heroCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.gold + '14', alignItems: 'center', justifyContent: 'center' } as const,

    tabs: { marginHorizontal: 20, marginTop: 22, flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden' } as const,
    tab: { flex: 1, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 80 } as const,

    sectionLabel: { fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9, color: c.tertiary, marginHorizontal: 20, marginTop: 24, marginBottom: 10 } as const,

    card: { marginHorizontal: 20, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden' } as const,
    fieldLabel: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, marginBottom: 3 } as const,
    fieldInput: { fontFamily: FontFamily.sans, fontSize: 16, color: c.primary, paddingVertical: 0, minHeight: 24 } as const,

    rowLabel: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary } as const,
    stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center' } as const,

    banner: { marginHorizontal: 20, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: c.gold + '0E', borderRadius: 12, borderWidth: 1, borderColor: c.gold + '22', paddingHorizontal: 13, paddingVertical: 12 } as const,

    primaryPill: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 999, backgroundColor: c.gold } as const,
    primaryPillText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#fff' } as const,
    ghostBtn: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, borderWidth: 1.5, borderColor: c.gold + '55' } as const,

    saveBtn: { backgroundColor: c.gold, borderRadius: 16, paddingVertical: 16, alignItems: 'center' } as const,
    saveText: { fontFamily: FontFamily.display, fontSize: 17, color: '#fff' } as const,
  }
}
