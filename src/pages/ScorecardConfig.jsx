import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sliders, ArrowLeft, RotateCcw, Save, Info } from 'lucide-react'
import { useProject } from '../context/ProjectContext'

const DEFAULT_CONFIG = {
  marginFloorPct: 5,
  goThreshold: 70,
  maybeThreshold: 45,
  downturnMode: true,
}

const SCORECARD_INFO = [
  { id: 'tipoTrabajo', label: 'Tipo de trabajo', maxDefault: 20, eliminatory: true,
    desc: 'Whether the scope is in TW sweet spot (joist reinforcement, RTU, mezzanines, structural steel)' },
  { id: 'valorProyecto', label: 'Valor del proyecto', maxDefault: 17, eliminatory: true,
    desc: 'TW scope falls within $25K-$300K manageable window' },
  { id: 'listaBidders', label: 'Lista de bidders', maxDefault: 20, eliminatory: true,
    desc: 'List of GCs bidding the prime — coverage capability (the strongest signal)' },
  { id: 'cliente', label: 'Cliente y relación', maxDefault: 18, eliminatory: false,
    desc: 'GC relationship strength + procurement type' },
  { id: 'drawings', label: 'Drawings y specs', maxDefault: 13, eliminatory: true,
    desc: 'Enough technical info available to bid responsibly' },
  { id: 'timing', label: 'Timing y capacidad', maxDefault: 12, eliminatory: false,
    desc: 'TW can meet schedule with current shop capacity' },
]

