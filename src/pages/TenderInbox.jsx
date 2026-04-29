import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Radar, Plus, Trash2, Edit3, AlertCircle, CheckCircle, XCircle,
  TrendingDown, TrendingUp, Filter, ArrowUpDown, ExternalLink,
} from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { fmtCurrency } from '../utils/calculations'

/* ─────────── Scorecard config (from skill) ─────────── */
const SCORECARD_CATEGORIES = [
  {
    id: 'tipoTrabajo',
    label: 'Tipo de trabajo',
    max: 20,
    eliminatory: true,
    options: [
      { score: 20, label: 'Joist reinf, RTU, mezzanine, rooftop platform' },
      { score: 13, label: 'Structural steel or industrial platforms' },
      { score: 6, label: 'Stairs, railings, or misc metals' },
      { score: 0, label: 'Out of scope (NOT steel/metals)' },
    ],
  },
  {
    id: 'valorProyecto',
    label: 'Valor del proyecto',
    max: 17,
    eliminatory: true,
    options: [
      { score: 17, label: '$80K - $200K (sweet spot)' },
      { score: 12, label: '$50K - $80K' },
      { score: 9, label: '$200K - $300K' },
      { score: 4, label: '$25K - $50K' },
      { score: 0, label: '<$25K or >$300K (eliminatory)' },
    ],
  },
  {
    id: 'listaBidders',
    label: 'Lista de bidders (GCs bidding prime)',
    max: 20,
    eliminatory: true,
    options: [
      { score: 20, label: 'Complete list — can quote ALL bidding GCs' },
      { score: 10, label: 'Partial list — can quote some' },
      { score: 0, label: 'Unknown — blind quoting (eliminatory)' },
    ],
  },
  {
    id: 'cliente',
    label: 'Cliente y relación',
    max: 18,
    eliminatory: false,
    options: [
      { score: 18, label: 'Direct owner / engineer (negotiated)' },
      { score: 14, label: 'Known GC — worked with them before' },
      { score: 8, label: 'New GC with good reputation' },
      { score: 3, label: 'Unknown GC, public mass tender' },
    ],
  },
  {
    id: 'drawings',
    label: 'Drawings y specs',
    max: 13,
    eliminatory: true,
    options: [
      { score: 13, label: 'Complete drawings + detailed specs' },
      { score: 8, label: 'Partial drawings, basic specs' },
      { score: 2, label: 'Verbal/conceptual only' },
      { score: 0, label: 'Not enough info (eliminatory)' },
    ],
  },
  {
    id: 'timing',
    label: 'Timing y capacidad',
    max: 12,
    eliminatory: false,
    options: [
      { score: 12, label: 'Comfortable — no problem' },
      { score: 7, label: 'Tight but manageable' },
      { score: 1, label: 'Very tight — high risk' },
    ],
  },
]

/* ─────────── Status / Verdict styling ─────────── */
const STATUS_OPTIONS = [
  { id: 'NEW', label: 'NEW', color: 'bg-green-700/40 text-green-200 border-green-700' },
  { id: 'REVIEWING', label: 'REVIEWING', color: 'bg-blue-700/40 text-blue-200 border-blue-700' },
  { id: 'ESTIMATING', label: 'ESTIMATING', color: 'bg-fire-700/40 text-fire-200 border-fire-700' },
  { id: 'SUBMITTED', label: 'SUBMITTED', color: 'bg-purple-700/40 text-purple-200 border-purple-700' },
  { id: 'AWARDED', label: 'AWARDED', color: 'bg-green-600/60 text-green-100 border-green-600' },
  { id: 'LOST', label: 'LOST', color: 'bg-red-700/40 text-red-200 border-red-700' },
  { id: 'NO_BID', label: 'NO BID (Walk Away)', color: 'bg-yellow-700/40 text-yellow-200 border-yellow-700' },
  { id: 'CLOSED', label: 'CLOSED', color: 'bg-steel-700 text-steel-300 border-steel-600' },
]

const VERDICT_STYLES = {
  GO: { color: 'text-green-300', bg: 'bg-green-900/30', icon: CheckCircle, label: '✅ GO' },
  MAYBE: { color: 'text-yellow-300', bg: 'bg-yellow-900/30', icon: AlertCircle, label: '⚠️ MAYBE' },
  NO: { color: 'text-red-300', bg: 'bg-red-900/30', icon: XCircle, label: '❌ NO' },
  ELIMINADO: { color: 'text-red-400', bg: 'bg-red-900/50', icon: XCircle, label: '⛔ ELIMINADO' },
  PENDING: { color: 'text-steel-300', bg: 'bg-steel-800', icon: AlertCircle, label: '⏳ PENDING' },
}

