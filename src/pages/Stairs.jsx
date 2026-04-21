import { useState, useMemo } from 'react';
import { Calculator, ShieldCheck, Weight, ArrowUpDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { calcStairs } from '../utils/calculations';

const fmt = (v) =>
  typeof v === 'number'
    ? v.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' })
    : '$0.00';

const fmtNum = (v, decimals = 0) =>
  typeof v === 'number' ? v.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '0';

const materials = ['Structural steel', 'Galvanized steel', 'Stainless steel'];

export default function Stairs() {
  const { state, dispatch } = useProject();

  const stairs = state.stairs || {
    floorHeight: 3600,
    stairWidth: 1100,
    flights: 1,
    landingDepth: 1200,
    material: 'Structural steel',
  };

  const update = (field, value) => {
    dispatch({ type: 'SET_STAIRS', payload: { [field]: value } });
  };

  const results = useMemo(() => calcStairs(state.stairs), [state.stairs]);

  const materialRates = state.rates?.materialRates || {};
  const materialRate = materialRates[stairs.material] || 1.85;
  const fabRate = state.rates?.fabRate || 65;
  const installRate = state.rates?.installRate || 75;

  const totalWt = results?.weight?.total || 0;
  const tons = totalWt / 2000;
  const materialCost = totalWt * materialRate;
  const fabHrs = tons * 25;
  const instHrs = tons * 20;
  const fabCost = fabHrs * fabRate;
  const instCost = instHrs * installRate;
  const totalDirect = materialCost + fabCost + instCost;

  const inputFields = [
    { label: 'Floor-to-Floor Height', field: 'floorHeight', unit: 'mm' },
    { label: 'Stair Width', field: 'stairWidth', unit: 'mm' },
    { label: 'Number of Flights', field: 'flights', unit: '' },
    { label: 'Landing Depth', field: 'landingDepth', unit: 'mm' },
  ];

  const statCards = [
    { label: 'Risers / Flight', value: fmtNum(results?.risersPerFlight), color: 'bg-steel-100 text-steel-800' },
    { label: 'Riser Height', value: fmtNum(results?.riserHeight, 1), unit: 'mm', color: 'bg-steel-100 text-steel-800' },
    { label: 'Treads / Flight', value: fmtNum(results?.treadsPerFlight), color: 'bg-steel-100 text-steel-800' },
    { label: 'Tread Depth', value: fmtNum(results?.treadDepth, 1), unit: 'mm', color: 'bg-steel-100 text-steel-800' },
    { label: 'Stringer Length', value: fmtNum(results?.stringerLengthFt, 1), unit: 'ft', color: 'bg-silver-100 text-steel-800' },
    { label: 'Total Run', value: fmtNum(results?.totalRun, 0), unit: 'mm', color: 'bg-silver-100 text-steel-800' },
    { label: 'Landings', value: fmtNum(results?.landings), color: 'bg-silver-100 text-steel-800' },
    { label: 'Guardrail Posts', value: fmtNum(results?.guardrailPosts), color: 'bg-silver-100 text-steel-800' },
  ];

  const weightCards = [
    { label: 'Stringers', value: fmtNum(results?.weight?.stringers, 1), unit: 'lbs', color: 'bg-steel-100 text-steel-800' },
    { label: 'Treads', value: fmtNum(results?.weight?.treads, 1), unit: 'lbs', color: 'bg-steel-100 text-steel-800' },
    { label: 'Landings', value: fmtNum(results?.weight?.landings, 1), unit: 'lbs', color: 'bg-steel-100 text-steel-800' },
    { label: 'Total Weight', value: fmtNum(totalWt, 1), unit: 'lbs', color: 'bg-fire-500 text-white' },
  ];

  return (
    <div className="min-h-screen bg-silver-50">
      {/* Accent stripe */}
      <div className="accent-stripe" />

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fire-500 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">Stairs Calculator</h1>
            <p className="page-subtitle">OBC 3.4 compliant steel stair takeoff with auto-generated BOM</p>
          </div>
        </div>

        {/* Inputs Card */}
        <div className="mb-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-steel-800">Stair Parameters</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {inputFields.map(({ label, field, unit }) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-semibold text-steel-600">
                  {label} {unit && <span className="text-silver-400">({unit})</span>}
                </label>
                <input
                  type="number"
                  value={stairs[field]}
                  onChange={(e) => update(field, parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-silver-200 bg-silver-50 px-3 py-2 text-sm font-mono text-steel-800 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500"
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-steel-600">Material</label>
            <select
              value={stairs.material}
              onChange={(e) => update('material', e.target.value)}
              className="w-full rounded-lg border border-silver-200 bg-silver-50 px-3 py-2 text-sm text-steel-800 outline-none transition focus:border-fire-500 focus:ring-1 focus:ring-fire-500 sm:w-64"
            >
              {materials.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calculated Results */}
        <div className="mb-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-steel-800">Calculated Results</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map(({ label, value, unit, color }) => (
              <div key={label} className={`rounded-lg ${color} p-4`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {value}
                  {unit && <span className="ml-1 text-xs font-normal opacity-60">{unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code Compliance */}
        <div className="mb-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-fire-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-steel-800">Code Compliance &mdash; OBC 3.4 / OHSA</h2>
          </div>
          {results?.compliance && results.compliance.length > 0 ? (
            <div className="space-y-2">
              {results.compliance.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    check.pass
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {check.pass ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                    )}
                    <span className="text-sm text-steel-700">{check.rule}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      check.pass
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {check.pass ? 'OK' : 'Violation'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-silver-400">No compliance data available. Verify calculation inputs.</p>
          )}
        </div>

        {/* Weight Breakdown */}
        <div className="mb-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Weight className="h-5 w-5 text-fire-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-steel-800">Weight Breakdown</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {weightCards.map(({ label, value, unit, color }) => (
              <div key={label} className={`rounded-lg ${color} p-4`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {value}
                  {unit && <span className="ml-1 text-xs font-normal opacity-60">{unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Preview */}
        <div className="mb-6 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-fire-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-steel-800">Cost Preview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-steel-800 text-white">
                  <th className="rounded-tl-lg px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Rate</th>
                  <th className="rounded-tr-lg px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-100">
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Material</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(totalWt, 1)} lbs</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(materialRate)}/lb</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(materialCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Fabrication Labour</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(fabHrs, 1)} hrs</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(fabRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(fabCost)}</td>
                </tr>
                <tr className="even:bg-steel-50">
                  <td className="px-4 py-2.5 font-medium text-steel-700">Installation Labour</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmtNum(instHrs, 1)} hrs</td>
                  <td className="px-4 py-2.5 text-right font-mono text-steel-600">{fmt(installRate)}/hr</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-steel-800">{fmt(instCost)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-steel-800">
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wider text-steel-800">
                    Total Direct Cost
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-lg font-bold text-fire-600">
                    {fmt(totalDirect)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-silver-200 pt-6 text-center">
          <p className="text-xs text-silver-400">Triple Weld Inc. &middot; Steel Estimator Pro</p>
        </div>
      </div>
    </div>
  );
}
