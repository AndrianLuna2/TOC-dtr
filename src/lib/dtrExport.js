/**
 * dtrExport.js
 * Exports DTR data to a properly formatted .docx file
 * matching the official SPC internship DTR layout.
 *
 * Usage:
 *   import { exportDTRtoWord } from '@/lib/dtrExport'
 *   await exportDTRtoWord({ rows, student, month, totalMinutes })
 *
 * Drop this file in: src/lib/dtrExport.js
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  TabStopType,
  TabStopPosition,
} from 'docx'
import { saveAs } from 'file-saver'
import { format, parseISO, getDaysInMonth, getDay } from 'date-fns'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** "08:00" → "8:00" */
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${parseInt(h, 10)}:${m}`
}

/** minutes → "X hrs, Y mins" */
function fmtMins(mins) {
  if (!mins || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} mins`
  if (m === 0) return `${h} hrs`
  return `${h} hrs, ${m} mins`
}

/** "2026-05" → { year: 2026, month: 5 } */
function parseMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  return { year: y, month: m }
}

/** Build a map of date-string → row */
function buildRowMap(rows) {
  const map = {}
  rows.forEach(r => { map[r.date] = r })
  return map
}

/** Accumulate cumulative minutes up to (and including) each date */
function buildCumulativeMap(rows, sortedDates) {
  let cumMins = 0
  const map = {}
  sortedDates.forEach(d => {
    const r = rows.find(r => r.date === d)
    if (r) cumMins += calcRowMinutes(r)
    map[d] = cumMins
  })
  return map
}

/** Same logic as timeUtils.calcRowMinutes */
function calcRowMinutes(row) {
  if (!row) return 0
  let mins = 0
  const toMins = t => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const amIn = toMins(row.am_in)
  const amOut = toMins(row.am_out)
  const pmIn = toMins(row.pm_in)
  const pmOut = toMins(row.pm_out)
  if (amIn !== null && amOut !== null && amOut > amIn) mins += amOut - amIn
  if (pmIn !== null && pmOut !== null && pmOut > pmIn) mins += pmOut - pmIn
  // Subtract lunch if it straddles 12:00–13:00
  const lunchStart = 12 * 60
  const lunchEnd = 13 * 60
  if (amIn !== null && amOut !== null && amIn < lunchEnd && amOut > lunchStart) {
    const overlap = Math.min(amOut, lunchEnd) - Math.max(amIn, lunchStart)
    if (overlap > 0) mins -= overlap
  }
  if (pmIn !== null && pmOut !== null && pmIn < lunchEnd && pmOut > lunchStart) {
    const overlap = Math.min(pmOut, lunchEnd) - Math.max(pmIn, lunchStart)
    if (overlap > 0) mins -= overlap
  }
  return Math.max(0, mins)
}

// ─────────────────────────────────────────────
// Styling constants
// ─────────────────────────────────────────────

// US Letter, 0.5" margins → content width = 12240 - 1440 = 10800 DXA
const PAGE_W = 12240
const PAGE_H = 15840
const MARGIN = 720  // 0.5 inch
const CONTENT_W = PAGE_W - MARGIN * 2  // 10800

const FONT = 'Times New Roman'
const FONT_SM = 16  // 8pt
const FONT_BASE = 18 // 9pt
const FONT_MD = 20  // 10pt

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

function cell(children, {
  width,
  bold = false,
  size = FONT_BASE,
  align = AlignmentType.CENTER,
  vAlign = VerticalAlign.CENTER,
  borders = allBorders,
  shading = null,
  colSpan,
  rowSpan,
  margins = { top: 40, bottom: 40, left: 80, right: 80 },
} = {}) {
  const runs = typeof children === 'string'
    ? [new TextRun({ text: children, bold, font: FONT, size })]
    : children

  const cellProps = {
    borders,
    verticalAlign: vAlign,
    width: { size: width, type: WidthType.DXA },
    margins,
    children: [
      new Paragraph({
        alignment: align,
        children: runs,
      }),
    ],
  }
  if (shading) cellProps.shading = { fill: shading, type: ShadingType.CLEAR }
  if (colSpan) cellProps.columnSpan = colSpan
  if (rowSpan) cellProps.rowSpan = rowSpan

  return new TableCell(cellProps)
}

function txt(text, { bold = false, size = FONT_BASE, underline = false, italic = false } = {}) {
  return new TextRun({ text, bold, font: FONT, size, underline: underline ? {} : undefined, italics: italic })
}

