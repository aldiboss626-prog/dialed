import { useState, useRef, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, PanResponder,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb } from '@/lib/db'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { Contact } from '@/types'

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

// ── DaySlider ─────────────────────────────────────────────────────────────────

function DaySlider({ value, onChange, min = 1, max = 90 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  const c = useColors()
  const [trackW, setTrackW] = useState(0)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(value))

  const layoutRef = useRef({ pageX: 0, width: 1 })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const minRef = useRef(min); minRef.current = min
  const maxRef = useRef(max); maxRef.current = max
  const trackRef = useRef<View>(null)

  // Keep inputVal in sync when slider moves (but not while the user is typing)
  useEffect(() => {
    if (!editing) setInputVal(String(value))
  }, [value, editing])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        trackRef.current?.measure((_fx, _fy, w, _h, pageX) => {
          layoutRef.current = { pageX, width: w }
        })
      },
      onPanResponderMove: (_, gs) => {
        const { pageX, width } = layoutRef.current
        const ratio = Math.max(0, Math.min(1, (gs.moveX - pageX) / width))
        onChangeRef.current(Math.round(minRef.current + ratio * (maxRef.current - minRef.current)))
      },
    })
  ).current

  function commitEdit() {
    const parsed = parseInt(inputVal, 10)
    if (!isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)))
    else setInputVal(String(value))
    setEditing(false)
  }

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const thumbLeft = trackW > 0 ? pct * trackW - 11 : 0

  return (
    <View style={{ gap: 8 }}>
      {/* − track + */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          activeOpacity={0.7}
          style={{
            width: 40, height: 40, borderRadius: 20,
            borderWidth: 1.5, borderColor: c.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="remove" size={20} color={c.primary} />
        </TouchableOpacity>

        <View
          ref={trackRef}
          style={{ flex: 1, height: 44, justifyContent: 'center' }}
          onLayout={e => {
            const w = e.nativeEvent.layout.width
            setTrackW(w)
            setTimeout(() => {
              trackRef.current?.measure((_fx, _fy, mw, _h, pageX) => {
                layoutRef.current = { pageX, width: mw }
              })
            }, 50)
          }}
          {...panResponder.panHandlers}
        >
          <View style={{ height: 3, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' }}>
            <View style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: pct * (trackW || 1), backgroundColor: c.gold,
            }} />
          </View>
          {trackW > 0 && (
            <View style={{
              position: 'absolute', left: thumbLeft, top: (44 - 22) / 2,
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: '#fff', borderWidth: 2.5, borderColor: c.gold,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
            }} />
          )}
        </View>

        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          activeOpacity={0.7}
          style={{
            width: 40, height: 40, borderRadius: 20,
            borderWidth: 1.5, borderColor: c.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Tappable day count — switches to TextInput on tap */}
      <TouchableOpacity
        onPress={() => { setInputVal(String(value)); setEditing(true) }}
        activeOpacity={0.7}
        style={{ alignItems: 'center' }}
        disabled={editing}
      >
        {editing ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <TextInput
              value={inputVal}
              onChangeText={t => setInputVal(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              style={{
                fontFamily: FontFamily.display, fontSize: 32, color: c.primary,
                minWidth: 60, textAlign: 'center',
                borderBottomWidth: 2, borderBottomColor: c.gold,
                paddingVertical: 0,
              }}
            />
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary }}>days</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={{ fontFamily: FontFamily.display, fontSize: 32, color: c.primary }}>
              {value}
            </Text>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary }}>days</Text>
            <Ionicons name="pencil-outline" size={13} color={c.tertiary} style={{ marginBottom: 2 }} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ── StarRow ───────────────────────────────────────────────────────────────────

function StarRow({ stars, onStars }: { stars: number; onStars: (n: number) => void }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onStars(n)} activeOpacity={0.7}>
          <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={26} color={n <= stars ? c.gold : c.border} />
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
  const insets = useSafeAreaInsets()

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

  function handleStars(n: number) {
    setStars(n)
    if (!customCadence) setCadence(STAR_CADENCE[n])
  }

  function reset() {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border }} />
          </View>

          {/* Header — X on left, title centered, no Skip */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
          }}>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: c.elevated,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color={c.secondary} />
            </TouchableOpacity>
            <Text style={{
              flex: 1, textAlign: 'center',
              fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.primary,
            }}>
              Add Connection
            </Text>
            {/* spacer to balance the X */}
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          >
            {/* Hero */}
            <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 22, paddingHorizontal: 32 }}>
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                backgroundColor: c.gold + '18',
                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <Ionicons name="person-outline" size={26} color={c.gold} />
              </View>
              <Text style={{ fontFamily: FontFamily.display, fontSize: 24, color: c.primary, textAlign: 'center', marginBottom: 7 }}>
                Add someone to your network
              </Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 13.5, color: c.secondary, textAlign: 'center', lineHeight: 19 }}>
                Build stronger relationships and unlock new opportunities.
              </Text>
            </View>

            {/* Form card */}
            <View style={{
              marginHorizontal: 18, backgroundColor: c.surface, borderRadius: 18,
              borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden', marginBottom: 22,
            }}>
              {([
                { label: 'Full name',       value: name,    set: setName,    placeholder: 'Maya Patel',        kb: 'default' as const },
                { label: 'Title',           value: title,   set: setTitle,   placeholder: 'Product Designer',  kb: 'default' as const },
                { label: 'Company',         value: company, set: setCompany, placeholder: 'Linear',            kb: 'default' as const },
                { label: 'Email',           value: email,   set: setEmail,   placeholder: 'maya@linear.app',   kb: 'email-address' as const },
                { label: 'Phone (optional)',value: phone,   set: setPhone,   placeholder: '+1 (415) 123-4567', kb: 'phone-pad' as const },
              ] as const).map((f, i, arr) => (
                <View key={f.label} style={{
                  paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: c.border,
                }}>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, marginBottom: 3 }}>
                    {f.label}
                  </Text>
                  <TextInput
                    value={f.value}
                    onChangeText={f.set}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.tertiary}
                    keyboardType={f.kb}
                    autoCapitalize={f.kb === 'email-address' ? 'none' : 'words'}
                    style={{ fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, paddingVertical: 0, minHeight: 22 }}
                    returnKeyType={i < arr.length - 1 ? 'next' : 'done'}
                  />
                </View>
              ))}
            </View>

            {/* Relationship tag */}
            <Text style={{
              fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9,
              textTransform: 'uppercase', color: c.secondary,
              marginHorizontal: 18, marginBottom: 12,
            }}>
              Tag
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 18, marginBottom: customTagOpen ? 12 : 22 }}>
              {/* Preset chips */}
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
                      backgroundColor: active ? color + '14' : c.surface,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text style={{
                      fontFamily: active ? FontFamily.sansMedium : FontFamily.sans,
                      fontSize: 14, color: active ? color : c.secondary,
                    }}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                )
              })}

              {/* Active custom tag chip (if set and not editing) */}
              {!PRESET_TAGS.includes(relType) && !customTagOpen && (
                <TouchableOpacity
                  onPress={() => { setCustomTagDraft(relType); setCustomTagOpen(true) }}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 7,
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                    borderWidth: 1.5, borderColor: tagColor(relType),
                    backgroundColor: tagColor(relType) + '14',
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tagColor(relType) }} />
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: tagColor(relType) }}>
                    {relType}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setRelType('Mentor')}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons name="close" size={14} color={tagColor(relType)} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {/* + Custom chip */}
              <TouchableOpacity
                onPress={() => { setCustomTagDraft(''); setCustomTagOpen(true) }}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999,
                  borderWidth: 1, borderColor: c.border,
                  backgroundColor: c.surface,
                  borderStyle: 'dashed',
                }}
              >
                <Ionicons name="add" size={16} color={c.tertiary} />
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary }}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inline custom tag input */}
            {customTagOpen && (
              <View style={{
                marginHorizontal: 18, marginBottom: 22,
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: c.surface, borderRadius: 14,
                borderWidth: 1.5, borderColor: c.gold,
                paddingHorizontal: 14, paddingVertical: 4,
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
                    flex: 1, fontFamily: FontFamily.sans, fontSize: 15,
                    color: c.primary, paddingVertical: 10,
                  }}
                />
                <TouchableOpacity onPress={commitCustomTag} activeOpacity={0.75}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold }}>
                    Set
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Priority & Cadence */}
            <View style={{
              marginHorizontal: 18, backgroundColor: c.surface, borderRadius: 18,
              borderWidth: 1, borderColor: c.subtleBorder, padding: 18, marginBottom: 22,
            }}>
              <Text style={{ fontFamily: FontFamily.display, fontSize: 17, color: c.primary, marginBottom: 18 }}>
                Priority & cadence
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: c.secondary }}>
                  Priority
                </Text>
                <StarRow stars={stars} onStars={handleStars} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: c.secondary }}>
                  Reach out every
                </Text>
                <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary }}>
                  {isDefault ? `Default · ${stars}★` : 'Custom'}
                </Text>
              </View>

              <DaySlider value={cadence} onChange={v => { setCadence(v); setCustomCadence(true) }} />
            </View>

            {!!error && (
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.overdue, marginHorizontal: 18, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                marginHorizontal: 18, backgroundColor: c.gold,
                borderRadius: 999, paddingVertical: 16, alignItems: 'center',
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontFamily: FontFamily.display, fontSize: 17, color: '#fff' }}>Save Connection</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
