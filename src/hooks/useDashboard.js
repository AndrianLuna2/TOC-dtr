import { useState, useEffect } from 'react'
import { dtrService } from '@/lib/dtrService'
import { calcRowMinutes, calcProgress, calcRemaining } from '@/lib/timeUtils'
import toast from 'react-hot-toast'

const HOURS_PER_DAY = 8

/**
 * Aggregates all DTR entries per student for the dashboard.
 */
export function useDashboard(students) {
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!students?.length) return
    setLoading(true)
    dtrService.getAll()
      .then(setAllEntries)
      .catch(err => toast.error('Dashboard error: ' + err.message))
      .finally(() => setLoading(false))
  }, [students])

  const summaries = students.map(student => {
    const entries      = allEntries.filter(e => e.student_id === student.id)
    const totalMinutes = entries.reduce((sum, e) => sum + calcRowMinutes(e), 0)
    const totalHours   = Math.floor(totalMinutes / 60)
    const remainingMins = totalMinutes % 60
    const progress     = calcProgress(totalMinutes, student.required_hours)
    const remaining    = calcRemaining(totalMinutes, student.required_hours)

    // Only count days where at least one complete in/out pair earned minutes
    const daysLogged    = entries.filter(e => calcRowMinutes(e) > 0).length
    const requiredDays  = Math.ceil((student.required_hours || 486) / HOURS_PER_DAY)

    return {
      student,
      totalMinutes,
      totalHours,
      remainingMins,
      progress,
      remaining,
      daysLogged,
      requiredDays,
    }
  })

  const overallStats = {
    totalStudents: students.length,
    completed:  summaries.filter(s => s.progress >= 100).length,
    inProgress: summaries.filter(s => s.progress > 0 && s.progress < 100).length,
    notStarted: summaries.filter(s => s.progress === 0).length,
  }

  return { summaries, overallStats, loading }
}