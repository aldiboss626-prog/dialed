import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  View, TouchableOpacity, StyleSheet, Text, AppState,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '@/hooks/use-theme'
import { notifDb } from '@/lib/db'
import { AddContactModal } from '@/components/AddContactModal'
import type { Contact } from '@/types'

// ── Context ───────────────────────────────────────────────────────────────────

interface GlobalActionsCtx {
  openAddContact: () => void
}

const Ctx = createContext<GlobalActionsCtx>({ openAddContact: () => {} })

export function useGlobalActions() {
  return useContext(Ctx)
}

// ── Overlay component ─────────────────────────────────────────────────────────

// Screens that render their own floating header controls — hide our overlay on them
// so the two sets of icons don't stack on top of each other.
const HIDE_ON = ['/login']

const TAB_BAR_HEIGHT = 56

export function GlobalActionsOverlay() {
  const c = useColors()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const [addOpen, setAddOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const appState = useRef(AppState.currentState)

  const fetchUnread = useCallback(async () => {
    try {
      const data = await notifDb.list()
      setUnread(data.filter(n => !n.is_read).length)
    } catch {}
  }, [])

  useEffect(() => {
    fetchUnread()
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        fetchUnread()
      }
      appState.current = next
    })
    return () => sub.remove()
  }, [fetchUnread])

  // Re-check unread when navigating to/from notifications
  useEffect(() => {
    fetchUnread()
  }, [pathname, fetchUnread])

  if (HIDE_ON.some(p => pathname.startsWith(p))) return null

  const bottom = insets.bottom + TAB_BAR_HEIGHT + 14

  return (
    <Ctx.Provider value={{ openAddContact: () => setAddOpen(true) }}>
      <View style={[styles.cluster, { bottom }]} pointerEvents="box-none">
        {/* Bell */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={20} color={c.primary} />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Add contact */}
        <TouchableOpacity
          style={[styles.btn, styles.addBtn]}
          onPress={() => setAddOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <AddContactModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(_newContact: Contact) => setAddOpen(false)}
        onAdded={() => setAddOpen(false)}
      />
    </Ctx.Provider>
  )
}

const styles = StyleSheet.create({
  cluster: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 999,
  },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  addBtn: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
})