export default function ScorecardConfig() {
  const { state, dispatch } = useProject()
  const config = state.tenderRadar?.config || DEFAULT_CONFIG

  const [draft, setDraft] = useState(config)
  const dirty = JSON.stringify(draft) !== JSON.stringify(config)

  const update = (changes) => setDraft((prev) => ({ ...prev, ...changes }))

  const handleSave = () => {
    dispatch({ type: 'SET_TR_CONFIG', payload: draft })
  }

  const handleReset = () => {
    setDraft(DEFAULT_CONFIG)
  }

  const totalPossible = SCORECARD_INFO.reduce((s, c) => s + c.maxDefault, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/tenders/inbox" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sliders size={24} className="text-fire-400" /> Scorecard Config
            </h1>
            <p className="text-steel-400 text-sm mt-1">
              Bid scoring weights · Verdict thresholds · Margin floor · Downturn mode
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded flex items-center gap-2"
          >
            <RotateCcw size={16} /> Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="px-3 py-2 bg-fire-600 hover:bg-fire-500 disabled:bg-steel-700 disabled:cursor-not-allowed text-white text-sm rounded flex items-center gap-2"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      {/* Scorecard categories — read-only reference */}
      <div className="bg-steel-800 border border-steel-700 rounded p-4">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Info size={18} className="text-blue-400" /> Bid Scorecard Categories (100 pts total)
        </h2>
        <p className="text-xs text-steel-400 mb-4">
          The 6 categories and their max points are fixed (matches the existing tender-management skill scorecard).
          Eliminatory rules: scoring 0 in any eliminatory field triggers ⛔ NO COTIZAR regardless of total.
        </p>
        <div className="space-y-2">
          {SCORECARD_INFO.map((cat) => (
            <div key={cat.id} className="bg-steel-900 border border-steel-700 rounded p-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  {cat.label}
                  {cat.eliminatory && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700">
                      ⚠ ELIMINATORY
                    </span>
                  )}
                </div>
                <div className="text-xs text-steel-400 mt-0.5">{cat.desc}</div>
              </div>
              <div className="text-right">
                <div className="text-fire-300 font-bold text-lg">{cat.maxDefault}</div>
                <div className="text-xs text-steel-500">max pts</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-steel-700 flex justify-between items-center">
          <span className="text-sm text-steel-300">Total possible</span>
          <span className="text-fire-300 font-bold">{totalPossible} pts</span>
        </div>
      </div>

      {/* Verdict thresholds */}
      <div className="bg-steel-800 border border-steel-700 rounded p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Verdict Thresholds</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-steel-400 mb-1">
                ✅ GO threshold (score &ge; this)
              </label>
              <input
                type="number"
                value={draft.goThreshold}
                onChange={(e) => update({ goThreshold: Number(e.target.value) || 0 })}
                min={0}
                max={100}
                className="w-full bg-steel-900 text-white border border-steel-700 px-2 py-1.5 rounded"
              />
              <p className="text-xs text-green-300 mt-1">
                Tenders ≥ {draft.goThreshold} = assign to Sebastián this week
              </p>
            </div>
            <div>
              <label className="block text-xs text-steel-400 mb-1">
                ⚠️ MAYBE threshold (score &ge; this, &lt; GO)
              </label>
              <input
                type="number"
                value={draft.maybeThreshold}
                onChange={(e) => update({ maybeThreshold: Number(e.target.value) || 0 })}
                min={0}
                max={100}
                className="w-full bg-steel-900 text-white border border-steel-700 px-2 py-1.5 rounded"
              />
              <p className="text-xs text-yellow-300 mt-1">
                {draft.maybeThreshold} - {draft.goThreshold - 1} = quote only if capacity available
              </p>
            </div>
          </div>
          <div className="bg-steel-900 border border-steel-700 rounded p-3 text-xs text-steel-400">
            Score &lt; {draft.maybeThreshold} = ❌ NO (skip — better opportunities exist).
            Any eliminatory field at 0 = ⛔ NO COTIZAR regardless of total.
          </div>
        </div>
      </div>

      {/* Margin Floor */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-4">
        <h2 className="text-lg font-semibold text-yellow-100 mb-3 flex items-center gap-2">
          🚫 Margin Floor Enforcement
        </h2>
        <p className="text-xs text-yellow-200 mb-3">
          Hard floor below which the system should refuse to submit a bid. Senior estimator rule:
          when lowballers go 30% below sustainable margins, they fail in 12-18 months.
          Don't follow them down.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-yellow-300 mb-1">
              Minimum overhead % above cost
            </label>
            <input
              type="number"
              value={draft.marginFloorPct}
              onChange={(e) => update({ marginFloorPct: Number(e.target.value) || 0 })}
              min={0}
              max={50}
              step={0.5}
              className="w-full bg-yellow-900/30 text-yellow-100 border border-yellow-700 px-2 py-1.5 rounded"
            />
            <p className="text-xs text-yellow-200 mt-1">
              Floor price = (material + labor + equipment) × (1 + {draft.marginFloorPct}%)
            </p>
          </div>
          <div className="flex items-start gap-2 pt-5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.downturnMode}
                onChange={(e) => update({ downturnMode: e.target.checked })}
                className="accent-yellow-500"
              />
              <span className="text-yellow-100">Downturn Mode active</span>
            </label>
          </div>
        </div>
        <p className="text-xs text-yellow-300/80 mt-3">
          When Downturn Mode is on, the Inbox shows the warning banner and walk-aways are encouraged
          for lowballer-dominated bids.
        </p>
      </div>

      {/* Senior Estimator Rules — informational */}
      <div className="bg-steel-800 border border-steel-700 rounded p-4">
        <h2 className="text-lg font-semibold text-white mb-3">5 Hard Operational Rules</h2>
        <div className="space-y-2 text-sm">
          <RuleItem n={1}>Don't compete with lowballers &gt;25% below your floor — walk away strategically.</RuleItem>
          <RuleItem n={2}>Margin floor inviolable — no submissions below cost + {draft.marginFloorPct}% overhead.</RuleItem>
          <RuleItem n={3}>Backlog quality &gt; quantity — risk-adjusted backlog visible always.</RuleItem>
          <RuleItem n={4}>Cash flow defense first — AR aging &gt; 45 days with a GC = freeze new bids.</RuleItem>
          <RuleItem n={5}>Survive 18 months minimum — every decision evaluated against runway.</RuleItem>
        </div>
      </div>

      {dirty && (
        <div className="sticky bottom-4 bg-fire-900/40 border border-fire-700 rounded p-3 flex items-center justify-between">
          <span className="text-sm text-fire-200">Unsaved changes</span>
          <div className="flex gap-2">
            <button
              onClick={() => setDraft(config)}
              className="px-3 py-1.5 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Scorecard Config
      </div>
    </div>
  )
}

function RuleItem({ n, children }) {
  return (
    <div className="flex items-start gap-3 bg-steel-900 border border-steel-700 rounded p-3">
      <div className="bg-fire-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
        {n}
      </div>
      <div className="text-steel-200">{children}</div>
    </div>
  )
}
