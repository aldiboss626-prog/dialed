import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { FontFamily, Radius } from '@/constants/theme'

const MOCK_CONTACTS = [
  { name: 'Sarah Chen', role: 'Account Mgr · Google', days: 18, status: 'overdue' as const },
  { name: 'Marcus Webb', role: 'Engineering Lead', days: 11, status: 'warn' as const },
  { name: 'Priya Nair', role: 'HR / Talent', days: 4, status: 'good' as const },
  { name: 'Alex Torres', role: 'Founder', days: 1, status: 'good' as const },
]

const STATUS_COLORS = {
  overdue: '#EF4444',
  warn: '#F59E0B',
  good: '#22C55E',
}

function PhoneMockup() {
  return (
    <View style={phone.frame}>
      <View style={phone.notch} />
      <View style={phone.appBar}>
        <Text style={phone.appBarTitle}>NETWORK</Text>
        <View style={phone.badge}>
          <Text style={phone.badgeText}>1 overdue</Text>
        </View>
      </View>
      {MOCK_CONTACTS.map((c, i) => (
        <View key={i} style={phone.row}>
          <View style={[phone.dot, { backgroundColor: STATUS_COLORS[c.status] }]} />
          <View style={{ flex: 1 }}>
            <Text style={phone.name}>{c.name}</Text>
            <Text style={phone.role}>{c.role}</Text>
          </View>
          <Text style={[phone.days, { color: STATUS_COLORS[c.status] }]}>{c.days}d</Text>
        </View>
      ))}
      <View style={phone.nav}>
        {['Home', 'Network', 'Opps', 'Track'].map((label, i) => (
          <View key={i} style={phone.navItem}>
            <View style={[phone.navDot, i === 1 && phone.navDotActive]} />
            <Text style={[phone.navLabel, i === 1 && phone.navLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const phone = StyleSheet.create({
  frame: {
    width: 192,
    backgroundColor: '#0B0E1A',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 36,
    elevation: 16,
  },
  notch: {
    width: 56, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 8,
  },
  appBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  appBarTitle: {
    color: '#FFFFFF', fontSize: 10,
    fontFamily: 'DMSans-Bold', letterSpacing: 2.5,
  },
  badge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: '#EF4444', fontSize: 8, fontFamily: 'DMSans-Medium' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    gap: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  name: { color: '#F2F2F2', fontSize: 10, fontFamily: 'DMSans-Medium' },
  role: { color: 'rgba(255,255,255,0.38)', fontSize: 8, fontFamily: 'DMSans-Regular', marginTop: 1 },
  days: { fontSize: 10, fontFamily: 'DMSans-Bold' },
  nav: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 9, paddingHorizontal: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    marginTop: 2,
  },
  navItem: { alignItems: 'center', gap: 3 },
  navDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  navDotActive: { backgroundColor: '#3B82F6' },
  navLabel: { fontSize: 7, color: 'rgba(255,255,255,0.3)', fontFamily: 'DMSans-Regular' },
  navLabelActive: { color: '#3B82F6' },
})

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    inner: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 20,
      paddingBottom: 40,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    top: { alignItems: 'center', gap: 30, width: '100%' },
    wordmark: {
      fontFamily: FontFamily.display, fontSize: 13,
      color: c.gold, letterSpacing: 6,
    },
    copy: { alignItems: 'center', gap: 12 },
    headline: {
      fontFamily: FontFamily.display, fontSize: 32,
      color: c.primary, textAlign: 'center', lineHeight: 38,
    },
    subhead: {
      fontFamily: FontFamily.sans, fontSize: 15,
      color: c.secondary, textAlign: 'center', lineHeight: 23,
      paddingHorizontal: 4,
    },
    bottom: { width: '100%', gap: 14, alignItems: 'center', paddingTop: 32 },
    primaryBtn: {
      width: '100%', backgroundColor: c.primary,
      borderRadius: Radius.full, paddingVertical: 17,
      alignItems: 'center',
    },
    primaryBtnText: {
      fontFamily: FontFamily.display, fontSize: 16,
      color: c.background,
    },
    signInText: {
      fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary,
    },
    signInLink: {
      fontFamily: FontFamily.sansMedium, fontSize: 14, color: c.gold,
    },
  })
}

export default function LandingScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        <View style={s.top}>
          <Text style={s.wordmark}>DIALED</Text>
          <PhoneMockup />
          <View style={s.copy}>
            <Text style={s.headline}>Your network,{'\n'}actually maintained.</Text>
            <Text style={s.subhead}>
              Most opportunities don't come from job boards. They come from people you already know — and forgot to stay in touch with.
            </Text>
          </View>
        </View>

        <View style={s.bottom}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/onboarding' as any)}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
          <Text style={s.signInText}>
            Already have an account?{' '}
            <Text style={s.signInLink} onPress={() => router.push('/login' as any)}>
              Sign In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
