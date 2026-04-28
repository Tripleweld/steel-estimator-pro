import { useEffect, useMemo, useState } from 'react'
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
    const incl = s.bomToggles?.[key] !== false
    const effQty = incl ? qty : 0
    const lbPerFt = SECTION_WEIGHTS[section] || 0
    const totalLnft = effQty * lenEa
    let totalLbs = totalLnft * lbPerFt
    if (key === 'counterbalance' && cb && incl) totalLbs += 35 // counterbalance weight
    return { key, label, section, qty: effQty, lenEa, totalLnft, lbPerFt, totalLbs, holes: incl ? holes : 0, notes, incl, isCustom: false }
  }).concat((s.bomCustom || []).map((c, idx) => {
    const lbPerFt = SECTION_WEIGHTS[c.section] || Number(c.lbPerFt) || 0
    const qty = Number(c.qty) || 0
    const lenEa = Number(c.lenEa) || 0
    const totalLnft = qty * lenEa
    const totalLbs = totalLnft * lbPerFt
    return { key: 'custom_' + (c.id || idx), label: c.label || 'Custom item', section: c.section || '', qty, lenEa, totalLnft, lbPerFt, totalLbs, holes: Number(c.holes) || 0, notes: c.notes || 'custom', incl: true, isCustom: true, customIdx: idx }
  }))
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
      className={`w-full rounded-lg border border-steel-700 bg-steel-950 text-white px-3 py-2 text-sm font-mono text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:bg-steel-800/40 disabled:text-steel-500 ${className}`}
    />
  )
}

