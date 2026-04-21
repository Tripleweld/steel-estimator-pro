import { useProject } from '../context/ProjectContext'
import { calcProjectSummary, fmtCurrency, fmtNumber, fmtPercent } from '../utils/calculations'
import { useMemo } from 'react'
import {
  Weight,
  Clock,
  Wrench,
  HardHat,
  Package,
  Truck,
  PenTool,
  ShoppingCart,
  FileText,
  DollarSign,
} from 'lucide-react'

/* ── Reusable line-item row ── */
function LineItem({ label, value, bold, indent, muted }) {
  return (
    <div
      className={`flex items-center justify-between text-sm
        ${indent ? 'pl-4' : ''}
        ${bold ? 'font-semibold pt-2 mt-2' : ''}
        ${muted ? 'text-silver-400' : 'text-steel-800'}`}
    >
      <span className={muted ? '' : 'label-text'}>{label}</span>
      <span className={`currency ${bold ? 'text-steel-900' : ''}`}>{value}</span>
    </div>
  )
}

/* ── Cost-breakdown card ── */
function CostCard({ icon: Icon, title, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-fire-600" />
        <h3 className="section-title text-base">{title}</h3>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

export default function Summary() {
  const { state } = useProject()
  const s = useMemo(() => calcProjectSummary(state), [state])

  const { projectInfo, rates } = state
  const totalStructuralTons = s.totalStructuralWt / 2000
  const totalMiscTons = s.totalMiscWt / 2000

  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div>
        <h1 className="page-title">Project Summary</h1>
        <p className="page-subtitle">
          {projectInfo.projectName || 'Untitled Project'}
          {projectInfo.quoteNumber ? ` — Quote ${projectInfo.quoteNumber}` : ''}
        </p>
      </div>

      {/* ─── Grand Total Banner ─── */}
      <div className="rounded-xl overflow-hidden shadow-lg">
        <div className="accent-stripe" />
        <div className="bg-steel-900 px-8 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-silver-400 mb-2">
            Grand Total
          </p>
          <p className="text-5xl font-extrabold font-mono tabular-nums tracking-tight text-white">
            {fmtCurrency(s.grandTotal)}
          </p>
          <div className="flex items-center gap-8 mt-4">
            <span className="font-mono tabular-nums tracking-tight text-fire-400 text-sm">
              <span className="text-silver-500 mr-1">$/Ton</span>
              {fmtCurrency(s.pricePerTon)}
            </span>
            <span className="font-mono tabular-nums tracking-tight text-fire-400 text-sm">
              <span className="text-silver-500 mr-1">$/lb</span>
              {fmtCurrency(s.pricePerLb)}
            </span>
            <span className="font-mono tabular-nums tracking-tight text-fire-400 text-sm">
              <span className="text-silver-500 mr-1">$/sqft</span>
              {fmtCurrency(s.pricePerSqft)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3 Stat Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Steel */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-steel-800 text-fire-400">
              <Weight className="h-5 w-5" />
            </div>
            <div>
              <p className="label mb-0">Total Steel</p>
              <p className="number-big">
                {fmtNumber(s.totalWeightTons, 2)}{' '}
                <span className="text-sm font-normal text-silver-400">tons</span>
              </p>
              <p className="text-xs text-silver-400 mt-0.5">
                Structural {fmtNumber(totalStructuralTons, 2)}t &middot; Misc {fmtNumber(totalMiscTons, 2)}t
              </p>
            </div>
          </div>
        </div>

        {/* Total Fab Hours */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-steel-800 text-fire-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="label mb-0">Total Fab Hours</p>
              <p className="number-big">
                {fmtNumber(s.totalFabHrs, 1)}{' '}
                <span className="text-sm font-normal text-silver-400">hrs</span>
              </p>
            </div>
          </div>
        </div>

        {/* Total Install Hours */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-steel-800 text-fire-400">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <p className="label mb-0">Total Install Hours</p>
              <p className="number-big">
                {fmtNumber(s.totalInstHrs, 1)}{' '}
                <span className="text-sm font-normal text-silver-400">hrs</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Cost Breakdown (2-col grid) ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Materials */}
        <CostCard icon={Package} title="Materials">
          <LineItem
            label="Structural steel (waste + connections)"
            value={fmtCurrency(s.structuralMaterialCost)}
            indent
          />
          <LineItem
            label="Misc metals (waste)"
            value={fmtCurrency(s.miscMaterialCost)}
            indent
          />
          <div className="divider" />
          <LineItem label="Total Materials" value={fmtCurrency(s.totalMaterialCost)} bold />
        </CostCard>

        {/* Labour */}
        <CostCard icon={Wrench} title="Labour">
          <LineItem
            label={`Shop fabrication (${fmtNumber(s.totalFabHrs, 1)} hrs)`}
            value={fmtCurrency(s.fabLabourCost)}
            indent
          />
          <LineItem
            label={`Field install (${fmtNumber(s.totalInstHrs, 1)} hrs)`}
            value={fmtCurrency(s.installLabourCost)}
            indent
          />
          <LineItem label="Travel labour" value={fmtCurrency(s.travelLabourCost)} indent />
          <div className="divider" />
          <LineItem label="Total Labour" value={fmtCurrency(s.totalLabourCost)} bold />
        </CostCard>

        {/* Travel & Freight */}
        <CostCard icon={Truck} title="Travel & Freight">
          <LineItem label="Freight" value={fmtCurrency(0)} indent muted />
          <LineItem label="Hotel" value={fmtCurrency(0)} indent muted />
          <LineItem label="Per diem" value={fmtCurrency(0)} indent muted />
          <div className="divider" />
          <LineItem label="Total Travel" value={fmtCurrency(s.travelLabourCost)} bold />
        </CostCard>

        {/* Engineering & Drawings */}
        <CostCard icon={PenTool} title="Engineering & Drawings">
          {state.softCosts
            .filter(c =>
              c.item.toLowerCase().includes('drawing') ||
              c.item.toLowerCase().includes('engineer') ||
              c.item.toLowerCase().includes('p.eng') ||
              c.item.toLowerCase().includes('site visit')
            )
            .map(c => (
              <LineItem
                key={c.id}
                label={`${c.item}${c.unit === 'hrs' ? ` (${fmtNumber(c.qty)} hrs)` : ''}`}
                value={c.unit === '%' ? `${c.rate}%` : fmtCurrency(c.qty * c.rate)}
                indent
              />
            ))
          }
          <div className="divider" />
          {(() => {
            const engItems = state.softCosts.filter(c =>
              c.item.toLowerCase().includes('drawing') ||
              c.item.toLowerCase().includes('engineer') ||
              c.item.toLowerCase().includes('p.eng') ||
              c.item.toLowerCase().includes('site visit')
            )
            const engTotal = engItems.reduce((sum, c) => {
              if (c.unit === '%') return sum
              return sum + (c.qty * c.rate)
            }, 0)
            return <LineItem label="Total Engineering" value={fmtCurrency(engTotal)} bold />
          })()}
        </CostCard>

        {/* Purchased Items */}
        <CostCard icon={ShoppingCart} title="Purchased Items">
          {state.purchased.map(p => (
            <LineItem
              key={p.id}
              label={`${p.item || 'Unnamed'} (${p.qty} ${p.unit})`}
              value={fmtCurrency(p.qty * p.unitCost)}
              indent
            />
          ))}
          {state.purchased.length === 0 && (
            <p className="text-sm text-silver-400 italic">No purchased items</p>
          )}
          <div className="divider" />
          <LineItem label="Total Purchased" value={fmtCurrency(s.purchasedTotal)} bold />
        </CostCard>

        {/* Soft Costs */}
        <CostCard icon={FileText} title="Soft Costs">
          <LineItem label="Flat-rate items" value={fmtCurrency(s.softCostFlat)} indent />
          <LineItem label="Percentage items (applied to subtotal)" value={fmtCurrency(s.softCostPercent)} indent />
          <div className="divider" />
          <LineItem label="Total Soft Costs" value={fmtCurrency(s.softCostTotal)} bold />
        </CostCard>
      </div>

      {/* ─── Quote Total Card ─── */}
      <div className="card border-2 border-silver-400">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-fire-600" />
          <h3 className="section-title">Quote Total</h3>
        </div>

        <div className="space-y-2 max-w-md ml-auto">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-sm text-steel-800">
            <span>Subtotal</span>
            <span className="currency">{fmtCurrency(s.subtotal)}</span>
          </div>

          {/* Markup */}
          <div className="flex items-center justify-between text-sm text-steel-800">
            <span>Markup ({fmtPercent(s.markupPercent)})</span>
            <span className="currency">{fmtCurrency(s.markupAmount)}</span>
          </div>

          {/* Bid Price */}
          <div className="flex items-center justify-between text-sm font-bold text-fire-600 pt-1">
            <span>Bid Price</span>
            <span className="currency">{fmtCurrency(s.bidPrice)}</span>
          </div>

          {/* HST */}
          <div className="flex items-center justify-between text-sm text-steel-800">
            <span>HST 13%</span>
            <span className="currency">{fmtCurrency(s.hstAmount)}</span>
          </div>

          {/* GRAND TOTAL */}
          <div className="rounded-lg bg-steel-900 text-white flex items-center justify-between px-4 py-3 mt-3">
            <span className="text-lg font-extrabold tracking-tight">GRAND TOTAL</span>
            <span className="text-2xl font-extrabold font-mono tabular-nums tracking-tight">
              {fmtCurrency(s.grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
