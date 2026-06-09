import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'dialed_cache:'
const TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > TTL_MS) return null
    return data as T
  } catch { return null }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export async function clearCache(key?: string): Promise<void> {
  try {
    if (key) {
      await AsyncStorage.removeItem(PREFIX + key)
    } else {
      const keys = await AsyncStorage.getAllKeys()
      await AsyncStorage.multiRemove(keys.filter(k => k.startsWith(PREFIX)))
    }
  } catch {}
}

// Stale-while-revalidate: returns cached data immediately, fetches fresh in background
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate?: (data: T) => void,
): Promise<T> {
  const cached = await getCached<T>(key)
  if (cached !== null) {
    // Return cache immediately, refresh in background
    fetcher().then(fresh => {
      setCache(key, fresh)
      onUpdate?.(fresh)
    }).catch(() => {})
    return cached
  }
  // No cache — fetch, store, return
  const fresh = await fetcher()
  await setCache(key, fresh)
  return fresh
}
