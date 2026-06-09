import { Tabs } from 'expo-router'
import { FloatingTabBar } from '@/components/FloatingTabBar'

const TABS = [
  { name: 'home',          title: 'Home' },
  { name: 'orbit',         title: 'Network' },
  { name: 'opportunities', title: 'Opps' },
  { name: 'tracker',       title: 'Tracker' },
  { name: 'settings',      title: 'Settings' },
]

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title }}
        />
      ))}
    </Tabs>
  )
}
