/**
 * Converts "HH:MM" string to total minutes from midnight.
 */
export function timeToMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Calculates worked minutes for one DTR row.
 * Automatically caps AM out at 12:00 and PM in at 13:00
 * to exclude the mandatory 1-hour lunch break.
 */
export function calcRowMinutes(row) {
  const amIn = timeToMinutes(row.am_in)
  const amOut = timeToMinutes(row.am_out || '12:00')
  const pmIn = timeToMinutes(row.pm_in || '13:00')
  const pmOut = timeToMinutes(row.pm_out)

  const amMins = amIn != null && amOut != null ? Math.max(0, amOut - amIn) : 0
  const pmMins = pmIn != null && pmOut != null ? Math.max(0, pmOut - pmIn) : 0

  return amMins + pmMins
}

/**
 * Formats total minutes into "X hrs, Y mins" display string.
 */
export function formatMinutes(totalMins) {
  if (!totalMins || totalMins <= 0) return '0 hrs'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m} mins`
  if (m === 0) return `${h} hrs`
  return `${h} hrs, ${m} mins`
}

/**
 * Formats total minutes into compact "Xh Ym" string.
 */
export function formatMinutesShort(totalMins) {
  if (!totalMins || totalMins <= 0) return '0h'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Returns the progress percentage capped at 100.
 */
export function calcProgress(renderedMins, requiredHours) {
  const requiredMins = (requiredHours || 486) * 60
  return Math.min(100, Math.round((renderedMins / requiredMins) * 100))
}

/**
 * Returns hours and minutes remaining.
 */
export function calcRemaining(renderedMins, requiredHours) {
  const requiredMins = (requiredHours || 486) * 60
  const rem = Math.max(0, requiredMins - renderedMins)
  return { hours: Math.floor(rem / 60), minutes: rem % 60 }
}

/**
 * Returns the initials (up to 2 chars) from a full name.
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

/**
 * Returns today's date as "YYYY-MM-DD".
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Returns current month as "YYYY-MM".
 */
export function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

/**
 * Returns the first and last date strings of a given "YYYY-MM" month.
 */
export function monthRange(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    from: `${yyyyMM}-01`,
    to: `${yyyyMM}-${String(lastDay).padStart(2, '0')}`,
  }
}
