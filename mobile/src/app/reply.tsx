import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Linking, Platform, KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { useAuth } from '@/hooks/useAuth'
import { ContactAvatar } from '@/components/ContactAvatar'
import { generateReply, type ReplyIntent, type DraftedReply } from '@/lib/contentApi'
import { pendingDb } from '@/lib/db'

// ── Intent presets (the "Need inspiration?" row) ────────────────────────────────

const INTENTS: { id: ReplyIntent; label: string; icon: keyof typeof Ionicons.glyphMap; tint: (c: ColorPalette) => string }[] = [
  { id: 'professional', label: 'Write a professional response', icon: 'create-outline',          tint: c => c.gold },
  { id: 'accept',       label: 'Accept and ask what they need', icon: 'checkmark-circle-outline', tint: c => c.success },
  { id: 'decline',      label: 'Decline politely',              icon: 'close-circle-outline',     tint: c => c.overdue },
  { id: 'details',      label: 'Ask for more details first',    icon: 'help-circle-outline',      tint: c => c.warning },
]

function relativeLabel(dateStr?: string) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Screen ──────────────────────────────────────────────────────────────────────

export default function ReplyScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()
  const { user } = useAuth()
  const params = useLocalSearchParams<{
    prId?: string; contactId?: string; contactName?: string; contactRole?: string
    relationship?: string; subject?: string; preview?: string; body?: string; date?: string
  }>()

  const contactName = params.contactName || 'this contact'
  const subject = params.subject || '(no subject)'

  const [emailContent, setEmailContent] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [intent, setIntent] = useState<ReplyIntent>('professional')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DraftedReply | null>(null)
  const [editedReply, setEditedReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)

  const hasContent = !!emailContent.trim() || !!imageBase64

  // ── Actions ───────────────────────────────────────────────────────────────────

  async function handlePaste() {
    let text = ''
    try { text = (await Clipboard.getStringAsync())?.trim() ?? '' } catch {}
    // Fall back to the email we already have on file (demo / Gmail-synced)
    if (!text) text = (params.body || params.preview || '').toString()
    setImageBase64(null)
    setEmailContent(text)
    setPasteOpen(true)
  }

  async function handleUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload a screenshot.')
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    })
    if (picked.canceled || !picked.assets?.[0]?.base64) return
    setEmailContent('')
    setPasteOpen(false)
    setImageBase64(picked.assets[0].base64)
  }

  async function handleGenerate() {
    if (!hasContent) return
    setLoading(true)
    setResult(null)
    try {
      const drafted = await generateReply({
        emailText: imageBase64 ? undefined : emailContent,
        imageBase64: imageBase64 || undefined,
        contactName,
        contactRole: params.contactRole?.toString(),
        relationship: params.relationship?.toString(),
        senderName: user?.name,
        intent,
      })
      setResult(drafted)
      setEditedReply(drafted.reply)
    } catch {
      Alert.alert('Could not generate', 'Make sure the Dialed server is running, then try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(editedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function handleOpenInMail() {
    const sub = encodeURIComponent(result?.subject || `Re: ${subject}`)
    const body = encodeURIComponent(editedReply)
    Linking.openURL(`mailto:?subject=${sub}&body=${body}`).catch(() => {
      Alert.alert('No mail app', 'Could not open a mail app on this device.')
    })
  }

  async function handleMarkReplied() {
    setMarking(true)
    try {
      if (params.prId) await pendingDb.responded(Number(params.prId))
      router.back()
    } catch {
      setMarking(false)
      Alert.alert('Error', 'Could not update the inbox.')
    }
  }

  // ── Header (shared) ─────────────────────────────────────────────────────────────

  const header = (
    <>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={c.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.kicker}>Reply with Dialed</Text>
          <Text style={s.contactName} numberOfLines={1}>{contactName}</Text>
        </View>
        <ContactAvatar name={contactName} size={42} borderRadius={21} bgColor={c.gold + '22'} />
      </View>

      {/* Email summary card */}
      <View style={s.emailCard}>
        <View style={s.mailIcon}>
          <Ionicons name="mail-outline" size={18} color={c.gold} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.emailSubject} numberOfLines={1}>Re: {subject}</Text>
          <Text style={s.emailMeta} numberOfLines={1}>
            {contactName}{params.date ? ` · ${relativeLabel(params.date.toString())}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleOpenInMail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.openInMail}>Open in Mail ↗</Text>
        </TouchableOpacity>
      </View>
    </>
  )

  // ── Result view ─────────────────────────────────────────────────────────────────

  if (result) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {header}

            <View style={s.resultHeaderRow}>
              <View style={s.sparkBadge}>
                <Ionicons name="sparkles" size={14} color={c.gold} />
                <Text style={s.sparkText}>Your draft</Text>
              </View>
              <TouchableOpacity onPress={handleGenerate} disabled={loading} style={s.regenBtn} activeOpacity={0.7}>
                {loading
                  ? <ActivityIndicator size="small" color={c.gold} />
                  : <><Ionicons name="refresh" size={14} color={c.gold} /><Text style={s.regenText}>Regenerate</Text></>}
              </TouchableOpacity>
            </View>

            <View style={s.replyCard}>
              <TextInput
                value={editedReply}
                onChangeText={setEditedReply}
                multiline
                style={s.replyInput}
                placeholder="Your reply…"
                placeholderTextColor={c.tertiary}
                textAlignVertical="top"
              />
            </View>
            <Text style={s.editHint}>Tap the text to edit before sending.</Text>

            <View style={s.actionRow}>
              <TouchableOpacity onPress={handleCopy} style={s.secondaryBtn} activeOpacity={0.7}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={c.gold} />
                <Text style={s.secondaryBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenInMail} style={s.secondaryBtn} activeOpacity={0.7}>
                <Ionicons name="mail-outline" size={17} color={c.gold} />
                <Text style={s.secondaryBtnText}>Open in Mail</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleMarkReplied} disabled={marking} style={s.primaryBtn} activeOpacity={0.85}>
              {marking
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-done" size={18} color="#fff" /><Text style={s.primaryBtnText}>Mark as replied</Text></>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setResult(null) }} style={{ alignItems: 'center', paddingVertical: 14 }} activeOpacity={0.7}>
              <Text style={s.startOver}>Start over</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ── Compose view ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {header}

          {/* Paste / upload dashed card */}
          <View style={s.dropCard}>
            <View style={s.docIcon}>
              <Ionicons name="document-text-outline" size={26} color={c.gold} />
            </View>
            <Text style={s.dropTitle}>
              {imageBase64 ? 'Screenshot ready' : pasteOpen ? 'Email loaded' : 'Paste the email or upload a screenshot'}
            </Text>
            <Text style={s.dropSub}>
              {imageBase64 || pasteOpen
                ? "Dialed will read it and write the perfect response. Pick a style below, then generate."
                : 'Dialed will read it and write the perfect response for you.'}
            </Text>

            {/* Loaded email preview (editable) */}
            {pasteOpen && (
              <View style={s.pasteBox}>
                <TextInput
                  value={emailContent}
                  onChangeText={setEmailContent}
                  multiline
                  style={s.pasteInput}
                  placeholder="Paste the email text here…"
                  placeholderTextColor={c.tertiary}
                  textAlignVertical="top"
                />
              </View>
            )}

            {imageBase64 && (
              <View style={s.screenshotChip}>
                <Ionicons name="image" size={15} color={c.gold} />
                <Text style={s.screenshotChipText}>Screenshot attached</Text>
                <TouchableOpacity onPress={() => setImageBase64(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={17} color={c.tertiary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={handlePaste} style={s.pasteBtn} activeOpacity={0.85}>
              <Ionicons name="clipboard-outline" size={17} color="#fff" />
              <Text style={s.pasteBtnText}>{pasteOpen ? 'Re-paste from clipboard' : 'Paste Email'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleUpload} style={s.uploadBtn} activeOpacity={0.75}>
              <Ionicons name="image-outline" size={17} color={c.primary} />
              <Text style={s.uploadBtnText}>Upload Screenshot</Text>
            </TouchableOpacity>

            <View style={s.privacyRow}>
              <Ionicons name="lock-closed" size={11} color={c.tertiary} />
              <Text style={s.privacyText}>Your content stays private and is only used to generate your response.</Text>
            </View>
          </View>

          {/* Need inspiration */}
          <Text style={s.sectionLabel}>Need inspiration?</Text>
          <View style={s.intentGrid}>
            {INTENTS.map(it => {
              const active = intent === it.id
              const tint = it.tint(c)
              return (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => setIntent(it.id)}
                  activeOpacity={0.8}
                  style={[s.intentCard, active && { borderColor: tint, backgroundColor: tint + '10' }]}
                >
                  <Ionicons name={it.icon} size={20} color={active ? tint : c.secondary} />
                  <Text style={[s.intentText, active && { color: c.primary }]}>{it.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Your response will be */}
          <Text style={s.sectionLabel}>Your response will be:</Text>
          <View style={s.promiseCard}>
            {[
              { icon: 'sparkles' as const, text: "Personalized to the email's tone and context" },
              { icon: 'person-outline' as const, text: 'Written in your voice' },
              { icon: 'checkmark-circle-outline' as const, text: 'Ready to review and send' },
            ].map((row, i) => (
              <View key={i} style={[s.promiseRow, i > 0 && { marginTop: 12 }]}>
                <Ionicons name={row.icon} size={17} color={c.gold} />
                <Text style={s.promiseText}>{row.text}</Text>
              </View>
            ))}
          </View>

          {/* Generate */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={!hasContent || loading}
            activeOpacity={0.85}
            style={[s.generateBtn, (!hasContent || loading) && { opacity: 0.45 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="create-outline" size={18} color="#fff" /><Text style={s.generateText}>Generate My Response</Text></>}
          </TouchableOpacity>

          <View style={s.footerRow}>
            <Ionicons name="lock-closed" size={11} color={c.tertiary} />
            <Text style={s.footerText}>Dialed respects your privacy. </Text>
            <Text style={[s.footerText, { color: c.gold, textDecorationLine: 'underline' }]}>Learn more</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },

    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    kicker: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.gold, letterSpacing: 0.2 },
    contactName: { fontFamily: FontFamily.display, fontSize: 21, color: c.primary, marginTop: 1 },

    emailCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, padding: 14, marginBottom: 16,
    },
    mailIcon: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: c.gold + '18', alignItems: 'center', justifyContent: 'center',
    },
    emailSubject: { fontFamily: FontFamily.display, fontSize: 15, color: c.primary },
    emailMeta: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 2 },
    openInMail: { fontFamily: FontFamily.sansMedium, fontSize: 12.5, color: c.gold },

    dropCard: {
      borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed',
      borderRadius: 20, backgroundColor: c.surface,
      padding: 20, alignItems: 'center', marginBottom: 22,
    },
    docIcon: {
      width: 56, height: 56, borderRadius: 16,
      backgroundColor: c.gold + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    dropTitle: { fontFamily: FontFamily.display, fontSize: 17, color: c.primary, textAlign: 'center' },
    dropSub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 8 },

    pasteBox: {
      alignSelf: 'stretch', backgroundColor: c.background, borderRadius: 12,
      borderWidth: 1, borderColor: c.border, marginTop: 14, padding: 10,
    },
    pasteInput: { fontFamily: FontFamily.sans, fontSize: 13.5, color: c.primary, minHeight: 90, maxHeight: 180, lineHeight: 19 },

    screenshotChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
      backgroundColor: c.gold + '12', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    },
    screenshotChipText: { flex: 1, fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold },

    pasteBtn: {
      alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.gold, borderRadius: 12, paddingVertical: 14, marginTop: 16,
    },
    pasteBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#fff' },
    uploadBtn: {
      alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingVertical: 13, marginTop: 10,
    },
    uploadBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary },

    privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 10 },
    privacyText: { flex: 1, fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, textAlign: 'center', lineHeight: 16 },

    sectionLabel: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary, marginBottom: 12 },

    intentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
    intentCard: {
      width: '47%', flexGrow: 1,
      borderWidth: 1, borderColor: c.border, borderRadius: 14,
      backgroundColor: c.surface, padding: 12, gap: 8, minHeight: 78,
    },
    intentText: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, lineHeight: 17 },

    promiseCard: {
      backgroundColor: c.elevated, borderRadius: 16,
      borderWidth: 1, borderColor: c.subtleBorder, padding: 16, marginBottom: 22,
    },
    promiseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    promiseText: { flex: 1, fontFamily: FontFamily.sans, fontSize: 13.5, color: c.primary },

    generateBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.gold, borderRadius: 14, paddingVertical: 16,
    },
    generateText: { fontFamily: FontFamily.display, fontSize: 16, color: '#fff' },

    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    footerText: { fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary },

    // result view
    resultHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sparkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sparkText: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary },
    regenBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: c.border },
    regenText: { fontFamily: FontFamily.sansMedium, fontSize: 12.5, color: c.gold },

    replyCard: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.subtleBorder, padding: 14 },
    replyInput: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, lineHeight: 22, minHeight: 200, maxHeight: 360 },
    editHint: { fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, marginTop: 8, marginBottom: 16, textAlign: 'center' },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    secondaryBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingVertical: 13,
    },
    secondaryBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.gold, borderRadius: 14, paddingVertical: 16,
    },
    primaryBtnText: { fontFamily: FontFamily.display, fontSize: 16, color: '#fff' },
    startOver: { fontFamily: FontFamily.sansMedium, fontSize: 13.5, color: c.secondary },
  })
}
