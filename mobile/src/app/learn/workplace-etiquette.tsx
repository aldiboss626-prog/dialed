import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
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

const TOPIC = 'workplace-etiquette'
const TOTAL_ITEMS = 5

const CORPORATE_PHRASES: { phrase: string; correct: string; wrong: [string, string] }[] = [
  { phrase: "Let's circle back on this.",      correct: "Let's talk about this later.",           wrong: ['I disagree with you.', "Let's end this meeting."] },
  { phrase: 'We need to move the needle.',       correct: 'We need to make real progress.',          wrong: ['We need to fix the printer.', 'We need more budget.'] },
  { phrase: "Let's take this offline.",         correct: "Let's discuss this privately.",          wrong: ["Let's go outside.", "Let's turn off the Wi-Fi."] },
  { phrase: 'Do you have the bandwidth?',        correct: 'Do you have time/capacity for this?',    wrong: ['Is your internet fast enough?', 'Can you attend the meeting?'] },
  { phrase: 'This is low-hanging fruit.',        correct: 'This is an easy win.',                   wrong: ['This task is boring.', 'The produce is on sale.'] },
  { phrase: "Let's get some synergy going.",   correct: 'Let\'s collaborate for better results.', wrong: ["Let's get coffee together.", "Let's combine the spreadsheets."] },
  { phrase: "Ping me when you're ready.",       correct: 'Send me a quick message when ready.',    wrong: ['Call me on the phone.', 'Email me a report.'] },
  { phrase: 'We need to boil the ocean here.',  correct: "We're trying to do too much at once.",  wrong: ['We need to hire a chef.', 'We need to expand to Europe.'] },
  { phrase: "Let's do a deep dive.",            correct: "Let's examine this in detail.",         wrong: ["Let's go scuba diving.", "Let's review the financials only."] },
  { phrase: 'Who are the key stakeholders?',    correct: 'Who is affected by or cares about this?', wrong: ['Who are the shareholders?', 'Who works in this department?'] },
  { phrase: "What's the value add here?",      correct: "What makes this worth doing?",           wrong: ["What's the price increase?", "What's our stock value?"] },
  { phrase: "Let's leverage our assets.",       correct: "Let's use what we already have.",       wrong: ["Let's sell the building.", "Let's hire more people."] },
]

const INDUSTRIES = ['Finance', 'Tech', 'Healthcare', 'Law', 'Creative', 'Education']

const ETIQUETTE_TIPS = [
  {
    title: 'The 15-minute rule',
    body: 'Arrive 10–15 minutes early for anything professional: interviews, first days, client meetings. Arriving on time is arriving late. Arriving early signals respect and composure.',
  },
  {
    title: 'Email subject lines matter more than the body',
    body: "Your subject line determines if an email gets opened. Be specific: \"Quick question about Tuesday's meeting\" beats \"Hi.\" Keep body text scannable — short paragraphs, bullet points when appropriate, clear ask in the first 2 sentences.",
  },
  {
    title: 'Meeting etiquette',
    body: "Camera on when invited to video calls (unless host says otherwise). Mute when not speaking. Don't interrupt — wait for pauses. Bring a pen or open a notes app. Don't be the person checking their phone.",
  },
  {
    title: 'The CC field is a statement',
    body: "CC'ing someone means you want them informed, not actioned. BCC is for protecting recipients' privacy. Replying-all when only one person needs to know is an office pet peeve — check before hitting send.",
  },
]

const CHALLENGES = [
  { id: 'etiq-1', title: 'Dress one level above expected', description: 'For your next professional interaction, intentionally dress slightly more formal than the environment requires.' },
  { id: 'etiq-2', title: 'Send a professional follow-up email', description: 'After your next class, meeting, or event — send a follow-up within 24 hours. Reference something specific.' },
  { id: 'etiq-3', title: 'Arrive 10 minutes early', description: 'For your next professional event or interview, aim to arrive 10 minutes before the scheduled time.' },
]

const RATING_COLORS: Record<string, string> = {
  Appropriate: '#16A34A',
  Adjust: '#D97706',
  Inappropriate: '#DC2626',
}

