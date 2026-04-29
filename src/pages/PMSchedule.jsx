import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, RefreshCw, Plus, Trash2, ArrowLeft, AlertCircle, DollarSign } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { calcStairs, fmtCurrency } from '../utils/calculations'

/* ─────────── Section labels for Structural Takeoff ─────────── */
const STRUCT_SECTIONS = {
  columns: 'Structural — Columns',
  beams: 'Structural — Beams',
  moment: 'Structural — Moment Connections',
  roofFrames: 'Structural — Roof Opening Frames',
  joists: 'Structural — Joists (OWSJ)',
  joistReinf: 'Structural — Joist Reinforcement',
  bridging: 'Structural — Bridging',
  steelDeck: 'Structural — Steel Deck',
  perimeterAngle: 'Structural — Perimeter Angle',
  kneeBrace: 'Structural — Knee Brace',
  xBracing: 'Structural — X-Bracing',
  lintels: 'Structural — Lintels',
}

const MM_SECTION_LABELS = {
  bollards: 'Misc Metals — Bollards',
  cornerGuardsSS: 'Misc Metals — Corner Guards (SS)',
  cornerGuardsMS: 'Misc Metals — Corner Guards (MS)',
  embedPlates: 'Misc Metals — Embed Plates',
  lintels: 'Misc Metals — Lintels',
  edgeAngles: 'Misc Metals — Edge Angles',
  bumperRails: 'Misc Metals — Bumper Rails',
  wheelStops: 'Misc Metals — Wheel Stops',
  floorPlates: 'Misc Metals — Floor Plates',
  pipeSupports: 'Misc Metals — Pipe Supports',
  anchorBolts: 'Misc Metals — Anchor Bolts',
  equipDunnage: 'Misc Metals — Equip Dunnage',
  architectural: 'Misc Metals — Architectural',
}

/* ─────────── Compute structural totals per section ─────────── */
function structSectionTotal(rows, fabRate, installRate, steelRate) {
  let lbs = 0, fabHrs = 0, instHrs = 0
  rows.forEach((r) => {
    const qty = Number(r.qty) || 0
    const lengthFt = Number(r.lengthFt) || 0
    const wtPerFt = Number(r.wtPerFt) || 0
    const fabPc = Number(r.fabPc) || 0
    const fabCrew = Number(r.fabCrew) || 1
    const instCrew = Number(r.instCrew) || 1
    let l = 0
    if (r.section === 'moment') {
      l = qty * (Number(r.weightLb) || 0)
    } else if (r.section === 'steelDeck') {
      l = qty * wtPerFt
    } else {
      l = qty * lengthFt * wtPerFt
    }
    lbs += l
    if (r.section !== 'steelDeck') {
      fabHrs += fabPc * fabCrew * qty
      instHrs += (Number(r.instPc) || 0) * instCrew * qty
    }
  })
  const matCost = lbs * (Number(steelRate) || 0)
  const fabCost = fabHrs * (Number(fabRate) || 0)
  const instCost = instHrs * (Number(installRate) || 0)
  return { lbs, matCost, fabCost, instCost, total: matCost + fabCost + instCost }
}

