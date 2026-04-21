import { useProject, calcEquipRentalCost } from '../context/ProjectContext'
import { useState } from 'react'
import { Plus, Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'

/* ─── Helpers ─── */
const fmt = (n) => Number(n || 0).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
const fmtNum = (n, d = 2) => Number(n || 0).toFixed(d)

function NumInput({ value, onChange, step = '0.01', className = 'input-number', ...rest }) {
  return <input type="number" step={step} className={className} value={value ?? ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} {...rest} />
}

function TextInput({ value, onChange, className = 'input-field', ...rest }) {
  return <input type="text" className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
}

/* ─── Collapsible Section Wrapper ─── */
function Section({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card">
      <button type="button" className="w-full flex items-center justify-between mb-0" onClick={() => setOpen(!open)}>
        <h2 className="section-title flex items-center gap-2">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          {title}
          {badge && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-normal">{badge}</span>}
        </h2>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   1. PROJECT INFORMATION
   ══════════════════════════════════════════════════════ */
function ProjectInfoCard({ projectInfo, onChange }) {
  const fields = [
    { key: 'projectName', label: 'Project Name', type: 'text', span: 2 },
    { key: 'location', label: 'Location', type: 'text', span: 2 },
    { key: 'quoteNumber', label: 'Quote Number', type: 'text', span: 1 },
    { key: 'quoteDate', label: 'Quote Date', type: 'date', span: 1 },
    { key: 'distanceKm', label: 'Distance from Shop (km)', type: 'number', span: 1 },
    { key: 'travelHrs', label: 'Travel Time (hrs one-way)', type: 'number', span: 1 },
    { key: 'gcClient', label: 'GC / Client', type: 'text', span: 1 },
    { key: 'engineer', label: 'Engineer', type: 'text', span: 1 },
    { key: 'drawingSet', label: 'Drawing Set', type: 'text', span: 1 },
    { key: 'drawingDate', label: 'Drawing Date', type: 'date', span: 1 },
    { key: 'buildingAreaSqft', label: 'Building Area (sqft)', type: 'number', span: 2 },
  ]
  return (
    <Section title="Project Information">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
            <label className="label">{f.label}</label>
            <input
              type={f.type}
              className={f.type === 'number' ? 'input-number' : 'input-field'}
              value={projectInfo[f.key] ?? ''}
              onChange={(e) => {
                const val = f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                onChange({ [f.key]: val })
              }}
            />
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   2. MATERIAL RATES
   ══════════════════════════════════════════════════════ */
function MaterialRatesCard({ materialRates, onUpdate, onAdd, onDelete }) {
  return (
    <Section title="Material Rates (CAD)">
      <div className="flex justify-end mb-3">
        <button type="button" className="btn-primary" onClick={onAdd}><Plus className="h-4 w-4" /> Add Row</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-1/2">Item</th>
              <th className="table-header w-1/4 text-right">Rate</th>
              <th className="table-header w-1/6">Unit</th>
              <th className="table-header w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {materialRates.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-cell"><TextInput value={row.item} onChange={(v) => onUpdate({ id: row.id, item: v })} /></td>
                <td className="table-cell"><NumInput value={row.rate} onChange={(v) => onUpdate({ id: row.id, rate: v })} /></td>
                <td className="table-cell">
                  <select className="input-field" value={row.unit} onChange={(e) => onUpdate({ id: row.id, unit: e.target.value })}>
                    <option value="$/lb">$/lb</option>
                    <option value="$/kg">$/kg</option>
                    <option value="$/ton">$/ton</option>
                    <option value="$/LF">$/LF</option>
                    <option value="$/sqft">$/sqft</option>
                    <option value="$/unit">$/unit</option>
                    <option value="%">%</option>
                  </select>
                </td>
                <td className="table-cell text-center">
                  <button type="button" className="btn-danger" onClick={() => onDelete(row.id)}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   3. LABOUR RATES  (incl. Travel Rate)
   ══════════════════════════════════════════════════════ */
function LabourRatesCard({ labourRates, onChange }) {
  const fields = [
    { key: 'fabRate', label: 'Shop Fabrication Rate ($/hr/person)' },
    { key: 'fabCrew', label: 'Fab Crew Size (persons)', step: '1' },
    { key: 'installRate', label: 'Installation Rate ($/hr/person)' },
    { key: 'installCrew', label: 'Install Crew Size (persons)', step: '1' },
    { key: 'travelRate', label: 'Travel Rate ($/hr/person)' },
  ]
  return (
    <Section title="Labour Rates (CAD)">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <NumInput value={labourRates[f.key]} step={f.step || '0.01'} onChange={(v) => onChange({ [f.key]: v })} />
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   4. SAFETY FACTORS  (local / remote + active selector)
   ══════════════════════════════════════════════════════ */
function SafetyFactorsCard({ sf, onChange }) {
  const activeFab = sf.projectType === 'Remote' ? sf.fabRemote : sf.fabLocal
  const activeInst = sf.projectType === 'Remote' ? sf.installRemote : sf.installLocal
  return (
    <Section title="Safety Factors">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="label">Fab SF (local &lt;3 hrs)</label><NumInput value={sf.fabLocal} onChange={(v) => onChange({ fabLocal: v })} /></div>
        <div><label className="label">Fab SF (remote &gt;3 hrs)</label><NumInput value={sf.fabRemote} onChange={(v) => onChange({ fabRemote: v })} /></div>
        <div><label className="label">Install SF (local)</label><NumInput value={sf.installLocal} onChange={(v) => onChange({ installLocal: v })} /></div>
        <div><label className="label">Install SF (remote)</label><NumInput value={sf.installRemote} onChange={(v) => onChange({ installRemote: v })} /></div>
      </div>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">Active Safety Factors (select)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Project Type</label>
            <select className="input-field" value={sf.projectType} onChange={(e) => onChange({ projectType: e.target.value })}>
              <option value="Local">Local (&lt;3 hrs)</option>
              <option value="Remote">Remote (&gt;3 hrs)</option>
            </select>
          </div>
          <div>
            <label className="label">Active Fab SF</label>
            <div className="input-number bg-silver-50 cursor-default" style={{ pointerEvents: 'none' }}>{(activeFab * 100).toFixed(0)}%</div>
          </div>
          <div>
            <label className="label">Active Install SF</label>
            <div className="input-number bg-silver-50 cursor-default" style={{ pointerEvents: 'none' }}>{(activeInst * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   5. MARKUP & TAX
   ══════════════════════════════════════════════════════ */
function MarkupTaxCard({ markup, onChange }) {
  const fields = [
    { key: 'markupPercent', label: 'Markup %' },
    { key: 'hstPercent', label: 'HST %' },
    { key: 'wasteStructural', label: 'Waste Allowance — Structural %' },
    { key: 'wasteMisc', label: 'Waste Allowance — Misc %' },
    { key: 'connectionHardware', label: 'Connection Hardware Allow. %' },
  ]
  return (
    <Section title="Markup & Tax">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <NumInput value={markup[f.key]} step="0.1" onChange={(v) => onChange({ [f.key]: v })} />
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   6. TRAVEL & FREIGHT
   ══════════════════════════════════════════════════════ */
function TravelFreightCard({ tf, onChange }) {
  const fields = [
    { key: 'freightRatePerKm', label: 'Freight Rate ($/km)' },
    { key: 'numberOfDeliveries', label: 'Number of Deliveries', step: '1' },
    { key: 'hotelRatePerNight', label: 'Hotel Rate ($/night)' },
    { key: 'installDays', label: 'Install Days (estimate)', step: '1' },
    { key: 'hotelNightsPerCrew', label: 'Hotel Nights per Crew Member', step: '1' },
    { key: 'perDiemPerDay', label: 'Per Diem ($/person/day)' },
  ]
  return (
    <Section title="Travel & Freight">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <NumInput value={tf[f.key]} step={f.step || '0.01'} onChange={(v) => onChange({ [f.key]: v })} />
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   7. P.ENG & SHOP DRAWINGS
   ══════════════════════════════════════════════════════ */
function EngDrawingsCard({ ed, onChange }) {
  const fields = [
    { key: 'drafterRate', label: 'Drafter Hourly Rate ($/hr)' },
    { key: 'drawingHours', label: 'Drawing Hours (estimate)', step: '1' },
    { key: 'shopDrawingCost', label: 'Shop Drawing Cost ($)' },
    { key: 'pengStamp', label: 'P.Eng Stamp ($)' },
    { key: 'siteVisitsQty', label: 'Site Visits (qty)', step: '1' },
    { key: 'siteVisitCostEach', label: 'Site Visit Cost Each ($)' },
  ]
  return (
    <Section title="P.Eng & Shop Drawings">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <NumInput value={ed[f.key]} step={f.step || '0.01'} onChange={(v) => onChange({ [f.key]: v })} />
          </div>
        ))}
      </div>
      <div className="mt-3 p-3 bg-silver-50 rounded-lg text-sm text-silver-600">
        <strong>Auto-calc:</strong> Shop Drawing Cost = {ed.drafterRate} × {ed.drawingHours} = {fmt(ed.drafterRate * ed.drawingHours)}
        &nbsp;|&nbsp; Site Visits Total = {ed.siteVisitsQty} × {fmt(ed.siteVisitCostEach)} = {fmt(ed.siteVisitsQty * ed.siteVisitCostEach)}
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   8. EQUIPMENT RENTAL CATALOG
   ══════════════════════════════════════════════════════ */
function EquipmentCatalogCard({ equipment, equipmentMarkup, onUpdate, onMarkupChange }) {
  const categories = [...new Set(equipment.map(e => e.category))]
  let rentalSubtotal = 0
  let transportTotal = 0
  equipment.forEach(row => {
    rentalSubtotal += calcEquipRentalCost(row)
    transportTotal += (row.pickup || 0) + (row.dropoff || 0)
  })
  const markupAmt = rentalSubtotal * (equipmentMarkup / 100)
  const grandTotal = rentalSubtotal + transportTotal + markupAmt

  return (
    <Section title="Equipment Rental Catalog" badge={`${fmt(grandTotal)}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="table-header">Equipment</th>
              <th className="table-header text-right">Day Rate</th>
              <th className="table-header text-right">Week Rate</th>
              <th className="table-header text-right">Month Rate</th>
              <th className="table-header">Period</th>
              <th className="table-header text-right w-20">Qty</th>
              <th className="table-header text-right">Rental Cost</th>
              <th className="table-header text-right w-24">Pickup $</th>
              <th className="table-header text-right w-24">Dropoff $</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {categories.map(cat => {
              const rows = equipment.filter(e => e.category === cat)
              return [
                <tr key={`cat-${cat}`}>
                  <td colSpan={9} className="table-cell font-bold text-amber-700 bg-amber-50 py-1 px-2 text-xs uppercase tracking-wider">{cat}</td>
                </tr>,
                ...rows.map(row => {
                  const cost = calcEquipRentalCost(row)
                  return (
                    <tr key={row.id} className={`table-row ${row.qty > 0 ? 'bg-green-50' : ''}`}>
                      <td className="table-cell text-xs">{row.item}</td>
                      <td className="table-cell text-right text-xs">{fmt(row.dayRate)}</td>
                      <td className="table-cell text-right text-xs">{fmt(row.weekRate)}</td>
                      <td className="table-cell text-right text-xs">{fmt(row.monthRate)}</td>
                      <td className="table-cell">
                        <select className="input-field text-xs py-1" value={row.period} onChange={(e) => onUpdate({ id: row.id, period: e.target.value })}>
                          <option value="Day">Day</option>
                          <option value="Week">Week</option>
                          <option value="Month">Month</option>
                        </select>
                      </td>
                      <td className="table-cell"><NumInput value={row.qty} step="1" className="input-number text-xs py-1 w-16" onChange={(v) => onUpdate({ id: row.id, qty: v })} /></td>
                      <td className="table-cell text-right text-xs font-medium">{cost > 0 ? fmt(cost) : '—'}</td>
                      <td className="table-cell"><NumInput value={row.pickup} className="input-number text-xs py-1 w-20" onChange={(v) => onUpdate({ id: row.id, pickup: v })} /></td>
                      <td className="table-cell"><NumInput value={row.dropoff} className="input-number text-xs py-1 w-20" onChange={(v) => onUpdate({ id: row.id, dropoff: v })} /></td>
                    </tr>
                  )
                })
              ]
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-silver-300">
              <td colSpan={6} className="table-cell font-semibold text-right">Equipment Subtotal</td>
              <td className="table-cell text-right font-semibold">{fmt(rentalSubtotal)}</td>
              <td colSpan={2} className="table-cell text-right font-semibold">Transport: {fmt(transportTotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="table-cell text-right">Equipment Markup</td>
              <td className="table-cell"><NumInput value={equipmentMarkup} step="1" className="input-number text-xs py-1 w-16" onChange={onMarkupChange} /></td>
              <td className="table-cell text-right">%  = {fmt(markupAmt)}</td>
              <td colSpan={2}></td>
            </tr>
            <tr className="bg-amber-50 font-bold">
              <td colSpan={6} className="table-cell text-right text-amber-800">EQUIPMENT TOTAL (incl. markup)</td>
              <td colSpan={3} className="table-cell text-right text-amber-800 text-base">{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   9. MISC METALS RATES
   ══════════════════════════════════════════════════════ */
function MiscMetalsRatesCard({ rates, onUpdate, onAdd, onDelete }) {
  return (
    <Section title="Misc Metals Rates (CAD)">
      <div className="flex justify-end mb-3">
        <button type="button" className="btn-primary" onClick={onAdd}><Plus className="h-4 w-4" /> Add Row</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-1/2">Item</th>
              <th className="table-header w-1/4 text-right">Rate</th>
              <th className="table-header w-1/6">Unit</th>
              <th className="table-header w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {rates.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-cell"><TextInput value={row.item} onChange={(v) => onUpdate({ id: row.id, item: v })} /></td>
                <td className="table-cell"><NumInput value={row.rate} onChange={(v) => onUpdate({ id: row.id, rate: v })} /></td>
                <td className="table-cell">
                  <select className="input-field" value={row.unit} onChange={(e) => onUpdate({ id: row.id, unit: e.target.value })}>
                    <option value="$/tread">$/tread</option>
                    <option value="$/sqft">$/sqft</option>
                    <option value="$/lnft">$/lnft</option>
                    <option value="$/unit">$/unit</option>
                    <option value="$/lb">$/lb</option>
                  </select>
                </td>
                <td className="table-cell text-center">
                  <button type="button" className="btn-danger" onClick={() => onDelete(row.id)}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
        </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   10. CODE LIMITS (OBC / OHSA)
   ══════════════════════════════════════════════════════ */
function CodeLimitsCard({ codeLimits }) {
  return (
    <Section title="Code Limits (OBC / OHSA)" defaultOpen={false}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-1/2">Code Item</th>
              <th className="table-header text-right">Limit</th>
              <th className="table-header">Unit</th>
              <th className="table-header">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {codeLimits.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-cell text-sm">{row.item}</td>
                <td className="table-cell text-right font-medium">{row.value}</td>
                <td className="table-cell text-sm text-silver-500">{row.unit}</td>
                <td className="table-cell text-sm text-silver-500">{row.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   11. DEFAULT PRODUCTIVITY RATES
   ══════════════════════════════════════════════════════ */
function ProductivityCard({ productivity, onChange }) {
  return (
    <Section title="Default Productivity Rates" defaultOpen={false}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Fab Hrs / Ton</label>
          <NumInput value={productivity.fabHrsPerTon} step="0.1" onChange={(v) => onChange({ fabHrsPerTon: v })} />
        </div>
        <div>
          <label className="label">Install Hrs / Ton</label>
          <NumInput value={productivity.installHrsPerTon} step="0.1" onChange={(v) => onChange({ installHrsPerTon: v })} />
        </div>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */
export default function RatesConfig() {
  const { state, dispatch } = useProject()
  const [showResetConfirm, setShowwResetConfirm] = useState(false)

  function handleReset() {
    dispatch({ type: 'RESET_TO_DEFAULTS' })
    setShowResetConfirm(false)
  }

  const r = state.rates

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rates & Configuration</h1>
          <p className="page-subtitle">
            Set project details, material rates, labour costs, safety factors, equipment, and markup before building your estimate.
          </p>
        </div>
        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600 font-medium">Reset all data?</span>
            <button type="button" className="btn-danger" onClick={handleReset}>Confirm</button>
            <button type="button" className="btn-secondary" onClick={() => setShowResetConfirm(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => setShowResetConfirm(true)}>
            <RotateCcw className="h-4 w-4" /> Reset to Defaults
          </button>
        )}
      </div>

      {/* 1. Project Info */}
      <ProjectInfoCard
        projectInfo={state.projectInfo}
        onChange={(p) => dispatch({ type: 'SET_PROJECT_INFO', payload: p })}
      />

      <hr className="border-silver-200" />

      {/* 2. Material Rates */}
      <MaterialRatesCard
        materialRates={r.materialRates}
        onUpdate={(p) => dispatch({ type: 'SET_MATERIAL_RATE', payload: p })}
        onAdd={() => dispatch({ type: 'ADD_MATERIAL_RATE' })}
        onDelete={(id) => dispatch({ type: 'DELETE_MATERIAL_RATE', payload: id })}
      />

      {/* 3. Labour Rates */}
      <LabourRatesCard
        labourRates={r.labourRates}
        onChange={(p) => dispatch({ type: 'SET_LABOUR_RATES', payload: p })}
      />

      {/* 4. Safety Factors */}
      <SafetyFactorsCard
        sf={r.safetyFactors}
        onChange={(p) => dispatch({ type: 'SET_SAFETY_FACTORS', payload: p })}
      />

      <hr className="border-silver-200" />

      {/* 5. Markup & Tax */}
      <MarkupTaxCard
        markup={r.markup}
        onChange={(p) => dispatch({ type: 'SET_MARKUP', payload: p })}
      />

      {/* 6. Travel & Freight */}
      <TravelFreightCard
        tf={r.travelFreight}
        onChange={(p) => dispatch({ type: 'SET_TRAVEL_FREIGHT', payload: p })}
      />

      {/* 7. P.Eng & Shop Drawings */}
      <EngDrawingsCard
        ed={r.engDrawings}
        onChange={(p) => dispatch({ type: 'SET_ENG_DRAWINGS', payload: p })}
      />

      <hr className="border-silver-200" />

      {/* 8. Equipment Rental Catalog */}
      <EquipmentCatalogCard
        equipment={r.equipment}
        equipmentMarkup={r.equipmentMarkup}
        onUpdate={(p) => dispatch({ type: 'UPDATE_EQUIPMENT', payload: p })}
        onMarkupChange={(v) => dispatch({ type: 'SET_EQUIPMENT_MARKUP', payload: v })}
      />

      <hr className="border-silver-200" />

      {/* 9. Misc Metals Rates */}
      <MiscMetalsRatesCard
        rates={r.miscMetalsRates}
        onUpdate={(p) => dispatch({ type: 'SET_MISC_METALS_RATE', payload: p })}
        onAdd={() => dispatch({ type: 'ADD_MISC_METALS_RATE' })}
        onDelete={(id) => dispatch({ type: 'DELETE_MISC_METALS_RATE', payload: id })}
      />

      {/* 10. Code Limits */}
      <CodeLimitsCard codeLimits={r.codeLimits} />

      {/* 11. Productivity */}
      <ProductivityCard
        productivity={r.productivityDefaults}
        onChange={(p) => dispatch({ type: 'SET_PRODUCTIVITY', payload: p })}
      />
    </div>
  )
}
