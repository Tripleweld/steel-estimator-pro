import { useProject } from '../context/ProjectContext'
import { fmtCurrency } from '../utils/calculations'
import { Plus, Trash2, PackagePlus } from 'lucide-react'

const UNIT_OPTIONS = ['ea', 'lf', 'sf', 'ton', 'ls']

const COMMON_TEMPLATES = [
  { item: 'Open Web Steel Joists', unit: 'ea', leadWeeks: 8 },
  { item: 'Steel Deck (22ga)', unit: 'sf', leadWeeks: 6 },
  { item: 'Shear Studs', unit: 'ea', leadWeeks: 2 },
  { item: 'Grout', unit: 'ea', leadWeeks: 1 },
  { item: 'Anchor Bolts', unit: 'ea', leadWeeks: 3 },
  { item: 'Base Plate Leveling Nuts', unit: 'ea', leadWeeks: 2 },
]

export default function PurchasedItems() {
  const { state, dispatch } = useProject()
  const rows = state.purchased

  const handleUpdate = (id, field, value) => {
    const row = rows.find(r => r.id === id)
    if (!row) return
    const updated = { ...row, [field]: value }
    if (field === 'qty' || field === 'unitCost') {
      updated.total = (parseFloat(updated.qty) || 0) * (parseFloat(updated.unitCost) || 0)
    }
    dispatch({ type: 'UPDATE_PURCHASED_ROW', payload: updated })
  }

  const handleAdd = () => {
    dispatch({ type: 'ADD_PURCHASED_ROW' })
  }

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_PURCHASED_ROW', payload: id })
  }

  const loadCommonItems = () => {
    const existingItems = new Set(rows.map(r => r.item))
    const toAdd = COMMON_TEMPLATES.filter(t => !existingItems.has(t.item))
    if (toAdd.length === 0) return

    // Build new rows with unique IDs and pre-filled data
    const newRows = toAdd.map((template, i) => ({
      id: Date.now() + i + 1,
      item: template.item,
      supplier: '',
      qty: 1,
      unit: template.unit,
      unitCost: 0,
      total: 0,
      leadWeeks: template.leadWeeks,
      notes: '',
    }))

    // Use LOAD_PROJECT to set the full state with new purchased rows appended
    const updatedState = {
      ...state,
      purchased: [...rows, ...newRows],
      isDirty: true,
    }
    dispatch({ type: 'LOAD_PROJECT', payload: updatedState })
  }

  const grandTotal = rows.reduce((sum, r) => {
    return sum + ((parseFloat(r.qty) || 0) * (parseFloat(r.unitCost) || 0))
  }, 0)

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Purchased Items</h1>
          <p className="page-subtitle">
            Items purchased from suppliers — joists, deck, fasteners, grout.
          </p>
        </div>
        <button onClick={loadCommonItems} className="btn-secondary">
          <PackagePlus className="h-4 w-4" />
          Load common items
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              <th className="table-header w-[200px]">Item</th>
              <th className="table-header w-[140px]">Supplier</th>
              <th className="table-header w-[80px] text-right">Qty</th>
              <th className="table-header w-[80px]">Unit</th>
              <th className="table-header w-[110px] text-right">Unit Cost ($)</th>
              <th className="table-header w-[110px] text-right">Total ($)</th>
              <th className="table-header w-[70px] text-right">Lead (wk)</th>
              <th className="table-header w-[160px]">Notes</th>
              <th className="table-header w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {rows.map(row => {
              const total = (parseFloat(row.qty) || 0) * (parseFloat(row.unitCost) || 0)
              return (
                <tr key={row.id} className="table-row">
                  <td className="table-cell">
                    <input
                      type="text"
                      className="input-field"
                      value={row.item}
                      onChange={e => handleUpdate(row.id, 'item', e.target.value)}
                      placeholder="Item name"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="text"
                      className="input-field"
                      value={row.supplier}
                      onChange={e => handleUpdate(row.id, 'supplier', e.target.value)}
                      placeholder="Supplier"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input-number"
                      value={row.qty}
                      onChange={e => handleUpdate(row.id, 'qty', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </td>
                  <td className="table-cell">
                    <select
                      className="input-field"
                      value={row.unit}
                      onChange={e => handleUpdate(row.id, 'unit', e.target.value)}
                    >
                      {UNIT_OPTIONS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input-number"
                      value={row.unitCost}
                      onChange={e => handleUpdate(row.id, 'unitCost', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="table-cell currency font-medium text-steel-900">
                    {fmtCurrency(total)}
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      className="input-number"
                      value={row.leadWeeks}
                      onChange={e => handleUpdate(row.id, 'leadWeeks', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </td>
                  <td className="table-cell">
                    <input
                      type="text"
                      className="input-field"
                      value={row.notes}
                      onChange={e => handleUpdate(row.id, 'notes', e.target.value)}
                      placeholder="Notes"
                    />
                  </td>
                  <td className="table-cell text-center">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="btn-danger p-1.5"
                      title="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="table-cell text-center text-silver-400 py-8">
                  No purchased items yet. Click "Load common items" or add a row below.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-steel-800 text-silver-300 border-t-2 border-steel-700">
              <td colSpan={5} className="table-cell text-right font-semibold text-silver-100">
                Grand Total
              </td>
              <td className="table-cell currency font-bold text-white text-lg">
                {fmtCurrency(grandTotal)}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button onClick={handleAdd} className="btn-primary">
        <Plus className="h-4 w-4" />
        Add Row
      </button>
    </div>
  )
}
