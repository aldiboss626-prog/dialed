import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet,
  ActivityIndicator, Alert, Linking, PanResponder, Share,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/hooks/useAuth'
import { usePro } from '@/hooks/usePro'
import { useDevPro } from '@/hooks/useDevPro'
import { FontFamily, Radius, CategoryColors } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import { useColors, useThemeMode } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { useTabBarPadding } from '@/components/FloatingTabBar'
import { ImportSelectionModal } from '@/components/ImportSelectionModal'
import { contactsDb } from '@/lib/db'
import { deleteAccount } from '@/lib/contentApi'
import { haptic } from '@/lib/haptics'
import { gmailApi, loadPhoneContacts } from '@/lib/api'
import type { GmailStatus, ImportCandidate } from '@/types'

export const TITLE_PREF_KEY = 'dialed_title_pref'
export const TITLE_OPTIONS = ['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Master', 'Coach']
const NOTIFS_KEY = 'dialed_notif_prefs'

type IconName = keyof typeof Ionicons.glyphMap
// A tiny indicator stacked on a tile: a colored notification dot, or a mini glyph (e.g. a warning triangle).
type TileBadge = { dot: string } | { icon: IconName; color: string }

const REL_CADENCES: { type: string; days: number; icon: IconName; color: string; badge?: TileBadge }[] = [
  { type: 'Recruiter', days: 7,  icon: 'briefcase-outline', color: CategoryColors.Recruiter },
  { type: 'Professor', days: 10, icon: 'school-outline',    color: CategoryColors.Professor },
  { type: 'Mentor',    days: 14, icon: 'person-outline',    color: CategoryColors.Mentor, badge: { icon: 'star', color: CategoryColors.Mentor } },
  { type: 'Friend',    days: 21, icon: 'people-outline',    color: CategoryColors.Friend },
]

// UI-only: a stable, friendly-looking referral code derived from the account.
// Real issuance/verification is backend (later). Skips ambiguous chars (0/O/1/I).
function referralCodeFor(seed: string): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  let out = ''
  for (let i = 0; i < 5; i++) {
    out += ALPHABET[h % 32]
    h = (Math.imul(h, 16777619) ^ (i + 1)) >>> 0
  }
  return `DIALED-${out}`
}

// ── Reusable row primitives ───────────────────────────────────────────────────

// Premium iOS-style icon tile: a clean white rounded square with a hairline border.
// Only the glyph carries color — no tinted fills, gradients, or shadows.
function IconTile({ name, color, c, badge }: { name: IconName; color: string; c: ColorPalette; badge?: TileBadge }) {
  return (
    <View style={{
      width: 30, height: 30, borderRadius: 9,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons name={name} size={17} color={color} />
      {badge && ('dot' in badge ? (
        <View style={{
          position: 'absolute', top: 2.5, right: 2.5, width: 8, height: 8, borderRadius: 4,
          backgroundColor: badge.dot, borderWidth: 1.5, borderColor: c.surface,
        }} />
      ) : (
        <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: c.surface, borderRadius: 8 }}>
          <Ionicons name={badge.icon} size={13} color={badge.color} />
        </View>
      ))}
    </View>
  )
}

function LinkRow({ icon, iconColor, badge, label, value, valueColor, statusDot, last, onPress, styles, c }: {
  icon: IconName; iconColor?: string; badge?: TileBadge; label: string; value?: string; valueColor?: string
  statusDot?: string; last?: boolean; onPress?: () => void
  styles: ReturnType<typeof makeStyles>; c: ColorPalette
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <IconTile name={icon} color={iconColor ?? c.secondary} c={c} badge={badge} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {!!statusDot && <View style={[styles.dot, { backgroundColor: statusDot }]} />}
        {!!value && <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>}
        {!!onPress && <Ionicons name="chevron-forward" size={18} color={c.tertiary} />}
      </View>
    </TouchableOpacity>
  )
}

