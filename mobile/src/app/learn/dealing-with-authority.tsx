import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { TopicPageHeader } from '@/components/learn/TopicPageHeader'
import { ChallengeSection } from '@/components/learn/ChallengeSection'
import { SkeletonBlock } from '@/components/SkeletonBlock'
import { getProgress, markFeatureUsed } from '@/lib/learnProgress'
import { usePro } from '@/hooks/usePro'
import { getApiUrl } from '@/lib/api'
import { contentHeaders } from '@/lib/contentApi'

const TOPIC = 'dealing-with-authority'
const TOTAL_ITEMS = 5

const BOOK_STATUSES = ['Want to Read', 'Reading', 'Completed'] as const
type BookStatus = (typeof BOOK_STATUSES)[number]

const SCRIPTS = [
  {
    title: 'Asking a professor for a recommendation',
    body: '"Hi Professor [Name], I\'m applying for [opportunity] and would love to ask if you\'d be willing to write a recommendation on my behalf. I\'ve really valued [specific thing you appreciated about their class or mentorship]. I\'m happy to share my resume and a summary of what I\'m applying for to make it as easy as possible for you."',
  },
  {
    title: 'Responding to critical feedback from a manager',
    body: "Don't get defensive. Pause. Then: \"Thank you for the feedback — I want to make sure I understand. Are you saying [X]?\" Confirming shows maturity. Follow with: \"What would have been a better approach?\" You just turned criticism into coaching.",
  },
  {
    title: 'Starting a conversation with a senior person at an event',
    body: '"Excuse me — I noticed you [specific thing]. I\'m [name], [brief context]. I don\'t want to take too much of your time, but I\'d love to hear your take on [topic you both care about]." The key: be specific, be brief, give them an easy exit.',
  },
]

const CHALLENGES = [
  { id: 'auth-1', title: 'Ask a senior person for their story', description: "Not advice — their story. \"How did you get here?\" is a much better first question than \"Can you give me advice?\"" },
  { id: 'auth-2', title: 'Start reading one book from the list', description: 'Pick the one that resonates most and read at least the first chapter this week.' },
  { id: 'auth-3', title: 'Prep 3 questions for your next senior interaction', description: 'Before any meeting with a professor, manager, or mentor — write down 3 thoughtful questions to ask.' },
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
    skeletonBox: { gap: 8, paddingVertical: 4 },
    tipRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
    tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.gold, marginTop: 8, flexShrink: 0 },
    tipText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21, flex: 1 },
    bookRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    bookIconWrap: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    bookTitle: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary, marginBottom: 2 },
    bookAuthor: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginBottom: 4 },
    bookWhy: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, lineHeight: 17, marginBottom: 8 },
    statusRow: { flexDirection: 'row', gap: 6 },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1.5 },
    statusChipText: { fontFamily: FontFamily.sansMedium, fontSize: 10 },
    booksProgress: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.secondary, textAlign: 'right', marginBottom: 12 },
    scriptTitle: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, marginBottom: 8 },
    scriptBody: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 22, fontStyle: 'italic' },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    showAllBtn: { alignSelf: 'flex-start', marginTop: 4 },
    showAllText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold },
  })
}

interface Book { emoji: string; title: string; author: string; why: string }

