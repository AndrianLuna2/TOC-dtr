import { useState } from 'react'
import { CalendarPlus, CalendarDays, Clock, FileDown, Loader2 } from 'lucide-react'
import { useStudents } from '@/hooks/useStudents'
import { useDTR } from '@/hooks/useDTR'
import { DTRRow } from '@/components/dtr/DTRRow'
import { Button, Select, Spinner, StatCard } from '@/components/ui'
import { formatMinutes, currentMonth } from '@/lib/timeUtils'
import { exportDTRtoWord } from '@/lib/dtrExport'
import toast from 'react-hot-toast'

export default function DTRPage() {
  const { students } = useStudents()
  const [studentId, setStudentId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [exporting, setExporting] = useState(false)

  const { rows, loading, saving, totalMinutes, addMonth, updateRow, removeRow } =
    useDTR(studentId, month)

  const selectedStudent = students.find(s => s.id === studentId)
  const requiredMins = (selectedStudent?.required_hours || 486) * 60

  const handleExportWord = async () => {
    if (!selectedStudent) return toast.error('Select an intern first.')
    if (rows.length === 0) return toast.error('No DTR entries to export.')
    setExporting(true)
    try {
      await exportDTRtoWord({ rows, student: selectedStudent, month, totalMinutes })
      toast.success('DTR exported to Word!')
    } catch (err) {
      toast.error('Export failed: ' + err.message)
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-stone-900">Daily Time Record</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Changes save automatically · Times filled via QR scan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select className="w-48" value={studentId} onChange={e => setStudentId(e.target.value)}>
            <option value="">— select intern —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <input
            type="month"
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900/20"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
      </div>

      {studentId && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Hours this month" value={formatMinutes(totalMinutes)} />
          <StatCard label="Days logged" value={`${rows.length} day${rows.length !== 1 ? 's' : ''}`} />
          <StatCard
            label="Total required"
            value={`${selectedStudent?.required_hours || 486} hrs`}
            sub={`${Math.max(0, Math.round((requiredMins - totalMinutes) / 60))} hrs remaining`}
          />
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <CalendarDays size={15} />
            <span>{rows.length} entr{rows.length !== 1 ? 'ies' : 'y'}</span>
            {/* Auto-save indicator */}
            {saving && (
              <span className="flex items-center gap-1 text-xs text-amber-500 ml-2">
                <Loader2 size={11} className="animate-spin" /> Saving…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addMonth} disabled={!studentId}>
              <CalendarPlus size={14} /> Add month
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportWord}
              disabled={!studentId || exporting}
            >
              <FileDown size={14} /> {exporting ? 'Exporting…' : 'Export .docx'}
            </Button>
          </div>
        </div>

        {!studentId ? (
          <div className="text-center py-16 text-stone-400">
            <Clock size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select an intern and month above to view or add DTR entries.</p>
          </div>
        ) : loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-400 uppercase tracking-wider border-b border-stone-100">
                  <th className="text-left px-3 py-2.5">Date</th>
                  <th className="text-left px-3 py-2.5">AM In</th>
                  <th className="text-left px-3 py-2.5">AM Out</th>
                  <th className="text-left px-3 py-2.5">PM In</th>
                  <th className="text-left px-3 py-2.5">PM Out</th>
                  <th className="text-left px-3 py-2.5">Total</th>
                  <th className="text-left px-3 py-2.5">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-stone-400">
                      No entries yet. Click "Add month" to populate all weekdays.
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <DTRRow
                      key={row.id || row._tempId}
                      row={row}
                      onChange={updateRow}
                      onRemove={removeRow}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}