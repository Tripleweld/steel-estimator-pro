import { useEffect, useMemo } from 'react'
import {
  Calculator, ShieldCheck, Weight, Wrench, Hammer, BarChart3,
  CheckCircle, AlertTriangle, Settings2, ListTree, Layers
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'

/* ────────────────────────────────────────────────────────────────────────────
   LADDER — Parametric Calculator with OHSA Compliance
   Mirrors Estimator Pro v5.1 Excel "Ladder" tab (85 rows, 10 sections)
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

// ─── Section weights (lb/ft) — from Excel Lookup tab ───
const SECTION_WEIGHTS = {
  'FB 38x6': 1.79, 'FB 51x6': 2.4, 'FB 51x10': 4.0, 'FB 64x10': 5.04,
  'FB 64x13': 6.55, 'FB 76x10': 5.97, 'FB 76x13': 7.77,
  'L51x51x6': 3.05, 'L64x64x6': 3.92, 'L76x76x6': 4.72,
  'Rod 16mm': 0.66, 'Rod 19mm': 0.94, 'Rod 22mm': 1.27, 'Rod 25mm': 1.65,
  'Pipe 27 Sch40': 0.85, 'Pipe 33 Sch40': 1.13, 'Pipe 38 Sch40': 1.13,
  'Pipe 42 Sch40': 1.68, 'Pipe 48 Sch40': 1.88,
  'HSS 51x51x3.2': 3.22, 'HSS 51x51x4.8': 2.46, 'HSS 64x64x4.8': 3.05,
  'HSS 76x76x4.8': 3.65,
  'Grating 32x32': 10.0, // lb/sqft
}

const SIDE_RAIL_OPTIONS = ['FB 51x10', 'FB 64x10', 'FB 64x13', 'FB 76x10', 'FB 76x13']
const TYPE_OPTIONS = ['Roof Access', 'Fixed Ladder', 'Ship Ladder', 'Caged Ladder']
const FINISH_OPTIONS = ['Shop Primed', 'Galvanized']
const CONFIG_OPTIONS = ['Standard', 'Over Parapet', 'Through Hatch']
const COUNTERBALANCE_OPTIONS = ['No', 'Yes']
const METHOD_OPTIONS = ['Detailed', 'Simple']

// Default Fab time per piece per sub-step (MINUTES)
const DEFAULT_FAB_BREAKDOWN = {
  sideRails:       { setup: 12, cut: 6, drill: 9, feed: 9, weld: 12, grind: 6, paint: 5 },
  rungs:           { setup: 2,  cut: 2, drill: 0, feed: 2, weld: 6,  grind: 3, paint: 1 },
  wallBrackets:    { setup: 3,  cut: 3, drill: 5, feed: 2, weld: 6,  grind: 3, paint: 1 },
  cageVertBars:    { setup: 6,  cut: 5, drill: 0, feed: 5, weld: 9,  grind: 3, paint: 3 },
  cageHorzBands:   { setup: 6,  cut: 5, drill: 3, feed: 6, weld: 12, grind: 5, paint: 3 },
  grabBars:        { setup: 5,  cut: 3, drill: 2, feed: 3, weld: 7,  grind: 5, paint: 2 },
  counterbalance:  { setup: 9,  cut: 6, drill: 3, feed: 6, weld: 9,  grind: 3, paint: 2 },
  platformFrame:   { setup: 9,  cut: 6, drill: 5, feed: 6, weld: 12, grind: 5, paint: 3 },
  platformGrating: { setup: 6,  cut: 3, drill: 0, feed: 6, weld: 0,  grind: 0, paint: 3 },
  platformRails:   { setup: 6,  cut: 5, drill: 0, feed: 5, weld: 9,  grind: 6, paint: 3 },
  descentLadder:   { setup: 12, cut: 6, drill: 9, feed: 9, weld: 12, grind: 6, paint: 5 },
  stepOverStile:   { setup: 6,  cut: 5, drill: 3, feed: 5, weld: 9,  grind: 5, paint: 3 },
}

// Default Install time per piece per sub-step (MINUTES)
const DEFAULT_INST_BREAKDOWN = {
  sideRails:       { unload: 6, rig: 12, fit: 9, bolt: 9, touchup: 3, qc: 2 },
  rungs:           { unload: 1, rig: 2,  fit: 2, bolt: 3, touchup: 1, qc: 1 },
  wallBrackets:    { unload: 2, rig: 3,  fit: 3, bolt: 6, touchup: 3, qc: 1 },
  cageAssembly:    { unload: 3, rig: 9,  fit: 6, bolt: 6, touchup: 2, qc: 2 },
  grabBars:        { unload: 2, rig: 3,  fit: 3, bolt: 5, touchup: 2, qc: 1 },
  platformFrame:   { unload: 5, rig: 9,  fit: 6, bolt: 7, touchup: 3, qc: 2 },
  platformGrating: { unload: 3, rig: 6,  fit: 5, bolt: 3, touchup: 0, qc: 1 },
  platformRails:   { unload: 3, rig: 5,  fit: 5, bolt: 6, touchup: 3, qc: 2 },
  descentLadder:   { unload: 6, rig: 12, fit: 9, bolt: 9, touchup: 3, qc: 2 },
}

// Component-key → display label
const COMPONENT_LABELS = {
  sideRails: 'Side rails',
  rungs: 'Rungs',
  wallBrackets: 'Wall brackets',
  cageVertBars: 'Cage vert. bars',
  cageHorzBands: 'Cage horz. bands',
  grabBars: 'Grab bars (top)',
  counterbalance: 'Counterbalance',
  platformFrame: 'Platform frame',
  platformGrating: 'Platform grating',
  platformRails: 'Platform side rails',
  descentLadder: 'Descent ladder',
  stepOverStile: 'Step-over stile',
  // install-only
  cageAssembly: 'Cage assembly',
}

const FAB_SUBSTEPS = ['setup', 'cut', 'drill', 'feed', 'weld', 'grind', 'paint']
const FAB_LABELS = ['Setup', 'Cut', 'Drill', 'Feed', 'Weld', 'Grind', 'Paint']
const INST_SUBSTEPS = ['unload', 'rig', 'fit', 'bolt', 'touchup', 'qc']
const INST_LABELS = ['Unload', 'Rig', 'Fit', 'Bolt', 'Touch-up', 'QC']

// Build the Material BOM from current setup + computed geometry
function computeBOM(s, g) {
  const cageReq = g.cageRequired
  const isPlatform = s.config === 'Over Parapet' || s.config === 'Through Hatch'
  const isOverParapet = s.config === 'Over Parapet'
  const widthFt = g.widthIn / 12
  const cb = s.counterbalance === 'Yes' ? 1 : 0
  const rows = [
    ['sideRails',       'Side rails',          s.sideRail,        2,                              g.heightFt + g.extensionFt,          0,             'full height + ext'],
    ['rungs',           'Rungs',               'Rod 19mm',        g.numRungs,                     widthFt,                              g.numRungs * 2, 'auto from height'],
    ['wallBrackets',    'Wall brackets',       'L76x76x6',        g.numWallBrackets,              1,                                    g.numWallBrackets * 4, 'every 6 ft'],
    ['cageVertBars',    'Cage vert. bars',     'FB 38x6',         cageReq ? 7 : 0,                cageReq ? Math.max(g.heightFt - 6, 0) : 0, 0,        'if cage req'],
    ['cageHorzBands',   'Cage horz. bands',    'FB 51x10',        cageReq ? Math.ceil(Math.max(g.heightFt - 6, 0) / 4) : 0, 8.5,       cageReq ? Math.ceil(Math.max(g.heightFt - 6, 0) / 4) * 7 : 0, 'every 4 ft'],
    ['grabBars',        'Grab bars (top)',     'Pipe 38 Sch40',   2,                              widthFt + 1,                          4,             'above landing'],
    ['counterbalance',  'Counterbalance',      'FB 64x13',        cb,                             4,                                    0,             'arm + plate (if Yes)'],
    ['platformFrame',   'Platform frame',      'L76x76x6',        isPlatform ? 4 : 0,             (g.platformWidthFt + g.platformDepthFt) / 2, 0,      'perimeter angles'],
    ['platformGrating', 'Platform grating',    'Grating 32x32',   isOverParapet ? 1 : 0,          g.platformWidthFt * g.platformDepthFt, 0,            'sqft'],
    ['platformRails',   'Platform side rails', 'Pipe 42 Sch40',   isOverParapet ? 4 : 0,          3.5,                                  0,             'both sides 42" HR'],
    ['descentLadder',   'Descent ladder',      s.sideRail,        isPlatform ? 2 : 0,             g.parapetFt + 2,                      0,             'same as main'],
    ['stepOverStile',   'Step-over stile',     'HSS 51x51x3.2',   isOverParapet ? 2 : 0,          3.5,                                  0,             'top transition'],
  ]
  return rows.map(([key, label, section, qty, lenEa, holes, notes]) => {
    const lbPerFt = SECTION_WEIGHTS[section] || 0
    const totalLnft = qty * lenEa
    let totalLbs = totalLnft * lbPerFt
    if (key === 'counterbalance' && cb) totalLbs += 35 // counterbalance weight
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

/* ──────────────────────────────────────────────────────────────────────────── */
export default function Ladder() {
  const { state, dispatch } = useProject()

  // Initialize ladder[0] if missing — single parametric instance stored in array slot 0
  useEffect(() => {
    if (!state.ladder || state.ladder.length === 0) {
      dispatch({ type: 'ADD_LADDER_ROW' })
    }
  }, [state.ladder, dispatch])

  const ladder = state.ladder?.[0]
  if (!ladder) {
    return (
      <div className="min-h-screen bg-silver-50 flex items-center justify-center">
        <p className="text-silver-500">Initializing ladder calculator…</p>
      </div>
    )
  }

  // Defaults overlay (legacy ladder rows had different fields)
  const s = {
    type: ladder.type || 'Roof Access',
    finish: ladder.finish || 'Galvanized',
    sideRail: ladder.sideRail || 'FB 64x10',
    mark: ladder.mark || 'L-1',
    heightFt: ladder.heightFt ?? 14,
    widthIn: ladder.widthIn ?? 18,
    rungSpacingIn: ladder.rungSpacingIn ?? 12,
    rungDiaIn: ladder.rungDiaIn ?? 0.75,
    offsetIn: ladder.offsetIn ?? 7,
    extensionFt: ladder.extensionFt ?? 3.5,
    counterbalance: ladder.counterbalance ?? 'No',
    config: ladder.config || 'Standard',
    parapetFt: ladder.parapetFt ?? 4,
    platformWidthFt: ladder.platformWidthFt ?? 3,
    platformDepthFt: ladder.platformDepthFt ?? 3,
    method: ladder.method || 'Detailed',
    fabBreakdown: ladder.fabBreakdown || DEFAULT_FAB_BREAKDOWN,
    instBreakdown: ladder.instBreakdown || DEFAULT_INST_BREAKDOWN,
  }

  const set = (field, value) =>
    dispatch({ type: 'UPDATE_LADDER_ROW', payload: { id: ladder.id, [field]: value } })

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

  // ── OHSA limits from context ──
  const codeLimits = state.rates?.codeLimits || []
  const limitOf = (item, fallback) => {
    const found = codeLimits.find((c) => c.item === item)
    return found ? found.value : fallback
  }
  const rungSpacingDefault = limitOf('Rung spacing (ladder)', 12)
  const cageHeightThresholdM = limitOf('Cage required above', 6)

  // ── Geometry calculations ──
  const geom = useMemo(() => {
    const heightFt = toNum(s.heightFt)
    const widthIn = toNum(s.widthIn)
    const rungSpacingIn = toNum(s.rungSpacingIn) || rungSpacingDefault
    const rungDiaIn = toNum(s.rungDiaIn)
    const offsetIn = toNum(s.offsetIn)
    const extensionFt = toNum(s.extensionFt)
    const parapetFt = toNum(s.parapetFt)
    const platformWidthFt = toNum(s.platformWidthFt)
    const platformDepthFt = toNum(s.platformDepthFt)
    const numRungs = rungSpacingIn > 0 ? Math.ceil((heightFt * 12) / rungSpacingIn) + 1 : 0
    const numWallBrackets = heightFt > 0 ? Math.ceil(heightFt / 6) + 1 : 0
    const heightM = heightFt * 0.3048
    const cageRequired = heightM > cageHeightThresholdM
    return {
      heightFt, widthIn, rungSpacingIn, rungDiaIn, offsetIn, extensionFt,
      parapetFt, platformWidthFt, platformDepthFt,
      numRungs, numWallBrackets, heightM, cageRequired,
    }
  }, [
    s.heightFt, s.widthIn, s.rungSpacingIn, s.rungDiaIn, s.offsetIn, s.extensionFt,
    s.parapetFt, s.platformWidthFt, s.platformDepthFt,
    rungSpacingDefault, cageHeightThresholdM,
  ])

  // ── OHSA compliance ──
  const compliance = [
    {
      label: `Rung spacing = ${rungSpacingDefault}"`,
      requirement: 'OHSA: 12" typical',
      value: `${fmtNum(geom.rungSpacingIn)}"`,
      ok: geom.rungSpacingIn === rungSpacingDefault,
      severity: 'warn',
    },
    {
      label: `Cage required above ${cageHeightThresholdM}m`,
      requirement: `OHSA: cage if height > ${cageHeightThresholdM}m`,
      value: `${fmtNum(geom.heightM, 2)} m`,
      ok: !geom.cageRequired,
      altLabel: geom.cageRequired ? 'CAGE REQUIRED' : 'No cage needed',
      severity: 'info',
    },
    {
      label: 'Extension above ≥ 3.5 ft',
      requirement: 'OHSA: 3.5ft min above landing',
      value: `${fmtNum(geom.extensionFt, 1)} ft`,
      ok: geom.extensionFt >= 3.5,
      severity: 'fail',
    },
    {
      label: 'Wall offset ≥ 7"',
      requirement: 'OHSA: 7" min rung to wall',
      value: `${fmtNum(geom.offsetIn, 1)}"`,
      ok: geom.offsetIn >= 7,
      severity: 'fail',
    },
  ]

  // ── Material BOM ──
  const bom = useMemo(() => computeBOM(s, geom), [
    s.sideRail, s.config, s.counterbalance,
    geom.heightFt, geom.widthIn, geom.extensionFt, geom.numRungs, geom.numWallBrackets,
    geom.cageRequired, geom.parapetFt, geom.platformWidthFt, geom.platformDepthFt,
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

  // ── Galvanizing ──
  const galvCost = s.finish === 'Galvanized' ? totalLbs * galvRate : 0

  // ── Labour ──
  const fabRate = state.rates?.labourRates?.fabRate ?? 50
  const installRate = state.rates?.labourRates?.installRate ?? 55
  const fabComplexity = 1.2
  const instComplexity = 1.3

  const fabHrsPerLb = 0.04
  const instHrsPerLb = 0.02
  const fabHrsSimple = totalLbs * fabHrsPerLb
  const instHrsSimple = totalLbs * instHrsPerLb

  // BOM map for breakdown qty lookups
  const bomMap = Object.fromEntries(bom.map((b) => [b.key, b]))

  // For install: cageAssembly qty = cageVertBars qty (when cage required, treat the cage as one assembly per vertical bar set)
  const instQtyMap = {
    sideRails: bomMap.sideRails?.qty || 0,
    rungs: bomMap.rungs?.qty || 0,
    wallBrackets: bomMap.wallBrackets?.qty || 0,
    cageAssembly: bomMap.cageVertBars?.qty || 0,
    grabBars: bomMap.grabBars?.qty || 0,
    platformFrame: bomMap.platformFrame?.qty || 0,
    platformGrating: bomMap.platformGrating?.qty || 0,
    platformRails: bomMap.platformRails?.qty || 0,
    descentLadder: bomMap.descentLadder?.qty || 0,
  }

  const fabComponents = Object.entries(s.fabBreakdown).map(([key, sub]) => {
    const qty = bomMap[key]?.qty || 0
    const minTotal = FAB_SUBSTEPS.reduce((acc, k) => acc + (sub[k] || 0), 0)
    const hrsPerPc = minTotal / 60
    const totalHrs = qty * hrsPerPc
    return { key, label: COMPONENT_LABELS[key] || key, qty, sub, hrsPerPc, totalHrs }
  })
  const fabHrsDetailed = fabComponents.reduce((sum, c) => sum + c.totalHrs, 0)

  const instComponents = Object.entries(s.instBreakdown).map(([key, sub]) => {
    const qty = instQtyMap[key] || 0
    const minTotal = INST_SUBSTEPS.reduce((acc, k) => acc + (sub[k] || 0), 0)
    const hrsPerPc = minTotal / 60
    const totalHrs = qty * hrsPerPc
    return { key, label: COMPONENT_LABELS[key] || key, qty, sub, hrsPerPc, totalHrs }
  })
  const instHrsDetailed = instComponents.reduce((sum, c) => sum + c.totalHrs, 0)

  const fabHrsFinal = (s.method === 'Detailed' ? fabHrsDetailed : fabHrsSimple) * fabComplexity
  const instHrsFinal = (s.method === 'Detailed' ? instHrsDetailed : instHrsSimple) * instComplexity
  const fabLabourCost = fabHrsFinal * fabRate
  const instLabourCost = instHrsFinal * installRate
  const labourTotal = fabLabourCost + instLabourCost

  // ── Grand Total ──
  const grandTotal = totalMaterialCost + galvCost + labourTotal

  // ── Benchmarks ──
  const dPerLb = totalLbs > 0 ? grandTotal / totalLbs : 0
  const dPerFt = geom.heightFt > 0 ? grandTotal / geom.heightFt : 0
  const dPerRung = geom.numRungs > 0 ? grandTotal / geom.numRungs : 0
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
            <h1 className="page-title">Ladder Calculator</h1>
            <p className="page-subtitle">
              Parametric OHSA-compliant fixed ladder takeoff with auto BOM, cage, platform &amp; labour
            </p>
          </div>
        </div>

        {/* ─── 1. SETUP ─── */}
        <SectionCard icon={Settings2} title="Setup" subtitle="Type, finish, side rail & mark">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={s.type} onChange={(v) => set('type', v)} options={TYPE_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Finish</FieldLabel>
              <Select value={s.finish} onChange={(v) => set('finish', v)} options={FINISH_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Side Rail Section</FieldLabel>
              <Select value={s.sideRail} onChange={(v) => set('sideRail', v)} options={SIDE_RAIL_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Mark</FieldLabel>
              <TextInput value={s.mark} onChange={(v) => set('mark', v)} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel>Config</FieldLabel>
              <Select value={s.config} onChange={(v) => set('config', v)} options={CONFIG_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Counterbalance?</FieldLabel>
              <Select value={s.counterbalance} onChange={(v) => set('counterbalance', v)} options={COUNTERBALANCE_OPTIONS} />
            </div>
          </div>
        </SectionCard>

        {/* ─── 2. GEOMETRY ─── */}
        <SectionCard icon={ListTree} title="Ladder Geometry" subtitle="Fill blue cells — rungs & wall brackets auto-calc">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel>Height (ft)</FieldLabel>
              <NumInput value={s.heightFt} onChange={(v) => set('heightFt', v)} />
            </div>
            <div>
              <FieldLabel>Width (in)</FieldLabel>
              <NumInput value={s.widthIn} onChange={(v) => set('widthIn', v)} />
            </div>
            <div>
              <FieldLabel>Rung Spacing (in)</FieldLabel>
              <NumInput value={s.rungSpacingIn} onChange={(v) => set('rungSpacingIn', v)} />
            </div>
            <div>
              <FieldLabel># Rungs (auto)</FieldLabel>
              <NumInput value={geom.numRungs} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel>Rung Dia. (in)</FieldLabel>
              <NumInput value={s.rungDiaIn} onChange={(v) => set('rungDiaIn', v)} />
            </div>
            <div>
              <FieldLabel># Wall Brackets (auto)</FieldLabel>
              <NumInput value={geom.numWallBrackets} onChange={() => {}} disabled />
            </div>
            <div>
              <FieldLabel>Offset from Wall (in)</FieldLabel>
              <NumInput value={s.offsetIn} onChange={(v) => set('offsetIn', v)} />
            </div>
            <div>
              <FieldLabel>Extension Above (ft)</FieldLabel>
              <NumInput value={s.extensionFt} onChange={(v) => set('extensionFt', v)} />
            </div>
            <div>
              <FieldLabel>Parapet Height (ft)</FieldLabel>
              <NumInput value={s.parapetFt} onChange={(v) => set('parapetFt', v)} />
            </div>
            <div>
              <FieldLabel>Platform Width (ft)</FieldLabel>
              <NumInput value={s.platformWidthFt} onChange={(v) => set('platformWidthFt', v)} />
            </div>
            <div>
              <FieldLabel>Platform Depth (ft)</FieldLabel>
              <NumInput value={s.platformDepthFt} onChange={(v) => set('platformDepthFt', v)} />
            </div>
            <div>
              <FieldLabel>Height (m, auto)</FieldLabel>
              <NumInput value={fmtNum(geom.heightM, 2)} onChange={() => {}} disabled />
            </div>
          </div>
        </SectionCard>

        {/* ─── 3. OHSA COMPLIANCE ─── */}
        <SectionCard icon={ShieldCheck} title="OHSA Compliance">
          <div className="space-y-2">
            {compliance.map((c, i) => {
              const isInfo = c.severity === 'info'
              const isWarn = c.severity === 'warn'
              const ok = c.ok
              const cls = ok
                ? 'border-green-200 bg-green-50'
                : isInfo
                ? 'border-amber-200 bg-amber-50'
                : isWarn
                ? 'border-amber-200 bg-amber-50'
                : 'border-red-200 bg-red-50'
              const Icon = ok ? CheckCircle : AlertTriangle
              const iconColor = ok ? 'text-green-600' : isInfo || isWarn ? 'text-amber-600' : 'text-red-600'
              const badgeCls = ok
                ? 'bg-green-200 text-green-800'
                : isInfo || isWarn
                ? 'bg-amber-200 text-amber-800'
                : 'bg-red-200 text-red-800'
              return (
                <div key={i} className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${cls}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
                    <div>
                      <p className="text-sm font-semibold text-steel-800">{c.label}</p>
                      <p className="text-xs text-silver-500">{c.requirement}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-steel-700">{c.value}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeCls}`}>
                      {c.altLabel || (ok ? 'OK' : 'FAIL')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* ─── 4. MATERIAL BOM ─── */}
        <SectionCard icon={Layers} title="Material BOM" subtitle="12 components — cage / platform / counterbalance auto-toggled">
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
                  <tr key={b.key} className={`even:bg-steel-50 ${b.qty === 0 ? 'opacity-50' : ''}`}>
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
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={5} className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-steel-800">
                    Subtotal (incl. waste {fmtNum(wasteAllowance * 100, 0)}%)
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-steel-800"></td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-bold text-steel-800">
                    {fmtNum(totalLbsWithWaste, 1)} lbs
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm text-steel-800">{fmtNum(totalHoles)}</td>
                  <td className="px-3 py-3 text-right font-mono text-base font-bold text-fire-600">
                    {fmt(totalMaterialCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 5. LABOUR ─── */}
        <SectionCard icon={Wrench} title="Labour" subtitle="Detailed (sum of fab/install breakdowns) or Simple (hrs/lb). Complexity baked: 1.20× fab, 1.30× install">
          <div className="mb-3 flex items-center gap-3">
            <FieldLabel>Method:</FieldLabel>
            <div className="flex-1 max-w-[200px]">
              <Select value={s.method} onChange={(v) => set('method', v)} options={METHOD_OPTIONS} />
            </div>
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
                  <td className="px-4 py-2.5 font-medium text-steel-700">Shop fabrication (×{fabComplexity.toFixed(2)})</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">
                    {fmtNum(s.method === 'Detailed' ? fabHrsDetailed : fabHrsSimple, 1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(fabHrsFinal, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(fabRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(fabLabourCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Field install (×{instComplexity.toFixed(2)})</td>
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

        {/* ─── 6. GRAND TOTAL ─── */}
        <SectionCard icon={Weight} title="Ladder Grand Total">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-silver-100">
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Material + Waste</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-800">{fmt(totalMaterialCost)}</td>
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

        {/* ─── 7. BENCHMARKS ─── */}
        <SectionCard icon={BarChart3} title="Benchmarks" subtitle="Sanity-check the bid against industry ranges">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: '$ / lb', value: dPerLb, lo: 8, hi: 15 },
              { label: '$ / ft height', value: dPerFt, lo: 150, hi: 300 },
              { label: '$ / rung', value: dPerRung, lo: 100, hi: 180 },
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
                  <p className="mt-1 text-2xl font-bold font-mono text-steel-800">{fmt(b.value)}</p>
                  <p className="mt-1 text-xs text-silver-500">Range: {fmt(b.lo)} – {fmt(b.hi)}</p>
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

        {/* ─── 8. FAB TIME BREAKDOWN ─── */}
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
                    <tr key={c.key} className={`even:bg-steel-50 ${c.qty === 0 ? 'opacity-50' : ''}`}>
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
                    <td colSpan={2 + FAB_SUBSTEPS.length + 1} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-steel-800">
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

        {/* ─── 9. INSTALL TIME BREAKDOWN ─── */}
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
                    <tr key={c.key} className={`even:bg-steel-50 ${c.qty === 0 ? 'opacity-50' : ''}`}>
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
          <p className="text-xs text-silver-400">Triple Weld Inc. · Steel Estimator Pro · Ladder v2 (Excel v5.1 match)</p>
        </div>
      </div>
    </div>
  )
}
