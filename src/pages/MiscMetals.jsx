import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers, Calculator, ListTree, Plus, Trash2, ExternalLink,
  Shield, Wrench, Settings2, Ruler, Anchor, Box, Building2
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'

/* ────────────────────────────────────────────────────────────────────────────
   MISC METALS — Phase 1 (Aggregation + Tier 1 standard items)
   Tier 1 sections: Bollards, Corner Guards SS, Corner Guards MS, Embed Plates
   Custom Takeoff (Structural-style) coming in Phase 4
   ──────────────────────────────────────────────────────────────────────────── */

// ─── Helpers ───
const fmt = (v) =>
  typeof v === 'number' && !isNaN(v) && isFinite(v)
    ? v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
    : '$0.00'
const fmtNum = (v, d = 0) =>
  typeof v === 'number' && !isNaN(v)
    ? v.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '0'
const toNum = (v) => {
  if (v === '' || v == null) return 0
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

// ─── Tiny UI components (dark theme, same pattern as Stairs/Ladder) ───
function NumInput({ value, onChange, step = 'any', className = '', disabled = false, placeholder = '' }) {
  return (
    <input
      type="number"
      step={step}
      disabled={disabled}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-steel-700/50 bg-steel-900/40 px-2 py-1 text-xs font-mono text-steel-100 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 disabled:bg-steel-900/30 disabled:text-steel-500 ${className}`}
    />
  )
}

function TextInput({ value, onChange, className = '', placeholder = '' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-steel-700/50 bg-steel-900/40 px-2 py-1 text-xs text-steel-100 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 ${className}`}
    />
  )
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-steel-700/50 bg-steel-900/60 px-2 py-1 text-xs text-steel-100 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o} className="bg-steel-900">{o}</option>
      ))}
    </select>
  )
}

