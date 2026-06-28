import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { REMINDER_PRESETS, loadReminderHours, saveReminderHours } from '@/lib/inboxPrefs'

export default function InboxSettingsScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()
  const [hours, setHours] = useState<number | null>(null)

  useEffect(() => { loadReminderHours().then(setHours) }, [])

  function pick(h: number) {
    setHours(h)
    saveReminderHours(h)
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={26} color={c.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Inbox reminders</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.heroIcon}>
          <Ionicons name="time-outline" size={26} color={c.gold} />
        </View>
        <Text style={s.title}>How fast do you want to reply?</Text>
        <Text style={s.subtitle}>
          Pick how long an email can sit before Dialed flags it as needing your reply. The inbox colors and nudges follow your choice.
        </Text>

        <View style={s.card}>
          {REMINDER_PRESETS.map((p, i) => {
            const active = hours === p.hours
            return (
              <TouchableOpacity
                key={p.label}
                onPress={() => pick(p.hours)}
                activeOpacity={0.7}
                style={[s.row, i < REMINDER_PRESETS.length - 1 && s.divider]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLabel, active && { color: c.gold }]}>{p.label}</Text>
                  <Text style={s.rowSub}>{p.sub}</Text>
                </View>
                {active
                  ? <Ionicons name="checkmark-circle" size={22} color={c.gold} />
                  : <View style={s.radio} />}
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={s.note}>
          Sooner means the inbox turns amber and red faster, so you reach out before things cool off. You can change this anytime.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 12, paddingVertical: 8,
    },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontFamily: FontFamily.sansMedium, fontSize: 17, color: c.primary },

    heroIcon: {
      width: 52, height: 52, borderRadius: 16, backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    title: { fontFamily: FontFamily.display, fontSize: 26, color: c.primary, lineHeight: 31 },
    subtitle: { fontFamily: FontFamily.sans, fontSize: 14.5, color: c.secondary, lineHeight: 21, marginTop: 8, marginBottom: 20 },

    card: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, paddingHorizontal: 16,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
    divider: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowLabel: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.primary },
    rowSub: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary, marginTop: 2 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.border },

    note: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.tertiary, lineHeight: 18, marginTop: 16, paddingHorizontal: 4 },
  })
}
