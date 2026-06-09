import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Clipboard from 'expo-clipboard'
import { FontFamily, Radius, Spacing } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'
import { TopicPageHeader } from '@/components/learn/TopicPageHeader'
import { ChallengeSection } from '@/components/learn/ChallengeSection'
import { getProgress, markFeatureUsed } from '@/lib/learnProgress'

const ACCENT = '#10B981'
const TOPIC = 'career-exposure'
const TOTAL_ITEMS = 5

const STYLES = ['Harvard Clean', 'Modern ATS', 'Creative Brief'] as const
type ResumeStyle = typeof STYLES[number]

const STATUSES = ['Researching', 'Applied', 'Interviewing', 'Offer', 'Passed'] as const
type CompanyStatus = typeof STATUSES[number]

const STATUS_COLORS: Record<CompanyStatus, string> = {
  Researching: '#6366F1',
  Applied: '#F59E0B',
  Interviewing: '#3B82F6',
  Offer: '#10B981',
  Passed: '#6B7280',
}

interface CompanyEntry {
  id: string
  name: string
  status: CompanyStatus
  plan?: { step: number; title: string; action: string }[]
  planExpanded?: boolean
}

const CHALLENGES = [
  { id: 'career-1', title: 'Add 3 companies to your pipeline', description: 'Find 3 companies you\'d genuinely want to work for and add them to your tracker.' },
  { id: 'career-2', title: 'Update your resume with one new achievement', description: 'Add a specific result or project you completed recently — with numbers if possible.' },
  { id: 'career-3', title: 'Research one company\'s culture before applying', description: 'Read their Glassdoor reviews, browse their LinkedIn, and find one thing that genuinely interests you.' },
]

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    card: {
      backgroundColor: c.surface, borderRadius: Radius.xl, padding: 20,
      marginHorizontal: Spacing.lg, marginBottom: 16,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    sectionLabel: { fontFamily: FontFamily.sans, fontSize: 13, color: c.secondary, marginHorizontal: Spacing.lg, marginBottom: 10 },
    fieldLabel: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: c.secondary, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: c.elevated, borderRadius: Radius.md, padding: 12,
      fontFamily: FontFamily.sans, fontSize: 14, color: c.primary,
    },
    styleRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
    styleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1.5 },
    styleBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
    generateBtn: {
      backgroundColor: ACCENT, borderRadius: Radius.full,
      paddingVertical: 13, alignItems: 'center', marginTop: 14,
    },
    generateBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#fff' },
    loadingBox: { height: 60, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    resumeOutput: {
      backgroundColor: c.elevated, borderRadius: Radius.md, padding: 14, marginTop: 14,
    },
    resumeText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: c.primary, lineHeight: 20 },
    copyBtn: {
      alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: Radius.full, backgroundColor: `${ACCENT}15`, marginTop: 10,
    },
    copyBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: ACCENT },
    expRow: { marginTop: 12, gap: 8 },
    expBlock: { backgroundColor: c.elevated, borderRadius: Radius.md, padding: 12, gap: 6 },
    addRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    addInput: {
      flex: 1, backgroundColor: c.elevated, borderRadius: Radius.md, padding: 12,
      fontFamily: FontFamily.sans, fontSize: 14, color: c.primary,
    },
    addBtn: {
      backgroundColor: ACCENT, borderRadius: Radius.md,
      paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    },
    addBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#fff' },
    companyRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    companyName: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: c.primary, marginBottom: 8 },
    companyMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
    statusChipText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: '#fff' },
    planBtn: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
      borderWidth: 1, borderColor: c.border,
    },
    planBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: c.secondary },
    planBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
    planStep: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    stepNumCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: `${ACCENT}20`, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
    stepNumText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: ACCENT },
    planStepTitle: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: c.primary },
    planStepAction: { fontFamily: FontFamily.sans, fontSize: 12, color: c.secondary, lineHeight: 17, marginTop: 2 },
    divider: { height: 1, backgroundColor: c.border, marginTop: 2 },
    deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: `#DC262615` },
    deleteBtnText: { fontFamily: FontFamily.sansMedium, fontSize: 11, color: '#DC2626' },
  })
}

