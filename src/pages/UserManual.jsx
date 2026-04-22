import { BookOpen, CheckCircle, AlertTriangle, Info, Scale, Shield, Truck } from 'lucide-react'

const colorRows = [
  { color: 'text-blue-400', bg: '', label: 'Blue text', meaning: 'Input cells â you type values here (scenarios, dimensions, qty)' },
  { color: 'text-steel-100', bg: '', label: 'Black text', meaning: 'Formulas and calculations â do NOT type over' },
  { color: 'text-green-400', bg: '', label: 'Green text', meaning: 'Links pulling from another tab â do NOT type over' },
  { color: 'text-red-400', bg: '', label: 'Red text', meaning: 'External links or warnings' },
  { color: 'text-steel-900', bg: 'bg-yellow-400', label: 'Yellow bg', meaning: 'Key assumptions that need attention' },
]

const steps = [
  { num: 1, title: 'Rates & Config', desc: 'Open "Rates & Config" and confirm material $/lb, galv $/lb, fab & install $/hr, waste allowances, and connection hardware % match your current costs. Set project info (name, distance, building area). These rates drive every calculator in the app.' },
  { num: 2, title: 'Structural Takeoff', desc: 'Enter each beam/column/brace: Mark, Section (AISC), Qty, Length (ft). Weight, fab hours, install hours, and costs auto-populate from the AISC shapes database and your configured rates.' },
  { num: 3, title: 'Misc Metals Takeoff', desc: 'Enter piece-by-piece misc items (e.g., bent plates, anchor bolts, bollards, lintels, embed plates). Use this for anything NOT covered by the parametric calculators below.' },
  { num: 4, title: 'Parametric Calculators', desc: 'For stairs, railings, ladders, and joist reinforcement, use the dedicated pages. Each has preset dropdowns and OBC/OHSA compliance checks. Weights and hours flow into the project summary automatically.' },
  { num: 5, title: 'Equipment', desc: 'Select and configure equipment for the project: cranes, telehandlers, boom lifts, scissor lifts, forklifts, welding & power, trucks & trailers, and rigging. Set daily rates, days needed, and mobilization costs. Equipment totals feed into the project cost summary.' },
  { num: 6, title: 'Purchased Items', desc: 'Add vendor-bought items such as gratings, bollards, expansion joints, joist/deck packages, or any third-party material with qty and unit cost.' },
  { num: 7, title: 'Soft Costs', desc: 'Enter soft costs: shop drawings/detailing, P.Eng stamping, crane mobilization, equipment rental, travel, permits, insurance (%), small tools, and contingency (%). Supports both flat-rate ($) and percentage-based (%) line items.' },
  { num: 8, title: 'Summary + Quote', desc: 'Review "Summary" for the full cost breakdown â material, labour, equipment, purchased, soft costs, markup, HST, $/ton, $/lb, and $/sqft benchmarks. Open "Quote" for the client-facing bid document. Export to PDF when ready to send.' },
]