/* ─────────── Build SOV lines from project state ─────────── */
function buildLinesFromState(state) {
  const lines = []
  let counter = 1
  const mkId = () => `sov-${counter++}`

  /* Structural — group by section */
  const bySection = {}
  ;(state.structural || []).forEach((r) => {
    if (!bySection[r.section]) bySection[r.section] = []
    bySection[r.section].push(r)
  })
  const fabRate = state.rates?.labourRates?.fabRate || 0
  const installRate = state.rates?.labourRates?.installRate || 0
  const steelRate = state.rates?.materialRates?.find?.((m) => /steel/i.test(m.name))?.rate || 0
  Object.keys(STRUCT_SECTIONS).forEach((secId) => {
    const rows = bySection[secId] || []
    if (rows.length === 0) return
    const t = structSectionTotal(rows, fabRate, installRate, steelRate)
    if (t.total > 0) {
      lines.push({
        id: mkId(),
        category: 'Structural',
        description: STRUCT_SECTIONS[secId],
        scheduledValue: Math.round(t.total),
        previousPercent: 0,
        currentPercent: 0,
      })
    }
  })

  /* Stairs — one line per stair */
  ;(state.stairs || []).forEach((s, idx) => {
    let total = 0
    if (s.totalsCommit && s.totalsCommit.total) {
      total = s.totalsCommit.total
    } else {
      try {
        const c = calcStairs(s, state.rates || {})
        total = (c?.grandTotal) || 0
      } catch (e) { total = 0 }
    }
    if (total > 0) {
      lines.push({
        id: mkId(),
        category: 'Stairs',
        description: `Stairs — Stair ${idx + 1}${s.name ? ` (${s.name})` : ''}`,
        scheduledValue: Math.round(total),
        previousPercent: 0,
        currentPercent: 0,
      })
    }
  })

  /* Ladders */
  ;(state.ladder || []).forEach((l, idx) => {
    const total = l?.totalsCommit?.total || 0
    if (total > 0) {
      lines.push({
        id: mkId(),
        category: 'Ladders',
        description: `Ladder — Ladder ${idx + 1}${l.name ? ` (${l.name})` : ''}`,
        scheduledValue: Math.round(total),
        previousPercent: 0,
        currentPercent: 0,
      })
    }
  })

  /* Railings */
  ;(state.railings || []).forEach((rl, idx) => {
    const total = rl?.totalsCommit?.total || 0
    if (total > 0) {
      lines.push({
        id: mkId(),
        category: 'Railings',
        description: `Railings — Railing ${idx + 1}${rl.name ? ` (${rl.name})` : ''}`,
        scheduledValue: Math.round(total),
        previousPercent: 0,
        currentPercent: 0,
      })
    }
  })

  /* Misc Metals — by subgroup */
  const mmStd = state.miscMetalsStandard || {}
  Object.keys(MM_SECTION_LABELS).forEach((key) => {
    const items = mmStd[key] || []
    let sum = 0
    items.forEach((r) => {
      const qty = Number(r.qty) || 0
      const matEa = Number(r.matEa) || 0
      const fabHrs = Number(r.fabHrs) || 0
      const instHrs = Number(r.instHrs) || 0
      const fabRt = state.rates?.labourRates?.fabRate || 0
      const instRt = state.rates?.labourRates?.installRate || 0
      sum += qty * matEa + fabHrs * qty * fabRt + instHrs * qty * instRt
    })
    if (sum > 0) {
      lines.push({
        id: mkId(),
        category: 'Misc Metals',
        description: MM_SECTION_LABELS[key],
        scheduledValue: Math.round(sum),
        previousPercent: 0,
        currentPercent: 0,
      })
    }
  })

  /* Soft Costs — each non-zero line */
  ;(state.softCosts || []).forEach((r) => {
    const qty = Number(r.qty) || 0
    const rate = Number(r.rate) || 0
    let amt = 0
    if (r.unit === '%') {
      const base = lines.reduce((s, x) => s + x.scheduledValue, 0)
      amt = (base * rate) / 100
    } else {
      amt = qty * rate
    }
    if (amt > 0) {
      lines.push({
        id: mkId(),
        category: 'Soft Costs',
        description: `Soft Costs — ${r.item}`,
        scheduledValue: Math.round(amt),
        previousPercent: 0,
        currentPercent: 0,
      })
    }
  })

  return lines
}