function SectionCard({ icon: Icon, title, subtitle, children, color = 'text-fire-500' }) {
  return (
    <div className="mb-6 rounded-xl border border-steel-700/50 bg-steel-900/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className={`h-5 w-5 ${color}`} />}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-steel-100">{title}</h2>
          {subtitle && <p className="text-xs text-steel-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Section configs for the 4 Tier-1 standard items ───
// Each section defines: title, icon, sectionKey, columns, rateKey lookup, unit
const TIER1_SECTIONS = [
  {
    key: 'bollards',
    title: 'Bollards',
    icon: Anchor,
    color: 'text-yellow-400',
    columns: [
      { field: 'type',     label: 'Type',     type: 'select', options: ['Fixed','Removable','Sleeve'], default: 'Fixed' },
      { field: 'pipeSize', label: 'Pipe Size', type: 'select', options: ['Pipe 4"','Pipe 6"','Pipe 8"'], default: 'Pipe 6"' },
      { field: 'heightFt', label: 'Height (ft)', type: 'number', default: 4 },
      { field: 'filled',   label: 'Filled',   type: 'select', options: ['Yes','No'], default: 'Yes' },
      { field: 'qty',      label: 'Qty',      type: 'number', default: 1 },
    ],
    rateLookup: (row) => {
      if (row.type === 'Removable') return 'Bollard removable 6" sleeve'
      if (row.pipeSize === 'Pipe 8"') return 'Bollard fixed 8" pipe (filled)'
      return 'Bollard fixed 6" pipe (filled)'
    },
    multiplier: (row) => toNum(row.qty),
    unit: '$/each',
  },
  {
    key: 'cornerGuardsSS',
    title: 'Corner Guards — Stainless Steel',
    icon: Shield,
    color: 'text-cyan-400',
    columns: [
      { field: 'profile',  label: 'Profile', type: 'select', options: ['2x2x12GA','3x3x12GA','4x4x12GA'], default: '2x2x12GA' },
      { field: 'lengthFt', label: 'Length (ft)', type: 'number', default: 4 },
      { field: 'qty',      label: 'Qty',     type: 'number', default: 1 },
    ],
    rateLookup: (row) => row.profile && row.profile.includes('3x3') ? 'Corner guard SS 3x3x12GA' : 'Corner guard SS 2x2x12GA',
    multiplier: (row) => toNum(row.qty) * toNum(row.lengthFt),
    unit: '$/lnft',
  },
  {
    key: 'cornerGuardsMS',
    title: 'Corner Guards — Mild Steel (angle)',
    icon: Shield,
    color: 'text-amber-500',
    columns: [
      { field: 'angleSize', label: 'Angle Size', type: 'select', options: ['L51x51x6','L76x76x6','L102x102x9.5'], default: 'L76x76x6' },
      { field: 'lengthFt',  label: 'Length (ft)', type: 'number', default: 4 },
      { field: 'qty',       label: 'Qty',     type: 'number', default: 1 },
    ],
    rateLookup: (row) => row.angleSize === 'L102x102x9.5'
      ? 'Corner guard mild steel L102x102x9.5'
      : 'Corner guard mild steel L76x76x6',
    multiplier: (row) => toNum(row.qty) * toNum(row.lengthFt),
    unit: '$/lnft',
  },
  {
    key: 'embedPlates',
    title: 'Embed Plates',
    icon: Box,
    color: 'text-purple-400',
    columns: [
      { field: 'size',          label: 'Plate Size', type: 'select', options: ['8x8x1/4','10x10x1/2','12x12x1/2'], default: '8x8x1/4' },
      { field: 'anchorsPerPc',  label: 'Anchors/pc', type: 'number', default: 4 },
      { field: 'qty',           label: 'Qty',       type: 'number', default: 1 },
    ],
    rateLookup: (row) => {
      if (row.size === '12x12x1/2') return 'Embed plate 12x12x1/2 (4 anchors)'
      if (row.size === '10x10x1/2') return 'Embed plate 10x10x1/2 (4 anchors)'
      return 'Embed plate 8x8x1/4 (4 anchors)'
    },
    multiplier: (row) => toNum(row.qty),
    unit: '$/each',
  },
  {
    key: 'lintels', title: 'Lintels', icon: Ruler, color: 'text-cyan-400',
    columns: [
      { field: 'angleSize', label: 'Angle Size', type: 'select', options: ['L102x102x9.5','L127x127x12.7','L152x152x12.7'], default: 'L102x102x9.5' },
      { field: 'spanFt', label: 'Span (ft)', type: 'number', default: 6 },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: (row) => row.angleSize && row.angleSize.includes('127') ? 'Lintel L127x127x12.7' : 'Lintel L102x102x9.5',
    multiplier: (row) => toNum(row.qty) * toNum(row.spanFt),
    unit: '$/lnft',
  },
  {
    key: 'edgeAngles', title: 'Edge Angles', icon: Ruler, color: 'text-blue-400',
    columns: [
      { field: 'profile', label: 'Profile', type: 'select', options: ['L76x76x6','L102x102x9.5'], default: 'L76x76x6' },
      { field: 'lnft', label: 'Total lnft', type: 'number', default: 20 },
    ],
    rateLookup: (row) => row.profile === 'L102x102x9.5' ? 'Edge angle L102x102x9.5' : 'Edge angle L76x76x6',
    multiplier: (row) => toNum(row.lnft),
    unit: '$/lnft',
  },
  {
    key: 'bumperRails', title: 'Bumper Rails / Rub Rails', icon: Shield, color: 'text-orange-400',
    columns: [
      { field: 'profile', label: 'Pipe Size', type: 'select', options: ['Pipe 42 Sch40','Pipe 48 Sch40'], default: 'Pipe 42 Sch40' },
      { field: 'lnft', label: 'Total lnft', type: 'number', default: 20 },
    ],
    rateLookup: (row) => row.profile === 'Pipe 48 Sch40' ? 'Bumper rail Pipe 48 Sch40' : 'Bumper rail Pipe 42 Sch40',
    multiplier: (row) => toNum(row.lnft),
    unit: '$/lnft',
  },
  {
    key: 'wheelStops', title: 'Wheel Stops', icon: Box, color: 'text-yellow-400',
    columns: [
      { field: 'type', label: 'Type', type: 'select', options: ['Concrete precast','Steel fab'], default: 'Concrete precast' },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: (row) => row.type === 'Steel fab' ? 'Wheel stop steel fab' : 'Wheel stop precast',
    multiplier: (row) => toNum(row.qty),
    unit: '$/each',
  },
  {
    key: 'floorPlates', title: 'Floor Plates / Hatches', icon: Box, color: 'text-pink-400',
    columns: [
      { field: 'type', label: 'Type', type: 'select', options: ['Floor plate (sqft)','Sump cover','Roof hatch 30x36'], default: 'Floor plate (sqft)' },
      { field: 'size', label: 'Sqft / size', type: 'number', default: 4 },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: (row) => {
      if (row.type === 'Roof hatch 30x36') return 'Roof hatch 30x36 std'
      if (row.type === 'Sump cover') return 'Sump cover (galv)'
      return 'Floor plate (checker) per sqft'
    },
    multiplier: (row) => row.type === 'Floor plate (sqft)' ? toNum(row.qty) * toNum(row.size) : toNum(row.qty),
    unit: 'varies',
  },
  {
    key: 'pipeSupports', title: 'Pipe Supports / Stanchions', icon: Anchor, color: 'text-emerald-400',
    columns: [
      { field: 'pipeSize', label: 'Pipe Size', type: 'select', options: ['Pipe 27 Sch40','Pipe 33 Sch40','Pipe 42 Sch40'], default: 'Pipe 33 Sch40' },
      { field: 'heightFt', label: 'Height (ft)', type: 'number', default: 3 },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: () => 'Pipe support stanchion',
    multiplier: (row) => toNum(row.qty),
    unit: '$/each',
  },
  {
    key: 'anchorBolts', title: 'Anchor Bolt Assemblies', icon: Wrench, color: 'text-amber-400',
    columns: [
      { field: 'type', label: 'Type', type: 'select', options: ['J-bolt','L-bolt','Threaded rod'], default: 'J-bolt' },
      { field: 'dia', label: 'Dia', type: 'select', options: ['1/2"','5/8"','3/4"','1"'], default: '3/4"' },
      { field: 'lengthIn', label: 'Length (in)', type: 'number', default: 12 },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: (row) => {
      if (row.type === 'L-bolt') return 'Anchor bolt L-bolt 3/4"'
      if (row.type === 'Threaded rod') return 'Anchor bolt threaded rod 3/4"'
      return 'Anchor bolt J-bolt 3/4"'
    },
    multiplier: (row) => toNum(row.qty),
    unit: '$/each',
  },
  {
    key: 'equipDunnage', title: 'Equipment Dunnage', icon: Box, color: 'text-violet-400',
    columns: [
      { field: 'profile', label: 'Profile', type: 'text', default: 'W6x12' },
      { field: 'lengthFt', label: 'Length (ft)', type: 'number', default: 8 },
      { field: 'lbsPerFt', label: 'lb/ft', type: 'number', default: 12 },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: () => 'Equipment dunnage (per lb)',
    multiplier: (row) => toNum(row.qty) * toNum(row.lengthFt) * toNum(row.lbsPerFt),
    unit: '$/lb',
  },
  {
    key: 'architectural', title: 'Architectural / Signage', icon: Settings2, color: 'text-rose-400',
    columns: [
      { field: 'description', label: 'Description', type: 'text', default: '' },
      { field: 'qty', label: 'Qty', type: 'number', default: 1 },
    ],
    rateLookup: () => 'Architectural / signage (lump)',
    multiplier: (row) => toNum(row.qty),
    unit: 'lump $ each',
  },
]

// ─── Generic StandardItemTable ───
// Renders: table with config'd columns + Rate (default + override) + Total $ + Notes + Delete
function StandardItemTable({ section, miscRates, rows, dispatch }) {
  const findRate = (item) => {
    if (!item) return 0
    const found = miscRates.find((r) => r.item === item)
    return found ? Number(found.rate) || 0 : 0
  }

  // Compute total for one row (default rate or override × multiplier from config)
  const rowCalc = (row) => {
    const rateKey = section.rateLookup(row)
    const defaultRate = findRate(rateKey)
    const ovRate = row.rateOverride
    const rateOverridden = ovRate != null && ovRate !== '' && Number(ovRate) !== defaultRate
    const finalRate = rateOverridden ? Number(ovRate) : defaultRate
    const mult = section.multiplier(row)
    const total = mult * finalRate
    return { defaultRate, finalRate, rateOverridden, mult, total, rateKey }
  }

  const subtotal = rows.reduce((s, r) => s + rowCalc(r).total, 0)

  const addRow = () => {
    const defaults = {}
    section.columns.forEach((c) => { if (c.default !== undefined) defaults[c.field] = c.default })
    dispatch({ type: 'ADD_MM_STANDARD_ITEM', payload: { section: section.key, defaults } })
  }
  const updateRow = (id, field, value) => {
    dispatch({ type: 'UPDATE_MM_STANDARD_ITEM', payload: { section: section.key, id, [field]: value } })
  }
  const deleteRow = (id) => {
    dispatch({ type: 'DELETE_MM_STANDARD_ITEM', payload: { section: section.key, id } })
  }

  return (
    <SectionCard icon={section.icon} title={section.title} color={section.color}>
      {rows.length === 0 ? (
        <p className="text-sm text-steel-400 italic mb-3">No items yet — click "Add Row" below to start.</p>
      ) : (
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-steel-700/50 text-steel-400 uppercase text-[10px] tracking-wider">
                {section.columns.map((c) => (
                  <th key={c.field} className="px-2 py-2 text-left font-semibold">{c.label}</th>
                ))}
                <th className="px-2 py-2 text-right font-semibold">Rate</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-2 py-2 text-left font-semibold">Notes</th>
                <th className="px-2 py-2 text-center font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-700/30">
              {rows.map((row) => {
                const { defaultRate, finalRate, rateOverridden, total } = rowCalc(row)
                return (
                  <tr key={row.id} className="hover:bg-steel-800/30">
                    {section.columns.map((c) => (
                      <td key={c.field} className="px-1 py-1">
                        {c.type === 'select' ? (
                          <Select
                            value={row[c.field] ?? c.default ?? ''}
                            onChange={(v) => updateRow(row.id, c.field, v)}
                            options={c.options}
                          />
                        ) : c.type === 'number' ? (
                          <NumInput
                            value={row[c.field] ?? ''}
                            onChange={(v) => updateRow(row.id, c.field, v)}
                            className="text-right"
                          />
                        ) : (
                          <TextInput
                            value={row[c.field] ?? ''}
                            onChange={(v) => updateRow(row.id, c.field, v)}
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-1 py-1" title={rateOverridden ? `Default: ${fmt(defaultRate)} ${section.unit}` : ''}>
                      <NumInput
                        value={rateOverridden ? row.rateOverride : fmtNum(defaultRate, 2)}
                        onChange={(v) => updateRow(row.id, 'rateOverride', v === '' ? null : v)}
                        className={`text-right ${rateOverridden ? '!bg-amber-500/15 !border-amber-500/40 !text-amber-200' : ''}`}
                      />
                    </td>
                    <td className="px-2 py-1 text-right font-mono font-semibold text-steel-100">{fmt(total)}</td>
                    <td className="px-1 py-1">
                      <TextInput
                        value={row.notes ?? ''}
                        onChange={(v) => updateRow(row.id, 'notes', v)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="rounded p-1 text-steel-500 hover:bg-red-500/10 hover:text-red-400"
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-steel-700/50">
                <td colSpan={section.columns.length + 1} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-steel-200">
                  {section.title} subtotal
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm font-bold text-fire-400">{fmt(subtotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <button
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-lg bg-fire-500/10 border border-fire-500/30 px-3 py-1.5 text-xs font-semibold text-fire-400 hover:bg-fire-500/20 transition"
      >
        <Plus className="h-3.5 w-3.5" /> Add {section.title.split(' ')[0]} Row
      </button>
    </SectionCard>
  )
}

// ─── Aggregation Section (read-only summary from other calculators) ───
function AggregationSection({ state }) {
  const stairsC = state.stairsComputed || {}
  const ladderC = state.ladderComputed || {}
  const railings = state.railings || []
  // Note: joistReinf is included in Structural Takeoff, not summed here

  const stairs = {
    label: 'Stairs',
    qty: stairsC.totalLbs > 0 ? '1 set' : '—',
    lbs: stairsC.totalLbs || 0,
    matCost: stairsC.materialCost || 0,
    grandTotal: stairsC.grandTotal || 0,
    fabHrs: stairsC.fabHrs || 0,
    instHrs: stairsC.instHrs || 0,
    link: '/stairs',
  }
  const ladder = {
    label: 'Ladder',
    qty: ladderC.totalLbs > 0 ? '1 ladder' : '—',
    lbs: ladderC.totalLbs || 0,
    matCost: ladderC.materialCost || 0,
    grandTotal: ladderC.grandTotal || 0,
    fabHrs: ladderC.fabHrs || 0,
    instHrs: ladderC.instHrs || 0,
    link: '/ladder',
  }
  const rl = {
    label: 'Railings',
    qty: railings.length > 0 ? `${railings.length} runs` : '—',
    lbs: railings.reduce((s, r) => s + Number(r.weightLbs || 0), 0),
    matCost: 0,
    grandTotal: 0,
    fabHrs: railings.reduce((s, r) => s + Number(r.fabHrs || 0), 0),
    instHrs: railings.reduce((s, r) => s + Number(r.instHrs || 0), 0),
    link: '/railings',
  }
  // Joist Reinforcement excluded — accounted for in Structural Takeoff
  const rows = [stairs, ladder, rl]
  const totalLbs = rows.reduce((s, r) => s + r.lbs, 0)
  const totalGrand = rows.reduce((s, r) => s + r.grandTotal, 0)
  const totalFab = rows.reduce((s, r) => s + r.fabHrs, 0)
  const totalInst = rows.reduce((s, r) => s + r.instHrs, 0)

  return (
    <SectionCard icon={Calculator} title="Aggregation from calculators" subtitle="Auto-pulled from Stairs, Ladder, Railings — read-only (Joist Reinf is part of Structural Takeoff)" color="text-blue-400">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-steel-700/50 text-steel-400 uppercase text-[10px] tracking-wider">
              <th className="px-2 py-2 text-left font-semibold">Source</th>
              <th className="px-2 py-2 text-left font-semibold">Qty</th>
              <th className="px-2 py-2 text-right font-semibold">Total lbs</th>
              <th className="px-2 py-2 text-right font-semibold">Fab hrs</th>
              <th className="px-2 py-2 text-right font-semibold">Install hrs</th>
              <th className="px-2 py-2 text-right font-semibold">Grand $</th>
              <th className="px-2 py-2 text-center font-semibold w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-700/30">
            {rows.map((r) => (
              <tr key={r.label} className={r.lbs > 0 ? '' : 'opacity-40'}>
                <td className="px-2 py-2 font-medium text-steel-200">{r.label}</td>
                <td className="px-2 py-2 text-steel-400">{r.qty}</td>
                <td className="px-2 py-2 text-right font-mono text-steel-200">{fmtNum(r.lbs, 1)}</td>
                <td className="px-2 py-2 text-right font-mono text-steel-300">{fmtNum(r.fabHrs, 1)}</td>
                <td className="px-2 py-2 text-right font-mono text-steel-300">{fmtNum(r.instHrs, 1)}</td>
                <td className="px-2 py-2 text-right font-mono font-semibold text-steel-100">{fmt(r.grandTotal)}</td>
                <td className="px-2 py-2 text-center">
                  <Link to={r.link} className="inline-flex items-center gap-1 rounded p-1 text-steel-400 hover:bg-blue-500/10 hover:text-blue-400" title={`Edit ${r.label}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-steel-700/50">
              <td colSpan={2} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-steel-200">Calculators subtotal</td>
              <td className="px-2 py-2 text-right font-mono text-sm font-bold text-steel-100">{fmtNum(totalLbs, 1)} lbs</td>
              <td className="px-2 py-2 text-right font-mono text-xs font-bold text-steel-200">{fmtNum(totalFab, 1)}</td>
              <td className="px-2 py-2 text-right font-mono text-xs font-bold text-steel-200">{fmtNum(totalInst, 1)}</td>
              <td className="px-2 py-2 text-right font-mono text-sm font-bold text-fire-400">{fmt(totalGrand)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </SectionCard>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */
export default function MiscMetals() {
  const { state, dispatch } = useProject()
  const miscRates = state.rates?.miscMetalsRates || []
  const standard = state.miscMetalsStandard || {}

  // Compute aggregation totals from calculators
  const stairsC = state.stairsComputed || {}
  const ladderC = state.ladderComputed || {}
  const railings = state.railings || []
  const joistReinf = state.joistReinf || []
  const calcsTotal =
    (stairsC.grandTotal || 0) +
    (ladderC.grandTotal || 0) +
    (railings.reduce((s, r) => s + Number(r.weightLbs || 0), 0) * 1.20) // crude estimate

  // Compute Tier-1 standard totals
  const findRate = (item) => {
    const found = miscRates.find((r) => r.item === item)
    return found ? Number(found.rate) || 0 : 0
  }
  const sectionSubtotal = (section) => {
    const rows = standard[section.key] || []
    return rows.reduce((sum, row) => {
      const defaultRate = findRate(section.rateLookup(row))
      const finalRate = (row.rateOverride != null && row.rateOverride !== '') ? Number(row.rateOverride) : defaultRate
      return sum + section.multiplier(row) * finalRate
    }, 0)
  }
  const tier1Total = useMemo(
    () => TIER1_SECTIONS.reduce((s, sec) => s + sectionSubtotal(sec), 0),
    [standard, miscRates]
  )

  const grandTotal = calcsTotal + tier1Total

  return (
    <div className="min-h-screen bg-steel-950 text-white">
      <div className="accent-stripe" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fire-500 text-white shadow-lg shadow-fire-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title text-white">Misc Metals</h1>
            <p className="page-subtitle text-steel-400">
              Aggregation from calculators + Tier 1 standard items (Bollards, Corner Guards SS/MS, Embed Plates).
              Tier 2/3 + Custom Takeoff coming in upcoming phases.
            </p>
          </div>
        </div>

        {/* ─── 1. Aggregation ─── */}
        <AggregationSection state={state} />

        {/* ─── 2-5. Tier 1 standard items ─── */}
        {TIER1_SECTIONS.map((section) => (
          <StandardItemTable
            key={section.key}
            section={section}
            miscRates={miscRates}
            rows={standard[section.key] || []}
            dispatch={dispatch}
          />
        ))}

        {/* ─── Grand Total ─── */}
        <SectionCard icon={Building2} title="Misc Metals — Grand Total" color="text-green-400">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-steel-700/30">
                <tr>
                  <td className="px-2 py-2 font-medium text-steel-200">From calculators (Stairs / Ladder / Railings / Joist Reinf)</td>
                  <td className="px-2 py-2 text-right font-mono text-steel-100">{fmt(calcsTotal)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-2 font-medium text-steel-200">Standard items — Tier 1+2+3 (this page)</td>
                  <td className="px-2 py-2 text-right font-mono text-steel-100">{fmt(tier1Total)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-fire-500/40">
                  <td className="px-2 py-3 text-right text-sm font-bold uppercase tracking-wider text-steel-100">
                    GRAND TOTAL
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-lg font-bold text-fire-400">{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-steel-500">
            Tier 2 (Lintels, Edge Angles, Bumper Rails, Wheel Stops, Floor Plates, Pipe Supports), Tier 3 (Anchor Bolts, Equipment Dunnage, Architectural) and a Structural Takeoff-style Custom Takeoff section will be added in upcoming phases.
          </p>
        </SectionCard>

        {/* Footer */}
        <div className="mt-10 border-t border-steel-700/40 pt-6 text-center">
          <p className="text-xs text-steel-500">Triple Weld Inc. · Steel Estimator Pro · Misc Metals (Phase 1)</p>
        </div>
      </div>
    </div>
  )
}
