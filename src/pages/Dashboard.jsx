import { useProject } from '../context/ProjectContext'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Settings, Columns, Grid3X3, Footprints, Fence,
  ArrowUpFromLine as LadderIcon, Construction, ShoppingCart, Calculator,
  FileText, BarChart3, Wrench, BookOpen, CheckSquare, Square,
  AlertTriangle, TrendingUp, DollarSign, Weight, Clock, Truck
} from 'lucide-react'

const fmt = (v) => v == null || isNaN(v) ? '$0' : '$' + Number(v).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (v, d = 1) => v == null || isNaN(v) ? '0' : Number(v).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (v) => v == null || isNaN(v) ? '0%' : (Number(v) * 100).toFixed(1) + '%'

const quickActions = [
  { path: '/rates', label: 'Rates & Config', desc: 'Material rates, labour, project info', icon: Settings },
  { path: '/structural', label: 'Structural Takeoff', desc: 'Beams, columns, bracing, plates', icon: Columns },
  { path: '/misc-metals', label: 'Misc Metals', desc: 'Plates, angles, custom assemblies', icon: Grid3X3 },
  { path: '/stairs', label: 'Stairs', desc: 'OBC-compliant stair calculator', icon: Footprints },
  { path: '/railings', label: 'Railings', desc: 'Guardrails, handrails, pickets', icon: Fence },
  { path: '/ladder', label: 'Ladder', desc: 'Fixed ladders with OHSA checks', icon: LadderIcon },
  { path: '/joist-reinf', label: 'Joist Reinf.', desc: 'Bottom-chord reinforcement', icon: Construction },
  { path: '/equipment', label: 'Equipment', desc: 'Cranes, lifts, welding, rigging', icon: Truck },
  { path: '/purchased', label: 'Purchased Items', desc: 'Vendor-bought materials', icon: ShoppingCart },
  { path: '/soft-costs', label: 'Soft Costs', desc: 'Drawings, PE, travel, contingency', icon: Calculator },
  { path: '/summary', label: 'Summary', desc: 'Full cost rollup + benchmarks', icon: BarChart3 },
  { path: '/quote', label: 'Quote', desc: 'Client-facing bid document', icon: FileText },
  { path: '/manual', label: 'User Manual', desc: 'Step-by-step guide', icon: BookOpen },
]

const reviewChecklist = [
  'OWSJ pricing confirmed with supplier (not placeholder)',
  'Steel deck pricing confirmed',
  'Safety factors match project location (local vs remote)',
  'Equipment rental period and quantities verified',
  'Hotel nights and per diem match install schedule',
  'All takeoff items match drawings \u2014 no scope gaps',
  'Benchmark $/lb within target range',
  'Margin % acceptable for project risk level',
]

