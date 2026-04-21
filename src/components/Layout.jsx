import { NavLink } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import {
  LayoutDashboard,
  Settings,
  Table2,
  Wrench,
  ArrowUpDown,
  Fence,
  SquareSlash,
  Grid3X3,
  Truck,
  ShoppingCart,
  DollarSign,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { divider: true, label: 'SETUP' },
  { path: '/rates', label: 'Rates & Config', icon: Settings },
  { divider: true, label: 'TAKEOFF' },
  { path: '/structural', label: 'Structural Takeoff', icon: Table2 },
  { path: '/misc-metals', label: 'Misc Metals', icon: Wrench },
  { path: '/stairs', label: 'Stairs', icon: ArrowUpDown },
  { path: '/railings', label: 'Railings', icon: Fence },
  { path: '/ladder', label: 'Ladder', icon: SquareSlash },
  { path: '/joist-reinf', label: 'Joist Reinf.', icon: Grid3X3 },
  { divider: true, label: 'COSTS' },
  { path: '/equipment', label: 'Equipment', icon: Truck },
  { path: '/purchased', label: 'Purchased Items', icon: ShoppingCart },
  { path: '/soft-costs', label: 'Soft Costs', icon: DollarSign },
  { divider: true, label: 'OUTPUT' },
  { path: '/summary', label: 'Summary', icon: FileSpreadsheet },
  { path: '/quote', label: 'Quote', icon: FileText },
]

export default function Layout({ children }) {
  const { state } = useProject()
  const [collapsed, setCollapsed] = useState(false)

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex h-screen overflow-hidden bg-steel-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-steel-950 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand header */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* TW logo mark */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fire-500 to-fire-700 shadow-lg shadow-fire-600/30">
              <span className="text-sm font-black text-white tracking-tighter">
                TW
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-white tracking-tight">
                  Steel Estimator
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-fire-500">
                  Triple Weld Inc.
                </div>
              </div>
            )}
          </div>
          {!collapsed && <div className="accent-stripe mt-4 opacity-60" />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {navItems.map((item, i) => {
            if (item.divider) {
              if (collapsed)
                return (
                  <div
                    key={i}
                    className="my-2 border-t border-steel-800"
                  />
                )
              return (
                <div key={i} className="mt-4 mb-1.5 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-steel-600">
                    {item.label}
                  </span>
                </div>
              )
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link'
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-3 border-t border-steel-800 text-steel-600 hover:text-silver-300 transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-silver-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-silver-500">Project:</span>
            <span className="font-bold text-steel-900">
              {state.projectInfo.projectName || 'Untitled Project'}
            </span>
            <span className="text-silver-300">|</span>
            <span className="text-silver-500">Quote #:</span>
            <span className="font-semibold font-mono text-steel-800">
              {state.projectInfo.quoteNumber}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {state.isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <Save size={14} />
                Saved
              </span>
            )}
            <span className="text-silver-400">{today}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
