import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Clipboard from 'expo-clipboard'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { TopicPageHeader } from '@/components/learn/TopicPageHeader'
import { ChallengeSection } from '@/components/learn/ChallengeSection'
import { getProgress, markFeatureUsed } from '@/lib/learnProgress'

const ACCENT = '#0EA5E9'
const TOPIC = 'linkedin-tips'
const TOTAL_ITEMS = 5

const TEMPLATES = [
  {
    scenario: 'Met at a shared event',
    text: 'Hi [Name], it was great meeting you at [Event]! I really enjoyed our conversation about [topic]. I\'d love to stay connected on here — looking forward to following your work.',
  },
  {
    scenario: 'Cold outreach to alumni',
    text: 'Hi [Name], I came across your profile and noticed you studied [major] at [school] — I\'m a current student in the same program. I\'d love to hear about your path and what you\'d do differently. Would you be open to connecting?',
  },
  {
    scenario: 'After an informational interview',
    text: 'Hi [Name], thank you again for taking the time to speak with me last week. Our conversation about [specific topic] was really helpful and gave me a lot to think about. I\'d love to stay in touch.',
  },
]

const CHALLENGES = [
  { id: 'li-1', title: 'Update your LinkedIn headline', description: 'Use the audit feedback to rewrite your headline. Make it specific and forward-looking, not just your current title.' },
  { id: 'li-2', title: 'Send one personalized connection request', description: 'Find someone in your target field and send a note — reference something specific about their work.' },
  { id: 'li-3', title: 'Comment thoughtfully on 3 posts', description: 'Don\'t just like. Leave a substantive comment on 3 posts in your industry this week.' },
]

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    card: {
      backgroundColor: c.surface, borderRadius: Radius.xl, padding: 20,
      marginHorizontal: Spacing.lg, marginBottom: 16,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    sectionLabel: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginHorizontal: Spacing.lg, marginBottom: 10 },
    inputLabel: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.secondary, marginBottom: 6 },
    input: {
      backgroundColor: c.elevated, borderRadius: Radius.md, padding: 14,
      fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, marginBottom: 12,
    },
    multiInput: { minHeight: 90, textAlignVertical: 'top' },
    auditBtn: {
      backgroundColor: ACCENT, borderRadius: Radius.full,
      paddingVertical: 13, alignItems: 'center',
    },
    auditBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#fff' },
    loadingBox: { height: 60, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    resultBox: { marginTop: 14, padding: 14, borderRadius: Radius.lg, backgroundColor: c.elevated },
    resultLabel: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: ACCENT, marginBottom: 6, letterSpacing: 0.5 },
    resultText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21, marginBottom: 10 },
    copyBtn: {
      alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: Radius.full, backgroundColor: `${ACCENT}15`,
    },
    copyBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: ACCENT },
    templateScenario: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: ACCENT, marginBottom: 6 },
    templateText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 20, marginBottom: 10 },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
    ideaChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
      backgroundColor: `${ACCENT}12`, marginRight: 8, marginBottom: 8,
    },
    ideaText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: ACCENT },
    ideasRow: { flexDirection: 'row', flexWrap: 'wrap' },
  })
}

interface AuditResult { feedback: string; revisedHeadline: string; revisedSummary: string }