export default function Dashboard() {
  const { state } = useProject()
  const r = state.rates || {}
  const s = state.structural || []
  const mm = state.miscMetals || []

  // --- Compute key metrics from state ---
  const structTotalLbs = s.reduce((sum, row) => sum + (Number(row.totalLbs) || 0), 0)
  const miscTotalLbs = mm.reduce((sum, row) => sum + (Number(row.totalLbs) || 0), 0)
  const totalLbs = structTotalLbs + miscTotalLbs
  const totalTons = totalLbs / 2000

  const structFabHrs = s.reduce((sum, row) => sum + (Number(row.adjFabHrs) || 0), 0)
  const miscFabHrs = mm.reduce((sum, row) => sum + (Number(row.adjFabHrs) || 0), 0)
  const structInstHrs = s.reduce((sum, row) => sum + (Number(row.adjInstHrs) || 0), 0)
  const miscInstHrs = mm.reduce((sum, row) => sum + (Number(row.adjInstHrs) || 0), 0)
  const totalFabHrs = structFabHrs + miscFabHrs
  const totalInstHrs = structInstHrs + miscInstHrs

  const fabRate = Number(r.fabRate) || 50
  const instRate = Number(r.installRate) || 55
  const matRate = Number(r.steelRate) || 1
  const markup = Number(r.markup) || 0.15
  const hst = Number(r.hst) || 0.13
  const fabCrew = Number(r.fabCrew) || 2
  const instCrew = Number(r.installCrew) || 4

  const structMatCost = s.reduce((sum, row) => sum + (Number(row.materialCost) || 0), 0)
  const miscMatCost = mm.reduce((sum, row) => sum + (Number(row.materialCost) || 0), 0)
  const totalMatCost = structMatCost + miscMatCost

  const totalFabCost = totalFabHrs * fabRate
  const totalInstCost = totalInstHrs * instRate
  const totalLabourCost = totalFabCost + totalInstCost

  const equipTotal = Number(state.equipmentTotal) || 0
  const purchTotal = (state.purchased || []).reduce((sum, row) => sum + (Number(row.total) || 0), 0)
  const softTotal = (state.softCosts || []).reduce((sum, row) => sum + (Number(row.total) || 0), 0)

  const directCost = totalMatCost + totalLabourCost + equipTotal + purchTotal + softTotal
  const markupAmt = directCost * markup
  const subtotalExHST = directCost + markupAmt
  const hstAmt = subtotalExHST * hst
  const grandTotal = subtotalExHST + hstAmt

  // Structural vs Misc subtotals
  const structTotal = structMatCost + (structFabHrs * fabRate) + (structInstHrs * instRate)
  const miscTotal = miscMatCost + (miscFabHrs * fabRate) + (miscInstHrs * instRate)

  // Schedule
  const fabCrewWeeks = fabCrew > 0 ? totalFabHrs / (fabCrew * 40) : 0
  const instCrewWeeks = instCrew > 0 ? totalInstHrs / (instCrew * 40) : 0
  const instCrewDays = instCrewWeeks * 5

  // Benchmarks
  const dolPerLbStruct = structTotalLbs > 0 ? structTotal / structTotalLbs : 0
  const bldgArea = Number(r.buildingArea) || 0
  const dolPerSqft = bldgArea > 0 ? subtotalExHST / bldgArea : 0

  // Cost breakdown %
  const matPct = subtotalExHST > 0 ? totalMatCost / subtotalExHST : 0
  const labPct = subtotalExHST > 0 ? totalLabourCost / subtotalExHST : 0
  const softPct = subtotalExHST > 0 ? softTotal / subtotalExHST : 0
  const mkPct = subtotalExHST > 0 ? markupAmt / subtotalExHST : 0

  // Margin
  const grossProfit = subtotalExHST - directCost
  const grossMargin = subtotalExHST > 0 ? grossProfit / subtotalExHST : 0

  // Rate check
  const effFabRate = totalFabHrs > 0 ? (totalFabCost + totalMatCost) / totalFabHrs : 0
  const effInstRate = totalInstHrs > 0 ? totalInstCost / totalInstHrs : 0

  // Project status checks
  const statusItems = [
    { label: 'Rates', done: (r.steelRate || 0) > 0 },
    { label: 'Structural', done: s.length > 0 },
    { label: 'Misc Metals', done: mm.length > 0 },
    { label: 'Stairs', done: !!(state.stairs && state.stairs.f2fHeight) },
    { label: 'Railings', done: !!(state.railings && state.railings.totalLength) },
    { label: 'Equipment', done: equipTotal > 0 },
    { label: 'Purchased', done: purchTotal > 0 },
    { label: 'Soft Costs', done: softTotal > 0 },
  ]

  const MetricCard = ({ label, value, sub }) => (
    <div className="bg-steel-800/50 rounded-lg border border-steel-700/50 p-4">
      <div className="text-steel-200 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
      {sub && <div className="text-steel-300 text-xs mt-1">{sub}</div>}
    </div>
  )

  const SectionHeader = ({ icon: Icon, title, color = 'text-fire-400' }) => (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <h2 className="text-white font-semibold text-sm uppercase tracking-wider">{title}</h2>
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-8 bg-fire-500 rounded-full" />
          <span className="text-xs font-semibold tracking-widest text-fire-400 uppercase">Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-fire-400" />
          Project Dashboard
        </h1>
        <p className="text-steel-200 mt-1">
          {r.projectName || 'Untitled Project'} &mdash; Quote: {r.quoteNumber || 'TW--'}
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Grand Total (incl. HST)" value={fmt(grandTotal)} sub={`excl. HST: ${fmt(subtotalExHST)}`} />
        <MetricCard label="Total Steel" value={`${fmtN(totalTons)} tons`} sub={`${fmtN(totalLbs, 0)} lbs`} />
        <MetricCard label="Fab Hours" value={fmtN(totalFabHrs)} sub={`${fmtN(fabCrewWeeks)} crew-weeks`} />
        <MetricCard label="Install Hours" value={fmtN(totalInstHrs)} sub={`${fmtN(instCrewWeeks)} crew-weeks`} />
      </div>

      {/* Main grid: Key Metrics + Benchmarks / Cost Breakdown + Margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* KEY METRICS */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={DollarSign} title="Key Metrics" />
          <div className="space-y-2 text-sm">
            {[
              ['Combined Total (excl. HST)', fmt(subtotalExHST)],
              ['Combined Grand Total (incl. HST)', fmt(grandTotal)],
              ['Structural Total', fmt(structTotal)],
              ['Misc Metals Total', fmt(miscTotal)],
              ['Markup %', pct(markup)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-steel-200">{l}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BENCHMARKS */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={TrendingUp} title="Benchmarks" color="text-green-400" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-steel-200">$/lb &mdash; Fab Steel (struct)</span>
              <span className="text-white font-medium">{fmtN(dolPerLbStruct, 2)}</span>
            </div>
            <div className="text-steel-300 text-xs pl-2">Target: $3-6/lb</div>
            <div className="flex justify-between">
              <span className="text-steel-200">$/sqft &mdash; Full Scope</span>
              <span className="text-white font-medium">{fmtN(dolPerSqft, 2)}</span>
            </div>
            <div className="text-steel-300 text-xs pl-2">Varies by project</div>
          </div>
        </div>

        {/* WEIGHT & HOURS */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={Weight} title="Weight & Hours" color="text-blue-400" />
          <div className="space-y-2 text-sm">
            {[
              ['Total Structural Weight', `${fmtN(structTotalLbs, 0)} lbs`],
              ['Total Misc Metals Weight', `${fmtN(miscTotalLbs, 0)} lbs`],
              ['Total Adj Fab Hours', fmtN(totalFabHrs)],
              ['Total Adj Install Hours', fmtN(totalInstHrs)],
              ['Total Labour Cost', fmt(totalLabourCost)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-steel-200">{l}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SCHEDULE ESTIMATE */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={Clock} title="Schedule Estimate" color="text-purple-400" />
          <div className="space-y-2 text-sm">
            {[
              ['Fab Crew-Weeks', fmtN(fabCrewWeeks)],
              ['Install Crew-Weeks', fmtN(instCrewWeeks)],
              ['Install Crew-Days', fmtN(instCrewDays, 0)],
              ['Fab Crew Size', fabCrew],
              ['Install Crew Size', instCrew],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-steel-200">{l}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* COST BREAKDOWN */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={BarChart3} title="Cost Breakdown" color="text-yellow-400" />
          <div className="space-y-3">
            {[
              ['Material', matPct, 'bg-blue-500'],
              ['Labour', labPct, 'bg-green-500'],
              ['Soft Costs', softPct, 'bg-purple-500'],
              ['Markup', mkPct, 'bg-fire-500'],
            ].map(([label, val, color]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-steel-200">{label}</span>
                  <span className="text-white font-medium">{pct(val)}</span>
                </div>
                <div className="w-full bg-steel-800 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(Number(val) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MARGIN ANALYSIS */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={TrendingUp} title="Margin Analysis" color="text-emerald-400" />
          <div className="space-y-2 text-sm">
            {[
              ['Revenue (combined excl. HST)', fmt(subtotalExHST)],
              ['Direct Cost (before markup)', fmt(directCost)],
              ['Gross Profit', fmt(grossProfit)],
              ['Gross Margin %', pct(grossMargin)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-steel-200">{l}</span>
                <span className={`font-medium ${l.includes('Margin') ? (grossMargin >= 0.1 ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RATE CHECK */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={Wrench} title="Rate Check" color="text-orange-400" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-steel-200">Effective Fab Rate ($/hr all-in)</span>
              <span className="text-white font-medium">{fmt(effFabRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel-200">Effective Inst Rate ($/hr all-in)</span>
              <span className="text-white font-medium">{fmt(effInstRate)}</span>
            </div>
          </div>
        </div>

        {/* PROJECT STATUS */}
        <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-5">
          <SectionHeader icon={CheckSquare} title="Project Status" color="text-cyan-400" />
          <div className="grid grid-cols-2 gap-2">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${item.done ? 'bg-green-500' : 'bg-steel-600'}`} />
                <span className={item.done ? 'text-white' : 'text-steel-300'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REVIEW CHECKLIST */}
      <div className="bg-steel-900/60 rounded-xl border border-yellow-500/30 p-5">
        <SectionHeader icon={AlertTriangle} title="Review Checklist" color="text-yellow-400" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {reviewChecklist.map((item) => (
            <label key={item} className="flex items-start gap-2 text-sm cursor-pointer group">
              <Square className="w-4 h-4 text-steel-300 mt-0.5 flex-shrink-0 group-hover:text-yellow-400" />
              <span className="text-steel-200 group-hover:text-steel-200">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.map((qa) => (
            <Link key={qa.path} to={qa.path} className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-4 hover:border-fire-500/50 hover:bg-steel-800/60 transition-all group">
              <qa.icon className="w-5 h-5 text-fire-400 mb-2 group-hover:text-fire-300" />
              <h3 className="text-white font-semibold text-sm">{qa.label}</h3>
              <p className="text-steel-300 text-xs mt-1">{qa.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
