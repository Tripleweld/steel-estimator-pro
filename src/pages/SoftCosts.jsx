import { useProject } from '../context/ProjectContext'
import { fmtCurrency } from '../utils/calculations'
import { Plus, Trash2, Info } from 'lucide-react'

const UNIT_OPTIONS = ['hrs', 'ls', '%']

export default function SoftCosts() {
  const { state, dispatch } = useProject()
  const rows = state.softCosts

  const handleUpdate = (id, field, value) => {
    const row = rows.find(r => r.id === id)
    if (!row) return
    dispatch({ type: 'UPDATE_SOFT_COST', payload: { id, [field]: value } })
  }

  const handleAdd = () => {
    dispatch({ type: 'ADD_SOFT_COST' })
  }

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_SOFT_COST', payload: id })
  }

  const grandTotalExclPercent = rows.reduce((sum, r) => {
    if (r.unit === '%') return sum
    return sum + ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0))
  }, 0)

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />

      <div>
        <h1 className="page-title">Soft Costs</h1>
        <p className="page-subtitle">
          Project overhead — drawings, engineering, mobilization, insurance, contingency.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="table-header w-[260px]">Item</th>
              <th className="table-header w-[80px] text-right">Qty</th>
              <th className="table-header w-[80px]">Unit</th>
              <th className="table-header w-[110px] text-right">Rate</th>
              <th className="table-header w-[120px] text-right">Total</th>
              <th className="table-header w-[200px]">Notes</th>
              <th className="table-header w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {rows.map(row => {
              const isPercent = row.unit === '%'
              const total = isPercent ? null : (parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0)

              return (
                <tr key={row.id} className={`table-row ${isPercent ? 'bg-amber-50/50' : ''}`}>
                  <td className="table-cell">
                    <input type="text" className="input-field" value={row.item} onChange={e => handleUpdate(row.id, 'item', e.target.value)} placeholder="Cost item" />
                  </td>
                  <td className="table-cell">
                    <input type="number" className="input-number" value={row.qty} onChange={e => handleUpdate(row.id, 'qty', parseFloat(e.target.value) || 0)} min="0" />
                  </td>
                  <td className="table-cell">
                    <select className="input-field" value={row.unit} onChange={e => handleUpdate(row.id, 'unit', e.target.value)}>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input type="number" className="input-number" value={row.rate} onChange={e => handleUpdate(row.id, 'rate', parseFloat(e.target.value) || 0)} min="0" step={isPercent ? '0.1' : '0.01'} />
                  </td>
                  <td className="table-cell currency font-medium text-steel-900">
                    {isPercent ? <span className="text-amber-700 font-semibold">{row.rate}%</span> : fmtCurrency(total)}
                  </td>
                  <td className="table-cell">
                    <input type="text" className="input-field" value={row.notes} onChange={e => handleUpdate(row.id, 'notes', e.target.value)} placeholder={isPercent ? '% of contract / subtotal' : 'Notes'} />
                  </td>
                  <td className="table-cell text-center">
                    <button onClick={() => handleDelete(row.id)} className="btn-danger p-1.5" title="Delete row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-silver-400 py-8">No soft costs configured. Add a row below.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-steel-800 text-silver-300 border-t-2 border-steel-700">
              <td colSpan={4} className="table-cell text-right font-semibold text-silver-100">GRAND TOTAL (excl. % lines)</td>
              <td className="table-cell currency font-bold text-white text-lg">{fmtCurrency(grandTotalExclPercent)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={handleAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add Row</button>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>Lines with unit <strong>"%"</strong> are applied as percentages of the project subtotal in the Summary page. They are excluded from the grand total shown above.</span>
      </div>
    </div>
  )
}
