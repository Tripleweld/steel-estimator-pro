import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, FileText, TrendingUp, ClipboardList, FileEdit,
  HardHat, Truck, AlertCircle
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'

const STATUS_LABELS = {
  bidding: { label: 'Bidding', color: 'bg-steel-700 text-steel-300', desc: 'Project not yet awarded' },
  awarded: { label: 'Awarded', color: 'bg-blue-600/30 text-blue-300', desc: 'Project won — kickoff phase' },
  inProgress: { label: 'In Progress', color: 'bg-fire-600/30 text-fire-300', desc: 'Active execution' },
  closed: { label: 'Closed', color: 'bg-green-600/30 text-green-300', desc: 'Final billing & punch list' },
}

const PM_MODULES = [
  { path: '/pm/sov', label: 'Schedule of Values', icon: FileText, desc: 'Progress billing tracker', color: 'border-blue-500/30 bg-blue-500/5' },
  { path: '/pm/tracking', label: 'Project Tracking', icon: TrendingUp, desc: 'Budget vs actual', color: 'border-green-500/30 bg-green-500/5' },
  { path: '/pm/change-orders', label: 'Change Orders', icon: FileEdit, desc: 'CO log', color: 'border-amber-500/30 bg-amber-500/5' },
  { path: '/pm/field-reports', label: 'Field Reports', icon: HardHat, desc: 'Daily progress reports', color: 'border-purple-500/30 bg-purple-500/5' },
  { path: '/pm/shop-drawings', label: 'Shop Drawings', icon: ClipboardList, desc: 'Piece-mark tracker', color: 'border-fire-500/30 bg-fire-500/5' },
]

export default function PMDashboard() {
  const { state, dispatch } = useProject()
  const pi = state.projectInfo || {}
  const status = pi.status || 'bidding'
  const pm = state.projectManagement || {}

  const onChangeStatus = (e) => {
    const newStatus = e.target.value
    dispatch({
      type: 'SET_PROJECT_INFO',
      payload: { status: newStatus, awardedAt: newStatus === 'awarded' && !pi.awardedAt ? new Date().toISOString() : pi.awardedAt }
    })
  }

  const isAwarded = status === 'awarded' || status === 'inProgress' || status === 'closed'

  const kpis = useMemo(() => {
    const sovLines = pm.sov?.lines || []
    const cos = pm.changeOrders || []
    const fieldReports = pm.fieldReports || []
    const shopPieces = pm.shopDrawings?.pieces || []
    const totalBilled = sovLines.reduce((s, l) => s + (Number(l.billed) || 0), 0)
    const coTotal = cos.filter(c => c.status === 'Approved').reduce((s, c) => s + (Number(c.totalCost) || 0), 0)
    const tonsInstalled = fieldReports.reduce((s, r) => s + (Number(r.tonsToday) || 0), 0)
    const piecesTotal = shopPieces.length
    const piecesInstalled = shopPieces.filter(p => p.installStatus === 'Done').length
    return { totalBilled, coTotal, tonsInstalled, piecesTotal, piecesInstalled }
  }, [pm])

  return (
    <div className="min-h-screen bg-steel-950 text-white">
      <div className="accent-stripe" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fire-950/40 text-white">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="page-title text-white">Project Management</h1>
            <p className="page-subtitle text-steel-400">
              Post-award tools — billing, tracking, change orders, field reports
            </p>
          </div>
        </div>

        {/* Status & quick info */}
        <div className="mb-6 rounded-xl border border-steel-700 bg-steel-800 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-steel-400 uppercase tracking-wider">Project</label>
              <div className="text-lg font-semibold text-steel-100">{pi.projectName || 'Untitled Project'}</div>
              <div className="text-xs text-steel-500">{pi.quoteNumber || '—'}</div>
            </div>
            <div>
              <label className="text-[10px] text-steel-400 uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={onChangeStatus}
                className="mt-1 w-full rounded-lg border border-steel-600 bg-steel-900/40 px-3 py-2 text-sm text-white focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
              >
                {Object.entries(STATUS_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>{info.label}</option>
                ))}
              </select>
              <div className="mt-1 text-[10px] text-steel-500">{STATUS_LABELS[status]?.desc}</div>
            </div>
            <div>
              <label className="text-[10px] text-steel-400 uppercase tracking-wider">Awarded</label>
              <div className="text-lg font-semibold text-steel-100">
                {pi.awardedAt ? new Date(pi.awardedAt).toLocaleDateString() : '—'}
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_LABELS[status]?.color}`}>
                {STATUS_LABELS[status]?.label}
              </span>
            </div>
          </div>
        </div>

        {!isAwarded && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <strong>Project not yet awarded.</strong> Set status to <em>Awarded</em> to unlock all PM modules. You can still preview them, but data won't flow into reports until the project is marked awarded.
            </div>
          </div>
        )}

        {/* KPI tiles */}
        {isAwarded && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiTile label="Billed to Date" value={`$${Math.round(kpis.totalBilled).toLocaleString()}`} color="text-blue-400" />
            <KpiTile label="Approved COs" value={`$${Math.round(kpis.coTotal).toLocaleString()}`} color="text-amber-400" />
            <KpiTile label="Tons Installed" value={kpis.tonsInstalled.toFixed(1)} color="text-purple-400" />
            <KpiTile label="Pieces Installed" value={`${kpis.piecesInstalled} / ${kpis.piecesTotal}`} color="text-fire-400" />
            <KpiTile label="Field Reports" value={(pm.fieldReports || []).length} color="text-green-400" />
          </div>
        )}

        {/* Modules */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-steel-300 mb-3">Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PM_MODULES.map(m => (
              <Link
                key={m.path}
                to={m.path}
                className={`rounded-xl border ${m.color} p-5 hover:bg-steel-800 transition flex items-start gap-3`}
              >
                <m.icon className="h-6 w-6 text-fire-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="text-base font-semibold text-steel-100">{m.label}</div>
                  <div className="text-xs text-steel-400">{m.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-10 border-t border-steel-700 pt-6 text-center">
          <p className="text-xs text-steel-500">
            Triple Weld Inc. · Steel Estimator Pro · Project Management Module
          </p>
        </div>
      </div>
    </div>
  )
}

function KpiTile({ label, value, color }) {
  return (
    <div className="rounded-lg border border-steel-700 bg-steel-800 p-4">
      <div className="text-[10px] text-steel-400 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}