function TextInput({ value, onChange, className = '' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-steel-700 bg-steel-950 text-white px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 ${className}`}
    />
  )
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-steel-700 bg-steel-950 text-white px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 ${className}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function FieldLabel({ children }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-steel-400">{children}</label>
  )
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mb-6 rounded-xl border border-steel-700 bg-steel-900/40 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-fire-400" />}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
          {subtitle && <p className="text-xs text-steel-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Ladder type sketches (inline SVG) ───
function LadderSketch({ type, config, cageRequired }) {
  // Simple, schematic SVG sketches showing the geometry of each ladder type
  const stroke = '#475569'      // steel-600
  const accent = '#dc2626'      // fire-600
  const muted = '#cbd5e1'       // silver-300
  const SH = 280                // svg height
  const SW = 220                // svg width
  // Common rung pattern for vertical ladders
  const verticalRungs = (x1, x2, yTop, yBot, n = 8) => {
    const out = []
    for (let i = 1; i <= n; i++) {
      const y = yTop + ((yBot - yTop) * i) / (n + 1)
      out.push(<line key={i} x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="2" />)
    }
    return out
  }
  // Cage hoops (horizontal arcs around vertical ladder)
  const cageHoops = (cx, yTop, yBot, n = 4) => {
    const out = []
    const step = (yBot - yTop) / (n + 1)
    for (let i = 1; i <= n; i++) {
      const y = yTop + step * i
      out.push(
        <ellipse key={i} cx={cx} cy={y} rx="38" ry="10" stroke={muted} strokeWidth="1.5" fill="none" />
      )
    }
    return out
  }

  let body = null
  if (type === 'Ship Ladder') {
    // Inclined ladder (~70°) with treads (steps) and handrails on both sides
    body = (
      <g>
        {/* Floor */}
        <line x1="20" y1="260" x2={SW - 20} y2="260" stroke={stroke} strokeWidth="2" />
        {/* Stringers (inclined) */}
        <line x1="60" y1="260" x2="120" y2="40" stroke={stroke} strokeWidth="3" />
        <line x1="100" y1="260" x2="160" y2="40" stroke={stroke} strokeWidth="3" />
        {/* Treads (perpendicular to stringers, every step) */}
        {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((t, i) => {
          const yA = 260 - t * 220
          const xA = 60 + t * 60
          const xB = 100 + t * 60
          return <line key={i} x1={xA} y1={yA} x2={xB} y2={yA} stroke={stroke} strokeWidth="2" />
        })}
        {/* Handrails (parallel above stringers) */}
        <line x1="40" y1="252" x2="100" y2="32" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        <line x1="120" y1="252" x2="180" y2="32" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        {/* Vertical posts for handrails */}
        <line x1="40" y1="252" x2="60" y2="260" stroke={accent} strokeWidth="2" />
        <line x1="180" y1="32" x2="160" y2="40" stroke={accent} strokeWidth="2" />
        {/* Top platform indicator */}
        <line x1="100" y1="40" x2="200" y2="40" stroke={stroke} strokeWidth="2" />
      </g>
    )
  } else if (config === 'Over Parapet' || type === 'Roof Access') {
    // Roof access: ladder on outside up to platform over parapet, descent ladder inside
    body = (
      <g>
        {/* Ground floor */}
        <line x1="10" y1="260" x2={SW - 10} y2="260" stroke={stroke} strokeWidth="2" />
        {/* Roof line + parapet */}
        <line x1="10" y1="120" x2={SW - 10} y2="120" stroke={stroke} strokeWidth="2" />
        <rect x="120" y="80" width="90" height="40" fill="#e2e8f0" stroke={stroke} strokeWidth="1.5" />
        <text x="165" y="105" textAnchor="middle" fontSize="9" fill={stroke}>parapet</text>
        {/* Outside ladder rails (up to platform) */}
        <line x1="50" y1="260" x2="50" y2="60" stroke={stroke} strokeWidth="3" />
        <line x1="80" y1="260" x2="80" y2="60" stroke={stroke} strokeWidth="3" />
        {verticalRungs(50, 80, 60, 260, 8)}
        {/* Extension above */}
        <line x1="50" y1="60" x2="50" y2="40" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        <line x1="80" y1="60" x2="80" y2="40" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        {/* Platform on top of parapet */}
        <line x1="50" y1="60" x2="120" y2="60" stroke={stroke} strokeWidth="3" />
        <line x1="50" y1="60" x2="50" y2="55" stroke={accent} strokeWidth="1.5" />
        {/* Step-over stile (handrails) */}
        <line x1="80" y1="60" x2="80" y2="30" stroke={accent} strokeWidth="2" />
        <line x1="120" y1="60" x2="120" y2="30" stroke={accent} strokeWidth="2" />
        <line x1="80" y1="30" x2="120" y2="30" stroke={accent} strokeWidth="2" />
        {/* Descent ladder (inside, from platform down to roof) */}
        <line x1="140" y1="80" x2="140" y2="180" stroke={stroke} strokeWidth="2" strokeDasharray="2 2" />
        <line x1="160" y1="80" x2="160" y2="180" stroke={stroke} strokeWidth="2" strokeDasharray="2 2" />
        <text x="195" y="135" fontSize="9" fill={stroke}>descent</text>
        {cageRequired && cageHoops(65, 80, 240, 4)}
      </g>
    )
  } else if (config === 'Through Hatch') {
    // Vertical ladder going through a roof hatch with extension above
    body = (
      <g>
        <line x1="10" y1="260" x2={SW - 10} y2="260" stroke={stroke} strokeWidth="2" />
        {/* Roof line with hatch opening */}
        <line x1="10" y1="100" x2="80" y2="100" stroke={stroke} strokeWidth="2.5" />
        <line x1="120" y1="100" x2={SW - 10} y2="100" stroke={stroke} strokeWidth="2.5" />
        <text x={SW - 10} y="95" textAnchor="end" fontSize="9" fill={stroke}>roof</text>
        {/* Hatch label */}
        <text x="100" y="92" textAnchor="middle" fontSize="9" fill={accent}>hatch</text>
        {/* Vertical ladder rails */}
        <line x1="85" y1="260" x2="85" y2="60" stroke={stroke} strokeWidth="3" />
        <line x1="115" y1="260" x2="115" y2="60" stroke={stroke} strokeWidth="3" />
        {verticalRungs(85, 115, 60, 250, 9)}
        {/* Extension above hatch */}
        <line x1="85" y1="60" x2="85" y2="30" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        <line x1="115" y1="60" x2="115" y2="30" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        <text x="100" y="22" textAnchor="middle" fontSize="9" fill={accent}>extension</text>
        {cageRequired && cageHoops(100, 100, 240, 4)}
      </g>
    )
  } else {
    // Default: standard fixed/caged vertical ladder
    body = (
      <g>
        <line x1="10" y1="260" x2={SW - 10} y2="260" stroke={stroke} strokeWidth="2" />
        {/* Wall on right */}
        <line x1="180" y1="20" x2="180" y2="260" stroke={muted} strokeWidth="2" />
        <text x="200" y="140" textAnchor="middle" fontSize="9" fill={muted} transform="rotate(90 200 140)">wall</text>
        {/* Side rails */}
        <line x1="85" y1="260" x2="85" y2="50" stroke={stroke} strokeWidth="3" />
        <line x1="125" y1="260" x2="125" y2="50" stroke={stroke} strokeWidth="3" />
        {verticalRungs(85, 125, 50, 250, 10)}
        {/* Extension above (3.5 ft min) */}
        <line x1="85" y1="50" x2="85" y2="20" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        <line x1="125" y1="50" x2="125" y2="20" stroke={accent} strokeWidth="2" strokeDasharray="3 2" />
        <text x="105" y="14" textAnchor="middle" fontSize="9" fill={accent}>ext.</text>
        {/* Wall brackets */}
        {[110, 175, 240].map((y, i) => (
          <line key={i} x1="125" y1={y} x2="180" y2={y} stroke={stroke} strokeWidth="1.5" />
        ))}
        {/* Cage if required */}
        {cageRequired && cageHoops(105, 80, 240, 4)}
        {cageRequired && (
          <text x="55" y="155" fontSize="9" fill={muted} transform="rotate(-90 55 155)">cage</text>
        )}
      </g>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full max-w-[220px]" preserveAspectRatio="xMidYMid meet">
        {body}
      </svg>
      <p className="mt-2 text-center text-xs font-semibold text-steel-300">
        {type}
        {config !== 'Standard' && <span className="text-steel-400"> · {config}</span>}
        {cageRequired && <span className="text-fire-400"> · caged</span>}
      </p>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */
export default function Ladder() {
  const { state, dispatch } = useProject()

  // Multi-ladder mode — no auto-add. User clicks "Add Ladder" to begin.

  // Use empty object as fallback so all hooks below run unconditionally (React rules-of-hooks)
  const [activeIdx, setActiveIdx] = useState(0)
  const [customDraft, setCustomDraft] = useState({ section: 'FB 64x10', label: '', qty: 1, lenEa: 1, holes: 0 })
  const safeIdx = Math.min(Math.max(activeIdx, 0), Math.max((state.ladder?.length || 1) - 1, 0))
  const ladder = state.ladder?.[safeIdx] || {}
  const ladderId = state.ladder?.[safeIdx]?.id

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
    fabCrew: ladder.fabCrew ?? null,
    instCrew: ladder.instCrew ?? null,
    fabBreakdown: ladder.fabBreakdown || DEFAULT_FAB_BREAKDOWN,
    instBreakdown: ladder.instBreakdown || DEFAULT_INST_BREAKDOWN,
    bomToggles: ladder.bomToggles || {},
    bomCustom: ladder.bomCustom || [],
  }

  const set = (field, value) => {
    if (!ladderId) return // wait for init useEffect to add the row
    dispatch({ type: 'UPDATE_LADDER_ROW', payload: { id: ladderId, [field]: value } })
  }

  const toggleBomLine = (key) => {
    const next = { ...(s.bomToggles || {}), [key]: !(s.bomToggles?.[key] !== false) }
    set('bomToggles', next)
  }
  const addCustomBom = () => {
    const c = { ...customDraft, id: Date.now().toString(36) }
    set('bomCustom', [...(s.bomCustom || []), c])
    setCustomDraft({ section: 'FB 64x10', label: '', qty: 1, lenEa: 1, holes: 0 })
  }
  const removeCustomBom = (idx) => {
    const next = (s.bomCustom || []).filter((_, i) => i !== idx)
    set('bomCustom', next)
  }

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
  const cageHeightThresholdM = limitOf('Cage required above', 5)

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
    s.sideRail, s.config, s.counterbalance, s.bomToggles, s.bomCustom,
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
  const defFabCrew = state.rates?.labourRates?.fabCrew ?? 2
  const defInstCrew = state.rates?.labourRates?.installCrew ?? 4
  const fabCrew = s.fabCrew == null || s.fabCrew === '' ? defFabCrew : Math.max(toNum(s.fabCrew), 1)
  const instCrew = s.instCrew == null || s.instCrew === '' ? defInstCrew : Math.max(toNum(s.instCrew), 1)
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

  const fabHrsFinal = (s.method === 'Detailed' ? fabHrsDetailed : fabHrsSimple) * fabCrew * fabComplexity
  const instHrsFinal = (s.method === 'Detailed' ? instHrsDetailed : instHrsSimple) * instCrew * instComplexity
  const fabLabourCost = fabHrsFinal * fabRate
  const instLabourCost = instHrsFinal * installRate
  const labourTotal = fabLabourCost + instLabourCost

  // ── Grand Total ──
  const grandTotal = totalMaterialCost + galvCost + labourTotal

  // Dispatch computed totals to state for Misc Metals aggregation
  useEffect(() => {
    if (!ladderId) return
    dispatch({ type: 'UPDATE_LADDER_ROW', payload: { id: ladderId, weightLbs: totalLbs, fabHrs: fabHrsFinal, instHrs: instHrsFinal, totalsCommit: { weight: totalLbs, materialCost: totalMaterialCost, fabCost: fabLabourCost, instCost: instLabourCost, labourTotal, total: grandTotal, fabHrs: fabHrsFinal, instHrs: instHrsFinal } } })
    dispatch({ type: 'SET_LADDER_COMPUTED', payload: { totalLbs, materialCost: totalMaterialCost, fabCost: fabLabourCost, instCost: instLabourCost, labourTotal, grandTotal, fabHrs: fabHrsFinal, instHrs: instHrsFinal } })
  }, [dispatch, ladderId, totalLbs, totalMaterialCost, fabLabourCost, instLabourCost, labourTotal, grandTotal, fabHrsFinal, instHrsFinal])

  // ── Benchmarks ──
  const dPerLb = totalLbs > 0 ? grandTotal / totalLbs : 0
  const dPerFt = geom.heightFt > 0 ? grandTotal / geom.heightFt : 0
  const dPerRung = geom.numRungs > 0 ? grandTotal / geom.numRungs : 0
  const inRange = (v, lo, hi) => v >= lo && v <= hi

  return (
    <div className="min-h-screen bg-steel-950 text-white">
      <div className="accent-stripe" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fire-950/400 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title text-white">Ladder Calculator</h1>
            <p className="page-subtitle text-steel-400">
              Parametric OHSA-compliant fixed ladder takeoff with auto BOM, cage, platform &amp; labour
            </p>
          </div>
        </div>

        {/* Summary cards across all ladders */}
        {(state.ladder?.length || 0) > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <div className="rounded-lg border-l-4 border-blue-400/80 bg-blue-950 p-3 text-blue-100">
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Ladders</div>
              <div className="mt-0.5 text-lg font-bold font-mono">{state.ladder.length}</div>
            </div>
            <div className="rounded-lg border-l-4 border-amber-400/80 bg-amber-950 p-3 text-amber-100">
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Total Height</div>
              <div className="mt-0.5 text-lg font-bold font-mono">{(state.ladder.reduce((sum, l) => sum + Number(l.heightFt || 14), 0)).toFixed(1)} ft</div>
            </div>
            <div className="rounded-lg border-l-4 border-cyan-400/80 bg-cyan-950 p-3 text-cyan-100">
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Total Weight</div>
              <div className="mt-0.5 text-lg font-bold font-mono">{state.ladder.reduce((sum, l) => sum + Number(l.totalsCommit?.weight || 0), 0).toFixed(0)} lb</div>
            </div>
            <div className="rounded-lg border-l-4 border-fire-400/80 bg-fire-950 p-3 text-fire-100">
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Total Hrs</div>
              <div className="mt-0.5 text-lg font-bold font-mono">{(state.ladder.reduce((sum, l) => sum + Number(l.totalsCommit?.fabHrs || 0) + Number(l.totalsCommit?.instHrs || 0), 0)).toFixed(1)} h</div>
            </div>
            <div className="rounded-lg border-l-4 border-green-400/80 bg-green-950 p-3 text-green-100">
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Grand Total</div>
              <div className="mt-0.5 text-lg font-bold font-mono">${state.ladder.reduce((sum, l) => sum + Number(l.totalsCommit?.total || 0), 0).toFixed(0)}</div>
            </div>
          </div>
        )}

        {/* Add Ladder button */}
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              const newIdx = state.ladder?.length || 0
              dispatch({ type: 'ADD_LADDER_ROW' })
              setActiveIdx(newIdx)
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            + Add Ladder
          </button>
        </div>

        {/* Ladder cards (vertical list, one per ladder) */}
        {(state.ladder?.length || 0) > 0 && (
          <div className="mb-6 space-y-2">
            {(state.ladder || []).map((l, i) => {
              const isActive = i === safeIdx
              const tot = l.totalsCommit || {}
              return (
                <div key={l.id} className={`border rounded-lg overflow-hidden transition ${isActive ? 'border-fire-500/60 bg-fire-950/20' : 'border-steel-700 bg-steel-900/40 hover:bg-steel-800/40'}`}>
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <button type="button" onClick={() => setActiveIdx(i)} className="flex-1 flex items-center gap-3 text-left">
                      <span className={`text-steel-400 transition-transform ${isActive ? 'rotate-90' : ''}`}>▶</span>
                      <span className="font-mono text-xs text-steel-500 w-6 text-right">{i + 1}</span>
                      <span className="font-bold text-white text-sm">{l.mark || `L-${i+1}`}</span>
                      <span className="text-fire-400 text-xs">{l.type || 'Roof Access'}</span>
                      <span className="text-steel-400 text-xs">{l.heightFt || 14}ft · {l.config || 'Standard'}</span>
                      <span className="ml-auto flex items-center gap-3 font-mono text-xs">
                        <span className="text-steel-400 hidden md:inline">{tot.weight ? `${Number(tot.weight).toFixed(0)} lb` : ""}</span>
                        <span className="text-blue-300">{tot.materialCost ? `M ${Number(tot.materialCost).toFixed(0)}` : "M $0"}</span>
                        <span className="text-amber-300">{tot.fabCost ? `F ${Number(tot.fabCost).toFixed(0)}` : "F $0"}</span>
                        <span className="text-cyan-300">{tot.instCost ? `I ${Number(tot.instCost).toFixed(0)}` : "I $0"}</span>
                        <span className="text-green-400 font-bold text-sm">{tot.total ? `${Number(tot.total).toFixed(0)}` : "$0"}</span>
                      </span>
                      {l.committedAt && <span className="text-green-400 text-xs">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete Ladder ${i + 1}?`)) {
                          dispatch({ type: 'DELETE_LADDER_ROW', payload: l.id })
                          setActiveIdx(Math.max(i - 1, 0))
                        }
                      }}
                      title="Delete"
                      className="text-steel-400 hover:text-red-400 transition px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {(state.ladder?.length || 0) === 0 && (
          <div className="mb-6 rounded-xl border border-dashed border-steel-600 bg-steel-900/40 p-10 text-center">
            <Calculator className="mx-auto mb-3 h-10 w-10 text-steel-500" />
            <p className="text-steel-300 mb-4">No ladders yet — click "+ Add Ladder" above to start.</p>
            <button
              type="button"
              onClick={() => { dispatch({ type: 'ADD_LADDER_ROW' }); setActiveIdx(0) }}
              className="px-4 py-2 rounded-lg bg-fire-600 text-white font-semibold hover:bg-fire-500"
            >
              + Add your first ladder
            </button>
          </div>
        )}

        {(state.ladder?.length || 0) > 0 && (<>
        {/* ─── 1. SETUP ─── */}
        <SectionCard icon={Settings2} title="Setup" subtitle="Type, finish, side rail & mark — sketch on the right shows the selected configuration">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Selectors take 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div>
                  <FieldLabel>Config</FieldLabel>
                  <Select value={s.config} onChange={(v) => set('config', v)} options={CONFIG_OPTIONS} />
                </div>
                <div>
                  <FieldLabel>Counterbalance?</FieldLabel>
                  <Select value={s.counterbalance} onChange={(v) => set('counterbalance', v)} options={COUNTERBALANCE_OPTIONS} />
                </div>
              </div>
            </div>
            {/* Sketch takes 1/3 */}
            <div className="rounded-lg border border-steel-700 bg-steel-950 text-white p-4">
              <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-steel-400">Visual reference</p>
              <LadderSketch type={s.type} config={s.config} cageRequired={geom.cageRequired} />
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
                      <p className="text-sm font-semibold text-white">{c.label}</p>
                      <p className="text-xs text-steel-400">{c.requirement}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-steel-300">{c.value}</span>
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
                  <th className="rounded-tl-lg px-3 py-2 text-center font-bold uppercase tracking-wider w-12">Incl</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Section</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Length ea (ft)</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Total lnft</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">lb/ft</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Total lbs</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Holes</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Material $</th>
                  <th className="rounded-tr-lg px-3 py-2 text-center font-bold uppercase tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                {bom.map((b) => (
                  <tr key={b.key} className={`even:bg-steel-900/30 ${(!b.incl || b.qty === 0) ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2 text-center">
                      {b.isCustom ? (
                        <span className="text-fire-400 text-xs font-bold">C</span>
                      ) : (
                        <input type="checkbox" checked={b.incl} onChange={(e) => set('bomToggles', { ...(s.bomToggles || {}), [b.key]: e.target.checked })} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-steel-300">{b.label}</td>
                    <td className="px-3 py-2 font-mono text-steel-400">{b.section}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">{fmtNum(b.qty)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">{fmtNum(b.lenEa, 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">{fmtNum(b.totalLnft, 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">{fmtNum(b.lbPerFt, 2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">{fmtNum(b.totalLbs, 1)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-400">{fmtNum(b.holes)}</td>
                    <td className="px-3 py-2 text-right font-mono text-steel-300">{fmt(b.totalLbs * appliedRate)}</td>
                    <td className="px-3 py-2 text-center">
                      {b.isCustom && (
                        <button type="button" onClick={() => removeCustomBom(b.customIdx)} title="Remove custom item" className="text-steel-500 hover:text-red-400 transition px-1">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={6} className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-white">
                    Subtotal (incl. waste {fmtNum(wasteAllowance * 100, 0)}%)
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-white"></td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-bold text-white">
                    {fmtNum(totalLbsWithWaste, 1)} lbs
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm text-white">{fmtNum(totalHoles)}</td>
                  <td className="px-3 py-3 text-right font-mono text-base font-bold text-fire-400">
                    {fmt(totalMaterialCost)}
                  </td>
                  <td className="px-3 py-3"></td>
                </tr>
                <tr className="border-t border-steel-700 bg-steel-900/40">
                  <td colSpan={11} className="px-3 py-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-fire-400 mr-2">+ Add Custom Material</span>
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase text-steel-500 mb-0.5">Section</label>
                        <select value={customDraft.section} onChange={(e) => setCustomDraft({ ...customDraft, section: e.target.value })} className="rounded border border-steel-700 bg-steel-950 text-white px-2 py-1 text-xs font-mono outline-none focus:border-fire-500/50">
                          {Object.keys(SECTION_WEIGHTS).map((sec) => (<option key={sec} value={sec}>{sec}</option>))}
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase text-steel-500 mb-0.5">Label</label>
                        <input type="text" value={customDraft.label} onChange={(e) => setCustomDraft({ ...customDraft, label: e.target.value })} placeholder="e.g. Extra bracket" className="rounded border border-steel-700 bg-steel-950 text-white px-2 py-1 text-xs outline-none focus:border-fire-500/50 w-40" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase text-steel-500 mb-0.5">Qty</label>
                        <input type="number" min="0" step="any" value={customDraft.qty} onChange={(e) => setCustomDraft({ ...customDraft, qty: e.target.value })} className="rounded border border-steel-700 bg-steel-950 text-white px-2 py-1 text-xs font-mono outline-none focus:border-fire-500/50 w-16 text-right" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase text-steel-500 mb-0.5">Length ea (ft)</label>
                        <input type="number" min="0" step="any" value={customDraft.lenEa} onChange={(e) => setCustomDraft({ ...customDraft, lenEa: e.target.value })} className="rounded border border-steel-700 bg-steel-950 text-white px-2 py-1 text-xs font-mono outline-none focus:border-fire-500/50 w-20 text-right" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] uppercase text-steel-500 mb-0.5">Holes</label>
                        <input type="number" min="0" step="1" value={customDraft.holes} onChange={(e) => setCustomDraft({ ...customDraft, holes: e.target.value })} className="rounded border border-steel-700 bg-steel-950 text-white px-2 py-1 text-xs font-mono outline-none focus:border-fire-500/50 w-16 text-right" />
                      </div>
                      <button type="button" onClick={addCustomBom} className="rounded bg-fire-500 hover:bg-fire-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider transition">+ Add</button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* ─── 5. LABOUR ─── */}
        <SectionCard icon={Wrench} title="Labour" subtitle="Detailed (sum of fab/install breakdowns) or Simple (hrs/lb). Complexity baked: 1.20× fab, 1.30× install. Crew = # people × hrs/pc">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Method</FieldLabel>
              <Select value={s.method} onChange={(v) => set('method', v)} options={METHOD_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Fab crew (# people) <span className="text-steel-500">[default {defFabCrew}]</span></FieldLabel>
              <NumInput value={s.fabCrew ?? defFabCrew} onChange={(v) => set('fabCrew', v)} step="1" />
            </div>
            <div>
              <FieldLabel>Install crew (# people) <span className="text-steel-500">[default {defInstCrew}]</span></FieldLabel>
              <NumInput value={s.instCrew ?? defInstCrew} onChange={(v) => set('instCrew', v)} step="1" />
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
                <tr className="even:bg-steel-900/30">
                  <td className="px-4 py-2.5 font-medium text-steel-300">Shop fabrication (crew {fabCrew} ×{fabComplexity.toFixed(2)})</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-400">
                    {fmtNum(s.method === 'Detailed' ? fabHrsDetailed : fabHrsSimple, 1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-400">{fmtNum(fabHrsFinal, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-400">{fmt(fabRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">{fmt(fabLabourCost)}</td>
                </tr>
                <tr className="even:bg-steel-900/30">
                  <td className="px-4 py-2.5 font-medium text-steel-300">Field install (crew {instCrew} ×{instComplexity.toFixed(2)})</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-400">
                    {fmtNum(s.method === 'Detailed' ? instHrsDetailed : instHrsSimple, 1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-400">{fmtNum(instHrsFinal, 1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-400">{fmt(installRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">{fmt(instLabourCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-white">
                    Labour subtotal
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold text-fire-400">{fmt(labourTotal)}</td>
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
                <tr className="even:bg-steel-900/30">
                  <td className="px-4 py-2.5 font-medium text-steel-300">Material + Waste</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">{fmt(totalMaterialCost)}</td>
                </tr>
                <tr className="even:bg-steel-900/30">
                  <td className="px-4 py-2.5 font-medium text-steel-300">Galvanizing {s.finish === 'Galvanized' ? '' : '(n/a)'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">{fmt(galvCost)}</td>
                </tr>
                <tr className="even:bg-steel-900/30">
                  <td className="px-4 py-2.5 font-medium text-steel-300">Labour</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white">{fmt(labourTotal)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-white">
                    GRAND TOTAL
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lg font-bold text-fire-400">{fmt(grandTotal)}</td>
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">{b.label}</p>
                  <p className="mt-1 text-2xl font-bold font-mono text-white">{fmt(b.value)}</p>
                  <p className="mt-1 text-xs text-steel-400">Range: {fmt(b.lo)} – {fmt(b.hi)}</p>
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
            <summary className="cursor-pointer select-none text-sm font-semibold text-fire-400 hover:text-fire-300">
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
                    <tr key={c.key} className={`even:bg-steel-900/30 ${c.qty === 0 ? 'opacity-50' : ''}`}>
                      <td className="px-2 py-1 font-medium text-steel-300">{c.label}</td>
                      <td className="px-2 py-1 text-right font-mono text-steel-400">{fmtNum(c.qty)}</td>
                      {FAB_SUBSTEPS.map((sk) => (
                        <td key={sk} className="px-1 py-1">
                          <NumInput
                            value={c.sub[sk] ?? 0}
                            onChange={(v) => setFabSub(c.key, sk, v)}
                            className="!py-1 !text-xs text-right"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-mono text-steel-300">{fmtNum(c.hrsPerPc, 2)}</td>
                      <td className="px-2 py-1 text-right font-mono font-semibold text-white">{fmtNum(c.totalHrs, 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-steel-800">
                    <td colSpan={2 + FAB_SUBSTEPS.length + 1} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-white">
                      Fab breakdown total
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-fire-400">
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
            <summary className="cursor-pointer select-none text-sm font-semibold text-fire-400 hover:text-fire-300">
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
                    <tr key={c.key} className={`even:bg-steel-900/30 ${c.qty === 0 ? 'opacity-50' : ''}`}>
                      <td className="px-2 py-1 font-medium text-steel-300">{c.label}</td>
                      <td className="px-2 py-1 text-right font-mono text-steel-400">{fmtNum(c.qty)}</td>
                      {INST_SUBSTEPS.map((sk) => (
                        <td key={sk} className="px-1 py-1">
                          <NumInput
                            value={c.sub[sk] ?? 0}
                            onChange={(v) => setInstSub(c.key, sk, v)}
                            className="!py-1 !text-xs text-right"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-mono text-steel-300">{fmtNum(c.hrsPerPc, 2)}</td>
                      <td className="px-2 py-1 text-right font-mono font-semibold text-white">{fmtNum(c.totalHrs, 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-steel-800">
                    <td colSpan={2 + INST_SUBSTEPS.length + 1} className="px-2 py-2 text-right text-xs font-bold uppercase tracking-wider text-white">
                      Install breakdown total
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-sm font-bold text-fire-400">
                      {fmtNum(instHrsDetailed, 2)} hrs
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        </SectionCard>

        {/* Grand total bar */}
        <div className="mt-6 bg-steel-800/80 border border-steel-600 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-lg font-bold text-white uppercase tracking-wider">Grand Total — All Ladders</span>
            <div className="flex gap-4 text-sm font-mono flex-wrap items-center">
              <span className="text-steel-300">{state.ladder?.length || 0} ladders</span>
              <span className="text-steel-300">{(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.weight || 0), 0)).toFixed(0) || 0} lb</span>
              <span className="text-blue-300">M ${(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.materialCost || 0), 0)).toFixed(0) || 0}</span>
              <span className="text-amber-300">F ${(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.fabCost || 0), 0)).toFixed(0) || 0} ({(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.fabHrs || 0), 0)).toFixed(1)} h)</span>
              <span className="text-cyan-300">I ${(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.instCost || 0), 0)).toFixed(0) || 0} ({(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.instHrs || 0), 0)).toFixed(1)} h)</span>
              <span className="text-green-400 font-bold text-base">${(state.ladder?.reduce((sum, l) => sum + Number(l.totalsCommit?.total || 0), 0)).toFixed(0) || 0}</span>
            </div>
          </div>
        </div>
        </>)}

        {/* Footer */}
        <div className="mt-10 border-t border-steel-700 pt-6 text-center">
          <p className="text-xs text-steel-500">Triple Weld Inc. · Steel Estimator Pro · Ladder v2 (Excel v5.1 match)</p>
        </div>
      </div>
    </div>
  )
}
