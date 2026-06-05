import { supabase } from '@/lib/supabase'

export const studentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create({ name, college, course, school, year_level, required_hours = 486, start_date }) {
    const { data, error } = await supabase
      .from('students')
      .insert({ name, college, course, school, year_level, required_hours, start_date })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, fields) {
    const { data, error } = await supabase
      .from('students')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}