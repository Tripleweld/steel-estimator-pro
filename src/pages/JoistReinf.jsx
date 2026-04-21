import { useProject } from '../context/ProjectContext'
import { fmtCurrency, fmtNumber } from '../utils/calculations'
import { useState, useMemo } from 'react'
import { Plus, Trash2, Columns3 } from 'lucide-react'

const REINF_METHODS = ['Angle + Plate', 'Tube Truss', 'Strongback', 'Full Replacement']

const WEIGHT_PER_FT = {
  'Angle + Plate': 5,
  'Tube Truss': 8,
  Strongback: 3,
  'Full Replacement': 12,
}

// Triple Weld benchmarks: 100 min/pc fab, 120 min/pc install
const FAB_MIN_PER_PC = 100
const INST_MIN_PER_PC = 120

function calcRowWeight(method, span, qty) {
  const rate = WEIGHT_PER_FT[method] || 5
  return span * rate * qty
}

function calcFabHrs(qty) {
  return (qty * FAB_MIN_PER_PC) / 60
}

function calcInstHrs(qty) {
  return (qty * INST_MIN_PER_PC) / 60
}

export default function JoistReinf() {
  const { state, dispatch } = useProject()
  const rows = state.joistReinf

  function addRow() {
    dispatch({ type: 'ADD_JOIST_REINF_ROW' })
  }

  function deleteRow(id) {
    dispatch({ type: 'DELETE_JOIST_REINF_ROW', payload: id })
  }

  function updateRow(id, field, value) {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    const updated = { ...row, [field]: value }

    const method = field === 'reinfMethod' ? value : updated.reinfMethod
    const span = field === 'span' ? Number(value) || 0 : updated.span
    const qty = field === 'qty' ? Number(value) || 0 : updated.qty
    const weightLbs = calcRowWeight(method, span, qty)
    const fabHrs = calcFabHrs(qty)
    const instHrs = calcInstHrs(qty)

    dispatch({
      type: 'UPDATE_JOIST_REINF_ROW',
      payload: {
        id,
        [field]: field === 'span' || field === 'qty' ? Number(value) || 0 : value,
        weightLbs: Math.round(weightLbs),
        fabHrs: Math.round(fabHrs * 10) / 10,
        instHrs: Math.round(instHrs * 10) / 10,
      },
    })
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        qty: acc.qty + (r.qty || 0),
        weightLbs: acc.weightLbs + (r.weightLbs || 0),
        fabHrs: acc.fabHrs + (r.fabHrs || 0),
        instHrs: acc.instHrs + (r.instHrs || 0),
      }),
      { qty: 0, weightLbs: 0, fabHrs: 0, instHrs: 0 }
    )
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Columns3 className="h-7 w-7 text-fire-600" />
            Joist Reinforcement
          </h1>
          <p className="page-subtitle">
            Reinforcement methods for open-web steel joists per Triple Weld benchmarks
          </p>
        </div>
        <button onClick={addRow} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Row
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-header">Mark</th>
              <th className="table-header">Location</th>
              <th className="table-header">Joist Type</th>
              <th className="table-header">Span (ft)</th>
              <th className="table-header">Reinforcement Method</th>
              <th className="table-header">Qty</th>
              <th className="table-header text-right">Weight (lbs)</th>
              <th className="table-header text-right">Fab Hrs</th>
              <th className="table-header text-right">Inst Hrs</th>
              <th className="table-header">Notes</th>
              <th className="table-header w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="table-cell text-center text-silver-400 py-8">
                  No joist reinforcement rows yet. Click "Add Row" to begin.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-cell">
                  <input
                    type="text"
                    className="input-field w-full min-w-[70px]"
                    value={row.mark}
                    onChange={(e) => updateRow(row.id, 'mark', e.target.value)}
                    placeholder="JR-01"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    className="input-field w-full min-w-[100px]"
                    value={row.location}
                    onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                    placeholder="Grid A-3"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    className="input-field w-full min-w-[80px]"
                    value={row.joistType}
                    onChange={(e) => updateRow(row.id, 'joistType', e.target.value)}
                    placeholder="24K9"
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="number"
                    className="input-number w-full min-w-[70px]"
                    value={row.span}
                    onChange={(e) => updateRow(row.id, 'span', e.target.value)}
                  />
                </td>
                <td className="table-cell">
                  <select
                    className="input-field w-full min-w-[140px]"
                    value={row.reinfMethod}
                    onChange={(e) => updateRow(row.id, 'reinfMethod', e.target.value)}
                  >
                    {REINF_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </td>
                <td className="table-cell">
                  <input
                    type="number"
                    className="input-number w-full min-w-[60px]"
                    value={row.qty}
                    min={1}
                    onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                  />
                </td>
                <td className="table-cell currency">
                  {fmtNumber(row.weightLbs)}
                </td>
                <td className="table-cell currency">
                  {fmtNumber(row.fabHrs, 1)}
                </td>
                <td className="table-cell currency">
                  {fmtNumber(row.instHrs, 1)}
                </td>
                <td className="table-cell">
                  <input
                    type="text"
                    className="input-field w-full min-w-[100px]"
                    value={row.notes}
                    onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                    placeholder="Notes"
                  />
                </td>
                <td className="table-cell">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="btn-danger p-1.5"
                    title="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-steel-800 text-silver-300 font-semibold border-t-2 border-steel-700">
                <td className="table-cell text-silver-100" colSpan={5}>Totals</td>
                <td className="table-cell text-right font-mono text-silver-100">{fmtNumber(totals.qty)}</td>
                <td className="table-cell text-right font-mono font-bold text-white">{fmtNumber(totals.weightLbs)}</td>
                <td className="table-cell text-right font-mono text-silver-100">{fmtNumber(totals.fabHrs, 1)}</td>
                <td className="table-cell text-right font-mono text-silver-100">{fmtNumber(totals.instHrs, 1)}</td>
                <td className="table-cell" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
