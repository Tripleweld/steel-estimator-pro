import { useMemo } from 'react';
import { DollarSign, Plus, Trash2, Info } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const fmt = (v) => '$' + Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = (v, d = 0) => Number(v || 0).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

const UNITS = ['hrs', 'ls', 'ea', '%', 'day', 'wk', 'mo'];

export default function SoftCosts() {
  const { state, dispatch } = useProject();
  const rows = state.softCosts || [];

  const summary = useMemo(() => {
    const flatRows = rows.filter((r) => r.unit !== '%');
    const pctRows = rows.filter((r) => r.unit === '%');
    const flatCosts = flatRows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
    const pctCosts = pctRows.map((r) => ({ item: r.item, rate: Number(r.rate) || 0 }));
    const totalPctRate = pctCosts.reduce((s, p) => s + p.rate, 0);
    const totalSoft = flatCosts; // percentage items depend on project subtotal — shown separately
    const lineItemCount = rows.length;
    return { flatCosts, pctCosts, totalPctRate, totalSoft, lineItemCount };
  }, [rows]);

  const lineTotal = (r) => {
    if (r.unit === '%') return null;
    return (Number(r.qty) || 0) * (Number(r.rate) || 0);
  };

  const handleAdd = () => {
    dispatch({
      type: 'ADD_SOFT_COST',
      payload: {
        id: crypto.randomUUID(),
        item: '',
        qty: 1,
        unit: 'ls',
        rate: 0,
        notes: '',
      },
    });
  };

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_SOFT_COST', payload: id });
  };

  const handleUpdate = (id, field, value) => {
    dispatch({ type: 'UPDATE_SOFT_COST', payload: { id, [field]: value } });
  };

  return (
    <div className="min-h-screen bg-steel-50">
      {/* Accent stripe */}
      <div className="accent-stripe h-1.5 w-full bg-gradient-to-r from-fire-500 via-fire-600 to-steel-800" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="page-title flex items-center gap-3 text-3xl font-bold text-steel-900">
            <DollarSign className="h-8 w-8 text-fire-600" />
            Soft Costs
          </h1>
          <p className="page-subtitle mt-1 text-sm text-steel-500">
            Detailing, engineering, permits, insurance, contingency &amp; project overhead
          </p>
        </div>

        {/* Info alert */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <p className="text-sm text-blue-800">
            Items with unit <span className="font-mono font-semibold">%</span> calculate as a percentage
            of the project subtotal. All other units multiply Qty &times; Rate.
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Flat Costs</p>
            <p className="mt-1 text-2xl font-bold text-steel-900">{fmt(summary.flatCosts)}</p>
          </div>
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Percentage Costs</p>
            <div className="mt-1">
              {summary.pctCosts.length > 0 ? (
                <ul className="space-y-0.5">
                  {summary.pctCosts.map((p, i) => (
                    <li key={i} className="text-sm text-steel-700">
                      <span className="font-semibold text-fire-600">{fmtNum(p.rate, 1)}%</span>{' '}
                      <span className="text-steel-500">{p.item || 'Untitled'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-steel-400">None</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Total Soft Costs</p>
            <p className="mt-1 text-2xl font-bold text-fire-600">{fmt(summary.totalSoft)}</p>
            {summary.totalPctRate > 0 && (
              <p className="mt-0.5 text-xs text-steel-400">
                + {fmtNum(summary.totalPctRate, 1)}% of subtotal
              </p>
            )}
          </div>
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">Line Items</p>
            <p className="mt-1 text-2xl font-bold text-steel-900">{fmtNum(summary.lineItemCount)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-xl px-3 py-3 text-left font-semibold">#</th>
                  <th className="px-3 py-3 text-left font-semibold">Description</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-left font-semibold">Unit</th>
                  <th className="px-3 py-3 text-right font-semibold">Rate ($)</th>
                  <th className="px-3 py-3 text-right font-semibold">Line Total ($)</th>
                  <th className="px-3 py-3 text-left font-semibold">Notes</th>
                  <th className="rounded-tr-xl px-3 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <DollarSign className="mx-auto mb-3 h-10 w-10 text-steel-300" />
                      <p className="text-sm text-steel-500">
                        No soft costs defined. Click{' '}
                        <span className="font-semibold text-fire-600">+ Add Cost</span> to begin.
                      </p>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const isPct = row.unit === '%';
                    const lt = lineTotal(row);
                    return (
                      <tr key={row.id} className="border-t border-silver-100 even:bg-steel-50">
                        <td className="px-3 py-2 font-mono text-xs text-steel-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.item}
                            onChange={(e) => handleUpdate(row.id, 'item', e.target.value)}
                            placeholder="Cost description"
                            className="w-full min-w-[200px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-900 placeholder:text-steel-300 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step={isPct ? '0.1' : '1'}
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
                            step={isPct ? '0.1' : '0.01'}
                            value={row.rate}
                            onChange={(e) => handleUpdate(row.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-28 rounded border border-silver-200 bg-transparent px-2 py-1 text-right text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isPct ? (
                            <span className="font-mono text-sm text-fire-600">
                              {fmtNum(Number(row.rate) || 0, 1)}%
                              <span className="ml-1 text-xs text-steel-400">(of subtotal)</span>
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-steel-900">{fmt(lt)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => handleUpdate(row.id, 'notes', e.target.value)}
                            placeholder="Notes"
                            className="w-full min-w-[120px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-900 placeholder:text-steel-300 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center">
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
                    );
                  })
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-steel-200 bg-steel-50">
                    <td colSpan={5} className="px-3 py-3 text-right text-sm font-bold text-steel-700">
                      Total (flat costs)
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono text-base font-bold text-fire-600">
                        {fmt(summary.flatCosts)}
                      </span>
                      {summary.totalPctRate > 0 && (
                        <span className="ml-2 text-xs text-steel-400">
                          + {fmtNum(summary.totalPctRate, 1)}%
                        </span>
                      )}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Add button at bottom */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-fire-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-600 focus:outline-none focus:ring-2 focus:ring-fire-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Cost
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-silver-200 pt-4 text-center text-xs text-steel-400">
          Triple Weld Inc. &mdash; Steel Estimating Platform
        </div>
      </div>
    </div>
  );
}
