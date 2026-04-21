import { useProject } from '../context/ProjectContext'
import { calcStairs, fmtCurrency, fmtNumber } from '../utils/calculations'
import { useState, useMemo } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  Calculator,
  Ruler,
  Weight,
  ShieldCheck,
} from 'lucide-react'

export default function Stairs() {
  const { state, dispatch } = useProject()
  const stairs = state.stairs

  const results = useMemo(() => calcStairs(stairs), [stairs])

  function update(field, value) {
    dispatch({
      type: 'SET_STAIRS',
      payload: { [field]: Number(value) || 0 },
    })
  }

  const statCards = [
    { label: 'Risers / Flight', value: fmtNumber(results.risersPerFlight), unit: '' },
    { label: 'Riser Height', value: fmtNumber(results.riserHeight, 1), unit: 'mm' },
    { label: 'Treads / Flight', value: fmtNumber(results.treadsPerFlight), unit: '' },
    { label: 'Tread Depth', value: fmtNumber(results.treadDepth), unit: 'mm' },
    { label: 'Stringer Length', value: fmtNumber(results.stringerLengthFt, 1), unit: 'ft' },
    { label: 'Total Run', value: fmtNumber(results.totalRun), unit: 'mm' },
    { label: 'Landings', value: fmtNumber(results.landings), unit: '' },
    { label: 'Guardrail Posts', value: fmtNumber(results.guardrailPosts), unit: '' },
  ]

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Calculator className="h-7 w-7 text-fire-600" />
          Stairs Calculator
        </h1>
        <p className="page-subtitle">OBC 3.4 compliant steel stair takeoff with auto-generated BOM</p>
      </div>
      <div className="card">
        <h2 className="section-title">Inputs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className="label">Floor-to-Floor Height (mm)</label><input type="number" className="input-number w-full" value={stairs.floorHeight} onChange={(e) => update('floorHeight', e.target.value)} /></div>
          <div><label className="label">Stair Width (mm)</label><input type="number" className="input-number w-full" value={stairs.stairWidth} onChange={(e) => update('stairWidth', e.target.value)} /></div>
          <div><label className="label">Number of Flights</label><input type="number" className="input-number w-full" value={stairs.flights} min={1} onChange={(e) => update('flights', e.target.value)} /></div>
          <div><label className="label">Landing Depth (mm)</label><input type="number" className="input-number w-full" value={stairs.landingDepth} onChange={(e) => update('landingDepth', e.target.value)} /></div>
        </div>
      </div>
      <div>
        <h2 className="section-title mb-4">Calculated Results</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="stat-card">
              <p className="label">{card.label}</p>
              <p className="number-big mt-1">{card.value}{card.unit && <span className="text-sm font-normal text-silver-500 ml-1">{card.unit}</span>}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="section-title flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-fire-600" />Code Compliance — OBC 3.4 / OHSA</h2>
        <div className="space-y-2 mt-4">
          {results.compliance.map((check, idx) => (
            <div key={idx} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${check.ok ? 'bg-green-50' : 'bg-red-50'}`}>
              {check.ok ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />}
              <span className={`text-sm font-medium ${check.ok ? 'text-green-800' : 'text-red-800'}`}>{check.rule}</span>
              <span className={`ml-auto ${check.ok ? 'badge-ok' : 'badge-error'}`}>{check.ok ? 'OK' : 'Violation'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="section-title flex items-center gap-2"><Weight className="h-5 w-5 text-fire-600" />Weight Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="stat-card"><p className="label">Stringers</p><p className="number-big mt-1">{fmtNumber(results.stringerWt)} <span className="text-sm font-normal text-silver-500">lbs</span></p></div>
          <div className="stat-card"><p className="label">Treads</p><p className="number-big mt-1">{fmtNumber(results.treadWt)} <span className="text-sm font-normal text-silver-500">lbs</span></p></div>
          <div className="stat-card"><p className="label">Landings</p><p className="number-big mt-1">{fmtNumber(results.landingWt)} <span className="text-sm font-normal text-silver-500">lbs</span></p></div>
          <div className="stat-card bg-fire-50 border-fire-200"><p className="text-xs text-fire-600 uppercase tracking-wider font-semibold">Total Weight</p><p className="number-accent mt-1">{fmtNumber(results.totalWt)} <span className="text-sm font-normal text-fire-600">lbs</span></p></div>
        </div>
      </div>
    </div>
  )
}
