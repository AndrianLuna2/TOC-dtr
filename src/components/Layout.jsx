import { NavLink } from 'react-router-dom'
import { Clock, Users, LayoutDashboard, QrCode, ScanLine } from 'lucide-react'
import tocLogo from '@/assets/toc-logo.png'

const nav = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dtr',      icon: Clock,           label: 'DTR Sheet' },
  { to: '/students', icon: Users,           label: 'Interns'   },
  { to: '/qr',       icon: QrCode,          label: 'QR Codes'  },
  { to: '/scan',     icon: ScanLine,        label: 'Scan'      },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f4f4f0' }}>

      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col" style={{ background: '#0a0a0a' }}>

        {/* Brand */}
        <div className="px-5 pt-6 pb-6 flex items-center gap-3">
          <img src={tocLogo} alt="Triangle Outsourcing Corp" className="w-14 h-14 rounded-xl object-contain" />
          <div>
            <p style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', lineHeight: '1.3' }}>TOC</p>
            <p style={{ color: '#888888', fontSize: '11px', lineHeight: '1.3' }}>Intern Tracker</p>
          </div>
        </div>

        <div style={{ height: '1px', background: '#222222', margin: '0 20px' }} />

        <p style={{ color: '#666666', fontSize: '10px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '20px 20px 8px' }}>
          Menu
        </p>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#ffffff' : '#aaaaaa',
                  background: isActive ? '#1e1e1e' : 'transparent',
                  borderLeft: isActive ? '2px solid #e8c44a' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: '2px',
                  textDecoration: 'none',
                }}>
                  <Icon size={15} style={{ color: isActive ? '#e8c44a' : '#777777', flexShrink: 0 }} />
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-5" style={{ borderTop: '1px solid #1c1c1c' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade8088' }} />
            <p style={{ color: '#888888', fontSize: '12px' }}>System Active</p>
          </div>
          <p style={{ color: '#555555', fontSize: '11px' }}>Triangle Outsourcing Corp
 Interns v1.0</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-3.5 shrink-0" style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ background: '#1a1a1a', color: '#e8c44a', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '99px' }}>
            Triangle Outsourcing Corp
          </span>
          <span style={{ color: '#666666', fontSize: '12px' }}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8" style={{ background: '#f4f4f0' }}>
          {children}
        </main>
      </div>
    </div>
  )
}