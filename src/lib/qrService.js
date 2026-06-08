import { supabase } from '@/lib/supabase'

/** Get current date/time forced to Philippine time (UTC+8) */
function getPHTime() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs + 8 * 60 * 60000)
}

function todayStr() {
  const ph = getPHTime()
  const y = ph.getFullYear()
  const m = String(ph.getMonth() + 1).padStart(2, '0')
  const d = String(ph.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function nowTime() {
  const ph = getPHTime()
  const hours = ph.getHours()
  const minutes = ph.getMinutes()
  const ampm = hours >= 12 ? 'pm' : 'am'
  const h = hours % 12 || 12
  const m = String(minutes).padStart(2, '0')
  return m === '00' ? `${h}${ampm}` : `${h}:${m}${ampm}`
}

function getHour() {
  return getPHTime().getHours()
}

const SLOT_LABELS = {
  am_in:  'AM Time In',
  am_out: 'AM Time Out',
  pm_in:  'PM Time In',
  pm_out: 'PM Time Out',
}

function detectSlot(row, hour) {
  if (hour === 12) return { slot: null, reason: 'lunch' }

  if (hour < 12) {
    if (!row.am_in)  return { slot: 'am_in' }
    if (!row.am_out) return { slot: 'am_out' }
    return { slot: null, reason: 'am_complete' }
  }

  if (!row.pm_in)  return { slot: 'pm_in' }
  if (!row.pm_out) return { slot: 'pm_out' }
  return { slot: null, reason: 'pm_complete' }
}

export async function recordScan(studentId) {
  const today = todayStr()
  const time  = nowTime()
  const hour  = getHour()

  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()
  if (sErr) throw new Error('Student not found.')

  let { data: row, error: rErr } = await supabase
    .from('dtr_entries')
    .select('*')
    .eq('student_id', studentId)
    .eq('date', today)
    .maybeSingle()
  if (rErr) throw new Error('Failed to fetch DTR row: ' + rErr.message)

  if (!row) {
    const { data: newRow, error: insertErr } = await supabase
      .from('dtr_entries')
      .insert({ student_id: studentId, date: today })
      .select()
      .single()
    if (insertErr) throw new Error('Failed to create DTR row: ' + insertErr.message)
    row = newRow
  }

  const { slot, reason } = detectSlot(row, hour)

  if (!slot) {
    if (reason === 'lunch') return { lunchBreak: true, student, time }
    const allFilled = row.am_in && row.am_out && row.pm_in && row.pm_out
    return { alreadyComplete: allFilled, student, row, time, reason }
  }

  const { error: updateErr } = await supabase
    .from('dtr_entries')
    .update({ [slot]: time })
    .eq('id', row.id)
  if (updateErr) throw new Error('Failed to record time: ' + updateErr.message)

  return {
    alreadyComplete: false,
    lunchBreak: false,
    slot,
    slotLabel: SLOT_LABELS[slot],
    time,
    student,
    row: { ...row, [slot]: time },
  }
}