const pages = [
  { name: 'DASHBOARD', desc: 'Project overview showing total steel tonnage, fab hours, install hours, and grand total. Quick-action cards link to each section. Status indicators show which sections have data entered.' },
  { name: 'RATES & CONFIG', desc: 'Central configuration for all rates: material ($/lb for structural, misc, galvanized), labour (fab, install, foreman, travel, drafting, PM, engineering), safety allowances, and markup percentage. Also holds project info (name, quote number, distance, building area).' },
  { name: 'STRUCTURAL TAKEOFF', desc: '34-column layout matching the Excel. Enter AISC shapes with mark, section, grade, qty, length. Auto-lookup populates weight/ft, area, moment of inertia. Calculates total weight, material cost, fab hours, and install hours per member.' },
  { name: 'MISC METALS TAKEOFF', desc: 'Itemized entry for miscellaneous steel: plates, angles, channels, custom assemblies. Each row captures mark, description, qty, dimensions, weight, and calculates fab/install hours and costs.' },
  { name: 'STAIRS', desc: 'OBC 3.4-compliant stair calculator. Enter floor-to-floor height (mm), stair width, number of flights, and landing depth. Auto-calculates risers, treads, stringer length, guardrail posts, and total weight. Compliance checks flag violations in real time.' },
  { name: 'RAILINGS', desc: 'Select type (Guardrail / Handrail / Wall-Mounted / Intermediate Rail). Enter run length (lnft) and height (mm). Picket count auto-calculated using â¤100 mm spacing per OBC. Choose Galvanized or Mild Steel finish. Weight, fab hours, and install hours auto-populate.' },
  { name: 'LADDER', desc: 'Enter total height (mm). If >6 m, OHSA requires a safety cage â the calculator auto-adds cage material and extra install hours. Extension above landing (3.5 ft) and wall offset (min 7â³) are flagged in compliance checks.' },
  { name: 'JOIST REINF.', desc: 'Five reinforcement blocks (JR1âJR5) for bottom-chord or bearing reinforcement on open-web steel joists. Each takes: qty, plate size, angle size, bolts, welding lf. Shared costs (shoring equipment, scissor lift) applied once across all blocks.' },
  { name: 'EQUIPMENT', desc: '35 pre-loaded equipment items across 8 categories: Cranes (30Tâ100T RT, crawler), Telehandlers (6Kâ12K), Boom Lifts (40â135 ft), Scissor Lifts (19â40 ft), Forklifts (5Kâ15K), Welding & Power (welders, generators, compressors), Trucks & Trailers (flatbed, lowboy, pickup), Rigging & Misc (spreader bars, shackles, come-alongs). Set daily rate, days, and mob/demob per item.' },
  { name: 'PURCHASED ITEMS', desc: 'Line items for any vendor-bought material: gratings, bollards, expansion joints, joist/deck packages, anchor bolts, shear studs. Enter description, qty, unit, and unit cost. Total flows to project summary.' },
  { name: 'SOFT COSTS', desc: '9 pre-populated rows: Shop Drawings, Engineering (P.Eng), Crane Mobilization, Equipment Rental, Travel, Permits & Fees, Insurance (%), Small Tools, and Contingency (%). Supports both flat-rate and percentage-based items. Percentage items calculate against the base subtotal.' },
  { name: 'SUMMARY', desc: 'Full project cost roll-up: structural weight, misc weight, total tonnage, material costs, fab & install labour, travel, purchased items, soft costs, markup, HST. Benchmark metrics: $/ton, $/lb, $/sqft. Sanity-check against GTA market ranges.' },
  { name: 'QUOTE', desc: 'Client-facing bid document with Triple Weld branding. Shows scope of work, itemized pricing, inclusions/exclusions, terms & conditions, and signature block. Ready for PDF export.' },
]

const troubleshooting = [
  { issue: 'Galvanizing is $0', fix: 'The galvanized finish only calculates cost if the "Finish" dropdown = Galvanized. Check the finish selector in each calculator.' },
  { issue: 'Compliance warning in red', fix: 'OBC or OHSA check failed. Read the code requirement and adjust your inputs (e.g., reduce rise, add landing, lower handrail, add cage).' },
  { issue: 'Profile shows 0 lb/ft', fix: 'The section name does not match the AISC database. Copy the exact designation from the Section Library or use the preset dropdown.' },
  { issue: 'Total seems too low', fix: 'Check waste allowance (Rates & Config), complexity factor, and that galvanizing is toggled correctly. Also verify Equipment and Soft Costs are filled in.' },
  { issue: 'Equipment costs not showing', fix: 'Equipment items must have both a daily rate and number of days entered. Check that the items you need are toggled on (days > 0).' },
  { issue: 'Soft cost % items show $0', fix: 'Percentage-based soft costs (Insurance, Contingency) calculate against the base subtotal. If no material/labour is entered yet, the base is $0.' },
  { issue: 'Something looks broken', fix: 'Do not delete rows or override formula cells. Use the presets/dropdowns only. Contact support at gustavo@tripleweld.com.' },
]

