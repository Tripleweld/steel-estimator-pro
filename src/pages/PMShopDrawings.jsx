import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HardHat, RefreshCw, ArrowLeft, Download, Filter } from 'lucide-react'
import { useProject } from '../context/ProjectContext'

const FAB_STATUS = ['Not Started', 'Cutting', 'Welding', 'Paint', 'QC', 'Ready']
const SHIP_STATUS = ['In Shop', 'Loaded', 'In Transit', 'On Site']
const INST_STATUS = ['Not Installed', 'In Progress', 'Installed', 'Punch']

const STATUS_COLORS = {
  'Not Started': 'bg-steel-700 text-steel-300',
  'Cutting': 'bg-yellow-700/40 text-yellow-200',
  'Welding': 'bg-orange-700/40 text-orange-200',
  'Paint': 'bg-blue-700/40 text-blue-200',
  'QC': 'bg-purple-700/40 text-purple-200',
  'Ready': 'bg-green-700/40 text-green-200',
  'In Shop': 'bg-steel-700 text-steel-300',
  'Loaded': 'bg-yellow-700/40 text-yellow-200',
  'In Transit': 'bg-blue-700/40 text-blue-200',
  'On Site': 'bg-green-700/40 text-green-200',
  'Not Installed': 'bg-steel-700 text-steel-300',
  'In Progress': 'bg-fire-700/40 text-fire-200',
  'Installed': 'bg-green-700/40 text-green-200',
  'Punch': 'bg-yellow-700/40 text-yellow-200',
}

