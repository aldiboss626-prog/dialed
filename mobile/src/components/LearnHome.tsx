import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { generateChallenge } from '@/lib/contentApi'
import type { Challenge, ArticleTopic } from '@/lib/contentApi'
import { ArticleSheet } from '@/components/ArticleSheet'
import { SkeletonBlock } from '@/components/SkeletonBlock'
import { StreakBanner } from '@/components/learn/StreakBanner'

interface OrbitStats {
  overdue: number
  dueSoon: number
  totalContacts: number
  topContactName?: string
}

interface Attention {
  overdue: number
  dueSoon: number
  awaiting: number
  overdueNames: string[]
  awaitingNames: string[]
  topAwaitingContactId?: string | number
}

interface Props {
  orbitStats: OrbitStats
  attention?: Attention
  orbitScore?: number | null
}

function firstNames(names: string[], max = 2): string {
  const firsts = names.map(n => n.split(' ')[0])
  if (firsts.length <= max) return firsts.join(', ')
  return `${firsts.slice(0, max).join(', ')} +${firsts.length - max}`
}

function scoreColor(c: ColorPalette, s: number): string {
  if (s >= 80) return c.success
  if (s >= 60) return c.warning
  return c.overdue
}

function scoreLabel(s: number): string {
  if (s >= 90) return 'Excellent'
  if (s >= 75) return 'Strong'
  if (s >= 60) return 'Needs attention'
  return 'Critical'
}

const TOPICS: { id: ArticleTopic; icon: string; label: string }[] = [
  { id: 'networking-101',         icon: 'people-outline',       label: 'Networking 101' },
  { id: 'workplace-etiquette',    icon: 'briefcase-outline',    label: 'Workplace\nEtiquette' },
  { id: 'coffee-dates',           icon: 'cafe-outline',         label: 'Coffee Dates' },
  { id: 'career-exposure',        icon: 'trending-up-outline',  label: 'Career\nExposure' },
  { id: 'linkedin-tips',          icon: 'logo-linkedin',        label: 'LinkedIn Tips' },
  { id: 'dealing-with-authority', icon: 'school-outline',       label: 'Authority &\nMentors' },
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

function topicLabel(topic: ArticleTopic): string {
  return topic.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingTop: 4, paddingBottom: 32 },
    sectionLabel: {
      fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary,
      marginBottom: 10, paddingHorizontal: Spacing.lg,
    },
    card: {
      backgroundColor: c.surface, borderRadius: 20, padding: 20,
      marginHorizontal: Spacing.lg, marginBottom: 20,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    networkCard: {
      backgroundColor: c.surface, borderRadius: 20,
      marginHorizontal: Spacing.lg, marginBottom: 20, padding: 18,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    networkTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
    networkScore: { fontFamily: FontFamily.display, fontSize: 30, lineHeight: 34 },
    networkStatus: { fontFamily: FontFamily.sansMedium, fontSize: 13 },
    networkTrack: { height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' },
    networkFill: { height: 6, borderRadius: 3 },
    attentionCard: {
      backgroundColor: c.surface, borderRadius: 20,
      marginHorizontal: Spacing.lg, marginBottom: 20,
      paddingHorizontal: 16, paddingVertical: 4,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    attentionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    attentionIconChip: {
      width: 38, height: 38, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    attentionTitle: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary, lineHeight: 19 },
    attentionSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, marginTop: 1 },
    challengeTitle: {
      fontFamily: FontFamily.display, fontSize: 20, color: c.primary,
      lineHeight: 27, marginBottom: 8,
    },
    challengeDesc: {
      fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary,
      lineHeight: 21, marginBottom: 12,
    },
    challengeAction: {
      fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.primary,
      lineHeight: 19, marginBottom: 14,
    },
    difficultyChip: {
      alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: Radius.full, marginBottom: 14,
    },
    difficultyText: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
    completeBtn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 14, alignItems: 'center',
    },
    completeBtnDone: { backgroundColor: `${c.success}22` },
    completeBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.surface },
    completeBtnTextDone: { color: c.success },
    skeletonBox: { gap: 10, paddingVertical: 8 },
    topicsScroll: { paddingLeft: Spacing.lg, paddingRight: 8, marginBottom: 20 },
    topicCard: {
      width: 104, marginRight: 10,
      backgroundColor: c.surface, borderRadius: 16, padding: 14,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
      shadowOffset: { width: 0, height: 1 }, elevation: 2, minHeight: 90,
    },
    topicIconChip: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    topicLabel: {
      fontFamily: FontFamily.sansMedium, fontSize: 11, color: c.primary,
      textAlign: 'center', lineHeight: 15,
    },
    articleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    articleTopicChip: {
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: Radius.full, backgroundColor: c.elevated,
    },
    articleTopicText: { fontFamily: FontFamily.sansMedium, fontSize: 10, color: c.secondary },
    articleTitle: {
      fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary, flex: 1, lineHeight: 20,
    },
    articleMeta: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary },
    shuffleBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
    shuffleText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold },
  })
}

