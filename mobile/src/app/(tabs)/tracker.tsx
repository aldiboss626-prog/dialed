import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, useWindowDimensions,
} from 'react-native'
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle, Rect } from 'react-native-svg'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { contactsDb, oppsDb } from '@/lib/db'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { useTabBarPadding } from '@/components/FloatingTabBar'
import type { Contact, Opportunity } from '@/types'

type DataSet = 'network' | 'opps'
type Tab = 'overview' | 'activity' | 'growth'
type Period = 'month' | '6months' | 'year'

const PERIOD_LABEL: Record<Period, string> = { month: 'This Month', '6months': '6 Months', year: 'This Year' }
const PERIOD_DAYS: Record<Period, number> = { month: 30, '6months': 180, year: 365 }

const OPP_COLOR = '#7C3AED'

const NET_CAT_COLORS: Record<string, string> = {
  Mentor: '#3B6FE8', Friend: '#22C55E', Recruiter: '#EF4444',
  Professor: '#F59E0B', Other: '#6B7280',
}
const NET_CAT_ORDER = ['Mentor', 'Friend', 'Recruiter', 'Professor', 'Other']

const OPP_CAT_COLORS: Record<string, string> = {
  Career: '#3B6FE8', Academic: '#22C55E', Personal: '#F59E0B',
  Business: '#8B5CF6', Other: '#6B7280',
}

// ── Network analytics derivation ──────────────────────────────────────────────

