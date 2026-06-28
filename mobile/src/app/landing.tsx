import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { FontFamily, Radius } from '@/constants/theme'
import { AnimatedPhoneDemo } from '@/components/AnimatedPhoneDemo'

export default function LandingScreen() {
  const c = useColors()
  const s = makeStyles(c)
  const router = useRouter()

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        <View style={s.top}>
          <Text style={s.wordmark}>DIALED</Text>
          <AnimatedPhoneDemo />
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
