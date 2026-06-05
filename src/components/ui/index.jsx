import { X } from 'lucide-react'

/* ── Button ─────────────────────────────────────────────── */
export function Button({ children, variant = 'default', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    default: 'bg-white border border-stone-200 text-stone-800 hover:bg-stone-50',
    primary: 'bg-stone-900 text-white hover:bg-stone-700',
    danger:  'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100',
    ghost:   'text-stone-500 hover:bg-stone-100 hover:text-stone-800',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

/* ── Badge ───────────────────────────────────────────────── */
export function Badge({ children, variant = 'default' }) {
  const variants = {
    default:   'bg-stone-100 text-stone-600',
    success:   'bg-emerald-100 text-emerald-700',
    warning:   'bg-amber-100 text-amber-700',
    danger:    'bg-red-100 text-red-700',
    info:      'bg-sky-100 text-sky-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

/* ── Card ────────────────────────────────────────────────── */
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-modal">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="font-display text-lg text-stone-900">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ── FormField ───────────────────────────────────────────── */
export function FormField({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  )
}

/* ── Input ───────────────────────────────────────────────── */
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 bg-stone-50 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 transition-all ${className}`}
      {...props}
    />
  )
}

/* ── Select ──────────────────────────────────────────────── */
export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

/* ── Avatar ──────────────────────────────────────────────── */
export function Avatar({ name = '', size = 'md' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = ['bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-teal-100 text-teal-700']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

/* ── ProgressBar ─────────────────────────────────────────── */
export function ProgressBar({ value, className = '' }) {
  const color = value >= 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-400' : 'bg-stone-300'
  return (
    <div className={`h-1.5 bg-stone-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

/* ── Spinner ─────────────────────────────────────────────── */
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
    </div>
  )
}

/* ── StatCard ────────────────────────────────────────────── */
export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-display ${accent || 'text-stone-900'}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}
