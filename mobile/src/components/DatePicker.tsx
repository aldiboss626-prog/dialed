import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { FontFamily, Radius } from '@/constants/theme'
import { useColors } from '@/hooks/use-theme'
import type { ColorPalette } from '@/hooks/use-theme'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseYMD(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number)
  return [y, m - 1, d]
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    card: {
      backgroundColor: c.elevated, borderRadius: Radius.sheet,
      padding: 20, width: 320,
      borderWidth: 1, borderColor: c.subtleBorder,
    },
    label: {
      fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary,
      letterSpacing: 2, marginBottom: 14, textAlign: 'center',
    },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    navArrow: { fontFamily: FontFamily.display, fontSize: 28, color: c.gold, lineHeight: 30 },
    monthYear: { fontFamily: FontFamily.display, fontSize: 20, color: c.primary },
    dowRow: { flexDirection: 'row', marginBottom: 6 },
    row: { flexDirection: 'row', marginBottom: 2 },
    cell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    selectedCell: { backgroundColor: c.gold },
    dowText: { fontFamily: FontFamily.sans, fontSize: 11, color: c.tertiary },
    dayText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.primary },
    selectedDayText: { color: c.background, fontWeight: '700' },
    cancelBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
    cancelText: { fontFamily: FontFamily.sans, fontSize: 14, color: c.tertiary },
  })
}

interface Props {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  visible: boolean
  onClose: () => void
  label?: string
}

export function DatePicker({ value, onChange, visible, onClose, label }: Props) {
  const c = useColors()
  const s = makeStyles(c)
  const [selY, selM, selD] = value ? parseYMD(value) : [new Date().getFullYear(), new Date().getMonth(), new Date().getDate()]
  const [viewYear, setViewYear] = useState(selY)
  const [viewMonth, setViewMonth] = useState(selM)

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(d: number) {
    onChange(toYMD(viewYear, viewMonth, d))
    onClose()
  }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startDow = firstDayOfMonth(viewYear, viewMonth)
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card}>
          {label && <Text style={s.label}>{label}</Text>}

          <View style={s.nav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
              <Text style={s.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={s.monthYear}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn} activeOpacity={0.7}>
              <Text style={s.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.dowRow}>
            {DOW.map(d => (
              <View key={d} style={s.cell}>
                <Text style={s.dowText}>{d}</Text>
              </View>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {Array.from({ length: 7 }).map((_, ci) => {
                const day = row[ci] ?? null
                const isSelected = day !== null && toYMD(viewYear, viewMonth, day) === value
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[s.cell, isSelected && s.selectedCell]}
                    onPress={() => day && selectDay(day)}
                    activeOpacity={day ? 0.7 : 1}
                    disabled={!day}
                  >
                    {day ? (
                      <Text style={[s.dayText, isSelected && s.selectedDayText]}>{day}</Text>
                    ) : null}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}

          <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
