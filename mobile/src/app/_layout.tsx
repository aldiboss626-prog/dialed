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
import { DevProProvider } from '@/hooks/useDevPro'
import { GlobalActionsOverlay } from '@/components/GlobalActions'

SplashScreen.preventAutoHideAsync()

// Show notifications as alerts + play sound even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
        <DevProProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="landing" options={{ animation: 'fade' }} />
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="contact/[id]" options={{ animation: 'ios_from_right' }} />
              <Stack.Screen name="reply" options={{ animation: 'ios_from_right', gestureEnabled: true }} />
              <Stack.Screen name="search" options={{ animation: 'ios_from_right' }} />
              <Stack.Screen name="profile" options={{ animation: 'ios_from_right', gestureEnabled: true }} />
              <Stack.Screen name="settings" options={{ animation: 'ios_from_right', gestureEnabled: true }} />
              <Stack.Screen name="upgrade" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="mascot-demo" options={{ animation: 'ios_from_right', gestureEnabled: true }} />
              <Stack.Screen name="inbox-settings" options={{ animation: 'ios_from_right', gestureEnabled: true }} />
              <Stack.Screen name="permissions" options={{ animation: 'fade', gestureEnabled: false }} />
            </Stack>
            <GlobalActionsOverlay />
          </View>
        </AuthProvider>
        </DevProProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
