import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      {/* orbit / opportunities / tracker kept as files but not exposed in UI */}
      <Tabs.Screen name="orbit" options={{ href: null }} />
      <Tabs.Screen name="opportunities" options={{ href: null }} />
      <Tabs.Screen name="tracker" options={{ href: null }} />
    </Tabs>
  )
}
