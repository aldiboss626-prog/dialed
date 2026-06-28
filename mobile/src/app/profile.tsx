import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily, Radius, CategoryColors, DEFAULT_CATEGORY_COLOR } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { useAuth } from '@/hooks/useAuth'
import { usePro } from '@/hooks/usePro'
import { contactsDb } from '@/lib/db'
import { contactHealthScore, healthBand, healthLabel, healthColor } from '@/lib/health'
import type { Contact } from '@/types'
import { ContactAvatar } from '@/components/ContactAvatar'
import { DialScore } from '@/components/DialScore'
import { Bob, bobMoodLabel, bobColor } from '@/components/Bob'

// What an overall network-health score means, in one line.
const HEALTH_MEANING: Record<string, string> = {
  strong: "Your network is warm — you're staying close to the people who matter.",
  good: "You're mostly on top of it. A few nudges away from great.",
  'needs-attention': 'Several relationships are cooling off. Time to reconnect.',
  critical: 'A lot of your network is going cold. Reach out to a few people today.',
}

const BAND_EXPLAINER: { key: string; label: string; range: string; blurb: string }[] = [
  { key: 'strong', label: 'Strong', range: '76–100', blurb: 'Fresh — you’ve connected within their cadence.' },
  { key: 'good', label: 'Good', range: '51–75', blurb: 'On track, with a check-in coming up.' },
  { key: 'needs-attention', label: 'Needs attention', range: '26–50', blurb: 'Cooling off — overdue for a touch.' },
  { key: 'critical', label: 'Critical', range: '0–25', blurb: 'Going cold — reach out soon.' },
]

// Podium medal colors (theme-independent).
const MEDAL: Record<number, string> = { 1: '#E8B931', 2: '#AEB6C2', 3: '#CD8C5C' }