const GAME_RESULT_ICONS: Record<string, string> = {
  great: 'trophy-outline',
  ok: 'briefcase-outline',
  low: 'book-outline',
}

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
    industryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    industryChip: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: Radius.full, borderWidth: 1.5,
    },
    industryChipText: { fontFamily: FontFamily.sansMedium, fontSize: 13 },
    checkBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 13,
    },
    checkBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.surface },
    skeletonBox: { gap: 8, paddingTop: 12 },
    ratingBox: { marginTop: 14, padding: 16, borderRadius: Radius.lg, borderWidth: 1.5 },
    ratingPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginBottom: 8 },
    ratingPillText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#fff' },
    ratingFeedback: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21 },
    tipTitle: { fontFamily: FontFamily.display, fontSize: 17, color: c.primary, marginBottom: 4, flex: 1 },
    tipBody: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, lineHeight: 21 },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
    subLabel: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.secondary, marginBottom: 6 },
    gamePhrase: { fontFamily: FontFamily.display, fontSize: 21, color: c.primary, lineHeight: 29, marginBottom: 6, textAlign: 'center' },
    gameSubtext: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, textAlign: 'center', marginBottom: 20 },
    gameOption: {
      borderWidth: 1.5, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16,
      marginBottom: 10, alignItems: 'center',
    },
    gameOptionText: { fontFamily: FontFamily.sansMedium, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    gameScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    gameScoreText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.secondary },
    gameResultBox: { borderRadius: Radius.lg, padding: 14, marginBottom: 14, alignItems: 'center' },
    gameResultText: { fontFamily: FontFamily.display, fontSize: 20, color: c.primary, marginBottom: 4, marginTop: 6 },
    gameResultSub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, textAlign: 'center' },
    nextBtn: {
      backgroundColor: c.primary, borderRadius: Radius.full, paddingVertical: 12,
      alignItems: 'center', marginTop: 4,
    },
    nextBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.surface },
    playAgainBtn: {
      borderWidth: 1.5, borderColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 12, alignItems: 'center', marginTop: 8,
    },
    playAgainText: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold },
  })
}

interface OutfitResult { rating: string; feedback: string }