const codes = [
  { code: 'OBC 3.4 â Stairs', detail: 'Rise â¤ 180 mm Â· Run â¥ 255 mm Â· Max 12 risers without landing Â· Handrail height 865â1065 mm Â· Stringer depth â¥ 200 mm for service stairs' },
  { code: 'OBC 3.4 â Guardrails', detail: 'Height â¥ 1067 mm Â· Baluster spacing â¤ 100 mm Â· Must resist 0.75 kN/m horizontal load' },
  { code: 'OHSA â Fixed Ladders', detail: 'Rung spacing 300 mm Â· Side rails 400 mm apart Â· Cage required above 6 m height Â· Extension â¥ 1070 mm (3.5 ft) above landing Â· Wall offset min 178 mm (7â³)' },
  { code: 'CSA W59 / CWB', detail: 'All welds per CSA W59. Triple Weld is CWB Div 2.1 certified for structural steel welding.' },
  { code: 'AISC 360', detail: 'Member selection references AISC 15th edition shapes database.' },
  { code: 'CSA S16', detail: 'Design of steel structures â governs member sizing, connection design, and stability requirements.' },
  { code: 'CSA G40.20/G40.21', detail: 'Steel grades: 300W (general), 350W (heavy structural), 350WT (notch-tough for seismic/cold).' },
]

export default function UserManual() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-8 bg-fire-500 rounded-full" />
          <span className="text-xs font-semibold tracking-widest text-fire-400 uppercase">Reference</span>
        </div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-fire-400" />
          User Manual
        </h1>
        <p className="text-steel-400 mt-1">Steel Estimator Pro â Version 3.0 Â· April 2026</p>
      </div>

      {/* Color Coding */}
      <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-fire-500/20 border border-fire-500/40" />
          Color Coding Conventions
        </h2>
        <div className="space-y-2">
          {colorRows.map((r) => (
            <div key={r.label} className="flex items-center gap-4">
              <span className={`font-mono text-sm font-bold w-28 ${r.color} ${r.bg} ${r.bg ? 'px-2 py-0.5 rounded' : ''}`}>{r.label}</span>
              <span className="text-steel-300 text-sm">{r.meaning}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Recommended Workflow (8 Steps)
        </h2>
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.num} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-fire-500/20 border border-fire-500/40 flex items-center justify-center text-fire-400 font-bold text-sm">
                {s.num}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{s.title}</h3>
                <p className="text-steel-400 text-sm mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page-by-Page Guide */}
      <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Page-by-Page Guide
        </h2>
        <div className="space-y-3">
          {pages.map((p) => (
            <div key={p.name} className="border-l-2 border-fire-500/30 pl-4">
              <h3 className="text-fire-400 font-bold text-sm tracking-wide">{p.name}</h3>
              <p className="text-steel-400 text-sm mt-0.5 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Troubleshooting &amp; Tips
        </h2>
        <div className="space-y-3">
          {troubleshooting.map((t) => (
            <div key={t.issue} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-yellow-500/70" />
              </div>
              <div>
                <span className="text-white font-semibold text-sm">{t.issue}</span>
                <span className="text-steel-400 text-sm"> â {t.fix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Reference */}
      <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-400" />
          Code Reference Summary
        </h2>
        <div className="space-y-3">
          {codes.map((c) => (
            <div key={c.code} className="border-l-2 border-steel-600 pl-4">
              <h3 className="text-white font-semibold text-sm">{c.code}</h3>
              <p className="text-steel-400 text-sm mt-0.5">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* License */}
      <div className="bg-steel-900/60 rounded-xl border border-steel-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-steel-400" />
          License Agreement
        </h2>
        <div className="space-y-2 text-sm text-steel-400">
          <p><span className="text-white font-semibold">Grant:</span> This application is licensed (not sold) to the licensee for internal business use only.</p>
          <p><span className="text-white font-semibold">Restrictions:</span> You may not: (a) redistribute, share, or resell; (b) remove copyright or branding; (c) reverse-engineer formulas; (d) use for third-party consulting without written permission.</p>
          <p><span className="text-white font-semibold">Updates:</span> Minor version updates (3.x) included for 12 months from purchase. Major upgrades (4.x) at discounted rate.</p>
          <p><span className="text-white font-semibold">Warranty:</span> Provided "as-is". Triple Weld Inc. is not liable for errors in estimates or bids produced using this tool. User is responsible for verifying all quantities and prices before submitting quotes.</p>
          <p><span className="text-white font-semibold">Support:</span> Email gustavo@tripleweld.com â response within 2 business days for bug reports and technical questions.</p>
        </div>
      </div>
    </div>
  )
}
