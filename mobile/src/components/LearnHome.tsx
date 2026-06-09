import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { generateChallenge } from '@/lib/contentApi'
import type { Challenge, ArticleTopic } from '@/lib/contentApi'
import { ArticleSheet } from '@/components/ArticleSheet'
import { StreakBanner } from '@/components/learn/StreakBanner'

interface OrbitStats {
  overdue: number
  dueSoon: number
  totalContacts: number
  topContactName?: string
}

interface Props {
  orbitStats: OrbitStats
}

const TOPICS: { id: ArticleTopic; emoji: string; label: string }[] = [
  { id: 'networking-101',        emoji: '🤝', label: 'Networking 101' },
  { id: 'workplace-etiquette',   emoji: '💼', label: 'Workplace\nEtiquette' },
  { id: 'coffee-dates',          emoji: '☕', label: 'Coffee Dates' },
  { id: 'career-exposure',       emoji: '🚀', label: 'Career\nExposure' },
  { id: 'linkedin-tips',         emoji: '🎯', label: 'LinkedIn Tips' },
  { id: 'dealing-with-authority',emoji: '👔', label: 'Authority &\nMentors' },
]

const ARTICLE_STUBS: { topic: ArticleTopic; title: string }[] = [
  { topic: 'linkedin-tips',          title: 'How to cold message a recruiter on LinkedIn' },
  { topic: 'networking-101',         title: "What to say at a networking event when you know no one" },
  { topic: 'coffee-dates',           title: 'The follow-up email formula that actually gets replies' },
  { topic: 'coffee-dates',           title: 'How to turn a coffee chat into a job lead' },
  { topic: 'workplace-etiquette',    title: 'Reading the room: office politics without playing them' },
  { topic: 'networking-101',         title: 'The 2-minute warm-up before any important call' },
  { topic: 'dealing-with-authority', title: 'How to network up — talking to people more senior than you' },
  { topic: 'linkedin-tips',          title: 'Making your LinkedIn profile work while you sleep' },
  { topic: 'career-exposure',        title: 'Getting an informational interview in 3 messages' },
  { topic: 'workplace-etiquette',    title: 'How to ask for a reference without being awkward' },
  { topic: 'career-exposure',        title: 'How to stand out at a career fair' },
  { topic: 'dealing-with-authority', title: 'Asking your professor for a letter of recommendation' },
]

const DIFFICULTY_COLORS = {
  Easy:   '#16A34A',
  Medium: '#D97706',
  Hard:   '#DC2626',
}

function todayKey() {
  return `dialed_challenge_${new Date().toISOString().slice(0, 10)}`
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingTop: 4, paddingBottom: 32 },
    sectionLabel: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginBottom: 10, paddingHorizontal: Spacing.lg },
    card: {
      backgroundColor: c.surface, borderRadius: 20, padding: 20,
      marginHorizontal: Spacing.lg, marginBottom: 20,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    challengeTitle: { fontFamily: FontFamily.display, fontSize: 22, color: c.primary, lineHeight: 28, marginBottom: 8 },
    challengeDesc: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21, marginBottom: 12 },
    challengeAction: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.primary, lineHeight: 19, marginBottom: 14 },
    difficultyChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, marginBottom: 16 },
    difficultyText: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
    completeBtn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 14, alignItems: 'center',
    },
    completeBtnDone: { backgroundColor: `${c.success}22` },
    completeBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.surface },
    completeBtnTextDone: { color: c.success },
    loadingBox: { height: 160, alignItems: 'center', justifyContent: 'center' },
    topicsScroll: { paddingLeft: Spacing.lg, paddingRight: 8, marginBottom: 20 },
    topicCard: {
      width: 110, marginRight: 10,
      backgroundColor: c.surface, borderRadius: 16, padding: 14,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 1 }, elevation: 2, minHeight: 90,
    },
    topicEmoji: { fontSize: 26, marginBottom: 6 },
    topicLabel: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: c.primary, textAlign: 'center', lineHeight: 15 },
    articleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    articleTopicChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    articleTopicText: { fontFamily: FontFamily.sansMedium, fontSize: 10 },
    articleTitle: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary, flex: 1, lineHeight: 20 },
    articleMeta: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary },
    chevron: { fontFamily: FontFamily.sans, fontSize: 16, color: c.tertiary },
    shuffleBtn: {
      alignItems: 'center', paddingVertical: 14, marginTop: 4,
    },
    shuffleText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold },
  })
}

const TOPIC_COLORS: Record<ArticleTopic, string> = {
  'networking-101': '#3B82F6',
  'workplace-etiquette': '#8B5CF6',
  'coffee-dates': '#F59E0B',
  'career-exposure': '#10B981',
  'dealing-with-authority': '#EF4444',
  'linkedin-tips': '#0EA5E9',
}