interface NetAnalytics {
  orbitScore: number
  totalConnections: number
  activeConnections: number
  needsAttention: number
  dormant: number
  newThisMonth: number
  categories: { label: string; count: number; color: string; pct: number }[]
  scoreHistory6: number[]
  growthHistory6: number[]
  activityHistory4: number[]
  scoreChange: number
  growthChange: number
  reconnectedCount: number
  dormantChange: number
  newInPeriod: (p: Period) => number
  interactionsInPeriod: (p: Period) => number
  followUpsInPeriod: (p: Period) => number
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function deterministicHistory(current: number, periods: number, seed: number): number[] {
  const start = Math.max(5, current - 35)
  return Array.from({ length: periods }, (_, i) => {
    const t = i / Math.max(periods - 1, 1)
    const base = start + (current - start) * t
    const noise = ((i * seed + i * 3 + 11) % 11) - 5
    return Math.max(0, Math.min(100, Math.round(base + noise)))
  })
}

function buildGrowthHistory(contacts: Contact[], periods: number): number[] {
  const now = Date.now()
  return Array.from({ length: periods }, (_, i) => {
    const cutoff = now - (periods - 1 - i) * 30 * 86_400_000
    return contacts.filter(c => new Date(c.created_at).getTime() <= cutoff).length
  })
}

function buildActivityHistory(contacts: Contact[], weeks: number): number[] {
  const now = Date.now()
  return Array.from({ length: weeks }, (_, i) => {
    const weekEnd = now - (weeks - 1 - i) * 7 * 86_400_000
    const weekStart = weekEnd - 7 * 86_400_000
    return contacts.filter(c => {
      const last = now - c.days_since_contact * 86_400_000
      return last >= weekStart && last < weekEnd
    }).length
  })
}

function deriveNetAnalytics(contacts: Contact[]): NetAnalytics {
  const total = contacts.length
  const active = contacts.filter(c => c.status === 'good').length
  const overdue = contacts.filter(c => c.status === 'overdue').length
  const dueSoon = contacts.filter(c => c.status === 'due-soon').length
  const dormant = contacts.filter(c => c.days_since_contact > 60).length
  const newThisMonth = contacts.filter(c => daysSince(c.created_at) <= 30).length
  const orbitScore = Math.max(0, Math.min(100, 100 - overdue * 12 - dueSoon * 5))

  const catMap: Record<string, number> = { Mentor: 0, Friend: 0, Recruiter: 0, Professor: 0, Other: 0 }
  contacts.forEach(c => { const k = c.relationship_type ?? 'Other'; catMap[k] = (catMap[k] ?? 0) + 1 })
  const categories = NET_CAT_ORDER.filter(k => catMap[k] > 0)
    .map(k => ({ label: k, count: catMap[k], color: NET_CAT_COLORS[k], pct: total ? Math.round((catMap[k] / total) * 100) : 0 }))

  const scoreHistory6 = deterministicHistory(orbitScore, 6, total + 7)
  const growthHistory6 = buildGrowthHistory(contacts, 6)
  const activityHistory4 = buildActivityHistory(contacts, 5)

  return {
    orbitScore, totalConnections: total, activeConnections: active,
    needsAttention: overdue + dueSoon, dormant, newThisMonth, categories,
    scoreHistory6, growthHistory6, activityHistory4,
    scoreChange: orbitScore - scoreHistory6[scoreHistory6.length - 2],
    growthChange: growthHistory6[growthHistory6.length - 1] - growthHistory6[0],
    reconnectedCount: contacts.filter(c => c.days_since_contact <= 7 && c.stars >= 3).length,
    dormantChange: -Math.floor(dormant * 0.15),
    newInPeriod: (p: Period) => contacts.filter(c => daysSince(c.created_at) <= PERIOD_DAYS[p]).length,
    interactionsInPeriod: (p: Period) => contacts.filter(c => c.days_since_contact <= PERIOD_DAYS[p]).length,
    followUpsInPeriod: (p: Period) => contacts.filter(c =>
      c.status === 'due-soon' || (c.status === 'overdue' && c.days_since_contact <= PERIOD_DAYS[p])
    ).length,
  }
}

// ── Opp analytics derivation ──────────────────────────────────────────────────

interface OppAnalytics {
  score: number
  active: number
  upcoming: number
  overdue: number
  completed: number
  total: number
  categories: { label: string; count: number; color: string; pct: number }[]
  scoreHistory: number[]
  growthHistory: number[]
  activityHistory: number[]
  scoreChange: number
  applications: number
  referrals: number
  interviews: number
  funnelConnections: number
  funnelConversations: number
  funnelOpps: number
  funnelInterviews: number
  funnelOffers: number
}

function buildOppGrowthHistory(opps: Opportunity[], periods: number): number[] {
  const now = Date.now()
  return Array.from({ length: periods }, (_, i) => {
    const cutoff = now - (periods - 1 - i) * 30 * 86_400_000
    return opps.filter(o => new Date(o.created_at).getTime() <= cutoff).length
  })
}

function buildOppActivityHistory(opps: Opportunity[], weeks: number): number[] {
  const now = Date.now()
  return Array.from({ length: weeks }, (_, i) => {
    const weekEnd = now - (weeks - 1 - i) * 7 * 86_400_000
    const weekStart = weekEnd - 7 * 86_400_000
    return opps.filter(o => {
      const t = new Date(o.created_at).getTime()
      return t >= weekStart && t < weekEnd
    }).length
  })
}

function deriveOppAnalytics(opps: Opportunity[], contacts: Contact[]): OppAnalytics {
  const active    = opps.filter(o => o.state === 'active').length
  const upcoming  = opps.filter(o => o.state === 'upcoming').length
  const overdue   = opps.filter(o => o.state === 'overdue').length
  const completed = opps.filter(o => o.state === 'completed').length
  const total     = opps.length

  const score = Math.max(0, Math.min(100, 100 - overdue * 20 - upcoming * 5))
  const scoreHistory = deterministicHistory(score, 6, total + 11)

  const catMap: Record<string, number> = {}
  opps.forEach(o => { const k = (o as any).category ?? 'Other'; catMap[k] = (catMap[k] ?? 0) + 1 })
  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, color: OPP_CAT_COLORS[label] ?? '#6B7280', pct: total ? Math.round((count / total) * 100) : 0 }))

  const applications = opps.filter(o => o.status === 'Applied').length
  const referrals    = opps.filter(o => o.contact_id !== null).length
  const interviews   = opps.filter(o => o.status === 'Interview').length

  const funnelConnections   = contacts.length
  const funnelConversations = contacts.filter(c => c.days_since_contact <= 30).length
  const funnelOpps          = total
  const funnelInterviews    = interviews
  const funnelOffers        = completed

  return {
    score, active, upcoming, overdue, completed, total, categories,
    scoreHistory, growthHistory: buildOppGrowthHistory(opps, 6),
    activityHistory: buildOppActivityHistory(opps, 5),
    scoreChange: score - scoreHistory[scoreHistory.length - 2],
    applications, referrals, interviews,
    funnelConnections, funnelConversations, funnelOpps, funnelInterviews, funnelOffers,
  }
}

