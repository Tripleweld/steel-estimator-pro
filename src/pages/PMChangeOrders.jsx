import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileEdit, Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { fmtCurrency } from '../utils/calculations'

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending', color: 'bg-yellow-700/40 text-yellow-200 border-yellow-700', icon: Clock },
  { id: 'approved', label: 'Approved', color: 'bg-green-700/40 text-green-200 border-green-700', icon: CheckCircle },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-700/40 text-red-200 border-red-700', icon: XCircle },
  { id: 'disputed', label: 'Disputed', color: 'bg-fire-700/40 text-fire-200 border-fire-700', icon: AlertCircle },
]

function statusMeta(id) {
  return STATUS_OPTIONS.find((s) => s.id === id) || STATUS_OPTIONS[0]
}

export default function PMChangeOrders() {
  const { state, dispatch } = useProject()
  const cos = state.projectManagement?.changeOrders || []
  const fabRate = state.rates?.labourRates?.fabRate || 0
  const instRate = state.rates?.labourRates?.installRate || 0

  const rowsCalc = useMemo(() => {
    return cos.map((c, idx) => {
      const sign = c.type === 'deduct' ? -1 : 1
      const mat = (Number(c.materialCost) || 0) * sign
      const fab = (Number(c.fabHrs) || 0) * fabRate * sign
      const inst = (Number(c.instHrs) || 0) * instRate * sign
      const total = mat + fab + inst
      return { ...c, idx, mat, fab, inst, total }
    })
  }, [cos, fabRate, instRate])

  const totals = useMemo(() => {
    let approved = 0, pending = 0, all = 0
    rowsCalc.forEach((r) => {
      all += r.total
      if (r.status === 'approved') approved += r.total
      if (r.status === 'pending') pending += r.total
    })
    return { approved, pending, all, count: rowsCalc.length }
  }, [rowsCalc])

  const addCO = () => {
    const nextNum = cos.length === 0 ? 1 : Math.max(...cos.map((c) => Number(c.coNum) || 0)) + 1
    dispatch({
      type: 'ADD_CHANGE_ORDER',
      payload: {
        id: `co-${Date.now()}`,
        coNum: nextNum,
        date: new Date().toISOString().slice(0, 10),
        description: '',
        type: 'add',
        materialCost: 0,
        fabHrs: 0,
        instHrs: 0,
        status: 'pending',
        approver: '',
        notes: '',
      },
    })
  }
  const updateCO = (id, changes) => dispatch({ type: 'UPDATE_CHANGE_ORDER', payload: { id, changes } })
  const deleteCO = (id) => dispatch({ type: 'DELETE_CHANGE_ORDER', payload: { id } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/pm/dashboard" className="text-steel-400 hover:text-fire-400">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileEdit size={24} className="text-fire-400" /> Change Orders
            </h1>
            <p className="text-steel-400 text-sm mt-1">CO log — adjusts contract value & SOV</p>
          </div>
        </div>
        <button
          onClick={addCO}
          className="px-3 py-2 bg-fire-600 hover:bg-fire-500 text-white text-sm rounded flex items-center gap-2"
        >
          <Plus size={16} /> New Change Order
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total COs" value={totals.count} accent="text-white" raw />
        <Tile label="Approved" value={fmtCurrency(totals.approved)} accent="text-green-300" />
        <Tile label="Pending" value={fmtCurrency(totals.pending)} accent="text-yellow-300" />
        <Tile label="Net Impact (All)" value={fmtCurrency(totals.all)} accent={totals.all >= 0 ? 'text-fire-300' : 'text-red-300'} />
      </div>

      <div className="bg-steel-800 border border-steel-700 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900 text-steel-300">
            <tr>
              <th className="px-2 py-2 text-left">CO #</th>
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left min-w-[200px]">Description</th>
              <th className="px-2 py-2 text-center">Type</th>
              <th className="px-2 py-2 text-right">Material $</th>
              <th className="px-2 py-2 text-right">Fab Hrs</th>
              <th className="px-2 py-2 text-right">Inst Hrs</th>
              <th className="px-2 py-2 text-right">Total $</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Approver</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rowsCalc.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-steel-500">
                  No change orders yet. Click <strong className="text-fire-400">New Change Order</strong> to log one.
                </td>
              </tr>
            ) : (
              rowsCalc.map((r) => {
                const sm = statusMeta(r.status)
                const Icon = sm.icon
                return (
                  <tr key={r.id} className="border-t border-steel-700">
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={r.coNum}
                        onChange={(e) => updateCO(r.id, { coNum: Number(e.target.value) || 0 })}
                        className="w-12 bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => updateCO(r.id, { date: e.target.value })}
                        className="bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={r.description}
                        onChange={(e) => updateCO(r.id, { description: e.target.value })}
                        placeholder="CO description"
                        className="w-full bg-steel-900 text-white border border-steel-700 px-2 py-1 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <select
                        value={r.type}
                        onChange={(e) => updateCO(r.id, { type: e.target.value })}
                        className="bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                      >
                        <option value="add">Add</option>
                        <option value="deduct">Deduct</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        value={r.materialCost}
                        onChange={(e) => updateCO(r.id, { materialCost: Number(e.target.value) || 0 })}
                        className="w-24 text-right bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        value={r.fabHrs}
                        onChange={(e) => updateCO(r.id, { fabHrs: Number(e.target.value) || 0 })}
                        className="w-16 text-right bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        value={r.instHrs}
                        onChange={(e) => updateCO(r.id, { instHrs: Number(e.target.value) || 0 })}
                        className="w-16 text-right bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-sm"
                      />
                    </td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${r.total >= 0 ? 'text-fire-300' : 'text-red-300'}`}>
                      {fmtCurrency(r.total)}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={r.status}
                        onChange={(e) => updateCO(r.id, { status: e.target.value })}
                        className={`text-xs px-2 py-1 rounded border ${sm.color}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id} className="bg-steel-900 text-white">
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={r.approver}
                        onChange={(e) => updateCO(r.id, { approver: e.target.value })}
                        placeholder="Approver"
                        className="w-24 bg-steel-900 text-white border border-steel-700 px-1 py-1 rounded text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={() => deleteCO(r.id)} className="text-steel-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {rowsCalc.length > 0 && (
            <tfoot className="bg-steel-900 text-white font-semibold">
              <tr className="border-t-2 border-steel-600">
                <td colSpan={7} className="px-3 py-2 text-right">
                  TOTAL NET IMPACT
                </td>
                <td className={`px-2 py-2 text-right ${totals.all >= 0 ? 'text-fire-300' : 'text-red-300'}`}>
                  {fmtCurrency(totals.all)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="text-center text-steel-500 text-xs pt-4 pb-8">
        Triple Weld Inc. · Steel Estimator Pro · Change Orders
      </div>
    </div>
  )
}

function Tile({ label, value, accent = 'text-white', raw = false }) {
  return (
    <div className="bg-steel-800 border border-steel-700 rounded p-3">
      <div className="text-xs text-steel-400 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent}`}>{raw ? value : value}</div>
    </div>
  )
}