export default function PMShopDrawings() {
  const { state, dispatch } = useProject()
  const sd = state.projectManagement?.shopDrawings || { pieces: [], lastSync: null }
  const pieces = sd.pieces || []
  const [filterFab, setFilterFab] = useState('all')
  const [filterInst, setFilterInst] = useState('all')
  const [search, setSearch] = useState('')

  /* Sync from Structural Takeoff: each row becomes a piece */
  const syncFromStructural = () => {
    const newPieces = []
    ;(state.structural || []).forEach((r, idx) => {
      const qty = Number(r.qty) || 0
      for (let i = 0; i < qty; i++) {
        const existing = pieces.find((p) => p.sourceId === r.id && p.unit === i + 1)
        newPieces.push(
          existing || {
            id: `p-${r.id}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sourceId: r.id,
            mark: `${r.section?.toUpperCase() || 'PC'}-${idx + 1}-${i + 1}`,
            description: r.designation || r.section,
            section: r.section,
            unit: i + 1,
            qty: 1,
            weightLb: (Number(r.lengthFt) || 0) * (Number(r.wtPerFt) || 0),
            fabStatus: 'Not Started',
            shipStatus: 'In Shop',
            instStatus: 'Not Installed',
            notes: '',
          }
        )
      }
    })
    dispatch({
      type: 'SET_SHOP_DRAWINGS',
      payload: { pieces: newPieces, lastSync: new Date().toISOString() },
    })
  }

  const updatePiece = (id, changes) =>
    dispatch({ type: 'UPDATE_SHOP_DRAWING_PIECE', payload: { id, changes } })

  const filtered = useMemo(() => {
    return pieces.filter((p) => {
      if (filterFab !== 'all' && p.fabStatus !== filterFab) return false
      if (filterInst !== 'all' && p.instStatus !== filterInst) return false
      if (search && !`${p.mark} ${p.description}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [pieces, filterFab, filterInst, search])

  const summary = useMemo(() => {
    const total = pieces.length
    const fabReady = pieces.filter((p) => p.fabStatus === 'Ready').length
    const onSite = pieces.filter((p) => p.shipStatus === 'On Site').length
    const installed = pieces.filter((p) => p.instStatus === 'Installed').length
    return { total, fabReady, onSite, installed }
  }, [pieces])

  const exportCSV = () => {
    const headers = ['Mark', 'Description', 'Section', 'Weight Lb', 'Fab Status', 'Ship Status', 'Install Status', 'Notes']
    const rows = filtered.map((p) => [
      p.mark, p.description, p.section, p.weightLb?.toFixed(0) || 0,
      p.fabStatus, p.shipStatus, p.instStatus, (p.notes || '').replace(/,/g, ';'),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shop-drawings-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/pm/dashboard" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <HardHat size={24} className="text-fire-400" /> Shop Drawings
            </h1>
            <p className="text-steel-400 text-sm mt-1">Piece-mark tracker — Fab / Ship / Install status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={syncFromStructural} className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2">
            <RefreshCw size={16} /> Sync from Structural
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total Pieces" value={summary.total} accent="text-white" />
        <Tile label="Fab Ready" value={`${summary.fabReady} / ${summary.total}`} accent="text-yellow-300" />
        <Tile label="On Site" value={`${summary.onSite} / ${summary.total}`} accent="text-blue-300" />
        <Tile label="Installed" value={`${summary.installed} / ${summary.total}`} accent="text-green-300" />
      </div>

      {/* Filters */}
      <div className="bg-steel-800 border border-steel-700 rounded p-3 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-steel-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mark or description"
          className="flex-1 min-w-[200px] bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-sm"
        />
        <label className="text-xs text-steel-400">
          Fab:{' '}
          <select
            value={filterFab}
            onChange={(e) => setFilterFab(e.target.value)}
            className="ml-1 bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-xs"
          >
            <option value="all">All</option>
            {FAB_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-steel-400">
          Install:{' '}
          <select
            value={filterInst}
            onChange={(e) => setFilterInst(e.target.value)}
            className="ml-1 bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-xs"
          >
            <option value="all">All</option>
            {INST_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        {sd.lastSync && (
          <span className="text-xs text-steel-500 ml-auto">
            Last sync: {new Date(sd.lastSync).toLocaleString()}
          </span>
        )}
      </div>

      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-2 py-2 text-left">Mark</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-right">Wt (lb)</th>
              <th className="px-2 py-2 text-left">Fab</th>
              <th className="px-2 py-2 text-left">Ship</th>
              <th className="px-2 py-2 text-left">Install</th>
              <th className="px-2 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-steel-500">
                  {pieces.length === 0
                    ? <>No pieces yet. Click <strong className="text-fire-400">Sync from Structural</strong> to populate from your Structural Takeoff.</>
                    : 'No pieces match the current filters.'}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 500).map((p) => (
                <tr key={p.id} className="border-t border-steel-700">
                  <td className="px-2 py-1.5 font-mono text-fire-300">{p.mark}</td>
                  <td className="px-2 py-1.5 text-white">{p.description}</td>
                  <td className="px-2 py-1.5 text-right text-steel-400">{Number(p.weightLb || 0).toFixed(0)}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={p.fabStatus}
                      onChange={(e) => updatePiece(p.id, { fabStatus: e.target.value })}
                      className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[p.fabStatus] || ''}`}
                    >
                      {FAB_STATUS.map((s) => <option key={s} className="bg-steel-900 text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={p.shipStatus}
                      onChange={(e) => updatePiece(p.id, { shipStatus: e.target.value })}
                      className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[p.shipStatus] || ''}`}
                    >
                      {SHIP_STATUS.map((s) => <option key={s} className="bg-steel-900 text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={p.instStatus}
                      onChange={(e) => updatePiece(p.id, { instStatus: e.target.value })}
                      className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[p.instStatus] || ''}`}
                    >
                      {INST_STATUS.map((s) => <option key={s} className="bg-steel-900 text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={p.notes || ''}
                      onChange={(e) => updatePiece(p.id, { notes: e.target.value })}
                      placeholder="..."
                      className="w-32 bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtered.length > 500 && (
          <div className="text-center text-steel-500 text-xs py-2">
            Showing first 500 of {filtered.length} pieces. Use filters to narrow down.
          </div>
        )}
      </div>

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Shop Drawings
      </div>
    </div>
  )
}

function Tile({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-steel-800 border border-steel-700 rounded p-3">
      <div className="text-xs text-steel-400 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  )
}
