import { NavLink } from 'react-router-dom'
import { Clock, Users, LayoutDashboard, BookOpen } from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dtr', icon: Clock, label: 'DTR Sheet' },
  { to: '/students', icon: Users, label: 'Interns' },
]

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-stone-50 flex">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-stone-100 flex flex-col">
        
        <div className="px-5 pt-7 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-display text-base text-stone-900">
              TOC Intern Tracker
            </span>
          </div>
          <p className="text-xs text-stone-400 ml-9">
            Internship System
          </p>
        </div>

        <nav className="flex-1 px-3">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-stone-900 text-white font-medium'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-stone-100">
          <p className="text-xs text-stone-300">
            SPC Interns v1.0
          </p>
        </div>

      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-8 overflow-auto">
        {children}
      </main>

    </div>
  )
}