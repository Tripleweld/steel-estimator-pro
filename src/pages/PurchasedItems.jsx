import { useMemo } from 'react';
import { ShoppingCart, Plus, Trash2, Copy } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

const UNITS = ['ea', 'lnft', 'sqft', 'lb', 'ton', 'ls', 'set', 'lot'];

export default function PurchasedItems() {
  const { state, dispatch } = useProject();
  const rows = state.purchased || [];

  const summary = useMemo(() => {
    const totalItems = rows.length;
    const totalCost = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0);
    const longestLead = rows.reduce((m, r) => Math.max(m, Number(r.leadWeeks) || 0), 0);
    const avgUnit = totalItems > 0
      ? rows.reduce((s, r) => s + (Number(r.unitCost) || 0), 0) / totalItems
      : 0;
    return { totalItems, totalCost, longestLead, avgUnit };
  }, [rows]);

  const handleAdd = () => {
    dispatch({
      type: 'ADD_PURCHASED_ROW',
      payload: {
        id: crypto.randomUUID(),
        item: '',
        supplier: '',
        qty: 1,
        unit: 'ea',
        unitCost: 0,
        total: 0,
        leadWeeks: 0,
        notes: '',
      },
    });
  };

  const handleCopy = (row) => {
    dispatch({
      type: 'ADD_PURCHASED_ROW',
      payload: { ...row, id: crypto.randomUUID() },
    });
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_PURCHASED_ROW', payload: id });
  };

  const handleUpdate = (id, field, value) => {
    dispatch({ type: 'UPDATE_PURCHASED_ROW', payload: { id, [field]: value } });
  };

  const lineTotal = (r) => (Number(r.qty) || 0) * (Number(r.unitCost) || 0);

  return (
    <div className="min-h-screen bg-steel-50">
      {/* Accent stripe */}
      <div className="accent-stripe h-1.5 w-full bg-gradient-to-r from-fire-500 via-fire-600 to-steel-800" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="page-title flex items-center gap-3 text-3xl font-bold text-steel-900">
            <ShoppingCart className="h-8 w-8 text-fire-600" />
            Purchased Items
          </h1>
          <p className="page-subtitle mt-1 text-sm text-steel-500">
            Third-party materials, sub-contracts &amp; supplier quotes
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Total Items</p>
            <p className="mt-1 text-2xl font-bold text-steel-900">{fmtNum(summary.totalItems)}</p>
          </div>
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Total Cost</p>
            <p className="mt-1 text-2xl font-bold text-fire-600">{fmt(summary.totalCost)}</p>
          </div>
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Longest Lead Time</p>
            <p className="mt-1 text-2xl font-bold text-steel-900">
              {summary.longestLead > 0 ? `${fmtNum(summary.longestLead)} wks` : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Average Unit Cost</p>
            <p className="mt-1 text-2xl font-bold text-steel-900">{fmt(summary.avgUnit)}</p>
          </div>
        </div>

        {/* Add button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-fire-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-600 focus:outline-none focus:ring-2 focus:ring-fire-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-xl px-3 py-3 text-left font-semibold">#</th>
                  <th className="px-3 py-3 text-left font-semibold">Item Description</th>
                  <th className="px-3 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-left font-semibold">Unit</th>
                  <th className="px-3 py-3 text-right font-semibold">Unit Cost ($)</th>
                  <th className="px-3 py-3 text-right font-semibold">Line Total ($)</th>
                  <th className="px-3 py-3 text-right font-semibold">Lead Time (wks)</th>
                  <th className="px-3 py-3 text-left font-semibold">Notes</th>
                  <th className="rounded-tr-xl px-3 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-steel-300" />
                      <p className="text-sm text-steel-500">
                        No purchased items yet. Click{' '}
                        <span className="font-semibold text-fire-600">+ Add Item</span> for third-party
                        materials, joist/deck quotes, or sub-contract items.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.id} className="border-t border-silver-100 even:bg-steel-50">
                      <td className="px-3 py-2 text-steel-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.item}
                          onChange={(e) => handleUpdate(row.id, 'item', e.target.value)}
                          placeholder="e.g. Open-web joists"
                          className="w-full min-w-[180px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-900 placeholder:text-steel-300 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.supplier}
                          onChange={(e) => handleUpdate(row.id, 'supplier', e.target.value)}
                          placeholder="Supplier"
                          className="w-full min-w-[120px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-900 placeholder:text-steel-300 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={(e) => handleUpdate(row.id, 'qty', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-silver-200 bg-transparent px-2 py-1 text-right text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.unit}
                          onChange={(e) => handleUpdate(row.id, 'unit', e.target.value)}
                          className="rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitCost}
                          onChange={(e) => handleUpdate(row.id, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-28 rounded border border-silver-200 bg-transparent px-2 py-1 text-right text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-mono font-bold text-steel-900">
                          {fmt(lineTotal(row))}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.leadWeeks}
                          onChange={(e) => handleUpdate(row.id, 'leadWeeks', parseInt(e.target.value) || 0)}
                          className="w-16 rounded border border-silver-200 bg-transparent px-2 py-1 text-right text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => handleUpdate(row.id, 'notes', e.target.value)}
                          placeholder="Notes"
                          className="w-full min-w-[100px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-900 placeholder:text-steel-300 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopy(row)}
                            title="Duplicate row"
                            className="rounded p-1 text-steel-400 transition hover:bg-steel-100 hover:text-steel-700"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            title="Delete row"
                            className="rounded p-1 text-steel-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-steel-200 bg-steel-50">
                    <td colSpan={6} className="px-3 py-3 text-right text-sm font-bold text-steel-700">
                      Grand Total
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono text-base font-bold text-fire-600">
                        {fmt(summary.totalCost)}
                      </span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-silver-200 pt-4 text-center text-xs text-steel-400">
          Triple Weld Inc. &mdash; Steel Estimating Platform
        </div>
      </div>
    </div>
  );
}
