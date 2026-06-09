import AsyncStorage from '@react-native-async-storage/async-storage'

interface TopicProgress {
  completedChallenges: string[]
  featuresUsed: string[]
}

const empty = (): TopicProgress => ({ completedChallenges: [], featuresUsed: [] })

function key(topic: string) {
  return `dialed_learn_progress_${topic}`
}

export async function getProgress(topic: string): Promise<TopicProgress> {
  try {
    const raw = await AsyncStorage.getItem(key(topic))
    return raw ? JSON.parse(raw) : empty()
  } catch {
    return empty()
  }
}

export async function markChallengeComplete(topic: string, id: string): Promise<void> {
  const p = await getProgress(topic)
  if (!p.completedChallenges.includes(id)) {
    p.completedChallenges.push(id)
    await AsyncStorage.setItem(key(topic), JSON.stringify(p))
  }
}

export async function markFeatureUsed(topic: string, feature: string): Promise<void> {
  const p = await getProgress(topic)
  if (!p.featuresUsed.includes(feature)) {
    p.featuresUsed.push(feature)
    await AsyncStorage.setItem(key(topic), JSON.stringify(p))
  }
}

export async function getCompletionPercent(topic: string, totalItems: number): Promise<number> {
  const p = await getProgress(topic)
  const done = p.completedChallenges.length + p.featuresUsed.length
  return totalItems > 0 ? Math.min(1, done / totalItems) : 0
}

// ── Streak tracking ──────────────────────────────────────────────────────────

interface StreakData {
  count: number
  lastDate: string   // YYYY-MM-DD
  history: string[]  // last 7 YYYY-MM-DD dates with activity
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function getStreak(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem('dialed_learn_streak')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { count: 0, lastDate: '', history: [] }
}

export async function recordActivityToday(): Promise<StreakData> {
  const td = today()
  const current = await getStreak()
  if (current.lastDate === td) return current  // already recorded today

  const newCount = current.lastDate === yesterday() ? current.count + 1 : 1
  const history = [...new Set([td, ...current.history])].slice(0, 7)
  const updated: StreakData = { count: newCount, lastDate: td, history }
  await AsyncStorage.setItem('dialed_learn_streak', JSON.stringify(updated))
  return updated
}
