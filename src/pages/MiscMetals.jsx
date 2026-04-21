import { useState, useMemo, useRef, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { searchShapes } from '../data/aisc-shapes'
import { fmtNumber, fmtCurrency } from '../utils/calculations'
import { Plus, Trash2, Search, Wrench } from 'lucide-react'

const CATEGORIES = [
  'Plates',
  'Angles',
  'Channels',
  'Tubes',
  'Grating',
  'Embed Plates',
  'Base Plates',
  'Misc',
]

/**
 * ShapeAutocomplete — AISC shape search input with dropdown (max 8 results).
 */
function ShapeAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    onChange(val)

    if (val.trim().length >= 1) {
      const matches = searchShapes(val).slice(0, 8)
      setResults(matches)
      setOpen(matches.length > 0)
      setActiveIndex(-1)
    } else {
      setResults([])
      setOpen(false)
    }
  }

  function handleSelect(shape) {
    setQuery(shape.shape)
    setOpen(false)
    setResults([])
    onSelect(shape)
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. L4x4"
          className="input-field pr-7"
        />
        <Search className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-silver-400" />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-md border border-silver-200 bg-white shadow-lg">
          {results.map((shape, idx) => (
            <li
              key={shape.shape}
              onMouseDown={() => handleSelect(shape)}
              className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm ${
                idx === activeIndex ? 'bg-fire-50 text-fire-700' : 'text-steel-700 hover:bg-fire-50/30'
              }`}
            >
              <span className="font-medium">{shape.shape}</span>
              <span className="text-xs text-silver-400">{shape.w} lb/ft</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function MiscMetals() {
  const { state, dispatch } = useProject()
  const rows = state.miscMetals

  // ── Handlers ──

  function addRow() {
    dispatch({ type: 'ADD_MISC_METAL_ROW' })
  }

  function deleteRow(id) {
    dispatch({ type: 'DELETE_MISC_METAL_ROW', payload: id })
  }

  function updateRow(id, changes) {
    const existing = rows.find(r => r.id === id)
    if (!existing) return

    const updated = { ...existing, ...changes }

    // Recalculate derived fields
    const totalWt = updated.qty * updated.unitWt
    const totalCost = updated.qty * updated.unitCost

    dispatch({
      type: 'UPDATE_MISC_METAL_ROW',
      payload: { ...updated, totalWt, totalCost },
    })
  }

  function handleShapeSelect(id, shape) {
    updateRow(id, { shape: shape.shape, unitWt: shape.w })
  }

  // ── Summary ──

  const summary = useMemo(() => {
    const totalWt = rows.reduce((sum, r) => sum + (r.totalWt || 0), 0)
    const totalCost = rows.reduce((sum, r) => sum + (r.totalCost || 0), 0)
    const totalFabHrs = rows.reduce((sum, r) => sum + (r.fabHrs || 0), 0)
    const totalInstHrs = rows.reduce((sum, r) => sum + (r.instHrs || 0), 0)
    return {
      rowCount: rows.length,
      totalWt,
      totalTons: totalWt / 2000,
      totalCost,
      totalFabHrs,
      totalInstHrs,
    }
  }, [rows])

  // ── Render ──

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-fire-600" />
          <h1 className="page-title">Misc Metals Takeoff</h1>
        </div>
        <p className="page-subtitle">
          Catalogue miscellaneous steel items by category. AISC shape lookup auto-fills unit weight
          where applicable.
        </p>
      </div>

      {/* Misc Metals Table */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="section-title">Misc Metal Items</h2>
          <button onClick={addRow} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr>
                <th className="table-header w-32">Category</th>
                <th className="table-header w-20">Mark</th>
                <th className="table-header w-36">Description</th>
                <th className="table-header w-40">Shape</th>
                <th className="table-header w-16 text-right">Qty</th>
                <th className="table-header w-24 text-right">Unit Wt (lb)</th>
                <th className="table-header w-28 text-right">Total Wt (lb)</th>
                <th className="table-header w-24 text-right">Unit Cost ($)</th>
                <th className="table-header w-28 text-right">Total Cost ($)</th>
                <th className="table-header w-24 text-right">Fab Hrs</th>
                <th className="table-header w-24 text-right">Inst Hrs</th>
                <th className="table-header w-36">Notes</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-10 text-center text-sm text-silver-400">
                    No misc metal items yet. Click <strong>Add Row</strong> to begin.
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <MiscMetalRow
                  key={row.id}
                  row={row}
                  onUpdate={updateRow}
                  onDelete={deleteRow}
                  onShapeSelect={handleShapeSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="card">
        <h2 className="section-title mb-4">Takeoff Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard label="Total Rows" value={summary.rowCount} />
          <SummaryCard label="Total Weight (lbs)" value={fmtNumber(summary.totalWt, 0)} />
          <SummaryCard label="Total Weight (tons)" value={fmtNumber(summary.totalTons, 2)} />
          <SummaryCard label="Total Cost" value={fmtCurrency(summary.totalCost)} />
          <SummaryCard label="Total Fab Hours" value={fmtNumber(summary.totalFabHrs, 1)} />
          <SummaryCard label="Total Install Hours" value={fmtNumber(summary.totalInstHrs, 1)} />
        </div>
      </div>
    </div>
  )
}

/**
 * Individual misc metal table row.
 */
function MiscMetalRow({ row, onUpdate, onDelete, onShapeSelect }) {
  function set(field, value) {
    onUpdate(row.id, { [field]: value })
  }

  function setNum(field, value) {
    onUpdate(row.id, { [field]: parseFloat(value) || 0 })
  }

  return (
    <tr className="table-row group">
      {/* Category */}
      <td className="table-cell">
        <select
          value={row.category}
          onChange={e => set('category', e.target.value)}
          className="input-field"
        >
          <option value="">-- Select --</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </td>

      {/* Mark */}
      <td className="table-cell">
        <input
          type="text"
          value={row.mark}
          onChange={e => set('mark', e.target.value)}
          className="input-field"
          placeholder="M1"
        />
      </td>

      {/* Description */}
      <td className="table-cell">
        <input
          type="text"
          value={row.description}
          onChange={e => set('description', e.target.value)}
          className="input-field"
          placeholder="Base plate"
        />
      </td>

      {/* Shape (autocomplete) */}
      <td className="table-cell">
        <ShapeAutocomplete
          value={row.shape}
          onChange={val => set('shape', val)}
          onSelect={shape => onShapeSelect(row.id, shape)}
        />
      </td>

      {/* Qty */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          value={row.qty}
          onChange={e => setNum('qty', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Unit Wt */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.unitWt}
          onChange={e => setNum('unitWt', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Total Wt (read-only) */}
      <td className="table-cell currency font-medium text-steel-800">
        {fmtNumber(row.totalWt, 0)}
      </td>

      {/* Unit Cost */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.unitCost}
          onChange={e => setNum('unitCost', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Total Cost (read-only) */}
      <td className="table-cell currency font-medium text-steel-800">
        {fmtCurrency(row.totalCost)}
      </td>

      {/* Fab Hrs */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.25"
          value={row.fabHrs}
          onChange={e => setNum('fabHrs', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Inst Hrs */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.25"
          value={row.instHrs}
          onChange={e => setNum('instHrs', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Notes */}
      <td className="table-cell">
        <input
          type="text"
          value={row.notes}
          onChange={e => set('notes', e.target.value)}
          className="input-field"
          placeholder="—"
        />
      </td>

      {/* Delete */}
      <td className="table-cell text-center">
        <button
          onClick={() => onDelete(row.id)}
          className="btn-danger p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete row"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <p className="number-big mt-1">{value}</p>
    </div>
  )
}
