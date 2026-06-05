import { supabase } from '@/lib/supabase'
import { monthRange } from '@/lib/timeUtils'

export const dtrService = {
  /**
   * Fetch all DTR entries for a student in a given month (YYYY-MM).
   */
  async getByStudentMonth(studentId, month) {
    const { from, to } = monthRange(month)
    const { data, error } = await supabase
      .from('dtr_entries')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', from)
      .lte('date', to)
      .order('date')
    if (error) throw error
    return data
  },

  /**
   * Fetch ALL DTR entries for a student across all months.
   */
  async getAllByStudent(studentId) {
    const { data, error } = await supabase
      .from('dtr_entries')
      .select('*')
      .eq('student_id', studentId)
      .order('date')
    if (error) throw error
    return data
  },

  /**
   * Fetch all DTR entries for all students (used by dashboard).
   */
  async getAll() {
    const { data, error } = await supabase
      .from('dtr_entries')
      .select('*')
    if (error) throw error
    return data
  },

  /**
   * Upsert a single DTR row (insert or update by student_id + date).
   */
  async upsertRow({ student_id, date, am_in, am_out, pm_in, pm_out, notes }) {
    const { data, error } = await supabase
      .from('dtr_entries')
      .upsert(
        { student_id, date, am_in, am_out, pm_in, pm_out, notes },
        { onConflict: 'student_id,date' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Upsert multiple rows for bulk save.
   */
  async upsertMany(rows) {
    const { data, error } = await supabase
      .from('dtr_entries')
      .upsert(rows, { onConflict: 'student_id,date' })
      .select()
    if (error) throw error
    return data
  },

  /**
   * Delete a DTR entry by id.
   */
  async remove(id) {
    const { error } = await supabase
      .from('dtr_entries')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
