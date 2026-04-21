import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  DollarSign,
  Weight,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Package,
  FileText,
  Wrench,
  Building2,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */
const fmt = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtNum = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/* ------------------------------------------------------------------ */
/*  Tiny reusable pieces                                               */
/* ------------------------------------------------------------------ */
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-5 ${className}`}>{children}</div>
);

const CardTitle = ({ icon: Icon, title, color = 'text-gray-700', iconColor = 'text-blue-600' }) => (
  <h3 className={`flex items-center gap-2 text-lg font-semibold ${color} mb-4`}>
    {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
    {title}
  </h3>
);

const Mono = ({ children, className = '' }) => (
  <span className={`font-mono text-right ${className}`}>{children}</span>
);

const MetricCard = ({ icon: Icon, label, value, sub, bg, iconColor }) => (
  <Card className={`${bg} border-t-4`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold font-mono text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      </div>
      {Icon && <Icon className={`w-8 h-8 ${iconColor} opacity-80`} />}
    </div>
  </Card>
);

/* ------------------------------------------------------------------ */
/*  Row-level cost helpers                                             */
/* ------------------------------------------------------------------ */
const sumField = (rows, field) =>
  (rows || []).reduce((t, r) => t + (Number(r[field]) || 0), 0);

const rowWeight = (r) => (Number(r.qty) || 0) * (Number(r.lengthFt) || 0) * (Number(r.lbsPerFt) || 0);

const totalWeight = (rows) => (rows || []).reduce((t, r) => t + rowWeight(r), 0);

const rowFabHours = (r) => {
  const keys = ['fabSetup', 'fabCut', 'fabDrill', 'fabFeed', 'fabWeld', 'fabGrind', 'fabPaint'];
  return keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
};

const rowInstHours = (r) => {
  const keys = ['instUnload', 'instRig', 'instFit', 'instBolt', 'instTouchup', 'instQC'];
  return keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
};

const totalFabHours = (rows) => (rows || []).reduce((t, r) => t + rowFabHours(r), 0);
const totalInstHours = (rows) => (rows || []).reduce((t, r) => t + rowInstHours(r), 0);

/* ------------------------------------------------------------------ */
/*  Dashboard Component                                                */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const { state } = useProject();
  const {
    projectInfo = {},
    rates = {},
    structural = [],
    miscMetals = [],
    stairs = [],
    railings = [],
    ladder = [],
    joistReinf = [],
    purchasedItems = [],
    softCosts = [],
    equipment = [],
  } = state;

  const labourRates = rates.labourRates || {};
  const materialRates = rates.materialRates || {};
  const markupTax = rates.markupTax || {};

  /* ------ weight summaries ------ */
  const weights = useMemo(() => {
    const structLbs = totalWeight(structural);
    const miscLbs = totalWeight(miscMetals);
    const stairsLbs = totalWeight(stairs);
    const railingsLbs = totalWeight(railings);
    const ladderLbs = totalWeight(ladder);
    const joistLbs = totalWeight(joistReinf);
    const combinedLbs = structLbs + miscLbs + stairsLbs + railingsLbs + ladderLbs + joistLbs;
    return {
      structLbs,
      miscLbs,
      stairsLbs,
      railingsLbs,
      ladderLbs,
      joistLbs,
      combinedLbs,
      structTons: structLbs / 2000,
      miscTons: miscLbs / 2000,
      combinedTons: combinedLbs / 2000,
    };
  }, [structural, miscMetals, stairs, railings, ladder, joistReinf]);

  /* ------ hours summaries ------ */
  const hours = useMemo(() => {
    const fabStruct = totalFabHours(structural);
    const fabMisc = totalFabHours(miscMetals);
    const fabStairs = totalFabHours(stairs);
    const fabRailings = totalFabHours(railings);
    const fabLadder = totalFabHours(ladder);
    const fabJoist = totalFabHours(joistReinf);

    const instStruct = totalInstHours(structural);
    const instMisc = totalInstHours(miscMetals);
    const instStairs = totalInstHours(stairs);
    const instRailings = totalInstHours(railings);
    const instLadder = totalInstHours(ladder);
    const instJoist = totalInstHours(joistReinf);

    const totalFab = fabStruct + fabMisc + fabStairs + fabRailings + fabLadder + fabJoist;
    const totalInst = instStruct + instMisc + instStairs + instRailings + instLadder + instJoist;

    const detailing = softCosts
      .filter((c) => (c.category || '').toLowerCase().includes('detail') || (c.category || '').toLowerCase().includes('draft'))
      .reduce((s, c) => s + (Number(c.hours) || 0), 0);

    const pm = softCosts
      .filter((c) => (c.category || '').toLowerCase().includes('pm') || (c.category || '').toLowerCase().includes('project manage'))
      .reduce((s, c) => s + (Number(c.hours) || 0), 0);

    return {
      fabStruct,
      fabMisc,
      instStruct,
      instMisc,
      totalFab,
      totalInst,
      detailing,
      pm,
      totalLabour: totalFab + totalInst + detailing + pm,
    };
  }, [structural, miscMetals, stairs, railings, ladder, joistReinf, softCosts]);

  /* ------ category cost roll-ups ------ */
  const costs = useMemo(() => {
    const fabRate = Number(labourRates.fabRate) || 0;
    const installRate = Number(labourRates.installRate) || 0;
    const structMatRate = Number(materialRates.structural) || 0;
    const miscMatRate = Number(materialRates.miscMetals) || 0;
    const deckMatRate = Number(materialRates.deck) || 0;
    const joistMatRate = Number(materialRates.joists) || 0;

    const calcCategory = (rows, matRatePerLb) => {
      const wt = totalWeight(rows);
      const fabH = totalFabHours(rows);
      const instH = totalInstHours(rows);
      const material = wt * matRatePerLb;
      const labour = fabH * fabRate + instH * installRate;
      return { material, labour, total: material + labour };
    };

    const structCost = calcCategory(structural, structMatRate);
    const miscCost = calcCategory(miscMetals, miscMatRate);
    const stairsCost = calcCategory(stairs, miscMatRate);
    const railingsCost = calcCategory(railings, miscMatRate);
    const ladderCost = calcCategory(ladder, miscMatRate);
    const joistCost = calcCategory(joistReinf, joistMatRate);

    const purchasedTotal = purchasedItems.reduce(
      (s, p) =>
        s + (Number(p.qty) || 0) * (Number(p.unitCost) || 0) * (1 + (Number(p.markup) || 0) / 100),
      0,
    );

    const softTotal = softCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0);

    const equipTotal = equipment.reduce(
      (s, e) => s + (Number(e.cost) || Number(e.amount) || Number(e.total) || 0),
      0,
    );

    const subtotal =
      structCost.total +
      miscCost.total +
      stairsCost.total +
      railingsCost.total +
      ladderCost.total +
      joistCost.total +
      purchasedTotal +
      softTotal +
      equipTotal;

    const markupPct = Number(markupTax.markup) || 15;
    const contingencyPct = Number(markupTax.contingency) || 0;
    const escalationPct = Number(markupTax.escalation) || 0;
    const hstPct = Number(markupTax.hst) || 0;

    const markupAmt = subtotal * (markupPct / 100);
    const contingencyAmt = subtotal * (contingencyPct / 100);
    const escalationAmt = subtotal * (escalationPct / 100);
    const totalBeforeTax = subtotal + markupAmt + contingencyAmt + escalationAmt;
    const hstAmt = totalBeforeTax * (hstPct / 100);
    const grandTotal = totalBeforeTax + hstAmt;

    const allInPerTon = weights.combinedTons > 0 ? grandTotal / weights.combinedTons : 0;
    const allInPerLb = weights.combinedLbs > 0 ? grandTotal / weights.combinedLbs : 0;

    return {
      structCost,
      miscCost,
      stairsCost,
      railingsCost,
      ladderCost,
      joistCost,
      purchasedTotal,
      softTotal,
      equipTotal,
      subtotal,
      markupPct,
      markupAmt,
      contingencyPct,
      contingencyAmt,
      escalationPct,
      escalationAmt,
      totalBeforeTax,
      hstPct,
      hstAmt,
      grandTotal,
      allInPerTon,
      allInPerLb,
    };
  }, [
    structural,
    miscMetals,
    stairs,
    railings,
    ladder,
    joistReinf,
    purchasedItems,
    softCosts,
    equipment,
    labourRates,
    materialRates,
    markupTax,
    weights,
  ]);

  /* ------ risk flags ------ */
  const risks = useMemo(() => {
    const flags = [];
    const now = new Date();
    const bidStr = projectInfo.bidDate;
    if (bidStr) {
      const bid = new Date(bidStr);
      const diff = Math.ceil((bid - now) / (1000 * 60 * 60 * 24));
      if (diff < 0) {
        flags.push({ level: 'red', msg: 'Bid date has passed' });
      } else if (diff < 3) {
        flags.push({ level: 'red', msg: `Bid due in ${diff} day${diff !== 1 ? 's' : ''}` });
      } else if (diff <= 7) {
        flags.push({ level: 'yellow', msg: `Bid due in ${diff} days` });
      } else {
        flags.push({ level: 'green', msg: `Bid due in ${diff} days` });
      }
    } else {
      flags.push({ level: 'yellow', msg: 'No bid date set' });
    }

    if (!structural || structural.length === 0) {
      flags.push({ level: 'yellow', msg: 'No structural rows entered' });
    }

    const mu = Number(markupTax.markup);
    if (mu === 0) {
      flags.push({ level: 'red', msg: 'Markup is 0%' });
    }

    if (!projectInfo.projectName) {
      flags.push({ level: 'yellow', msg: 'Project name is blank' });
    }

    if (purchasedItems.length === 0 && softCosts.length === 0) {
      flags.push({ level: 'yellow', msg: 'No purchased items or soft costs' });
    }

    return flags;
  }, [projectInfo, structural, markupTax, purchasedItems, softCosts]);

  /* ------ Risk flag colour helpers ------ */
  const flagStyles = {
    red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: AlertTriangle, iconColor: 'text-red-500' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', icon: AlertTriangle, iconColor: 'text-amber-500' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: CheckCircle, iconColor: 'text-emerald-500' },
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Project Dashboard</h1>
            <p className="text-sm text-gray-500">
              {projectInfo.projectName || 'Untitled Project'}
              {projectInfo.projectNumber ? ` \u2014 #${projectInfo.projectNumber}` : ''}
            </p>
          </div>
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Triple Weld Inc.</p>
            <p className="text-xs text-gray-400">Steel Estimator Pro</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── Key Metrics Row ──────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            icon={DollarSign}
            label="Grand Total"
            value={`$${fmt(costs.grandTotal)}`}
            sub={`Before tax: $${fmt(costs.totalBeforeTax)}`}
            bg="border-emerald-500"
            iconColor="text-emerald-500"
          />
          <MetricCard
            icon={Weight}
            label="Total Weight"
            value={`${fmt(weights.combinedTons)} T`}
            sub={`${fmtNum(weights.combinedLbs)} lbs`}
            bg="border-blue-500"
            iconColor="text-blue-500"
          />
          <MetricCard
            icon={Wrench}
            label="Fab Hours"
            value={fmtNum(hours.totalFab)}
            sub={`Struct ${fmtNum(hours.fabStruct)} / Misc ${fmtNum(hours.fabMisc)}`}
            bg="border-amber-500"
            iconColor="text-amber-500"
          />
          <MetricCard
            icon={Building2}
            label="Install Hours"
            value={fmtNum(hours.totalInst)}
            sub={`Struct ${fmtNum(hours.instStruct)} / Misc ${fmtNum(hours.instMisc)}`}
            bg="border-purple-500"
            iconColor="text-purple-500"
          />
          <MetricCard
            icon={TrendingUp}
            label="All-in $/Ton"
            value={`$${fmt(costs.allInPerTon)}`}
            sub={`$${fmt(costs.allInPerLb)}/lb`}
            bg="border-cyan-500"
            iconColor="text-cyan-500"
          />
        </section>

        {/* ─── Risk Flags ───────────────────────────────────────── */}
        {risks.length > 0 && (
          <section className="flex flex-wrap gap-3">
            {risks.map((f, i) => {
              const s = flagStyles[f.level];
              const FlagIcon = s.icon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${s.bg} ${s.border} ${s.text}`}
                >
                  <FlagIcon className={`w-4 h-4 ${s.iconColor}`} />
                  {f.msg}
                </div>
              );
            })}
          </section>
        )}

        {/* ─── Project Info + Cost Summary (two‑col on lg) ─────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Info Card */}
          <Card className="lg:col-span-1">
            <CardTitle icon={FileText} title="Project Information" iconColor="text-blue-600" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ['Project', projectInfo.projectName],
                ['Client', projectInfo.clientName],
                ['Location', projectInfo.location],
                ['Project #', projectInfo.projectNumber],
                ['Bid Date', projectInfo.bidDate],
                ['Estimator', projectInfo.estimator],
                ['GC', projectInfo.gc],
                ['Architect', projectInfo.architect],
                ['Engineer', projectInfo.engineer],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-gray-400 text-xs uppercase tracking-wide font-medium">{label}</dt>
                  <dd className="text-gray-800 font-medium truncate">{val || '\u2014'}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Cost Summary Card */}
          <Card className="lg:col-span-2 overflow-x-auto">
            <CardTitle icon={DollarSign} title="Cost Summary" iconColor="text-emerald-600" />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                  <th className="text-left py-2 pr-4 font-medium">Category</th>
                  <th className="text-right py-2 px-3 font-medium">Material</th>
                  <th className="text-right py-2 px-3 font-medium">Labour</th>
                  <th className="text-right py-2 pl-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Category rows */}
                {[
                  { name: 'Structural Steel', data: costs.structCost, color: 'text-blue-600' },
                  { name: 'Misc Metals', data: costs.miscCost, color: 'text-purple-600' },
                  { name: 'Stairs', data: costs.stairsCost, color: 'text-purple-500' },
                  { name: 'Railings', data: costs.railingsCost, color: 'text-purple-500' },
                  { name: 'Ladder', data: costs.ladderCost, color: 'text-purple-500' },
                  { name: 'Joist Reinforcement', data: costs.joistCost, color: 'text-indigo-500' },
                ].map(({ name, data, color }) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className={`py-2 pr-4 font-medium ${color}`}>{name}</td>
                    <td className="py-2 px-3 text-right font-mono">${fmt(data.material)}</td>
                    <td className="py-2 px-3 text-right font-mono">${fmt(data.labour)}</td>
                    <td className="py-2 pl-3 text-right font-mono font-semibold">${fmt(data.total)}</td>
                  </tr>
                ))}

                {/* Purchased items — no material/labour split */}
                <tr className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-teal-600">Purchased Items</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">\u2014</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">\u2014</td>
                  <td className="py-2 pl-3 text-right font-mono font-semibold">${fmt(costs.purchasedTotal)}</td>
                </tr>

                {/* Soft costs */}
                <tr className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-orange-600">Soft Costs</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">\u2014</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">\u2014</td>
                  <td className="py-2 pl-3 text-right font-mono font-semibold">${fmt(costs.softTotal)}</td>
                </tr>

                {/* Equipment */}
                <tr className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-600">Equipment</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">\u2014</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">\u2014</td>
                  <td className="py-2 pl-3 text-right font-mono font-semibold">${fmt(costs.equipTotal)}</td>
                </tr>

                {/* Subtotal */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2 pr-4">Subtotal</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3" />
                  <td className="py-2 pl-3 text-right font-mono">${fmt(costs.subtotal)}</td>
                </tr>

                {/* Markup */}
                <tr className="text-gray-600 hover:bg-gray-50">
                  <td className="py-1.5 pr-4 pl-4">Markup ({fmt(costs.markupPct)}%)</td>
                  <td />
                  <td />
                  <td className="py-1.5 pl-3 text-right font-mono">${fmt(costs.markupAmt)}</td>
                </tr>

                {/* Contingency */}
                {costs.contingencyPct > 0 && (
                  <tr className="text-gray-600 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 pl-4">Contingency ({fmt(costs.contingencyPct)}%)</td>
                    <td />
                    <td />
                    <td className="py-1.5 pl-3 text-right font-mono">${fmt(costs.contingencyAmt)}</td>
                  </tr>
                )}

                {/* Escalation */}
                {costs.escalationPct > 0 && (
                  <tr className="text-gray-600 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 pl-4">Escalation ({fmt(costs.escalationPct)}%)</td>
                    <td />
                    <td />
                    <td className="py-1.5 pl-3 text-right font-mono">${fmt(costs.escalationAmt)}</td>
                  </tr>
                )}

                {/* Total Before Tax */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2 pr-4">Total Before Tax</td>
                  <td />
                  <td />
                  <td className="py-2 pl-3 text-right font-mono">${fmt(costs.totalBeforeTax)}</td>
                </tr>

                {/* HST */}
                {costs.hstPct > 0 && (
                  <tr className="text-gray-600 hover:bg-gray-50">
                    <td className="py-1.5 pr-4 pl-4">HST ({fmt(costs.hstPct)}%)</td>
                    <td />
                    <td />
                    <td className="py-1.5 pl-3 text-right font-mono">${fmt(costs.hstAmt)}</td>
                  </tr>
                )}

                {/* Grand Total */}
                <tr className="border-t-2 border-emerald-400 bg-emerald-50 font-bold text-emerald-800 text-base">
                  <td className="py-3 pr-4">Grand Total</td>
                  <td />
                  <td />
                  <td className="py-3 pl-3 text-right font-mono text-lg">${fmt(costs.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </section>

        {/* ─── Weight + Hours + Scope (3‑col on lg) ────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Weight Summary */}
          <Card>
            <CardTitle icon={Weight} title="Weight Summary" iconColor="text-blue-500" />
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-200">
                  <th className="text-left py-2 font-medium">Category</th>
                  <th className="text-right py-2 font-medium">Lbs</th>
                  <th className="text-right py-2 font-medium">Tons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: 'Structural', lbs: weights.structLbs, tons: weights.structTons, color: 'text-blue-600' },
                  { name: 'Misc Metals', lbs: weights.miscLbs, tons: weights.miscTons, color: 'text-purple-600' },
                  { name: 'Stairs', lbs: weights.stairsLbs, tons: weights.stairsLbs / 2000, color: 'text-purple-500' },
                  { name: 'Railings', lbs: weights.railingsLbs, tons: weights.railingsLbs / 2000, color: 'text-purple-500' },
                  { name: 'Ladder', lbs: weights.ladderLbs, tons: weights.ladderLbs / 2000, color: 'text-purple-500' },
                  { name: 'Joist Reinf', lbs: weights.joistLbs, tons: weights.joistLbs / 2000, color: 'text-indigo-500' },
                ].map(({ name, lbs, tons, color }) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className={`py-1.5 font-medium ${color}`}>{name}</td>
                    <td className="py-1.5 text-right font-mono">{fmtNum(lbs)}</td>
                    <td className="py-1.5 text-right font-mono">{fmt(tons)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right font-mono">{fmtNum(weights.combinedLbs)}</td>
                  <td className="py-2 text-right font-mono">{fmt(weights.combinedTons)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-md p-3 text-center">
                <p className="text-xs text-blue-500 font-medium uppercase">$/Ton</p>
                <p className="text-lg font-bold font-mono text-blue-700">${fmt(costs.allInPerTon)}</p>
              </div>
              <div className="bg-cyan-50 rounded-md p-3 text-center">
                <p className="text-xs text-cyan-500 font-medium uppercase">$/Lb</p>
                <p className="text-lg font-bold font-mono text-cyan-700">${fmt(costs.allInPerLb)}</p>
              </div>
            </div>
          </Card>

          {/* Hours Summary */}
          <Card>
            <CardTitle icon={Clock} title="Hours Summary" iconColor="text-amber-500" />
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-200">
                  <th className="text-left py-2 font-medium">Activity</th>
                  <th className="text-right py-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { name: 'Fabrication \u2014 Structural', val: hours.fabStruct, color: 'text-amber-600' },
                  { name: 'Fabrication \u2014 Misc', val: hours.fabMisc, color: 'text-amber-500' },
                  { name: 'Installation \u2014 Structural', val: hours.instStruct, color: 'text-green-600' },
                  { name: 'Installation \u2014 Misc', val: hours.instMisc, color: 'text-green-500' },
                  { name: 'Detailing / Drafting', val: hours.detailing, color: 'text-sky-600' },
                  { name: 'Project Management', val: hours.pm, color: 'text-violet-600' },
                ].map(({ name, val, color }) => (
                  <tr key={name} className="hover:bg-gray-50">
                    <td className={`py-1.5 font-medium ${color}`}>{name}</td>
                    <td className="py-1.5 text-right font-mono">{fmtNum(val)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Visual bars */}
            <div className="mt-5 space-y-3">
              {[
                { label: 'Total Fab', val: hours.totalFab, max: hours.totalLabour, color: 'bg-amber-400' },
                { label: 'Total Install', val: hours.totalInst, max: hours.totalLabour, color: 'bg-green-400' },
                { label: 'Detailing', val: hours.detailing, max: hours.totalLabour, color: 'bg-sky-400' },
                { label: 'PM', val: hours.pm, max: hours.totalLabour, color: 'bg-violet-400' },
              ].map(({ label, val, max, color }) => {
                const pct = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono">{fmtNum(val)} hrs</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                <span>Total Labour Hours</span>
                <Mono className="text-gray-900">{fmtNum(hours.totalLabour)}</Mono>
              </div>
            </div>
          </Card>

          {/* Scope Summary */}
          <Card>
            <CardTitle icon={Package} title="Scope of Work" iconColor="text-gray-500" />
            {projectInfo.scope ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50">
                {projectInfo.scope}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No scope of work entered.</p>
            )}

            <div className="mt-4">
              <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                Notes / Inclusions / Exclusions
              </h4>
              {projectInfo.notes ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-gray-100 rounded-md p-3 bg-gray-50">
                  {projectInfo.notes}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No notes entered.</p>
              )}
            </div>
          </Card>
        </section>

        {/* ─── Rates Quick-Reference ────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Labour Rates */}
          <Card>
            <CardTitle icon={Wrench} title="Labour Rates" iconColor="text-amber-500" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Fab', val: labourRates.fabRate },
                { label: 'Install', val: labourRates.installRate },
                { label: 'Drafting', val: labourRates.draftingRate },
                { label: 'PM', val: labourRates.pmRate },
                { label: 'Travel', val: labourRates.travelRate },
                { label: 'Freight', val: labourRates.freightRate },
                { label: 'Site Meas.', val: labourRates.siteMeasRate },
                { label: 'Foreman', val: labourRates.foremanRate },
                { label: 'Engineering', val: labourRates.engineeringRate },
              ].map(({ label, val }) => (
                <div key={label} className="bg-gray-50 rounded-md px-3 py-2">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="font-mono font-semibold text-gray-800">${fmt(val)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Material Rates & Markup */}
          <Card>
            <CardTitle icon={DollarSign} title="Material Rates & Markup" iconColor="text-emerald-500" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Structural ($/lb)', val: materialRates.structural },
                { label: 'Misc Metals ($/lb)', val: materialRates.miscMetals },
                { label: 'Deck ($/lb)', val: materialRates.deck },
                { label: 'Joists ($/lb)', val: materialRates.joists },
              ].map(({ label, val }) => (
                <div key={label} className="bg-gray-50 rounded-md px-3 py-2">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="font-mono font-semibold text-gray-800">${fmt(val)}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Markup', val: markupTax.markup, unit: '%' },
                { label: 'Contingency', val: markupTax.contingency, unit: '%' },
                { label: 'Escalation', val: markupTax.escalation, unit: '%' },
                { label: 'HST', val: markupTax.hst, unit: '%' },
              ].map(({ label, val, unit }) => (
                <div key={label} className="bg-emerald-50 rounded-md px-3 py-2 text-center">
                  <p className="text-xs text-emerald-500 font-medium">{label}</p>
                  <p className="font-mono font-bold text-emerald-700">
                    {fmt(val)}{unit}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ─── Row Count Summary ────────────────────────────────── */}
        <section>
          <Card>
            <CardTitle icon={Building2} title="Estimate Composition" iconColor="text-gray-500" />
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Structural', count: structural.length, color: 'bg-blue-100 text-blue-700' },
                { label: 'Misc Metals', count: miscMetals.length, color: 'bg-purple-100 text-purple-700' },
                { label: 'Stairs', count: stairs.length, color: 'bg-purple-50 text-purple-600' },
                { label: 'Railings', count: railings.length, color: 'bg-purple-50 text-purple-600' },
                { label: 'Ladder', count: ladder.length, color: 'bg-purple-50 text-purple-600' },
                { label: 'Joist Reinf', count: joistReinf.length, color: 'bg-indigo-100 text-indigo-700' },
                { label: 'Purchased', count: purchasedItems.length, color: 'bg-teal-100 text-teal-700' },
                { label: 'Soft Costs', count: softCosts.length, color: 'bg-orange-100 text-orange-700' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`rounded-md p-3 text-center ${color}`}>
                  <p className="text-2xl font-bold font-mono">{count}</p>
                  <p className="text-xs font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ─── Footer ───────────────────────────────────────────── */}
        <footer className="text-center text-xs text-gray-400 py-4">
          Triple Weld Inc. &middot; Steel Estimator Pro &middot; Generated{' '}
          {new Date().toLocaleDateString('en-CA')}
        </footer>
      </main>
    </div>
  );
}
