import { createContext, useContext, useReducer, useCallback } from 'react'

const ProjectContext = createContext(null)

// Generate quote number: TW01-XXX-26
function generateQuoteNumber() {
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  const yr = String(new Date().getFullYear()).slice(-2)
  return `TW01-${seq}-${yr}`
}

const defaultRates = {
  materialRates: [
    { id: 1, item: 'Structural steel', rate: 1.20, unit: '$/lb' },
    { id: 2, item: 'Galvanized steel', rate: 1.50, unit: '$/lb' },
    { id: 3, item: 'Stainless steel', rate: 3.00, unit: '$/lb' },
    { id: 4, item: 'Miscellaneous steel', rate: 1.30, unit: '$/lb' },
    { id: 5, item: 'Connection material (3%)', rate: 0.03, unit: '%' },
    { id: 6, item: 'Waste allowance (5%)', rate: 0.05, unit: '%' },
  ],
  labourRates: {
    fabRate: 60,        // $/hr shop fabrication
    fabCrew: 2,         // crew size
    installRate: 75,    // $/hr field install
    installCrew: 4,     // crew size
    shopFactor: 1.10,   // safety factor 10%
    fieldFactor: 1.10,  // safety factor 10%
  },
  productivityDefaults: {
    fabHrsPerTon: 10,
    installHrsPerTon: 8,
  },
  markup: {
    percent: 15,
  },
  hstRate: 13,
}

const defaultProjectInfo = {
  projectName: '',
  location: '',
  quoteNumber: generateQuoteNumber(),
  quoteDate: new Date().toISOString().split('T')[0],
  distanceKm: 0,
  travelHrs: 0,
  gcClient: '',
  engineer: '',
  drawingSet: '',
  drawingDate: '',
  buildingAreaSqft: 0,
}

const defaultState = {
  projectInfo: { ...defaultProjectInfo },
  rates: { ...defaultRates },
  structural: [],
  miscMetals: [],
  stairs: {
    floorHeight: 3600,
    stairWidth: 1100,
    flights: 1,
    landingDepth: 1200,
    material: 'Structural steel',
  },
  railings: [],
  ladder: [],
  joistReinf: [],
  purchased: [],
  softCosts: [
    { id: 1, item: 'Shop Drawings / Detailing', qty: 160, unit: 'hrs', rate: 65, notes: '' },
    { id: 2, item: 'Engineering Review', qty: 1, unit: 'ls', rate: 6000, notes: 'P.Eng stamp' },
    { id: 3, item: 'Crane Mobilization', qty: 1, unit: 'ls', rate: 3500, notes: '' },
    { id: 4, item: 'Equipment Rental', qty: 1, unit: 'ls', rate: 0, notes: 'See Equipment tab' },
    { id: 5, item: 'Travel & Accommodation', qty: 1, unit: 'ls', rate: 0, notes: 'See Travel & Freight' },
    { id: 6, item: 'Permits & Inspections', qty: 1, unit: 'ls', rate: 1500, notes: '' },
    { id: 7, item: 'Insurance', qty: 1, unit: '%', rate: 1.5, notes: '% of contract' },
    { id: 8, item: 'Small Tools & Consumables', qty: 1, unit: 'ls', rate: 1200, notes: '' },
    { id: 9, item: 'Contingency', qty: 1, unit: '%', rate: 5, notes: '% of subtotal' },
  ],
  isDirty: false,
}

function projectReducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECT_INFO':
      return { ...state, projectInfo: { ...state.projectInfo, ...action.payload }, isDirty: true }
    case 'SET_RATES':
      return { ...state, rates: { ...state.rates, ...action.payload }, isDirty: true }
    case 'SET_MATERIAL_RATE': {
      const materialRates = state.rates.materialRates.map(r =>
        r.id === action.payload.id ? { ...r, ...action.payload } : r
      )
      return { ...state, rates: { ...state.rates, materialRates }, isDirty: true }
    }
    case 'ADD_MATERIAL_RATE': {
      const newId = Math.max(0, ...state.rates.materialRates.map(r => r.id)) + 1
      return { ...state, rates: { ...state.rates, materialRates: [...state.rates.materialRates, { id: newId, item: '', rate: 0, unit: '$/lb' }] }, isDirty: true }
    }
    case 'DELETE_MATERIAL_RATE':
      return { ...state, rates: { ...state.rates, materialRates: state.rates.materialRates.filter(r => r.id !== action.payload) }, isDirty: true }
    case 'SET_LABOUR_RATES':
      return { ...state, rates: { ...state.rates, labourRates: { ...state.rates.labourRates, ...action.payload } }, isDirty: true }
    case 'SET_PRODUCTIVITY':
      return { ...state, rates: { ...state.rates, productivityDefaults: { ...state.rates.productivityDefaults, ...action.payload } }, isDirty: true }
    case 'SET_MARKUP':
      return { ...state, rates: { ...state.rates, markup: { ...state.rates.markup, ...action.payload } }, isDirty: true }
    case 'SET_STRUCTURAL':
      return { ...state, structural: action.payload, isDirty: true }
    case 'ADD_STRUCTURAL_ROW': {
      const newId = Date.now()
      return { ...state, structural: [...state.structural, { id: newId, mark: '', description: '', shape: '', qty: 1, length: 0, wtPerFt: 0, totalWt: 0, fabHrsPerTon: state.rates.productivityDefaults.fabHrsPerTon, totalFabHrs: 0, instHrsPerTon: state.rates.productivityDefaults.installHrsPerTon, totalInstHrs: 0, notes: '' }], isDirty: true }
    }
    case 'UPDATE_STRUCTURAL_ROW': {
      const structural = state.structural.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, structural, isDirty: true }
    }
    case 'DELETE_STRUCTURAL_ROW':
      return { ...state, structural: state.structural.filter(r => r.id !== action.payload), isDirty: true }
    case 'SET_MISC_METALS':
      return { ...state, miscMetals: action.payload, isDirty: true }
    case 'ADD_MISC_METAL_ROW': {
      const newId = Date.now()
      return { ...state, miscMetals: [...state.miscMetals, { id: newId, category: '', mark: '', description: '', shape: '', qty: 1, unitWt: 0, totalWt: 0, unitCost: 0, totalCost: 0, fabHrs: 0, instHrs: 0, notes: '' }], isDirty: true }
    }
    case 'UPDATE_MISC_METAL_ROW': {
      const miscMetals = state.miscMetals.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, miscMetals, isDirty: true }
    }
    case 'DELETE_MISC_METAL_ROW':
      return { ...state, miscMetals: state.miscMetals.filter(r => r.id !== action.payload), isDirty: true }
    case 'SET_STAIRS':
      return { ...state, stairs: { ...state.stairs, ...action.payload }, isDirty: true }
    case 'ADD_RAILING_ROW': {
      const newId = Date.now()
      return { ...state, railings: [...state.railings, { id: newId, location: '', type: 'Guard', heightMm: 1070, lengthFt: 0, posts: 0, material: 'Structural steel', weightLbs: 0, fabHrs: 0, instHrs: 0, notes: '' }], isDirty: true }
    }
    case 'UPDATE_RAILING_ROW': {
      const railings = state.railings.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, railings, isDirty: true }
    }
    case 'DELETE_RAILING_ROW':
      return { ...state, railings: state.railings.filter(r => r.id !== action.payload), isDirty: true }
    case 'ADD_LADDER_ROW': {
      const newId = Date.now()
      return { ...state, ladder: [...state.ladder, { id: newId, location: '', type: 'Fixed Ladder', heightFt: 0, hasCage: false, material: 'Structural steel', weightLbs: 0, fabHrs: 0, instHrs: 0, notes: '' }], isDirty: true }
    }
    case 'UPDATE_LADDER_ROW': {
      const ladder = state.ladder.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, ladder, isDirty: true }
    }
    case 'DELETE_LADDER_ROW':
      return { ...state, ladder: state.ladder.filter(r => r.id !== action.payload), isDirty: true }
    case 'ADD_JOIST_REINF_ROW': {
      const newId = Date.now()
      return { ...state, joistReinf: [...state.joistReinf, { id: newId, mark: '', location: '', joistType: '', span: 0, reinfMethod: 'Angle + Plate', qty: 1, weightLbs: 0, fabHrs: 0, instHrs: 0, notes: '' }], isDirty: true }
    }
    case 'UPDATE_JOIST_REINF_ROW': {
      const joistReinf = state.joistReinf.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, joistReinf, isDirty: true }
    }
    case 'DELETE_JOIST_REINF_ROW':
      return { ...state, joistReinf: state.joistReinf.filter(r => r.id !== action.payload), isDirty: true }
    case 'ADD_PURCHASED_ROW': {
      const newId = Date.now()
      return { ...state, purchased: [...state.purchased, { id: newId, item: '', supplier: '', qty: 1, unit: 'ea', unitCost: 0, total: 0, leadWeeks: 0, notes: '' }], isDirty: true }
    }
    case 'UPDATE_PURCHASED_ROW': {
      const purchased = state.purchased.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, purchased, isDirty: true }
    }
    case 'DELETE_PURCHASED_ROW':
      return { ...state, purchased: state.purchased.filter(r => r.id !== action.payload), isDirty: true }
    case 'SET_SOFT_COSTS':
      return { ...state, softCosts: action.payload, isDirty: true }
    case 'UPDATE_SOFT_COST': {
      const softCosts = state.softCosts.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, softCosts, isDirty: true }
    }
    case 'ADD_SOFT_COST': {
      const newId = Math.max(0, ...state.softCosts.map(r => r.id)) + 1
      return { ...state, softCosts: [...state.softCosts, { id: newId, item: '', qty: 1, unit: 'ls', rate: 0, notes: '' }], isDirty: true }
    }
    case 'DELETE_SOFT_COST':
      return { ...state, softCosts: state.softCosts.filter(r => r.id !== action.payload), isDirty: true }
    case 'RESET_TO_DEFAULTS':
      return { ...defaultState, projectInfo: { ...defaultProjectInfo, quoteNumber: generateQuoteNumber() } }
    case 'LOAD_PROJECT':
      return { ...action.payload, isDirty: false }
    case 'MARK_SAVED':
      return { ...state, isDirty: false }
    default:
      return state
  }
}

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(projectReducer, defaultState)
  const value = { state, dispatch }
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject must be used within ProjectProvider')
  return context
}

export { defaultRates, defaultState }
