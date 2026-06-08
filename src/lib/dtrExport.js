/**
 * dtrExport.js
 * Exports DTR data to a properly formatted .docx file
 * matching the official SPC internship DTR layout.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
} from 'docx'
import { saveAs } from 'file-saver'
import { format, getDaysInMonth, getDay } from 'date-fns'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** "08:00" → "8am", "14:30" → "2:30pm" */
function fmtTime(t) {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12  = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${mStr}${ampm}`
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

/**
 * Matches timeUtils.calcRowMinutes exactly.
 * Only counts complete in/out pairs — no lunch deduction, no fallback.
 */
function calcRowMinutes(row) {
  if (!row) return 0
  const toMins = t => {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const amIn  = toMins(row.am_in)
  const amOut = toMins(row.am_out)
  const pmIn  = toMins(row.pm_in)
  const pmOut = toMins(row.pm_out)
  const amMins = amIn != null && amOut != null ? Math.max(0, amOut - amIn) : 0
  const pmMins = pmIn != null && pmOut != null ? Math.max(0, pmOut - pmIn) : 0
  return amMins + pmMins
}

// ─────────────────────────────────────────────
// Styling constants
// ─────────────────────────────────────────────

const PAGE_W    = 12240
const PAGE_H    = 15840
const MARGIN    = 720
const CONTENT_W = PAGE_W - MARGIN * 2

const FONT      = 'Times New Roman'
const FONT_SM   = 16
const FONT_BASE = 18
const FONT_MD   = 20

const noBorder   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' }
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }

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
    children: [new Paragraph({ alignment: align, children: runs })],
  }
  if (shading) cellProps.shading    = { fill: shading, type: ShadingType.CLEAR }
  if (colSpan) cellProps.columnSpan = colSpan
  if (rowSpan) cellProps.rowSpan    = rowSpan
  return new TableCell(cellProps)
}

function txt(text, { bold = false, size = FONT_BASE, underline = false, italic = false } = {}) {
  return new TextRun({ text, bold, font: FONT, size, underline: underline ? {} : undefined, italics: italic })
}

// ─────────────────────────────────────────────
// Column widths
// ─────────────────────────────────────────────

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
  base.cumul += (CONTENT_W - total)
  return base
})()

const COL_WIDTHS = Object.values(C)

// ─────────────────────────────────────────────
// Header rows
// ─────────────────────────────────────────────

function makeTableHeader() {
  const hShading = 'D9D9D9'
  const row1 = new TableRow({
    tableHeader: true,
    children: [
      cell('DATE',           { width: C.date,               bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('DAY',            { width: C.day,                bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('DUTY\nSCHEDULE', { width: C.dutyIn + C.dutyOut, bold: true, size: FONT_SM, shading: hShading, colSpan: 2 }),
      cell('IN\n(AM)',        { width: C.amIn,               bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('OUT\n(AM)',       { width: C.amOut,              bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('IN\n(PM)',        { width: C.pmIn,               bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('OUT\n(PM)',       { width: C.pmOut,              bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
      cell('TOTAL',          { width: C.hrs + C.mins,       bold: true, size: FONT_SM, shading: hShading, colSpan: 2 }),
      cell('CUMULATIVE\nHours & Mins', { width: C.cumul,   bold: true, size: FONT_SM, shading: hShading, rowSpan: 2 }),
    ],
  })
  const row2 = new TableRow({
    tableHeader: true,
    children: [
      cell('IN\n(AM)',  { width: C.dutyIn,  bold: true, size: FONT_SM, shading: hShading }),
      cell('OUT\n(PM)', { width: C.dutyOut, bold: true, size: FONT_SM, shading: hShading }),
      cell('Hours',     { width: C.hrs,     bold: true, size: FONT_SM, shading: hShading }),
      cell('Minutes',   { width: C.mins,    bold: true, size: FONT_SM, shading: hShading }),
    ],
  })
  return [row1, row2]
}

// ─────────────────────────────────────────────
// Data rows
// ─────────────────────────────────────────────

/**
 * @param {string}  monthStr      - "2026-05"
 * @param {object}  rowMap        - date string → DTR row
 * @param {object}  student       - student record
 * @param {number}  totalMinutes  - authoritative total from useDTR hook;
 *                                  used to pin the last cumulative cell so
 *                                  the export always matches the page stat card.
 * @param {string[]} rowDates     - sorted array of dates that have time data,
 *                                  used to identify the last entry.
 */
function makeDataRowsSmart(monthStr, rowMap, student) {
  const { year, month } = parseMonth(monthStr)
  const daysInMonth     = getDaysInMonth(new Date(year, month - 1))
  const dataRows        = []
  const dutyIn          = student?.duty_in  || '08:00'
  const dutyOut         = student?.duty_out || '17:00'

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow       = getDay(new Date(year, month - 1, d - 1 + 1))
    const dayName   = DAY_NAMES[dow]
    const isWeekend = dow === 0 || dow === 6
    const row       = rowMap[dateStr]

    const rowMins = calcRowMinutes(row)
    // hasEarnedMins: row has a complete in/out pair and produced countable minutes
    const hasEarnedMins = rowMins > 0
    // hasAnyTime: row exists in DB with at least one time field (may not be a complete pair)
    const hasAnyTime = row && (row.am_in || row.am_out || row.pm_in || row.pm_out)
    const noteLabel  = row?.notes?.toUpperCase() || ''

    const rowH = Math.floor(rowMins / 60)
    const rowM = rowMins % 60

    // Cumulative = this row's own earned time as "X hrs, Y mins"
    // Matches the official DTR format — NOT a running total across rows
    const rowCumStr      = hasEarnedMins ? `${rowH} hrs, ${rowM} mins` : ''
    const showCumulative = hasEarnedMins

    // Duty schedule (8am/5pm) shows on any weekday row that has time data — it's
    // a reference column only, not used in total/cumulative calculations
    const showDuty = !isWeekend && hasAnyTime

    const bgColor    = isWeekend ? 'F2F2F2' : null
    const showNoteSpan = !hasAnyTime && noteLabel

    dataRows.push(
      new TableRow({
        children: [
          cell(String(d), { width: C.date, size: FONT_SM, shading: bgColor }),
          cell(dayName,   { width: C.day,  size: FONT_SM, shading: bgColor }),
          cell(showDuty ? fmtTime(dutyIn)  : '', { width: C.dutyIn,  size: FONT_SM, shading: bgColor }),
          cell(showDuty ? fmtTime(dutyOut) : '', { width: C.dutyOut, size: FONT_SM, shading: bgColor }),
          ...(showNoteSpan
            ? [cell(noteLabel, {
                width: C.amIn + C.amOut + C.pmIn + C.pmOut + C.hrs + C.mins + C.cumul,
                colSpan: 7,
                size: FONT_SM,
                shading: bgColor,
                align: AlignmentType.CENTER,
              })]
            : [
                cell(hasAnyTime ? fmtTime(row.am_in)  : '', { width: C.amIn,  size: FONT_SM, shading: bgColor }),
                cell(hasAnyTime ? fmtTime(row.am_out) : '', { width: C.amOut, size: FONT_SM, shading: bgColor }),
                cell(hasAnyTime ? fmtTime(row.pm_in)  : '', { width: C.pmIn,  size: FONT_SM, shading: bgColor }),
                cell(hasAnyTime ? fmtTime(row.pm_out) : '', { width: C.pmOut, size: FONT_SM, shading: bgColor }),
                // TOTAL: only show hours/mins when this row actually earned minutes
                cell(hasEarnedMins ? String(rowH) : '', { width: C.hrs,  size: FONT_SM, shading: bgColor }),
                cell(hasEarnedMins ? String(rowM) : '', { width: C.mins, size: FONT_SM, shading: bgColor }),
                // CUMULATIVE: carry forward on any DB row, blank on empty days
                cell(
                  showCumulative
                    ? (noteLabel ? `${rowCumStr}  (${noteLabel})` : rowCumStr)
                    : '',
                  { width: C.cumul, size: FONT_SM, shading: bgColor }
                ),
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

export async function exportDTRtoWord({ rows, student, month, totalMinutes }) {
  const rowMap     = buildRowMap(rows)
  const { year, month: mon } = parseMonth(month)
  const monthLabel = format(new Date(year, mon - 1, 1), 'MMMM yyyy').toUpperCase()
  const totalH     = Math.floor(totalMinutes / 60)
  const totalM     = totalMinutes % 60
  const totalLabel = `${totalH} hrs, ${totalM} mins`


  const dataRows = makeDataRowsSmart(month, rowMap, student)

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: FONT_BASE } } },
    },
    sections: [{
      properties: {
        page: {
          size:   { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [txt(
            (student?.college || 'COLLEGE OF COMPUTER STUDIES').toUpperCase(),
            { bold: true, size: FONT_MD }
          )],
        }),
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
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: COL_WIDTHS,
          rows: [...makeTableHeader(), ...dataRows],
        }),
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [txt(
            'I CERTIFY on my Honor that the above is a true and correct report of hours of work performed,',
            { size: FONT_SM, italic: true }
          )],
        }),
        new Paragraph({
          spacing: { before: 0, after: 200 },
          children: [txt(
            'a record of which was made daily at the time of arrival and departure from office.',
            { size: FONT_SM, italic: true }
          )],
        }),
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
          spacing: { before: 120, after: 40 },
          children: [txt(
            (student?.supervisor || 'JILIA FRANCINE E. GUERRA, RPm, CHRA').toUpperCase(),
            { bold: true, size: FONT_BASE, underline: true }
          )],
        }),
        new Paragraph({
          spacing: { before: 0, after: 20 },
          children: [txt(
            student?.supervisor_title || 'Human Resource Supervisor, Triangle Outsourcing Corp.',
            { size: FONT_SM }
          )],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [txt('DEPARTMENT/OFFICE HEAD NAME & SIGNATURE', { bold: true, size: FONT_SM })],
        }),
      ],
    }],
  })

  const blob     = await Packer.toBlob(doc)
  const filename = `DTR-${(student?.name || 'Intern').replace(/\s+/g, '_')}-${month}.docx`
  saveAs(blob, filename)
}