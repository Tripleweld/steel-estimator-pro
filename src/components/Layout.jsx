import { NavLink } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import {
  LayoutDashboard,
  Settings,
  Hammer,
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
  BookOpen,
  Brain,
  Briefcase,
  FileEdit,
  TrendingUp,
  ClipboardList,
  HardHat,
  Radar,
  Users,
  FolderPlus,
  FolderOpen } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { divider: true, label: 'PROJECTS' },
  { path: '/new-project', label: 'New Project', icon: FolderPlus },
  { path: '/projects', label: 'Existing Projects', icon: FolderOpen },
  { divider: true, label: 'ESTIMATING' },
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { divider: true, label: 'SETUP' },
  { path: '/rates', label: 'Rates & Config', icon: Settings },
  { path: '/fab-install-standards', label: 'Fab & Install Standards', icon: Hammer },
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
  { divider: true, label: 'AI' },
  { path: '/ai-takeoff', label: 'AI Takeoff', icon: Brain },
  { divider: true, label: 'PROJECT MANAGEMENT' },
  { path: '/pm/dashboard', label: 'PM Dashboard', icon: Briefcase },
  { path: '/pm/sov', label: 'Schedule of Values', icon: FileText, requiresStatus: 'awarded' },
  { path: '/pm/change-orders', label: 'Change Orders', icon: FileEdit, requiresStatus: 'awarded' },
  { path: '/pm/tracking', label: 'Project Tracking', icon: TrendingUp, requiresStatus: 'awarded' },
  { path: '/pm/field-reports', label: 'Field Reports', icon: ClipboardList, requiresStatus: 'awarded' },
  { path: '/pm/shop-drawings', label: 'Shop Drawings', icon: HardHat, requiresStatus: 'awarded' },
  { divider: true, label: 'TENDERRADAR' },
  { path: '/tenders/inbox', label: 'Inbox', icon: Radar },
  { path: '/tenders/gc-directory', label: 'GC Directory', icon: Users },
  { divider: true, label: 'HELP' },
  { path: '/manual', label: 'User Manual', icon: BookOpen },
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
    <div className="flex h-screen overflow-hidden bg-steel-950">
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
              <svg viewBox="0 0 40 40" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* I-beam silhouette */}
                <path d="M8 9 H32 V13.5 H22.5 V26.5 H32 V31 H8 V26.5 H17.5 V13.5 H8 Z" fill="white" fillOpacity="0.22"/>
                {/* TW initials */}
                <text x="20" y="25.5" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="Inter, system-ui, sans-serif" style={{letterSpacing:'-0.5px'}}>TW</text>
                {/* Welding arc spark */}
                <circle cx="31.5" cy="8.5" r="2.6" fill="#fef3c7"/>
                <circle cx="31.5" cy="8.5" r="1.3" fill="#fbbf24"/>
                <line x1="31.5" y1="8.5" x2="35" y2="5" stroke="#fef3c7" strokeWidth="0.7" strokeLinecap="round"/>
                <line x1="31.5" y1="8.5" x2="35" y2="12" stroke="#fef3c7" strokeWidth="0.7" strokeLinecap="round"/>
              </svg>
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
          {navItems.filter(item => {
            if (!item.requiresStatus) return true;
            const s = state.projectInfo?.status || 'bidding';
            const order = ['bidding', 'awarded', 'inProgress', 'closed'];
            return order.indexOf(s) >= order.indexOf(item.requiresStatus);
          }).map((item, i) => {
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
        <header className="flex items-center justify-between border-b border-steel-700 bg-steel-900 px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-silver-500">Project:</span>
            <span className="font-bold text-white">
              {state.projectInfo.projectName || 'Untitled Project'}
            </span>
            <span className="text-silver-300">|</span>
            <span className="text-silver-500">Quote #:</span>
            <span className="font-semibold font-mono text-silver-200">
              {state.projectInfo.quoteNumber}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {state.isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400">
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