export default function CareerExposurePage() {
  const c = useColors()
  const styles = makeStyles(c)

  // Resume builder
  const [targetRole, setTargetRole] = useState('')
  const [expLevel, setExpLevel] = useState<'Student' | 'New Grad' | '1-2yr'>('Student')
  const [experiences, setExperiences] = useState([
    { title: '', org: '', impact: '' },
    { title: '', org: '', impact: '' },
    { title: '', org: '', impact: '' },
  ])
  const [skills, setSkills] = useState(['', '', ''])
  const [resumeStyle, setResumeStyle] = useState<ResumeStyle>('Harvard Clean')
  const [generating, setGenerating] = useState(false)
  const [resumeText, setResumeText] = useState('')

  // Company pipeline
  const [companies, setCompanies] = useState<CompanyEntry[]>([])
  const [newCompany, setNewCompany] = useState('')
  const [fetchingPlan, setFetchingPlan] = useState<string | null>(null)

  const [completedCount, setCompletedCount] = useState(0)

  const refreshProgress = useCallback(async () => {
    const p = await getProgress(TOPIC)
    setCompletedCount(p.completedChallenges.length + p.featuresUsed.length)
  }, [])

  useEffect(() => { refreshProgress(); loadPipeline() }, [refreshProgress])

  async function loadPipeline() {
    try {
      const raw = await AsyncStorage.getItem('dialed_company_pipeline')
      if (raw) setCompanies(JSON.parse(raw))
    } catch {}
  }

  async function savePipeline(list: CompanyEntry[]) {
    setCompanies(list)
    AsyncStorage.setItem('dialed_company_pipeline', JSON.stringify(list)).catch(() => {})
  }

  async function generateResume() {
    if (!targetRole.trim()) { Alert.alert('Add a target role', 'Enter the role you\'re targeting.'); return }
    setGenerating(true)
    setResumeText('')
    try {
      const SERVER = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${SERVER}/api/content/resume-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          level: expLevel,
          experiences: experiences.filter(e => e.title.trim()),
          skills: skills.filter(s => s.trim()),
          style: resumeStyle,
        }),
      })
      const data = await res.json()
      const text = data.resumeText ?? ''
      setResumeText(text)
      await AsyncStorage.setItem('dialed_resume_draft', text)
      await markFeatureUsed(TOPIC, 'resume-generated')
      refreshProgress()
    } catch {
      Alert.alert('Error', 'Couldn\'t generate resume. Make sure the server is running.')
    } finally {
      setGenerating(false)
    }
  }

  async function copyResume() {
    await Clipboard.setStringAsync(resumeText)
    Alert.alert('Copied!', 'Resume text copied to clipboard.')
  }

  function updateExp(i: number, field: 'title' | 'org' | 'impact', val: string) {
    const updated = experiences.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
    setExperiences(updated)
  }

  function updateSkill(i: number, val: string) {
    setSkills(skills.map((s, idx) => idx === i ? val : s))
  }

  async function addCompany() {
    if (!newCompany.trim()) return
    const entry: CompanyEntry = { id: Date.now().toString(), name: newCompany.trim(), status: 'Researching' }
    const updated = [...companies, entry]
    await savePipeline(updated)
    setNewCompany('')
    await markFeatureUsed(TOPIC, 'company-added')
    refreshProgress()
  }

  async function cycleStatus(id: string) {
    const updated = companies.map(c => {
      if (c.id !== id) return c
      const idx = STATUSES.indexOf(c.status)
      return { ...c, status: STATUSES[(idx + 1) % STATUSES.length] }
    })
    await savePipeline(updated)
  }

  async function fetchPlan(id: string) {
    const company = companies.find(c => c.id === id)
    if (!company) return
    if (company.plan) {
      await savePipeline(companies.map(c => c.id === id ? { ...c, planExpanded: !c.planExpanded } : c))
      return
    }
    setFetchingPlan(id)
    try {
      const SERVER = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${SERVER}/api/content/company-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.name, status: company.status }),
      })
      const data = await res.json()
      await savePipeline(companies.map(c => c.id === id ? { ...c, plan: data.plan, planExpanded: true } : c))
    } catch {
      Alert.alert('Error', 'Couldn\'t generate plan. Make sure the server is running.')
    } finally {
      setFetchingPlan(null)
    }
  }

  async function deleteCompany(id: string) {
    await savePipeline(companies.filter(c => c.id !== id))
  }

  return (
    <View style={styles.screen}>
      <TopicPageHeader title="Career Exposure" accentColor={ACCENT} completedCount={completedCount} totalItems={TOTAL_ITEMS} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        {/* Resume Builder */}
        <Text style={styles.sectionLabel}>Resume builder</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Target role</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Investment Banking Analyst"
            placeholderTextColor={c.tertiary}
            value={targetRole}
            onChangeText={setTargetRole}
          />

          <Text style={styles.fieldLabel}>Experience level</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 0 }}>
            {(['Student', 'New Grad', '1-2yr'] as const).map(lv => (
              <TouchableOpacity
                key={lv}
                style={[styles.styleBtn, { borderColor: expLevel === lv ? ACCENT : c.border, backgroundColor: expLevel === lv ? `${ACCENT}15` : 'transparent', flex: 1 }]}
                onPress={() => setExpLevel(lv)}
                activeOpacity={0.7}
              >
                <Text style={[styles.styleBtnText, { color: expLevel === lv ? ACCENT : c.secondary }]}>{lv}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Experiences (up to 3)</Text>
          <View style={styles.expRow}>
            {experiences.map((exp, i) => (
              <View key={i} style={styles.expBlock}>
                <TextInput style={styles.input} placeholder={`Role / Title ${i + 1}`} placeholderTextColor={c.tertiary} value={exp.title} onChangeText={v => updateExp(i, 'title', v)} />
                <TextInput style={styles.input} placeholder="Organization / Company" placeholderTextColor={c.tertiary} value={exp.org} onChangeText={v => updateExp(i, 'org', v)} />
                <TextInput style={styles.input} placeholder="Key impact / achievement (1 line)" placeholderTextColor={c.tertiary} value={exp.impact} onChangeText={v => updateExp(i, 'impact', v)} />
              </View>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Top skills (up to 3)</Text>
          <View style={{ gap: 6, marginTop: 0 }}>
            {skills.map((s, i) => (
              <TextInput key={i} style={styles.input} placeholder={`Skill ${i + 1}`} placeholderTextColor={c.tertiary} value={s} onChangeText={v => updateSkill(i, v)} />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Style</Text>
          <View style={styles.styleRow}>
            {STYLES.map(st => (
              <TouchableOpacity
                key={st}
                style={[styles.styleBtn, { borderColor: resumeStyle === st ? ACCENT : c.border, backgroundColor: resumeStyle === st ? `${ACCENT}15` : 'transparent' }]}
                onPress={() => setResumeStyle(st)}
                activeOpacity={0.7}
              >
                <Text style={[styles.styleBtnText, { color: resumeStyle === st ? ACCENT : c.secondary }]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.generateBtn} onPress={generateResume} activeOpacity={0.85}>
            <Text style={styles.generateBtnText}>Generate resume</Text>
          </TouchableOpacity>
          {generating && <View style={styles.loadingBox}><ActivityIndicator color={ACCENT} /></View>}
          {resumeText ? (
            <View style={styles.resumeOutput}>
              <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled showsVerticalScrollIndicator>
                <Text style={styles.resumeText}>{resumeText}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.copyBtn} onPress={copyResume} activeOpacity={0.7}>
                <Text style={styles.copyBtnText}>Copy to clipboard</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Company Pipeline */}
        <Text style={styles.sectionLabel}>Company pipeline</Text>
        <View style={styles.card}>
          {companies.length === 0 && (
            <Text style={{ fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary, marginBottom: 12, textAlign: 'center' }}>
              Add companies you want to work for
            </Text>
          )}
          {companies.map((co, i) => {
            const isLast = i === companies.length - 1
            const sc = STATUS_COLORS[co.status]
            return (
              <View key={co.id} style={[styles.companyRow, isLast && { borderBottomWidth: 0 }]}>
                <Text style={styles.companyName}>{co.name}</Text>
                <View style={styles.companyMeta}>
                  <TouchableOpacity style={[styles.statusChip, { backgroundColor: sc }]} onPress={() => cycleStatus(co.id)} activeOpacity={0.7}>
                    <Text style={styles.statusChipText}>{co.status}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.planBtn}
                    onPress={() => fetchPlan(co.id)}
                    activeOpacity={0.7}
                    disabled={fetchingPlan === co.id}
                  >
                    {fetchingPlan === co.id
                      ? <ActivityIndicator size="small" color={c.secondary} style={{ width: 60 }} />
                      : <Text style={styles.planBtnText}>{co.plan ? (co.planExpanded ? 'Hide plan' : 'View plan') : 'Get plan'}</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCompany(co.id)} activeOpacity={0.7}>
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                {co.plan && co.planExpanded && (
                  <View style={styles.planBox}>
                    {co.plan.map(step => (
                      <View key={step.step} style={styles.planStep}>
                        <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>{step.step}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.planStepTitle}>{step.title}</Text>
                          <Text style={styles.planStepAction}>{step.action}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
          <View style={[styles.addRow, companies.length > 0 && { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 14 }]}>
            <TextInput
              style={styles.addInput}
              placeholder="Add a company..."
              placeholderTextColor={c.tertiary}
              value={newCompany}
              onChangeText={setNewCompany}
              returnKeyType="done"
              onSubmitEditing={addCompany}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addCompany} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Challenges */}
        <Text style={styles.sectionLabel}>Challenges</Text>
        <ChallengeSection topic={TOPIC} challenges={CHALLENGES} accentColor={ACCENT} onProgressChange={refreshProgress} />
      </ScrollView>
    </View>
  )
}
