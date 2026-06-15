import { createContext, useContext, useState } from 'react'
import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native'
import { usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '@/hooks/use-theme'
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

// Screens that render their own controls / bottom bars — hide the floating FAB
// on them so it doesn't cover their content.
const HIDE_ON = ['/login', '/landing', '/onboarding', '/upgrade', '/contact', '/home', '/(tabs)/home']

const TAB_BAR_HEIGHT = 56

export function GlobalActionsOverlay() {
  const c = useColors()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const [addOpen, setAddOpen] = useState(false)

  if (HIDE_ON.some(p => pathname.startsWith(p))) return null

  const bottom = insets.bottom + TAB_BAR_HEIGHT + 14

  return (
    <Ctx.Provider value={{ openAddContact: () => setAddOpen(true) }}>
      <View style={[styles.cluster, { bottom }]} pointerEvents="box-none">
        {/* Single FAB — add contact */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.gold }]}
          onPress={() => setAddOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
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
    zIndex: 999,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
})
