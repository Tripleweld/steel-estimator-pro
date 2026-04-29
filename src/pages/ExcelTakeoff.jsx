import { useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet, Upload, Download, CheckCircle, XCircle, AlertTriangle,
  ArrowRight, Trash2, RefreshCw, FileDown, Info,
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'

/* ─────────── Section Catalog (matches StructuralTakeoff) ─────────── */
const SECTIONS = [
  { id: 'columns', label: 'Columns', expectsLength: true, hasBaseplate: true },
  { id: 'beams', label: 'Beams', expectsLength: true },
  { id: 'moment', label: 'Moment Connections', expectsLength: false, useWeightLb: true },
  { id: 'roofFrames', label: 'Roof Opening Frames', expectsLength: true },
  { id: 'joists', label: 'Joists (OWSJ)', expectsLength: true },
  { id: 'joistReinf', label: 'Joist Reinforcement', expectsLength: true },
  { id: 'bridging', label: 'Bridging', expectsLength: true },
  { id: 'steelDeck', label: 'Steel Deck', expectsLength: false, qtyAsSqft: true },
  { id: 'perimeterAngle', label: 'Perimeter Angle', expectsLength: true },
  { id: 'kneeBrace', label: 'Knee Brace', expectsLength: true },
  { id: 'xBracing', label: 'X-Bracing', expectsLength: true },
  { id: 'lintels', label: 'Lintels', expectsLength: true },
]

const SECTION_IDS = SECTIONS.map((s) => s.id)
const SECTION_LABEL = (id) => SECTIONS.find((s) => s.id === id)?.label || id

/* Header keys we accept (case-insensitive, fuzzy-ish) */
const HEADER_MAP = {
  section: ['section', 'seccion', 'sección', 'category', 'tipo'],
  designation: ['designation', 'profile', 'shape', 'perfil', 'designacion', 'designación'],
  qty: ['qty', 'quantity', 'cantidad', 'count', 'cant'],
  lengthFt: ['length (ft)', 'lengthft', 'length', 'longitud', 'length ft', 'len'],
  wtPerFt: ['wt/ft (lb)', 'wtperft', 'weight/ft', 'lb/ft', 'lbs/ft', 'wt per ft', 'lb per ft'],
  weightLb: ['weight (lb)', 'weight lb', 'weightlb', 'peso', 'total weight', 'lbs each', 'wt each (lb)'],
  fabPc: ['fab hrs/pc', 'fab hrs', 'fabhrs', 'fab hours per piece', 'fab hrspc', 'fab hr/pc'],
  fabCrew: ['fab crew', 'fabcrew', 'crew fab'],
  instPc: ['inst hrs/pc', 'install hrs/pc', 'inst hrs', 'instalation', 'install hours per piece'],
  instCrew: ['inst crew', 'install crew', 'instcrew', 'crew inst'],
  basePlLb: ['base plate lb', 'baseplate', 'base pl lb', 'baseplate weight'],
  anchorsPc: ['anchors/pc', 'anchors per piece', 'anchors pc', 'anchor count'],
  notes: ['notes', 'note', 'comments', 'comentarios', 'observaciones'],
}

/* ─────────── SheetJS dynamic loader (CDN) ─────────── */
async function loadSheetJS() {
  if (typeof window !== 'undefined' && window.XLSX) return window.XLSX
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-sheetjs]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.XLSX))
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    script.dataset.sheetjs = '1'
    script.onload = () => resolve(window.XLSX)
    script.onerror = () => reject(new Error('Failed to load SheetJS from CDN'))
    document.head.appendChild(script)
  })
}

/* ─────────── Header normalization ─────────── */
function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[_\s]+/g, ' ')
}

function detectColumns(headerRow) {
  const map = {}
  headerRow.forEach((h, idx) => {
    const norm = normalizeHeader(h)
    for (const [field, aliases] of Object.entries(HEADER_MAP)) {
      if (aliases.some((a) => normalizeHeader(a) === norm)) {
        map[field] = idx
        break
      }
    }
  })
  return map
}