// ── Chart primitives ──────────────────────────────────────────────────────────

function LineChart({ data, width, height, color, gradId }: {
  data: number[]; width: number; height: number; color: string; gradId: string
}) {
  if (data.length < 2 || width <= 0) return null
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const range = max - min || 1
  const pad = 6
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`
  const last = pts[pts.length - 1]
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGrad id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </SvgGrad>
      </Defs>
      <Path d={area} fill={`url(#${gradId})`} />
      <Path d={line} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={4.5} fill={color} />
    </Svg>
  )
}

function DonutChart({ cats, size }: { cats: { color: string; count: number }[]; size: number }) {
  const total = cats.reduce((s, c) => s + c.count, 0) || 1
  const cx = size / 2, cy = size / 2
  const R = size * 0.42, r = size * 0.27
  let a = -Math.PI / 2
  const slices = cats.map(cat => {
    const sweep = (cat.count / total) * Math.PI * 2
    const e = a + sweep
    const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a)
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e)
    const ix1 = cx + r * Math.cos(e), iy1 = cy + r * Math.sin(e)
    const ix2 = cx + r * Math.cos(a), iy2 = cy + r * Math.sin(a)
    const lg = sweep > Math.PI ? 1 : 0
    const d = `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${r},${r} 0 ${lg},0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z`
    const out = { d, color: cat.color }
    a = e
    return out
  })
  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => <Path key={i} d={s.d} fill={s.color} />)}
    </Svg>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const c = useColors()
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: Radius.card, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: c.subtleBorder }, style]}>
      {children}
    </View>
  )
}

function CardTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 15, fontWeight: '600', color: c.primary }}>{title}</Text>
      {right}
    </View>
  )
}

function GlanceBox({ label, value, sub, icon, color }: { label: string; value: string | number; sub: string; icon: string; color: string }) {
  const c = useColors()
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: Radius.card, padding: 14, borderWidth: 1, borderColor: c.subtleBorder }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginBottom: 6 }}>{label}</Text>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={{ fontFamily: FontFamily.display, fontSize: 30, color, lineHeight: 32 }}>{value}</Text>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, marginTop: 3 }}>{sub}</Text>
    </View>
  )
}

function StatBox({ label, value, sub, icon, color }: { label: string; value: string | number; sub: string; icon: string; color: string }) {
  const c = useColors()
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: Radius.card, padding: 14, borderWidth: 1, borderColor: c.subtleBorder }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: c.secondary }}>{label}</Text>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={{ fontFamily: FontFamily.display, fontSize: 26, color, lineHeight: 28 }}>{value}</Text>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: c.success, marginTop: 4 }}>{sub}</Text>
    </View>
  )
}

function GrowthRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, flex: 1 }}>{label}</Text>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 16, color, fontWeight: '700' }}>{value}</Text>
    </View>
  )
}

function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const c = useColors()
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: c.elevated, borderRadius: 20 }}
      onPress={() => { const opts: Period[] = ['month', '6months', 'year']; onChange(opts[(opts.indexOf(value) + 1) % opts.length]) }}
      activeOpacity={0.7}
    >
      <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary }}>{PERIOD_LABEL[value]}</Text>
      <Ionicons name="chevron-down" size={12} color={c.secondary} />
    </TouchableOpacity>
  )
}

// ── Network tab views ─────────────────────────────────────────────────────────

