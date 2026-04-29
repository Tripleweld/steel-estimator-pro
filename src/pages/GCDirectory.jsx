import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Trash2, ArrowLeft, Mail, AlertTriangle, CheckCircle, MinusCircle, XOctagon } from 'lucide-react'
import { useProject } from '../context/ProjectContext'

const TIER_OPTIONS = [
  { id: 'Strong', label: 'Strong', color: 'bg-green-700/40 text-green-200 border-green-700', icon: CheckCircle, desc: 'Regular invitations, multiple wins, strong relationship' },
  { id: 'Neutral', label: 'Neutral', color: 'bg-blue-700/40 text-blue-200 border-blue-700', icon: MinusCircle, desc: 'Occasional, mixed history' },
  { id: 'New', label: 'New', color: 'bg-yellow-700/40 text-yellow-200 border-yellow-700', icon: Plus, desc: 'Never contacted or single touchpoint' },
  { id: 'Avoid', label: 'Avoid', color: 'bg-red-700/40 text-red-200 border-red-700', icon: XOctagon, desc: 'Bid shopper, late payer, scope creep aggressor' },
]

const PAYMENT_OPTIONS = [
  { id: 'Unknown', label: 'Unknown' },
  { id: 'OnTime', label: '✅ On time (≤30d)' },
  { id: 'Slow', label: '⚠️ Slow (30-45d)' },
  { id: 'Late', label: '🟠 Late (45-60d)' },
  { id: 'VeryLate', label: '🔴 Very Late (60+d)' },
]

