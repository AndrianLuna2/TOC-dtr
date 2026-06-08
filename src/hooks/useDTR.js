import { useState, useEffect, useCallback, useRef } from 'react'
import { dtrService } from '@/lib/dtrService'
import { calcRowMinutes, todayISO, currentMonth } from '@/lib/timeUtils'
import { getDaysInMonth, getDay, format } from 'date-fns'
import toast from 'react-hot-toast'

const AUTOSAVE_DELAY = 1500 // ms after last change before saving

export function useDTR(studentId, month) {
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const timerRef = useRef(null)

  const fetchRows = useCallback(async () => {
    if (!studentId || !month) { setRows([]); return }
    setLoading(true)
    try {
      const data = await dtrService.getByStudentMonth(studentId, month)
      setRows(data.map(r => ({ ...r, _dirty: false })))
    } catch (err) {
      toast.error('Failed to load DTR: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [studentId, month])

  useEffect(() => { fetchRows() }, [fetchRows])

  // ── Auto-save: fires AUTOSAVE_DELAY ms after the last dirty change ──
  const scheduleSave = useCallback((updatedRows) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const dirty = updatedRows.filter(r => r._dirty)
      if (!dirty.length) return
      setSaving(true)
      try {
        const payload = dirty.map(r => ({
          ...(r.id ? { id: r.id } : {}),
          student_id: r.student_id,
          date:   r.date,
          am_in:  r.am_in  || null,
          am_out: r.am_out || null,
          pm_in:  r.pm_in  || null,
          pm_out: r.pm_out || null,
          notes:  r.notes  || null,
        }))
        await dtrService.upsertMany(payload)
        // Mark all as clean after save
        setRows(prev => prev.map(r => ({ ...r, _dirty: false })))
        toast.success('DTR saved!', { id: 'autosave' })
      } catch (err) {
        toast.error('Auto-save failed: ' + err.message)
      } finally {
        setSaving(false)
      }
    }, AUTOSAVE_DELAY)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  /** Add all Mon–Fri rows for the selected month with blank times */
  const addMonth = useCallback(() => {
    if (!studentId || !month) return
    const [year, mon] = month.split('-').map(Number)
    const daysInMonth = getDaysInMonth(new Date(year, mon - 1))
    const existingDates = new Set(rows.map(r => r.date))
    const newRows = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, mon - 1, d)
      const dow = getDay(dateObj)
      const isWeekday = dow >= 1 && dow <= 5
      const dateStr = format(dateObj, 'yyyy-MM-dd')
      if (isWeekday && !existingDates.has(dateStr)) {
        newRows.push({
          _tempId: crypto.randomUUID(),
          student_id: studentId,
          date: dateStr,
          am_in: '', am_out: '', pm_in: '', pm_out: '',
          notes: '',
          _dirty: true,
          _new: true,
        })
      }
    }

    if (newRows.length === 0) {
      toast('All weekdays for this month are already added.')
      return
    }

    setRows(prev => {
      const merged = [...prev, ...newRows].sort((a, b) => a.date > b.date ? 1 : -1)
      scheduleSave(merged)
      return merged
    })

    toast.success(`Added ${newRows.length} weekdays for ${month}.`)
  }, [studentId, month, rows, scheduleSave])

  const updateRow = useCallback((rowId, field, value) => {
    setRows(prev => {
      const updated = prev.map(r => {
        const id = r.id || r._tempId
        if (id !== rowId) return r
        return { ...r, [field]: value, _dirty: true }
      })
      scheduleSave(updated)
      return updated
    })
  }, [scheduleSave])

  const removeRow = useCallback(async (rowId) => {
    const row = rows.find(r => (r.id || r._tempId) === rowId)
    if (row?.id) await dtrService.remove(row.id)
    setRows(prev => prev.filter(r => (r.id || r._tempId) !== rowId))
  }, [rows])

  const totalMinutes = rows.reduce((sum, r) => sum + calcRowMinutes(r), 0)

  return { rows, loading, saving, totalMinutes, addMonth, updateRow, removeRow, refetch: fetchRows }
}