// ─────────────────────────────────────────────
// Column widths (must sum to CONTENT_W = 10800)
// ─────────────────────────────────────────────
// DATE | DAY | DUTY SCHED IN(AM) | DUTY SCHED OUT(AM) | IN(AM) | OUT(AM) | IN(PM) | OUT(PM) | TOTAL Hours | TOTAL Mins | CUMULATIVE
//  600    600      900                  900               900      900       900      900        700          700         1200
// Total: 600+600+900+900+900+900+900+900+700+700+1200 = 9100  ← need to adjust
// Let's balance to 10800:
const COL = {
  date:    700,
  day:     700,
  dutyIn:  900,
  dutyOut: 900,
  amIn:    900,
  amOut:   900,
  pmIn:    900,
  pmOut:   900,
  hrs:     800,
  mins:    800,
  cumul:   1200,
}
// Sum = 700+700+900+900+900+900+900+900+800+800+1200 = 9500 DXA
// Pad cumulative to make up difference: CONTENT_W - 9500 = 1300 → cumulative = 1200+1300 = 2500? Too wide.
// Simpler: distribute evenly.
// Let's just hard-code to sum exactly CONTENT_W
const C = (() => {
  const base = {
    date:    700,
    day:     700,
    dutyIn:  850,
    dutyOut: 850,
    amIn:    950,
    amOut:   950,
    pmIn:    950,
    pmOut:   950,
    hrs:     750,
    mins:    750,
    cumul:   1350,
  }
  const total = Object.values(base).reduce((a, b) => a + b, 0)
  // Adjust cumul to hit CONTENT_W exactly
  base.cumul += (CONTENT_W - total)
  return base
})()

const COL_WIDTHS = Object.values(C)

// ─────────────────────────────────────────────
// Header rows of the DTR table
// ─────────────────────────────────────────────

