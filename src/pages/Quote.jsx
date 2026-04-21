import { useProject } from '../context/ProjectContext'
import { calcProjectSummary, fmtCurrency, fmtNumber, fmtPercent } from '../utils/calculations'
import { useMemo } from 'react'
import { Printer } from 'lucide-react'

export default function Quote() {
  const { state } = useProject()
  const s = useMemo(() => calcProjectSummary(state), [state])
  const { projectInfo } = state

  const handlePrint = () => {
    window.print()
  }

  const lineItems = [
    {
      label: 'Structural Steel',
      desc: `${fmtNumber(s.totalStructuralWt / 2000, 2)} tons incl. waste & connections`,
      amount: s.structuralMaterialCost,
    },
    {
      label: 'Miscellaneous Metals',
      desc: `${fmtNumber(s.totalMiscWt / 2000, 2)} tons incl. stairs, railings, misc`,
      amount: s.miscMaterialCost,
    },
    {
      label: 'Labour (Fabrication + Installation + Travel)',
      desc: `Shop ${fmtNumber(s.totalFabHrs, 1)} hrs + Field ${fmtNumber(s.totalInstHrs, 1)} hrs`,
      amount: s.totalLabourCost,
    },
    ...(s.purchasedTotal > 0
      ? [{
          label: 'Purchased Items',
          desc: 'Joists, deck, fasteners, grout, etc.',
          amount: s.purchasedTotal,
        }]
      : []),
    {
      label: 'Equipment & Soft Costs',
      desc: 'Engineering, crane, permits, insurance, contingency',
      amount: s.softCostTotal,
    },
  ]

  return (
    <div className="space-y-6">

      {/* ─── Screen-only header ─── */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="page-title">Quote</h1>
          <p className="page-subtitle">
            Professional print-ready quote for this project.
          </p>
        </div>
        <button onClick={handlePrint} className="btn-primary">
          <Printer className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* ─── Printable Quote Document ─── */}
      <div className="card shadow-lg print:shadow-none print:border-0 print:p-0 print:m-0">
        <div className="max-w-[800px] mx-auto print:max-w-none">

          {/* Orange accent stripe */}
          <div className="accent-stripe mb-6" />

          {/* ─── Company Header ─── */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-3">
              {/* TW logo mark */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-fire-600 to-fire-400 flex items-center justify-center shadow-sm">
                <span className="text-white font-extrabold text-lg tracking-tighter">TW</span>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-steel-900 tracking-tight">
                  Triple Weld Inc.
                </h2>
                <div className="mt-1 text-xs text-silver-500 space-y-0.5">
                  <p>123 Industrial Drive, Toronto, ON</p>
                  <p>(416) 555-0199 &middot; estimating@tripleweld.ca</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-extrabold text-fire-600 tracking-wider">QUOTE</h3>
              <div className="mt-1 text-sm text-steel-800 space-y-0.5">
                <p>
                  <span className="text-silver-500">Quote #</span>{' '}
                  <span className="font-semibold">{projectInfo.quoteNumber}</span>
                </p>
                <p>
                  <span className="text-silver-500">Date</span>{' '}
                  <span className="font-semibold">
                    {projectInfo.quoteDate || new Date().toISOString().split('T')[0]}
                  </span>
                </p>
                <p className="text-xs text-silver-400 mt-1">HST# 12345 6789 RT0001</p>
              </div>
            </div>
          </div>

          {/* ─── Project / Client Info ─── */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="label">Project</h4>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-steel-900">
                  {projectInfo.projectName || 'Untitled Project'}
                </p>
                {projectInfo.location && (
                  <p className="text-silver-500">{projectInfo.location}</p>
                )}
                {projectInfo.drawingSet && (
                  <p className="text-silver-400 text-xs">Dwg: {projectInfo.drawingSet}</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="label">Client / Engineer</h4>
              <div className="text-sm space-y-1">
                {projectInfo.gcClient ? (
                  <p className="font-semibold text-steel-900">{projectInfo.gcClient}</p>
                ) : (
                  <p className="text-silver-400 italic">Client TBD</p>
                )}
                {projectInfo.engineer && (
                  <p className="text-silver-500">Engineer: {projectInfo.engineer}</p>
                )}
              </div>
            </div>
          </div>

          {/* ─── Scope Summary ─── */}
          {s.totalWeightTons > 0 && (
            <div className="bg-steel-50 rounded-lg px-4 py-3 mb-6 text-sm text-steel-800 print:bg-gray-100">
              <span className="font-semibold">Scope:</span>{' '}
              Supply and install approx. {fmtNumber(s.totalWeightTons, 2)} tons of structural and
              miscellaneous steel as per referenced drawings.
            </div>
          )}

          {/* ─── Line Items Table ─── */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-steel-800">
                <th className="text-left py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-white rounded-tl-lg">
                  Description
                </th>
                <th className="text-right py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-white w-[160px] rounded-tr-lg">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr
                  key={item.label}
                  className={`border-b border-silver-100 ${
                    idx % 2 === 1 ? 'bg-steel-50/50' : 'bg-white'
                  }`}
                >
                  <td className="py-3 px-3 text-steel-800">
                    {item.label}
                    <span className="block text-xs text-silver-400 mt-0.5">
                      {item.desc}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums tracking-tight text-steel-900">
                    {fmtCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ─── Totals ─── */}
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm text-steel-800">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums tracking-tight">{fmtCurrency(s.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-steel-800">
              <span>Markup ({fmtPercent(s.markupPercent)})</span>
              <span className="font-mono tabular-nums tracking-tight">{fmtCurrency(s.markupAmount)}</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-sm font-bold text-fire-600">
              <span>Bid Price</span>
              <span className="font-mono tabular-nums tracking-tight">{fmtCurrency(s.bidPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-steel-800">
              <span>HST ({s.hstRate}%)</span>
              <span className="font-mono tabular-nums tracking-tight">{fmtCurrency(s.hstAmount)}</span>
            </div>
            <div className="rounded-lg bg-steel-900 text-white flex items-center justify-between px-4 py-3 mt-3">
              <span className="text-lg font-extrabold tracking-tight">GRAND TOTAL</span>
              <span className="text-2xl font-extrabold font-mono tabular-nums tracking-tight">
                {fmtCurrency(s.grandTotal)}
              </span>
            </div>
          </div>

          {/* ─── Terms & Conditions ─── */}
          <div className="mt-10 border-t border-silver-200 pt-6">
            <h4 className="label mb-3">Terms &amp; Conditions</h4>
            <ol className="text-xs text-silver-500 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>This quotation is valid for 30 days from the date shown above.</li>
              <li>
                Prices are based on current material costs and are subject to adjustment for material
                price escalation beyond 30 days.
              </li>
              <li>
                Payment terms: 10% deposit upon acceptance, progress billings monthly, balance net 30
                days from completion.
              </li>
              <li>
                Scope is limited to structural and miscellaneous steel as described above. Any changes
                or additions will be quoted separately.
              </li>
              <li>
                This quote excludes: concrete, masonry, fireproofing, painting (unless specified),
                and work by other trades.
              </li>
              <li>
                Triple Weld Inc. carries $5M general liability and $5M professional liability
                insurance. Certificates available upon request.
              </li>
              <li>
                Fabrication and delivery schedule to be confirmed upon receipt of approved shop
                drawings and engineering review.
              </li>
              <li>
                All work to comply with Ontario Building Code (OBC), CSA S16, and CISC standards.
              </li>
            </ol>
          </div>

          {/* ─── Signature Block ─── */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-semibold text-steel-900 mb-8">Triple Weld Inc.</p>
              <div className="border-t border-silver-400 pt-2">
                <p className="text-silver-500 text-xs">Authorized Signature</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-steel-900 mb-8">Accepted By:</p>
              <div className="border-t border-silver-400 pt-2">
                <p className="text-silver-500 text-xs">Signature / Date</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Print Styles ─── */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, .sidebar, header, .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; max-width: none !important; }
          .card { box-shadow: none !important; border: none !important; padding: 0 !important; }
          @page {
            margin: 0.75in;
            size: letter;
          }
        }
      `}</style>
    </div>
  )
}
