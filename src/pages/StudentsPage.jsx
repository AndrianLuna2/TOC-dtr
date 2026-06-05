import { useState } from 'react'
import { UserPlus, Pencil, Trash2, GraduationCap } from 'lucide-react'
import { useStudents } from '@/hooks/useStudents'
import { StudentModal } from '@/components/students/StudentModal'
import { Button, Badge, Avatar, Spinner } from '@/components/ui'

function statusVariant(s) {
  return s === 'completed' ? 'success' : s === 'dropped' ? 'danger' : 'info'
}

export default function StudentsPage() {
  const { students, loading, addStudent, updateStudent, removeStudent } = useStudents()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleRemove = async (student) => {
    if (!confirm(`Remove ${student.name} and all their DTR records?`)) return
    await removeStudent(student.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-stone-900">Interns</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {students.length} student{students.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <UserPlus size={15} /> Add intern
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : students.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No interns yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-xs text-stone-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">College</th>
                <th className="text-left px-5 py-3 font-medium">Course</th>
                <th className="text-left px-5 py-3 font-medium">School</th>
                <th className="text-left px-5 py-3 font-medium">Required hrs</th>
                <th className="text-left px-5 py-3 font-medium">Start date</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr
                  key={s.id}
                  className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} size="sm" />
                      <span className="font-medium text-stone-800">{s.name}</span>
                    </div>
                  </td>
                  {/* Abbreviate college name to keep table tidy */}
                  <td className="px-5 py-3 text-stone-500 max-w-[180px]">
                    <span className="block truncate" title={s.college || '—'}>
                      {s.college || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{s.course || '—'}</td>
                  <td className="px-5 py-3 text-stone-500">{s.school || '—'}</td>
                  <td className="px-5 py-3 text-stone-600">{s.required_hours} hrs</td>
                  <td className="px-5 py-3 text-stone-500">{s.start_date || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(s)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addStudent}
      />
      <StudentModal
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={fields => updateStudent(editing.id, fields)}
        initial={editing}
      />
    </div>
  )
}