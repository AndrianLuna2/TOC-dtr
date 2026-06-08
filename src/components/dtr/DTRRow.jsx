import { Trash2 } from 'lucide-react'
import { calcRowMinutes, formatMinutesShort } from '@/lib/timeUtils'

/**
 * Converts "HH:MM" (24hr) stored value → "h:mma" display value
 * e.g. "14:24" → "2:24pm", "08:00" → "8am"
 */
function to12Hour(val) {
  if (!val) return ''
  const [hStr, mStr] = val.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return val
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12  = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${mStr}${ampm}`
}

/**
 * Parses whatever the user typed → "HH:MM" for storage.
 * @param {string} raw        - what the user typed
 * @param {boolean} isPMField - true when the field is pm_in or pm_out
 *
 * When no am/pm suffix is given, isPMField decides the default:
 *   pm field + "1:30"  → 13:30
 *   am field + "8:50"  → 08:50
 *
 * Explicit suffix always wins:
 *   pm field + "8am"   → 08:00
 *   am field + "1:30pm"→ 13:30
 */
function parseTime(raw, isPMField = false) {
  if (!raw) return ''
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '')

  // 1. With am/pm suffix — explicit, always wins
  const ampmMatch = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10)
    const m    = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0
    const ampm = ampmMatch[3]
    if (h < 1 || h > 12 || m < 0 || m > 59) return null
    if (ampm === 'am') { if (h === 12) h = 0 }
    else               { if (h !== 12) h += 12 }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // 2. Plain H:MM or HH:MM — no suffix, use field context
  const colonMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (colonMatch) {
    let h  = parseInt(colonMatch[1], 10)
    const m = parseInt(colonMatch[2], 10)
    if (m < 0 || m > 59) return null
    // If already 24-hr (13-23), use as-is
    if (h >= 0 && h <= 12) {
      if (isPMField && h !== 0 && h !== 12) h += 12  // 1:30 on pm field → 13:30
    }
    if (h < 0 || h > 23) return null
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // 3. Digit shorthand — "850" → 8:50, "1300" → 13:00
  const digitMatch = cleaned.match(/^(\d{3,4})$/)
  if (digitMatch) {
    const digits = digitMatch[1]
    let h, m
    if (digits.length === 3) {
      h = parseInt(digits[0], 10)
      m = parseInt(digits.slice(1), 10)
    } else {
      h = parseInt(digits.slice(0, 2), 10)
      m = parseInt(digits.slice(2), 10)
    }
    if (m < 0 || m > 59) return null
    if (h >= 0 && h <= 12) {
      if (isPMField && h !== 0 && h !== 12) h += 12
    }
    if (h < 0 || h > 23) return null
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  return null
}

function TimeInput({ value, onChange, isPMField }) {
  const displayValue = to12Hour(value)

  function handleBlur(e) {
    const raw = e.target.value.trim()
    if (!raw) { onChange(''); return }
    const parsed = parseTime(raw, isPMField)
    if (parsed !== null) {
      onChange(parsed)
      e.target.value = to12Hour(parsed)
    } else {
      e.target.value = displayValue
    }
  }

  return (
    <input
      type="text"
      defaultValue={displayValue}
      key={displayValue}
      onBlur={handleBlur}
      placeholder={isPMField ? '' : ''}
      className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 w-24 placeholder-stone-300"
    />
  )
}

export function DTRRow({ row, onChange, onRemove }) {
  const rowId   = row.id || row._tempId
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
          <TimeInput
            value={row[field] || ''}
            onChange={val => onChange(rowId, field, val)}
            isPMField={field.startsWith('pm')}
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