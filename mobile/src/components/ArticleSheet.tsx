import { useState, useEffect } from 'react'
import {
  View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { generateArticle } from '@/lib/contentApi'
import type { Article, ArticleTopic } from '@/lib/contentApi'

const TOPIC_LABELS: Record<ArticleTopic, string> = {
  'networking-101': 'Networking 101',
  'workplace-etiquette': 'Workplace Etiquette',
  'coffee-dates': 'Coffee Dates',
  'career-exposure': 'Career Exposure',
  'dealing-with-authority': 'Dealing with Authority',
  'linkedin-tips': 'LinkedIn Tips',
}

const TOPIC_COLORS: Record<ArticleTopic, string> = {
  'networking-101': '#3B82F6',
  'workplace-etiquette': '#8B5CF6',
  'coffee-dates': '#F59E0B',
  'career-exposure': '#10B981',
  'dealing-with-authority': '#EF4444',
  'linkedin-tips': '#0EA5E9',
}

interface Props {
  visible: boolean
  topic: ArticleTopic
  title?: string
  onClose: () => void
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: c.background, borderTopLeftRadius: 28,
      borderTopRightRadius: 28, maxHeight: '92%',
    },
    handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg, paddingBottom: 12,
    },
    topicChip: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    },
    topicChipText: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center',
    },
    closeText: { fontFamily: FontFamily.sans, fontSize: 16, color: c.secondary, lineHeight: 20 },
    scroll: { paddingHorizontal: Spacing.lg },
    skeletonLine: { height: 14, borderRadius: 6, backgroundColor: c.elevated, marginBottom: 10 },
    title: { fontFamily: FontFamily.display, fontSize: 26, color: c.primary, lineHeight: 32, marginBottom: 16 },
    body: { fontFamily: FontFamily.sans, fontSize: 15, color: c.secondary, lineHeight: 24, marginBottom: 14 },
    tipBox: {
      backgroundColor: `${c.gold}18`, borderLeftWidth: 3, borderLeftColor: c.gold,
      borderRadius: Radius.md, padding: 14, marginTop: 8, marginBottom: 24,
    },
    tipLabel: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: c.gold, marginBottom: 6, letterSpacing: 1 },
    tipText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.primary, lineHeight: 21 },
    doneBtn: {
      backgroundColor: c.primary, borderRadius: Radius.full,
      paddingVertical: 16, alignItems: 'center', margin: Spacing.lg,
    },
    doneBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 16, color: c.surface },
  })
}

function SkeletonLines({ c }: { c: ColorPalette }) {
  const styles = makeStyles(c)
  return (
    <View style={{ paddingTop: 24 }}>
      <View style={[styles.skeletonLine, { width: '80%', height: 26, marginBottom: 20 }]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, { width: '95%' }]} />
      <View style={[styles.skeletonLine, { width: '88%', marginBottom: 20 }]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
      <View style={[styles.skeletonLine, { width: '90%' }]} />
      <View style={[styles.skeletonLine, { width: '75%' }]} />
    </View>
  )
}

export function ArticleSheet({ visible, topic, title, onClose }: Props) {
  const c = useColors()
  const styles = makeStyles(c)
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const topicColor = TOPIC_COLORS[topic]

  useEffect(() => {
    if (!visible) return
    setError(false)

    const cacheKey = `dialed_article_${topic}_${(title ?? 'general').replace(/\s+/g, '_').slice(0, 30)}`

    async function load() {
      try {
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached) {
          const { data, ts } = JSON.parse(cached)
          const age = Date.now() - ts
          if (age < 7 * 24 * 3600 * 1000) { setArticle(data); return }
        }
      } catch {}

      setLoading(true)
      try {
        const data = await generateArticle(topic, title)
        setArticle(data)
        AsyncStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })).catch(() => {})
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [visible, topic, title])

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <View style={styles.header}>
            <View style={[styles.topicChip, { backgroundColor: `${topicColor}18` }]}>
              <Text style={[styles.topicChipText, { color: topicColor }]}>
                {TOPIC_LABELS[topic]}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {loading && <SkeletonLines c={c} />}
            {error && (
              <Text style={[styles.body, { marginTop: 24, textAlign: 'center' }]}>
                Couldn't load article. Check your connection.
              </Text>
            )}
            {article && !loading && (
              <>
                <Text style={styles.title}>{article.title}</Text>
                <Text style={styles.body}>{article.intro}</Text>
                <Text style={styles.body}>{article.body}</Text>
                <View style={styles.tipBox}>
                  <Text style={styles.tipLabel}>PRACTICAL TIP</Text>
                  <Text style={styles.tipText}>{article.practicalTip}</Text>
                </View>
              </>
            )}
            <View style={{ height: 8 }} />
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
