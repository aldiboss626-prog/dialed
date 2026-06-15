import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, useWindowDimensions, PanResponder,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle as SvgCircle, Text as SvgText, Line } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BlurView } from 'expo-blur'
import { contactsDb, oppsDb, pendingDb, notifDb } from '@/lib/db'
import { WelcomeOverlay } from '@/components/WelcomeOverlay'
import { TITLE_PREF_KEY } from '@/app/settings'
import { FontFamily } from '@/constants/theme'
import { useColors, useThemeMode } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { AddContactModal } from '@/components/AddContactModal'
import { DialWordmark } from '@/components/DialWordmark'
import { useAuth } from '@/hooks/useAuth'
import { ContactAvatar } from '@/components/ContactAvatar'
import type { Contact, Opportunity, PendingResponse, Notification } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PILL_H = 64 // pill bar inner height
const PILL_BOTTOM_MARGIN = 12

const PRESET_TAG_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444', Professor: '#F59E0B',
}
const CUSTOM_TAG_PALETTE = ['#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6']
function typeColor(t?: string | null): string {
  const tag = t ?? ''
  if (PRESET_TAG_COLORS[tag]) return PRESET_TAG_COLORS[tag]
  if (!tag) return '#6B7280'
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff
  return CUSTOM_TAG_PALETTE[h % CUSTOM_TAG_PALETTE.length]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,'
}

function hoursAgo(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000
}

