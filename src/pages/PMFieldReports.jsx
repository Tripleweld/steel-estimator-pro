import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, Trash2, ArrowLeft, Cloud } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { fmtNumber } from '../utils/calculations'

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rain', 'Snow', 'Wind', 'Cold', 'Hot']

export default function PMFieldReports() {
  const { state, dispatch } = useProject()
  const reports = state.projectManagement?.fieldReports || []

  /* Compute total budgeted tons from structural for % complete */
  const budgetTons = useMemo(() => {
    let lbs = 0
    ;(state.structural || []).forEach((r) => {
      const qty = Number(r.qty) || 0
      const lengthFt = Number(r.lengthFt) || 0
      const wtPerFt = Number(r.wtPerFt) || 0
      if (r.section === 'moment') lbs += qty * (Number(r.weightLb) || 0)
      else if (r.section === 'steelDeck') lbs += qty * wtPerFt
      else lbs += qty * lengthFt * wtPerFt
    })
    return lbs / 2000
  }, [state.structural])

  const sorted = useMemo(() => [...reports].sort((a, b) => (a.date || '').localeCompare(b.date || '')), [reports])

  const cumulative = useMemo(() => {
    let pieces = 0, tons = 0
    return sorted.map((r) => {
      pieces += Number(r.pieces) || 0
      tons += Number(r.tons) || 0
      const pct = budgetTons > 0 ? (tons / budgetTons) * 100 : 0
      return { ...r, cumPieces: pieces, cumTons: tons, pctComplete: pct }
    })
  }, [sorted, budgetTons])

  const summary = useMemo(() => {
    if (cumulative.length === 0) return { piecesTotal: 0, tonsTotal: 0, avgTonsPerDay: 0, days: 0, lastPct: 0 }
    const piecesTotal = cumulative[cumulative.length - 1].cumPieces
    const tonsTotal = cumulative[cumulative.length - 1].cumTons
    const days = cumulative.length
    return { piecesTotal, tonsTotal, avgTonsPerDay: days > 0 ? tonsTotal / days : 0, days, lastPct: cumulative[cumulative.length - 1].pctComplete }
  }, [cumulative])

  const addReport = () =>
    dispatch({
      type: 'ADD_FIELD_REPORT',
      payload: {
        id: `fr-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        reporter: '',
        pieces: 0,
        tons: 0,
        weather: 'Sunny',
        crewSize: 0,
        notes: '',
      },
    })
  const updateReport = (id, changes) =>
    dispatch({ type: 'UPDATE_FIELD_REPORT', payload: { id, changes } })
  const deleteReport = (id) => dispatch({ type: 'DELETE_FIELD_REPORT', payload: { id } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/pm/dashboard" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList size={24} className="text-fire-400" /> Field Reports
            </h1>
            <p className="text-steel-400 text-sm mt-1">Daily install progress — pieces, tons, productivity</p>
          </div>
        </div>
        <button
          onClick={addReport}
          className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2"
        >
          <Plus size={16} /> New Daily Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="Days Logged" value={summary.days} accent="text-white" />
        <Tile label="Pieces Total" value={fmtNumber(summary.piecesTotal)} accent="text-fire-300" />
        <Tile label="Tons Total" value={fmtNumber(summary.tonsTotal, 2)} accent="text-fire-300" />
        <Tile label="Avg Tons/Day" value={fmtNumber(summary.avgTonsPerDay, 2)} accent="text-yellow-300" />
        <Tile label="% Complete" value={`${summary.lastPct.toFixed(1)}%`} accent="text-green-300" />
      </div>

      {budgetTons > 0 && (
        <div className="bg-steel-800 border border-steel-700 rounded p-3 text-sm text-steel-300">
          Project budget: <span className="text-white font-semibold">{fmtNumber(budgetTons, 2)} tons</span> (from Structural Takeoff)
        </div>
      )}

      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Reporter</th>
              <th className="px-2 py-2 text-right">Pieces</th>
              <th className="px-2 py-2 text-right">Tons</th>
              <th className="px-2 py-2 text-right">Cum Pcs</th>
              <th className="px-2 py-2 text-right">Cum Tons</th>
              <th className="px-2 py-2 text-right">% Done</th>
              <th className="px-2 py-2 text-left">Weather</th>
              <th className="px-2 py-2 text-right">Crew</th>
              <th className="px-2 py-2 text-left min-w-[180px]">Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cumulative.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-steel-500">
                  No field reports yet. Click <strong className="text-fire-400">New Daily Report</strong> to log today.
                </td>
              </tr>
            ) : (
              cumulative.map((r) => (
                <tr key={r.id} className="border-t border-steel-700">
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      value={r.date}
                      onChange={(e) => updateReport(r.id, { date: e.target.value })}
                      className="bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={r.reporter}
                      onChange={(e) => updateReport(r.id, { reporter: e.target.value })}
                      placeholder="Foreman"
                      className="w-24 bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      value={r.pieces}
                      onChange={(e) => updateReport(r.id, { pieces: Number(e.target.value) || 0 })}
                      className="w-16 text-right bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={r.tons}
                      onChange={(e) => updateReport(r.id, { tons: Number(e.target.value) || 0 })}
                      className="w-16 text-right bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right text-steel-400">{fmtNumber(r.cumPieces)}</td>
                  <td className="px-2 py-1.5 text-right text-steel-400">{fmtNumber(r.cumTons, 2)}</td>
                  <td className="px-2 py-1.5 text-right text-green-300">{r.pctComplete.toFixed(1)}%</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={r.weather}
                      onChange={(e) => updateReport(r.id, { weather: e.target.value })}
                      className="bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                    >
                      {WEATHER_OPTIONS.map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      value={r.crewSize}
                      onChange={(e) => updateReport(r.id, { crewSize: Number(e.target.value) || 0 })}
                      className="w-12 text-right bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={r.notes}
                      onChange={(e) => updateReport(r.id, { notes: e.target.value })}
                      placeholder="Notes / delays / safety"
                      className="w-full bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button onClick={() => deleteReport(r.id)} className="text-steel-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Field Reports
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