/* ─────────── Row validation ─────────── */
function validateRow(row, idx) {
  const errors = []
  const warnings = []

  if (!row.section) {
    errors.push('Section is empty')
  } else if (!SECTION_IDS.includes(row.section)) {
    errors.push(`Section "${row.section}" is not recognized. Valid: ${SECTION_IDS.join(', ')}`)
  }

  const meta = SECTIONS.find((s) => s.id === row.section)
  if (!row.designation && !meta?.useWeightLb) warnings.push('Designation is empty')
  if (!row.qty || Number(row.qty) <= 0) errors.push('Qty must be > 0')

  if (meta) {
    if (meta.expectsLength && (!row.lengthFt || Number(row.lengthFt) <= 0)) {
      warnings.push('Length is empty or zero')
    }
    if (meta.useWeightLb && (!row.weightLb || Number(row.weightLb) <= 0)) {
      warnings.push('Weight (lb) is required for moment connections')
    }
    if (meta.qtyAsSqft && (!row.wtPerFt || Number(row.wtPerFt) <= 0)) {
      warnings.push('Wt/ft (lb/sqft) required for steel deck')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/* ─────────── Parse Excel ─────────── */
async function parseExcelFile(file) {
  const XLSX = await loadSheetJS()
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('Excel must have a header row and at least one data row')

  const headerRow = rows[0]
  const columnMap = detectColumns(headerRow)

  if (columnMap.section === undefined) {
    throw new Error('Could not find "Section" column. Make sure your headers match the template.')
  }

  const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== '' && c !== null))

  const parsed = dataRows.map((r, idx) => {
    const row = { _rowIndex: idx + 2 }
    for (const [field, colIdx] of Object.entries(columnMap)) {
      let v = r[colIdx]
      if (v === undefined || v === null || v === '') {
        row[field] = field === 'notes' ? '' : null
        continue
      }
      if (field === 'section') {
        row[field] = String(v).trim().toLowerCase().replace(/[\s_-]/g, '')
        // Normalize common variations
        const sectionAliases = {
          'col': 'columns', 'column': 'columns', 'columns': 'columns',
          'beam': 'beams', 'beams': 'beams',
          'moment': 'moment', 'mc': 'moment', 'momentconnections': 'moment',
          'roof': 'roofFrames', 'roofopening': 'roofFrames', 'rooframe': 'roofFrames', 'roofframes': 'roofFrames',
          'joist': 'joists', 'joists': 'joists', 'owsj': 'joists',
          'joistreinf': 'joistReinf', 'joistreinforcement': 'joistReinf', 'jr': 'joistReinf',
          'bridging': 'bridging',
          'deck': 'steelDeck', 'steeldeck': 'steelDeck',
          'perimeter': 'perimeterAngle', 'perimeterangle': 'perimeterAngle',
          'knee': 'kneeBrace', 'kneebrace': 'kneeBrace',
          'xbracing': 'xBracing', 'xbrace': 'xBracing', 'bracing': 'xBracing',
          'lintel': 'lintels', 'lintels': 'lintels',
        }
        row[field] = sectionAliases[row[field]] || row[field]
      } else if (field === 'notes' || field === 'designation') {
        row[field] = String(v).trim()
      } else {
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.').replace(/[^\d.\-]/g, ''))
        row[field] = isNaN(n) ? null : n
      }
    }
    const v = validateRow(row, idx)
    return { ...row, _validation: v }
  })

  return { rows: parsed, columnMap, headerRow, sheetName, totalSheets: wb.SheetNames.length }
}

/* ─────────── Generate Template ─────────── */
async function generateTemplate(filled = false) {
  const XLSX = await loadSheetJS()
  const headers = [
    'Section', 'Designation', 'Qty', 'Length (ft)', 'Wt/ft (lb)', 'Weight (lb)',
    'Fab Hrs/pc', 'Fab Crew', 'Inst Hrs/pc', 'Inst Crew',
    'Base Plate Lb', 'Anchors/pc', 'Notes',
  ]

  const exampleRows = filled
    ? [
        ['columns',        'W12x40',        8,   18,   40,   '', 0.6, 1, 0.5, 2, 35, 4, 'First floor cols'],
        ['columns',        'HSS6x6x1/4',    4,   12,   18.4, '', 0.5, 1, 0.4, 2, 25, 4, ''],
        ['beams',          'W14x22',        24,  22,   22,   '', 0.4, 1, 0.3, 2, '', '', ''],
        ['beams',          'W18x35',        12,  28,   35,   '', 0.5, 1, 0.4, 2, '', '', 'Roof beams'],
        ['moment',         'MC-01',         6,   '',   '',   180, 0.8, 2, 0.5, 3, '', '', 'Welded MC'],
        ['joists',         '22K10',         35,  30,   12,   '', 0.2, 1, 0.15, 2, '', '', 'OWSJ'],
        ['joistReinf',     'L4x4x3/8 reinf',8,   24,   9.8,  '', 0.6, 1, 0.5, 2, '', '', 'Field reinf'],
        ['bridging',       'L1.5x1.5',     420,  3,    1.43, '', 0.05, 1, 0.05, 1, '', '', ''],
        ['steelDeck',      '1.5" 22 GA',    4500,'',   1.66, '', '',  '', '',  '', '', '', 'sqft as Qty'],
        ['perimeterAngle', 'L4x4x1/4',     180,  10,   6.6,  '', 0.1, 1, 0.1, 1, '', '', ''],
        ['kneeBrace',      'L3x3x1/4',      16,  4,    4.9,  '', 0.3, 1, 0.2, 2, '', '', ''],
        ['xBracing',       'HSS3x3x3/16',   24,  18,   7.0,  '', 0.4, 1, 0.3, 2, '', '', 'Bracing'],
        ['lintels',        'L4x4x3/8',      18,  6,    9.8,  '', 0.3, 1, 0.2, 1, '', '', 'Door/window lintels'],
      ]
    : [
        // Empty rows for user to fill
        ['columns', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['beams', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['joists', '', '', '', '', '', '', '', '', '', '', '', ''],
      ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows])

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 11 }, { wch: 9 }, { wch: 12 }, { wch: 9 }, { wch: 14 }, { wch: 11 }, { wch: 30 },
  ]

  // Instructions sheet
  const instructions = [
    ['Steel Estimator Pro — Excel Takeoff Template'],
    [''],
    ['HOW TO USE'],
    ['1. Fill the rows in the "Takeoff" sheet — one row per profile/section'],
    ['2. Save the file'],
    ['3. Upload to Steel Estimator Pro at /excel-takeoff'],
    ['4. Preview the rows, fix any errors, then Apply'],
    [''],
    ['SECTIONS ACCEPTED (column "Section")'],
    ...SECTIONS.map((s) => [`  ${s.id}`, s.label]),
    [''],
    ['SPECIAL CASES'],
    ['  steelDeck — Qty = sqft, Wt/ft = lb/sqft, leave Length blank'],
    ['  moment    — fill Weight (lb) per piece instead of Length × Wt/ft'],
    ['  columns   — Base Plate Lb and Anchors/pc are optional'],
    [''],
    ['LABOR FIELDS (optional)'],
    ['  If Fab/Inst hours/crew are blank, the app will use defaults'],
    ['  from Rates & Config. Leave blank if you want defaults.'],
    [''],
    ['FAB & INSTALL HOURS (your TW productivity defaults)'],
    ['  Beams W12-W21:    Fab 0.4-0.5 hrs/pc, Inst 0.3-0.4 hrs/pc'],
    ['  Columns W12+:     Fab 0.5-0.7 hrs/pc, Inst 0.4-0.5 hrs/pc'],
    ['  Joists OWSJ:      Fab 0.2 hrs/pc, Inst 0.15 hrs/pc'],
    ['  Moment connect:   Fab 0.8 hrs/pc, Inst 0.5 hrs/pc, crews +1'],
    [''],
    ['HEADER ALIASES — these are also accepted'],
    ['  Section: section, seccion, sección, category, tipo'],
    ['  Designation: profile, shape, perfil'],
    ['  Qty: quantity, cantidad, count'],
    ['  Length: length, longitud, len'],
    ['  Wt/ft: weight/ft, lb/ft, lbs/ft'],
  ]
  const wsInst = XLSX.utils.aoa_to_sheet(instructions)
  wsInst['!cols'] = [{ wch: 22 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Takeoff')
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions')

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ─────────── Map parsed row → state row ─────────── */
function toStateRow(parsedRow, idx) {
  const meta = SECTIONS.find((s) => s.id === parsedRow.section) || {}
  return {
    id: `xl-${Date.now()}-${idx}`,
    section: parsedRow.section,
    designation: parsedRow.designation || '',
    qty: Number(parsedRow.qty) || 0,
    lengthFt: meta.expectsLength ? (Number(parsedRow.lengthFt) || 0) : 0,
    wtPerFt: Number(parsedRow.wtPerFt) || 0,
    weightLb: meta.useWeightLb ? (Number(parsedRow.weightLb) || 0) : 0,
    fabPc: Number(parsedRow.fabPc) || 0,
    fabCrew: Number(parsedRow.fabCrew) || 1,
    instPc: Number(parsedRow.instPc) || 0,
    instCrew: Number(parsedRow.instCrew) || 1,
    basePlLb: Number(parsedRow.basePlLb) || 0,
    anchorsPc: Number(parsedRow.anchorsPc) || 0,
    notes: parsedRow.notes || '',
  }
}

/* ─────────── Page ─────────── */
export default function ExcelTakeoff() {
  const { state, dispatch } = useProject()
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const summary = useMemo(() => {
    if (!parsed) return null
    const total = parsed.rows.length
    const valid = parsed.rows.filter((r) => r._validation.valid).length
    const errors = parsed.rows.filter((r) => r._validation.errors.length > 0).length
    const warnings = parsed.rows.filter((r) => r._validation.warnings.length > 0).length
    const bySection = {}
    parsed.rows.forEach((r) => {
      const k = r.section || '(unknown)'
      bySection[k] = (bySection[k] || 0) + 1
    })
    return { total, valid, errors, warnings, bySection }
  }, [parsed])

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setParseError('')
    setParsed(null)
    try {
      const result = await parseExcelFile(file)
      setParsed({ ...result, fileName: file.name })
    } catch (e) {
      setParseError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async (filled) => {
    setLoading(true)
    try {
      const blob = await generateTemplate(filled)
      downloadBlob(blob, filled ? 'TripleWeld_StructuralTakeoff_Example.xlsx' : 'TripleWeld_StructuralTakeoff_Template.xlsx')
    } catch (e) {
      alert('Failed to generate template: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (mode) => {
    if (!parsed) return
    const validRows = parsed.rows.filter((r) => r._validation.valid).map((r, i) => toStateRow(r, i))
    if (validRows.length === 0) {
      alert('No valid rows to apply.')
      return
    }
    let nextStructural
    if (mode === 'replace') {
      nextStructural = validRows
    } else {
      nextStructural = [...(state.structural || []), ...validRows]
    }
    dispatch({ type: 'SET_STRUCTURAL', payload: nextStructural })
    setShowApplyDialog(false)
    alert(`Applied ${validRows.length} rows to Structural Takeoff (${mode} mode). Navigate to Structural Takeoff to review.`)
    // Optional: clear parsed state after apply
    // setParsed(null)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const isAllInvalid = summary && summary.errors === summary.total

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-fire-400" /> Excel Takeoff
          </h1>
          <p className="text-steel-400 text-sm mt-1">
            Upload a structured .xlsx → preview → apply to Structural Takeoff. AI-free, deterministic.
          </p>
        </div>
        <Link
          to="/ai-takeoff"
          className="text-xs text-steel-400 hover:text-fire-400 flex items-center gap-1"
        >
          AI Takeoff <ArrowRight size={12} />
        </Link>
      </div>

      {/* Why Excel Takeoff banner */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3 flex items-start gap-3">
        <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-100">
          <strong>When to use Excel Takeoff:</strong> When AI Takeoff is unreliable (Gemini rate-limited, GPT-4o
          rejecting drawings) or when you've already organized quantities elsewhere. You can also have Claude in
          Cowork generate the Excel from drawings using the steel-takeoff skill, then upload here.
        </div>
      </div>

      {/* Download buttons */}
      <div className="bg-steel-800 border border-steel-700 rounded p-4">
        <h2 className="text-sm font-semibold text-steel-300 uppercase tracking-wide mb-3">
          Step 1 — Get the template
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDownloadTemplate(false)}
            disabled={loading}
            className="px-3 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded flex items-center gap-2"
          >
            <FileDown size={16} /> Download Empty Template
          </button>
          <button
            onClick={() => handleDownloadTemplate(true)}
            disabled={loading}
            className="px-3 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded flex items-center gap-2"
          >
            <FileDown size={16} /> Download Filled Example
          </button>
        </div>
        <p className="text-xs text-steel-500 mt-2">
          The template has 2 sheets: Takeoff (data) and Instructions (column reference + section catalog).
        </p>
      </div>

      {/* Drop zone */}
      <div className="bg-steel-800 border border-steel-700 rounded p-4">
        <h2 className="text-sm font-semibold text-steel-300 uppercase tracking-wide mb-3">
          Step 2 — Upload filled Excel
        </h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
            dragging ? 'border-fire-500 bg-fire-900/20' : 'border-steel-600 hover:border-steel-500'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="text-steel-400 mx-auto mb-2" />
          <div className="text-white font-semibold">Drop .xlsx here or click to browse</div>
          <div className="text-xs text-steel-500 mt-1">
            Excel 2007+ format · Single workbook · Multi-sheet OK (we read first sheet labeled "Takeoff" or sheet 1)
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFile(e.target.files[0])}
            className="hidden"
          />
        </div>
        {loading && (
          <div className="mt-3 text-sm text-steel-400 flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading SheetJS / parsing...
          </div>
        )}
        {parseError && (
          <div className="mt-3 bg-red-900/40 border border-red-700 rounded p-3 text-sm text-red-200 flex items-start gap-2">
            <XCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Parse error:</strong> {parseError}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {parsed && summary && (
        <div className="bg-steel-800 border border-steel-700 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-steel-300 uppercase tracking-wide">
              Step 3 — Preview ({parsed.fileName})
            </h2>
            <button
              onClick={() => { setParsed(null); setParseError('') }}
              className="text-xs text-steel-400 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>

          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Tile label="Total Rows" value={summary.total} accent="text-white" />
            <Tile label="✅ Valid" value={summary.valid} accent="text-green-300" />
            <Tile label="⚠️ Warnings" value={summary.warnings} accent="text-yellow-300" />
            <Tile label="❌ Errors" value={summary.errors} accent={summary.errors > 0 ? 'text-red-300' : 'text-steel-400'} />
          </div>

          {/* By section */}
          <div className="bg-steel-900 border border-steel-700 rounded p-3 mb-4">
            <div className="text-xs text-steel-400 mb-2">Rows by section:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.bySection).map(([sec, n]) => (
                <span key={sec} className="text-xs bg-steel-800 border border-steel-700 px-2 py-1 rounded">
                  <strong className="text-fire-300">{n}</strong> {SECTION_LABEL(sec)}
                </span>
              ))}
            </div>
          </div>

          {/* Rows table */}
          <div className="bg-steel-900 border border-steel-700 rounded overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-steel-800 text-steel-300 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">#</th>
                  <th className="px-2 py-1 text-center">Status</th>
                  <th className="px-2 py-1 text-left">Section</th>
                  <th className="px-2 py-1 text-left">Designation</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Length</th>
                  <th className="px-2 py-1 text-right">Wt/ft</th>
                  <th className="px-2 py-1 text-right">Wt Lb</th>
                  <th className="px-2 py-1 text-right">FabHrs</th>
                  <th className="px-2 py-1 text-right">FabCrew</th>
                  <th className="px-2 py-1 text-right">InstHrs</th>
                  <th className="px-2 py-1 text-right">InstCrew</th>
                  <th className="px-2 py-1 text-left">Issues</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r, idx) => {
                  const v = r._validation
                  const rowClass = v.errors.length > 0
                    ? 'bg-red-900/20 hover:bg-red-900/30'
                    : v.warnings.length > 0
                    ? 'bg-yellow-900/10 hover:bg-yellow-900/20'
                    : 'hover:bg-steel-800'
                  return (
                    <tr key={idx} className={`border-t border-steel-700 ${rowClass}`}>
                      <td className="px-2 py-1 text-steel-500">{r._rowIndex}</td>
                      <td className="px-2 py-1 text-center">
                        {v.errors.length > 0 ? (
                          <XCircle size={14} className="text-red-400 inline" />
                        ) : v.warnings.length > 0 ? (
                          <AlertTriangle size={14} className="text-yellow-400 inline" />
                        ) : (
                          <CheckCircle size={14} className="text-green-400 inline" />
                        )}
                      </td>
                      <td className="px-2 py-1 text-steel-200">{r.section || '—'}</td>
                      <td className="px-2 py-1 text-white">{r.designation || '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-200">{r.qty ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-300">{r.lengthFt ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-300">{r.wtPerFt ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-300">{r.weightLb ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-400">{r.fabPc ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-400">{r.fabCrew ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-400">{r.instPc ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-steel-400">{r.instCrew ?? '—'}</td>
                      <td className="px-2 py-1 text-xs">
                        {v.errors.map((e, i) => (
                          <div key={i} className="text-red-300">⛔ {e}</div>
                        ))}
                        {v.warnings.map((w, i) => (
                          <div key={i} className="text-yellow-300">⚠ {w}</div>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Apply buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowApplyDialog(true)}
              disabled={isAllInvalid}
              className="px-4 py-2 bg-fire-600 hover:bg-fire-500 disabled:bg-steel-700 disabled:cursor-not-allowed text-white text-sm rounded font-semibold flex items-center gap-2"
            >
              <CheckCircle size={16} /> Apply to Structural Takeoff ({summary.valid} valid rows)
            </button>
            {summary.errors > 0 && (
              <span className="text-xs text-red-300">
                {summary.errors} row(s) with errors will be skipped.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Apply mode modal */}
      {showApplyDialog && summary && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-steel-900 border border-steel-700 rounded-lg w-full max-w-md p-5">
            <h2 className="text-lg font-bold text-white mb-2">How to apply?</h2>
            <p className="text-sm text-steel-300 mb-4">
              Currently you have <strong className="text-white">{(state.structural || []).length}</strong> existing
              rows in Structural Takeoff. The Excel has <strong className="text-green-300">{summary.valid}</strong>{' '}
              valid rows to apply.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleApply('replace')}
                className="w-full text-left px-4 py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded"
              >
                <div className="text-sm font-semibold text-red-200">⚠ Replace all</div>
                <div className="text-xs text-red-300 mt-1">
                  Delete current {(state.structural || []).length} rows, replace with {summary.valid} from Excel.
                </div>
              </button>
              <button
                onClick={() => handleApply('append')}
                className="w-full text-left px-4 py-3 bg-fire-900/30 hover:bg-fire-900/50 border border-fire-700 rounded"
              >
                <div className="text-sm font-semibold text-fire-200">+ Append</div>
                <div className="text-xs text-fire-300 mt-1">
                  Keep existing rows, add {summary.valid} new ones at the end.
                </div>
              </button>
              <button
                onClick={() => setShowApplyDialog(false)}
                className="w-full px-4 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Excel Takeoff
      </div>
    </div>
  )
}

function Tile({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-steel-900 border border-steel-700 rounded p-3">
      <div className="text-xs text-steel-400 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  )
}