export default function WorkplaceEtiquettePage() {
  const c = useColors()
  const styles = makeStyles(c)
  const { isPro, openUpgrade } = usePro()
  const [selectedIndustry, setSelectedIndustry] = useState('Finance')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<OutfitResult | null>(null)
  const [expandedTip, setExpandedTip] = useState<number | null>(null)
  const [completedCount, setCompletedCount] = useState(0)

  const [gameQueue, setGameQueue] = useState<typeof CORPORATE_PHRASES>([])
  const [gameIdx, setGameIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [gameOptions, setGameOptions] = useState<string[]>([])

  const refreshProgress = useCallback(async () => {
    const p = await getProgress(TOPIC)
    setCompletedCount(p.completedChallenges.length + p.featuresUsed.length)
  }, [])

  useEffect(() => { refreshProgress(); startGame() }, [refreshProgress])

  function shuffled<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function startGame() {
    const q = shuffled(CORPORATE_PHRASES).slice(0, 6)
    setGameQueue(q)
    setGameIdx(0)
    setScore(0)
    setPicked(null)
    setGameOver(false)
    buildOptions(q, 0)
  }

  function buildOptions(queue: typeof CORPORATE_PHRASES, idx: number) {
    const item = queue[idx]
    if (!item) return
    const opts = shuffled([item.correct, ...item.wrong])
    setGameOptions(opts)
  }

  async function pickAnswer(option: string) {
    if (picked !== null) return
    setPicked(option)
    const current = gameQueue[gameIdx]
    const isCorrect = option === current.correct
    if (isCorrect) setScore(s => s + 1)
  }

  async function nextQuestion() {
    const nextIdx = gameIdx + 1
    if (nextIdx >= gameQueue.length) {
      setGameOver(true)
      await markFeatureUsed(TOPIC, 'game-played')
      refreshProgress()
    } else {
      setGameIdx(nextIdx)
      setPicked(null)
      buildOptions(gameQueue, nextIdx)
    }
  }

  async function checkOutfit() {
    if (!isPro) { openUpgrade(); return }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to use the outfit checker.')
      return
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.6,
      base64: true,
    })

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return

    const imageBase64 = pickerResult.assets[0].base64!
    const cacheKey = `dialed_outfit_${selectedIndustry}_${new Date().toISOString().slice(0, 10)}`

    setChecking(true)
    setResult(null)

    try {
      const res = await fetch(`${getApiUrl()}/api/content/outfit-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, industry: selectedIndustry }),
      })
      const data: OutfitResult = await res.json()
      setResult(data)
      await markFeatureUsed(TOPIC, 'outfit-check-used')
      refreshProgress()
      AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {})
    } catch {
      Alert.alert('Error', "Couldn't check your outfit. Make sure the server is running.")
    } finally {
      setChecking(false)
    }
  }

  const ratingColor = result ? (RATING_COLORS[result.rating] ?? c.gold) : c.gold
  const gameResultKey = score >= 5 ? 'great' : score >= 3 ? 'ok' : 'low'
  const gameResultIcon = GAME_RESULT_ICONS[gameResultKey] as any
  const gameResultColor = score >= 5 ? '#16A34A' : score >= 3 ? c.gold : '#DC2626'

  return (
    <View style={styles.screen}>
      <TopicPageHeader title="Workplace Etiquette" completedCount={completedCount} totalItems={TOTAL_ITEMS} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        <Text style={styles.sectionLabel}>Dress code advisor</Text>
        <View style={styles.card}>
          <Text style={styles.subLabel}>Select your industry</Text>
          <View style={styles.industryGrid}>
            {INDUSTRIES.map(ind => {
              const active = ind === selectedIndustry
              return (
                <TouchableOpacity
                  key={ind}
                  style={[styles.industryChip, {
                    borderColor: active ? c.gold : c.border,
                    backgroundColor: active ? `${c.gold}15` : 'transparent',
                  }]}
                  onPress={() => setSelectedIndustry(ind)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.industryChipText, { color: active ? c.gold : c.secondary }]}>{ind}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <TouchableOpacity style={styles.checkBtn} onPress={checkOutfit} activeOpacity={0.85}>
            <Ionicons name="camera-outline" size={18} color={c.surface} />
            <Text style={styles.checkBtnText}>Check my outfit</Text>
          </TouchableOpacity>
          {checking && (
            <View style={styles.skeletonBox}>
              <SkeletonBlock height={18} width="70%" />
              <SkeletonBlock height={18} width="90%" />
            </View>
          )}
          {result && !checking && (
            <View style={[styles.ratingBox, { borderColor: `${ratingColor}40`, backgroundColor: `${ratingColor}08` }]}>
              <View style={[styles.ratingPill, { backgroundColor: ratingColor }]}>
                <Text style={styles.ratingPillText}>{result.rating}</Text>
              </View>
              <Text style={styles.ratingFeedback}>{result.feedback}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Timing & email etiquette</Text>
        <View style={styles.card}>
          {ETIQUETTE_TIPS.map((tip, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={() => setExpandedTip(expandedTip === i ? null : i)}
                activeOpacity={0.75}
              >
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Ionicons name={expandedTip === i ? 'chevron-up' : 'chevron-down'} size={16} color={c.tertiary} />
              </TouchableOpacity>
              {expandedTip === i && <Text style={[styles.tipBody, { marginTop: 8 }]}>{tip.body}</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Corporate speak translator</Text>
        <View style={styles.card}>
          {gameOver ? (
            <>
              <View style={[styles.gameResultBox, { backgroundColor: `${gameResultColor}15` }]}>
                <Ionicons name={gameResultIcon} size={36} color={gameResultColor} />
                <Text style={styles.gameResultText}>{score} / {gameQueue.length} correct</Text>
                <Text style={styles.gameResultSub}>
                  {score >= 5 ? "You're fluent in corporate!" : score >= 3 ? 'Decent — keep practicing.' : 'Brush up that business vocab.'}
                </Text>
              </View>
              <TouchableOpacity style={styles.playAgainBtn} onPress={startGame} activeOpacity={0.8}>
                <Text style={styles.playAgainText}>Play again ↻</Text>
              </TouchableOpacity>
            </>
          ) : gameQueue.length > 0 ? (
            <>
              <View style={styles.gameScoreRow}>
                <Text style={styles.gameScoreText}>Question {gameIdx + 1} of {gameQueue.length}</Text>
                <Text style={styles.gameScoreText}>Score: {score}</Text>
              </View>
              <Text style={styles.gamePhrase}>"{gameQueue[gameIdx].phrase}"</Text>
              <Text style={styles.gameSubtext}>What does this actually mean?</Text>
              {gameOptions.map(opt => {
                const isCorrect = opt === gameQueue[gameIdx].correct
                const isPicked = opt === picked
                let borderColor = c.border
                let bgColor = 'transparent'
                let textColor = c.primary
                if (picked !== null) {
                  if (isCorrect) { borderColor = '#16A34A'; bgColor = '#16A34A18'; textColor = '#16A34A' }
                  else if (isPicked) { borderColor = '#DC2626'; bgColor = '#DC262618'; textColor = '#DC2626' }
                  else { borderColor = c.border; textColor = c.tertiary }
                }
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.gameOption, { borderColor, backgroundColor: bgColor }]}
                    onPress={() => pickAnswer(opt)}
                    activeOpacity={picked !== null ? 1 : 0.75}
                  >
                    <Text style={[styles.gameOptionText, { color: textColor }]}>{opt}</Text>
                  </TouchableOpacity>
                )
              })}
              {picked !== null && (
                <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion} activeOpacity={0.85}>
                  <Text style={styles.nextBtnText}>{gameIdx + 1 >= gameQueue.length ? 'See results' : 'Next phrase →'}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Challenges</Text>
        <ChallengeSection topic={TOPIC} challenges={CHALLENGES} onProgressChange={refreshProgress} />
      </ScrollView>
    </View>
  )
}
