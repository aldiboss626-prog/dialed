import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/hooks/useAuth'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors, useThemeMode } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { useTabBarPadding } from '@/components/FloatingTabBar'
import { ImportSelectionModal } from '@/components/ImportSelectionModal'
import { contactsDb } from '@/lib/db'
import { gmailApi, loadPhoneContacts } from '@/lib/api'
import type { GmailStatus, ImportCandidate } from '@/types'

export const TITLE_PREF_KEY = 'dialed_title_pref'
export const TITLE_OPTIONS = ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Master', 'Coach']

const REL_CADENCES = [
  { type: 'Recruiter', days: 7 },
  { type: 'Professor', days: 10 },
  { type: 'Mentor', days: 14 },
  { type: 'Friend', days: 21 },
]

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingTop: 20 },
    title: { fontFamily: FontFamily.display, fontSize: 32, color: c.primary, marginBottom: 20 },
    sectionLabel: {
      fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary,
      letterSpacing: 2.5, marginBottom: 8, marginTop: 12,
    },
    accountCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: c.surface, borderRadius: Radius.card,
      padding: 18, marginBottom: 24,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    avatar: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarText: { fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary },
    userName: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    userEmail: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 2 },
    card: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      paddingHorizontal: 16, marginBottom: 24,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    gmailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
    gmailDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    syncBtn: {
      borderWidth: 1, borderColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 8, alignItems: 'center', marginBottom: 14,
    },
    syncBtnText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    cadenceRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
    },
    cadenceDays: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowLabel: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    rowSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, marginTop: 2 },
    signOutBtn: { paddingVertical: Spacing.lg, alignItems: 'center' },
    signOutText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.overdue, opacity: 0.7 },
    titleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 14 },
    titleChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: Radius.full,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    titleChipActive: { borderColor: c.gold, backgroundColor: c.gold + '18' },
    titleChipText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    titleChipTextActive: { color: c.gold },
    titleHint: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, paddingBottom: 14 },
    importBtn: {
      borderWidth: 1, borderColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 8, alignItems: 'center', marginBottom: 14, flexDirection: 'row',
      justifyContent: 'center', gap: 6,
    },
    importBtnText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.gold },
    importRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
    importHalfBtn: {
      flex: 1, borderWidth: 1, borderColor: c.gold, borderRadius: Radius.full,
      paddingVertical: 8, alignItems: 'center', justifyContent: 'center',
    },
  })
}

function SectionLabel({ label, styles }: { label: string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.sectionLabel}>{label}</Text>
}

function ToggleRow({ label, sub, enabled, onToggle, last, styles, c }: {
  label: string; sub?: string; enabled: boolean; onToggle: () => void; last?: boolean
  styles: ReturnType<typeof makeStyles>
  c: ColorPalette
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.rowDivider]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: c.border, true: c.gold }}
        thumbColor="#fff"
        ios_backgroundColor={c.border}
      />
    </View>
  )
}