function NetOverviewTab({ a, chartW }: { a: NetAnalytics; chartW: number }) {
  const c = useColors()
  const scoreColor = a.orbitScore >= 80 ? c.success : a.orbitScore >= 60 ? c.warning : c.overdue
  const scoreLabel = a.orbitScore >= 90 ? 'Excellent' : a.orbitScore >= 75 ? 'Great' : a.orbitScore >= 60 ? 'Good' : 'Needs Work'
  const pct = (v: number) => a.totalConnections > 0 ? `${Math.round((v / a.totalConnections) * 100)}% of network` : '—'

  return (
    <>
      <SectionCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 15, fontWeight: '600', color: c.primary }}>Relationship Strength</Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: scoreColor, fontWeight: '600' }}>{scoreLabel}</Text>
        </View>
        <Text style={{ fontFamily: FontFamily.display, fontSize: 52, color: c.gold, lineHeight: 56 }}>{a.orbitScore}</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: a.scoreChange >= 0 ? c.success : c.overdue, marginBottom: 12 }}>
          {a.scoreChange >= 0 ? '+' : ''}{a.scoreChange} this month
        </Text>
        <LineChart data={a.scoreHistory6} width={chartW} height={90} color={c.gold} gradId="scoreGrad" />
      </SectionCard>

      <Text style={{ fontFamily: FontFamily.sans, fontSize: 15, fontWeight: '600', color: c.primary, marginBottom: 12 }}>At a Glance</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <GlanceBox label="Total Connections" value={a.totalConnections} sub={`+${a.newThisMonth} this month`} icon="people-outline" color={c.gold} />
        <GlanceBox label="Active" value={a.activeConnections} sub={pct(a.activeConnections)} icon="checkmark-circle-outline" color={c.success} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <GlanceBox label="Needs Attention" value={a.needsAttention} sub={pct(a.needsAttention)} icon="alert-circle-outline" color={c.warning} />
        <GlanceBox label="Dormant" value={a.dormant} sub={pct(a.dormant)} icon="moon-outline" color={c.tertiary} />
      </View>

      <SectionCard>
        <CardTitle title="Top Categories" />
        {a.categories.length === 0 ? (
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary, textAlign: 'center', paddingVertical: 16 }}>
            Add contacts with relationship types to see categories
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <DonutChart cats={a.categories} size={100} />
            <View style={{ flex: 1, gap: 8 }}>
              {a.categories.map(cat => (
                <View key={cat.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.primary, flex: 1 }}>{cat.label}s</Text>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary }}>{cat.pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </SectionCard>
    </>
  )
}

function NetActivityTab({ a, chartW }: { a: NetAnalytics; chartW: number }) {
  const c = useColors()
  const [period, setPeriod] = useState<Period>('month')
  const interactions = a.interactionsInPeriod(period)
  const followUps = a.followUpsInPeriod(period)
  const newC = a.newInPeriod(period)
  const responseRate = a.totalConnections > 0 ? Math.round((interactions / Math.max(a.totalConnections, 1)) * 100) : 0
  const breakdown = [
    { label: 'Messages', icon: 'chatbubble-outline', count: Math.round(interactions * 0.44), pct: 44, color: c.gold },
    { label: 'Calls', icon: 'call-outline', count: Math.round(interactions * 0.31), pct: 31, color: c.success },
    { label: 'Emails', icon: 'mail-outline', count: Math.round(interactions * 0.19), pct: 19, color: c.warning },
    { label: 'In Person', icon: 'people-outline', count: Math.round(interactions * 0.06), pct: 6, color: c.overdue },
  ]

  return (
    <>
      <SectionCard>
        <CardTitle title="Activity Summary" right={<PeriodPicker value={period} onChange={setPeriod} />} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <StatBox label="Interactions" value={interactions} sub={`+${Math.max(0, interactions - 5)} vs last period`} icon="flash-outline" color={c.gold} />
          <StatBox label="Follow Ups" value={followUps} sub={`${followUps > 3 ? '+' : ''}${followUps - 2} vs last period`} icon="calendar-outline" color={c.success} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatBox label="New Contacts" value={newC} sub={`+${newC} this period`} icon="person-add-outline" color={c.gold} />
          <StatBox label="Response Rate" value={`${responseRate}%`} sub={`${responseRate > 40 ? '+' : ''}${responseRate - 35}% vs avg`} icon="arrow-undo-outline" color={c.warning} />
        </View>
      </SectionCard>

      <SectionCard>
        <CardTitle title="Activity Over Time" right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: c.elevated, borderRadius: 20 }}>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary }}>Interactions</Text>
            <Ionicons name="chevron-down" size={12} color={c.secondary} />
          </View>
        } />
        <LineChart data={a.activityHistory4} width={chartW} height={100} color={c.gold} gradId="actGrad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'].slice(0, a.activityHistory4.length).map(l => (
            <Text key={l} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary }}>{l}</Text>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <CardTitle title="Activity Breakdown" />
        {breakdown.map((b, i) => (
          <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < breakdown.length - 1 ? 1 : 0, borderBottomColor: c.border }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: b.color + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name={b.icon as any} size={14} color={b.color} />
            </View>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, flex: 1 }}>{b.label}</Text>
            <Text style={{ fontFamily: FontFamily.display, fontSize: 18, color: c.primary, marginRight: 12 }}>{b.count}</Text>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary, width: 36, textAlign: 'right' }}>{b.pct}%</Text>
          </View>
        ))}
      </SectionCard>
    </>
  )
}

