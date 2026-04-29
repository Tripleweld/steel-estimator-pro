import { useState, useCallback, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import { Upload, FileText, Zap, AlertTriangle, CheckCircle, Loader2, Settings, Brain, Eye, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

/* --------------------- helpers --------------------- */
const toNum = v => { const n = Number(v); return isNaN(n) ? 0 : n; }

/* --------------- AI Provider configs --------------- */
const PROVIDERS = {
  gemini: { name: 'Gemini 2.5 Flash (Free)', model: 'gemini-2.5-flash', urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  gemini_pro: { name: 'Gemini 2.5 Pro', model: 'gemini-2.5-pro', urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  claude: { name: 'Claude 3.5 Sonnet', model: 'claude-3-5-sonnet-20241022', urlBase: 'https://api.anthropic.com/v1/messages' },
  gpt4o: { name: 'GPT-4o', model: 'gpt-4o', urlBase: 'https://api.openai.com/v1/chat/completions' },
}

/* --------------- STEEL EXPERT PROMPT --------------- */
const STEEL_EXPERT_PROMPT = `You are a Senior Steel Estimator for Triple Weld Inc., a CWB-certified structural and miscellaneous steel fabricator in Etobicoke, Ontario. You have analyzed 500+ completed steel projects across the GTA and Ontario. Your task is to extract EVERY steel member from structural drawings with the precision of a 20-year veteran estimator.

IDENTITY & CONTEXT:
- Company: Triple Weld Inc. (CWB W47.1 / W59 certified)
- Market: Greater Toronto Area (GTA), Ontario, Canada
- Codes: CSA S16-19, CSA G40.20/G40.21, Ontario Building Code (OBC), NBCC
- Default grade: G40.21 300W (structural), 350W (columns/heavy), 350WT (seismic/cold)
- Units: Imperial (lbs, ft, in) unless drawings specify metric

DRAWING READING RULES:
1. READ EVERY PAGE - structural plans, elevations, sections, details, schedules, general notes
2. Check drawing SCALE noted in title block - verify dimensions are consistent
3. Follow GRIDLINE references (A, B, C... and 1, 2, 3...) to locate members
4. Identify ELEVATION references (T/O Steel, B/O Steel, FFE) for member heights
5. Look for REVISION clouds and delta symbols - use latest revision
6. Read ALL general and structural notes on S-001/S-101 sheets
7. Recognize TYPICAL details - one detail may apply to 20+ locations
8. Check SCHEDULES (beam schedule, column schedule, lintel schedule) - these override plan callouts if different
9. Look for ADDENDA references in title block or notes

STRUCTURAL STEEL EXTRACTION:
For each member found, extract:
- Mark/ID (e.g., B1, C3, W2, BR1)
- AISC/CISC shape designation exactly as shown (W310x60, HSS152x152x9.5, L76x76x6.4, C250x30)
- Length in feet-inches or meters as shown
- Quantity (count ALL instances across ALL floor plans)
- Connection type at each end: simple shear (clip angle/shear tab), moment (full pen weld/end plate), pin, base plate
- Elevation/level where installed
- Grid location
- Special notes: field weld (FW), slip-critical (SC), match drill, galvanized, fireproofing

MEMBER CATEGORIES - extract ALL:
A. STRUCTURAL: Wide flange beams (W shapes) - floor/roof/transfer/spandrel beams; Wide flange columns; HSS columns (square/rectangular); HSS/pipe bracing with gusset plates; Channels (C shapes); Angles (L shapes) - bracing, lintels, kickers; Built-up members - plate girders, double angles; Canopy/awning steel

B. CONNECTIONS & HARDWARE: Base plates (size x thickness, anchor bolt pattern); Gusset plates; Shear tabs / clip angles / end plates; Moment connection plates (top & bottom flange); Stiffener plates; Anchor bolts (diameter x length x qty per base); High-strength bolts (A325/A490, note if slip-critical); Shear studs (composite beams); Bearing/sole plates for OWSJ

C. MISCELLANEOUS METALS: Stairs (pan type, concrete filled, ship ladder) - width, floor-to-floor height, flights; Handrails and guardrails - type, height, length, finish; Ladders (fixed, cage, ship); Lintels (read LINTEL SCHEDULE first); Embed plates / weld plates; Bollards; Grating and floor plates; Mezzanine/platform framing; Catwalks; Equipment support steel (dunnage, curb); Roof hatch frames; Misc angles, plates, brackets

D. STEEL DECK & JOISTS: Open web steel joists (OWSJ) - designation, span, spacing, qty; Joist girders; Steel deck - profile (P3606, P3615, B22, N22), gauge, span, area (sq ft); Composite deck vs. roof deck vs. form deck

WEIGHT CALCULATION RULES:
- Use AISC/CISC published weight per linear foot for standard shapes
- Add 8-12% connection allowance to structural steel weight (8% simple, 12% complex)
- Add 3-5% wastage/cut allowance
- Plates: calculate from dimensions (width x length x thickness x 490 lb/cu ft / 144)
- Base plates: include in connection weight

PRODUCTIVITY KNOWLEDGE (from 500+ projects):
- Simple structural (warehouse): 15-25 hrs/ton fab, 8-12 hrs/ton install
- Standard commercial (multi-story): 25-40 hrs/ton fab, 12-18 hrs/ton install
- Complex institutional: 35-50 hrs/ton fab, 16-25 hrs/ton install
- Heavy misc metals: 40-60 hrs/ton fab, 20-35 hrs/ton install
- Stairs: 50-80 hrs/ton fab, 25-40 hrs/ton install
- Railings: 60-100 hrs/ton fab, 30-50 hrs/ton install

COMMON PATTERNS FROM GTA PROJECTS:
- Low-rise commercial: W shapes for beams/columns, HSS bracing, OWSJ roof
- Multi-story: moment frames or braced frames, composite deck, heavier columns at base
- Industrial/warehouse: long-span joists, HSS or pipe columns, light bracing
- Institutional (schools/hospitals): complex geometry, heavy misc metals, lots of lintels
- Residential podium: transfer beams, heavy base plates, embed plates for precast

SURFACE TREATMENT FLAGS:
- Galvanized (HDG): exterior steel, pool areas, parking structures - ADD 30-40% to material cost
- Shop primer (default for interior structural)
- Special coatings: intumescent fireproofing, epoxy, zinc-rich primer

CRITICAL QUALITY CHECKS:
- If beam/column size seems wrong for its span, flag with confidence level
- If quantities dont match between schedule and plan, note the discrepancy
- If connection type is unclear, mark as "needs RFI"
- If member grade not specified, assume 300W for beams, 350W for columns
- If detail says "SIMILAR" or "TYP", count ALL instances it applies to

OUTPUT FORMAT - Return valid JSON:
{"projectInfo":{"projectName":"from title block","drawingNumbers":["S-101","S-201"],"engineer":"from title block","revision":"latest rev","scale":"as noted","dateAnalyzed":"today"},"structural":[{"mark":"B1","section":"W410x60","length_ft":25.5,"qty":12,"weight_per_ft":60,"total_weight_lbs":18360,"grade":"300W","connectionLeft":"simple shear","connectionRight":"moment","elevation":"T/O Steel","gridLocation":"A1-A4","notes":"composite with shear studs","confidence":"high"}],"miscMetals":[{"item":"Stair ST-1","description":"Pan-type stair, 4ft wide, 12ft floor-to-floor","qty":2,"flights":4,"material":"HSS stringers, plate pans","finish":"galvanized","notes":"includes handrail both sides","confidence":"high"}],"deckAndJoists":[{"item":"Roof Deck","type":"P3606","gauge":22,"area_sqft":15000,"notes":"1.5in roof deck"}],"connections":{"basePlates":[{"size":"16x16x1.25","anchorBolts":"4x3/4 dia","qty":24}],"momentConnections":[{"location":"Grid B","type":"bolted end plate","qty":8}],"bracingGussets":[{"size":"24x18x5/8","qty":16}]},"summary":{"totalStructuralTons":0,"totalMiscMetalsTons":0,"totalDeckSqft":0,"totalJoists":0,"connectionAllowancePct":10,"wastagePct":4,"complexityRating":"standard","confidenceOverall":"high","rfiItems":["items needing clarification"],"scopeNotes":["included and excluded"]}}

FINAL INSTRUCTIONS:
- Be THOROUGH - miss nothing. A missed beam costs money.
- Be PRECISE - exact shape designations, not approximations
- Be CONSERVATIVE - if unsure about quantity, round up slightly
- FLAG uncertainties with confidence: "high", "medium", or "low"
- Extract from ALL pages, not just the first few
- Every structural drawing page typically has 5-50 members - if you find less than 5 on a framing plan, look harder
- Cross-reference plans with sections and details
- Return ONLY valid JSON, no markdown, no explanation text`

/* -------------- Markup overlay prompt -------------- */
const MARKUP_PROMPT = `You previously analyzed this structural drawing and identified steel members. Now I need you to identify the SPATIAL LOCATION of each member on this drawing for markup purposes.

For each member you identified, provide approximate bounding box coordinates as percentages of the page dimensions (0-100 for both x and y, where 0,0 is top-left).

Return JSON:
{
  "markups": [
    {
      "mark": "B1",
      "status": "included|excluded|review",
      "bbox": {"x": 15, "y": 30, "w": 40, "h": 3},
      "label": "B1 - W310x45 x 25'-0\" (qty 4)"
    }
  ]
}`

/* ------------ PDF to images using pdf.js ------------ */
const PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDF_JS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PDF_JS_CDN
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER
      resolve(window.pdfjsLib)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function pdfPageToBase64(pdfDoc, pageNum, scale = 2.0) {
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

/* ----------------- Gemini API call ----------------- */
async function callGeminiVision(apiKey, model, base64Image, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
    })
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Gemini API error ${resp.status}: ${err}`)
  }
  const data = await resp.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  // Extract JSON from response (may be wrapped in ```json blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in AI response')
  return JSON.parse(jsonMatch[0])
}

/* ------------------ MAIN COMPONENT ------------------ */
export default function AiTakeoff() {
  const { state, dispatch, setProjectField } = useProject()
  const fileInputRef = useRef(null)

  // State
  const [files, setFiles] = useState([])
  const [pages, setPages] = useState([])       // {pageNum, thumbnail, selected, status, result}
  const [provider, setProvider] = useState('gemini')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tw-ai-apikey') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [showResults, setShowResults] = useState(false)
  const [mergedResult, setMergedResult] = useState(null)

  // Save API key
  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('tw-ai-apikey', key)
  }

  // Handle file drop
  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || [])
      .filter(f => f.type === 'application/pdf')
    if (!droppedFiles.length) { setError('Please upload PDF files only'); return }
    setError(null)
    setFiles(droppedFiles)
    setResults([])
    setMergedResult(null)

    // Load PDF and generate thumbnails
    try {
      const pdfjsLib = await loadPdfJs()
      const allPages = []
      for (const file of droppedFiles) {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        for (let i = 1; i <= pdf.numPages; i++) {
          const thumb = await pdfPageToBase64(pdf, i, 0.3)
          allPages.push({
            pageNum: i,
            fileName: file.name,
            thumbnail: thumb,
            selected: true,
            status: 'pending',
            result: null,
            pdfDoc: pdf
          })
        }
      }
      setPages(allPages)
    } catch (err) {
      console.error('AI_TAKEOFF_ERROR page ' + (page ? page.pageNum : '?') + ':', err.message, err)
      setError('Error loading PDF: ' + err.message)
    }
  }, [])

  // Process selected pages
  const processPages = async () => {
    if (!apiKey) { setError('Please enter your API key first'); setShowSettings(true); return }
    const selectedPages = pages.filter(p => p.selected)
    if (!selectedPages.length) { setError('Select at least one page to process'); return }

    setProcessing(true)
    setError(null)
    setProgress({ done: 0, total: selectedPages.length })
    const pageResults = []

    for (let i = 0; i < selectedPages.length; i++) {
      const page = selectedPages[i]
      setCurrentPage(page.pageNum)
      setProgress({ done: i, total: selectedPages.length })

      // Update page status
      setPages(prev => prev.map(p =>
        p.pageNum === page.pageNum && p.fileName === page.fileName
          ? { ...p, status: 'processing' } : p
      ))

      try {
        // Convert page to high-res image
        console.log('AI_TAKEOFF: processing page', page.pageNum, 'pdfDoc:', !!page.pdfDoc)
        const base64 = await pdfPageToBase64(page.pdfDoc, page.pageNum, 2.0)
        console.log('AI_TAKEOFF: base64 length:', base64 ? base64.length : 'NULL')

        // Call AI
        let result
        if (provider === 'gemini' || provider === 'gemini_pro') {
          const model = PROVIDERS[provider].model
          result = await callGeminiVision(apiKey, model, base64, STEEL_EXPERT_PROMPT)
        }
        // TODO: Add Claude and GPT-4o providers

        pageResults.push({ ...page, result, status: 'done' })
        setPages(prev => prev.map(p =>
          p.pageNum === page.pageNum && p.fileName === page.fileName
            ? { ...p, status: 'done', result } : p
        ))
      } catch (err) {
        pageResults.push({ ...page, status: 'error', error: err.message })
        setPages(prev => prev.map(p =>
          p.pageNum === page.pageNum && p.fileName === page.fileName
            ? { ...p, status: 'error' } : p
        ))
      }
    }

    setProgress({ done: selectedPages.length, total: selectedPages.length })
    setResults(pageResults)
    setProcessing(false)
    setCurrentPage(null)

    // Merge results from all pages
    const merged = mergeResults(pageResults.filter(p => p.result))
    setMergedResult(merged)
    setShowResults(true)
  }

  // Merge results from multiple pages into unified takeoff
  function mergeResults(pageResults) {
    const allMembers = []
    const allMisc = []
    const specs = {}
    const warnings = []
    const seenMarks = new Set()

    for (const pr of pageResults) {
      const r = pr.result
      if (!r) continue

      // Structural members - deduplicate by mark
      for (const m of (r.structuralMembers || [])) {
        const key = m.mark + '|' + m.section
        if (!seenMarks.has(key)) {
          seenMarks.add(key)
          allMembers.push(m)
        }
      }

      // Misc metals
      for (const mm of (r.miscMetals || [])) {
        allMisc.push(mm)
      }

      // Merge specs
      if (r.specs) Object.assign(specs, r.specs)

      // Warnings
      if (r.warnings) warnings.push(...r.warnings)
    }

    const totalWeight = allMembers.reduce((s, m) => s + toNum(m.total_weight_lbs), 0)
    const avgConfidence = allMembers.length
      ? allMembers.reduce((s, m) => s + toNum(m.confidence), 0) / allMembers.length
      : 0

    return {
      structuralMembers: allMembers,
      miscMetals: allMisc,
      specs,
      warnings,
      totalWeight,
      totalTons: (totalWeight / 2000).toFixed(1),
      avgConfidence: (avgConfidence * 100).toFixed(0),
      memberCount: allMembers.length,
      miscCount: allMisc.length
    }
  }

  // Apply results to takeoff
  const applyToTakeoff = () => {
    if (!mergedResult) return

    // Map structural members to takeoff rows
    const newRows = mergedResult.structuralMembers.map((m, i) => ({
      id: 'ai-' + Date.now() + '-' + i,
      mark: m.mark || '',
      section: m.section || '',
      category: m.category || 'beam',
      grade: m.grade || '300W',
      length: toNum(m.length_ft),
      qty: toNum(m.qty) || 1,
      weightPerFt: toNum(m.weight_per_ft),
      totalWeight: toNum(m.total_weight_lbs),
      connectionLeft: m.connection_left || 'simple',
      connectionRight: m.connection_right || 'simple',
      elevation: m.elevation || '',
      finish: m.finish || 'shop primer',
      notes: m.notes || '',
      aiConfidence: toNum(m.confidence),
      // Fab and install hours will be calculated by the existing system
      fabSetup: 0, fabCut: 0, fabDrill: 0, fabFeed: 0, fabWeld: 0,
      fabGrind: 0, fabTotal: 0,
      installPlumb: 0, installBolt: 0, installWeld: 0, installDeck: 0,
      installTotal: 0,
    }))

    // Dispatch to add rows to structural takeoff
    dispatch({ type: 'SET_STRUCTURAL_TAKEOFF', payload: [
      ...(state.structuralTakeoff || []),
      ...newRows
    ]})

    // Map misc metals
    if (mergedResult.miscMetals.length > 0) {
      const miscRows = mergedResult.miscMetals.map((mm, i) => ({
        id: 'ai-misc-' + Date.now() + '-' + i,
        item: mm.item || '',
        type: mm.type || 'other',
        description: mm.description || '',
        qty: toNum(mm.qty) || 1,
        unit: mm.unit || 'ea',
        dimensions: mm.dimensions || '',
        finish: mm.finish || '',
        estimatedWeight: toNum(mm.estimated_weight_lbs),
        notes: '',
        aiConfidence: toNum(mm.confidence),
      }))

      dispatch({ type: 'SET_MISC_METALS_TAKEOFF', payload: [
        ...(state.miscMetalsTakeoff || []),
        ...miscRows
      ]})
    }

    setError(null)
    alert(`Applied to takeoff: ${newRows.length} structural members + ${mergedResult.miscMetals.length} misc metals items`)
  }

  // Drag and drop handlers
  const [dragOver, setDragOver] = useState(false)
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  /* ----------------- Confidence color ----------------- */
  const confColor = (c) => {
    if (c >= 0.9) return 'text-green-400'
    if (c >= 0.7) return 'text-yellow-400'
    return 'text-red-400'
  }
  const confBg = (c) => {
    if (c >= 0.9) return 'bg-green-500/10 border-green-500/30'
    if (c >= 0.7) return 'bg-yellow-500/10 border-yellow-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="min-h-screen bg-steel-950 text-white p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-fire-500" />
            <h1 className="text-2xl font-bold">AI Takeoff</h1>
            <span className="text-xs bg-fire-500/20 text-fire-400 px-2 py-0.5 rounded-full font-medium">BETA</span>
          </div>
          <p className="text-sm text-steel-400 mt-1">
            Upload structural drawings & specs → AI extracts quantities automatically
          </p>

      {!apiKey && (
        <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-yellow-400 text-lg">&#9888;</span>
          <div>
            <p className="text-yellow-300 font-medium text-sm">API Key Required</p>
            <p className="text-yellow-400/70 text-xs">Enter your Gemini API key in the settings above to enable AI takeoff</p>
          </div>
        </div>
      )}

        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-steel-700 text-steel-400 hover:text-white hover:border-steel-500 transition"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">API Settings</span>
        </button>
      </div>

      {/* API Settings Panel */}
      {showSettings && (
        <div className="bg-steel-900 border border-steel-700 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-steel-300">AI Provider Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-steel-400 mb-1">Provider</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value)}
                className="w-full bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-sm text-white"
              >
                {Object.entries(PROVIDERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-steel-400 mb-1">
                API Key {provider.startsWith('gemini') && <span className="text-green-400">(Free at ai.google.dev)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => saveApiKey(e.target.value)}
                  placeholder={provider.startsWith('gemini') ? 'AIza...' : 'sk-...'}
                  className="flex-1 bg-steel-800 border border-steel-600 rounded-lg px-3 py-2 text-sm text-white placeholder-steel-500"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-2 rounded-lg border border-steel-600 text-steel-400 hover:text-white text-xs"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
          {provider.startsWith('gemini') && (
            <p className="text-xs text-steel-500">
              Get your free API key at <span className="text-fire-400">ai.google.dev/aistudio</span> --- 1,500 free requests/day
            </p>
          )}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-fire-500 bg-fire-500/10'
            : 'border-steel-600 bg-steel-900/50 hover:border-steel-500 hover:bg-steel-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={onDrop}
          className="hidden"
        />
        <Upload className={`w-12 h-12 mx-auto mb-3 ${dragOver ? 'text-fire-500' : 'text-steel-500'}`} />
        <p className="text-lg font-semibold text-steel-300">
          {files.length ? `${files.length} PDF(s) loaded --- ${pages.length} pages` : 'Drop PDF drawings here'}
        </p>
        <p className="text-sm text-steel-500 mt-1">
          Structural drawings, framing plans, beam schedules, specs (Division 5)
        </p>
      </div>

      {/* Page Thumbnails */}
      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-steel-300">
              Pages to Process ({pages.filter(p => p.selected).length} of {pages.length} selected)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPages(prev => prev.map(p => ({ ...p, selected: true })))}
                className="text-xs text-steel-400 hover:text-white"
              >Select All</button>
              <span className="text-steel-600">|</span>
              <button
                onClick={() => setPages(prev => prev.map(p => ({ ...p, selected: false })))}
                className="text-xs text-steel-400 hover:text-white"
              >Deselect All</button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {pages.map((page, idx) => (
              <div
                key={idx}
                onClick={() => setPages(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p))}
                className={`relative flex-shrink-0 w-28 cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                  page.selected
                    ? page.status === 'done' ? 'border-green-500' : page.status === 'error' ? 'border-red-500' : 'border-fire-500'
                    : 'border-steel-700 opacity-50'
                }`}
              >
                <img
                  src={`data:image/jpeg;base64,${page.thumbnail}`}
                  alt={`Page ${page.pageNum}`}
                  className="w-full h-36 object-cover bg-white"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 flex items-center justify-between">
                  <span className="text-xs text-white">P{page.pageNum}</span>
                  {page.status === 'processing' && <Loader2 className="w-3 h-3 text-fire-500 animate-spin" />}
                  {page.status === 'done' && <CheckCircle className="w-3 h-3 text-green-400" />}
                  {page.status === 'error' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* Process Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={processPages}
              disabled={processing || !apiKey || pages.length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition ${
                processing
                  ? 'bg-steel-700 text-steel-400 cursor-wait'
                  : 'bg-fire-500 text-white hover:bg-fire-600 shadow-lg shadow-fire-500/20'
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing page {progress.done + 1} of {progress.total}...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {!apiKey ? "Set API Key First" : pages.length === 0 ? "Upload PDF First" : `Run AI Takeoff (${pages.filter(p => p.selected).length} pages)`}
                </>
              )}
            </button>

            {processing && (
              <div className="flex-1">
                <div className="h-2 bg-steel-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fire-500 rounded-full transition-all duration-500"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {mergedResult && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-steel-900 border border-steel-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-fire-500">{mergedResult.memberCount}</p>
              <p className="text-xs text-steel-400">Structural Members</p>
            </div>
            <div className="bg-steel-900 border border-steel-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-fire-500">{mergedResult.miscCount}</p>
              <p className="text-xs text-steel-400">Misc Metals Items</p>
            </div>
            <div className="bg-steel-900 border border-steel-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{Number(mergedResult.totalWeight).toLocaleString()}</p>
              <p className="text-xs text-steel-400">Total lbs</p>
            </div>
            <div className="bg-steel-900 border border-steel-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{mergedResult.totalTons}</p>
              <p className="text-xs text-steel-400">Tons</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${confBg(mergedResult.avgConfidence / 100)}`}>
              <p className={`text-2xl font-bold ${confColor(mergedResult.avgConfidence / 100)}`}>
                {mergedResult.avgConfidence}%
              </p>
              <p className="text-xs text-steel-400">Confidence</p>
            </div>
          </div>

          {/* Extracted Members Table */}
          <div className="bg-steel-900 border border-steel-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowResults(!showResults)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-steel-800 transition"
            >
              <span className="text-sm font-semibold text-steel-300">
                Extracted Members ({mergedResult.structuralMembers.length})
              </span>
              {showResults ? <ChevronUp className="w-4 h-4 text-steel-400" /> : <ChevronDown className="w-4 h-4 text-steel-400" />}
            </button>

            {showResults && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-steel-800">
                    <tr>
                      {['Mark','Category','Section','Grade','Length','Qty','Wt/ft','Total lbs','Conn L','Conn R','Finish','Conf'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-steel-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mergedResult.structuralMembers.map((m, i) => (
                      <tr key={i} className={`border-t border-steel-800 ${toNum(m.confidence) < 0.7 ? 'bg-yellow-500/5' : ''}`}>
                        <td className="px-3 py-2 font-medium text-white">{m.mark}</td>
                        <td className="px-3 py-2 text-steel-300">{m.category}</td>
                        <td className="px-3 py-2 text-fire-400 font-mono">{m.section}</td>
                        <td className="px-3 py-2 text-steel-300">{m.grade}</td>
                        <td className="px-3 py-2 text-steel-300">{m.length_ft}'</td>
                        <td className="px-3 py-2 text-white font-medium">{m.qty}</td>
                        <td className="px-3 py-2 text-steel-300">{m.weight_per_ft}</td>
                        <td className="px-3 py-2 text-white font-medium">{toNum(m.total_weight_lbs).toLocaleString()}</td>
                        <td className="px-3 py-2 text-steel-400">{m.connection_left}</td>
                        <td className="px-3 py-2 text-steel-400">{m.connection_right}</td>
                        <td className="px-3 py-2 text-steel-400">{m.finish}</td>
                        <td className={`px-3 py-2 font-medium ${confColor(toNum(m.confidence))}`}>
                          {(toNum(m.confidence) * 100).toFixed(0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Warnings */}
          {mergedResult.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Warnings ({mergedResult.warnings.length})
              </h4>
              <ul className="space-y-1">
                {mergedResult.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-yellow-300">--- {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={applyToTakeoff}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition shadow-lg shadow-green-600/20"
            >
              <CheckCircle className="w-4 h-4" />
              Apply to Takeoff ({mergedResult.memberCount} struct + {mergedResult.miscCount} misc)
            </button>

            <button
              onClick={() => { setFiles([]); setPages([]); setResults([]); setMergedResult(null); setShowResults(false) }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-steel-600 text-steel-400 hover:text-white text-sm transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
