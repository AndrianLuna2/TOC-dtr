import { LayoutDashboard } from 'lucide-react'
import { useStudents } from '@/hooks/useStudents'
import { useDashboard } from '@/hooks/useDashboard'
import { Avatar, Badge, ProgressBar, StatCard, Spinner } from '@/components/ui'
import { formatMinutes } from '@/lib/timeUtils'

function statusBadge(progress) {
  if (progress >= 100) return <Badge variant="success">Completed</Badge>
  if (progress > 0)    return <Badge variant="warning">In progress</Badge>
  return <Badge variant="default">Not started</Badge>
}

export default function DashboardPage() {
  const { students, loading: studentsLoading } = useStudents()
  const { summaries, overallStats, loading: dashLoading } = useDashboard(students)

  const loading = studentsLoading || dashLoading

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-stone-900">Master Dashboard</h1>
        <p className="text-sm text-stone-400 mt-0.5">Overall internship progress — all interns</p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total interns"   value={overallStats.totalStudents} />
        <StatCard label="Completed"        value={overallStats.completed}     accent="text-emerald-600" />
        <StatCard label="In progress"      value={overallStats.inProgress}    accent="text-amber-600" />
        <StatCard label="Not started"      value={overallStats.notStarted}    accent="text-stone-400" />
      </div>

      {loading ? <Spinner /> : summaries.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <LayoutDashboard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No interns yet. Add students to see the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries
            .sort((a, b) => b.progress - a.progress)
            .map(({ student, totalMinutes, totalHours, remainingMins, progress, remaining, daysLogged, requiredDays }) => (
            <div key={student.id} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-4">
                <Avatar name={student.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-stone-900">{student.name}</span>
                    {statusBadge(progress)}
                  </div>
                  <p className="text-xs text-stone-400">
                    {[student.course, student.school].filter(Boolean).join(' · ') || 'No course/school set'}
                  </p>
                </div>

                {/* Stat pills */}
                <div className="flex items-center gap-6 text-right shrink-0">
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Rendered</p>
                    <p className="font-mono text-sm font-semibold text-stone-800">
                      {totalHours}h {remainingMins > 0 ? `${remainingMins}m` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Required</p>
                    <p className="font-mono text-sm font-semibold text-stone-800">{student.required_hours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Remaining</p>
                    <p className={`font-mono text-sm font-semibold ${remaining.hours === 0 && remaining.minutes === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {remaining.hours === 0 && remaining.minutes === 0
                        ? '✓ Done'
                        : `${remaining.hours}h ${remaining.minutes > 0 ? `${remaining.minutes}m` : ''}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">Days</p>
                    <p className="font-mono text-sm font-semibold text-stone-800">
                      {daysLogged} / {requiredDays}
                    </p>
                  </div>
                  <div className="w-14 text-right">
                    <p className="text-xs text-stone-400 mb-0.5">Progress</p>
                    <p className="font-mono text-sm font-bold text-stone-800">{progress}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar value={progress} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}