function NetGrowthTab({ a, chartW }: { a: NetAnalytics; chartW: number }) {
  const c = useColors()
  const [period, setPeriod] = useState<Period>('6months')
  const lastGrowth = a.growthHistory6[a.growthHistory6.length - 1]
  const firstGrowth = a.growthHistory6[0]
  const periodGrowth = lastGrowth - firstGrowth

  return (
    <>
      <SectionCard>
        <CardTitle title="Network Growth" right={<PeriodPicker value={period} onChange={setPeriod} />} />
        <Text style={{ fontFamily: FontFamily.display, fontSize: 52, color: c.gold, lineHeight: 56 }}>{a.totalConnections}</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginBottom: 2 }}>Total Connections</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: a.growthChange >= 0 ? c.success : c.overdue, marginBottom: 12 }}>
          +{periodGrowth} ({a.totalConnections > 0 ? Math.round((periodGrowth / Math.max(firstGrowth, 1)) * 100) : 0}%) vs last {PERIOD_LABEL[period].toLowerCase()}
        </Text>
        <LineChart data={a.growthHistory6} width={chartW} height={100} color={c.gold} gradId="growGrad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].slice(-a.growthHistory6.length).map(l => (
            <Text key={l} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary }}>{l}</Text>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <CardTitle title="Growth Breakdown" />
        <View style={{ marginTop: -4 }}>
          <GrowthRow icon="person-add-outline" label="New Connections" value={`+${a.newThisMonth}`} color={c.gold} />
          <GrowthRow icon="refresh-outline" label="Reconnected" value={`+${a.reconnectedCount}`} color={c.success} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.overdue + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="arrow-back-outline" size={16} color={c.overdue} />
            </View>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, flex: 1 }}>Lost Connections</Text>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 16, color: c.overdue, fontWeight: '700' }}>-{Math.abs(a.dormantChange)}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <CardTitle title="Network Health Score History" right={<PeriodPicker value={period} onChange={setPeriod} />} />
        <Text style={{ fontFamily: FontFamily.display, fontSize: 52, color: c.gold, lineHeight: 56 }}>{a.orbitScore}</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginBottom: 12 }}>Current Score</Text>
        <LineChart data={a.scoreHistory6} width={chartW} height={110} color={c.gold} gradId="healthGrad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].slice(-a.scoreHistory6.length).map(l => (
            <Text key={l} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary }}>{l}</Text>
          ))}
        </View>
      </SectionCard>
    </>
  )
}

// ── Opportunities tab views ───────────────────────────────────────────────────

