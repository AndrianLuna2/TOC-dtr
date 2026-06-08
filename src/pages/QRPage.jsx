/**
 * QRPage.jsx
 * Lists all interns with their generated QR codes.
 * Each QR encodes the student's UUID — scanned by ScanPage to log time.
 *
 * Place in: src/pages/QRPage.jsx
 *
 * Requires: npm install qrcode
 */

import { useEffect, useRef, useState } from 'react'
import { Download, QrCode, Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { useStudents } from '@/hooks/useStudents'
import { Spinner, Avatar, Badge } from '@/components/ui'

function statusVariant(s) {
  return s === 'completed' ? 'success' : s === 'dropped' ? 'danger' : 'info'
}

/** Renders one intern card with their QR code */
function InternQRCard({ student }) {
  const canvasRef = useRef(null)
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    if (!student?.id) return
    QRCode.toDataURL(student.id, {
      width: 220,
      margin: 2,
      color: { dark: '#1c1917', light: '#fafaf9' },
      errorCorrectionLevel: 'H',
    }).then(url => setDataUrl(url))
  }, [student.id])

  useEffect(() => {
    if (!canvasRef.current || !student?.id) return
    QRCode.toCanvas(canvasRef.current, student.id, {
      width: 180,
      margin: 2,
      color: { dark: '#1c1917', light: '#fafaf9' },
      errorCorrectionLevel: 'H',
    })
  }, [student.id])

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `QR-${student.name.replace(/\s+/g, '_')}.png`
    a.click()
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>QR – ${student.name}</title>
          <style>
            body { font-family: 'Times New Roman', serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
            .name { font-size: 18px; font-weight: bold; margin-top: 16px; letter-spacing: 0.02em; }
            .course { font-size: 13px; color: #555; margin-top: 4px; }
            .college { font-size: 12px; color: #888; margin-top: 2px; }
            img { width: 240px; height: 240px; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
          <p class="name">${student.name.toUpperCase()}</p>
          <p class="course">${student.course || ''}</p>
          <p class="college">${student.college || ''}</p>
          <script>window.onload = () => { window.print(); window.close() }<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Avatar name={student.name} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-stone-800 truncate">{student.name}</p>
          <p className="text-xs text-stone-400 truncate">{student.course || '—'}</p>
          <p className="text-xs text-stone-400 truncate">{student.college || '—'}</p>
        </div>
        <Badge variant={statusVariant(student.status)} className="ml-auto shrink-0">
          {student.status}
        </Badge>
      </div>

      {/* QR code */}
      <div className="flex justify-center py-4 bg-stone-50 border-y border-stone-100">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>

      {/* ID label */}
      <div className="px-5 py-2 text-center">
        <p className="text-[10px] font-mono text-stone-300 truncate">{student.id}</p>
      </div>

      {/* Actions */}
      <div className="flex border-t border-stone-100">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <Download size={13} /> Download
        </button>
        <div className="w-px bg-stone-100" />
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <Printer size={13} /> Print
        </button>
      </div>
    </div>
  )
}

export default function QRPage() {
  const { students, loading } = useStudents()

  const active = students.filter(s => s.status !== 'dropped')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-stone-900">QR Codes</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          Each intern has a unique QR code. Scan to log time in/out automatically.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : active.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <QrCode size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active interns found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {active.map(s => (
            <InternQRCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  )
}