function NetworkHealthCard({ score }: { score: number }) {
  const c = useColors()
  const styles = makeStyles(c)
  const color = scoreColor(c, score)
  const pct = Math.max(0, Math.min(100, score))

  return (
    <>
      <Text style={styles.sectionLabel}>Network health</Text>
      <View style={styles.networkCard}>
        <View style={styles.networkTop}>
          <Text style={[styles.networkScore, { color }]}>{score}</Text>
          <Text style={[styles.networkStatus, { color }]}>{scoreLabel(score)}</Text>
        </View>
        <View style={styles.networkTrack}>
          <View style={[styles.networkFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    </>
  )
}

function AttentionCard({ attention }: { attention: Attention }) {
  const c = useColors()
  const styles = makeStyles(c)

  const rows: {
    key: string
    icon: string
    color: string
    title: string
    sub: string
    onPress: () => void
  }[] = []

  if (attention.awaiting > 0) {
    rows.push({
      key: 'awaiting',
      icon: 'mail-unread-outline',
      color: c.warning,
      title: `${attention.awaiting} email${attention.awaiting !== 1 ? 's' : ''} awaiting your reply`,
      sub: firstNames(attention.awaitingNames),
      onPress: () => {
        if (attention.topAwaitingContactId != null) router.push(`/contact/${attention.topAwaitingContactId}` as any)
        else router.push('/(tabs)/orbit?filter=all' as any)
      },
    })
  }

  if (attention.overdue > 0) {
    rows.push({
      key: 'overdue',
      icon: 'trending-down-outline',
      color: c.overdue,
      title: `${attention.overdue} relationship${attention.overdue !== 1 ? 's' : ''} going cold`,
      sub: firstNames(attention.overdueNames),
      onPress: () => router.push('/(tabs)/orbit?filter=overdue' as any),
    })
  }

  if (attention.dueSoon > 0) {
    rows.push({
      key: 'due-soon',
      icon: 'time-outline',
      color: c.gold,
      title: `${attention.dueSoon} due to reach out soon`,
      sub: 'Reconnect before they slip',
      onPress: () => router.push('/(tabs)/orbit?filter=due-soon' as any),
    })
  }

  if (rows.length === 0) return null

  return (
    <>
      <Text style={styles.sectionLabel}>Needs your attention</Text>
      <View style={styles.attentionCard}>
        {rows.map((r, i) => {
          const isLast = i === rows.length - 1
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.attentionRow, isLast && { borderBottomWidth: 0 }]}
              onPress={r.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.attentionIconChip, { backgroundColor: `${r.color}18` }]}>
                <Ionicons name={r.icon as any} size={19} color={r.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attentionTitle}>{r.title}</Text>
                {!!r.sub && <Text style={styles.attentionSub} numberOfLines={1}>{r.sub}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.tertiary} />
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}

export function LearnHome({ orbitStats, attention, orbitScore }: Props) {
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
        <StreakBanner />

        {orbitScore != null && <NetworkHealthCard score={orbitScore} />}

        {attention && <AttentionCard attention={attention} />}

        <Text style={styles.sectionLabel}>Today's challenge</Text>
        <View style={styles.card}>
          {challengeLoading ? (
            <View style={styles.skeletonBox}>
              <SkeletonBlock height={14} width="40%" />
              <SkeletonBlock height={22} width="90%" />
              <SkeletonBlock height={22} width="75%" />
              <SkeletonBlock height={16} width="60%" />
              <SkeletonBlock height={48} />
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
              <View style={[styles.topicIconChip, { backgroundColor: `${c.gold}12` }]}>
                <Ionicons name={t.icon as any} size={22} color={c.gold} />
              </View>
              <Text style={styles.topicLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Explore</Text>
        <View style={[styles.card, { padding: 0, paddingHorizontal: 16 }]}>
          {visibleStubs.map((stub, i) => {
            const isLast = i === visibleStubs.length - 1
            return (
              <TouchableOpacity
                key={`${stub.topic}-${stub.title}`}
                style={[styles.articleRow, isLast && { borderBottomWidth: 0 }]}
                onPress={() => setArticleSheet(stub)}
                activeOpacity={0.7}
              >
                <View>
                  <View style={styles.articleTopicChip}>
                    <Text style={styles.articleTopicText}>{topicLabel(stub.topic)}</Text>
                  </View>
                  <Text style={styles.articleMeta}>2 min read</Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>{stub.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={c.tertiary} />
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