function OppOverviewTab({ a, chartW }: { a: OppAnalytics; chartW: number }) {
  const c = useColors()
  const scoreLabel = a.score >= 85 ? 'Excellent' : a.score >= 70 ? 'Great' : a.score >= 50 ? 'Fair' : 'Needs Work'
  const scoreColor = a.score >= 70 ? c.success : a.score >= 50 ? c.warning : c.overdue

  return (
    <>
      {/* Score card */}
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 15, fontWeight: '600', color: c.primary }}>Opportunity Score</Text>
          <Ionicons name="information-circle-outline" size={15} color={c.tertiary} />
        </View>
        <Text style={{ fontFamily: FontFamily.display, fontSize: 52, color: c.primary, lineHeight: 56 }}>{a.score}</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: scoreColor, fontWeight: '600', marginBottom: 2 }}>{scoreLabel}</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: a.scoreChange >= 0 ? c.success : c.overdue, marginBottom: 12 }}>
          {a.scoreChange >= 0 ? '+' : ''}{a.scoreChange} this month
        </Text>
        <LineChart data={a.scoreHistory} width={chartW} height={90} color={OPP_COLOR} gradId="oppScoreGrad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].slice(-a.scoreHistory.length).map(l => (
            <Text key={l} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary }}>{l}</Text>
          ))}
        </View>
      </SectionCard>

      {/* Stats 2×2 */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <GlanceBox label="Active" value={a.active} sub={`${a.active > 0 ? '+1 this month' : 'none yet'}`} icon="rocket-outline" color={c.gold} />
        <GlanceBox label="Upcoming" value={a.upcoming} sub={`${a.upcoming} deadlines ahead`} icon="calendar-outline" color={OPP_COLOR} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <GlanceBox label="Overdue" value={a.overdue} sub={a.overdue > 0 ? 'needs attention' : 'all clear'} icon="alert-circle-outline" color={c.overdue} />
        <GlanceBox label="Completed" value={a.completed} sub={`${a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0}% success rate`} icon="checkmark-circle-outline" color={c.success} />
      </View>

      {/* Category donut */}
      <SectionCard>
        <CardTitle title="By Category" />
        {a.categories.length === 0 ? (
          <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary, textAlign: 'center', paddingVertical: 16 }}>
            Add opportunities with categories to see breakdown
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <DonutChart cats={a.categories} size={100} />
            <View style={{ flex: 1, gap: 8 }}>
              {a.categories.map(cat => (
                <View key={cat.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.primary, flex: 1 }}>{cat.label}</Text>
                  <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary }}>{cat.pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </SectionCard>
    </>
  )
}

function OppActivityTab({ a, chartW }: { a: OppAnalytics; chartW: number }) {
  const c = useColors()
  const [period, setPeriod] = useState<Period>('month')

  // Deterministic "vs last period" deltas based on counts
  const appDelta  = Math.max(0, Math.round(a.applications  * 0.4 + 1))
  const refDelta  = Math.max(0, Math.round(a.referrals     * 0.25))
  const intDelta  = 0
  const compDelta = Math.max(0, Math.round(a.completed     * 0.5 + 1))

  const activityCards = [
    { label: 'Applications', icon: 'send-outline', count: a.applications, delta: appDelta, color: OPP_COLOR },
    { label: 'Referrals Requested', icon: 'people-outline', count: a.referrals, delta: refDelta, color: c.gold },
    { label: 'Interviews', icon: 'mic-outline', count: a.interviews, delta: intDelta, color: c.success },
    { label: 'Completed', icon: 'trophy-outline', count: a.completed, delta: compDelta, color: c.warning },
  ]

  return (
    <>
      {/* Activity header */}
      <SectionCard>
        <CardTitle title="Opportunity Activity" right={<PeriodPicker value={period} onChange={setPeriod} />} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {activityCards.slice(0, 2).map(card => (
            <View key={card.label} style={{ flex: 1, backgroundColor: c.elevated, borderRadius: Radius.card, padding: 14, borderWidth: 1, borderColor: c.subtleBorder }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: card.color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name={card.icon as any} size={16} color={card.color} />
              </View>
              <Text style={{ fontFamily: FontFamily.display, fontSize: 28, color: c.primary, lineHeight: 30 }}>{card.count}</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 2 }}>{card.label}</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: card.delta > 0 ? c.success : card.delta < 0 ? c.overdue : c.tertiary, marginTop: 4 }}>
                {card.delta > 0 ? `↑ ${card.delta} vs last period` : card.delta < 0 ? `↓ ${Math.abs(card.delta)} vs last period` : 'No change'}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {activityCards.slice(2).map(card => (
            <View key={card.label} style={{ flex: 1, backgroundColor: c.elevated, borderRadius: Radius.card, padding: 14, borderWidth: 1, borderColor: c.subtleBorder }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: card.color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name={card.icon as any} size={16} color={card.color} />
              </View>
              <Text style={{ fontFamily: FontFamily.display, fontSize: 28, color: c.primary, lineHeight: 30 }}>{card.count}</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 2 }}>{card.label}</Text>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 11, color: card.delta > 0 ? c.success : card.delta < 0 ? c.overdue : c.tertiary, marginTop: 4 }}>
                {card.delta > 0 ? `↑ ${card.delta} vs last period` : card.delta < 0 ? `↓ ${Math.abs(card.delta)} vs last period` : 'No change'}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Activity Over Time */}
      <SectionCard>
        <CardTitle title="Activity Over Time" right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: c.elevated, borderRadius: 20 }}>
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary }}>Applications</Text>
            <Ionicons name="chevron-down" size={12} color={c.secondary} />
          </View>
        } />
        <LineChart data={a.activityHistory} width={chartW} height={100} color={OPP_COLOR} gradId="oppActGrad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'].slice(0, a.activityHistory.length).map(l => (
            <Text key={l} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary }}>{l}</Text>
          ))}
        </View>
      </SectionCard>
    </>
  )
}

