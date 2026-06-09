import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, Modal, Platform,
  KeyboardAvoidingView, Animated, Alert, useWindowDimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTabBarPadding } from '@/components/FloatingTabBar'
import { JoySlide } from '@/components/JoySlide'
import { DatePicker } from '@/components/DatePicker'
import { ContactAvatar } from '@/components/ContactAvatar'
import { ArcProgress } from '@/components/ArcProgress'
import { LineChart } from '@/components/charts/LineChart'
import { oppsDb, contactsDb } from '@/lib/db'
import { scheduleOppReminders } from '@/lib/pushNotifications'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import type { Opportunity, Contact } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────

type Filter = 'all' | 'active' | 'upcoming' | 'overdue' | 'completed'

const CATEGORIES    = ['Career', 'Academic', 'Personal', 'Business', 'Other']
const STATUS_OPTIONS = ['Not Started', 'Applied', 'Interview', 'Active', 'Waiting', 'Completed', 'Missed']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#6B7280', 'Applied': '#3B82F6', 'Interview': '#8B5CF6',
  'Active': '#C9A84C',      'Waiting': '#D4852A', 'Completed': '#5BA882', 'Missed': '#E05252',
}
const PRIORITY_COLORS: Record<string, string> = { 'High': '#E05252', 'Medium': '#D4852A', 'Low': '#5BA882' }
const LOGO_BG = ['#3B6FE8','#22C55E','#EF4444','#F59E0B','#8B5CF6','#06B6D4','#EC4899','#F97316']