function ToggleRow({ icon, iconColor, badge, label, sub, enabled, onToggle, last, styles, c }: {
  icon: IconName; iconColor?: string; badge?: TileBadge; label: string; sub?: string
  enabled: boolean; onToggle: () => void; last?: boolean
  styles: ReturnType<typeof makeStyles>; c: ColorPalette
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <IconTile name={icon} color={iconColor ?? c.secondary} c={c} badge={badge} />
      <View style={{ flex: 1 }}>
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

function SectionLabel({ label, styles }: { label: string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.sectionLabel}>{label}</Text>
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const c = useColors()
  const styles = makeStyles(c)
  const { isPro, openUpgrade } = usePro()
  const { devProOverride, setDevProOverride } = useDevPro()
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
    AsyncStorage.getItem(NOTIFS_KEY).then(v => {
      if (v) {
        try { setNotifs(JSON.parse(v)) } catch {}
      }
    }).catch(() => {})
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

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently erases your account and everything in it — contacts, opportunities, emails, and saved replies. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount()
              await logout()
              router.replace('/login')
            } catch (e: any) {
              Alert.alert('Could not delete account', e?.message ?? 'Please try again.')
            }
          },
        },
      ],
    )
  }

  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? '?'
  function toggle(key: keyof typeof notifs) {
    setNotifs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }

  const referralCode = referralCodeFor(user?.email || user?.name || 'dialed')

  async function handleCopyCode() {
    await Clipboard.setStringAsync(referralCode)
    haptic.success()
    Alert.alert('Copied', `Your referral code ${referralCode} is on the clipboard.`)
  }

  function handleShareCode() {
    Share.share({
      message: `Join me on Dialed and keep your network warm. Use my code ${referralCode} when you upgrade to Pro.`,
    }).catch(() => {})
  }

  // Swipe right to dismiss — ScrollView only captures vertical touches so
  // a clearly horizontal pan (dx > abs(dy)*2) passes through safely.
  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80 || gs.vx > 0.4) router.back()
      },
    })
  ).current

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ flex: 1 }} {...swipePan.panHandlers}>
        {/* Centered header with back arrow */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.6}>
            <Ionicons name="chevron-back" size={26} color={c.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding + 64 }]}>

          {/* ACCOUNT */}
          <SectionLabel label="ACCOUNT" styles={styles} />
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} activeOpacity={0.6}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.tertiary} />
            </TouchableOpacity>
          </View>

          {/* APPEARANCE */}
          <SectionLabel label="APPEARANCE" styles={styles} />
          <View style={styles.card}>
            <ToggleRow
              icon="moon-outline"
              label="Dark Mode"
              enabled={mode === 'dark'}
              onToggle={toggleTheme}
              last styles={styles} c={c}
            />
          </View>

          {/* GREETING TITLE */}
          <SectionLabel label="GREETING TITLE" styles={styles} />
          <View style={styles.card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.titleChips}>
              {TITLE_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t || 'none'}
                  onPress={() => selectTitle(t)}
                  style={[styles.titleChip, titlePref === t && styles.titleChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.titleChipText, titlePref === t && styles.titleChipTextActive]}>{t || 'None'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* GMAIL */}
          <SectionLabel label="GMAIL" styles={styles} />
          <View style={styles.card}>
            <LinkRow
              icon="mail" iconColor="#EA4335" label="Gmail"
              value={gmail?.connected ? 'Connected' : gmail ? 'Not connected' : 'Loading…'}
              valueColor={gmail?.connected ? c.success : c.tertiary}
              statusDot={gmail?.connected ? c.success : undefined}
              onPress={() => {}}
              styles={styles} c={c}
            />
            <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={handleSync} disabled={syncing} activeOpacity={0.6}>
              <IconTile name="sync" color={c.gold} c={c} />
              <Text style={styles.rowLabel}>Sync Gmail</Text>
              <View style={styles.rowRight}>
                {syncing ? <ActivityIndicator size="small" color={c.gold} /> : <Ionicons name="chevron-forward" size={18} color={c.tertiary} />}
              </View>
            </TouchableOpacity>
            <LinkRow
              icon="people-outline" iconColor={c.success} label="Import Contacts" value="from Google"
              onPress={handleImportGoogle} last styles={styles} c={c}
            />
          </View>

          {/* PHONE CONTACTS */}
          <SectionLabel label="PHONE CONTACTS" styles={styles} />
          <View style={styles.card}>
            <LinkRow icon="call-outline" iconColor={c.success} label="Import from Phone" onPress={handleImportPhone} last styles={styles} c={c} />
          </View>

          {/* DEFAULT CADENCES */}
          <SectionLabel label="DEFAULT CADENCES" styles={styles} />
          <View style={styles.card}>
            {REL_CADENCES.map((rc, i) => (
              <LinkRow
                key={rc.type}
                icon={rc.icon} iconColor={rc.color} badge={rc.badge} label={rc.type}
                value={`every ${rc.days} days`}
                onPress={() => {}}
                last={i === REL_CADENCES.length - 1}
                styles={styles} c={c}
              />
            ))}
          </View>

          {/* EMAIL REMINDERS */}
          <SectionLabel label="EMAIL REMINDERS" styles={styles} />
          <View style={styles.card}>
            <ToggleRow icon="mail-outline" iconColor={c.gold} badge={{ dot: c.gold }} label="Unanswered email nudges" enabled={notifs.emailReminder} onToggle={() => toggle('emailReminder')} styles={styles} c={c} />
            <ToggleRow icon="notifications-outline" iconColor={c.warning} label="Escalating reminders" enabled={notifs.escalation} onToggle={() => toggle('escalation')} last styles={styles} c={c} />
          </View>

          {/* OPPORTUNITY REMINDERS */}
          <SectionLabel label="OPPORTUNITY REMINDERS" styles={styles} />
          <View style={styles.card}>
            <ToggleRow icon="calendar-outline" iconColor={c.warning} badge={{ icon: 'warning', color: c.warning }} label="Deadline alerts" enabled={notifs.deadline} onToggle={() => toggle('deadline')} styles={styles} c={c} />
            <ToggleRow icon="trending-up-outline" iconColor={c.warning} label="Escalating deadline reminders" enabled={notifs.opportunityReminder} onToggle={() => toggle('opportunityReminder')} last styles={styles} c={c} />
          </View>

          {/* GENERAL */}
          <SectionLabel label="GENERAL" styles={styles} />
          <View style={styles.card}>
            <ToggleRow icon="notifications-outline" label="Push notifications" enabled={notifs.push} onToggle={() => toggle('push')} styles={styles} c={c} />
            <ToggleRow icon="sunny-outline" label="Daily digest" sub="morning orbit summary" enabled={notifs.digest} onToggle={() => toggle('digest')} last styles={styles} c={c} />
          </View>

          {/* MEMBERSHIP */}
          <SectionLabel label="MEMBERSHIP" styles={styles} />
          <View style={styles.card}>
            <TouchableOpacity style={[styles.row, styles.rowDivider]} activeOpacity={0.6} onPress={isPro ? undefined : openUpgrade} disabled={isPro}>
              <View style={[styles.badge, { backgroundColor: isPro ? c.gold : c.tertiary }]}>
                <Text style={styles.badgeText}>{isPro ? 'PRO' : 'FREE'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{isPro ? 'Pro Plan' : 'Free Plan'}</Text>
                <Text style={styles.rowSub}>{isPro ? "You're on the Pro plan" : 'Tap to unlock everything'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.tertiary} />
            </TouchableOpacity>
            <LinkRow icon="card-outline" label="Manage Subscription" onPress={() => {}} last styles={styles} c={c} />
          </View>

          {/* INVITE FRIENDS */}
          <SectionLabel label="INVITE FRIENDS" styles={styles} />
          <View style={styles.card}>
            {isPro ? (
              <>
                <View style={[styles.row, styles.rowDivider]}>
                  <IconTile name="gift-outline" color={c.gold} c={c} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowSub}>Your referral code</Text>
                    <Text style={styles.refCode}>{referralCode}</Text>
                  </View>
                  <TouchableOpacity onPress={handleCopyCode} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
                    <Ionicons name="copy-outline" size={20} color={c.gold} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.row} onPress={handleShareCode} activeOpacity={0.6}>
                  <IconTile name="share-social-outline" color={c.gold} c={c} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>Share invite</Text>
                    <Text style={styles.rowSub}>2 friends on Pro = 1 free month</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.tertiary} />
                </TouchableOpacity>
              </>
            ) : (
              <LinkRow
                icon="gift-outline" iconColor={c.gold} label="Unlock your referral code"
                value="Pro" valueColor={c.gold}
                onPress={openUpgrade} last styles={styles} c={c}
              />
            )}
          </View>

          {/* DEV MODE */}
          <SectionLabel label="DEV MODE" styles={styles} />
          <View style={styles.card}>
            <ToggleRow
              icon="code-slash-outline" label="Force Pro Access" sub="Overrides your real tier — for testing only"
              enabled={devProOverride} onToggle={() => setDevProOverride(!devProOverride)} last styles={styles} c={c}
            />
          </View>

          {/* SIGN OUT + DELETE ACCOUNT */}
          <View style={[styles.card, { marginTop: 4 }]}>
            <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={handleLogout} activeOpacity={0.6}>
              <IconTile name="log-out-outline" color={c.secondary} c={c} />
              <Text style={styles.rowLabel}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.6}>
              <IconTile name="trash-outline" color={c.overdue} c={c} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: c.overdue }]}>Delete Account</Text>
                <Text style={styles.rowSub}>Permanently erase your account and all data</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        <ImportSelectionModal
          visible={importSource !== null}
          candidates={importCandidates}
          loading={importLoading}
          onClose={() => setImportSource(null)}
          onImport={handleConfirmImport}
        />
      </View>
    </SafeAreaView>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 8,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.sansMedium, fontSize: 17, color: c.primary },

    content: { paddingHorizontal: 16, paddingTop: 8 },

    sectionLabel: {
      fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary,
      letterSpacing: 1.5, marginBottom: 8, marginTop: 18, marginLeft: 4,
    },

    card: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      paddingHorizontal: 14, borderWidth: 1, borderColor: c.subtleBorder,
    },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowLabel: { flex: 1, fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    rowSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, marginTop: 2 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowValue: { fontFamily: FontFamily.sans, fontSize: 13.5, color: c.tertiary },
    refCode: { fontFamily: FontFamily.display, fontSize: 17, color: c.primary, letterSpacing: 1.5, marginTop: 1 },
    dot: { width: 8, height: 8, borderRadius: 4 },

    avatar: {
      width: 44, height: 44, borderRadius: 13,
      backgroundColor: c.gold + '22', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.gold },
    userName: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.primary },
    userEmail: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 2 },

    badge: {
      width: 30, height: 30, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { fontFamily: FontFamily.sansMedium, fontSize: 9, color: '#fff', letterSpacing: 0.5 },

    titleChips: { gap: 8, paddingVertical: 14, paddingRight: 4 },
    titleChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: Radius.full,
      paddingHorizontal: 14, paddingVertical: 7,
    },
    titleChipActive: { borderColor: c.gold, backgroundColor: c.gold + '18' },
    titleChipText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    titleChipTextActive: { color: c.gold },
  })
}