export default function SettingsScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const c = useColors()
  const styles = makeStyles(c)
  const { mode, toggle: toggleTheme } = useThemeMode()
  const tabBarPadding = useTabBarPadding()
  const [gmail, setGmail] = useState<GmailStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [importSource, setImportSource] = useState<'google' | 'phone' | null>(null)
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [titlePref, setTitlePref] = useState('')
  const [notifs, setNotifs] = useState({
    push: true,
    escalation: true,
    emailReminder: true,
    opportunityReminder: true,
    digest: false,
    deadline: true,
  })

  useEffect(() => {
    setGmail({ connected: false, email: '', lastSynced: '' })
    AsyncStorage.getItem(TITLE_PREF_KEY).then(v => setTitlePref(v ?? '')).catch(() => {})
  }, [])

  function selectTitle(t: string) {
    setTitlePref(t)
    AsyncStorage.setItem(TITLE_PREF_KEY, t).catch(() => {})
  }

  async function handleSync() {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 1500)
  }

  async function getExistingEmails(): Promise<string[]> {
    try {
      const contacts = await contactsDb.list()
      return contacts.map(c => c.email).filter((e): e is string => !!e)
    } catch {
      return []
    }
  }

  async function handleImportGoogle() {
    setImportLoading(true)
    setImportCandidates([])
    setImportSource('google')
    try {
      const existing = await getExistingEmails()
      const candidates = await gmailApi.contacts(existing)
      setImportCandidates(candidates)
    } catch (err: any) {
      setImportSource(null)
      Alert.alert('Could not load Google Contacts', err.message ?? 'Make sure Gmail is connected.')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleImportPhone() {
    setImportLoading(true)
    setImportCandidates([])
    setImportSource('phone')
    try {
      const existing = await getExistingEmails()
      const candidates = await loadPhoneContacts(existing)
      setImportCandidates(candidates)
    } catch (err: any) {
      setImportSource(null)
      if (err.message === 'LIMITED_ACCESS') {
        Alert.alert(
          'Limited Contacts Access',
          "You only granted access to some contacts. To import your full network, go to iPhone Settings → Privacy & Security → Contacts → Dialed, then select “Allow Access to All Contacts”.",
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'OK', style: 'cancel' },
          ]
        )
      } else {
        Alert.alert('Could not load contacts', err.message ?? 'Allow contacts access in Settings.')
      }
    } finally {
      setImportLoading(false)
    }
  }

  async function handleConfirmImport(selected: ImportCandidate[]) {
    await contactsDb.bulkCreate(selected.map(c => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      role: c.role,
    })))
  }

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? '?'
  function toggle(key: keyof typeof notifs) {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <Text style={styles.title}>Settings</Text>

        <SectionLabel label="ACCOUNT" styles={styles} />
        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        <SectionLabel label="APPEARANCE" styles={styles} />
        <TouchableOpacity style={[styles.card, { paddingVertical: 14 }]} onPress={toggleTheme} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.rowLabel}>{mode === 'dark' ? 'Dark Mode' : 'Cal AI Style'}</Text>
            <Text style={styles.rowSub}>Tap to switch</Text>
          </View>
        </TouchableOpacity>

        <SectionLabel label="GREETING TITLE" styles={styles} />
        <View style={styles.card}>
          <View style={styles.titleChips}>
            {TITLE_OPTIONS.map(t => (
              <TouchableOpacity
                key={t || 'none'}
                onPress={() => selectTitle(t)}
                style={[styles.titleChip, titlePref === t && styles.titleChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.titleChipText, titlePref === t && styles.titleChipTextActive]}>
                  {t || 'None'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.titleHint}>
            {titlePref
              ? `Welcome screen will say "${titlePref} ${user?.name?.split(' ').slice(-1)[0] ?? ''}"`
              : `Welcome screen will use your first name`}
          </Text>
        </View>

        <SectionLabel label="GMAIL" styles={styles} />
        <View style={styles.card}>
          <View style={styles.gmailRow}>
            <View style={[styles.gmailDot, { backgroundColor: gmail?.connected ? c.success : c.tertiary }]} />
            <Text style={styles.rowLabel} numberOfLines={1}>
              {gmail ? (gmail.connected ? `Connected · ${gmail.email}` : 'Not connected') : 'Loading…'}
            </Text>
          </View>
          <View style={styles.importRow}>
            <TouchableOpacity
              onPress={handleSync}
              disabled={syncing}
              style={[styles.importHalfBtn, syncing && { opacity: 0.5 }]}
              activeOpacity={0.7}
            >
              {syncing
                ? <ActivityIndicator size="small" color={c.gold} />
                : <Text style={styles.importBtnText}>Sync Gmail</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImportGoogle}
              style={styles.importHalfBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.importBtnText}>Import Contacts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SectionLabel label="PHONE CONTACTS" styles={styles} />
        <View style={styles.card}>
          <TouchableOpacity
            onPress={handleImportPhone}
            style={[styles.importBtn, { marginTop: 14 }]}
            activeOpacity={0.7}
          >
            <Text style={styles.importBtnText}>Import from Phone</Text>
          </TouchableOpacity>
        </View>

        <SectionLabel label="DEFAULT CADENCES" styles={styles} />
        <View style={styles.card}>
          {REL_CADENCES.map((rc, i) => (
            <View key={rc.type} style={[styles.cadenceRow, i < REL_CADENCES.length - 1 && styles.rowDivider]}>
              <Text style={styles.rowLabel}>{rc.type}</Text>
              <Text style={styles.cadenceDays}>every {rc.days} days</Text>
            </View>
          ))}
        </View>

        <SectionLabel label="EMAIL REMINDERS" styles={styles} />
        <View style={styles.card}>
          <ToggleRow
            label="Unanswered email nudges"
            sub="Remind me when I haven't replied to someone"
            enabled={notifs.emailReminder}
            onToggle={() => toggle('emailReminder')}
            styles={styles} c={c}
          />
          <ToggleRow
            label="Escalating reminders"
            sub="Increase frequency the longer I leave it"
            enabled={notifs.escalation}
            onToggle={() => toggle('escalation')}
            last
            styles={styles} c={c}
          />
        </View>

        <SectionLabel label="OPPORTUNITY REMINDERS" styles={styles} />
        <View style={styles.card}>
          <ToggleRow
            label="Deadline alerts"
            sub="Notify me as deadlines approach"
            enabled={notifs.deadline}
            onToggle={() => toggle('deadline')}
            styles={styles} c={c}
          />
          <ToggleRow
            label="Escalating deadline reminders"
            sub="Multiple alerts as deadline gets closer"
            enabled={notifs.opportunityReminder}
            onToggle={() => toggle('opportunityReminder')}
            last
            styles={styles} c={c}
          />
        </View>

        <SectionLabel label="GENERAL" styles={styles} />
        <View style={styles.card}>
          <ToggleRow
            label="Push notifications"
            enabled={notifs.push}
            onToggle={() => toggle('push')}
            styles={styles} c={c}
          />
          <ToggleRow
            label="Daily digest"
            sub="Morning summary of your orbit"
            enabled={notifs.digest}
            onToggle={() => toggle('digest')}
            last
            styles={styles} c={c}
          />
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      <ImportSelectionModal
        visible={importSource !== null}
        candidates={importCandidates}
        loading={importLoading}
        onClose={() => setImportSource(null)}
        onImport={handleConfirmImport}
      />
    </SafeAreaView>
  )
}