export default function LinkedInTipsPage() {
  const c = useColors()
  const styles = makeStyles(c)
  const [headline, setHeadline] = useState('')
  const [summary, setSummary] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [ideas, setIdeas] = useState<string[]>([])
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const refreshProgress = useCallback(async () => {
    const p = await getProgress(TOPIC)
    setCompletedCount(p.completedChallenges.length + p.featuresUsed.length)
  }, [])

  useEffect(() => { refreshProgress(); loadIdeas() }, [refreshProgress])

  async function loadIdeas() {
    const cacheKey = 'dialed_li_ideas'
    try {
      const raw = await AsyncStorage.getItem(cacheKey)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < 7 * 24 * 3600 * 1000) { setIdeas(data); return }
      }
    } catch {}

    setIdeasLoading(true)
    try {
      const SERVER = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${SERVER}/api/content/article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'linkedin-tips', title: '5 content ideas for students on LinkedIn' }),
      })
      const data = await res.json()
      const lines = ((data.intro ?? '') + '\n' + (data.body ?? '')).split(/\n|\.(?= )/).filter(l => l.trim().length > 15).slice(0, 5)
      setIdeas(lines.length >= 3 ? lines : FALLBACK_IDEAS)
      AsyncStorage.setItem(cacheKey, JSON.stringify({ data: lines, ts: Date.now() })).catch(() => {})
    } catch {
      setIdeas(FALLBACK_IDEAS)
    } finally {
      setIdeasLoading(false)
    }
  }

  async function runAudit() {
    if (!headline.trim() && !summary.trim()) {
      Alert.alert('Add some content', 'Enter your headline or summary to audit.')
      return
    }
    const cacheKey = `dialed_li_audit_${(headline + summary).replace(/\s+/g, '').slice(0, 40)}`
    try {
      const raw = await AsyncStorage.getItem(cacheKey)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < 7 * 24 * 3600 * 1000) { setAuditResult(data); return }
      }
    } catch {}

    setAuditing(true)
    try {
      const SERVER = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${SERVER}/api/content/linkedin-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: headline.trim(), summary: summary.trim() }),
      })
      const data: AuditResult = await res.json()
      setAuditResult(data)
      await markFeatureUsed(TOPIC, 'audit-done')
      refreshProgress()
      AsyncStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })).catch(() => {})
    } catch {
      Alert.alert('Error', 'Couldn\'t complete the audit. Make sure the server is running.')
    } finally {
      setAuditing(false)
    }
  }

  async function copyText(text: string, label: string) {
    await Clipboard.setStringAsync(text)
    await markFeatureUsed(TOPIC, 'template-copied')
    refreshProgress()
    Alert.alert('Copied!', `${label} copied to clipboard.`)
  }

  return (
    <View style={styles.screen}>
      <TopicPageHeader title="LinkedIn Tips" accentColor={ACCENT} completedCount={completedCount} totalItems={TOTAL_ITEMS} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        {/* Profile Audit */}
        <Text style={styles.sectionLabel}>Profile audit</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Current headline</Text>
          <TextInput
            style={styles.input}
            placeholder='e.g. "Finance Student at University of Miami"'
            placeholderTextColor={c.tertiary}
            value={headline}
            onChangeText={setHeadline}
          />
          <Text style={styles.inputLabel}>About / Summary (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiInput]}
            placeholder="Paste your LinkedIn summary here..."
            placeholderTextColor={c.tertiary}
            value={summary}
            onChangeText={setSummary}
            multiline
          />
          <TouchableOpacity style={styles.auditBtn} onPress={runAudit} activeOpacity={0.85}>
            <Text style={styles.auditBtnText}>Audit my profile</Text>
          </TouchableOpacity>
          {auditing && <View style={styles.loadingBox}><ActivityIndicator color={ACCENT} /></View>}
          {auditResult && !auditing && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>FEEDBACK</Text>
              <Text style={styles.resultText}>{auditResult.feedback}</Text>
              <Text style={styles.resultLabel}>REVISED HEADLINE</Text>
              <Text style={styles.resultText}>{auditResult.revisedHeadline}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(auditResult.revisedHeadline, 'Headline')} activeOpacity={0.7}>
                <Text style={styles.copyBtnText}>Copy headline</Text>
              </TouchableOpacity>
              {auditResult.revisedSummary && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.resultLabel}>REVISED SUMMARY</Text>
                  <Text style={styles.resultText}>{auditResult.revisedSummary}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(auditResult.revisedSummary, 'Summary')} activeOpacity={0.7}>
                    <Text style={styles.copyBtnText}>Copy summary</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Connection Templates */}
        <Text style={styles.sectionLabel}>Connection request templates</Text>
        <View style={styles.card}>
          {TEMPLATES.map((t, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <Text style={styles.templateScenario}>{t.scenario.toUpperCase()}</Text>
              <Text style={styles.templateText}>{t.text}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(t.text, 'Template')} activeOpacity={0.7}>
                <Text style={styles.copyBtnText}>Copy template</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* What to Post */}
        <Text style={styles.sectionLabel}>What to post</Text>
        <View style={styles.card}>
          {ideasLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={ACCENT} /></View>
          ) : (
            <View style={styles.ideasRow}>
              {ideas.map((idea, i) => (
                <View key={i} style={styles.ideaChip}>
                  <Text style={styles.ideaText}>{idea}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Challenges */}
        <Text style={styles.sectionLabel}>Challenges</Text>
        <ChallengeSection topic={TOPIC} challenges={CHALLENGES} accentColor={ACCENT} onProgressChange={refreshProgress} />
      </ScrollView>
    </View>
  )
}

const FALLBACK_IDEAS = [
  'A lesson from a class or internship',
  'A book you just finished and the key takeaway',
  'Something that surprised you about your industry',
  'A goal you set and how you\'re approaching it',
  'A person who shaped your professional thinking',
]
