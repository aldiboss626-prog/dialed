import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useDevPro } from '@/hooks/useDevPro'

export function usePro() {
  const { user } = useAuth()
  const router = useRouter()
  const { devProOverride } = useDevPro()

  const isPro = devProOverride || user?.tier === 'pro'

  function openUpgrade() {
    router.push('/upgrade' as any)
  }

  return { isPro, openUpgrade }
}
