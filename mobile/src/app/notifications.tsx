import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { notifDb } from '@/lib/db'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { Notification } from '@/types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const TYPE_META: Record<Notification['type'], { icon: string; color: (c: ColorPalette) => string }> = {
  urgent:         { icon: 'alert-circle',       color: c => c.overdue },
  deadline:       { icon: 'time-outline',        color: c => c.warning },
  cadence:        { icon: 'person-outline',      color: c => c.gold },
  positive:       { icon: 'checkmark-circle',    color: c => c.success },
  awaiting_reply: { icon: 'mail-unread-outline', color: c => c.secondary },
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: FontFamily.display, fontSize: 22, color: c.primary },
    markAllBtn: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    row: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 14,
      paddingHorizontal: Spacing.lg, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    rowUnread: { backgroundColor: c.surface },
    iconWrap: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    rowContent: { flex: 1 },
    rowTitle: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, lineHeight: 20 },
    rowBody: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 3, lineHeight: 18 },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
    rowTime: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary },
    contactPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.elevated, borderRadius: Radius.full,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    contactPillText: { fontFamily: FontFamily.sans, fontSize: 11, color: c.secondary },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.gold, flexShrink: 0, marginTop: 6 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
    emptyIcon: { marginBottom: 16, opacity: 0.3 },
    emptyTitle: { fontFamily: FontFamily.display, fontSize: 20, color: c.primary, marginBottom: 6 },
    emptySub: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  })
}

export default function NotificationsScreen() {
  const c = useColors()
  const styles = makeStyles(c)
  const router = useRouter()

  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await notifDb.list()
      setNotifs(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleMarkAll() {
    await notifDb.markAllRead().catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })))
  }

  async function handleTap(n: Notification) {
    if (!n.is_read) {
      await notifDb.markRead(n.id).catch(() => {})
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x))
    }
    if (n.contact_id) {
      router.push(`/contact/${n.contact_id}` as any)
    }
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={c.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Notifications{unreadCount > 0 ? ` · ${unreadCount}` : ''}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll} activeOpacity={0.7}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={c.gold} />
      ) : notifs.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={64} color={c.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySub}>
            Notifications will appear here when contacts go overdue, deadlines approach, or emails need a reply.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
        >
          {notifs.map(n => {
            const meta = TYPE_META[n.type] ?? TYPE_META.cadence
            const iconColor = meta.color(c)
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.row, !n.is_read && styles.rowUnread]}
                onPress={() => handleTap(n)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
                  <Ionicons name={meta.icon as any} size={20} color={iconColor} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  {!!n.body && <Text style={styles.rowBody} numberOfLines={2}>{n.body}</Text>}
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowTime}>{timeAgo(n.created_at)}</Text>
                    {n.contact && (
                      <View style={styles.contactPill}>
                        <Ionicons name="person-outline" size={10} color={c.tertiary} />
                        <Text style={styles.contactPillText}>{n.contact.name}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {!n.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