function pendingTimeLabel(h: number) {
  if (h < 1) return 'now'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.floor(h / 24)}d`
}

function pendingTimeTint(c: ColorPalette, h: number) {
  if (h < 6) return c.secondary
  if (h < 24) return c.warning
  return c.overdue
}

function networkScore(contacts: Contact[]) {
  const overdue = contacts.filter(c => c.status === 'overdue').length
  const due = contacts.filter(c => c.status === 'due-soon').length
  return Math.max(8, Math.min(100, Math.round(100 - overdue * 12 - due * 5)))
}

function scoreColor(score: number) {
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Strong'
  if (s >= 60) return 'Good'
  if (s >= 35) return 'Needs attention'
  return 'Critical'
}

// ── Dial Gauge (tick-mark style) ──────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const GAUGE_SIZE = 128
const GCX = 64, GCY = 64
const G_BG_R   = 60   // dark background circle
const G_OUT_R  = 56   // outer tip of tick marks
const G_IN_R   = 46   // inner base of tick marks
const G_DOT_R  = G_OUT_R + 2  // indicator dot sits just outside ticks
const G_TICKS  = 44  // number of tick marks for fine resolution
const G_START  = 135
const G_SWEEP  = 270

function DialGauge({ score }: { score: number }) {
  const col   = scoreColor(score)
  const label = scoreLabel(score)
  const nLit  = Math.round(G_TICKS * (score / 100))

  // Indicator dot at the last lit tick
  const litEndDeg = G_START + ((Math.max(nLit - 1, 0)) / (G_TICKS - 1)) * G_SWEEP
  const dot = polar(GCX, GCY, G_DOT_R, litEndDeg)

  return (
    <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}>
      {/* Dark circular background */}
      <SvgCircle cx={GCX} cy={GCY} r={G_BG_R} fill="#0B1A2C" />

      {/* Tick marks */}
      {Array.from({ length: G_TICKS }, (_, i) => {
        const deg   = G_START + (i / (G_TICKS - 1)) * G_SWEEP
        const inner = polar(GCX, GCY, G_IN_R, deg)
        const outer = polar(GCX, GCY, G_OUT_R, deg)
        const lit   = i < nLit
        return (
          <Line
            key={i}
            x1={inner.x.toFixed(2)} y1={inner.y.toFixed(2)}
            x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)}
            stroke={lit ? col : 'rgba(255,255,255,0.12)'}
            strokeWidth={lit ? 3 : 2}
            strokeLinecap="round"
          />
        )
      })}

      {/* Indicator dot */}
      {nLit > 0 && (
        <SvgCircle
          cx={dot.x.toFixed(2)} cy={dot.y.toFixed(2)}
          r={4} fill={col}
        />
      )}

      {/* Score number */}
      <SvgText
        x={GCX} y={GCY + 10}
        textAnchor="middle" fontSize={32} fontWeight="bold"
        fill="#FFFFFF" fontFamily="DMSans-Bold"
      >
        {score}
      </SvgText>

      {/* Score label */}
      <SvgText
        x={GCX} y={GCY + 26}
        textAnchor="middle" fontSize={9}
        fill={col} fontFamily="DMSans-Medium" letterSpacing={1.2}
      >
        {label.toUpperCase()}
      </SvgText>
    </Svg>
  )
}

// ── HealthHeroCard ────────────────────────────────────────────────────────────

function HealthHeroCard({ score, contacts, pendingCount, onPendingPress }: {
  score: number; contacts: Contact[]; pendingCount: number; onPendingPress: () => void
}) {
  const overdue = contacts.filter(c => c.status === 'overdue').length
  const dueSoon = contacts.filter(c => c.status === 'due-soon').length
  const attn = overdue + dueSoon

  // Rotate through dialed-in jokes daily when network is healthy
  const DIALED_MSGS = [
    { h: "Don't touch that dial.",       s: "Every contact is warm and accounted for." },
    { h: "Fully dialed in.",             s: "Not a single connection going cold." },
    { h: "Network turned all the way up.", s: "Zero contacts slipping through the cracks." },
    { h: "Max signal. Stay locked in.",  s: "Your whole network is firing right now." },
  ]
  const dailyMsg = DIALED_MSGS[Math.floor(Date.now() / 86_400_000) % DIALED_MSGS.length]

  let headline = dailyMsg.h
  let subline   = dailyMsg.s
  if (attn > 0) {
    const parts: string[] = []
    if (overdue > 0) parts.push(`${overdue} cooling off`)
    if (dueSoon > 0) parts.push(`${dueSoon} due soon`)
    headline = `${attn} need${attn === 1 ? 's' : ''} you`
    subline = parts.join(', ') + '.'
  }

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden' }}>
      <LinearGradient
        colors={['#0C1E35', '#081018']}
        start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 0 }}
      >
        <Text style={{
          fontFamily: FontFamily.sansMedium, fontSize: 10,
          letterSpacing: 1, textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)', marginBottom: 8,
        }}>
          Network health
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <DialGauge score={score} />
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Text style={{ fontFamily: FontFamily.display, fontSize: 22, color: '#FFFFFF', lineHeight: 28 }}>
              {headline}
            </Text>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 13.5, color: 'rgba(255,255,255,0.5)', marginTop: 5, lineHeight: 19 }}>
              {subline}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onPendingPress}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 12, paddingVertical: 13, marginTop: 14, marginBottom: 18,
          }}
        >
          <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.55)" />
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            {pendingCount} waiting on your reply
          </Text>
          <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  )
}

// ── FavoritesRow ──────────────────────────────────────────────────────────────

function FavoritesRow({ contacts, onPress }: { contacts: Contact[]; onPress: (id: number) => void }) {
  const c = useColors()
  const favs = contacts.filter(ct => ct.is_favorite)
  if (favs.length === 0) return null

  return (
    <View>
      <Text style={{
        fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9,
        textTransform: 'uppercase', color: c.secondary, marginBottom: 12,
      }}>
        Starred
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 4 }}>
        {favs.map(ct => {
          const tc = typeColor(ct.relationship_type)
          const badgeColor = ct.status === 'overdue' ? c.overdue : ct.status === 'due-soon' ? c.warning : null
          return (
            <TouchableOpacity key={ct.id} onPress={() => onPress(ct.id)} activeOpacity={0.75}
              style={{ alignItems: 'center', gap: 7, width: 60 }}>
              <View style={{ position: 'relative' }}>
                <ContactAvatar name={ct.name} avatarUrl={ct.avatar_url} size={52} borderRadius={26} bgColor={tc} />
                {badgeColor && (
                  <View style={{
                    position: 'absolute', top: 1, right: 1,
                    width: 12, height: 12, borderRadius: 6,
                    backgroundColor: badgeColor, borderWidth: 2, borderColor: c.background,
                  }} />
                )}
              </View>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 11.5, color: c.secondary, textAlign: 'center' }} numberOfLines={1}>
                {ct.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ── AttentionCard ─────────────────────────────────────────────────────────────

function AttentionCard({ contact, onPress, onTalked, onDraft }: {
  contact: Contact; onPress: () => void
  onTalked: (id: number) => Promise<void>; onDraft: (id: number) => void
}) {
  const c = useColors()
  const tc = typeColor(contact.relationship_type)
  const [talking, setTalking] = useState(false)
  const [talked, setTalked] = useState(false)
  const isOverdue = contact.status === 'overdue'
  const statusColor = isOverdue ? c.overdue : c.warning
  const statusLabel = isOverdue ? 'Overdue' : 'Due soon'

  async function handleTalked() {
    if (talking || talked) return
    setTalking(true)
    try { await onTalked(contact.id); setTalked(true) } catch {} finally { setTalking(false) }
  }

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.subtleBorder }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ContactAvatar name={contact.name} avatarUrl={contact.avatar_url} size={46} borderRadius={23} bgColor={tc} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: c.primary, lineHeight: 20 }} numberOfLines={1}>
                {contact.name}
              </Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 1 }}>
                Last contact {contact.days_since_contact}d ago · every {contact.cadence_days}d
              </Text>
            </View>
            <View style={{ backgroundColor: statusColor + '22', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: statusColor }}>{statusLabel}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {contact.linked_opportunity?.deadline && (() => {
        const daysLeft = Math.ceil((new Date(contact.linked_opportunity!.deadline!).getTime() - Date.now()) / 86_400_000)
        if (daysLeft > 7) return null
        return (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: c.warning + '12',
            borderTopWidth: 1, borderTopColor: c.warning + '22',
          }}>
            <Ionicons name="flame" size={14} color={c.warning} />
            <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12.5, color: c.warning }}>
              {contact.linked_opportunity!.title} — deadline in {daysLeft}d
            </Text>
          </View>
        )
      })()}

      <View style={{
        flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 14,
        borderTopWidth: 1, borderTopColor: c.subtleBorder, paddingTop: 12,
      }}>
        <TouchableOpacity
          onPress={() => onDraft(contact.id)} activeOpacity={0.7}
          style={{
            flex: 1, height: 40, borderRadius: 10,
            borderWidth: 1.5, borderColor: c.border,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Ionicons name="add" size={16} color={c.gold} />
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13.5, color: c.gold }}>Draft a note</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleTalked} disabled={talking || talked} activeOpacity={0.8}
          style={{
            flex: 1, height: 40, borderRadius: 10,
            backgroundColor: talked ? c.success : c.gold,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          {talking
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13.5, color: '#fff' }}>
                {talked ? 'Logged!' : 'Reached out'}
              </Text>
            </>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── OnTrackSection ────────────────────────────────────────────────────────────

function OnTrackSection({ contacts, onPress, onViewAll }: {
  contacts: Contact[]; onPress: (id: number) => void; onViewAll: () => void
}) {
  const c = useColors()
  const good = contacts.filter(ct => ct.status === 'good')
  if (good.length === 0) return null

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: c.secondary }}>
          On track
        </Text>
        <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.tertiary }}>{good.length}</Text>
      </View>
      <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden' }}>
        {good.slice(0, 5).map((ct, i) => (
          <TouchableOpacity key={ct.id} onPress={() => onPress(ct.id)} activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border }}>
            <ContactAvatar name={ct.name} avatarUrl={ct.avatar_url} size={40} borderRadius={20} bgColor={typeColor(ct.relationship_type)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FontFamily.display, fontSize: 15, color: c.primary }} numberOfLines={1}>{ct.name}</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 1 }}>
                {ct.days_since_contact === 0 ? 'Reconnected today' : `Last contact ${ct.days_since_contact}d ago`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={c.tertiary} />
          </TouchableOpacity>
        ))}
        {good.length > 5 && (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}
            style={{ padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border }}>
            <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.gold }}>View all {good.length}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ── InboxView ─────────────────────────────────────────────────────────────────

function InboxView({ pending, onOpen, onDismiss, onReplied, bottomPad }: {
  pending: PendingResponse[]
  onOpen: (pr: PendingResponse) => void
  onDismiss: (id: number) => Promise<void>
  onReplied: (id: number) => Promise<void>
  bottomPad: number
}) {
  const c = useColors()
  const [acting, setActing] = useState<Record<number, 'dismiss' | 'replied' | null>>({})

  async function handleAction(prId: number, type: 'dismiss' | 'replied') {
    setActing(prev => ({ ...prev, [prId]: type }))
    try {
      if (type === 'dismiss') await onDismiss(prId)
      else await onReplied(prId)
    } finally {
      setActing(prev => ({ ...prev, [prId]: null }))
    }
  }

  if (pending.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: bottomPad }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.success + '16', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name="checkmark-circle-outline" size={32} color={c.success} />
        </View>
        <Text style={{ fontFamily: FontFamily.display, fontSize: 20, color: c.primary }}>All clear</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 48, lineHeight: 20 }}>
          No emails waiting on your reply right now.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, gap: 10, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {pending.map(pr => {
        const h = hoursAgo(pr.email_date ?? pr.detected_at)
        const urgencyColor = pendingTimeTint(c, h)
        const isActing = acting[pr.id]

        return (
          <TouchableOpacity
            key={pr.id}
            onPress={() => onOpen(pr)}
            activeOpacity={0.85}
            style={{
              backgroundColor: c.surface, borderRadius: 18,
              borderWidth: 1, borderColor: c.subtleBorder,
              overflow: 'hidden',
            }}
          >
            {/* Urgency accent bar */}
            <View style={{ height: 3, backgroundColor: urgencyColor, opacity: 0.7 }} />

            {/* Main content */}
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ContactAvatar name={pr.contact.name} size={44} borderRadius={22} bgColor={urgencyColor + '28'} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FontFamily.display, fontSize: 15.5, color: c.primary }} numberOfLines={1}>
                      {pr.contact.name}
                    </Text>
                    <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: urgencyColor, marginLeft: 8, flexShrink: 0 }}>
                      {pendingTimeLabel(h)}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.primary, marginTop: 2 }} numberOfLines={1}>
                    Re: {pr.email_subject}
                  </Text>
                  {!!pr.email_preview && (
                    <Text style={{ fontFamily: FontFamily.sans, fontSize: 12.5, color: c.secondary, marginTop: 3, lineHeight: 17 }} numberOfLines={2}>
                      {pr.email_preview}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Action row */}
            <View style={{
              flexDirection: 'row', gap: 8,
              paddingHorizontal: 14, paddingBottom: 13, paddingTop: 4,
            }}>
              <TouchableOpacity
                onPress={() => handleAction(pr.id, 'dismiss')}
                disabled={!!isActing}
                activeOpacity={0.7}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  borderWidth: 1, borderColor: c.border,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.tertiary }}>
                  {isActing === 'dismiss' ? 'Dismissing…' : 'Dismiss'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAction(pr.id, 'replied')}
                disabled={!!isActing}
                activeOpacity={0.8}
                style={{
                  flex: 2, height: 36, borderRadius: 10,
                  backgroundColor: c.gold,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <Ionicons name="checkmark" size={15} color="#fff" />
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#fff' }}>
                  {isActing === 'replied' ? 'Saving…' : 'Marked replied'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}


// ── PillTabBar ────────────────────────────────────────────────────────────────

function PillTabBar({ tab, onTab, onAdd, onSearch, pendingCount, slideAnim }: {
  tab: 'network' | 'inbox'
  onTab: (t: 'network' | 'inbox') => void
  onAdd: () => void
  onSearch: () => void
  pendingCount: number
  slideAnim: Animated.Value
}) {
  const c = useColors()
  const { mode } = useThemeMode()
  const insets = useSafeAreaInsets()
  const [pillW, setPillW] = useState(0)
  const isDark = mode === 'dark'

  const items = [
    { id: 'network', label: 'Network', icon: 'people' as const,       iconOut: 'people-outline' as const },
    { id: 'inbox',   label: 'Inbox',   icon: 'mail' as const,         iconOut: 'mail-outline' as const },
    { id: 'add',     label: 'Add',     icon: 'add-circle' as const,   iconOut: 'add-circle-outline' as const },
    { id: 'search',  label: 'Search',  icon: 'search' as const,       iconOut: 'search-outline' as const },
  ]

  // Tab width = pillW / 4. Indicator slides between tab 0 (Network) and tab 1 (Inbox).
  const tabW = pillW / 4
  const indicatorW = 28

  const indicatorX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [tabW / 2 - indicatorW / 2, tabW * 1.5 - indicatorW / 2],
  })

  return (
    <View style={{
      position: 'absolute', bottom: PILL_BOTTOM_MARGIN + Math.max(insets.bottom, 0),
      left: 16, right: 16,
      borderRadius: 999,
      overflow: 'hidden',
      shadowColor: isDark ? '#000' : '#0D1526',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.5 : 0.13, shadowRadius: 22, elevation: 14,
    }}>
      <BlurView
        intensity={isDark ? 60 : 75}
        tint={isDark ? 'dark' : 'light'}
        style={{
          paddingVertical: 8, paddingHorizontal: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)',
          backgroundColor: isDark ? 'rgba(22,20,30,0.80)' : 'rgba(255,255,255,0.55)',
        }}
        onLayout={e => setPillW(e.nativeEvent.layout.width)}
      >
        {/* Sliding indicator dot */}
        {pillW > 0 && (
          <Animated.View style={{
            position: 'absolute',
            bottom: 7,
            width: indicatorW,
            height: 3,
            borderRadius: 2,
            backgroundColor: c.gold,
            transform: [{ translateX: indicatorX }],
            // blue glow on iOS
            shadowColor: c.gold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 5,
          }} />
        )}

        <View style={{ flexDirection: 'row' }}>
          {items.map(item => {
            const isNavTab = item.id === 'network' || item.id === 'inbox'
            const active = isNavTab && tab === item.id
            const color = active ? c.gold : isDark ? c.secondary : c.tertiary

            function handlePress() {
              if (item.id === 'network' || item.id === 'inbox') onTab(item.id)
              else if (item.id === 'add') onAdd()
              else if (item.id === 'search') onSearch()
            }

            return (
              <TouchableOpacity
                key={item.id}
                onPress={handlePress}
                activeOpacity={0.65}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 5 }}
              >
                {/* Icon with glow halo on active */}
                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                  {active && (
                    <View style={{
                      position: 'absolute',
                      width: 34, height: 34, borderRadius: 17,
                      backgroundColor: c.gold + '18',
                    }} />
                  )}
                  <Ionicons
                    name={active ? item.icon : item.iconOut}
                    size={24}
                    color={color}
                    style={active ? {
                      shadowColor: c.gold,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.55,
                      shadowRadius: 6,
                    } : undefined}
                  />
                  {item.id === 'inbox' && pendingCount > 0 && (
                    <View style={{
                      position: 'absolute', top: -4, right: -7,
                      backgroundColor: c.overdue, borderRadius: 8,
                      minWidth: 16, height: 16, paddingHorizontal: 3,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(22,20,30,0.95)' : c.surface,
                    }}>
                      <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10, color: '#fff' }}>
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 10.5, color, letterSpacing: 0.1 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </BlurView>
    </View>
  )
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const { welcome } = useLocalSearchParams<{ welcome?: string }>()
  const c = useColors()
  const insets = useSafeAreaInsets()
  const { width: screenW } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(0)).current
  const tabRef = useRef<'network' | 'inbox'>('network')
  const switchTabFn = useRef<(t: 'network' | 'inbox') => void>(() => {})
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [pending, setPending] = useState<PendingResponse[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(welcome === '1')
  const [titlePref, setTitlePref] = useState('')
  const [tab, setTab] = useState<'network' | 'inbox'>('network')

  function switchTab(newTab: 'network' | 'inbox') {
    if (tabRef.current === newTab) return
    tabRef.current = newTab
    setTab(newTab)
    Animated.spring(slideAnim, {
      toValue: newTab === 'inbox' ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 13,
    }).start()
  }
  switchTabFn.current = switchTab

  const contentPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 2.5 && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        if ((gs.dx < -50 || gs.vx < -0.4) && tabRef.current === 'network')
          switchTabFn.current('inbox')
        else if ((gs.dx > 50 || gs.vx > 0.4) && tabRef.current === 'inbox')
          switchTabFn.current('network')
      },
    })
  ).current

  // bottom padding = pill bar height + bottom inset + margin + a little breathing room
  const bottomPad = PILL_H + Math.max(insets.bottom, 0) + PILL_BOTTOM_MARGIN + 16

  useEffect(() => {
    AsyncStorage.getItem(TITLE_PREF_KEY).then(v => setTitlePref(v ?? '')).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [cts, os, ps, ns] = await Promise.all([
        contactsDb.list(fresh => setContacts(fresh)),
        oppsDb.list(fresh => setOpps(fresh)),
        pendingDb.list(fresh => setPending(fresh)),
        notifDb.list(fresh => setNotifications(fresh)),
      ])
      setContacts(cts); setOpps(os); setPending(ps); setNotifications(ns)
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useFocusEffect(useCallback(() => { loadData() }, [loadData]))
  function onRefresh() { setRefreshing(true); loadData() }

  async function handleTalked(id: number) {
    try {
      await contactsDb.talked(id)
      setContacts(prev => prev.map(ct =>
        ct.id === id ? { ...ct, days_since_contact: 0, status: 'good' as const } : ct
      ))
      // talked() already marks pending as responded on the server; sync local state
      setPending(prev => prev.filter(pr => pr.contact_id !== id))
    } catch {}
  }

  function handleOpenReply(pr: PendingResponse) {
    router.push({
      pathname: '/reply',
      params: {
        prId: String(pr.id),
        contactId: String(pr.contact_id),
        contactName: pr.contact.name,
        contactRole: pr.contact.role ?? '',
        relationship: pr.contact.relationship_type ?? '',
        subject: pr.email_subject,
        preview: pr.email_preview ?? '',
        body: pr.email_body ?? pr.email_preview ?? '',
        date: pr.email_date,
      },
    } as any)
  }

  async function handleDismiss(prId: number) {
    await pendingDb.dismiss(prId)
    setPending(prev => prev.filter(pr => pr.id !== prId))
  }

  async function handleReplied(prId: number) {
    await pendingDb.responded(prId)
    setPending(prev => prev.filter(pr => pr.id !== prId))
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const overdueCt = contacts.filter(ct => ct.status === 'overdue').length
  const dueSoonCt = contacts.filter(ct => ct.status === 'due-soon').length
  const score = networkScore(contacts)
  const attentionCt = overdueCt + dueSoonCt
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const attentionContacts = contacts
    .filter(ct => ct.status === 'overdue' || ct.status === 'due-soon')
    .sort((a, b) => {
      const order: Record<string, number> = { overdue: 0, 'due-soon': 1, good: 2 }
      const d = (order[a.status] ?? 2) - (order[b.status] ?? 2)
      return d !== 0 ? d : b.days_since_contact - a.days_since_contact
    })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>

      {/* Header — DIALED left, account avatar right */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12,
      }}>
        <DialWordmark />
        <TouchableOpacity
          onPress={() => router.push('/settings' as any)}
          activeOpacity={0.7}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: c.elevated,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.secondary }}>
            {initials}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content — two panes side by side, animated slide + swipe gesture */}
      <View style={{ flex: 1, overflow: 'hidden' }} {...contentPan.panHandlers}>
        <Animated.View style={{
          flexDirection: 'row',
          width: screenW * 2,
          flex: 1,
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -screenW],
            }),
          }],
        }}>
          {/* ── Network pane ── */}
          <View style={{ width: screenW, flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 2, gap: 18, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.secondary} />}
        >
          <HealthHeroCard
            score={score}
            contacts={contacts}
            pendingCount={pending.length}
            onPendingPress={() => setTab('inbox')}
          />

          <FavoritesRow contacts={contacts} onPress={id => router.push(`/contact/${id}` as any)} />

          {/* Needs Attention */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: c.secondary }}>
                Needs attention
              </Text>
              {attentionCt > 0 && (
                <View style={{ backgroundColor: c.overdue, borderRadius: 99, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: '#fff' }}>{attentionCt}</Text>
                </View>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={c.gold} style={{ marginTop: 16 }} />
            ) : attentionContacts.length === 0 ? (
              <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: c.subtleBorder, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.success + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={22} color={c.success} />
                </View>
                <View>
                  <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: c.primary }}>You're all caught up</Text>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginTop: 2 }}>No one is going cold today.</Text>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {attentionContacts.map(ct => (
                  <AttentionCard
                    key={ct.id}
                    contact={ct}
                    onPress={() => router.push(`/contact/${ct.id}` as any)}
                    onTalked={handleTalked}
                    onDraft={id => router.push(`/contact/${id}` as any)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* On Track */}
          {!loading && (
            <OnTrackSection
              contacts={contacts}
              onPress={id => router.push(`/contact/${id}` as any)}
              onViewAll={() => router.push('/people' as any)}
            />
          )}

          {/* Empty state */}
          {!loading && contacts.length === 0 && (
            <TouchableOpacity
              onPress={() => setAddOpen(true)} activeOpacity={0.75}
              style={{ backgroundColor: c.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: c.subtleBorder, alignItems: 'center', gap: 10 }}
            >
              <Ionicons name="person-add-outline" size={28} color={c.gold} />
              <Text style={{ fontFamily: FontFamily.display, fontSize: 17, color: c.primary }}>Add your first contact</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 13.5, color: c.secondary, textAlign: 'center', lineHeight: 19 }}>
                Start tracking your relationships and never let a connection go cold.
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
          </View>{/* end network pane */}

          {/* ── Inbox pane ── */}
          <View style={{ width: screenW }}>
            <InboxView
              pending={pending}
              onOpen={handleOpenReply}
              onDismiss={handleDismiss}
              onReplied={handleReplied}
              bottomPad={bottomPad}
            />
          </View>
        </Animated.View>
      </View>{/* end slide container */}

      {/* Floating pill tab bar */}
      <PillTabBar
        tab={tab}
        onTab={switchTab}
        onAdd={() => setAddOpen(true)}
        onSearch={() => router.push('/search' as any)}
        pendingCount={pending.length}
        slideAnim={slideAnim}
      />

      <AddContactModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={contact => setContacts(prev => [contact, ...prev])}
      />

      {showWelcome && user && (
        <WelcomeOverlay
          greeting={greeting()}
          title={titlePref}
          name={titlePref
            ? (user.name.split(' ').slice(-1)[0] ?? user.name)
            : (user.name.split(' ')[0] ?? user.name)
          }
          statLine={
            overdueCt > 0
              ? `You have ${overdueCt} overdue contact${overdueCt !== 1 ? 's' : ''} needing attention`
              : pending.length > 0
              ? `You have ${pending.length} email${pending.length !== 1 ? 's' : ''} awaiting a reply`
              : 'Your network is in good shape'
          }
          onDone={() => setShowWelcome(false)}
        />
      )}
    </SafeAreaView>
  )
}
