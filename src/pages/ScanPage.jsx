/**
 * ScanPage.jsx
 * Opens the device camera, continuously scans for QR codes,
 * and on a valid intern QR → records the next time slot in their DTR.
 *
 * Slot order per day: AM In → AM Out → PM In → PM Out
 *
 * Place in: src/pages/ScanPage.jsx
 *
 * Requires: npm install html5-qrcode
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle2, XCircle, ScanLine, Camera, RefreshCw } from 'lucide-react'
import { recordScan } from '@/lib/qrService'

const SLOT_COLORS = {
  am_in:  { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     icon: 'text-sky-500'   },
  am_out: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: 'text-amber-500' },
  pm_in:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: 'text-violet-500'},
  pm_out: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500'},
}

const SLOT_SEQUENCE = ['am_in', 'am_out', 'pm_in', 'pm_out']
const SLOT_LABELS   = { am_in: 'AM Time In', am_out: 'AM Time Out', pm_in: 'PM Time In', pm_out: 'PM Time Out' }

/** Shows the result of the last scan for a few seconds */
function ScanResult({ result, onDismiss }) {
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [result, onDismiss])

  if (!result) return null

  if (result.error) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <XCircle size={22} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Scan failed</p>
          <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
        </div>
      </div>
    )
  }

  if (result.alreadyComplete) {
    return (
      <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4">
        <XCircle size={22} className="text-stone-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-stone-600 text-sm">{result.student?.name}</p>
          <p className="text-xs text-stone-400 mt-0.5">All 4 time slots already recorded for today.</p>
        </div>
      </div>
    )
  }

  const colors = SLOT_COLORS[result.slot] || SLOT_COLORS.am_in

  return (
    <div className={`flex items-start gap-4 ${colors.bg} border ${colors.border} rounded-2xl px-5 py-4`}>
      <CheckCircle2 size={28} className={`${colors.icon} shrink-0 mt-0.5`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`font-bold text-base ${colors.text}`}>{result.student?.name}</p>
          <span className={`font-mono text-lg font-semibold ${colors.text}`}>{result.time}</span>
        </div>
        <p className={`text-xs mt-0.5 ${colors.text} opacity-70`}>
          {result.student?.course} · {result.student?.college}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border} ${colors.text}`}>
            {SLOT_LABELS[result.slot]}
          </span>
          <span className="text-xs text-stone-400">recorded successfully</span>
        </div>
        {/* Progress dots */}
        <div className="mt-3 flex items-center gap-1.5">
          {SLOT_SEQUENCE.map(s => {
            const slotIdx  = SLOT_SEQUENCE.indexOf(s)
            const doneIdx  = SLOT_SEQUENCE.indexOf(result.slot)
            const isDone   = slotIdx <= doneIdx
            const isCurrent = s === result.slot
            const sc = SLOT_COLORS[s]
            return (
              <div
                key={s}
                title={SLOT_LABELS[s]}
                className={`h-2 rounded-full transition-all ${isCurrent ? 'w-6' : 'w-2'} ${isDone ? `${sc.bg} border ${sc.border}` : 'bg-stone-200'}`}
              />
            )
          })}
          <span className="text-[10px] text-stone-400 ml-1">
            {SLOT_SEQUENCE.indexOf(result.slot) + 1} / 4 today
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ScanPage() {
  const scannerRef  = useRef(null)
  const instanceRef = useRef(null)
  const cooldownRef = useRef(false)   // prevents double-scan within 3s

  const [scanning, setScanning]   = useState(false)
  const [camError, setCamError]   = useState('')
  const [result, setResult]       = useState(null)
  const [history, setHistory]     = useState([])   // last 5 scans

  const processQR = useCallback(async (decodedText) => {
    // Cooldown: ignore scans within 3 seconds of each other
    if (cooldownRef.current) return
    cooldownRef.current = true
    setTimeout(() => { cooldownRef.current = false }, 3000)

    // Validate it looks like a UUID
    const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRx.test(decodedText.trim())) {
      setResult({ error: 'Invalid QR code. Please use an intern QR.' })
      return
    }

    try {
      const scan = await recordScan(decodedText.trim())
      setResult(scan)
      setHistory(prev => [
        { ...scan, ts: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4),
      ])
    } catch (err) {
      setResult({ error: err.message })
    }
  }, [])

  const startScanner = useCallback(async () => {
    setCamError('')
    try {
      const html5QrCode = new Html5Qrcode('qr-reader')
      instanceRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        processQR,
        () => {}   // ignore decode errors (normal when no QR in frame)
      )
      setScanning(true)
    } catch (err) {
      setCamError('Could not access camera: ' + err.message)
    }
  }, [processQR])

  const stopScanner = useCallback(async () => {
    if (instanceRef.current) {
      try { await instanceRef.current.stop() } catch {}
      instanceRef.current = null
    }
    setScanning(false)
  }, [])

  // Auto-start on mount, stop on unmount
  useEffect(() => {
    startScanner()
    return () => { stopScanner() }
  }, [])   // eslint-disable-line

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-stone-900">QR Scanner</h1>
        <p className="text-sm text-stone-400 mt-0.5">{today}</p>
      </div>

      {/* Camera viewport */}
      <div className="bg-stone-900 rounded-2xl overflow-hidden relative mb-4" style={{ minHeight: 320 }}>
        <div id="qr-reader" ref={scannerRef} className="w-full" />

        {/* Overlay when not scanning */}
        {!scanning && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <ScanLine size={48} className="opacity-40" />
            <p className="text-sm opacity-50">Starting camera…</p>
          </div>
        )}

        {/* Scanning indicator */}
        {scanning && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-xs font-medium">Scanning</span>
          </div>
        )}
      </div>

      {/* Camera error */}
      {camError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{camError}</p>
          <button
            onClick={startScanner}
            className="mt-2 flex items-center gap-1.5 text-xs text-red-700 font-medium hover:underline"
          >
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}

      {/* Camera controls */}
      <div className="flex gap-2 mb-5">
        {!scanning ? (
          <button
            onClick={startScanner}
            className="flex-1 flex items-center justify-center gap-2 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <Camera size={15} /> Start camera
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-600 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-200 transition-colors"
          >
            <Camera size={15} /> Stop camera
          </button>
        )}
      </div>

      {/* Latest scan result */}
      <ScanResult result={result} onDismiss={() => setResult(null)} />

      {/* Recent scan history */}
      {history.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Recent scans</p>
          <div className="space-y-2">
            {history.map((h, i) => {
              if (h.error || h.alreadyComplete) return null
              const colors = SLOT_COLORS[h.slot] || SLOT_COLORS.am_in
              return (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${colors.bg} border ${colors.border}`} />
                    <div>
                      <p className="text-sm font-medium text-stone-700">{h.student?.name}</p>
                      <p className="text-xs text-stone-400">{SLOT_LABELS[h.slot]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-stone-700">{h.time}</p>
                    <p className="text-[10px] text-stone-300">{h.ts}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-stone-50 border border-stone-100 rounded-2xl px-5 py-4">
        <p className="text-xs font-semibold text-stone-500 mb-2">How it works</p>
        <ol className="space-y-1.5 text-xs text-stone-400 list-decimal list-inside">
          <li>Intern holds their QR code in front of the camera</li>
          <li>System detects the QR and records the current time</li>
          <li>Slots fill in order: AM In → AM Out → PM In → PM Out</li>
          <li>All entries sync directly to the DTR in real time</li>
        </ol>
      </div>
    </div>
  )
}