export default function ProfileScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()
  const { user } = useAuth()
  const { isPro } = usePro()
  const [contacts, setContacts] = useState<Contact[] | null>(null)

  useEffect(() => {
    contactsDb.list().then(setContacts).catch(() => setContacts([]))
  }, [])

  const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  // ── Analytics ─────────────────────────────────────────────────────────────────
  const list = contacts ?? []
  const scored = list.map(ct => ({ ct, score: contactHealthScore(ct) }))
  const overall = scored.length
    ? Math.round(scored.reduce((sum, x) => sum + x.score, 0) / scored.length)
    : 0
  const overallBand = healthBand(overall)
  const overallColor = healthColor(c, overall)

  const counts = {
    strong: scored.filter(x => healthBand(x.score) === 'strong').length,
    good: scored.filter(x => healthBand(x.score) === 'good').length,
    needs: scored.filter(x => healthBand(x.score) === 'needs-attention').length,
    critical: scored.filter(x => healthBand(x.score) === 'critical').length,
  }

  const top = [...scored]
    .sort((a, b) => b.score - a.score || (b.ct.stars ?? 0) - (a.ct.stars ?? 0))
    .slice(0, 8)

  const catColor = (rel?: string | null) => (rel && CategoryColors[rel]) || DEFAULT_CATEGORY_COLOR

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top bar: back · settings gear */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={26} color={c.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/settings' as any)} style={s.iconBtn} activeOpacity={0.6}>
          <Ionicons name="settings-outline" size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>

        {/* Identity */}
        <View style={s.identity}>
          <View style={s.bigAvatar}><Text style={s.bigAvatarText}>{initials}</Text></View>
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={[s.tierBadge, { backgroundColor: (isPro ? c.gold : c.tertiary) + '1A', borderColor: (isPro ? c.gold : c.tertiary) + '55' }]}>
            <Text style={[s.tierText, { color: isPro ? c.gold : c.secondary }]}>{isPro ? 'PRO MEMBER' : 'FREE PLAN'}</Text>
          </View>
        </View>

        {contacts === null ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={c.gold} />
          </View>
        ) : list.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={28} color={c.tertiary} />
            <Text style={s.emptyText}>Add a few people to your network to see your analytics.</Text>
          </View>
        ) : (
          <>
            {/* Overall network health */}
            <Text style={s.sectionLabel}>OVERALL NETWORK HEALTH</Text>
            <View style={s.healthCard}>
              {/* Bob — your network's mood */}
              <View style={{ alignItems: 'center' }}>
                <Bob score={overall} size={120} />
                <Text style={[s.bobCaption, { color: bobColor(overall) }]}>Bob is {bobMoodLabel(overall).toLowerCase()}</Text>
              </View>
              <View style={{ alignItems: 'center', paddingVertical: 6, marginTop: 4 }}>
                <DialScore score={overall} color={overallColor} label={healthLabel(overall)} size={156} />
              </View>
              <Text style={[s.healthMeaning, { textAlign: 'center', marginTop: 6 }]}>{HEALTH_MEANING[overallBand]}</Text>
              <TouchableOpacity onPress={() => router.push('/mascot-demo' as any)} activeOpacity={0.7} style={s.bobDemoBtn}>
                <Ionicons name="happy-outline" size={15} color={c.gold} />
                <Text style={s.bobDemoText}>Play with Bob</Text>
                <Ionicons name="chevron-forward" size={14} color={c.gold} />
              </TouchableOpacity>
            </View>

            {/* Stat tiles */}
            <View style={s.statRow}>
              <Stat label="People" value={list.length} color={c.primary} s={s} />
              <Stat label="Strong" value={counts.strong} color={c.success} s={s} />
              <Stat label="Cooling" value={counts.needs} color={c.warning} s={s} />
              <Stat label="Critical" value={counts.critical} color={c.overdue} s={s} />
            </View>

            {/* Top connections */}
            <View style={s.rankHeaderRow}>
              <Text style={s.sectionLabel}>YOUR STRONGEST CONNECTIONS</Text>
              <TouchableOpacity onPress={() => router.push('/search' as any)} activeOpacity={0.6}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {/* Podium — top 3 */}
            <View style={s.podiumCard}>
              <View style={s.podium}>
                {[{ place: 2, x: top[1] }, { place: 1, x: top[0] }, { place: 3, x: top[2] }].map(({ place, x }) => {
                  if (!x) return <View key={place} style={s.podCol} />
                  const medal = MEDAL[place]
                  const col = healthColor(c, x.score)
                  const big = place === 1
                  return (
                    <TouchableOpacity key={place} style={s.podCol} activeOpacity={0.7} onPress={() => router.push(`/contact/${x.ct.id}` as any)}>
                      <View>
                        <ContactAvatar name={x.ct.name} size={big ? 60 : 48} borderRadius={big ? 30 : 24} bgColor={catColor(x.ct.relationship_type) + '22'} />
                        <View style={[s.medalBadge, { backgroundColor: medal }]}>
                          <Text style={s.medalText}>{place}</Text>
                        </View>
                      </View>
                      <Text style={s.podName} numberOfLines={1}>{x.ct.name.split(' ')[0]}</Text>
                      <View style={[s.scorePill, { backgroundColor: col + '1A', marginTop: 3 }]}>
                        <Text style={[s.scorePillText, { color: col }]}>{x.score}</Text>
                      </View>
                      <View style={[s.pedestal, { height: big ? 50 : place === 2 ? 34 : 22, backgroundColor: medal + '26', borderColor: medal + '55' }]} />
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* The rest — 4th onward, same list format */}
            {top.length > 3 && (
              <View style={[s.rankCard, { marginTop: 10 }]}>
                {top.slice(3).map((x, i, arr) => {
                  const col = healthColor(c, x.score)
                  return (
                    <TouchableOpacity
                      key={x.ct.id}
                      style={[s.rankRow, i < arr.length - 1 && s.rankDivider]}
                      onPress={() => router.push(`/contact/${x.ct.id}` as any)}
                      activeOpacity={0.6}
                    >
                      <Text style={s.rankNum}>{i + 4}</Text>
                      <ContactAvatar name={x.ct.name} size={38} borderRadius={19} bgColor={catColor(x.ct.relationship_type) + '22'} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.rankName} numberOfLines={1}>{x.ct.name}</Text>
                        {!!x.ct.role && <Text style={s.rankRole} numberOfLines={1}>{x.ct.role}</Text>}
                      </View>
                      <View style={[s.scorePill, { backgroundColor: col + '1A' }]}>
                        <Text style={[s.scorePillText, { color: col }]}>{x.score}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {/* What the score means */}
            <Text style={s.sectionLabel}>WHAT YOUR SCORE MEANS</Text>
            <View style={s.rankCard}>
              {BAND_EXPLAINER.map((b, i) => {
                const col = b.key === 'critical' ? c.overdue : b.key === 'needs-attention' ? c.warning : c.success
                return (
                  <View key={b.key} style={[s.bandRow, i < BAND_EXPLAINER.length - 1 && s.rankDivider]}>
                    <View style={[s.bandDot, { backgroundColor: col }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.bandLabel}>{b.label} <Text style={s.bandRange}>· {b.range}</Text></Text>
                      <Text style={s.bandBlurb}>{b.blurb}</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ label, value, color, s }: { label: string; value: number; color: string; s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.statTile}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
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

    identity: { alignItems: 'center', marginTop: 6, marginBottom: 26 },
    bigAvatar: {
      width: 84, height: 84, borderRadius: 26,
      backgroundColor: c.gold + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    bigAvatarText: { fontFamily: FontFamily.display, fontSize: 30, color: c.gold },
    name: { fontFamily: FontFamily.display, fontSize: 24, color: c.primary },
    email: { fontFamily: FontFamily.sans, fontSize: 13.5, color: c.secondary, marginTop: 3 },
    tierBadge: {
      marginTop: 10, paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: Radius.full, borderWidth: 1,
    },
    tierText: { fontFamily: FontFamily.sansMedium, fontSize: 10.5, letterSpacing: 1.2 },

    sectionLabel: {
      fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 1.2,
      color: c.tertiary, marginTop: 22, marginBottom: 10, marginLeft: 4,
    },

    healthCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, padding: 18,
    },
    healthTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    healthScore: { fontFamily: FontFamily.display, fontSize: 52, lineHeight: 56 },
    healthOutOf: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.tertiary, marginTop: 2 },
    bandPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, marginTop: 6 },
    bandPillText: { fontFamily: FontFamily.sansMedium, fontSize: 13 },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: c.elevated, marginTop: 16, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    healthMeaning: { fontFamily: FontFamily.sans, fontSize: 13.5, color: c.secondary, lineHeight: 19, marginTop: 14 },
    bobCaption: { fontFamily: FontFamily.sansMedium, fontSize: 14, marginTop: 2 },
    bobDemoBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      alignSelf: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 14,
      borderRadius: Radius.full, borderWidth: 1, borderColor: c.gold + '40', backgroundColor: c.gold + '0F',
    },
    bobDemoText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold },

    statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    statTile: {
      flex: 1, backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.subtleBorder, paddingVertical: 14, alignItems: 'center',
    },
    statValue: { fontFamily: FontFamily.display, fontSize: 24 },
    statLabel: { fontFamily: FontFamily.sans, fontSize: 11.5, color: c.tertiary, marginTop: 3 },

    rankHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    seeAll: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold, marginTop: 22, marginBottom: 10 },
    rankCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder, paddingHorizontal: 14,
    },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rankDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    rankNum: { fontFamily: FontFamily.display, fontSize: 16, color: c.tertiary, width: 18, textAlign: 'center' },
    rankName: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary },
    rankRole: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 1 },
    scorePill: { minWidth: 40, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, alignItems: 'center' },
    scorePillText: { fontFamily: FontFamily.sansMedium, fontSize: 13 },

    podiumCard: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      borderWidth: 1, borderColor: c.subtleBorder,
      paddingTop: 18, paddingHorizontal: 8, overflow: 'hidden',
    },
    podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
    podCol: { flex: 1, alignItems: 'center' },
    medalBadge: {
      position: 'absolute', bottom: -3, right: -3,
      width: 21, height: 21, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: c.surface,
    },
    medalText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: '#fff' },
    podName: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.primary, marginTop: 8 },
    pedestal: {
      width: '78%', marginTop: 8,
      borderTopLeftRadius: 8, borderTopRightRadius: 8,
      borderWidth: 1, borderBottomWidth: 0,
    },

    bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    bandDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
    bandLabel: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.primary },
    bandRange: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.tertiary },
    bandBlurb: { fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 1 },

    emptyCard: {
      backgroundColor: c.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: c.subtleBorder,
      padding: 28, alignItems: 'center', gap: 12, marginTop: 10,
    },
    emptyText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, textAlign: 'center', lineHeight: 20 },
  })
}
