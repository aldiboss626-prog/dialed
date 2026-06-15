import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { FontFamily } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function makeStyles(c: ColorPalette, size: number, borderRadius: number) {
  return StyleSheet.create({
    wrap: {
      width: size, height: size, borderRadius,
      overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.gold + '20',
    },
    image: { width: size, height: size },
    initialsText: {
      fontFamily: FontFamily.display,
      fontSize: size * 0.33,
      color: c.gold,
    },
    cameraOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: size * 0.32,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center', justifyContent: 'center',
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center', justifyContent: 'center',
    },
  })
}

interface Props {
  name: string
  avatarUrl?: string | null
  size?: number
  borderRadius?: number
  /** Solid background color for the initials circle (e.g. relationship type color) */
  bgColor?: string
  /** Show a camera icon overlay + make tappable */
  editable?: boolean
  uploading?: boolean
  onPress?: () => void
}

export function ContactAvatar({
  name,
  avatarUrl,
  size = 56,
  borderRadius = 14,
  bgColor,
  editable = false,
  uploading = false,
  onPress,
}: Props) {
  const c = useColors()
  const styles = makeStyles(c, size, borderRadius)

  const bg = bgColor ?? (c.gold + '20')
  const textColor = bgColor ? '#fff' : c.gold

  const inner = (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text style={[styles.initialsText, { color: textColor }]}>{initials(name)}</Text>
      )}

      {editable && !uploading && (
        <View style={styles.cameraOverlay}>
          <Ionicons name="camera" size={size * 0.18} color="#fff" />
        </View>
      )}

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </View>
  )

  if (editable || onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    )
  }
  return inner
}