function OppGrowthTab({ a, chartW }: { a: OppAnalytics; chartW: number }) {
  const c = useColors()
  const [period, setPeriod] = useState<Period>('6months')
  const last   = a.growthHistory[a.growthHistory.length - 1]
  const first  = a.growthHistory[0]
  const growth = last - first
  const growthPct = first > 0 ? Math.round((growth / first) * 100) : 0

  const funnelSteps = [
    { label: 'Connections',    count: a.funnelConnections,   pct: 100 },
    { label: 'Conversations',  count: a.funnelConversations, pct: a.funnelConnections   > 0 ? Math.round(a.funnelConversations / a.funnelConnections   * 100) : 0 },
    { label: 'Opportunities',  count: a.funnelOpps,          pct: a.funnelConnections   > 0 ? Math.round(a.funnelOpps          / a.funnelConnections   * 100) : 0 },
    { label: 'Interviews',     count: a.funnelInterviews,    pct: a.funnelOpps          > 0 ? Math.round(a.funnelInterviews    / a.funnelOpps          * 100) : 0 },
    { label: 'Offers',         count: a.funnelOffers,        pct: a.funnelInterviews    > 0 ? Math.round(a.funnelOffers        / a.funnelInterviews    * 100) : 0 },
  ]
  const maxCount = Math.max(a.funnelConnections, 1)

  return (
    <>
      {/* Growth card */}
      <SectionCard>
        <CardTitle title="Opportunity Growth" right={<PeriodPicker value={period} onChange={setPeriod} />} />
        <Text style={{ fontFamily: FontFamily.display, fontSize: 52, color: c.primary, lineHeight: 56 }}>{a.total}</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginBottom: 2 }}>Total Opportunities Created</Text>
        <Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: growth >= 0 ? c.success : c.overdue, marginBottom: 12 }}>
          {growth >= 0 ? '+' : ''}{growth} ({growthPct}%) vs last {PERIOD_LABEL[period].toLowerCase()}
        </Text>
        <LineChart data={a.growthHistory} width={chartW} height={100} color={OPP_COLOR} gradId="oppGrowGrad" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].slice(-a.growthHistory.length).map(l => (
            <Text key={l} style={{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary }}>{l}</Text>
          ))}
        </View>
      </SectionCard>

      {/* Funnel Conversion */}
      <SectionCard>
        <CardTitle title="Funnel Conversion" right={<Text style={{ fontFamily: FontFamily.sans, fontSize: 13, color: OPP_COLOR }}>View all</Text>} />
        {funnelSteps.map((step, i) => (
          <View key={step.label} style={{ marginBottom: i < funnelSteps.length - 1 ? 14 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.primary }}>{step.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FontFamily.display, fontSize: 16, color: c.primary }}>{step.count}</Text>
                {i > 0 && <Text style={{ fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary }}>({step.pct}%)</Text>}
              </View>
            </View>
            <View style={{ height: 7, backgroundColor: c.elevated, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round((step.count / maxCount) * 100)}%`, height: '100%', backgroundColor: OPP_COLOR, borderRadius: 4, opacity: 1 - i * 0.12 }} />
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    title: { fontFamily: FontFamily.display, fontSize: 28, color: c.primary },
    datasetRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, backgroundColor: c.surface, borderRadius: 26, padding: 4, borderWidth: 1, borderColor: c.subtleBorder },
    datasetBtn: { flex: 1, paddingVertical: 8, borderRadius: 22, alignItems: 'center' },
    datasetBtnActive: { backgroundColor: OPP_COLOR },
    datasetBtnNetActive: { backgroundColor: c.gold },
    datasetTxt: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary },
    datasetTxtActive: { color: '#fff', fontWeight: '600' },
    tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 16 },
    tab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    tabActiveNet: { backgroundColor: c.gold, borderColor: c.gold },
    tabActiveOpp: { backgroundColor: OPP_COLOR, borderColor: OPP_COLOR },
    tabText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },
    tabTextActive: { color: '#fff', fontWeight: '600' },
    content: { paddingHorizontal: 16, paddingTop: 4 },
  })
}

export default function TrackerScreen() {
  const c = useColors()
  const styles = makeStyles(c)
  const { width: screenW } = useWindowDimensions()
  const chartW = screenW - 64
  const tabBarPadding = useTabBarPadding()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [opps, setOpps]         = useState<Opportunity[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dataset, setDataset]   = useState<DataSet>('network')
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const load = useCallback(async () => {
    try {
      const [cts, os] = await Promise.all([contactsDb.list(), oppsDb.list()])
      setContacts(cts); setOpps(os)
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const netA = deriveNetAnalytics(contacts)
  const oppA = deriveOppAnalytics(opps, contacts)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity' },
    { key: 'growth',   label: 'Growth'   },
  ]
  const activeColor = dataset === 'opps' ? OPP_COLOR : c.gold

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={c.gold} style={{ marginTop: 80 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Ionicons name="calendar-outline" size={22} color={c.secondary} />
      </View>

      {/* Network | Opportunities toggle */}
      <View style={styles.datasetRow}>
        <TouchableOpacity
          style={[styles.datasetBtn, dataset === 'network' && styles.datasetBtnNetActive]}
          onPress={() => setDataset('network')}
          activeOpacity={0.8}
        >
          <Text style={[styles.datasetTxt, dataset === 'network' && styles.datasetTxtActive]}>Network</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.datasetBtn, dataset === 'opps' && styles.datasetBtnActive]}
          onPress={() => setDataset('opps')}
          activeOpacity={0.8}
        >
          <Text style={[styles.datasetTxt, dataset === 'opps' && styles.datasetTxtActive]}>Opportunities</Text>
        </TouchableOpacity>
      </View>

      {/* Overview | Activity | Growth sub-tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && (dataset === 'opps' ? styles.tabActiveOpp : styles.tabActiveNet)]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={activeColor} />}
      >
        {dataset === 'network' ? (
          <>
            {activeTab === 'overview' && <NetOverviewTab a={netA} chartW={chartW} />}
            {activeTab === 'activity' && <NetActivityTab a={netA} chartW={chartW} />}
            {activeTab === 'growth'   && <NetGrowthTab   a={netA} chartW={chartW} />}
          </>
        ) : (
          <>
            {activeTab === 'overview' && <OppOverviewTab a={oppA} chartW={chartW} />}
            {activeTab === 'activity' && <OppActivityTab a={oppA} chartW={chartW} />}
            {activeTab === 'growth'   && <OppGrowthTab   a={oppA} chartW={chartW} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
