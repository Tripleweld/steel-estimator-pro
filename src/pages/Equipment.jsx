import { useMemo, useState } from 'react';
import { useProject, calcEquipRentalCost } from '../context/ProjectContext';
import { Truck, ChevronDown, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */
const fmt = (v) =>
  '$' +
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtRate = (v) =>
  '$' +
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pct = (v) =>
  Number(v || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + '%';

/* ------------------------------------------------------------------ */
/*  Category ordering                                                  */
/* ------------------------------------------------------------------ */
const CATEGORY_ORDER = [
  'CRANES',
  'TELEHANDLERS',
  'BOOM LIFTS',
  'SCISSOR LIFTS',
  'FORKLIFTS',
  'WELDING & POWER',
  'TRUCKS & TRAILERS',
  'RIGGING & MISC',
];

const PERIODS = ['Day', 'Week', 'Month'];

/* ------------------------------------------------------------------ */
/*  Equipment Page                                                     */
/* ------------------------------------------------------------------ */
export default function Equipment() {
  const { state, dispatch } = useProject();

  const equipment = state.rates?.equipment || [];
  const markupPct = state.rates?.equipmentMarkup ?? 15;

  /* --- filter toggle ------------------------------------------------ */
  const [showAll, setShowAll] = useState(true);

  /* --- collapsed state per category (default: all expanded) --------- */
  const [collapsed, setCollapsed] = useState({});
  const toggleCategory = (cat) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  /* --- grouped data ------------------------------------------------- */
  const grouped = useMemo(() => {
    const map = {};
    CATEGORY_ORDER.forEach((cat) => (map[cat] = []));
    equipment.forEach((row) => {
      const cat = row.category || 'RIGGING & MISC';
      if (!map[cat]) map[cat] = [];
      map[cat].push(row);
    });
    return map;
  }, [equipment]);

  /* --- summary calculations ----------------------------------------- */
  const summary = useMemo(() => {
    let activeCount = 0;
    let totalRental = 0;
    let totalPickup = 0;
    let totalDropoff = 0;

    equipment.forEach((row) => {
      const qty = Number(row.qty) || 0;
      if (qty > 0) activeCount++;
      totalRental += calcEquipRentalCost(row);
      totalPickup += Number(row.pickup) || 0;
      totalDropoff += Number(row.dropoff) || 0;
    });

    const subtotal = totalRental + totalPickup + totalDropoff;
    const markupAmt = subtotal * (Number(markupPct) || 0) / 100;
    const grandTotal = subtotal + markupAmt;

    return { activeCount, totalRental, totalPickup, totalDropoff, subtotal, markupAmt, grandTotal };
  }, [equipment, markupPct]);

  /* --- dispatchers -------------------------------------------------- */
  const updateRow = (id, field, value) =>
    dispatch({ type: 'UPDATE_EQUIPMENT', payload: { id, [field]: value } });

  const setMarkup = (value) =>
    dispatch({ type: 'SET_EQUIPMENT_MARKUP', payload: value });

  /* --- line total helper -------------------------------------------- */
  const lineTotal = (row) => {
    const rental = calcEquipRentalCost(row);
    const pickup = Number(row.pickup) || 0;
    const dropoff = Number(row.dropoff) || 0;
    return rental + pickup + dropoff;
  };

  /* --- category subtotal helper ------------------------------------- */
  const catSubtotal = (rows) =>
    rows.reduce((sum, row) => sum + lineTotal(row), 0);

  const catActiveCount = (rows) =>
    rows.filter((r) => (Number(r.qty) || 0) > 0).length;

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-silver-50">
      {/* Accent stripe */}
      <div className="accent-stripe h-1.5 bg-gradient-to-r from-fire-600 via-fire-500 to-steel-700" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---- Page header ------------------------------------------ */}
        <div className="mb-8">
          <h1 className="page-title flex items-center gap-3 text-3xl font-bold text-steel-900">
            <Truck className="h-8 w-8 text-fire-600" />
            Equipment Rental
          </h1>
          <p className="page-subtitle mt-1 text-sm text-silver-500">
            Cranes, lifts, welders, trucks &amp; rigging — rental catalog with cost tracking
          </p>
        </div>

        {/* ---- Summary cards ---------------------------------------- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Active Items */}
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-silver-500">Active Items</p>
            <p className="mt-1 text-2xl font-bold font-mono text-steel-900">
              {summary.activeCount}
            </p>
            <p className="mt-0.5 text-xs text-silver-400">of {equipment.length} catalog items</p>
          </div>

          {/* Total Rental Cost */}
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-silver-500">Total Rental Cost</p>
            <p className="mt-1 text-2xl font-bold font-mono text-steel-900">
              {fmt(summary.totalRental)}
            </p>
            <p className="mt-0.5 text-xs text-silver-400">base rental charges</p>
          </div>

          {/* Pickup / Dropoff */}
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-silver-500">Pickup / Dropoff</p>
            <p className="mt-1 text-2xl font-bold font-mono text-steel-900">
              {fmt(summary.totalPickup + summary.totalDropoff)}
            </p>
            <p className="mt-0.5 text-xs text-silver-400">
              {fmt(summary.totalPickup)} pickup &middot; {fmt(summary.totalDropoff)} dropoff
            </p>
          </div>

          {/* Grand Total */}
          <div className="rounded-xl border border-fire-300 bg-fire-50 p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-fire-600">Grand Total</p>
            <p className="mt-1 text-2xl font-bold font-mono text-fire-700">
              {fmt(summary.grandTotal)}
            </p>
            <p className="mt-0.5 text-xs text-fire-400">incl. {pct(markupPct)} markup</p>
          </div>

          {/* Equipment Markup */}
          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-silver-500">Equipment Markup</p>
            <p className="mt-1 text-2xl font-bold font-mono text-steel-900">{pct(markupPct)}</p>
            <p className="mt-0.5 text-xs text-silver-400">applied to subtotal</p>
          </div>
        </div>

        {/* ---- Markup input + filter toggle ------------------------- */}
        <div className="mb-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-steel-700">Equipment Markup %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={markupPct}
              onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-lg border border-silver-300 bg-white px-3 py-1.5 text-right font-mono text-sm text-steel-900 shadow-sm focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
            />
          </div>

          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="rounded-lg border border-silver-300 bg-white px-4 py-1.5 text-sm font-medium text-steel-700 shadow-sm transition hover:bg-silver-100"
          >
            {showAll ? 'Active Only' : 'Show All'}
          </button>
        </div>

        {/* ---- Category sections ------------------------------------ */}
        {CATEGORY_ORDER.map((cat) => {
          const rows = grouped[cat] || [];
          const visible = showAll ? rows : rows.filter((r) => (Number(r.qty) || 0) > 0);
          if (!showAll && visible.length === 0) return null;

          const isOpen = !collapsed[cat];
          const active = catActiveCount(rows);
          const sub = catSubtotal(rows);

          return (
            <div key={cat} className="mb-6">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center gap-3 rounded-t-xl bg-steel-800 px-5 py-3 text-left text-white transition hover:bg-steel-700"
              >
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-fire-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-fire-400" />
                )}
                <span className="text-sm font-bold uppercase tracking-wider">{cat}</span>
                <span className="ml-auto flex items-center gap-4 text-xs text-silver-300">
                  <span>
                    {active} / {rows.length} active
                  </span>
                  <span className="font-mono font-semibold text-fire-400">{fmt(sub)}</span>
                </span>
              </button>

              {/* Table */}
              {isOpen && (
                <div className="overflow-x-auto rounded-b-xl border border-t-0 border-silver-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-steel-800 text-white">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">Item</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Day Rate</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Week Rate</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Month Rate</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">Period</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider">Qty</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Rental Cost</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Pickup $</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Dropoff $</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-6 text-center text-silver-400">
                            No active items in this category
                          </td>
                        </tr>
                      ) : (
                        visible.map((row) => {
                          const rental = calcEquipRentalCost(row);
                          const lt = lineTotal(row);
                          const isActive = (Number(row.qty) || 0) > 0;

                          return (
                            <tr
                              key={row.id}
                              className={`border-t border-silver-100 transition even:bg-steel-50 ${
                                isActive ? '' : 'opacity-60'
                              }`}
                            >
                              {/* Item name */}
                              <td className="px-4 py-2 font-medium text-steel-800">{row.item}</td>

                              {/* Day / Week / Month rates (read-only) */}
                              <td className="px-3 py-2 text-right font-mono text-silver-600">
                                {fmtRate(row.dayRate)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-silver-600">
                                {fmtRate(row.weekRate)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-silver-600">
                                {fmtRate(row.monthRate)}
                              </td>

                              {/* Period dropdown */}
                              <td className="px-3 py-2 text-center">
                                <select
                                  value={row.period || 'Day'}
                                  onChange={(e) => updateRow(row.id, 'period', e.target.value)}
                                  className="w-20 rounded border border-silver-300 bg-white px-1 py-1 text-center text-xs font-medium text-steel-700 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                                >
                                  {PERIODS.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Qty input */}
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.qty || 0}
                                  onChange={(e) =>
                                    updateRow(row.id, 'qty', parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-16 rounded border border-silver-300 bg-white px-2 py-1 text-center font-mono text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                                />
                              </td>

                              {/* Rental cost (read-only) */}
                              <td className="px-3 py-2 text-right font-mono font-semibold text-steel-800">
                                {fmt(rental)}
                              </td>

                              {/* Pickup */}
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.pickup || 0}
                                  onChange={(e) =>
                                    updateRow(row.id, 'pickup', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 rounded border border-silver-300 bg-white px-2 py-1 text-right font-mono text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                                />
                              </td>

                              {/* Dropoff */}
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.dropoff || 0}
                                  onChange={(e) =>
                                    updateRow(row.id, 'dropoff', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 rounded border border-silver-300 bg-white px-2 py-1 text-right font-mono text-sm text-steel-900 focus:border-fire-500 focus:outline-none focus:ring-1 focus:ring-fire-500"
                                />
                              </td>

                              {/* Line Total */}
                              <td
                                className={`px-3 py-2 text-right font-mono font-bold ${
                                  isActive ? 'text-fire-600' : 'text-silver-400'
                                }`}
                              >
                                {fmt(lt)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {/* ---- Grand total bar -------------------------------------- */}
        <div className="mt-4 rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-end gap-x-10 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-silver-500">Subtotal</span>
              <span className="font-mono font-semibold text-steel-800">{fmt(summary.subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-silver-500">+ Markup ({pct(markupPct)})</span>
              <span className="font-mono font-semibold text-steel-800">{fmt(summary.markupAmt)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-fire-500 px-5 py-2">
              <span className="font-semibold text-white">Grand Total</span>
              <span className="font-mono text-lg font-bold text-white">{fmt(summary.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ---- Footer ----------------------------------------------- */}
        <footer className="mt-10 border-t border-silver-200 pt-6 text-center text-xs text-silver-400">
          <p>Triple Weld Inc. &mdash; Steel Estimator Pro</p>
          <p className="mt-1">Equipment rental rates are catalog defaults. Verify with suppliers before final bid.</p>
        </footer>
      </div>
    </div>
  );
}
