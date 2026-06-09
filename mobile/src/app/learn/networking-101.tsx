import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Clipboard, Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ExpoClipboard from 'expo-clipboard'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { TopicPageHeader } from '@/components/learn/TopicPageHeader'
import { ChallengeSection } from '@/components/learn/ChallengeSection'
import { getProgress, markFeatureUsed, getCompletionPercent } from '@/lib/learnProgress'

const ACCENT = '#3B82F6'
const TOPIC = 'networking-101'
const TOTAL_ITEMS = 5

const TIPS = [
  {
    title: 'The 5-second intro formula',
    body: 'Lead with your name, then one specific thing about yourself that\'s relevant to the context. Skip the generic "I\'m a business major." Try: "I\'m Aldi — I\'m studying finance and obsessed with early-stage startups." Specific = memorable.',
  },
  {
    title: 'Always ask before you pitch',
    body: 'Networking isn\'t sales. Before you ask for anything — a referral, a job lead, a coffee chat — invest in the relationship. Ask about their work, their path, what challenges they\'re navigating. People help people who show genuine interest first.',
  },
  {
    title: 'Follow up within 48 hours',
    body: 'Most networking value is lost because there\'s no follow-up. Within 48 hours, send a short message referencing something specific from your conversation. It shows you were present, and it anchors you in their memory while the interaction is still fresh.',
  },
]

const TEMPLATES = [
  {
    label: 'After meeting at an event',
    text: 'Hi [Name], it was great meeting you at [Event] yesterday. I really enjoyed your perspective on [topic you discussed]. I\'d love to stay connected — feel free to reach out any time. Looking forward to crossing paths again.',
  },
  {
    label: 'Cold outreach to someone you admire',
    text: 'Hi [Name], I came across your work on [specific thing] and found it genuinely impressive. I\'m a [year] student at [school] studying [field], and your path really resonates with where I want to go. Would you be open to a quick 20-minute chat sometime?',
  },
]

const CHALLENGES = [
  { id: 'n101-1', title: 'Introduce yourself to a stranger today', description: 'At a class, event, or coffee shop — start a real conversation with someone you don\'t know.' },
  { id: 'n101-2', title: 'Follow up with someone you met this week', description: 'Send a message to someone you connected with recently. Reference something specific from your conversation.' },
  { id: 'n101-3', title: 'Add 3 new connections on LinkedIn', description: 'Find 3 people in your field or industry and send personalized connection requests.' },
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
    tipTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary, marginBottom: 6 },
    tipBody: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21 },
    chevron: { fontFamily: FontFamily.sans, fontSize: 18, color: c.tertiary, marginLeft: 'auto' },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
    templateLabel: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: ACCENT, marginBottom: 6 },
    templateText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 20, marginBottom: 10 },
    copyBtn: {
      alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: Radius.full, backgroundColor: `${ACCENT}15`,
    },
    copyBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: ACCENT },
    starterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginTop: 7, flexShrink: 0 },
    starterText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21, flex: 1 },
    shuffleBtn: { alignSelf: 'center', paddingVertical: 10, marginTop: 4 },
    shuffleText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: ACCENT },
    loadingBox: { height: 80, alignItems: 'center', justifyContent: 'center' },
  })
}

export default function Networking101Page() {
  const c = useColors()
  const styles = makeStyles(c)
  const [expandedTip, setExpandedTip] = useState<number | null>(null)
  const [starters, setStarters] = useState<string[]>([])
  const [startersLoading, setStartersLoading] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const refreshProgress = useCallback(async () => {
    const pct = await getCompletionPercent(TOPIC, TOTAL_ITEMS)
    const p = await import('@/lib/learnProgress').then(m => m.getProgress(TOPIC))
    setCompletedCount(p.completedChallenges.length + p.featuresUsed.length)
  }, [])

  useEffect(() => { refreshProgress() }, [refreshProgress])

  useEffect(() => { loadStarters() }, [])

  async function loadStarters(force = false) {
    const cacheKey = 'dialed_starters_n101'
    if (!force) {
      try {
        const raw = await AsyncStorage.getItem(cacheKey)
        if (raw) {
          const { data, ts } = JSON.parse(raw)
          if (Date.now() - ts < 7 * 24 * 3600 * 1000) { setStarters(data); return }
        }
      } catch {}
    }
    setStartersLoading(true)
    try {
      const SERVER = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${SERVER}/api/content/article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'networking-101', title: 'conversation starters for networking events' }),
      })
      const data = await res.json()
      const lines = (data.body as string).split('\n').filter(l => l.trim().length > 20).slice(0, 5)
      setStarters(lines.length >= 3 ? lines : FALLBACK_STARTERS)
      AsyncStorage.setItem(cacheKey, JSON.stringify({ data: lines, ts: Date.now() })).catch(() => {})
    } catch {
      setStarters(FALLBACK_STARTERS)
    } finally {
      setStartersLoading(false)
    }
  }

  async function copyTemplate(text: string) {
    await ExpoClipboard.setStringAsync(text)
    await markFeatureUsed(TOPIC, 'template-copied')
    refreshProgress()
    Alert.alert('Copied!', 'Template copied to clipboard.')
  }

  async function markStartersUsed() {
    await markFeatureUsed(TOPIC, 'starters-used')
    refreshProgress()
    loadStarters(true)
  }

  return (
    <View style={styles.screen}>
      <TopicPageHeader
        title="Networking 101"
        accentColor={ACCENT}
        completedCount={completedCount}
        totalItems={TOTAL_ITEMS}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        {/* Quick Tips */}
        <Text style={styles.sectionLabel}>Quick tips</Text>
        <View style={styles.card}>
          {TIPS.map((tip, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => setExpandedTip(expandedTip === i ? null : i)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tipTitle, { flex: 1 }]}>{tip.title}</Text>
                <Text style={styles.chevron}>{expandedTip === i ? '∧' : '∨'}</Text>
              </TouchableOpacity>
              {expandedTip === i && <Text style={[styles.tipBody, { marginTop: 8 }]}>{tip.body}</Text>}
            </View>
          ))}
        </View>

        {/* Conversation Starters */}
        <Text style={styles.sectionLabel}>Conversation starters</Text>
        <View style={styles.card}>
          {startersLoading ? (
            <View style={styles.loadingBox}><ActivityIndicator color={ACCENT} /></View>
          ) : (
            <>
              {starters.map((s, i) => (
                <View key={i} style={styles.starterRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.starterText}>{s}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.shuffleBtn} onPress={markStartersUsed} activeOpacity={0.7}>
                <Text style={styles.shuffleText}>Shuffle starters ↻</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Follow-up Templates */}
        <Text style={styles.sectionLabel}>Follow-up templates</Text>
        <View style={styles.card}>
          {TEMPLATES.map((t, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <Text style={styles.templateLabel}>{t.label.toUpperCase()}</Text>
              <Text style={styles.templateText}>{t.text}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyTemplate(t.text)} activeOpacity={0.7}>
                <Text style={styles.copyBtnText}>Copy template</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Challenges */}
        <Text style={styles.sectionLabel}>Challenges</Text>
        <ChallengeSection
          topic={TOPIC}
          challenges={CHALLENGES}
          accentColor={ACCENT}
          onProgressChange={refreshProgress}
        />
      </ScrollView>
    </View>
  )
}

const FALLBACK_STARTERS = [
  'What brought you to this event today?',
  'What are you working on right now that you\'re excited about?',
  'How did you get started in your field?',
  'What\'s one thing about your industry that most people get wrong?',
  'What\'s the best piece of career advice you\'ve ever received?',
]
