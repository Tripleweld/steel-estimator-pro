import { useState, useCallback, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import { Upload, FileText, Zap, AlertTriangle, CheckCircle, Loader2, Settings, Brain, Eye, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

/* ── helpers ─────────────────────────────────────────────────── */
const toNum = v => { const n = Number(v); return isNaN(n) ? 0 : n; }

/* ── AI Provider configs ──────────────────────────────────────── */
const PROVIDERS = {
  gemini: { name: 'Gemini 1.5 Flash (Free)', model: 'gemini-1.5-flash', urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  gemini_pro: { name: 'Gemini 1.5 Pro', model: 'gemini-1.5-pro', urlBase: 'https://generativelanguage.googleapis.com/v1beta/models/' },
  claude: { name: 'Claude 3.5 Sonnet', model: 'claude-3-5-sonnet-20241022', urlBase: 'https://api.anthropic.com/v1/messages' },
  gpt4o: { name: 'GPT-4o', model: 'gpt-4o', urlBase: 'https://api.openai.com/v1/chat/completions' },
}

/* ── STEEL EXPERT PROMPT ──────────────────────────────────────── */
const STEEL_EXPERT_PROMPT = `You are a Senior Steel Estimator with 25+ years of experience in structural and miscellaneous steel fabrication & erection in Ontario, Canada. You have CWB W47.1 certification and deep knowledge of CSA S16, CSA G40.21, and the Ontario Building Code.

TASK: Analyze this structural drawing page and extract ALL steel members and miscellaneous metals visible. Return a JSON object with the extracted data.

EXTRACTION RULES:
1. STRUCTURAL STEEL — Look for:
   - Beam schedules (tables listing beam marks, sizes, lengths)
   - Column schedules (tables listing column marks, sizes, heights)
   - Framing plan marks (B1, B2, C1, C2, W1, etc. on plan views)
   - HSS members, bracing, plates
   - Member sizes in Canadian/Imperial format (W310x45, W250x33, HSS152x152x8, L76x76x6, etc.)
   - Spans/lengths from gridline dimensions or noted dimensions
   - Connection types (simple shear, moment, braced frame)
   - Steel grade notes (G40.21 300W, 350W, 350WT)
   - Surface treatment notes (galvanized, shop primer, painted)

2. MISCELLANEOUS METALS — Look for:
   - Stairs (steel pan, concrete filled, checker plate)
   - Railings/handrails (pipe rail, glass, cable)
   - Ladders (fixed, cage, ship's ladder)
   - Lintels (loose, embedded)
   - Embed plates, anchor bolts
   - Bollards, posts
   - Grating, platforms, catwalks
   - Steel deck type and gauge

3. STRUCTURAL NOTES — Extract:
   - Design loads (live, dead, snow, wind, seismic)
   - Deflection criteria
   - Inspection requirements
   - Special provisions

4. QUANTITIES — For each member:
   - Count duplicates (e.g., if B1 appears 6 times on plan, qty=6)
   - Measure or estimate lengths from gridline spacing
   - Calculate weight using AISC/CISC tables (W310x45 = 45 kg/m = 30.2 lb/ft)

OUTPUT FORMAT — Return ONLY valid JSON, no markdown:
{
  "pageType": "framing_plan|beam_schedule|column_schedule|elevation|section|detail|notes|spec|other",
  "pageDescription": "Brief description of what this page shows",
  "structuralMembers": [
    {
      "mark": "B1",
      "category": "beam|column|brace|hss|plate|joist|other",
      "section": "W310x45",
      "grade": "300W",
      "length_ft": 25.0,
      "qty": 4,
      "weight_per_ft": 30.2,
      "total_weight_lbs": 3020,
      "connection_left": "simple",
      "connection_right": "simple",
      "elevation": "2nd Floor",
      "finish": "shop primer",
      "notes": "TYP at grid A",
      "confidence": 0.95
    }
  ],
  "miscMetals": [
    {
      "item": "Stair ST-1",
      "type": "stair|railing|ladder|lintel|embed|bollard|grating|platform|other",
      "description": "Steel pan stair, 4'-0\" wide, floor to floor",
      "qty": 1,
      "unit": "ea|lf|sf|lbs",
      "dimensions": "4'-0\" wide x 12'-0\" rise",
      "finish": "galvanized",
      "estimated_weight_lbs": 1500,
      "confidence": 0.80
    }
  ],
  "specs": {
    "steelGrade": "G40.21 300W/350W",
    "boltType": "A325",
    "weldStandard": "CSA W59",
    "surfaceTreatment": "Shop primer per SSPC-SP6",
    "inspection": "CWB certified, visual + UT on CJP welds",
    "fireproofing": "By others",
    "notes": []
  },
  "gridDimensions": {
    "description": "Grid spacing extracted from plan",
    "grids": [{"name": "A-B", "spacing_ft": 25}, {"name": "B-C", "spacing_ft": 30}]
  },
  "warnings": ["Could not read mark at grid D-3, partially obscured"],
  "overallConfidence": 0.88
}

IMPORTANT:
- If you cannot read a value clearly, set confidence < 0.7 and add to warnings
- Use imperial units (ft, lbs) — this is Ontario/Canadian construction
- For CISC shapes, convert to imperial lb/ft weights
- If a schedule table is present, extract ALL rows
- Cross-reference plan marks with schedule data when both are visible
- Estimate connection weight allowance at 8-12% of member weight
- Flag any items that seem unusual or may need RFI`

/* ── Markup overlay prompt ────────────────────────────────────── */
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

/* ── PDF to images using pdf.js ───────────────────────────────── */
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

/* ── Gemini API call ──────────────────────────────────────────── */
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

/* ── MAIN COMPONENT ──────────────────────────────────────────── */
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
        const base64 = await pdfPageToBase64(page.pdfDoc, page.pageNum, 2.0)

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

  /* ── Confidence color ──────────────────────────────────────── */
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
            Upload structural drawings & specs — AI extracts quantities automatically
          </p>
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
              Get your free API key at <span className="text-fire-400">ai.google.dev/aistudio</span> — 1,500 free requests/day
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
          {files.length ? `${files.length} PDF(s) loaded — ${pages.length} pages` : 'Drop PDF drawings here'}
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
              disabled={processing || !apiKey}
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
                  Run AI Takeoff ({pages.filter(p => p.selected).length} pages)
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
                  <li key={i} className="text-xs text-yellow-300">• {w}</li>
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