const WALK_AWAY_REASONS = [
  'Capacity — backlog full',
  'Margin Protection — irrational pricing',
  'Schedule — cannot meet timeline',
  'Spec Mismatch — out of scope',
  'GC History — bid shopper',
  'Lead Time — too short notice',
  'Other',
]

/* ─────────── Helpers ─────────── */
function calcScore(scoreObj) {
  let total = 0
  let eliminated = false
  SCORECARD_CATEGORIES.forEach((cat) => {
    const v = Number(scoreObj?.[cat.id] ?? -1)
    if (v < 0) return
    total += v
    if (cat.eliminatory && v === 0) eliminated = true
  })
  return { total, eliminated }
}

function calcVerdict(scoreObj, status) {
  if (status === 'NO_BID') return 'NO'
  if (!scoreObj) return 'PENDING'
  const { total, eliminated } = calcScore(scoreObj)
  if (eliminated) return 'ELIMINADO'
  if (total >= 70) return 'GO'
  if (total >= 45) return 'MAYBE'
  return 'NO'
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24))
}

function urgencyClass(days) {
  if (days === null) return ''
  if (days <= 1) return 'text-red-400 font-bold'
  if (days <= 3) return 'text-fire-300'
  if (days <= 7) return 'text-yellow-300'
  return 'text-steel-300'
}

