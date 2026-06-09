import { useEffect } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'

import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import {
  CormorantGaramond_700Bold,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/ThemeContext'
import { GlobalActionsOverlay } from '@/components/GlobalActions'

SplashScreen.preventAutoHideAsync()

// Show notifications as alerts + play sound even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
    'CormorantGaramond-Bold': CormorantGaramond_700Bold,
    'CormorantGaramond-SemiBold': CormorantGaramond_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, stackAnimation: 'ios_from_right' }}>
              <Stack.Screen name="(tabs)" options={{ stackAnimation: 'fade' }} />
              <Stack.Screen name="login" options={{ stackAnimation: 'fade' }} />
              <Stack.Screen name="contact/[id]" options={{ stackAnimation: 'ios_from_right' }} />
            </Stack>
            <GlobalActionsOverlay />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