export default function DealingWithAuthorityPage() {
  const c = useColors()
  const styles = makeStyles(c)
  const { isPro, openUpgrade } = usePro()
  const [tips, setTips] = useState<string[]>([])
  const [tipsLoading, setTipsLoading] = useState(false)
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [bookStatuses, setBookStatuses] = useState<Record<string, BookStatus>>({})
  const [tipExpanded, setTipExpanded] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const refreshProgress = useCallback(async () => {
    const p = await getProgress(TOPIC)
    setCompletedCount(p.completedChallenges.length + p.featuresUsed.length)
  }, [])

  useEffect(() => { refreshProgress() }, [refreshProgress])

  useEffect(() => {
    loadBooks()
    loadBookStatuses()
    loadTips()
  }, [])

  async function loadTips() {
    if (!isPro) { openUpgrade(); return }
    const cacheKey = 'dialed_authority_tips'
    try {
      const raw = await AsyncStorage.getItem(cacheKey)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < 30 * 24 * 3600 * 1000) { setTips(data); return }
      }
    } catch {}

    setTipsLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/content/article`, {
        method: 'POST',
        headers: await contentHeaders(),
        body: JSON.stringify({ topic: 'dealing-with-authority', title: '6 tips for communicating with authority figures' }),
      })
      const data = await res.json()
      const lines = ((data.intro ?? '') + ' ' + (data.body ?? '')).split(/\n|\. /).filter((l: string) => l.trim().length > 30).slice(0, 6)
      setTips(lines)
      AsyncStorage.setItem(cacheKey, JSON.stringify({ data: lines, ts: Date.now() })).catch(() => {})
    } catch {
      setTips(FALLBACK_TIPS)
    } finally {
      setTipsLoading(false)
    }
  }

  async function loadBooks() {
    if (!isPro) { openUpgrade(); return }
    const cacheKey = 'dialed_authority_books'
    try {
      const raw = await AsyncStorage.getItem(cacheKey)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < 30 * 24 * 3600 * 1000) { setBooks(data ?? []); setBooksLoading(false); return }
      }
    } catch {}

    try {
      const res = await fetch(`${getApiUrl()}/api/content/books`, {
        method: 'POST',
        headers: await contentHeaders(),
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      const books = data.books ?? []
      setBooks(books)
      AsyncStorage.setItem(cacheKey, JSON.stringify({ data: books, ts: Date.now() })).catch(() => {})
    } catch {
      setBooks(FALLBACK_BOOKS)
    } finally {
      setBooksLoading(false)
    }
  }

  async function loadBookStatuses() {
    try {
      const raw = await AsyncStorage.getItem('dialed_book_tracker')
      if (raw) setBookStatuses(JSON.parse(raw))
    } catch {}
  }

  async function cycleStatus(bookTitle: string) {
    const current = bookStatuses[bookTitle] ?? 'Want to Read'
    const idx = BOOK_STATUSES.indexOf(current)
    const next = BOOK_STATUSES[(idx + 1) % BOOK_STATUSES.length]
    const updated = { ...bookStatuses, [bookTitle]: next }
    setBookStatuses(updated)
    await AsyncStorage.setItem('dialed_book_tracker', JSON.stringify(updated))
    await markFeatureUsed(TOPIC, 'book-status-changed')
    refreshProgress()
  }

  async function markTipExpanded() {
    setTipExpanded(true)
    await markFeatureUsed(TOPIC, 'tip-expanded')
    refreshProgress()
  }

  const completedBooks = Object.values(bookStatuses).filter(s => s === 'Completed').length
  const STATUS_COLORS: Record<BookStatus, string> = {
    'Want to Read': c.border,
    'Reading': '#D97706',
    'Completed': '#16A34A',
  }

  return (
    <View style={styles.screen}>
      <TopicPageHeader title="Authority & Mentors" completedCount={completedCount} totalItems={TOTAL_ITEMS} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        <Text style={styles.sectionLabel}>Communication tips</Text>
        <View style={styles.card}>
          {tipsLoading ? (
            <View style={styles.skeletonBox}>
              <SkeletonBlock height={18} width="90%" />
              <SkeletonBlock height={18} width="75%" />
              <SkeletonBlock height={18} width="85%" />
            </View>
          ) : (
            <>
              {(tipExpanded ? tips : tips.slice(0, 3)).map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
              {!tipExpanded && tips.length > 3 && (
                <TouchableOpacity onPress={markTipExpanded} activeOpacity={0.7} style={styles.showAllBtn}>
                  <Text style={styles.showAllText}>Show all tips ∨</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>Recommended books</Text>
        <View style={styles.card}>
          {booksLoading ? (
            <View style={styles.skeletonBox}>
              <SkeletonBlock height={72} />
              <SkeletonBlock height={72} />
              <SkeletonBlock height={72} />
            </View>
          ) : (
            <>
              {books.length > 0 && (
                <Text style={styles.booksProgress}>{completedBooks} of {books.length} read</Text>
              )}
              {books.map((book, i) => {
                const status = bookStatuses[book.title] ?? 'Want to Read'
                const statusColor = STATUS_COLORS[status]
                const isLast = i === books.length - 1
                return (
                  <View key={i} style={[styles.bookRow, isLast && { borderBottomWidth: 0 }]}>
                    <View style={styles.bookIconWrap}>
                      <Ionicons name="book-outline" size={20} color={c.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      <Text style={styles.bookAuthor}>{book.author}</Text>
                      <Text style={styles.bookWhy}>{book.why}</Text>
                      <View style={styles.statusRow}>
                        {BOOK_STATUSES.map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.statusChip, {
                              borderColor: s === status ? statusColor : c.border,
                              backgroundColor: s === status ? `${statusColor}15` : 'transparent',
                            }]}
                            onPress={() => cycleStatus(book.title)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.statusChipText, { color: s === status ? statusColor : c.tertiary }]}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )
              })}
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>Cross-generational scripts</Text>
        <View style={styles.card}>
          {SCRIPTS.map((s, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <Text style={styles.scriptTitle}>{s.title}</Text>
              <Text style={styles.scriptBody}>{s.body}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Challenges</Text>
        <ChallengeSection topic={TOPIC} challenges={CHALLENGES} onProgressChange={refreshProgress} />
      </ScrollView>
    </View>
  )
}

const FALLBACK_TIPS = [
  'Lead with curiosity, not requests. Ask people about their path before asking for anything.',
  "Use \"I\" statements when receiving feedback: \"I want to make sure I understand what you mean by...\"",
  "Disagree respectfully by first acknowledging: \"That's a fair point. I'd also consider...\"",
  "End every interaction with a clear next step so there's no ambiguity.",
  "Ask for a meeting, not a favor. \"Could we schedule 15 minutes?\" feels easier to say yes to.",
  'Follow up after every important conversation with a short summary of what was discussed.',
]

const FALLBACK_BOOKS = [
  { emoji: '📘', title: 'How to Win Friends and Influence People', author: 'Dale Carnegie', why: 'The foundational playbook for human connection and communication.' },
  { emoji: '📗', title: 'Never Split the Difference', author: 'Chris Voss', why: 'Negotiation tactics from an FBI hostage negotiator — surprisingly applicable to professional conversations.' },
  { emoji: '📙', title: 'The Relationship Edge', author: 'Jerry Acuff', why: 'How to build genuine relationships with people at every level of an organization.' },
  { emoji: '📕', title: 'Talk Like TED', author: 'Carmine Gallo', why: 'How the most persuasive communicators structure their ideas and delivery.' },
  { emoji: '📔', title: 'The Art of Asking', author: 'Amanda Palmer', why: 'A meditation on vulnerability and connection — surprisingly powerful for professional contexts.' },
]
