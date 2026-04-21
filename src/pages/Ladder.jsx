import { useProject } from '../context/ProjectContext'
import { fmtCurrency, fmtNumber } from '../utils/calculations'
import { useState, useMemo } from 'react'
import { Plus, Trash2, ArrowUpFromLine } from 'lucide-react'

const LADDER_TYPES = ['Fixed Ladder', 'Roof Access Ladder', 'Ship Ladder']
const MATERIALS = ['Structural steel', 'Galvanized steel', 'Stainless steel']

function calcRowWeight(heightFt, hasCage) {
  return heightFt * (hasCage ? 25 : 15)
}

function calcFabHrs(weightLbs) {
  return (weightLbs / 2000) * 25
}

function calcInstHrs(weightLbs) {
  return (weightLbs / 2000) * 20
}

export default function Ladder() {
  const { state, dispatch } = useProject()
  const rows = state.ladder

  function addRow() {
    dispatch({ type: 'ADD_LADDER_ROW' })
  }

  function deleteRow(id) {
    dispatch({ type: 'DELETE_LADDER_ROW', payload: id })
  }

  function updateRow(id, field, value) {
    const row = rows.find((r) => r.id === id)
    if (!row) return

    const updated = { ...row, [field]: value }

    const heightFt = field === 'heightFt' ? Number(value) || 0 : updated.heightFt
    const hasCage = field === 'hasCage' ? value : updated.hasCage
    const weightLbs = calcRowWeight(heightFt, hasCage)
    const fabHrs = calcFabHrs(weightLbs)
    const instHrs = calcInstHrs(weightLbs)

    dispatch({
      type: 'UPDATE_LADDER_ROW',
      payload: {
        id,
        [field]: field === 'heightFt' ? Number(value) || 0
          : field === 'hasCage' ? value
          : value,
        weightLbs: Math.round(weightLbs),
        fabHrs: Math.round(fabHrs * 10) / 10,
        instHrs: Math.round(instHrs * 10) / 10,
      },
    })
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        heightFt: acc.heightFt + (r.heightFt || 0),
        weightLbs: acc.weightLbs + (r.weightLbs || 0),
        fabHrs: acc.fabHrs + (r.fabHrs || 0),
        instHrs: acc.instHrs + (r.instHrs || 0),
      }),
      { heightFt: 0, weightLbs: 0, fabHrs: 0, instHrs: 0 }
    )
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ArrowUpFromLine className="h-7 w-7 text-fire-600" />
            Ladder Takeoff
          </h1>
          <p className="page-subtitle">
            Fixed ladders, roof access ladders, and ship ladders with OHSA cage requirements
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
              <th className="table-header">Location</th>
              <th className="table-header">Type</th>
              <th className="table-header">Height (ft)</th>
              <th className="table-header text-center">Has Cage</th>
              <th className="table-header">Material</th>
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
                <td colSpan={10} className="table-cell text-center text-silver-400 py-8">
                  No ladder rows yet. Click "Add Row" to begin.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const cageRequired = row.heightFt > 20
              return (
                <tr key={row.id} className="table-row">
                  <td className="table-cell">
                    <input
                      type="text"
                      className="input-field w-full min-w-[100px]"
                      value={row.location}
                      onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                      placeholder="e.g. Roof Hatch"
                    />
                  </td>
                  <td className="table-cell">
                    <select
                      className="input-field w-full min-w-[130px]"
                      value={row.type}
                      onChange={(e) => updateRow(row.id, 'type', e.target.value)}
                    >
                      {LADDER_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input-number w-full min-w-[70px]"
                      value={row.heightFt}
                      onChange={(e) => updateRow(row.id, 'heightFt', e.target.value)}
                    />
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-silver-300 text-fire-600 focus:ring-fire-500"
                        checked={row.hasCage}
                        onChange={(e) => updateRow(row.id, 'hasCage', e.target.checked)}
                      />
                      {cageRequired && !row.hasCage && (
                        <span className="badge-error text-[10px] leading-tight">
                          OHSA req'd
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <select
                      className="input-field w-full min-w-[130px]"
                      value={row.material}
                      onChange={(e) => updateRow(row.id, 'material', e.target.value)}
                    >
                      {MATERIALS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
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
              )
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-steel-800 text-silver-300 font-semibold border-t-2 border-steel-700">
                <td className="table-cell text-silver-100" colSpan={2}>Totals</td>
                <td className="table-cell text-right font-mono text-silver-100">{fmtNumber(totals.heightFt, 1)}</td>
                <td className="table-cell"></td>
                <td className="table-cell"></td>
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