/* ─────────── Page ─────────── */
export default function TenderInbox() {
  const { state, dispatch } = useProject()
  const tenders = state.tenderRadar?.tenders || []
  const gcDirectory = state.tenderRadar?.gcDirectory || []
  const config = state.tenderRadar?.config || { marginFloorPct: 5, goThreshold: 70, maybeThreshold: 45 }

  const [filterVerdict, setFilterVerdict] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  /* Filter + sort */
  const visible = useMemo(() => {
    return tenders
      .filter((t) => {
        if (filterVerdict !== 'all' && t.verdict !== filterVerdict) return false
        if (filterStatus === 'active' && ['CLOSED', 'AWARDED', 'LOST'].includes(t.status)) return false
        if (filterStatus !== 'active' && filterStatus !== 'all' && t.status !== filterStatus) return false
        if (search && !`${t.projectName} ${t.gc} ${t.location}`.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        // Verdict order: GO > MAYBE > PENDING > NO > ELIMINADO
        const order = { GO: 1, MAYBE: 2, PENDING: 3, NO: 4, ELIMINADO: 5 }
        const va = order[a.verdict] || 9
        const vb = order[b.verdict] || 9
        if (va !== vb) return va - vb
        // Then by closing date
        return (a.closingDate || '').localeCompare(b.closingDate || '')
      })
  }, [tenders, filterVerdict, filterStatus, search])

  const summary = useMemo(() => {
    const go = tenders.filter((t) => t.verdict === 'GO' && !['CLOSED', 'AWARDED', 'LOST'].includes(t.status)).length
    const maybe = tenders.filter((t) => t.verdict === 'MAYBE' && !['CLOSED', 'AWARDED', 'LOST'].includes(t.status)).length
    const closingSoon = tenders.filter((t) => {
      const d = daysUntil(t.closingDate)
      return d !== null && d >= 0 && d <= 3 && !['CLOSED', 'AWARDED', 'LOST', 'NO_BID'].includes(t.status)
    }).length
    const walkAways = tenders.filter((t) => t.status === 'NO_BID').length
    const submitted = tenders.filter((t) => t.status === 'SUBMITTED').length
    const won = tenders.filter((t) => t.status === 'AWARDED').length
    const lost = tenders.filter((t) => t.status === 'LOST').length
    const winRate = (won + lost) > 0 ? (won / (won + lost)) * 100 : 0
    return { go, maybe, closingSoon, walkAways, submitted, won, lost, winRate }
  }, [tenders])

  const handleSave = (tender) => {
    const score = calcScore(tender.score)
    const finalTender = {
      ...tender,
      totalScore: score.total,
      verdict: calcVerdict(tender.score, tender.status),
      updatedAt: new Date().toISOString(),
    }
    if (tender.id) {
      dispatch({ type: 'UPDATE_TENDER', payload: { id: tender.id, changes: finalTender } })
    } else {
      finalTender.id = `tdr-${Date.now()}`
      finalTender.createdAt = new Date().toISOString()
      dispatch({ type: 'ADD_TENDER', payload: finalTender })
    }
    setShowForm(false)
    setEditingId(null)
  }

  const handleDelete = (id) => {
    if (confirm('Delete this tender?')) dispatch({ type: 'DELETE_TENDER', payload: { id } })
  }

  const editing = editingId ? tenders.find((t) => t.id === editingId) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radar size={24} className="text-fire-400" /> TenderRadar — Inbox
          </h1>
          <p className="text-steel-400 text-sm mt-1">
            Bid pipeline · GC coverage strategy · Downturn-aware scoring
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2"
        >
          <Plus size={16} /> New Tender
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiTile label="🟢 GO" value={summary.go} accent="text-green-300" />
        <KpiTile label="🟡 MAYBE" value={summary.maybe} accent="text-yellow-300" />
        <KpiTile label="⏰ Closing ≤3d" value={summary.closingSoon} accent="text-fire-300" />
        <KpiTile label="🚫 Walk-Aways" value={summary.walkAways} accent="text-yellow-200" />
        <KpiTile label="📤 Submitted" value={summary.submitted} accent="text-purple-300" />
        <KpiTile label="🏆 Won" value={summary.won} accent="text-green-300" />
        <KpiTile label="📊 Win Rate" value={`${summary.winRate.toFixed(0)}%`} accent="text-blue-300" />
      </div>

      {/* Downturn banner */}
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3 flex items-start gap-3">
        <TrendingDown size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-100">
          <strong>Downturn Mode Active.</strong> Margin floor enforced at cost + {config.marginFloorPct}% overhead.
          Walk away from lowballer-dominated bids — survival over volume. Lowballers will fail in 12-18 months.
        </div>
      </div>

      {/* Filters */}
      <div className="bg-steel-800 border border-steel-700 rounded p-3 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-steel-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project / GC / location"
          className="flex-1 min-w-[200px] bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-sm"
        />
        <label className="text-xs text-steel-400">
          Verdict:{' '}
          <select
            value={filterVerdict}
            onChange={(e) => setFilterVerdict(e.target.value)}
            className="ml-1 bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-xs"
          >
            <option value="all">All</option>
            <option value="GO">GO</option>
            <option value="MAYBE">MAYBE</option>
            <option value="NO">NO</option>
            <option value="ELIMINADO">ELIMINADO</option>
            <option value="PENDING">PENDING</option>
          </select>
        </label>
        <label className="text-xs text-steel-400">
          Status:{' '}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ml-1 bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-xs"
          >
            <option value="active">Active only</option>
            <option value="all">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <span className="ml-auto text-xs text-steel-500">{visible.length} of {tenders.length} shown</span>
      </div>

      {/* Tenders Table */}
      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-2 py-2 text-left">Project</th>
              <th className="px-2 py-2 text-left">GC</th>
              <th className="px-2 py-2 text-left">Closing</th>
              <th className="px-2 py-2 text-center">Score</th>
              <th className="px-2 py-2 text-center">Verdict</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-center">Bidders</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-steel-500">
                  {tenders.length === 0
                    ? <>No tenders yet. Click <strong className="text-fire-400">New Tender</strong> to add the first one manually. Email sweep coming in Sesión 2.</>
                    : 'No tenders match the current filters.'}
                </td>
              </tr>
            ) : (
              visible.map((t) => {
                const days = daysUntil(t.closingDate)
                const verdict = VERDICT_STYLES[t.verdict] || VERDICT_STYLES.PENDING
                const sm = STATUS_OPTIONS.find((s) => s.id === t.status) || STATUS_OPTIONS[0]
                const biddersCount = (t.biddersList || []).length
                return (
                  <tr key={t.id} className="border-t border-steel-700 hover:bg-steel-700/30">
                    <td className="px-2 py-2">
                      <div className="text-white font-semibold">{t.projectName || '(unnamed)'}</div>
                      <div className="text-xs text-steel-400">{t.location}</div>
                    </td>
                    <td className="px-2 py-2 text-steel-200">{t.gc}</td>
                    <td className="px-2 py-2">
                      <div className="text-steel-200">{t.closingDate} {t.closingTime}</div>
                      {days !== null && (
                        <div className={`text-xs ${urgencyClass(days)}`}>
                          {days < 0 ? 'Past' : days === 0 ? 'TODAY' : `${days}d`}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`font-bold ${t.totalScore >= 70 ? 'text-green-300' : t.totalScore >= 45 ? 'text-yellow-300' : 'text-red-300'}`}>
                        {t.totalScore || 0}
                      </span>
                      <span className="text-xs text-steel-500">/100</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${verdict.bg} ${verdict.color}`}>
                        {verdict.label}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`text-xs px-2 py-1 rounded border ${sm.color}`}>
                        {sm.label}
                      </span>
                      {t.status === 'NO_BID' && t.walkAwayReason && (
                        <div className="text-xs text-yellow-200 mt-0.5">↳ {t.walkAwayReason}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-steel-300">{biddersCount}</span>
                      {t.biddersConfidence && t.biddersConfidence !== 'UNKNOWN' && (
                        <div className="text-xs text-steel-500">{t.biddersConfidence}</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setEditingId(t.id); setShowForm(true) }}
                          className="text-steel-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-steel-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <TenderForm
          existing={editing}
          gcDirectory={gcDirectory}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingId(null) }}
        />
      )}

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · TenderRadar Module
      </div>
    </div>
  )
}

/* ─────────── Tender Form Modal ─────────── */
function TenderForm({ existing, gcDirectory, onSave, onCancel }) {
  const [t, setT] = useState(
    existing || {
      projectName: '',
      location: '',
      gc: '',
      contactEmail: '',
      type: 'Tender',
      closingDate: '',
      closingTime: '14:00',
      emailSource: 'gustavo@tripleweld.com',
      platform: '',
      status: 'NEW',
      score: {},
      biddersList: [],
      biddersConfidence: 'UNKNOWN',
      bidAmount: 0,
      walkAwayReason: '',
      notes: '',
    }
  )

  const update = (changes) => setT((prev) => ({ ...prev, ...changes }))
  const updateScore = (catId, val) =>
    setT((prev) => ({ ...prev, score: { ...(prev.score || {}), [catId]: Number(val) } }))

  const { total, eliminated } = calcScore(t.score)
  const verdict = calcVerdict(t.score, t.status)
  const verdictStyle = VERDICT_STYLES[verdict] || VERDICT_STYLES.PENDING

  const isWalkAway = t.status === 'NO_BID'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-10">
      <div className="bg-steel-900 border border-steel-700 rounded-lg w-full max-w-4xl mx-4">
        <div className="bg-steel-800 px-5 py-3 border-b border-steel-700 flex items-center justify-between sticky top-0">
          <h2 className="text-lg font-bold text-white">
            {existing ? 'Edit Tender' : 'New Tender'}
          </h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm px-3 py-1 rounded ${verdictStyle.bg} ${verdictStyle.color}`}>
              {verdictStyle.label} — {total}/100
            </span>
            <button onClick={onCancel} className="text-steel-400 hover:text-white">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Basic Info */}
          <Section title="Basic Info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Project Name *">
                <input
                  value={t.projectName}
                  onChange={(e) => update({ projectName: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                  placeholder="e.g. LAmoreaux Tennis Centre"
                />
              </Field>
              <Field label="Location">
                <input
                  value={t.location}
                  onChange={(e) => update({ location: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                  placeholder="City / Address"
                />
              </Field>
              <Field label="General Contractor *">
                <input
                  list="gc-list"
                  value={t.gc}
                  onChange={(e) => update({ gc: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                  placeholder="Type or select GC"
                />
                <datalist id="gc-list">
                  {gcDirectory.map((g) => <option key={g.id} value={g.name} />)}
                </datalist>
              </Field>
              <Field label="Contact Email">
                <input
                  type="email"
                  value={t.contactEmail}
                  onChange={(e) => update({ contactEmail: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                />
              </Field>
              <Field label="Type">
                <select
                  value={t.type}
                  onChange={(e) => update({ type: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                >
                  {['Tender', 'RFQ', 'RFT', 'Bid Invite', 'Addendum', 'RFI'].map((x) =>
                    <option key={x}>{x}</option>
                  )}
                </select>
              </Field>
              <Field label="Email Source">
                <select
                  value={t.emailSource}
                  onChange={(e) => update({ emailSource: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                >
                  <option>gustavo@tripleweld.com</option>
                  <option>info@tripleweld.com</option>
                  <option>era.ornamental@gmail.com</option>
                  <option>Direct / In Person</option>
                  <option>Public Portal</option>
                </select>
              </Field>
              <Field label="Closing Date">
                <input
                  type="date"
                  value={t.closingDate}
                  onChange={(e) => update({ closingDate: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                />
              </Field>
              <Field label="Closing Time">
                <input
                  type="time"
                  value={t.closingTime}
                  onChange={(e) => update({ closingTime: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                />
              </Field>
              <Field label="Platform / Portal">
                <input
                  value={t.platform}
                  onChange={(e) => update({ platform: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                  placeholder="BuilderTrend / Invitely / SmartBuildBids / Direct"
                />
              </Field>
              <Field label="Status">
                <select
                  value={t.status}
                  onChange={(e) => update({ status: e.target.value })}
                  className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Walk-Away Reason */}
          {isWalkAway && (
            <Section title="🚫 Walk-Away Reason">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Reason">
                  <select
                    value={t.walkAwayReason}
                    onChange={(e) => update({ walkAwayReason: e.target.value })}
                    className="w-full bg-yellow-900/30 text-yellow-100 border border-yellow-700 px-2 py-1.5 rounded"
                  >
                    <option value="">— Select —</option>
                             {WALK_AWAY_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <p className="text-xs text-yellow-300 mt-2">
                Walk-aways are tracked separately. After 30 days of data, you'll see how many of those went to known lowballers — vindicating the discipline.
              </p>
            </Section>
          )}

          {/* Scorecard */}
          {!isWalkAway && (
            <Section title="📊 Bid Scorecard (6 categories, 100 pts)">
              {eliminated && (
                <div className="bg-red-900/40 border border-red-700 rounded p-3 mb-3 text-sm text-red-200">
                  ⛔ <strong>ELIMINATORY field hit zero.</strong> Verdict will be NO COTIZAR regardless of total score.
                </div>
              )}
              <div className="space-y-3">
                {SCORECARD_CATEGORIES.map((cat) => {
                  const current = t.score?.[cat.id]
                  return (
                    <div key={cat.id} className="bg-steel-800 border border-steel-700 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-white">
                          {cat.label}
                          {cat.eliminatory && <span className="ml-2 text-xs text-red-400">⚠ ELIMINATORY</span>}
                        </div>
                        <div className="text-xs text-steel-400">max {cat.max} pts</div>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {cat.options.map((opt) => (
                          <label
                            key={opt.score}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
                              current === opt.score
                                ? 'bg-fire-900/30 border-fire-700'
                                : 'border-steel-700 hover:bg-steel-700/30'
                            }`}
                          >
                            <input
                              type="radio"
                              name={cat.id}
                              checked={current === opt.score}
                              onChange={() => updateScore(cat.id, opt.score)}
                              className="accent-fire-500"
                            />
                            <span className="text-xs font-mono text-fire-300 w-8">{opt.score}</span>
                            <span className="text-sm text-steel-200 flex-1">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Bid Amount */}
          {!isWalkAway && (
            <Section title="💰 Bid Tracking">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Bid Amount Submitted">
                  <input
                    type="number"
                    value={t.bidAmount}
                    onChange={(e) => update({ bidAmount: Number(e.target.value) || 0 })}
                    className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                    placeholder="0"
                  />
                </Field>
                <Field label="Bidders Confidence">
                  <select
                    value={t.biddersConfidence}
                    onChange={(e) => update({ biddersConfidence: e.target.value })}
                    className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                  >
                    <option value="UNKNOWN">Unknown</option>
                    <option value="HIGH">HIGH (3+ sources)</option>
                    <option value="MEDIUM">MEDIUM (2 sources)</option>
                    <option value="LOW">LOW (1 source)</option>
                  </select>
                </Field>
              </div>
            </Section>
          )}

          {/* Notes */}
          <Section title="Notes">
            <textarea
              value={t.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
              placeholder="Addenda received, scope clarifications, special requirements, etc."
            />
          </Section>
        </div>

        <div className="bg-steel-800 px-5 py-3 border-t border-steel-700 flex justify-end gap-2 sticky bottom-0">
          <button onClick={onCancel} className="px-4 py-2 bg-steel-700 hover:bg-steel-600 text-white rounded text-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(t)}
            disabled={!t.projectName || !t.gc}
            className="px-4 py-2 bg-fire-600 hover:bg-fire-500 disabled:bg-steel-700 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            {existing ? 'Update Tender' : 'Save Tender'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────── Sub-components ─────────── */
function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-steel-300 mb-2 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-steel-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function KpiTile({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-steel-800 border border-steel-700 rounded p-3">
      <div className="text-xs text-steel-400 uppercase tracking-wide truncate">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent}`}>{value}</div>
    </div>
  )
}
