import { View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useColors } from '@/hooks/use-theme'

export default function Index() {
  const { user, loading } = useAuth()
  const c = useColors()
  if (loading) return <View style={{ flex: 1, backgroundColor: c.background }} />
  return <Redirect href={user ? '/(tabs)/home' : '/login'} />
}
