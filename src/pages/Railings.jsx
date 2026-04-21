import { useState, useMemo } from 'react';
import { Fence, Plus, Trash2, Copy } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const fmt = (v) =>
  typeof v === 'number'
    ? v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
    : '$0.00';

const fmtNum = (v, decimals = 0) =>
  typeof v === 'number' ? v.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '0';

const railingTypes = ['Guard', 'Handrail', 'Guard + Handrail', 'Picket', 'Cable Rail', 'Glass Panel'];
const materialOptions = ['Structural steel', 'Galvanized steel', 'Stainless steel'];

let nextId = Date.now();

const makeRow = (overrides = {}) => ({
  id: nextId++,
  location: '',
  type: 'Guard',
  heightMm: 1070,
  lengthFt: 0,
  posts: 0,
  material: 'Structural steel',
  weightLbs: 0,
  fabHrs: 0,
  instHrs: 0,
  notes: '',
  ...overrides,
});

export default function Railings() {
  const { state, dispatch } = useProject();

  const rows = state.railingRows || [];

  const materialRates = state.rates?.materialRates || {};
  const fabRate = state.rates?.fabRate || 65;
  const installRate = state.rates?.installRate || 75;

  const addRow = () => {
    dispatch({ type: 'ADD_RAILING_ROW', payload: makeRow() });
  };

  const updateRow = (id, fields) => {
    dispatch({ type: 'UPDATE_RAILING_ROW', payload: { id, ...fields } });
  };

  const deleteRow = (id) => {
    dispatch({ type: 'DELETE_RAILING_ROW', payload: id });
  };

  const copyRow = (row) => {
    dispatch({
      type: 'ADD_RAILING_ROW',
      payload: makeRow({ ...row, id: nextId++, location: row.location ? `${row.location} (copy)` : '' }),
    });
  };

  const totals = useMemo(() => {
    const totalWeight = rows.reduce((s, r) => s + (parseFloat(r.weightLbs) || 0), 0);
    const totalFabHrs = rows.reduce((s, r) => s + (parseFloat(r.fabHrs) || 0), 0);
    const totalInstHrs = rows.reduce((s, r) => s + (parseFloat(r.instHrs) || 0), 0);
    const totalLengthFt = rows.reduce((s, r) => s + (parseFloat(r.lengthFt) || 0), 0);

    const materialCost = rows.reduce((s, r) => {
      const rate = materialRates[r.material] || 1.85;
      return s + (parseFloat(r.weightLbs) || 0) * rate;
    }, 0);

    const fabCost = totalFabHrs * fabRate;
    const instCost = totalInstHrs * installRate;

    return {
      count: rows.length,
      totalLengthFt,
      totalWeight,
      totalWeightTons: totalWeight / 2000,
      totalFabHrs,
      totalInstHrs,
      materialCost,
      fabCost,
      instCost,
      labourCost: fabCost + instCost,
    };
  }, [rows, materialRates, fabRate, installRate]);

  const summaryCards = [
    { label: 'Total Items', value: fmtNum(totals.count), color: 'bg-steel-100 text-steel-800' },
    { label: 'Total Length', value: fmtNum(totals.totalLengthFt, 1), unit: 'ft', color: 'bg-steel-100 text-steel-800' },
    { label: 'Total Weight', value: fmtNum(totals.totalWeight, 1), unit: 'lbs', color: 'bg-steel-100 text-steel-800' },
    { label: 'Total Weight', value: fmtNum(totals.totalWeightTons, 2), unit: 'tons', color: 'bg-silver-100 text-steel-800' },
    { label: 'Fab Hours', value: fmtNum(totals.totalFabHrs, 1), unit: 'hrs', color: 'bg-silver-100 text-steel-800' },
    { label: 'Install Hours', value: fmtNum(totals.totalInstHrs, 1), unit: 'hrs', color: 'bg-silver-100 text-steel-800' },
    { label: 'Material Cost', value: fmt(totals.materialCost), color: 'bg-fire-500 text-white' },
    { label: 'Labour Cost', value: fmt(totals.labourCost), color: 'bg-fire-500 text-white' },
  ];

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Accent stripe */}
      <div className="accent-stripe" />

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fire-500 text-white">
            <Fence className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">Railings Takeoff</h1>
            <p className="page-subtitle">Guardrails, handrails &amp; custom railing systems &mdash; weight and labour tracking</p>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {summaryCards.map(({ label, value, unit, color }) => (
            <div key={label + (unit || '')} className={`rounded-lg ${color} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
              <p className="mt-1 text-xl font-bold font-mono leading-tight">
                {value}
                {unit && <span className="ml-1 text-[10px] font-normal opacity-60">{unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-lg bg-fire-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fire-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Railing
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-800 text-white">
                    <th className="rounded-tl-lg px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider w-10">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Location</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Height<br /><span className="font-normal opacity-70">(mm)</span></th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Length<br /><span className="font-normal opacity-70">(ft)</span></th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Posts</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Material</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Weight<br /><span className="font-normal opacity-70">(lbs)</span></th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Fab Hrs</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Inst Hrs</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Notes</th>
                    <th className="rounded-tr-lg px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-silver-100">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="even:bg-steel-50 transition hover:bg-silver-100">
                      <td className="px-3 py-2 text-center font-mono text-xs text-silver-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => updateRow(row.id, { location: e.target.value })}
                          placeholder="e.g. Mezzanine edge"
                          className="w-full min-w-[120px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.type}
                          onChange={(e) => updateRow(row.id, { type: e.target.value })}
                          className="w-full min-w-[130px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-800 outline-none focus:border-fire-500"
                        >
                          {railingTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.heightMm}
                          onChange={(e) => updateRow(row.id, { heightMm: parseFloat(e.target.value) || 0 })}
                          className="w-20 rounded border border-silver-200 bg-transparent px-2 py-1 text-right font-mono text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.lengthFt}
                          onChange={(e) => updateRow(row.id, { lengthFt: parseFloat(e.target.value) || 0 })}
                          className="w-20 rounded border border-silver-200 bg-transparent px-2 py-1 text-right font-mono text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.posts}
                          onChange={(e) => updateRow(row.id, { posts: parseInt(e.target.value) || 0 })}
                          className="w-16 rounded border border-silver-200 bg-transparent px-2 py-1 text-right font-mono text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.material}
                          onChange={(e) => updateRow(row.id, { material: e.target.value })}
                          className="w-full min-w-[130px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-800 outline-none focus:border-fire-500"
                        >
                          {materialOptions.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.weightLbs}
                          onChange={(e) => updateRow(row.id, { weightLbs: parseFloat(e.target.value) || 0 })}
                          className="w-20 rounded border border-silver-200 bg-transparent px-2 py-1 text-right font-mono text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.fabHrs}
                          onChange={(e) => updateRow(row.id, { fabHrs: parseFloat(e.target.value) || 0 })}
                          className="w-16 rounded border border-silver-200 bg-transparent px-2 py-1 text-right font-mono text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.instHrs}
                          onChange={(e) => updateRow(row.id, { instHrs: parseFloat(e.target.value) || 0 })}
                          className="w-16 rounded border border-silver-200 bg-transparent px-2 py-1 text-right font-mono text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                          placeholder="Notes..."
                          className="w-full min-w-[100px] rounded border border-silver-200 bg-transparent px-2 py-1 text-sm text-steel-800 outline-none focus:border-fire-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => copyRow(row)}
                            title="Duplicate row"
                            className="rounded p-1.5 text-silver-400 transition hover:bg-silver-100 hover:text-steel-600"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRow(row.id)}
                            title="Delete row"
                            className="rounded p-1.5 text-silver-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Fence className="mb-3 h-10 w-10 text-silver-300" />
              <p className="text-sm font-medium text-steel-600">No railings added yet.</p>
              <p className="mt-1 text-xs text-silver-400">Click <span className="font-semibold text-fire-600">+ Add Railing</span> to begin.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-silver-200 pt-6 text-center">
          <p className="text-xs text-silver-400">Triple Weld Inc. &middot; Steel Estimator Pro</p>
        </div>
      </div>
    </div>
  );
}