function makeTableHeader() {
  const hShading = 'D9D9D9'

  // Row 1: merged groups
  const row1 = new TableRow({
    tableHeader: true,
    children: [
      cell('DATE',      { width: C.date,   bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('DAY',       { width: C.day,    bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('DUTY\nSCHEDULE', { width: C.dutyIn + C.dutyOut, bold: true, size: FONT_SM, shading: hShading, colSpan: 2 }),
      cell('IN\n(AM)',  { width: C.amIn,   bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('OUT\n(AM)', { width: C.amOut,  bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('IN\n(PM)',  { width: C.pmIn,   bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('OUT\n(PM)', { width: C.pmOut,  bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('TOTAL',     { width: C.hrs + C.mins, bold: true, size: FONT_SM, shading: hShading, colSpan: 2 }),
      cell('CUMULATIVE\nHours & Mins', { width: C.cumul, bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
    ],
  })

  // Row 2: sub-headers for DUTY SCHEDULE and TOTAL
  const row2 = new TableRow({
    tableHeader: true,
    children: [
      cell('IN\n(AM)',  { width: C.dutyIn,  bold: true, size: FONT_SM, shading: hShading }),
      cell('OUT\n(AM)', { width: C.dutyOut, bold: true, size: FONT_SM, shading: hShading }),
      cell('Hours',     { width: C.hrs,     bold: true, size: FONT_SM, shading: hShading }),
      cell('Minutes',   { width: C.mins,    bold: true, size: FONT_SM, shading: hShading }),
    ],
  })

  return [row1, row2]
}

// ─────────────────────────────────────────────
// Data rows
// ─────────────────────────────────────────────

function makeDataRows(monthStr, rowMap, student) {
  const { year, month } = parseMonth(monthStr)
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const dataRows = []

  const dutyIn  = student?.duty_in  || '8:00'
  const dutyOut = student?.duty_out || '5:00'

  let cumMins = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = getDay(new Date(year, month - 1, d - 1 + 1))  // 0=Sun
    const dayName = DAY_NAMES[dow]
    const isWeekend = dow === 0 || dow === 6
    const row = rowMap[dateStr]
    const rowMins = row ? calcRowMinutes(row) : 0
    const notes = row?.notes?.toUpperCase() || ''

    cumMins += rowMins

    const rowH = Math.floor(rowMins / 60)
    const rowM = rowMins % 60
    const cumH = Math.floor(cumMins / 60)
    const cumM = cumMins % 60

    const bgColor = isWeekend ? 'F2F2F2' : null

    // Special full-row note (HOLIDAY, PLANT TOUR, EXTRA CREDITS, etc.)
    const isSpecialNote = !row && notes === '' && isWeekend
    const specialNote = notes && !row?.am_in ? notes : ''

    dataRows.push(
      new TableRow({
        children: [
          // DATE
          cell(String(d), { width: C.date, size: FONT_SM, shading: bgColor }),
          // DAY
          cell(dayName,   { width: C.day,  size: FONT_SM, shading: bgColor }),
          // DUTY SCHEDULE IN/OUT
          cell(isWeekend || !row ? '' : dutyIn,  { width: C.dutyIn,  size: FONT_SM, shading: bgColor }),
          cell(isWeekend || !row ? '' : dutyOut, { width: C.dutyOut, size: FONT_SM, shading: bgColor }),
          // Actual IN/OUT times — if special note spans these columns show it
          ...(specialNote
            ? [
                cell(specialNote, {
                  width: C.amIn + C.amOut + C.pmIn + C.pmOut + C.hrs + C.mins + C.cumul,
                  size: FONT_SM,
                  colSpan: 7,
                  shading: bgColor,
                }),
              ]
            : [
                cell(row ? fmtTime(row.am_in)  : '', { width: C.amIn,  size: FONT_SM, shading: bgColor }),
                cell(row ? fmtTime(row.am_out) : '', { width: C.amOut, size: FONT_SM, shading: bgColor }),
                cell(row ? fmtTime(row.pm_in)  : '', { width: C.pmIn,  size: FONT_SM, shading: bgColor }),
                cell(row ? fmtTime(row.pm_out) : '', { width: C.pmOut, size: FONT_SM, shading: bgColor }),
                // TOTAL hours / mins
                cell(rowMins > 0 ? String(rowH) : '', { width: C.hrs,  size: FONT_SM, shading: bgColor }),
                cell(rowMins > 0 ? String(rowM) : '', { width: C.mins, size: FONT_SM, shading: bgColor }),
                // CUMULATIVE
                cell(cumMins > 0 ? fmtMins(cumMins) : '', { width: C.cumul, size: FONT_SM, shading: bgColor }),
              ]),
        ],
      })
    )
  }

  return dataRows
}

// Handle notes-only rows (HOLIDAY, PLANT TOUR, etc.) by patching data rows
// We need a smarter pass: iterate again with notes
function makeDataRowsSmart(monthStr, rowMap, student) {
  const { year, month } = parseMonth(monthStr)
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const dataRows = []
  const dutyIn  = student?.duty_in  || '8:00'
  const dutyOut = student?.duty_out || '5:00'
  let cumMins = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = getDay(new Date(year, month - 1, d - 1 + 1))
    const dayName = DAY_NAMES[dow]
    const isWeekend = dow === 0 || dow === 6
    const row = rowMap[dateStr]
    const rowMins = row ? calcRowMinutes(row) : 0
    cumMins += rowMins

    const rowH = Math.floor(rowMins / 60)
    const rowM = rowMins % 60
    const cumH = Math.floor(cumMins / 60)
    const cumM = cumMins % 60
    const cumStr = cumMins > 0 ? `${cumH} hrs, ${cumM} mins` : ''

    const bgColor = isWeekend ? 'F2F2F2' : null

    // A note-only row (no time data, just a label like HOLIDAY / PLANT TOUR)
    const hasTimeData = row && (row.am_in || row.pm_in)
    const noteLabel = row?.notes?.toUpperCase() || (isWeekend ? '' : '')
    const showNoteSpan = !hasTimeData && noteLabel

    dataRows.push(
      new TableRow({
        children: [
          cell(String(d), { width: C.date, size: FONT_SM, shading: bgColor }),
          cell(dayName,   { width: C.day,  size: FONT_SM, shading: bgColor }),
          // Duty schedule cols
          cell(!isWeekend && hasTimeData ? dutyIn  : '', { width: C.dutyIn,  size: FONT_SM, shading: bgColor }),
          cell(!isWeekend && hasTimeData ? dutyOut : '', { width: C.dutyOut, size: FONT_SM, shading: bgColor }),
          // If note-only, span the remaining 7 columns
          ...(showNoteSpan
            ? [cell(noteLabel, {
                width: C.amIn + C.amOut + C.pmIn + C.pmOut + C.hrs + C.mins + C.cumul,
                colSpan: 7,
                size: FONT_SM,
                shading: bgColor,
                align: AlignmentType.CENTER,
              })]
            : [
                cell(hasTimeData ? fmtTime(row.am_in)  : '', { width: C.amIn,  size: FONT_SM, shading: bgColor }),
                cell(hasTimeData ? fmtTime(row.am_out) : '', { width: C.amOut, size: FONT_SM, shading: bgColor }),
                cell(hasTimeData ? fmtTime(row.pm_in)  : '', { width: C.pmIn,  size: FONT_SM, shading: bgColor }),
                cell(hasTimeData ? fmtTime(row.pm_out) : '', { width: C.pmOut, size: FONT_SM, shading: bgColor }),
                cell(rowMins > 0 ? String(rowH) : '', { width: C.hrs,  size: FONT_SM, shading: bgColor }),
                cell(rowMins > 0 ? String(rowM) : '', { width: C.mins, size: FONT_SM, shading: bgColor }),
                cell(cumStr,                           { width: C.cumul, size: FONT_SM, shading: bgColor }),
              ]
          ),
        ],
      })
    )
  }

  return dataRows
}

// ─────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {Array}  opts.rows          - DTR rows from useDTR
 * @param {object} opts.student       - student object { name, department, course, year_level, required_hours }
 * @param {string} opts.month         - "2026-05"
 * @param {number} opts.totalMinutes  - total minutes logged
 */
export async function exportDTRtoWord({ rows, student, month, totalMinutes }) {
  const rowMap = buildRowMap(rows)
  const { year, month: mon } = parseMonth(month)
  const monthLabel = format(new Date(year, mon - 1, 1), 'MMMM yyyy').toUpperCase()
  const totalH = Math.floor(totalMinutes / 60)
  const totalM = totalMinutes % 60
  const totalLabel = `${totalH} hrs, ${totalM} mins`

  const dataRows = makeDataRowsSmart(month, rowMap, student)

  // ── Document ──────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: FONT_BASE } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children: [

          // ── College header (dynamic from student.college) ───────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [txt(
              (student?.college || 'COLLEGE OF COMPUTER STUDIES').toUpperCase(),
              { bold: true, size: FONT_MD }
            )],
          }),

          // ── Student info block ──────────────
          new Paragraph({
            spacing: { before: 60, after: 20 },
            children: [
              txt('NAME: ', { bold: true, size: FONT_BASE }),
              txt(`${(student?.name || '').toUpperCase()}`, { size: FONT_BASE, underline: true }),
              txt('          DEPARTMENT/OFFICE: ', { bold: true, size: FONT_BASE }),
              txt((student?.department || 'ADMIN').toUpperCase(), { size: FONT_BASE, underline: true }),
            ],
          }),

          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              txt('COURSE & YEAR LEVEL: ', { bold: true, size: FONT_BASE }),
              txt(
                `${(student?.course || 'BSIT').toUpperCase()} – ${student?.year_level || '4th'} Year`,
                { size: FONT_BASE, underline: true }
              ),
            ],
          }),

          // ── Month / Year ─────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 20 },
            children: [txt(monthLabel, { bold: true, size: FONT_MD })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 80 },
            children: [txt('Month & Year', { size: FONT_SM })],
          }),

          // ── DTR Table ────────────────────────
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: COL_WIDTHS,
            rows: [
              ...makeTableHeader(),
              ...dataRows,
            ],
          }),

          // ── Certification text ───────────────
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              txt(
                'I CERTIFY on my Honor that the above is a true and correct report of hours of work performed,',
                { size: FONT_SM, italic: true }
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [
              txt(
                'a record of which was made daily at the time of arrival and departure from office.',
                { size: FONT_SM, italic: true }
              ),
            ],
          }),

          // ── Student signature line ───────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 40 },
            children: [txt((student?.name || '').toUpperCase(), { bold: true, size: FONT_BASE, underline: true })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 20 },
            children: [
              txt('SIGNATURE ABOVE NAME OF STUDENT', { size: FONT_SM }),
              txt('          TOTAL HOURS: ', { bold: true, size: FONT_SM }),
              txt(totalLabel, { size: FONT_SM }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [
              txt(`hrs, ${totalM} mins`, { size: FONT_SM }),
            ],
          }),

          // ── Supervisor signature line ────────
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [txt((student?.supervisor || 'JILIA FRANCINE E. GUERRA, RPm, CHRA').toUpperCase(), { bold: true, size: FONT_BASE, underline: true })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 20 },
            children: [txt(student?.supervisor_title || 'Human Resource Supervisor, Triangle Outsourcing Corp.', { size: FONT_SM })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [txt('DEPARTMENT/OFFICE HEAD NAME & SIGNATURE', { bold: true, size: FONT_SM })],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `DTR-${(student?.name || 'Intern').replace(/\s+/g, '_')}-${month}.docx`
  saveAs(blob, filename)
}