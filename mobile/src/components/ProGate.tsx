import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { FontFamily, Radius } from '@/constants/theme'
import { usePro } from '@/hooks/usePro'

interface Props {
  feature?: string
  children: React.ReactNode
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    wrapper: { position: 'relative' },
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: c.background + 'CC',
      borderRadius: Radius.card,
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
      gap: 8,
    },
    lockIcon: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.gold + '22',
      alignItems: 'center', justifyContent: 'center',
    },
    label: {
      fontFamily: FontFamily.sansMedium, fontSize: 13,
      color: c.secondary, textAlign: 'center', paddingHorizontal: 20,
    },
    upgradeBtn: {
      marginTop: 4, paddingHorizontal: 16, paddingVertical: 7,
      backgroundColor: c.gold, borderRadius: Radius.full,
    },
    upgradeBtnText: {
      fontFamily: FontFamily.sansMedium, fontSize: 12, color: '#fff',
    },
  })
}

export function ProGate({ feature, children }: Props) {
  const { isPro, openUpgrade } = usePro()
  const c = useColors()
  const s = makeStyles(c)

  return (
    <View style={s.wrapper}>
      {children}
      {!isPro && (
        <TouchableOpacity style={s.overlay} onPress={openUpgrade} activeOpacity={0.9}>
          <View style={s.lockIcon}>
            <Ionicons name="lock-closed" size={16} color={c.gold} />
          </View>
          <Text style={s.label}>
            {feature ? `${feature} is a Pro feature` : 'Pro feature'}
          </Text>
          <View style={s.upgradeBtn}>
            <Text style={s.upgradeBtnText}>Upgrade to Pro</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  )
}
