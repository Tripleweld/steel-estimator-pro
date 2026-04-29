import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, RefreshCw, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { fmtCurrency } from '../utils/calculations'

const DEFAULT_CATEGORIES = [
  { id: 'material', label: 'Material (Steel + Misc)' },
  { id: 'fabLabor', label: 'Fab Labour' },
  { id: 'instLabor', label: 'Install Labour' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'subs', label: 'Subcontractors' },
  { id: 'softCosts', label: 'Soft Costs' },
  { id: 'misc', label: 'Misc / Other' },
]

/* Compute budget from project state */
function computeBudgets(state) {
  const fabRate = state.rates?.labourRates?.fabRate || 0
  const instRate = state.rates?.labourRates?.installRate || 0
  const steelRate = state.rates?.materialRates?.find?.((m) => /steel/i.test(m.name))?.rate || 0

  let matCost = 0, fabCost = 0, instCost = 0
  ;(state.structural || []).forEach((r) => {
    const qty = Number(r.qty) || 0
    const lengthFt = Number(r.lengthFt) || 0
    const wtPerFt = Number(r.wtPerFt) || 0
    const fabCrew = Number(r.fabCrew) || 1
    const instCrew = Number(r.instCrew) || 1
    let lbs = 0
    if (r.section === 'moment') lbs = qty * (Number(r.weightLb) || 0)
    else if (r.section === 'steelDeck') lbs = qty * wtPerFt
    else lbs = qty * lengthFt * wtPerFt
    matCost += lbs * steelRate
    if (r.section !== 'steelDeck') {
      fabCost += (Number(r.fabPc) || 0) * fabCrew * qty * fabRate
      instCost += (Number(r.instPc) || 0) * instCrew * qty * instRate
    }
  })

  /* Stairs/Ladders/Railings totalsCommit roll into matCost+fab+inst combined as their totals */
  let stairsTotal = 0
  ;(state.stairs || []).forEach((s) => {
    stairsTotal += s?.totalsCommit?.total || 0
  })
  ;(state.ladder || []).forEach((l) => {
    stairsTotal += l?.totalsCommit?.total || 0
  })
  ;(state.railings || []).forEach((rl) => {
    stairsTotal += rl?.totalsCommit?.total || 0
  })

  /* Misc Metals subgroups */
  let mmTotal = 0
  const mmStd = state.miscMetalsStandard || {}
  Object.keys(mmStd).forEach((k) => {
    ;(mmStd[k] || []).forEach((r) => {
      const qty = Number(r.qty) || 0
      mmTotal += qty * (Number(r.matEa) || 0) + (Number(r.fabHrs) || 0) * qty * fabRate + (Number(r.instHrs) || 0) * qty * instRate
    })
  })

  /* Equipment */
  let eqTotal = 0
  ;(state.equipment || []).forEach((e) => {
    const rateMap = { Day: e.dayRate, Week: e.weekRate, Month: e.monthRate }
    eqTotal += (rateMap[e.period] || 0) * (Number(e.qty) || 0)
  })

  /* Soft Costs */
  let softTotal = 0
  const baseForPct = matCost + fabCost + instCost + mmTotal + stairsTotal + eqTotal
  ;(state.softCosts || []).forEach((r) => {
    if (r.unit === '%') softTotal += (baseForPct * (Number(r.rate) || 0)) / 100
    else softTotal += (Number(r.qty) || 0) * (Number(r.rate) || 0)
  })

  return {
    material: matCost + mmTotal + (stairsTotal * 0.4), // approx material portion
    fabLabor: fabCost,
    instLabor: instCost,
    equipment: eqTotal,
    subs: 0,
    softCosts: softTotal,
    misc: stairsTotal * 0.6, // approx fab+install of stairs/ladders/railings
  }
}

