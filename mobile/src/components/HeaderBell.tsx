import { useState, useCallback } from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '@/hooks/use-theme'
import { notifDb } from '@/lib/db'

// Header notification bell — replaces the old floating bell so it no longer
// overlaps content. Drop into any screen's header row.
export function HeaderBell() {
  const c = useColors()
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  useFocusEffect(
    useCallback(() => {
      let active = true
      notifDb.list()
        .then(data => { if (active) setUnread(data.filter(n => !n.is_read).length) })
        .catch(() => {})
      return () => { active = false }
    }, [])
  )

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push('/notifications' as any)}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={22} color={c.secondary} />
      {unread > 0 && <View style={[styles.badge, { backgroundColor: c.overdue }]} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5 },
})
