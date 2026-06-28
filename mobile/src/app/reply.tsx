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
import { generateReply, type DraftedReply } from '@/lib/contentApi'
import { pendingDb, sentRepliesDb } from '@/lib/db'

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
    relationship?: string; subject?: string; preview?: string; body?: string; date?: string; email?: string
  }>()

  const contactName = params.contactName || 'this contact'
  const subject = params.subject || '(no subject)'

  // Prefill with the email we opened from the inbox so "Generate" works in one tap.
  // Falls back to empty for the manual paste / screenshot flow.
  const [emailContent, setEmailContent] = useState(
    () => params.body?.toString() || params.preview?.toString() || ''
  )
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DraftedReply | null>(null)
  const [editedReply, setEditedReply] = useState('')
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)

  const hasContent = !!emailContent.trim() || !!imageBase64

  // ── Actions ───────────────────────────────────────────────────────────────────

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
    setImageBase64(picked.assets[0].base64)
  }

  async function handleGenerate() {
    if (!hasContent || loading) return
    setLoading(true)
    setResult(null)
    try {
      // Personalization: feed the user's own recent replies so the draft matches their voice.
      const styleExamples = await sentRepliesDb.recent(5)
      const drafted = await generateReply({
        emailText: imageBase64 ? undefined : emailContent,
        imageBase64: imageBase64 || undefined,
        contactName,
        contactRole: params.contactRole?.toString(),
        relationship: params.relationship?.toString(),
        senderName: user?.name,
        intent: 'professional',
        styleExamples,
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
    const to = encodeURIComponent(params.email?.toString() || '')
    const sub = encodeURIComponent(result?.subject || `Re: ${subject}`)
    const body = encodeURIComponent(editedReply || '')
    Linking.openURL(`mailto:${to}?subject=${sub}&body=${body}`).catch(() => {
      Alert.alert('No mail app', 'Could not open a mail app on this device.')
    })
  }

  async function handleMarkReplied() {
    setMarking(true)
    try {
      // Save the reply they actually sent — this is what teaches the draft their voice next time.
      if (editedReply.trim()) {
        await sentRepliesDb.create({
          reply_text: editedReply.trim(),
          subject: result?.subject ?? null,
          contact_id: params.contactId ? Number(params.contactId) : null,
        }).catch(() => {}) // best-effort: never block marking-as-replied on this
      }
      if (params.prId) await pendingDb.responded(Number(params.prId))
      router.back()
    } catch {
      setMarking(false)
      Alert.alert('Error', 'Could not update the inbox.')
    }
  }

  // status chip text + color for the "Reply preview" header
  const statusText = loading ? 'Generating…' : result ? 'Draft ready' : 'Ready to generate'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Header: back · title · avatar */}
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={26} color={c.primary} />
            </TouchableOpacity>
            <Text style={s.title} numberOfLines={1}>Reply with Dialed</Text>
            <ContactAvatar name={contactName} size={38} borderRadius={19} bgColor={c.elevated} />
          </View>

          {/* Email context card */}
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

          {/* Paste the email */}
          <Text style={s.h2}>Paste the email</Text>
          <Text style={s.h2sub}>I'll read it and write a response for you.</Text>

          {imageBase64 ? (
            <View style={s.screenshotChip}>
              <Ionicons name="image" size={16} color={c.gold} />
              <Text style={s.screenshotChipText}>Screenshot attached</Text>
              <TouchableOpacity onPress={() => setImageBase64(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={c.tertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.pasteBox}>
              <TextInput
                value={emailContent}
                onChangeText={setEmailContent}
                multiline
                style={s.pasteInput}
                placeholder="Paste email content here…"
                placeholderTextColor={c.tertiary}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* or · upload screenshot */}
          {!imageBase64 && (
            <>
              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>or</Text>
                <View style={s.orLine} />
              </View>
              <TouchableOpacity onPress={handleUpload} style={s.uploadBtn} activeOpacity={0.75}>
                <Ionicons name="image-outline" size={18} color={c.gold} />
                <Text style={s.uploadBtnText}>Upload screenshot</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Privacy */}
          <View style={s.privacyRow}>
            <Ionicons name="lock-closed" size={11} color={c.tertiary} />
            <Text style={s.privacyText}>Your content stays private and is only used to generate your response.</Text>
          </View>

          {/* Reply preview */}
          <View style={s.previewHeaderRow}>
            <Text style={s.h2}>Reply preview</Text>
            <View style={s.statusChip}>
              <Ionicons name="sparkles" size={13} color={c.gold} />
              <Text style={s.statusText}>{statusText}</Text>
            </View>
          </View>

          {result ? (
            <View style={s.previewBox}>
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
          ) : (
            <View style={[s.previewBox, s.previewPlaceholder]}>
              <View style={s.bubbleIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={c.gold} />
              </View>
              <Text style={s.placeholderText}>
                {loading ? 'Reading the email and drafting your reply…' : 'Paste an email above and Dialed will draft a response here.'}
              </Text>
            </View>
          )}

          {/* Post-draft actions */}
          {result && (
            <>
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
                <TouchableOpacity onPress={handleGenerate} disabled={loading} style={s.secondaryBtn} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={17} color={c.gold} />
                  <Text style={s.secondaryBtnText}>Redo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Primary CTA: generate, then mark-as-replied */}
          {result ? (
            <TouchableOpacity onPress={handleMarkReplied} disabled={marking} style={s.cta} activeOpacity={0.85}>
              {marking
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-done" size={18} color="#fff" /><Text style={s.ctaText}>Mark as replied</Text></>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={!hasContent || loading}
              activeOpacity={0.85}
              style={[s.cta, (!hasContent || loading) && { opacity: 0.45 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="sparkles" size={18} color="#fff" /><Text style={s.ctaText}>Generate reply</Text></>}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },

    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    title: { flex: 1, fontFamily: FontFamily.display, fontSize: 20, color: c.primary },

    emailCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, padding: 14, marginBottom: 22,
    },
    mailIcon: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: c.gold + '18', alignItems: 'center', justifyContent: 'center',
    },
    emailSubject: { fontFamily: FontFamily.display, fontSize: 15, color: c.primary },
    emailMeta: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 2 },
    openInMail: { fontFamily: FontFamily.sansMedium, fontSize: 12.5, color: c.gold },

    h2: { fontFamily: FontFamily.display, fontSize: 21, color: c.primary },
    h2sub: { fontFamily: FontFamily.sans, fontSize: 13.5, color: c.secondary, marginTop: 4, marginBottom: 14 },

    pasteBox: {
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border, padding: 12, minHeight: 120,
    },
    pasteInput: { fontFamily: FontFamily.sans, fontSize: 14.5, color: c.primary, minHeight: 96, maxHeight: 220, lineHeight: 20 },

    screenshotChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.gold + '12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    },
    screenshotChipText: { flex: 1, fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold },

    orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
    orLine: { flex: 1, height: 1, backgroundColor: c.border },
    orText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary },

    uploadBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingVertical: 14, backgroundColor: c.surface,
    },
    uploadBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.gold },

    privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, marginBottom: 26, paddingHorizontal: 10 },
    privacyText: { fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, lineHeight: 16, flexShrink: 1 },

    previewHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold },

    previewBox: {
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.subtleBorder, padding: 14,
    },
    previewPlaceholder: {
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
      paddingVertical: 34, gap: 12, borderWidth: 0,
    },
    bubbleIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.gold + '14', alignItems: 'center', justifyContent: 'center',
    },
    placeholderText: { fontFamily: FontFamily.sans, fontSize: 13.5, color: c.secondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 24 },

    replyInput: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, lineHeight: 22, minHeight: 180, maxHeight: 340 },
    editHint: { fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, marginTop: 8, marginBottom: 14, textAlign: 'center' },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    secondaryBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingVertical: 12,
    },
    secondaryBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 13.5, color: c.gold },

    cta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.gold, borderRadius: 14, paddingVertical: 16, marginTop: 6,
    },
    ctaText: { fontFamily: FontFamily.display, fontSize: 16, color: '#fff' },
  })
}
