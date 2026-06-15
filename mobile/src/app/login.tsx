import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ONBOARDED_KEY } from '@/app/onboarding'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    kav: { flex: 1 },
    inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.lg },
    header: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    wordmark: { fontFamily: FontFamily.display, fontSize: 52, color: c.gold, letterSpacing: 10 },
    tagline: { fontFamily: FontFamily.sans, fontSize: 14, color: c.secondary, textAlign: 'center' },
    modeToggle: {
      flexDirection: 'row', backgroundColor: c.surface,
      borderRadius: Radius.card, padding: 4,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.md },
    modeBtnActive: { backgroundColor: c.elevated },
    modeBtnText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary },
    modeBtnTextActive: { color: c.primary },
    form: { gap: Spacing.sm },
    input: {
      backgroundColor: c.surface, borderRadius: Radius.card,
      paddingHorizontal: Spacing.md, paddingVertical: 16,
      fontFamily: FontFamily.sans, fontSize: 16, color: c.primary,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    btn: {
      backgroundColor: c.gold, borderRadius: Radius.card,
      paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xs,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.background },
    demo: { fontFamily: FontFamily.sans, fontSize: 12, color: c.tertiary, textAlign: 'center' },
  })
}

export default function LoginScreen() {
  const { login } = useAuth()
  const router = useRouter()
  const c = useColors()
  const styles = makeStyles(c)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password) return
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Name required', 'Please enter your name.')
      return
    }
    setLoading(true)
    try {
      const isNewUser = mode === 'register'
      if (isNewUser) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        })
        if (error) throw new Error(error.message)
      }
      await login(email.trim(), password)
      if (isNewUser) {
        router.replace('/permissions' as any)
      } else {
        const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY)
        router.replace(onboarded ? '/(tabs)/home?welcome=1' : '/onboarding')
      }
    } catch (err: unknown) {
      Alert.alert(
        mode === 'register' ? 'Registration failed' : 'Login failed',
        err instanceof Error ? err.message : 'Please check your details and try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.wordmark}>DIALED</Text>
            <Text style={styles.tagline}>Who in your network is going cold?</Text>
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => setMode('login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
              onPress={() => setMode('register')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={c.tertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={c.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={c.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? (mode === 'register' ? 'Creating…' : 'Signing in…') : (mode === 'register' ? 'Create Account' : 'Sign In')}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