function logoColor(t: string) {
  let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) & 0xFFFF
  return LOGO_BG[Math.abs(h) % LOGO_BG.length]
}
function formatDeadline(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function deterministicHistory(current: number, periods: number, seed: number): number[] {
  const start = Math.max(5, current - 35)
  return Array.from({ length: periods }, (_, i) => {
    const t = i / Math.max(periods - 1, 1)
    const noise = ((i * seed + i * 3 + 11) % 11) - 5
    return Math.max(0, Math.min(100, Math.round(start + (current - start) * t + noise)))
  })
}
function oppScoreColor(s: number, c: ColorPalette) {
  return s >= 70 ? '#2563EB' : s >= 50 ? c.warning : c.overdue
}
function oppScoreLabel(s: number) {
  return s >= 85 ? 'Excellent' : s >= 70 ? 'Great' : s >= 50 ? 'Fair' : 'Needs Work'
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: c.background },
    header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
    title:   { fontFamily: FontFamily.display, fontSize: 32, color: c.primary },
    addBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },

    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
    chip:     { borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
    chipOn:   { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    chipOff:  { backgroundColor: 'transparent', borderColor: c.border },
    chipTxtOn:  { fontFamily: FontFamily.sans, fontSize: 13, color: '#fff', fontWeight: '600' },
    chipTxtOff: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary },

    // Score card
    scoreCard: { backgroundColor: c.surface, borderRadius: Radius.card, marginHorizontal: 16, marginBottom: 14, padding: 18, borderWidth: 1, borderColor: c.subtleBorder },
    scoreCardTitle: { fontFamily: FontFamily.display, fontSize: 18, color: c.primary, marginBottom: 16 },
    scoreCardMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    scoreDonut: { width: 130, height: 130 },
    scoreTextWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    scoreNum: { fontFamily: FontFamily.display, fontSize: 36, lineHeight: 40 },
    scoreLbl: { fontFamily: FontFamily.sans, fontSize: 13, fontWeight: '600', marginTop: 2 },
    scoreRight: { flex: 1, alignItems: 'flex-end' },
    scoreTrend: { fontFamily: FontFamily.sans, fontSize: 12, marginTop: 6 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox:  { flex: 1, backgroundColor: c.elevated, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: c.subtleBorder },
    statNum:  { fontFamily: FontFamily.display, fontSize: 20, lineHeight: 24 },
    statLbl:  { fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary, marginTop: 2, letterSpacing: 0.3 },

    // Section card
    sectionCard: { backgroundColor: c.surface, borderRadius: Radius.card, marginHorizontal: 16, marginBottom: 14, padding: 16, borderWidth: 1, borderColor: c.subtleBorder },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle:  { fontFamily: FontFamily.display, fontSize: 18, color: c.primary },
    seeAll:        { fontFamily: FontFamily.sans, fontSize: 13, color: '#2563EB' },

    // Suggested rows
    sugRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    sugRowLast:{ borderBottomWidth: 0 },
    sugContent:{ flex: 1, minWidth: 0 },
    sugName:   { fontFamily: FontFamily.display, fontSize: 15, color: c.primary },
    sugSub:    { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 2 },
    sugPillWrap: { marginTop: 5 },
    sugPill:   { alignSelf: 'flex-start', backgroundColor: '#2563EB' + '14', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#2563EB' + '33', marginTop: 5 },
    sugPillText:{ fontFamily: FontFamily.sans, fontSize: 11, color: '#2563EB' },
    sugSendBtn:{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563EB' + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

    // Deadline rows
    dlRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    dlRowLast:{ borderBottomWidth: 0 },
    dlIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    dlIconTxt:{ fontFamily: FontFamily.display, fontSize: 18 },
    dlInfo:   { flex: 1, minWidth: 0 },
    dlName:   { fontFamily: FontFamily.display, fontSize: 15, color: c.primary },
    dlDate:   { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, marginTop: 2 },
    dlBadge:  { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, flexShrink: 0 },
    dlBadgeTxt:{ fontFamily: FontFamily.sans, fontSize: 12, fontWeight: '600' },

    // Opp card (list view)
    card:       { backgroundColor: c.surface, borderRadius: Radius.card, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden' },
    cardInner:  { flexDirection: 'row', padding: 14, gap: 12 },
    logoCircle: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1 },
    logoText:   { fontFamily: FontFamily.display, fontSize: 22 },
    cardContent:{ flex: 1, minWidth: 0 },
    cardTitle:  { fontFamily: FontFamily.display, fontSize: 16, color: c.primary, marginBottom: 2 },
    cardSubtitle:{ fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginBottom: 4 },
    sourceRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sourceDot:  { width: 6, height: 6, borderRadius: 3 },
    sourceText: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    cardBottom: { gap: 6 },
    deadlineRow2:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
    deadlineTxt:{ fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary },
    pillsRow:   { flexDirection: 'row', gap: 6 },
    pill:       { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
    pillText:   { fontFamily: FontFamily.sans, fontSize: 11, fontWeight: '600' },
    cardMenu:   { padding: 4, alignSelf: 'flex-start' },

    // Completed
    completedSep:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
    completedLine: { flex: 1, height: 1, backgroundColor: c.border },
    completedLabel:{ fontFamily: FontFamily.sans, fontSize: 10, color: c.tertiary, letterSpacing: 2 },
    clearBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: c.overdue + '14', borderWidth: 1, borderColor: c.overdue + '33' },
    clearTxt:      { fontFamily: FontFamily.sans, fontSize: 10, color: c.overdue },
    completedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingVertical: 10, opacity: 0.5 },
    completedTitle:{ fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, flex: 1 },

    empty:  { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, textAlign: 'center', marginTop: 48 },

    // Undo toast
    toast:    { position: 'absolute', left: 16, right: 16, backgroundColor: c.elevated, borderRadius: Radius.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastText:{ fontFamily: FontFamily.sans, fontSize: 14, color: c.primary },
    undoBtn:  { borderWidth: 1, borderColor: '#2563EB', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
    undoTxt:  { fontFamily: FontFamily.sans, fontSize: 13, color: '#2563EB' },

    // Form modal
    formSafe:   { flex: 1, backgroundColor: c.background },
    formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    formCancel: { fontFamily: FontFamily.sans, fontSize: 15, color: '#2563EB', minWidth: 56 },
    formTitle:  { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.primary },
    formSave:   { fontFamily: FontFamily.sans, fontSize: 15, color: '#2563EB', textAlign: 'right', minWidth: 56 },
    imgPlaceholder: { marginHorizontal: 16, marginTop: 20, marginBottom: 16, height: 90, borderRadius: Radius.card, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
    imgPlaceholderText: { fontFamily: FontFamily.sans, fontSize: 13, color: c.tertiary },
    formCard:    { marginHorizontal: 16, backgroundColor: c.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: c.subtleBorder, overflow: 'hidden', marginBottom: 20 },
    formField:   { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
    formBorder:  { borderBottomWidth: 1, borderBottomColor: c.border },
    formLabel:   { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary, marginBottom: 3 },
    formInput:   { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary, paddingVertical: 0, minHeight: 22 },
    formPicker:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    formSplitRow:{ flexDirection: 'row', paddingTop: 10, paddingBottom: 10 },
    formSplitField:{ flex: 1, paddingHorizontal: 14 },
    formSplitDivider:{ width: 1, backgroundColor: c.border },
    pickerOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    pickerSheet:  { backgroundColor: c.elevated, borderTopLeftRadius: Radius.sheet, borderTopRightRadius: Radius.sheet, paddingBottom: 32 },
    pickerHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    pickerBar:    { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
    pickerTitle:  { fontFamily: FontFamily.display, fontSize: 18, color: c.primary, paddingHorizontal: 16, paddingBottom: 12 },
    pickerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    pickerRowTxt: { fontFamily: FontFamily.sans, fontSize: 15, color: c.primary },
    pickerRowSub: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary },
    searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, margin: 8, backgroundColor: c.background, borderRadius: Radius.md },
    searchInput:  { flex: 1, fontFamily: FontFamily.sans, fontSize: 14, color: c.primary },
  })
}

// ── Opp Score Card ────────────────────────────────────────────────────────────

function OppScoreCard({ opps, onFilter }: { opps: Opportunity[]; onFilter?: (f: Filter) => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  const { width } = useWindowDimensions()

  const active    = opps.filter(o => o.state === 'active').length
  const upcoming  = opps.filter(o => o.state === 'upcoming').length
  const overdue   = opps.filter(o => o.state === 'overdue').length
  const completed = opps.filter(o => o.state === 'completed').length

  const score = Math.max(0, Math.min(100, 100 - overdue * 20 - upcoming * 5))
  const sColor = oppScoreColor(score, c)
  const sLabel = oppScoreLabel(score)
  const history = deterministicHistory(score, 6, opps.length + 11)
  const trend   = score - history[history.length - 2]

  // card padding 18×2=36, screen margin 16×2=32, donut 130, gap 16
  const chartW = Math.max(60, width - 36 - 32 - 130 - 16)

  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreCardTitle}>Opportunity Score</Text>
      <View style={styles.scoreCardMain}>
        {/* Arc donut */}
        <View style={styles.scoreDonut}>
          <ArcProgress size={130} progress={score / 100} color={sColor} strokeWidth={10} />
          <View style={styles.scoreTextWrap}>
            <Text style={[styles.scoreNum, { color: c.primary }]}>{score}</Text>
            <Text style={[styles.scoreLbl, { color: sColor }]}>{sLabel}</Text>
          </View>
        </View>
        {/* Trend chart */}
        <View style={styles.scoreRight}>
          <LineChart data={history} width={chartW} height={52} color={c.success} gradId="opp-score" />
          <Text style={[styles.scoreTrend, { color: trend >= 0 ? c.success : c.overdue }]}>
            {trend >= 0 ? '+' : ''}{trend} this month
          </Text>
        </View>
      </View>
      {/* Stats — tappable to filter */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statBox} onPress={() => onFilter?.('active')} activeOpacity={0.7}>
          <Text style={[styles.statNum, { color: c.gold }]}>{active}</Text>
          <Text style={styles.statLbl}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={() => onFilter?.('upcoming')} activeOpacity={0.7}>
          <Text style={[styles.statNum, { color: c.warning }]}>{upcoming}</Text>
          <Text style={styles.statLbl}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={() => onFilter?.('overdue')} activeOpacity={0.7}>
          <Text style={[styles.statNum, { color: c.overdue }]}>{overdue}</Text>
          <Text style={styles.statLbl}>Overdue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={() => onFilter?.('completed')} activeOpacity={0.7}>
          <Text style={[styles.statNum, { color: c.success }]}>{completed}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Suggested For You ─────────────────────────────────────────────────────────

function SuggestedSection({ opps, contacts, onSeeAll }: {
  opps: Opportunity[]; contacts: Contact[]; onSeeAll: () => void
}) {
  const c = useColors()
  const styles = makeStyles(c)
  const router = useRouter()

  const suggested = [
    ...opps.filter(o => o.state === 'overdue'  && o.contact),
    ...opps.filter(o => o.state === 'upcoming' && o.contact),
  ].filter((o, i, arr) => arr.findIndex(x => x.contact?.id === o.contact?.id) === i)
   .slice(0, 3)

  if (suggested.length === 0) return null

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Suggested For You</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
      </View>
      {suggested.map((opp, i) => {
        const full = contacts.find(ct => ct.id === opp.contact?.id)
        const last = full ? `Last interaction: ${full.days_since_contact} day${full.days_since_contact !== 1 ? 's' : ''} ago` : 'Linked opportunity'
        const pill = opp.category ? `Potential ${opp.category} Opportunity` : opp.title.slice(0, 32)
        return (
          <View key={opp.id} style={[styles.sugRow, i === suggested.length - 1 && styles.sugRowLast]}>
            <ContactAvatar name={opp.contact!.name} avatarUrl={full?.avatar_url} size={44} borderRadius={22} />
            <View style={styles.sugContent}>
              <Text style={styles.sugName}>{opp.contact!.name}</Text>
              <Text style={styles.sugSub} numberOfLines={1}>{last}</Text>
              <View style={styles.sugPill}>
                <Text style={styles.sugPillText} numberOfLines={1}>{pill}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.sugSendBtn}
              onPress={() => router.push(`/contact/${opp.contact!.id}` as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane-outline" size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>
        )
      })}
    </View>
  )
}

// ── Upcoming Deadlines ────────────────────────────────────────────────────────

function UpcomingDeadlinesSection({ opps, onSeeAll }: { opps: Opportunity[]; onSeeAll: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)

  const deadlines = opps
    .filter(o => o.deadline && o.state !== 'completed')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 4)

  if (deadlines.length === 0) return null

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
      </View>
      {deadlines.map((opp, i) => {
        const days = opp.days_left
        const isLate = days !== null && days < 0
        const badgeColor = isLate ? c.overdue : days !== null && days <= 3 ? c.overdue : days !== null && days <= 7 ? c.warning : c.success
        const lc = logoColor(opp.title)
        return (
          <View key={opp.id} style={[styles.dlRow, i === deadlines.length - 1 && styles.dlRowLast]}>
            <View style={[styles.dlIcon, { backgroundColor: lc + '18' }]}>
              <Text style={[styles.dlIconTxt, { color: lc }]}>{opp.title[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.dlInfo}>
              <Text style={styles.dlName} numberOfLines={1}>{opp.title}</Text>
              <Text style={styles.dlDate}>{formatDeadline(opp.deadline)}</Text>
            </View>
            {days !== null && (
              <View style={[styles.dlBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '44' }]}>
                <Text style={[styles.dlBadgeTxt, { color: badgeColor }]}>
                  {isLate ? `${Math.abs(days)}d late` : `${days} days`}
                </Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ── OppCard (list view) ───────────────────────────────────────────────────────

function OppCard({ opp, onPress, onMenuPress }: { opp: Opportunity; onPress: () => void; onMenuPress: () => void }) {
  const c = useColors()
  const styles = makeStyles(c)
  const color = logoColor(opp.title)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardInner}>
        <View style={[styles.logoCircle, { backgroundColor: color + '18', borderColor: color + '44' }]}>
          <Text style={[styles.logoText, { color }]}>{opp.title.trim()[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={1}>{opp.title}</Text>
            <TouchableOpacity onPress={onMenuPress} style={styles.cardMenu} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={16} color={c.tertiary} />
            </TouchableOpacity>
          </View>
          {!!opp.notes && <Text style={styles.cardSubtitle} numberOfLines={1}>{opp.notes}</Text>}
          {opp.contact && (
            <View style={styles.sourceRow}>
              <View style={[styles.sourceDot, { backgroundColor: color }]} />
              <Text style={styles.sourceText}>Sources: {opp.contact.name}</Text>
            </View>
          )}
          <View style={styles.cardBottom}>
            {opp.deadline && (
              <View style={styles.deadlineRow2}>
                <Ionicons name="calendar-outline" size={11} color={c.tertiary} />
                <Text style={styles.deadlineTxt}>{formatDeadline(opp.deadline)}</Text>
              </View>
            )}
            <View style={styles.pillsRow}>
              <View style={[styles.pill, { backgroundColor: (STATUS_COLORS[opp.status] ?? c.secondary) + '18', borderColor: (STATUS_COLORS[opp.status] ?? c.secondary) + '44' }]}>
                <Text style={[styles.pillText, { color: STATUS_COLORS[opp.status] ?? c.secondary }]}>{opp.status}</Text>
              </View>
              {!!opp.priority && (
                <View style={[styles.pill, { backgroundColor: (PRIORITY_COLORS[opp.priority] ?? c.secondary) + '18', borderColor: (PRIORITY_COLORS[opp.priority] ?? c.secondary) + '44' }]}>
                  <Text style={[styles.pillText, { color: PRIORITY_COLORS[opp.priority] ?? c.secondary }]}>{opp.priority}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Picker sheet ──────────────────────────────────────────────────────────────

function PickerSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string; options: string[]; selected: string; onSelect: (v: string) => void; onClose: () => void
}) {
  const c = useColors(); const styles = makeStyles(c)
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle}><View style={styles.pickerBar} /></View>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView bounces={false}>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={styles.pickerRow} onPress={() => { onSelect(opt); onClose() }} activeOpacity={0.7}>
                <Text style={styles.pickerRowTxt}>{opt}</Text>
                {selected === opt && <Ionicons name="checkmark" size={18} color="#2563EB" />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ── Contact picker ────────────────────────────────────────────────────────────

function ContactPicker({ visible, contacts, selected, onSelect, onClose }: {
  visible: boolean; contacts: Contact[]; selected: number | null; onSelect: (id: number | null) => void; onClose: () => void
}) {
  const c = useColors(); const styles = makeStyles(c)
  const [q, setQ] = useState('')
  const filtered = q ? contacts.filter(ct => ct.name.toLowerCase().includes(q.toLowerCase())) : contacts
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.pickerSheet, { maxHeight: '75%' }]}>
          <View style={styles.pickerHandle}><View style={styles.pickerBar} /></View>
          <Text style={styles.pickerTitle}>Source (Person)</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={15} color={c.tertiary} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search your network…" placeholderTextColor={c.tertiary} style={styles.searchInput} autoFocus />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <TouchableOpacity style={styles.pickerRow} onPress={() => { onSelect(null); onClose() }} activeOpacity={0.7}>
              <Text style={[styles.pickerRowTxt, { color: c.tertiary }]}>None</Text>
              {selected === null && <Ionicons name="checkmark" size={18} color="#2563EB" />}
            </TouchableOpacity>
            {filtered.map(ct => (
              <TouchableOpacity key={ct.id} style={styles.pickerRow} onPress={() => { onSelect(ct.id); onClose() }} activeOpacity={0.7}>
                <View>
                  <Text style={styles.pickerRowTxt}>{ct.name}</Text>
                  {!!ct.role && <Text style={styles.pickerRowSub}>{ct.role}</Text>}
                </View>
                {selected === ct.id && <Ionicons name="checkmark" size={18} color="#2563EB" />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormData { title: string; category: string; contact_id?: number; deadline?: string; status: string; priority: string; notes?: string }

function OppFormModal({ visible, contacts, initial, isEdit, onSubmit, onClose }: {
  visible: boolean; contacts: Contact[]; initial?: Partial<Opportunity>; isEdit?: boolean; onSubmit: (d: FormData) => Promise<void>; onClose: () => void
}) {
  const c = useColors(); const styles = makeStyles(c)
  const insets = useSafeAreaInsets()

  const [title, setTitle]     = useState('')
  const [category, setCategory] = useState('Career')
  const [contactId, setContactId] = useState<number | null>(null)
  const [deadline, setDeadline] = useState('')
  const [status, setStatus]   = useState('Not Started')
  const [priority, setPriority] = useState('Medium')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [statusOpen, setStatusOpen]   = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '')
      setCategory((initial as any)?.category ?? 'Career')
      setContactId(initial?.contact_id ?? null)
      setDeadline(initial?.deadline?.slice(0, 10) ?? '')
      setStatus(initial?.status ?? 'Not Started')
      setPriority((initial as any)?.priority ?? 'Medium')
      setNotes(initial?.notes ?? '')
      setLoading(false)
    }
  }, [visible])

  const selectedContact = contacts.find(ct => ct.id === contactId)

  async function submit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      await onSubmit({ title: title.trim(), category, contact_id: contactId ?? undefined, deadline: deadline || undefined, status, priority, notes: notes.trim() || undefined })
      onClose()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong.')
    } finally { setLoading(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={styles.formSafe} edges={['top', 'bottom']}>
        <View style={[styles.formHeader, { paddingTop: Platform.OS === 'android' ? insets.top + 8 : 14 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}><Text style={styles.formCancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.formTitle}>{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</Text>
          <TouchableOpacity onPress={submit} disabled={loading || !title.trim()} activeOpacity={0.7}>
            {loading ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={[styles.formSave, !title.trim() && { opacity: 0.35 }]}>Save</Text>}
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.imgPlaceholder} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={28} color={c.tertiary} />
              <Text style={styles.imgPlaceholderText}>Add logo or image</Text>
            </TouchableOpacity>
            <View style={styles.formCard}>
              <View style={[styles.formField, styles.formBorder]}>
                <Text style={styles.formLabel}>Opportunity Name</Text>
                <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Google Summer Internship" placeholderTextColor={c.tertiary} style={styles.formInput} returnKeyType="next" />
              </View>
              <TouchableOpacity style={[styles.formField, styles.formBorder]} onPress={() => setCatOpen(true)} activeOpacity={0.7}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.formPicker}><Text style={styles.formInput}>{category}</Text><Ionicons name="chevron-down" size={14} color={c.tertiary} /></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formField, styles.formBorder]} onPress={() => setContactOpen(true)} activeOpacity={0.7}>
                <Text style={styles.formLabel}>Source (Person)</Text>
                <View style={styles.formPicker}>
                  <Text style={[styles.formInput, !selectedContact && { color: c.tertiary }]} numberOfLines={1}>{selectedContact ? selectedContact.name : 'Search your network…'}</Text>
                  <Ionicons name="chevron-down" size={14} color={c.tertiary} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formField, styles.formBorder]} onPress={() => setDateOpen(true)} activeOpacity={0.7}>
                <Text style={styles.formLabel}>Deadline</Text>
                <View style={styles.formPicker}>
                  <Text style={[styles.formInput, !deadline && { color: c.tertiary }]}>{deadline || 'Select date'}</Text>
                  <Ionicons name="calendar-outline" size={14} color={c.tertiary} />
                </View>
              </TouchableOpacity>
              <View style={[styles.formSplitRow, styles.formBorder]}>
                <TouchableOpacity style={styles.formSplitField} onPress={() => setStatusOpen(true)} activeOpacity={0.7}>
                  <Text style={styles.formLabel}>Status</Text>
                  <View style={styles.formPicker}><Text style={[styles.formInput, { flex: 1 }]} numberOfLines={1}>{status}</Text><Ionicons name="chevron-down" size={14} color={c.tertiary} /></View>
                </TouchableOpacity>
                <View style={styles.formSplitDivider} />
                <TouchableOpacity style={styles.formSplitField} onPress={() => setPriorityOpen(true)} activeOpacity={0.7}>
                  <Text style={styles.formLabel}>Priority</Text>
                  <View style={styles.formPicker}><Text style={[styles.formInput, { flex: 1 }]}>{priority}</Text><Ionicons name="chevron-down" size={14} color={c.tertiary} /></View>
                </TouchableOpacity>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput value={notes} onChangeText={setNotes} placeholder="Add notes about this opportunity…" placeholderTextColor={c.tertiary} style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]} multiline />
              </View>
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
        <PickerSheet visible={catOpen} title="Category" options={CATEGORIES} selected={category} onSelect={setCategory} onClose={() => setCatOpen(false)} />
        <PickerSheet visible={statusOpen} title="Status" options={STATUS_OPTIONS} selected={status} onSelect={setStatus} onClose={() => setStatusOpen(false)} />
        <PickerSheet visible={priorityOpen} title="Priority" options={PRIORITY_OPTIONS} selected={priority} onSelect={setPriority} onClose={() => setPriorityOpen(false)} />
        <ContactPicker visible={contactOpen} contacts={contacts} selected={contactId} onSelect={setContactId} onClose={() => setContactOpen(false)} />
        <DatePicker visible={dateOpen} value={deadline} onChange={setDeadline} onClose={() => setDateOpen(false)} label="DEADLINE" />
      </SafeAreaView>
    </Modal>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OpportunitiesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>()
  const c = useColors()
  const styles = makeStyles(c)
  const tabBarPadding = useTabBarPadding()

  const [opps, setOpps]         = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter]     = useState<Filter>('all')
  const [addOpen, setAddOpen]   = useState(false)
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  const [pending, setPending]   = useState<{ id: number; prev: Opportunity; countdown: number } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const undoOpacity  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const f = params.filter
    if (f && ['all','active','upcoming','overdue','completed'].includes(f)) setFilter(f as Filter)
  }, [params.filter])

  const loadData = useCallback(async () => {
    try {
      const [o, cts] = await Promise.all([oppsDb.list(fresh => setOpps(fresh)), contactsDb.list()])
      setOpps(o); setContacts(cts)
      scheduleOppReminders(o).catch(() => {})
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function onRefresh() { setRefreshing(true); loadData() }

  function startUndo(id: number, prev: Opportunity) {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current)
    setOpps(list => list.map(o => o.id === id ? { ...o, state: 'completed' as const, status: 'Completed' as const } : o))
    setPending({ id, prev, countdown: 5 })
    setShowCelebration(true)
    Animated.timing(undoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    let count = 5
    undoTimerRef.current = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(undoTimerRef.current!); undoTimerRef.current = null
        oppsDb.update(id, { status: 'Completed' }).then(u => setOpps(list => list.map(o => o.id === id ? u : o)))
        Animated.timing(undoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setPending(null))
      } else { setPending(p => p ? { ...p, countdown: count } : null) }
    }, 1000)
  }

  function handleUndo() {
    if (!pending || !undoTimerRef.current) return
    clearInterval(undoTimerRef.current); undoTimerRef.current = null
    setOpps(list => list.map(o => o.id === pending.id ? pending.prev : o))
    Animated.timing(undoOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setPending(null))
  }

  function openMenu(opp: Opportunity) {
    Alert.alert(opp.title, undefined, [
      { text: 'Edit', onPress: () => setEditingOpp(opp) },
      opp.state !== 'completed'
        ? { text: 'Mark Done', onPress: () => startUndo(opp.id, opp) }
        : { text: 'Reopen', onPress: async () => { const u = await oppsDb.update(opp.id, { status: 'Active' }); setOpps(p => p.map(o => o.id === opp.id ? u : o)) } },
      { text: 'Mark Missed', style: 'destructive', onPress: async () => { const u = await oppsDb.update(opp.id, { status: 'Missed' }); setOpps(p => p.map(o => o.id === opp.id ? u : o)) } },
      { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete', `Remove "${opp.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await oppsDb.delete(opp.id); setOpps(p => p.filter(o => o.id !== opp.id)) } }]) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function handleAdd(data: FormData) {
    const opp = await oppsDb.create({ title: data.title, contact_id: data.contact_id, status: data.status as any, deadline: data.deadline, notes: data.notes, priority: data.priority as any, category: data.category as any })
    setOpps(prev => [opp, ...prev])
  }

  async function handleEdit(data: FormData) {
    if (!editingOpp) return
    const updated = await oppsDb.update(editingOpp.id, { title: data.title, contact_id: data.contact_id, status: data.status as any, deadline: data.deadline, notes: data.notes, priority: data.priority as any, category: data.category as any })
    setOpps(prev => prev.map(o => o.id === editingOpp.id ? updated : o))
    setEditingOpp(null)
  }

  async function clearCompleted() {
    const done = opps.filter(o => o.state === 'completed')
    if (!done.length) return
    Alert.alert('Clear completed', `Remove ${done.length} completed opportunit${done.length === 1 ? 'y' : 'ies'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: async () => { await Promise.all(done.map(o => oppsDb.delete(o.id))); setOpps(p => p.filter(o => o.state !== 'completed')) } },
    ])
  }

  // ── Derived counts for chips ──────────────────────────────────────────────

  const activeOpps    = opps.filter(o => o.state === 'active')
  const upcomingOpps  = opps.filter(o => o.state === 'upcoming')
  const overdueOpps   = opps.filter(o => o.state === 'overdue')
  const completedOpps = opps.filter(o => o.state === 'completed')

  const CHIPS: { key: Filter; label: string; count: number }[] = [
    { key: 'all',       label: 'All',       count: opps.length },
    { key: 'active',    label: 'Active',    count: activeOpps.length + upcomingOpps.length },
    { key: 'upcoming',  label: 'Upcoming',  count: upcomingOpps.length },
    { key: 'overdue',   label: 'Overdue',   count: overdueOpps.length },
    { key: 'completed', label: 'Completed', count: completedOpps.length },
  ]

  const nonCompleted = filter === 'all' ? opps.filter(o => o.state !== 'completed')
    : filter === 'active'    ? [...activeOpps, ...upcomingOpps]
    : filter === 'upcoming'  ? upcomingOpps
    : filter === 'overdue'   ? overdueOpps
    : []
  const completedVisible = (filter === 'all' || filter === 'completed') ? completedOpps : []

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Opportunities</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filterRow}>
        {CHIPS.map(ch => {
          const on = filter === ch.key
          return (
            <TouchableOpacity key={ch.key} style={[styles.chip, on ? styles.chipOn : styles.chipOff]} onPress={() => setFilter(ch.key)} activeOpacity={0.75}>
              <Text style={on ? styles.chipTxtOn : styles.chipTxtOff}>{ch.label} {ch.count}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={c.gold} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
        >
          {filter === 'all' ? (
            // ── Dashboard view ────────────────────────────────────────────
            <>
              <OppScoreCard opps={opps} onFilter={setFilter} />
              <SuggestedSection opps={opps} contacts={contacts} onSeeAll={() => setFilter('overdue')} />
              <UpcomingDeadlinesSection opps={opps} onSeeAll={() => setFilter('upcoming')} />
              {opps.length === 0 && <Text style={styles.empty}>Add your first opportunity to get started.</Text>}
            </>
          ) : (
            // ── List view ─────────────────────────────────────────────────
            <>
              {nonCompleted.length === 0 && completedVisible.length === 0 ? (
                <Text style={styles.empty}>No opportunities here.</Text>
              ) : (
                <>
                  {nonCompleted.map(opp => (
                    <OppCard key={opp.id} opp={opp} onPress={() => setEditingOpp(opp)} onMenuPress={() => openMenu(opp)} />
                  ))}
                  {completedVisible.length > 0 && (
                    <>
                      <View style={styles.completedSep}>
                        <View style={styles.completedLine} />
                        <Text style={styles.completedLabel}>COMPLETED</Text>
                        <View style={styles.completedLine} />
                        <TouchableOpacity style={styles.clearBtn} onPress={clearCompleted} activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={10} color={c.overdue} />
                          <Text style={styles.clearTxt}>Clear</Text>
                        </TouchableOpacity>
                      </View>
                      {completedVisible.map(opp => (
                        <View key={opp.id} style={styles.completedCard}>
                          <Ionicons name="checkmark-circle" size={16} color={c.success} />
                          <Text style={styles.completedTitle} numberOfLines={1}>{opp.title}</Text>
                          {opp.deadline && <Text style={styles.cardSubtitle}>{formatDeadline(opp.deadline)}</Text>}
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
          <View style={{ height: tabBarPadding + 16 }} />
        </ScrollView>
      )}

      {/* Undo toast */}
      {pending && (
        <Animated.View style={[styles.toast, { opacity: undoOpacity, bottom: tabBarPadding + 8 }]}>
          <Text style={styles.toastText}>Marked as done · {pending.countdown}s</Text>
          <TouchableOpacity onPress={handleUndo} activeOpacity={0.7} style={styles.undoBtn}>
            <Text style={styles.undoTxt}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <JoySlide visible={showCelebration} onDone={() => setShowCelebration(false)} />

      <OppFormModal visible={addOpen} contacts={contacts} onSubmit={handleAdd} onClose={() => setAddOpen(false)} />
      <OppFormModal visible={!!editingOpp} contacts={contacts} initial={editingOpp ?? undefined} isEdit onSubmit={handleEdit} onClose={() => setEditingOpp(null)} />
    </SafeAreaView>
  )
}
