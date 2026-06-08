/**
 * qrService.js
 * Handles QR scan logic — figures out which time slot to fill
 * (AM In → AM Out → PM In → PM Out) based on what's already recorded today.
 *
 * Place in: src/lib/qrService.js
 */

import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

/** Returns today's date as "YYYY-MM-DD" */
function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Returns current time as "HH:MM" (24h) */
function nowTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * Called when an intern scans their QR code.
 * Looks up today's DTR row for that student and fills the next empty slot.
 *
 * Slot order: am_in → am_out → pm_in → pm_out
 *
 * @param {string} studentId
 * @returns {{ slot: string, time: string, student: object, alreadyComplete: boolean }}
 */
export async function recordScan(studentId) {
  const today = todayStr()
  const time  = nowTime()

  // 1. Fetch student info
  const { data: student, error: sErr } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()
  if (sErr) throw new Error('Student not found.')

  // 2. Fetch or create today's DTR row
  let { data: row, error: rErr } = await supabase
    .from('dtr_entries')
    .select('*')
    .eq('student_id', studentId)
    .eq('date', today)
    .maybeSingle()

  if (rErr) throw new Error('Failed to fetch DTR row: ' + rErr.message)

  // If no row yet for today, create a blank one
  if (!row) {
    const { data: newRow, error: insertErr } = await supabase
      .from('dtr_entries')
      .insert({ student_id: studentId, date: today })
      .select()
      .single()
    if (insertErr) throw new Error('Failed to create DTR row: ' + insertErr.message)
    row = newRow
  }

  // 3. Determine which slot to fill
  const SLOTS = ['am_in', 'am_out', 'pm_in', 'pm_out']
  const SLOT_LABELS = {
    am_in:  'AM Time In',
    am_out: 'AM Time Out',
    pm_in:  'PM Time In',
    pm_out: 'PM Time Out',
  }

  const nextSlot = SLOTS.find(s => !row[s])

  if (!nextSlot) {
    // All 4 slots already filled
    return { alreadyComplete: true, student, row, time }
  }

  // 4. Update that slot
  const { error: updateErr } = await supabase
    .from('dtr_entries')
    .update({ [nextSlot]: time })
    .eq('id', row.id)

  if (updateErr) throw new Error('Failed to record time: ' + updateErr.message)

  return {
    alreadyComplete: false,
    slot: nextSlot,
    slotLabel: SLOT_LABELS[nextSlot],
    time,
    student,
    row: { ...row, [nextSlot]: time },
  }
}