/* ─────────── Page ─────────── */
export default function PMSchedule() {
  const { state, dispatch } = useProject()
  const sov = state.projectManagement?.sov || { lines: [], retentionPercent: 10, billsToDate: 0 }
  const status = state.projectInfo?.status || 'bidding'
  const isAwarded = status !== 'bidding'

  const [confirmSync, setConfirmSync] = useState(false)

  const lines = sov.lines || []
  const retentionPct = sov.retentionPercent ?? 10

  /* Computed totals across all lines */
  const totals = useMemo(() => {
    let scheduled = 0, billedAmt = 0, balance = 0
    lines.forEach((ln) => {
      const sv = Number(ln.scheduledValue) || 0
      const pp = Number(ln.previousPercent) || 0
      const cp = Number(ln.currentPercent) || 0
      const total = pp + cp
      const billed = (sv * total) / 100
      scheduled += sv
      billedAmt += billed
      balance += sv - billed
    })
    const retention = (billedAmt * retentionPct) / 100
    const netBilled = billedAmt - retention
    return { scheduled, billedAmt, balance, retention, netBilled }
  }, [lines, retentionPct])

  /* Handlers */
  const updateLine = (id, changes) =>
    dispatch({ type: 'UPDATE_SOV_LINE', payload: { id, changes } })
  const deleteLine = (id) => dispatch({ type: 'DELETE_SOV_LINE', payload: { id } })
  const addLine = () =>
    dispatch({
      type: 'ADD_SOV_LINE',
      payload: {
        id: `sov-${Date.now()}`,
        category: 'Custom',
        description: 'New SOV line',
        scheduledValue: 0,
        previousPercent: 0,
        currentPercent: 0,
      },
    })
  const setRetention = (val) =>
    dispatch({ type: 'SET_SOV_RETENTION', payload: { retentionPercent: Number(val) || 0 } })
  const syncFromQuote = () => {
    const built = buildLinesFromState(state)
    dispatch({ type: 'SET_SOV_LINES', payload: { lines: built } })
    setConfirmSync(false)
  }
  const advanceToNextPeriod = () => {
    const updated = lines.map((ln) => ({
      ...ln,
      previousPercent: Math.min(100, (Number(ln.previousPercent) || 0) + (Number(ln.currentPercent) || 0)),
      currentPercent: 0,
    }))
    dispatch({ type: 'SET_SOV_LINES', payload: { lines: updated } })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/pm/dashboard" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText size={24} className="text-fire-400" /> Schedule of Values
            </h1>
            <p className="text-steel-400 text-sm mt-1">Progress billing tracker — AIA G702/G703 style</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addLine}
            className="px-3 py-2 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded flex items-center gap-2"
          >
            <Plus size={16} /> Add Line
          </button>
          <button
            onClick={() => setConfirmSync(true)}
            className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2"
          >
            <RefreshCw size={16} /> Sync from Estimate
          </button>
        </div>
      </div>

      {/* Status banner */}
      {!isAwarded && (
        <div className="bg-fire-900/30 border border-fire-700 rounded p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-fire-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-fire-300">
            Project is still in <strong>Bidding</strong> phase. Set status to <strong>Awarded</strong> on the
            PM Dashboard to begin tracking real progress billing.
          </div>
        </div>
      )}

      {/* Sync confirmation */}
      {confirmSync && (
        <div className="bg-blue-900/30 border border-blue-700 rounded p-4 flex items-center justify-between">
          <div className="text-sm text-blue-200">
            Replace existing SOV lines with values pulled from the current Estimate? Billing progress (% billed)
            will be reset.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmSync(false)}
              className="px-3 py-1.5 bg-steel-700 text-white text-sm rounded"
            >
              Cancel
            </button>
            <button
              onClick={syncFromQuote}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
            >
              Replace Lines
            </button>
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Contract Value" value={fmtCurrency(totals.scheduled)} accent="text-white" />
        <KpiTile label="Billed to Date" value={fmtCurrency(totals.billedAmt)} accent="text-fire-300" />
        <KpiTile
          label={`Retention (${retentionPct}%)`}
          value={fmtCurrency(totals.retention)}
          accent="text-yellow-300"
        />
        <KpiTile label="Net Billed" value={fmtCurrency(totals.netBilled)} accent="text-green-300" />
        <KpiTile label="Balance" value={fmtCurrency(totals.balance)} accent="text-steel-200" />
      </div>

      {/* Retention input + period advance */}
      <div className="bg-steel-800 border border-steel-700 rounded p-3 flex flex-wrap items-center gap-4">
        <label className="text-sm text-steel-300">
          Retention %{' '}
          <input
            type="number"
            value={retentionPct}
            onChange={(e) => setRetention(e.target.value)}
            min={0}
            max={50}
            step={0.5}
            className="w-20 ml-2 bg-steel-900 border border-steel-700 text-white text-sm px-2 py-1 rounded"
          />
        </label>
        <button
          onClick={advanceToNextPeriod}
          className="px-3 py-1.5 bg-steel-700 hover:bg-steel-600 text-white text-sm rounded ml-auto"
          title="Roll This Period % into Previous %, reset This Period to 0"
        >
          Close Period → Roll This Period into Previous
        </button>
      </div>

      {/* SOV Table */}
      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right">Scheduled Value</th>
              <th className="px-3 py-2 text-right">Previous %</th>
              <th className="px-3 py-2 text-right">This Period %</th>
              <th className="px-3 py-2 text-right">Total %</th>
              <th className="px-3 py-2 text-right">Billed $</th>
              <th className="px-3 py-2 text-right">Balance</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-steel-500">
                  No SOV lines yet. Click <strong className="text-fire-400">Sync from Estimate</strong> to
                  auto-populate from your quote, or <strong className="text-white">Add Line</strong> to create
                  one manually.
                </td>
              </tr>
            ) : (
              lines.map((ln, idx) => {
                const sv = Number(ln.scheduledValue) || 0
                const pp = Number(ln.previousPercent) || 0
                const cp = Number(ln.currentPercent) || 0
                const total = pp + cp
                const billed = (sv * total) / 100
                const bal = sv - billed
                return (
                  <tr key={ln.id} className="border-t border-steel-700">
                    <td className="px-3 py-1.5 text-steel-500">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <input
                        value={ln.description}
                        onChange={(e) => updateLine(ln.id, { description: e.target.value })}
                        className="w-full bg-transparent text-white border-none focus:bg-steel-900 px-2 py-1 rounded"
                      />
                      <div className="text-xs text-steel-500 px-2">{ln.category}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={ln.scheduledValue}
                        onChange={(e) =>
                          updateLine(ln.id, { scheduledValue: Number(e.target.value) || 0 })
                        }
                        className="w-28 text-right bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={ln.previousPercent}
                        onChange={(e) =>
                          updateLine(ln.id, { previousPercent: Number(e.target.value) || 0 })
                        }
                        min={0}
                        max={100}
                        step={1}
                        className="w-16 text-right bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <input
                        type="number"
                        value={ln.currentPercent}
                        onChange={(e) =>
                          updateLine(ln.id, { currentPercent: Number(e.target.value) || 0 })
                        }
                        min={0}
                        max={100}
                        step={1}
                        className="w-16 text-right bg-fire-900/40 text-white border border-fire-700 px-2 py-1 rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right text-steel-300">{total.toFixed(1)}%</td>
                    <td className="px-3 py-1.5 text-right text-fire-300">{fmtCurrency(billed)}</td>
                    <td className="px-3 py-1.5 text-right text-steel-300">{fmtCurrency(bal)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => deleteLine(ln.id)}
                        className="text-steel-500 hover:text-red-400"
                        title="Delete line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot className="bg-steel-900 text-white font-semibold">
              <tr className="border-t-2 border-steel-600">
                <td colSpan={2} className="px-3 py-2 text-right">
                  GRAND TOTAL
                </td>
                <td className="px-3 py-2 text-right">{fmtCurrency(totals.scheduled)}</td>
                <td colSpan={2}></td>
                <td className="px-3 py-2 text-right text-steel-300">
                  {totals.scheduled > 0 ? ((totals.billedAmt / totals.scheduled) * 100).toFixed(1) : '0.0'}%
                </td>
                <td className="px-3 py-2 text-right text-fire-300">{fmtCurrency(totals.billedAmt)}</td>
                <td className="px-3 py-2 text-right text-steel-300">{fmtCurrency(totals.balance)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Payment summary card */}
      {lines.length > 0 && (
        <div className="bg-steel-800 border border-steel-700 rounded p-4">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-green-400" /> Current Period Payment Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <SummaryRow label="Billed This Period (Gross)" value={totals.billedAmt} />
            <SummaryRow label={`Less Retention (${retentionPct}%)`} value={-totals.retention} negative />
            <SummaryRow label="Net Payment Due" value={totals.netBilled} highlight />
            <SummaryRow label="Remaining Balance" value={totals.balance} />
          </div>
        </div>
      )}

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Schedule of Values
      </div>
    </div>
  )
}

/* ─────────── Sub-components ─────────── */
function KpiTile({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-steel-800 border border-steel-700 rounded p-3">
      <div className="text-xs text-steel-400 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  )
}

function SummaryRow({ label, value, negative = false, highlight = false }) {
  return (
    <div className={`p-2 rounded ${highlight ? 'bg-green-900/30 border border-green-700' : 'bg-steel-900'}`}>
      <div className="text-xs text-steel-400">{label}</div>
      <div
        className={`text-base font-semibold mt-0.5 ${
          highlight ? 'text-green-300' : negative ? 'text-yellow-300' : 'text-white'
        }`}
      >
        {fmtCurrency(value)}
      </div>
    </div>
  )
}
