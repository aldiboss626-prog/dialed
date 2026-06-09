import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { TopicPageHeader } from '@/components/learn/TopicPageHeader'
import { ChallengeSection } from '@/components/learn/ChallengeSection'
import { getProgress, markFeatureUsed } from '@/lib/learnProgress'

const ACCENT = '#F59E0B'
const TOPIC = 'coffee-dates'
const TOTAL_ITEMS = 4

const STEPS = [
  { num: '1', title: 'Do your research first', body: 'Know one specific thing about their work or background before you reach out. A specific reference makes your ask feel genuine, not generic.' },
  { num: '2', title: 'Make the ask clear and low-friction', body: 'Be direct: "I\'d love 20 minutes to hear about your path." Offer 2–3 specific time options. Never say "let me know when you\'re free" — it puts all the work on them.' },
  { num: '3', title: 'Confirm 24h before', body: 'Send a short message the day before to confirm. It signals you\'re serious and gives them an easy out if something came up — which they\'ll appreciate.' },
]

const DOS = [
  'Arrive 5 minutes early',
  'Come with 3 prepared questions',
  'Offer to pay — always',
  'Take notes (on phone is fine)',
]

const DONTS = [
  'Don\'t be vague about your goal',
  'Don\'t dominate the conversation',
  'Don\'t forget to follow up',
  'Don\'t ask for a job directly',
]

const AGENDA = {
  '30 min': ['2 min — introductions', '5 min — their background + path', '10 min — your 3 prepared questions', '8 min — their questions for you', '5 min — wrap up + next step'],
  '45 min': ['2 min — introductions', '8 min — their background + path', '15 min — your prepared questions', '10 min — deep dive on one topic', '8 min — their questions', '2 min — wrap up'],
  '60 min': ['5 min — settle in, introductions', '10 min — their background + path', '20 min — prepared questions', '12 min — open conversation', '10 min — their questions', '3 min — wrap up + follow-up plan'],
}

