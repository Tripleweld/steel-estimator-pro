import { useMemo } from 'react'
import {
  Calculator, ShieldCheck, Weight, Wrench, Hammer, BarChart3,
  CheckCircle, AlertTriangle, Settings2, ListTree, Layers
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'

/* ────────────────────────────────────────────────────────────────────────────
   STAIRS — Parametric Calculator with OBC Validation
   Mirrors Estimator Pro v5.1 Excel "Stairs" tab (103 rows, 11 sections)
   ──────────────────────────────────────────────────────────────────────────── */

// ─── Helpers ───
const fmt = (v) =>
  typeof v === 'number' && !isNaN(v)
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
const atanDeg = (y, x) => (x === 0 ? 0 : (Math.atan(y / x) * 180) / Math.PI)

// ─── Section weights (lb/ft) — from Excel Lookup tab ───
const SECTION_WEIGHTS = {
  'C150x12': 8.06, 'C180x15': 10.07, 'C200x21': 14.11, 'C230x22': 14.78,
  'C230x30': 20.0, 'C250x23': 15.45, 'C310x31': 20.81, 'C310x37': 24.83,
  'C310x45': 30.2,
  'L51x51x6': 3.05, 'L64x64x6': 3.92, 'L76x76x6': 4.72, 'L76x76x9.5': 7.42,
  'L102x102x6': 6.4, 'L102x102x9.5': 9.45,
  'FB 38x6': 1.79, 'FB 51x6': 2.4, 'FB 76x6': 3.59, 'FB 102x6': 4.81,
  'FB 102x13': 10.43, 'FB 152x6': 7.18,
  'Rod 16mm': 0.66, 'Rod 19mm': 0.94, 'Rod 22mm': 1.27, 'Rod 25mm': 1.65,
  'Pipe 27 Sch40': 0.85, 'Pipe 33 Sch40': 1.13, 'Pipe 42 Sch40': 1.68,
  'Pipe 48 Sch40': 1.88,
  'HSS 51x51x4.8': 2.46, 'HSS 64x64x4.8': 3.05, 'HSS 76x76x4.8': 3.65,
  'HSS 76x76x6.4': 4.74, 'HSS 102x102x4.8': 4.85, 'HSS 102x102x6.4': 6.32,
  'Grating 32x32': 10.0, // lb/sqft
}

const STRINGER_OPTIONS = [
  'C150x12', 'C180x15', 'C200x21', 'C230x22', 'C230x30',
  'C250x23', 'C310x31', 'C310x37', 'C310x45',
]
const COLUMN_OPTIONS = [
  'HSS 51x51x4.8', 'HSS 64x64x4.8', 'HSS 76x76x4.8',
  'HSS 76x76x6.4', 'HSS 102x102x4.8', 'HSS 102x102x6.4',
]
const PRESET_OPTIONS = ['Service Stair', 'Architectural', 'Heavy Duty', 'Egress Only']
const FINISH_OPTIONS = ['Shop Primed', 'Galvanized']
const TREAD_TYPE_OPTIONS = ['Pan Tread (Galv)', 'Pan Tread (Mild)', 'Checker Plate', 'Grating']
const METHOD_OPTIONS = ['Detailed', 'Simple']

const COMPLEXITY_MAP = {
  'Service Stair': 1,
  Architectural: 1.35,
  'Heavy Duty': 1.25,
  'Egress Only': 0.9,
}

// Default Fab time per piece per sub-step (MINUTES)
const DEFAULT_FAB_BREAKDOWN = {
  stringers:        { setup: 15, cut: 9, drill: 6, feed: 12, weld: 18, grind: 9, paint: 6 },
  treadAngles:      { setup: 3,  cut: 5, drill: 3, feed: 3,  weld: 7,  grind: 3, paint: 2 },
  landingFrame:     { setup: 9,  cut: 6, drill: 5, feed: 6,  weld: 12, grind: 6, paint: 3 },
  connPlates:       { setup: 3,  cut: 5, drill: 6, feed: 3,  weld: 9,  grind: 5, paint: 2 },
  kickplate:        { setup: 3,  cut: 3, drill: 0, feed: 3,  weld: 6,  grind: 3, paint: 2 },
  anchorBolts:      { setup: 1,  cut: 2, drill: 0, feed: 1,  weld: 0,  grind: 0, paint: 0 },
  landingCols:      { setup: 9,  cut: 6, drill: 5, feed: 6,  weld: 15, grind: 6, paint: 3 },
  landingBeams:     { setup: 6,  cut: 5, drill: 5, feed: 5,  weld: 9,  grind: 5, paint: 3 },
  landingGrating:   { setup: 6,  cut: 3, drill: 0, feed: 6,  weld: 0,  grind: 0, paint: 3 },
  nosingStrips:     { setup: 2,  cut: 3, drill: 2, feed: 2,  weld: 3,  grind: 2, paint: 0 },
  hrExtensions:     { setup: 3,  cut: 3, drill: 0, feed: 3,  weld: 6,  grind: 3, paint: 2 },
  midLandingBrace:  { setup: 5,  cut: 5, drill: 3, feed: 3,  weld: 9,  grind: 3, paint: 2 },
}

// Default Install time per piece per sub-step (MINUTES)
const DEFAULT_INST_BREAKDOWN = {
  stringers:      { unload: 9, rig: 18, fit: 12, bolt: 9, touchup: 3, qc: 2 },
  treadAngles:    { unload: 2, rig: 3,  fit: 5,  bolt: 6, touchup: 2, qc: 1 },
  landingFrame:   { unload: 6, rig: 12, fit: 9,  bolt: 7, touchup: 3, qc: 2 },
  connPlates:     { unload: 2, rig: 3,  fit: 3,  bolt: 6, touchup: 2, qc: 1 },
  kickplate:      { unload: 2, rig: 3,  fit: 3,  bolt: 3, touchup: 2, qc: 1 },
  anchorBolts:    { unload: 1, rig: 0,  fit: 2,  bolt: 3, touchup: 0, qc: 1 },
  landingCols:    { unload: 6, rig: 12, fit: 9,  bolt: 9, touchup: 3, qc: 2 },
  landingBeams:   { unload: 3, rig: 9,  fit: 6,  bolt: 6, touchup: 2, qc: 1 },
  landingGrating: { unload: 3, rig: 6,  fit: 6,  bolt: 3, touchup: 0, qc: 1 },
  nosingStrips:   { unload: 1, rig: 2,  fit: 3,  bolt: 3, touchup: 1, qc: 1 },
  hrExtensions:   { unload: 2, rig: 3,  fit: 3,  bolt: 5, touchup: 2, qc: 1 },
}

// Component-key → display label
const COMPONENT_LABELS = {
  stringers: 'Stringers',
  treadAngles: 'Tread angles',
  landingFrame: 'Landing frame',
  connPlates: 'Conn plates',
  kickplate: 'Kickplate',
  anchorBolts: 'Anchor bolts',
  landingCols: 'Landing columns',
  landingBeams: 'Landing beams',
  landingGrating: 'Landing grating',
  nosingStrips: 'Nosing strips',
  hrExtensions: 'HR extensions',
  midLandingBrace: 'Mid-landing brace',
}

const FAB_SUBSTEPS = ['setup', 'cut', 'drill', 'feed', 'weld', 'grind', 'paint']
const FAB_LABELS = ['Setup', 'Cut', 'Drill', 'Feed', 'Weld', 'Grind', 'Paint']
const INST_SUBSTEPS = ['unload', 'rig', 'fit', 'bolt', 'touchup', 'qc']
const INST_LABELS = ['Unload', 'Rig', 'Fit', 'Bolt', 'Touch-up', 'QC']

// Build the Material BOM from current setup + computed geometry
function computeBOM(s, g) {
  const wMm = g.width
  const lMm = g.landingDepth
  const fH = g.f2fHeight
  const flightsSafe = Math.max(g.flights, 1)
  const rows = [
    ['stringers',       'Stringers',           s.stringerSection,    2,                                    g.stringerLengthFt,                          0,                            'C-channel stringers'],
    ['treadAngles',     'Tread angles',        'L76x76x6',           g.numTreads * 2,                      wMm / 304.8,                                 g.numTreads * 2 * 2,          '2 per tread'],
    ['landingFrame',    'Landing frame',       'L76x76x6',           4 * Math.max(g.numLandings, 1),       (wMm + lMm) / 304.8,                         16 * Math.max(g.numLandings, 1), 'perimeter angles'],
    ['connPlates',      'Conn plates',         'FB 102x13',          4,                                    0.5,                                          16,                           'top/bottom/landing'],
    ['kickplate',       'Kickplate',           'FB 102x6',           2,                                    g.stringerLengthFt,                          0,                            'toe board'],
    ['anchorBolts',     'Anchor bolts',        'Rod 19mm',           8,                                    0.5,                                          0,                            '4 top + 4 bottom'],
    ['landingCols',     'Landing columns',     s.columnSection,      g.numLandings * g.colsPerLanding,     (g.numLandings * fH) / 304.8 / flightsSafe,  0,                            ''],
    ['landingBeams',    'Landing beams',       'L76x76x6',           g.numLandings * 4,                    wMm / 304.8,                                 0,                            ''],
    ['landingGrating',  'Landing grating',     'Grating 32x32',      g.numLandings,                        (wMm * lMm) / 92903,                         0,                            'sqft area'],
    ['nosingStrips',    'Nosing strips',       'FB 38x6',            g.numTreads * g.flights,              wMm / 304.8,                                 0,                            'abrasive nosing'],
    ['hrExtensions',    'Handrail extensions', 'Pipe 42 Sch40',      g.numLandings * 2,                    3,                                            0,                            'at each landing'],
    ['midLandingBrace', 'Mid-landing brace',   'L76x76x6',           g.numLandings * 2,                    wMm / 304.8,                                 0,                            'cross bracing'],
  ]
  return rows.map(([key, label, section, qty, lenEa, holes, notes]) => {
    const lbPerFt = SECTION_WEIGHTS[section] || 0
    const totalLnft = qty * lenEa
    const totalLbs = totalLnft * lbPerFt
    return { key, label, section, qty, lenEa, totalLnft, lbPerFt, totalLbs, holes, notes }
  })
}

// ─── Tiny presentational helpers ───
function NumInput({ value, onChange, step = 'any', className = '', disabled = false }) {
  return (
    <input
      type="number"
      step={step}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-silver-200 bg-silver-50 px-3 py-2 text-sm font-mono text-steel-800 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 disabled:bg-silver-100 disabled:text-silver-400 ${className}`}
    />
  )
}

function TextInput({ value, onChange, className = '' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-silver-200 bg-silver-50 px-3 py-2 text-sm text-steel-800 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 ${className}`}
    />
  )
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-silver-200 bg-silver-50 px-3 py-2 text-sm text-steel-800 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-steel-600">{children}</label>
  )
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mb-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-fire-600" />}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-steel-800">{title}</h2>
          {subtitle && <p className="text-xs text-silver-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, unit, highlight }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-fire-500 text-white' : 'bg-steel-100 text-steel-800'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold font-mono">
        {value}
        {unit && <span className="ml-1 text-xs font-normal opacity-60">{unit}</span>}
      </p>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */
export default function Stairs() {
  const { state, dispatch } = useProject()
  const legacy = state.stairs || {}

  // Map legacy fields → new shape (backward-compatible)
  const legacyFinish =
    legacy.material === 'Galvanized steel' ? 'Galvanized' : legacy.finish || 'Shop Primed'

  const s = {
    preset: legacy.preset || 'Service Stair',
    finish: legacyFinish,
    treadType: legacy.treadType || 'Pan Tread (Galv)',
    stringerSection: legacy.stringerSection || 'C230x30',
    columnSection: legacy.columnSection || 'HSS 76x76x4.8',
    mark: legacy.mark || 'S-1',
    f2fHeight: legacy.f2fHeight ?? legacy.floorHeight ?? 4500,
    rise: legacy.rise ?? 175,
    run: legacy.run ?? 280,
    width: legacy.width ?? legacy.stairWidth ?? 1100,
    landingDepth: legacy.landingDepth ?? 1200,
    flights: legacy.flights ?? 1,
    colsPerLanding: legacy.colsPerLanding ?? 2,
    method: legacy.method || 'Detailed',
    customSection: legacy.customSection || '',
    customQty: legacy.customQty ?? 0,
    customLength: legacy.customLength ?? 0,
    fabBreakdown: legacy.fabBreakdown || DEFAULT_FAB_BREAKDOWN,
    instBreakdown: legacy.instBreakdown || DEFAULT_INST_BREAKDOWN,
  }

  const set = (field, value) => dispatch({ type: 'SET_STAIRS', payload: { [field]: value } })

  const setFabSub = (compKey, subKey, value) => {
    const next = {
      ...s.fabBreakdown,
      [compKey]: { ...(s.fabBreakdown[compKey] || {}), [subKey]: toNum(value) },
    }
    set('fabBreakdown', next)
  }
  const setInstSub = (compKey, subKey, value) => {
    const next = {
      ...s.instBreakdown,
      [compKey]: { ...(s.instBreakdown[compKey] || {}), [subKey]: toNum(value) },
    }
    set('instBreakdown', next)
  }

  // ── Geometry ──
  const geom = useMemo(() => {
    const fH = toNum(s.f2fHeight)
    const rise = toNum(s.rise)
    const runMm = toNum(s.run)
    const width = toNum(s.width)
    const ld = toNum(s.landingDepth)
    const flights = Math.max(toNum(s.flights), 1)
    const colsPerLanding = toNum(s.colsPerLanding)
    const numRisers = rise > 0 ? Math.ceil(fH / rise) : 0
    const numTreads = Math.max(numRisers - 1, 0)
    const numLandings = Math.max(flights - 1, 0)
    const totalRunMm = numTreads * runMm
    const angleDeg = atanDeg(rise, runMm)
    const stringerLengthFt = Math.sqrt(fH * fH + totalRunMm * totalRunMm) / 304.8
    return {
      f2fHeight: fH, rise, run: runMm, width, landingDepth: ld, flights, colsPerLanding,
      columnSection: s.columnSection,
      numRisers, numTreads, numLandings, totalRunMm, angleDeg, stringerLengthFt,
    }
  }, [s.f2fHeight, s.rise, s.run, s.width, s.landingDepth, s.flights, s.colsPerLanding, s.columnSection])

  // ── OBC compliance ──
  const codeLimits = state.rates?.codeLimits || []
  const limitOf = (item, fallback) => {
    const found = codeLimits.find((c) => c.item === item)
    return found ? found.value : fallback
  }
  const riserMax = limitOf('Riser max (stair)', 180)
  const runMin = limitOf('Run min (stair)', 255)
  const risersMaxBeforeLanding = limitOf('Risers max before landing', 12)

  const compliance = [
    {
      label: `Rise ≤ ${riserMax}mm`,
      requirement: `Rise must be ≤ ${riserMax}mm (OBC 3.4)`,
      value: `${fmtNum(geom.rise)} mm`,
      ok: geom.rise > 0 && geom.rise <= riserMax,
    },
    {
      label: `Run ≥ ${runMin}mm`,
      requirement: `Run must be ≥ ${runMin}mm (OBC 3.4)`,
      value: `${fmtNum(geom.run)} mm`,
      ok: geom.run >= runMin,
    },
    {
      label: `Max ${risersMaxBeforeLanding} risers before landing`,
      requirement: `OBC 3.4 limits risers before landing`,
      value: `${fmtNum(geom.numRisers)}`,
      ok: geom.numRisers > 0 && geom.numRisers <= risersMaxBeforeLanding,
    },
    {
      label: 'Width ≥ 900mm (public)',
      requirement: 'OBC 3.4.3 public stair',
      value: `${fmtNum(geom.width)} mm`,
      ok: geom.width >= 900,
    },
  ]

  // ── Material BOM ──
  const bom = useMemo(() => computeBOM(s, geom), [
    s.stringerSection, s.columnSection, geom.f2fHeight, geom.rise, geom.run, geom.width,
    geom.landingDepth, geom.flights, geom.colsPerLanding, geom.numTreads, geom.numLandings,
    geom.stringerLengthFt,
  ])

  // Material rates from context
  const matRates = state.rates?.materialRates || []
  const structRate = matRates.find((r) => r.item === 'Structural steel')?.rate ?? 1.0
  const galvRate = matRates.find((r) => r.item === 'Galvanized steel')?.rate ?? 1.2
  const appliedRate = s.finish === 'Galvanized' ? galvRate : structRate
  const wasteAllowance = (state.rates?.markup?.wasteMisc ?? 3) / 100

  const totalLbs = bom.reduce((sum, b) => sum + b.totalLbs, 0)
  const totalLbsWithWaste = totalLbs * (1 + wasteAllowance)
  const totalMaterialCostBase = bom.reduce((sum, b) => sum + b.totalLbs * appliedRate, 0)
  const totalMaterialCost = totalMaterialCostBase * (1 + wasteAllowance)
  const totalHoles = bom.reduce((sum, b) => sum + b.holes, 0)

  // Custom row (not in BOM list — handled separately so its qty/length come from inputs)
  const customLnft = toNum(s.customQty) * toNum(s.customLength)
  const customLbPerFt = SECTION_WEIGHTS[s.customSection] || 0
  const customLbs = customLnft * customLbPerFt
  const customMatCost = customLbs * appliedRate

  // ── Treads ──
  const miscRates = state.rates?.miscMetalsRates || []
  const findMiscRate = (key) => miscRates.find((r) => r.item === key)?.rate ?? 0
  let treadUnitRate = 0
  if (s.treadType === 'Pan Tread (Galv)') treadUnitRate = findMiscRate('Pan tread (galvanized)') || 75
  else if (s.treadType === 'Pan Tread (Mild)') treadUnitRate = findMiscRate('Pan tread (mild)') || 55
  else if (s.treadType === 'Checker Plate') treadUnitRate = findMiscRate('Checker plate tread') || 85
  else if (s.treadType === 'Grating') treadUnitRate = findMiscRate('Galv grating') || 25

  const treadQty = geom.numTreads
  const treadCost =
    s.treadType === 'Grating'
      ? treadUnitRate * (geom.width * geom.run / 92903) * treadQty
      : treadUnitRate * treadQty
  const landingSurfaceCost = (geom.width * geom.landingDepth / 92903) * 45 * Math.max(geom.numLandings, 1)
  const treadsTotal = treadCost + landingSurfaceCost

  // ── Railings auto ──
  const guardRate = findMiscRate('Guardrail pre-fab') || 95
  const handRate = findMiscRate('Handrail pre-fab') || 65
  const stairGuardLnft = geom.stringerLengthFt * 2
  const landingGuardLnft = ((geom.width + geom.landingDepth * 2) / 304.8) * Math.max(geom.numLandings, 1)
  const wallHandLnft = geom.stringerLengthFt
  const stairGuardCost = stairGuardLnft * guardRate
  const landingGuardCost = landingGuardLnft * guardRate
  const wallHandCost = wallHandLnft * handRate
  const railingsTotal = stairGuardCost + landingGuardCost + wallHandCost

  // ── Labour ──
  const fabRate = state.rates?.labourRates?.fabRate ?? 50
  const installRate = state.rates?.labourRates?.installRate ?? 55
  const complexity = COMPLEXITY_MAP[s.preset] || 1

  const fabHrsPerLb = 0.03
  const instHrsPerLb = 0.015
  const fabHrsSimple = totalLbs * fabHrsPerLb
  const instHrsSimple = totalLbs * instHrsPerLb

  const bomMap = Object.fromEntries(bom.map((b) => [b.key, b]))

  const fabComponents = Object.entries(s.fabBreakdown).map(([key, sub]) => {
    const qty = bomMap[key]?.qty || 0
    const minTotal = FAB_SUBSTEPS.reduce((acc, k) => acc + (sub[k] || 0), 0)
    const hrsPerPc = minTotal / 60
    const totalHrs = qty * hrsPerPc
    return { key, label: COMPONENT_LABELS[key] || key, qty, sub, hrsPerPc, totalHrs }
  })
  const fabHrsDetailed = fabComponents.reduce((sum, c) => sum + c.totalHrs, 0)

  const instComponents = Object.entries(s.instBreakdown).map(([key, sub]) => {
    const qty = bomMap[key]?.qty || 0
    const minTotal = INST_SUBSTEPS.reduce((acc, k) => acc + (sub[k] || 0), 0)
    const hrsPerPc = minTotal / 60
    const totalHrs = qty * hrsPerPc
    return { key, label: COMPONENT_LABELS[key] || key, qty, sub, hrsPerPc, totalHrs }
  })
  const instHrsDetailed = instComponents.reduce((sum, c) => sum + c.totalHrs, 0)

  const fabHrsFinal = (s.method === 'Detailed' ? fabHrsDetailed : fabHrsSimple) * complexity
  const instHrsFinal = (s.method === 'Detailed' ? instHrsDetailed : instHrsSimple) * complexity
  const fabLabourCost = fabHrsFinal * fabRate
  const instLabourCost = instHrsFinal * installRate
  const labourTotal = fabLabourCost + instLabourCost

  // ── Galvanizing ──
  const galvCost = s.finish === 'Galvanized' ? totalLbs * galvRate : 0

  // ── Grand Total ──
  const grandTotal = totalMaterialCost + customMatCost + treadsTotal + railingsTotal + galvCost + labourTotal

  // ── Benchmarks ──
  const dPerLb = totalLbs > 0 ? grandTotal / totalLbs : 0
  const dPerRiser = geom.numRisers > 0 ? grandTotal / geom.numRisers : 0
  const dPerLnft = geom.stringerLengthFt > 0 ? grandTotal / geom.stringerLengthFt : 0
  const inRange = (v, lo, hi) => v >= lo && v <= hi

  return (
    <div className="min-h-screen bg-silver-50">
      <div className="accent-stripe" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fire-500 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">Stairs Calculator</h1>
            <p className="page-subtitle">
              Parametric OBC 3.4-compliant stair takeoff with auto BOM, treads, railings &amp; labour
            </p>
          </div>
        </div>

        {/* ─── 1. SETUP ─── */}
        <SectionCard icon={Settings2} title="Setup" subtitle="Preset, finish, tread type, stringer & mark">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel>Preset</FieldLabel>
              <Select value={s.preset} onChange={(v) => set('preset', v)} options={PRESET_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Finish</FieldLabel>
              <Select value={s.finish} onChange={(v) => set('finish', v)} options={FINISH_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Tread Type</FieldLabel>
              <Select value={s.treadType} onChange={(v) => set('treadType', v)} options={TREAD_TYPE_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Stringer Section</FieldLabel>
              <Select value={s.stringerSection} onChange={(v) => set('stringerSection', v)} options={STRINGER_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Column Section</FieldLabel>
              <Select value={s.columnSection} onChange={(v) => set('columnSection', v)} options={COLUMN_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Mark</FieldLabel>
              <TextInput value={s.mark} onChange={(v) => set('mark', v)} />
            </div>
          </div>
          <div className="mt-3 text-xs text-silver-500">
            Complexity multiplier from preset:&nbsp;
            <span className="font-mono font-semibold text-steel-700">{complexity.toFixed(2)}x</span>
          </div>
        </SectionCard>

        {/* ─── 2. GEOMETRY ─── */}
        <SectionCard icon={ListTree} title="Stair Geometry" subtitle="Fill blue cells — risers, treads, angles, stringer length auto-calc">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel>F2F Height (mm)</FieldLabel>
              <NumInput value={s.f2fHeight} onChange={(v) => set('f2fHeight', v)} />
            </div>
            <div>
              <FieldLabel>Rise (mm)</FieldLabel>
              <NumInput value={s.rise} onChange={(v) => set('rise', v)} />
            </div>
            <div>
              <FieldLabel># Risers (auto)</FieldLabel>
              <NumInput value={geom.numRisers} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel>Run (mm)</FieldLabel>
              <NumInput value={s.run} onChange={(v) => set('run', v)} />
            </div>
            <div>
              <FieldLabel># Treads (auto)</FieldLabel>
              <NumInput value={geom.numTreads} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel>Width (mm)</FieldLabel>
              <NumInput value={s.width} onChange={(v) => set('width', v)} />
            </div>
            <div>
              <FieldLabel>Landing Depth (mm)</FieldLabel>
              <NumInput value={s.landingDepth} onChange={(v) => set('landingDepth', v)} />
            </div>
            <div>
              <FieldLabel>Angle (deg, auto)</FieldLabel>
              <NumInput value={fmtNum(geom.angleDeg, 1)} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel>Total Run (mm, auto)</FieldLabel>
              <NumInput value={geom.totalRunMm} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel>Stringer Length (ft, auto)</FieldLabel>
              <NumInput value={fmtNum(geom.stringerLengthFt, 2)} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel># Flights</FieldLabel>
              <NumInput value={s.flights} onChange={(v) => set('flights', v)} />
            </div>
            <div>
              <FieldLabel># Landings (auto)</FieldLabel>
              <NumInput value={geom.numLandings} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel># Cols / landing</FieldLabel>
              <NumInput value={s.colsPerLanding} onChange={(v) => set('colsPerLanding', v)} />
            </div>
          </div>
        </SectionCard>

        {/* ─── 3. OBC COMPLIANCE ─── */}
        <SectionCard icon={ShieldCheck} title="OBC Code Compliance" subtitle="Ontario Building Code 3.4">
          <div className="space-y-2">
            {compliance.map((c, i) => (
              <div
                key={i}
                className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
                  c.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {c.ok ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-steel-800">{c.label}</p>
                    <p className="text-xs text-silver-500">{c.requirement}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-steel-700">{c.value}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      c.ok ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {c.ok ? 'OK' : 'FAIL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ─── 4. MATERIAL BOM ─── */}
        <SectionCard icon={Layers} title="Material BOM" subtitle="13 components — auto from geometry, lb/ft from internal lookup">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-lg px-3 py-2 text-left font-bold uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Section</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Length ea (ft)</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Total lnft</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">lb/ft</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Total lbs</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Holes</th>
                  <th className="rounded-tr-lg px-3 py-2 text-right font-bold uppercase tracking-wider">Material $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                {bom.map((b) => (
                  <tr key={b.key} className="even:bg-steel-50">
                    <td className="px-3 py-2 font-medium text-steel-700">{b.label}</td>
                    <td className="px-3 py-2 font-mono text-steel-600">{b.section}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(b.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(b.lenEa, 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(b.totalLnft, 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(b.lbPerFt, 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(b.totalLbs, 1)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(b.holes)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-700">{fmt(b.totalLbs * appliedRate)}</td>
                  </tr>
                ))}

                {/* Custom row (editable section/qty/length) */}
                <tr className="bg-amber-50/40">
                  <td className="px-3 py-2 font-medium text-steel-700">Custom</td>
                  <td className="px-2 py-1">
                    <TextInput value={s.customSection} onChange={(v) => set('customSection', v)} className="!py-1 !text-xs" />
                  </td>
                  <td className="px-2 py-1">
                    <NumInput value={s.customQty} onChange={(v) => set('customQty', v)} className="!py-1 !text-xs text-right" />
                  </td>
                  <td className="px-2 py-1">
                    <NumInput value={s.customLength} onChange={(v) => set('customLength', v)} className="!py-1 !text-xs text-right" />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(customLnft, 2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(customLbPerFt, 2)}</td>
                  <td className="px-3 py-2 text-right font-mono text-steel-600">{fmtNum(customLbs, 1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-steel-600">0</td>
                  <td className="px-3 py-2 text-right font-mono text-steel-700">{fmt(customMatCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={5} className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-steel-800">
                    Subtotal (incl. waste {fmtNum(wasteAllowance * 100, 0)}%)
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-steel-800"></td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-bold text-steel-800">
                    {fmtNum(totalLbsWithWaste + customLbs * (1 + wasteAllowance), 1)} lbs
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm text-steel-800">{fmtNum(totalHoles)}</td>
                  <td className="px-3 py-3 text-right font-mono text-base font-bold text-fire-600">
                    {fmt((totalMaterialCostBase + customMatCost) * (1 + wasteAllowance))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 5. TREADS ─── */}
        <SectionCard icon={Wrench} title="Treads" subtitle={`Type: ${s.treadType}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-lg px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Item</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
                  <th className="rounded-tr-lg px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">{s.treadType}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">
                    {s.treadType === 'Grating'
                      ? `${fmtNum((geom.width * geom.run) / 92903 * treadQty, 2)} sqft`
                      : `${fmtNum(treadQty)}`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(treadUnitRate)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(treadCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Landing surface (grating/plate)</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">
                    {fmtNum((geom.width * geom.landingDepth) / 92903 * Math.max(geom.numLandings, 1), 2)} sqft
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(45)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(landingSurfaceCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-steel-800">
                    Treads subtotal
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-fire-600">{fmt(treadsTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 6. RAILINGS AUTO ─── */}
        <SectionCard icon={Hammer} title="Railings (auto from geometry)" subtitle="For integrated stair package">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-lg px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">lnft</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
                  <th className="rounded-tr-lg px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Stair guardrail (both sides)</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(stairGuardLnft, 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(guardRate)}/lnft</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(stairGuardCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Landing guardrail</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(landingGuardLnft, 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(guardRate)}/lnft</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(landingGuardCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Wall-mounted handrail</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(wallHandLnft, 2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(handRate)}/lnft</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(wallHandCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-steel-800">
                    Railings subtotal
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-fire-600">{fmt(railingsTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 7. LABOUR ─── */}
        <SectionCard icon={Wrench} title="Labour" subtitle="Detailed (sum of fab/install breakdowns) or Simple (hrs/lb)">
          <div className="mb-3 flex items-center gap-3">
            <FieldLabel>Method:</FieldLabel>
            <div className="flex-1 max-w-[200px]">
              <Select value={s.method} onChange={(v) => set('method', v)} options={METHOD_OPTIONS} />
            </div>
            <p className="text-xs text-silver-500">
              Complexity:&nbsp;<span className="font-mono font-semibold">{complexity.toFixed(2)}x</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-lg px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Operation</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Base hrs</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Total hrs</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
                  <th className="rounded-tr-lg px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Shop fabrication</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">
                    {fmtNum(s.method === 'Detailed' ? fabHrsDetailed : fabHrsSimple, 1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(fabHrsFinal, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(fabRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(fabLabourCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Field install</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">
                    {fmtNum(s.method === 'Detailed' ? instHrsDetailed : instHrsSimple, 1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(instHrsFinal, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(installRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(instLabourCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-steel-800">
                    Labour subtotal
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-fire-600">{fmt(labourTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 8. GRAND TOTAL ─── */}
        <SectionCard icon={Weight} title="Stair Grand Total">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-silver-100">
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Material (incl. waste & custom)</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-800">
                    {fmt((totalMaterialCostBase + customMatCost) * (1 + wasteAllowance))}
                  </td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Treads</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-800">{fmt(treadsTotal)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Railings</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-800">{fmt(railingsTotal)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Galvanizing {s.finish === 'Galvanized' ? '' : '(n/a)'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-800">{fmt(galvCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Labour</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-800">{fmt(labourTotal)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-steel-800">
                    GRAND TOTAL
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lg font-bold text-fire-600">{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 9. BENCHMARKS ─── */}
        <SectionCard icon={BarChart3} title="Benchmarks" subtitle="Sanity-check the bid against industry ranges">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: '$ / lb', value: dPerLb, lo: 5, hi: 12, fmt: (v) => fmt(v) },
              { label: '$ / riser', value: dPerRiser, lo: 400, hi: 800, fmt: (v) => fmt(v) },
              { label: '$ / lnft (stringer)', value: dPerLnft, lo: 600, hi: 1200, fmt: (v) => fmt(v) },
            ].map((b, i) => {
              const ok = b.value > 0 && inRange(b.value, b.lo, b.hi)
              const low = b.value > 0 && b.value < b.lo
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${
                    ok
                      ? 'border-green-200 bg-green-50'
                      : low
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-steel-600">{b.label}</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-steel-800">{b.fmt(b.value)}</p>
                  <p className="mt-1 text-xs text-silver-500">Range: {b.fmt(b.lo)} – {b.fmt(b.hi)}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      ok ? 'bg-green-200 text-green-800' : low ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {ok ? 'In range' : low ? 'Low' : 'High'}
                  </span>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* ─── 10. FAB TIME BREAKDOWN ─── */}
        <SectionCard icon={Wrench} title="Fab Time Breakdown" subtitle="Hours per piece by activity (input in MINUTES, blue = editable)">
          <details>
            <summary className="cursor-pointer select-none text-sm font-semibold text-fire-600 hover:text-fire-700">
              Show / edit fab breakdown
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-steel-800 text-white">
                    <th className="rounded-tl-lg px-2 py-2 text-left font-bold uppercase tracking-wider">Component</th>
                    <th className="px-2 py-2 text-right font-bold uppercase tracking-wider">Qty</th>
                    {FAB_LABELS.map((l) => (
                      <th key={l} className="px-2 py-2 text-right font-bold uppercase tracking-wider">{l}<br/><span className="text-[10px] font-normal opacity-70">(min)</span></th>
                    ))}
                    <th className="px-2 py-2 text-right font-bold uppercase tracking-wider">Hrs/pc</th>
                    <th className="rounded-tr-lg px-2 py-2 text-right font-bold uppercase tracking-wider">Total hrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  {fabComponents.map((c) => (
                    <tr key={c.key} className="even:bg-steel-50">
                      <td className="px-2 py-1 font-medium text-steel-700">{c.label}</td>
                      <td className="px-2 py-1 text-right font-mono text-steel-600">{fmtNum(c.qty)}</td>
                      {FAB_SUBSTEPS.map((sk) => (
                        <td key={sk} className="px-1 py-1">
                          <NumInput
                            value={c.sub[sk] ?? 0}
                            onChange={(v) => setFabSub(c.key, sk, v)}
                            className="!py-1 !text-xs text-right"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-mono text-steel-700">{fmtNum(c.hrsPerPc, 2)}</td>
                      <td className="px-2 py-1 text-right font-mono font-semibold text-steel-800">{fmtNum(c.totalHrs, 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-steel-800">
                    <td colSpan={9 + FAB_SUBSTEPS.length - 7} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-steel-800">
                      Fab breakdown total
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-fire-600">
                      {fmtNum(fabHrsDetailed, 2)} hrs
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        </SectionCard>

        {/* ─── 11. INSTALL TIME BREAKDOWN ─── */}
        <SectionCard icon={Hammer} title="Install Time Breakdown" subtitle="Hours per piece by activity (input in MINUTES, blue = editable)">
          <details>
            <summary className="cursor-pointer select-none text-sm font-semibold text-fire-600 hover:text-fire-700">
              Show / edit install breakdown
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-steel-800 text-white">
                    <th className="rounded-tl-lg px-2 py-2 text-left font-bold uppercase tracking-wider">Component</th>
                    <th className="px-2 py-2 text-right font-bold uppercase tracking-wider">Qty</th>
                    {INST_LABELS.map((l) => (
                      <th key={l} className="px-2 py-2 text-right font-bold uppercase tracking-wider">{l}<br/><span className="text-[10px] font-normal opacity-70">(min)</span></th>
                    ))}
                    <th className="px-2 py-2 text-right font-bold uppercase tracking-wider">Hrs/pc</th>
                    <th className="rounded-tr-lg px-2 py-2 text-right font-bold uppercase tracking-wider">Total hrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  {instComponents.map((c) => (
                    <tr key={c.key} className="even:bg-steel-50">
                      <td className="px-2 py-1 font-medium text-steel-700">{c.label}</td>
                      <td className="px-2 py-1 text-right font-mono text-steel-600">{fmtNum(c.qty)}</td>
                      {INST_SUBSTEPS.map((sk) => (
                        <td key={sk} className="px-1 py-1">
                          <NumInput
                            value={c.sub[sk] ?? 0}
                            onChange={(v) => setInstSub(c.key, sk, v)}
                            className="!py-1 !text-xs text-right"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-mono text-steel-700">{fmtNum(c.hrsPerPc, 2)}</td>
                      <td className="px-2 py-1 text-right font-mono font-semibold text-steel-800">{fmtNum(c.totalHrs, 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-steel-800">
                    <td colSpan={2 + INST_SUBSTEPS.length + 1} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-steel-800">
                      Install breakdown total
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-fire-600">
                      {fmtNum(instHrsDetailed, 2)} hrs
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        </SectionCard>

        {/* Footer */}
        <div className="mt-10 border-t border-silver-200 pt-6 text-center">
          <p className="text-xs text-silver-400">Triple Weld Inc. · Steel Estimator Pro · Stairs v2 (Excel v5.1 match)</p>
        </div>
      </div>
    </div>
  )
}
