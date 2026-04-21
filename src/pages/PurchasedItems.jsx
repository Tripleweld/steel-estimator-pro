import { useProject } from '../context/ProjectContext'
import { fmtCurrency } from '../utils/calculations'
import { Plus, Trash2, PackagePlus } from 'lucide-react'

const UNIT_OPTIONS = ['ea', 'lf', 'sf', 'ton', 'ls']

const COMMON_TEMPLATES = [
  { item: 'Open Web Steel Joists', unit: 'ea', leadWeeks: 8 },
  { item: 'Steel Deck (22ga)', unit: 'sf', leadWeeks: 6 },
  { item: 'Shear Studs', unit: 'ea', leadWeeks: 2 },
  { item: 'Grout', unit: 'ea', leadWeeks: 1 },
  { item: 'Anchor Bolts', unit: 'ea', leadWeeks: 3 },
  { item: 'Base Plate Leveling Nuts', unit: 'ea', leadWeeks: 2 },
]

export default function PurchasedItems() {
  const { state, dispatch } = useProject()
  const rows = state.purchased
  const handleUpdate = (id, field, value) => { const row = rows.find(r => r.id === id); if (!row) return; const updated = { ...row, [field]: value }; if (field === 'qty' || field === 'unitCost') { updated.total = (parseFloat(updated.qty) || 0) * (parseFloat(updated.unitCost) || 0) } dispatch({ type: 'UPDATE_PURCHASED_ROW', payload: updated }) }
  const handleAdd = () => { dispatch({ type: 'ADD_PURCHASED_ROW' }) }
  const handleDelete = (id) => { dispatch({ type: 'DELETE_PURCHASED_ROW', payload: id }) }
  const grandTotal = rows.reduce((sum, r) => sum + ((parseFloat(r.qty) || 0) * (parseFloat(r.unitCost) || 0)), 0)
  return 'UPLOADED'; })()