const CHALLENGES = [
  { id: 'coffee-1', title: 'Schedule a coffee chat this week', description: 'Identify one person you\'d like to learn from and send a meeting request today.' },
  { id: 'coffee-2', title: 'Prep 3 thoughtful questions', description: 'Before your next coffee chat, write down 3 questions you genuinely want answers to.' },
  { id: 'coffee-3', title: 'Follow up within 24 hours', description: 'After your next meeting, send a short thank-you note referencing something specific you discussed.' },
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
    input: {
      backgroundColor: c.elevated, borderRadius: Radius.md, padding: 14,
      fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, marginBottom: 10,
    },
    suggestBtn: {
      backgroundColor: ACCENT, borderRadius: Radius.full, paddingVertical: 13,
      alignItems: 'center',
    },
    suggestBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#fff' },
    loadingBox: { height: 60, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    venueCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      borderWidth: 1, borderColor: c.border, borderRadius: Radius.lg,
      padding: 14, marginTop: 10,
    },
    venueEmoji: { fontSize: 26 },
    venueType: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, marginBottom: 3 },
    venueDesc: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 18 },
    vibePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: `${ACCENT}18`, marginTop: 6 },
    vibeText: { fontFamily: FontFamily.sansMedium, fontSize: 10, color: ACCENT },
    stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: `${ACCENT}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
    stepNumText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: ACCENT },
    stepTitle: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, marginBottom: 4 },
    stepBody: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 19 },
    dodontsRow: { flexDirection: 'row', gap: 12 },
    doCol: { flex: 1 },
    colLabel: { fontFamily: FontFamily.sansMedium, fontSize: 12, marginBottom: 8 },
    doItem: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'flex-start' },
    doCheck: { fontFamily: FontFamily.sansMedium, fontSize: 13 },
    doText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 18, flex: 1 },
    tabRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center', backgroundColor: c.elevated },
    tabActive: { backgroundColor: ACCENT },
    tabText: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.secondary },
    tabTextActive: { color: '#fff' },
    agendaItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    agendaDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: ACCENT, marginTop: 7, flexShrink: 0 },
    agendaText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, lineHeight: 20, flex: 1 },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  })
}

interface VenueSuggestion { icon: string; type: string; description: string; vibe: string }

export default function CoffeeDatesPage() {
  const c = useColors()
  const styles = makeStyles(c)
  const [city, setCity] = useState('')
  const [venues, setVenues] = useState<VenueSuggestion[]>([])
  const [venueLoading, setVenueLoading] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [agendaTab, setAgendaTab] = useState<'30 min' | '45 min' | '60 min'>('45 min')
  const [completedCount, setCompletedCount] = useState(0)

  const refreshProgress = useCallback(async () => {
    const p = await getProgress(TOPIC)
    setCompletedCount(p.completedChallenges.length + p.featuresUsed.length)
  }, [])

  useEffect(() => { refreshProgress() }, [refreshProgress])

  async function suggestVenues() {
    if (!city.trim()) return
    const cacheKey = `dialed_venues_${city.trim().toLowerCase().replace(/\s+/g, '_')}`
    try {
      const raw = await AsyncStorage.getItem(cacheKey)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < 30 * 24 * 3600 * 1000) { setVenues(data); return }
      }
    } catch {}

    setVenueLoading(true)
    try {
      const SERVER = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${SERVER}/api/content/venue-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.trim() }),
      })
      const data = await res.json()
      setVenues(data.suggestions ?? [])
      await markFeatureUsed(TOPIC, 'venue-suggestions-used')
      refreshProgress()
      AsyncStorage.setItem(cacheKey, JSON.stringify({ data: data.suggestions, ts: Date.now() })).catch(() => {})
    } catch {
      setVenues([])
    } finally {
      setVenueLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <TopicPageHeader title="Coffee Dates" accentColor={ACCENT} completedCount={completedCount} totalItems={TOTAL_ITEMS} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        {/* Find a Spot */}
        <Text style={styles.sectionLabel}>Find a spot</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Enter city or neighborhood..."
            placeholderTextColor={c.tertiary}
            value={city}
            onChangeText={setCity}
            returnKeyType="search"
            onSubmitEditing={suggestVenues}
          />
          <TouchableOpacity style={styles.suggestBtn} onPress={suggestVenues} activeOpacity={0.85}>
            <Text style={styles.suggestBtnText}>Suggest spots</Text>
          </TouchableOpacity>
          {venueLoading && <View style={styles.loadingBox}><ActivityIndicator color={ACCENT} /></View>}
          {venues.map((v, i) => (
            <View key={i} style={styles.venueCard}>
              <Text style={styles.venueEmoji}>{v.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.venueType}>{v.type}</Text>
                <Text style={styles.venueDesc}>{v.description}</Text>
                <View style={styles.vibePill}><Text style={styles.vibeText}>{v.vibe}</Text></View>
              </View>
            </View>
          ))}
        </View>

        {/* How to Request */}
        <Text style={styles.sectionLabel}>How to request a meeting</Text>
        <View style={styles.card}>
          {STEPS.map((s, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{s.num}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepBody}>{s.body}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Do's & Don'ts */}
        <Text style={styles.sectionLabel}>Do's & don'ts</Text>
        <View style={styles.card}>
          <View style={styles.dodontsRow}>
            <View style={styles.doCol}>
              <Text style={[styles.colLabel, { color: '#16A34A' }]}>✓ Do</Text>
              {DOS.map((d, i) => (
                <View key={i} style={styles.doItem}>
                  <Text style={[styles.doCheck, { color: '#16A34A' }]}>✓</Text>
                  <Text style={styles.doText}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.doCol, { borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 12 }]}>
              <Text style={[styles.colLabel, { color: '#DC2626' }]}>✕ Don't</Text>
              {DONTS.map((d, i) => (
                <View key={i} style={styles.doItem}>
                  <Text style={[styles.doCheck, { color: '#DC2626' }]}>✕</Text>
                  <Text style={styles.doText}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* The Agenda */}
        <Text style={styles.sectionLabel}>The agenda</Text>
        <View style={styles.card}>
          <View style={styles.tabRow}>
            {(['30 min', '45 min', '60 min'] as const).map(tab => (
              <TouchableOpacity key={tab} style={[styles.tab, agendaTab === tab && styles.tabActive]} onPress={() => setAgendaTab(tab)} activeOpacity={0.7}>
                <Text style={[styles.tabText, agendaTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {AGENDA[agendaTab].map((item, i) => (
            <View key={i} style={styles.agendaItem}>
              <View style={styles.agendaDot} />
              <Text style={styles.agendaText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Challenges */}
        <Text style={styles.sectionLabel}>Challenges</Text>
        <ChallengeSection topic={TOPIC} challenges={CHALLENGES} accentColor={ACCENT} onProgressChange={refreshProgress} />
      </ScrollView>
    </View>
  )
}