export default function PMTracking() {
  const { state, dispatch } = useProject()
  const tracking = state.projectManagement?.tracking || { categories: [] }

  const computedBudgets = useMemo(() => computeBudgets(state), [state])

  /* Merge: if no tracking.categories yet, seed from defaults with computed budgets */
  const rows = useMemo(() => {
    const existing = tracking.categories || []
    if (existing.length > 0) return existing
    return DEFAULT_CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      budgeted: Math.round(computedBudgets[c.id] || 0),
      committed: 0,
      actual: 0,
    }))
  }, [tracking.categories, computedBudgets])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.budgeted += Number(r.budgeted) || 0
        acc.committed += Number(r.committed) || 0
        acc.actual += Number(r.actual) || 0
        return acc
      },
      { budgeted: 0, committed: 0, actual: 0 }
    )
  }, [rows])

  const variance = totals.budgeted - totals.actual
  const pctUsed = totals.budgeted > 0 ? (totals.actual / totals.budgeted) * 100 : 0

  const syncFromEstimate = () => {
    const fresh = DEFAULT_CATEGORIES.map((c) => {
      const existing = (tracking.categories || []).find((x) => x.id === c.id)
      return {
        id: c.id,
        label: c.label,
        budgeted: Math.round(computedBudgets[c.id] || 0),
        committed: existing?.committed || 0,
        actual: existing?.actual || 0,
      }
    })
    dispatch({ type: 'SET_TRACKING_CATEGORIES', payload: { categories: fresh } })
  }
  const updateRow = (id, changes) =>
    dispatch({ type: 'UPDATE_TRACKING_CATEGORY', payload: { id, changes } })
  const addRow = () =>
    dispatch({
      type: 'ADD_TRACKING_CATEGORY',
      payload: { id: `cat-${Date.now()}`, label: 'Custom', budgeted: 0, committed: 0, actual: 0 },
    })
  const deleteRow = (id) => dispatch({ type: 'DELETE_TRACKING_CATEGORY', payload: { id } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/pm/dashboard" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp size={24} className="text-fire-400" /> Project Tracking
            </h1>
            <p className="text-steel-400 text-sm mt-1">Budget vs Committed vs Actual — variance & burn rate</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addRow}
            className="px-3 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded flex items-center gap-2"
          >
            <Plus size={16} /> Add Category
          </button>
          <button
            onClick={syncFromEstimate}
            className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2"
          >
            <RefreshCw size={16} /> Sync Budget from Estimate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Budget" value={fmtCurrency(totals.budgeted)} accent="text-white" />
        <Tile label="Committed" value={fmtCurrency(totals.committed)} accent="text-yellow-300" />
        <Tile label="Actual" value={fmtCurrency(totals.actual)} accent="text-fire-300" />
        <Tile label={`Variance (${pctUsed.toFixed(1)}% used)`} value={fmtCurrency(variance)} accent={variance >= 0 ? 'text-green-300' : 'text-red-300'} />
      </div>

      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Budgeted</th>
              <th className="px-3 py-2 text-right">Committed</th>
              <th className="px-3 py-2 text-right">Actual</th>
              <th className="px-3 py-2 text-right">Variance</th>
              <th className="px-3 py-2 text-right">% Used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-steel-500">
                  No categories. Click <strong className="text-fire-400">Sync Budget</strong> to seed from your Estimate.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const bud = Number(r.budgeted) || 0
                const act = Number(r.actual) || 0
                const v = bud - act
                const pct = bud > 0 ? (act / bud) * 100 : 0
                return (
                  <tr key={r.id} className="border-t border-steel-700">
                    <td className="px-3 py-1.5">
                      <input
                        value={r.label}
                        onChange={(e) => updateRow(r.id, { label: e.target.value })}
                        className="w-full bg-transparent text-white border-none focus:bg-steel-900 px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={r.budgeted}
                        onChange={(e) => updateRow(r.id, { budgeted: Number(e.target.value) || 0 })}
                        className="w-28 text-right bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={r.committed}
                        onChange={(e) => updateRow(r.id, { committed: Number(e.target.value) || 0 })}
                        className="w-28 text-right bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={r.actual}
                        onChange={(e) => updateRow(r.id, { actual: Number(e.target.value) || 0 })}
                        className="w-28 text-right bg-fire-900/40 text-white border border-fire-700 px-2 py-1 rounded"
                      />
                    </td>
                    <td className={`px-3 py-1.5 text-right font-semibold ${v >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {fmtCurrency(v)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-steel-300">{pct.toFixed(1)}%</td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => deleteRow(r.id)} className="text-steel-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-steel-900 text-white font-semibold">
              <tr className="border-t-2 border-steel-600">
                <td className="px-3 py-2 text-right">TOTAL</td>
                <td className="px-3 py-2 text-right">{fmtCurrency(totals.budgeted)}</td>
                <td className="px-3 py-2 text-right text-yellow-300">{fmtCurrency(totals.committed)}</td>
                <td className="px-3 py-2 text-right text-fire-300">{fmtCurrency(totals.actual)}</td>
                <td className={`px-3 py-2 text-right ${variance >= 0 ? 'text-green-300' : 'text-red-300'}`}>{fmtCurrency(variance)}</td>
                <td className="px-3 py-2 text-right">{pctUsed.toFixed(1)}%</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Project Tracking
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