export default function GCDirectory() {
  const { state, dispatch } = useProject()
  const directory = state.tenderRadar?.gcDirectory || []
  const tenders = state.tenderRadar?.tenders || []

  const [filterTier, setFilterTier] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  /* Compute per-GC stats from tenders */
  const gcStats = useMemo(() => {
    const stats = {}
    directory.forEach((g) => {
      stats[g.name] = {
        tenderCount: 0,
        wins: 0,
        losses: 0,
        walkAways: 0,
        totalBidValue: 0,
        winValue: 0,
      }
    })
    tenders.forEach((t) => {
      const s = stats[t.gc]
      if (!s) return
      s.tenderCount += 1
      const v = Number(t.bidAmount) || 0
      s.totalBidValue += v
      if (t.status === 'AWARDED') {
        s.wins += 1
        s.winValue += v
      } else if (t.status === 'LOST') s.losses += 1
      else if (t.status === 'NO_BID') s.walkAways += 1
    })
    return stats
  }, [directory, tenders])

  const visible = useMemo(() => {
    return directory
      .filter((g) => {
        if (filterTier !== 'all' && g.relationshipTier !== filterTier) return false
        if (search && !`${g.name} ${g.platform} ${g.contactPattern}`.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const order = { Strong: 1, Neutral: 2, New: 3, Avoid: 4 }
        const oa = order[a.relationshipTier] || 9
        const ob = order[b.relationshipTier] || 9
        if (oa !== ob) return oa - ob
        return a.name.localeCompare(b.name)
      })
  }, [directory, filterTier, search])

  const summary = useMemo(() => {
    const total = directory.length
    const byTier = { Strong: 0, Neutral: 0, New: 0, Avoid: 0 }
    directory.forEach((g) => {
      if (byTier[g.relationshipTier] !== undefined) byTier[g.relationshipTier] += 1
    })
    return { total, ...byTier }
  }, [directory])

  const handleSave = (gc) => {
    if (gc.id) {
      dispatch({ type: 'UPDATE_GC', payload: { id: gc.id, changes: gc } })
    } else {
      dispatch({ type: 'ADD_GC', payload: { ...gc, id: `gc-${Date.now()}` } })
    }
    setShowForm(false)
    setEditingId(null)
  }

  const handleDelete = (id) => {
    if (confirm('Delete this GC from directory? Tenders referencing this GC will keep their gc field as text.')) {
      dispatch({ type: 'DELETE_GC', payload: { id } })
    }
  }

  const editing = editingId ? directory.find((g) => g.id === editingId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/tenders/inbox" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={24} className="text-fire-400" /> GC Directory
            </h1>
            <p className="text-steel-400 text-sm mt-1">
              General Contractors · Coverage strategy · Relationship tiers
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null) }}
          className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2"
        >
          <Plus size={16} /> Add GC
        </button>
      </div>

      {/* Tier KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total GCs" value={summary.total} accent="text-white" />
        <KpiTile label="🟢 Strong" value={summary.Strong} accent="text-green-300" />
        <KpiTile label="🔵 Neutral" value={summary.Neutral} accent="text-blue-300" />
        <KpiTile label="🟡 New" value={summary.New} accent="text-yellow-300" />
        <KpiTile label="🔴 Avoid" value={summary.Avoid} accent="text-red-300" />
      </div>

      {/* Filters */}
      <div className="bg-steel-800 border border-steel-700 rounded p-3 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GC name / platform / contact"
          className="flex-1 min-w-[200px] bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-sm"
        />
        <label className="text-xs text-steel-400">
          Tier:{' '}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="ml-1 bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-xs"
          >
            <option value="all">All</option>
            {TIER_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <span className="ml-auto text-xs text-steel-500">{visible.length} of {directory.length} shown</span>
      </div>

      {/* GC Table */}
      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-2 py-2 text-left">GC Name</th>
              <th className="px-2 py-2 text-left">Tier</th>
              <th className="px-2 py-2 text-left">Platform</th>
              <th className="px-2 py-2 text-left">Contact</th>
              <th className="px-2 py-2 text-left">Payment</th>
              <th className="px-2 py-2 text-right">Tenders</th>
              <th className="px-2 py-2 text-right">Wins</th>
              <th className="px-2 py-2 text-right">Win Rate</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-steel-500">
                  {directory.length === 0 ? 'No GCs yet — click Add GC.' : 'No GCs match the current filters.'}
                </td>
              </tr>
            ) : (
              visible.map((g) => {
                const tier = TIER_OPTIONS.find((t) => t.id === g.relationshipTier) || TIER_OPTIONS[1]
                const stats = gcStats[g.name] || { tenderCount: 0, wins: 0, losses: 0, walkAways: 0 }
                const decided = stats.wins + stats.losses
                const winRate = decided > 0 ? (stats.wins / decided) * 100 : 0
                return (
                  <tr key={g.id} className="border-t border-steel-700 hover:bg-steel-700/30">
                    <td className="px-2 py-2">
                      <div className="text-white font-semibold">{g.name}</div>
                      {g.bidShoppingHistory && (
                        <div className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={11} /> Bid shopper history
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`text-xs px-2 py-1 rounded border ${tier.color}`}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-steel-300">{g.platform}</td>
                    <td className="px-2 py-2 text-xs text-steel-400">
                      {g.contactPattern && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} /> {g.contactPattern}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-steel-300">
                      {g.daysToPayAvg > 0 ? `${g.daysToPayAvg}d avg` : (g.paymentBehavior || 'Unknown')}
                    </td>
                    <td className="px-2 py-2 text-right text-steel-200">{stats.tenderCount}</td>
                    <td className="px-2 py-2 text-right text-green-300">{stats.wins}</td>
                    <td className="px-2 py-2 text-right">
                      <span className={winRate >= 30 ? 'text-green-300' : winRate >= 15 ? 'text-yellow-300' : 'text-steel-400'}>
                        {decided > 0 ? `${winRate.toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setEditingId(g.id); setShowForm(true) }}
                          className="text-steel-400 hover:text-white text-xs px-2 py-1 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
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
        <GCForm
          existing={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingId(null) }}
        />
      )}

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · GC Directory
      </div>
    </div>
  )
}

/* ─────────── GC Form Modal ─────────── */
function GCForm({ existing, onSave, onCancel }) {
  const [g, setG] = useState(
    existing || {
      name: '',
      platform: 'Direct email',
      contactPattern: '',
      relationshipTier: 'New',
      paymentBehavior: 'Unknown',
      daysToPayAvg: 0,
      bidShoppingHistory: false,
      scopeCreepHistory: false,
      notes: '',
      tendersCount: 0,
      winsCount: 0,
    }
  )

  const update = (changes) => setG((prev) => ({ ...prev, ...changes }))

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-10">
      <div className="bg-steel-900 border border-steel-700 rounded-lg w-full max-w-2xl mx-4">
        <div className="bg-steel-800 px-5 py-3 border-b border-steel-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {existing ? 'Edit GC' : 'Add New GC'}
          </h2>
          <button onClick={onCancel} className="text-steel-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="GC Name *">
            <input
              value={g.name}
              onChange={(e) => update({ name: e.target.value })}
              className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
              placeholder="e.g. Mirabelli Corp"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Platform">
              <select
                value={g.platform}
                onChange={(e) => update({ platform: e.target.value })}
                className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
              >
                <option>Direct email</option>
                <option>BuilderTrend</option>
                <option>Invitely</option>
                <option>SmartBuildBids</option>
                <option>BuildingConnected</option>
                <option>Procore</option>
                <option>Platform</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Contact (email or name)">
              <input
                value={g.contactPattern}
                onChange={(e) => update({ contactPattern: e.target.value })}
                className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                placeholder="estimator@gc.com"
              />
            </Field>
          </div>

          <div>
            <label className="block text-xs text-steel-400 mb-2">Relationship Tier</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TIER_OPTIONS.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start gap-2 p-3 rounded cursor-pointer border ${
                    g.relationshipTier === t.id ? t.color + ' border-2' : 'border-steel-700 hover:bg-steel-700/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    checked={g.relationshipTier === t.id}
                    onChange={() => update({ relationshipTier: t.id })}
                    className="accent-fire-500 mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">{t.label}</div>
                    <div className="text-xs text-steel-400">{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Payment Behavior">
              <select
                value={g.paymentBehavior}
                onChange={(e) => update({ paymentBehavior: e.target.value })}
                className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
              >
                {PAYMENT_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Avg Days to Pay (auto-calc)">
              <input
                type="number"
                value={g.daysToPayAvg}
                onChange={(e) => update({ daysToPayAvg: Number(e.target.value) || 0 })}
                className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
                placeholder="0"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={g.bidShoppingHistory}
                onChange={(e) => update({ bidShoppingHistory: e.target.checked })}
                className="accent-red-500"
              />
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-steel-200">Bid shopper history (shared TW number with competitors)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={g.scopeCreepHistory}
                onChange={(e) => update({ scopeCreepHistory: e.target.checked })}
                className="accent-yellow-500"
              />
              <AlertTriangle size={14} className="text-yellow-400" />
              <span className="text-steel-200">Scope creep aggressor (unilateral changes)</span>
            </label>
          </div>

          <Field label="Notes">
            <textarea
              value={g.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              className="w-full bg-steel-800 text-white border border-steel-700 px-2 py-1.5 rounded"
              placeholder="Internal notes, preferences, special handling..."
            />
          </Field>
        </div>

        <div className="bg-steel-800 px-5 py-3 border-t border-steel-700 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 bg-steel-700 hover:bg-steel-600 text-white rounded text-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave(g)}
            disabled={!g.name}
            className="px-4 py-2 bg-fire-600 hover:bg-fire-500 disabled:bg-steel-700 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            {existing ? 'Update GC' : 'Save GC'}
          </button>
        </div>
      </div>
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
