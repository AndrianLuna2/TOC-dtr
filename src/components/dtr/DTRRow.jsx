import { Trash2 } from 'lucide-react'
import { calcRowMinutes, formatMinutesShort } from '@/lib/timeUtils'

export function DTRRow({ row, onChange, onRemove }) {
  const rowId = row.id || row._tempId
  const minutes = calcRowMinutes(row)

  return (
    <tr className="border-b border-stone-50 last:border-0 hover:bg-amber-50/30 transition-colors group">
      <td className="px-3 py-2">
        <input
          type="date"
          className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 w-36"
          value={row.date || ''}
          onChange={e => onChange(rowId, 'date', e.target.value)}
        />
      </td>
      {['am_in', 'am_out', 'pm_in', 'pm_out'].map(field => (
        <td key={field} className="px-3 py-2">
          <input
            type="time"
            className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 w-28"
            value={row[field] || ''}
            onChange={e => onChange(rowId, field, e.target.value)}
          />
        </td>
      ))}
      <td className="px-3 py-2">
        <span className={`font-mono text-xs font-medium ${minutes > 0 ? 'text-emerald-700' : 'text-stone-300'}`}>
          {minutes > 0 ? formatMinutesShort(minutes) : '—'}
        </span>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          placeholder="notes…"
          className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 w-28 placeholder-stone-300"
          value={row.notes || ''}
          onChange={e => onChange(rowId, 'notes', e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => onRemove(rowId)}
          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}
