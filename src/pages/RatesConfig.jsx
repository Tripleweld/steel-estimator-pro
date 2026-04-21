import { useProject } from '../context/ProjectContext'
import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'

function ProjectInfoCard({ projectInfo, onChange }) {
  const fields = [
    { key: 'projectName', label: 'Project Name', type: 'text', span: 2 },
    { key: 'location', label: 'Location', type: 'text', span: 2 },
    { key: 'quoteNumber', label: 'Quote Number', type: 'text', span: 1 },
    { key: 'quoteDate', label: 'Quote Date', type: 'date', span: 1 },
    { key: 'distanceKm', label: 'Distance from Shop (km)', type: 'number', span: 1 },
    { key: 'travelHrs', label: 'Travel Time (hrs)', type: 'number', span: 1 },
    { key: 'gcClient', label: 'GC / Client', type: 'text', span: 1 },
    { key: 'engineer', label: 'Engineer', type: 'text', span: 1 },
    { key: 'drawingSet', label: 'Drawing Set', type: 'text', span: 1 },
    { key: 'drawingDate', label: 'Drawing Date', type: 'date', span: 1 },
    { key: 'buildingAreaSqft', label: 'Building Area (sqft)', type: 'number', span: 2 },
  ]

  return (
    <div className="card">
      <h2 className="section-title mb-4">Project Information</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.span === 2 ? 'sm:col-span-2' : ''}
          >
            <label className="label">
              {field.label}
            </label>
            <input
              type={field.type}
              className={field.type === 'number' ? 'input-number' : 'input-field'}
              value={projectInfo[field.key] ?? ''}
              onChange={(e) => {
                const val =
                  field.type === 'number'
                    ? parseFloat(e.target.value) || 0
                    : e.target.value
                onChange({ [field.key]: val })
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function MaterialRatesCard({ materialRates, onUpdate, onAdd, onDelete }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Material Rates (CAD)</h2>
        <button type="button" className="btn-primary" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Row
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header w-1/2">Item</th>
              <th className="table-header w-1/4 text-right">Rate</th>
              <th className="table-header w-1/6">Unit</th>
              <th className="table-header w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {materialRates.map((row) => (
              <tr key={row.id} className="table-row">
                <td className="table-cell">
                  <input
                    type="text"
                    className="input-field"
                    value={row.item}
                    onChange={(e) =>
                      onUpdate({ id: row.id, item: e.target.value })
                    }
                  />
                </td>
                <td className="table-cell">
                  <input
                    type="number"
                    step="0.01"
                    className="input-number"
                    value={row.rate}
                    onChange={(e) =>
                      onUpdate({
                        id: row.id,
                        rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="table-cell">
                  <select
                    className="input-field"
                    value={row.unit}
                    onChange={(e) =>
                      onUpdate({ id: row.id, unit: e.target.value })
                    }
                  >
                    <option value="$/lb">$/lb</option>
                    <option value="$/kg">$/kg</option>
                    <option value="$/ton">$/ton</option>
                    <option value="%">%</option>
                  </select>
                </td>
                <td className="table-cell text-center">
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => onDelete(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {materialRates.length === 0 && (
              <tr>
                <td colSpan={4} className="table-cell text-center text-silver-400 py-8">
                  No material rates defined. Click "Add Row" to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LabourRatesCard({ labourRates, onChange }) {
  const fields = [
    { key: 'fabRate', label: 'Fab Rate ($/hr)', step: '0.01' },
    { key: 'fabCrew', label: 'Fab Crew Size', step: '1' },
    { key: 'installRate', label: 'Install Rate ($/hr)', step: '0.01' },
    { key: 'installCrew', label: 'Install Crew Size', step: '1' },
    { key: 'shopFactor', label: 'Shop Safety Factor', step: '0.01' },
    { key: 'fieldFactor', label: 'Field Safety Factor', step: '0.01' },
  ]

  return (
    <div className="card">
      <h2 className="section-title mb-4">Labour Rates</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="label">
              {field.label}
            </label>
            <input
              type="number"
              step={field.step}
              className="input-number"
              value={labourRates[field.key]}
              onChange={(e) =>
                onChange({ [field.key]: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductivityCard({ productivity, onChange }) {
  return (
    <div className="card">
      <h2 className="section-title mb-4">Default Productivity Rates</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            Fab Hrs / Ton
          </label>
          <input
            type="number"
            step="0.1"
            className="input-number"
            value={productivity.fabHrsPerTon}
            onChange={(e) =>
              onChange({ fabHrsPerTon: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <label className="label">
            Install Hrs / Ton
          </label>
          <input
            type="number"
            step="0.1"
            className="input-number"
            value={productivity.installHrsPerTon}
            onChange={(e) =>
              onChange({ installHrsPerTon: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>
    </div>
  )
}

function MarkupCard({ markup, hstRate, onMarkupChange, onHstChange }) {
  return (
    <div className="card">
      <h2 className="section-title mb-4">Markup</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">
            Markup %
          </label>
          <input
            type="number"
            step="0.1"
            className="input-number"
            value={markup.percent}
            onChange={(e) =>
              onMarkupChange({ percent: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div>
          <label className="label">
            HST Rate %
          </label>
          <input
            type="number"
            step="0.1"
            className="input-number"
            value={hstRate}
            onChange={(e) => onHstChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  )
}

export default function RatesConfig() {
  const { state, dispatch } = useProject()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  function handleReset() {
    dispatch({ type: 'RESET_TO_DEFAULTS' })
    setShowResetConfirm(false)
  }

  return (
    <div className="space-y-6">
      <div className="accent-stripe" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rates & Configuration</h1>
          <p className="page-subtitle">
            Set project details, material rates, labour costs, and markup before building your estimate.
          </p>
        </div>
        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600 font-medium">Reset all data?</span>
            <button type="button" className="btn-danger" onClick={handleReset}>
              Confirm
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
        )}
      </div>

      <ProjectInfoCard
        projectInfo={state.projectInfo}
        onChange={(payload) =>
          dispatch({ type: 'SET_PROJECT_INFO', payload })
        }
      />

      <hr className="border-silver-200" />

      <MaterialRatesCard
        materialRates={state.rates.materialRates}
        onUpdate={(payload) =>
          dispatch({ type: 'SET_MATERIAL_RATE', payload })
        }
        onAdd={() => dispatch({ type: 'ADD_MATERIAL_RATE' })}
        onDelete={(id) => dispatch({ type: 'DELETE_MATERIAL_RATE', payload: id })}
      />

      <hr className="border-silver-200" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LabourRatesCard
          labourRates={state.rates.labourRates}
          onChange={(payload) =>
            dispatch({ type: 'SET_LABOUR_RATES', payload })
          }
        />

        <div className="space-y-6">
          <ProductivityCard
            productivity={state.rates.productivityDefaults}
            onChange={(payload) =>
              dispatch({ type: 'SET_PRODUCTIVITY', payload })
            }
          />

          <MarkupCard
            markup={state.rates.markup}
            hstRate={state.rates.hstRate}
            onMarkupChange={(payload) =>
              dispatch({ type: 'SET_MARKUP', payload })
            }
            onHstChange={(val) =>
              dispatch({ type: 'SET_RATES', payload: { hstRate: val } })
            }
          />
        </div>
      </div>
    </div>
  )
}