export function LearnHome({ orbitStats }: Props) {
  const c = useColors()
  const styles = makeStyles(c)

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [visibleStubs, setVisibleStubs] = useState(() => shuffleArray(ARTICLE_STUBS).slice(0, 4))
  const [articleSheet, setArticleSheet] = useState<{ topic: ArticleTopic; title: string } | null>(null)

  const loadChallenge = useCallback(async () => {
    const key = todayKey()
    try {
      const cached = await AsyncStorage.getItem(key)
      if (cached) {
        const { data, done } = JSON.parse(cached)
        setChallenge(data)
        setCompleted(!!done)
        setChallengeLoading(false)
        return
      }
    } catch {}

    try {
      const data = await generateChallenge(orbitStats)
      setChallenge(data)
      AsyncStorage.setItem(key, JSON.stringify({ data, done: false })).catch(() => {})
    } catch {
      setChallenge({
        challenge: 'Reach out to someone new today',
        description: 'Growing your network starts with one message. Find someone interesting on LinkedIn or in your school and say hello.',
        action: 'Send one genuine message to someone you admire professionally.',
        difficulty: 'Easy',
      })
    } finally {
      setChallengeLoading(false)
    }
  }, [])

  useEffect(() => { loadChallenge() }, [loadChallenge])

  async function markComplete() {
    setCompleted(true)
    const key = todayKey()
    try {
      const cached = await AsyncStorage.getItem(key)
      if (cached) {
        const parsed = JSON.parse(cached)
        await AsyncStorage.setItem(key, JSON.stringify({ ...parsed, done: true }))
      }
    } catch {}
  }

  function shuffleArticles() {
    setVisibleStubs(shuffleArray(ARTICLE_STUBS).slice(0, 4))
  }

  const diffColor = challenge ? DIFFICULTY_COLORS[challenge.difficulty] : c.success

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak */}
        <StreakBanner />

        {/* Daily Challenge */}
        <Text style={styles.sectionLabel}>Today's challenge</Text>
        <View style={styles.card}>
          {challengeLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={c.gold} />
            </View>
          ) : challenge ? (
            <>
              <View style={[styles.difficultyChip, { backgroundColor: `${diffColor}18` }]}>
                <Text style={[styles.difficultyText, { color: diffColor }]}>{challenge.difficulty}</Text>
              </View>
              <Text style={styles.challengeTitle}>{challenge.challenge}</Text>
              <Text style={styles.challengeDesc}>{challenge.description}</Text>
              <Text style={styles.challengeAction}>→ {challenge.action}</Text>
              <TouchableOpacity
                style={[styles.completeBtn, completed && styles.completeBtnDone]}
                onPress={markComplete}
                disabled={completed}
                activeOpacity={0.85}
              >
                <Text style={[styles.completeBtnText, completed && styles.completeBtnTextDone]}>
                  {completed ? 'Completed ✓' : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* Topics */}
        <Text style={styles.sectionLabel}>Explore topics</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicsScroll}
          style={{ marginBottom: 20 }}
        >
          {TOPICS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.topicCard}
              onPress={() => router.push(`/learn/${t.id}` as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.topicEmoji}>{t.emoji}</Text>
              <Text style={styles.topicLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Articles feed */}
        <Text style={styles.sectionLabel}>Explore</Text>
        <View style={[styles.card, { padding: 0, paddingHorizontal: 16 }]}>
          {visibleStubs.map((stub, i) => {
            const topicColor = TOPIC_COLORS[stub.topic]
            const isLast = i === visibleStubs.length - 1
            return (
              <TouchableOpacity
                key={`${stub.topic}-${stub.title}`}
                style={[styles.articleRow, isLast && { borderBottomWidth: 0 }]}
                onPress={() => setArticleSheet(stub)}
                activeOpacity={0.7}
              >
                <View>
                  <View style={[styles.articleTopicChip, { backgroundColor: `${topicColor}18` }]}>
                    <Text style={[styles.articleTopicText, { color: topicColor }]}>
                      {stub.topic.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                  </View>
                  <Text style={styles.articleMeta}>2 min read</Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>{stub.title}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity style={styles.shuffleBtn} onPress={shuffleArticles} activeOpacity={0.7}>
            <Text style={styles.shuffleText}>Shuffle articles ↻</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {articleSheet && (
        <ArticleSheet
          visible={!!articleSheet}
          topic={articleSheet.topic}
          title={articleSheet.title}
          onClose={() => setArticleSheet(null)}
        />
      )}
    </>
  )
}
