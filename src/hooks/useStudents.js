import { useState, useEffect, useCallback } from 'react'
import { studentsService } from '@/lib/studentsService'
import toast from 'react-hot-toast'

export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await studentsService.getAll()
      setStudents(data)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load students: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const addStudent = useCallback(async (fields) => {
    const data = await studentsService.create(fields)
    setStudents(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`${data.name} added!`)
    return data
  }, [])

  const updateStudent = useCallback(async (id, fields) => {
    const data = await studentsService.update(id, fields)
    setStudents(prev => prev.map(s => s.id === id ? data : s))
    toast.success('Student updated!')
    return data
  }, [])

  const removeStudent = useCallback(async (id) => {
    const student = students.find(s => s.id === id)
    await studentsService.remove(id)
    setStudents(prev => prev.filter(s => s.id !== id))
    toast.success(`${student?.name} removed.`)
  }, [students])

  return { students, loading, error, refetch: fetchStudents, addStudent, updateStudent, removeStudent }
}
