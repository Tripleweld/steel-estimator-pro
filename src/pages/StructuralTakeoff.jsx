import { useState, useMemo, useRef, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { searchShapes } from '../data/aisc-shapes'
import { fmtNumber } from '../utils/calculations'
import { Plus, Trash2, Search, HardHat } from 'lucide-react'

/**
 * ShapeAutocomplete — reusable AISC shape search input with dropdown.
 * Shows up to 8 matching results. On select, calls onSelect(shape).
 */
function ShapeAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef(null)

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Close dropdown on outside click
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
          placeholder="e.g. W14x30"
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

export default function StructuralTakeoff() {
  const { state, dispatch } = useProject()
  const rows = state.structural
  const defaults = state.rates.productivityDefaults

  // ── Handlers ──

  function handleDefaultChange(field, value) {
    dispatch({
      type: 'SET_PRODUCTIVITY',
      payload: { [field]: parseFloat(value) || 0 },
    })
  }

  function addRow() {
    dispatch({ type: 'ADD_STRUCTURAL_ROW' })
  }

  function deleteRow(id) {
    dispatch({ type: 'DELETE_STRUCTURAL_ROW', payload: id })
  }

  function updateRow(id, changes) {
    const existing = rows.find(r => r.id === id)
    if (!existing) return

    const updated = { ...existing, ...changes }

    // Recalculate derived fields
    const totalWt = updated.qty * updated.length * updated.wtPerFt
    const totalFabHrs = (totalWt / 2000) * updated.fabHrsPerTon
    const totalInstHrs = (totalWt / 2000) * updated.instHrsPerTon

    dispatch({
      type: 'UPDATE_STRUCTURAL_ROW',
      payload: { ...updated, totalWt, totalFabHrs, totalInstHrs },
    })
  }

  function handleShapeSelect(id, shape) {
    updateRow(id, { shape: shape.shape, wtPerFt: shape.w })
  }

  // ── Summary ──

  const summary = useMemo(() => {
    const totalWt = rows.reduce((sum, r) => sum + (r.totalWt || 0), 0)
    const totalFabHrs = rows.reduce((sum, r) => sum + (r.totalFabHrs || 0), 0)
    const totalInstHrs = rows.reduce((sum, r) => sum + (r.totalInstHrs || 0), 0)
    return {
      rowCount: rows.length,
      totalWt,
      totalTons: totalWt / 2000,
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
          <HardHat className="h-6 w-6 text-fire-600" />
          <h1 className="page-title">Structural Takeoff</h1>
        </div>
        <p className="page-subtitle">
          Enter structural steel members. Shape selection auto-fills weight from the AISC library
          and calculates fabrication &amp; installation hours.
        </p>
      </div>

      {/* Default Productivity Rates */}
      <div className="card">
        <h2 className="section-title mb-4">Default Productivity Rates</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">
              Fab Hrs / Ton
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={defaults.fabHrsPerTon}
              onChange={e => handleDefaultChange('fabHrsPerTon', e.target.value)}
              className="input-number"
            />
          </div>
          <div>
            <label className="label">
              Install Hrs / Ton
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={defaults.installHrsPerTon}
              onChange={e => handleDefaultChange('installHrsPerTon', e.target.value)}
              className="input-number"
            />
          </div>
        </div>
      </div>

      {/* Structural Members Table */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="section-title">Structural Members</h2>
          <button onClick={addRow} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px]">
            <thead>
              <tr>
                <th className="table-header w-24">Mark</th>
                <th className="table-header w-40">Description</th>
                <th className="table-header w-44">Shape</th>
                <th className="table-header w-16 text-right">Qty</th>
                <th className="table-header w-24 text-right">Length (ft)</th>
                <th className="table-header w-24 text-right">Wt/ft (lb)</th>
                <th className="table-header w-28 text-right">Total Wt (lb)</th>
                <th className="table-header w-24 text-right">Fab Hrs/Ton</th>
                <th className="table-header w-24 text-right">Total Fab Hrs</th>
                <th className="table-header w-24 text-right">Inst Hrs/Ton</th>
                <th className="table-header w-24 text-right">Total Inst Hrs</th>
                <th className="table-header w-36">Notes</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-10 text-center text-sm text-silver-400">
                    No structural members yet. Click <strong>Add Row</strong> to start your takeoff.
                  </td>
                </tr>
              )}
              {rows.map(row => (
                <StructuralRow
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="Total Rows" value={summary.rowCount} />
          <SummaryCard label="Total Weight (lbs)" value={fmtNumber(summary.totalWt, 0)} />
          <SummaryCard label="Total Weight (tons)" value={fmtNumber(summary.totalTons, 2)} />
          <SummaryCard label="Total Fab Hours" value={fmtNumber(summary.totalFabHrs, 1)} />
          <SummaryCard label="Total Install Hours" value={fmtNumber(summary.totalInstHrs, 1)} />
        </div>
      </div>
    </div>
  )
}

/**
 * Individual table row, memoised to avoid unnecessary re-renders.
 */
function StructuralRow({ row, onUpdate, onDelete, onShapeSelect }) {
  function set(field, value) {
    onUpdate(row.id, { [field]: value })
  }

  function setNum(field, value) {
    onUpdate(row.id, { [field]: parseFloat(value) || 0 })
  }

  return (
    <tr className="table-row group">
      {/* Mark */}
      <td className="table-cell">
        <input
          type="text"
          value={row.mark}
          onChange={e => set('mark', e.target.value)}
          className="input-field"
          placeholder="B1"
        />
      </td>

      {/* Description */}
      <td className="table-cell">
        <input
          type="text"
          value={row.description}
          onChange={e => set('description', e.target.value)}
          className="input-field"
          placeholder="Main beam"
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

      {/* Length */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.5"
          value={row.length}
          onChange={e => setNum('length', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Wt/ft */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.wtPerFt}
          onChange={e => setNum('wtPerFt', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Total Wt (read-only) */}
      <td className="table-cell currency font-medium text-steel-800">
        {fmtNumber(row.totalWt, 0)}
      </td>

      {/* Fab Hrs/Ton */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.5"
          value={row.fabHrsPerTon}
          onChange={e => setNum('fabHrsPerTon', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Total Fab Hrs (read-only) */}
      <td className="table-cell currency text-steel-700">
        {fmtNumber(row.totalFabHrs, 1)}
      </td>

      {/* Inst Hrs/Ton */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.5"
          value={row.instHrsPerTon}
          onChange={e => setNum('instHrsPerTon', e.target.value)}
          className="input-number"
        />
      </td>

      {/* Total Inst Hrs (read-only) */}
      <td className="table-cell currency text-steel-700">
        {fmtNumber(row.totalInstHrs, 1)}
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
