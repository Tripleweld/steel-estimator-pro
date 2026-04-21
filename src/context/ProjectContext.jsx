import { createContext, useContext, useReducer } from 'react'

const ProjectContext = createContext(null)

function generateQuoteNumber() {
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  const yr = String(new Date().getFullYear()).slice(-2)
  return `TW01-${seq}-${yr}`
}

/* ─── Material Rates ─── */
const defaultMaterialRates = [
  { id: 1, item: 'Structural steel', rate: 1.00, unit: '$/lb' },
  { id: 2, item: 'Galvanized steel', rate: 1.20, unit: '$/lb' },
  { id: 3, item: 'Stainless steel', rate: 3.00, unit: '$/lb' },
  { id: 4, item: 'OWSJ (get supplier quote)', rate: 0, unit: '$/LF' },
  { id: 5, item: 'Steel deck 38mm 20GA', rate: 5.00, unit: '$/sqft' },
  { id: 6, item: 'Anchors/bolts (per unit)', rate: 8.00, unit: '$/unit' },
]

/* ─── Labour Rates ─── */
const defaultLabourRates = {
  fabRate: 50,
  fabCrew: 2,
  installRate: 55,
  installCrew: 4,
  travelRate: 55,
}

/* ─── Safety Factors ─── */
const defaultSafetyFactors = {
  fabLocal: 0.10,
  fabRemote: 0.15,
  installLocal: 0.10,
  installRemote: 0.20,
  projectType: 'Remote',   // 'Local' or 'Remote'
}

/* ─── Markup & Tax ─── */
const defaultMarkup = {
  markupPercent: 15,
  hstPercent: 13,
  wasteStructural: 3,
  wasteMisc: 3,
  connectionHardware: 5,
}

/* ─── Travel & Freight ─── */
const defaultTravelFreight = {
  freightRatePerKm: 3.50,
  numberOfDeliveries: 2,
  hotelRatePerNight: 175,
  installDays: 15,
  hotelNightsPerCrew: 15,
  perDiemPerDay: 75,
}

/* ─── P.Eng & Shop Drawings ─── */
const defaultEngDrawings = {
  drafterRate: 65,
  drawingHours: 160,
  shopDrawingCost: 10400,
  pengStamp: 6000,
  siteVisitsQty: 3,
  siteVisitCostEach: 0,
}

/* ─── Equipment Rental Catalog ─── */
const defaultEquipment = [
  // Cranes
  { id: 1, category: 'CRANES', item: 'Mobile Crane 35T', dayRate: 1500, weekRate: 6500, monthRate: 22000, period: 'Day', qty: 0, pickup: 0, dropoff: 0 },
  { id: 2, category: 'CRANES', item: 'Mobile Crane 50T', dayRate: 2200, weekRate: 9500, monthRate: 32000, period: 'Day', qty: 0, pickup: 0, dropoff: 0 },
  { id: 3, category: 'CRANES', item: 'Mobile Crane 80T', dayRate: 3000, weekRate: 13000, monthRate: 44000, period: 'Day', qty: 0, pickup: 0, dropoff: 0 },
  { id: 4, category: 'CRANES', item: 'Mobile Crane 100T', dayRate: 3800, weekRate: 16500, monthRate: 55000, period: 'Day', qty: 0, pickup: 0, dropoff: 0 },
  { id: 5, category: 'CRANES', item: 'Mobile Crane 160T', dayRate: 5500, weekRate: 24000, monthRate: 80000, period: 'Day', qty: 0, pickup: 0, dropoff: 0 },
  { id: 6, category: 'CRANES', item: 'Carry Deck Crane 8T', dayRate: 800, weekRate: 3500, monthRate: 12000, period: 'Day', qty: 0, pickup: 0, dropoff: 0 },
  // Telehandlers
  { id: 7, category: 'TELEHANDLERS', item: 'Telehandler 6000lb / 36ft', dayRate: 400, weekRate: 2200, monthRate: 7500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 8, category: 'TELEHANDLERS', item: 'Telehandler 8000lb / 42ft', dayRate: 550, weekRate: 3150, monthRate: 10500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 9, category: 'TELEHANDLERS', item: 'Telehandler 10000lb / 48ft', dayRate: 650, weekRate: 3600, monthRate: 12000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 10, category: 'TELEHANDLERS', item: 'Telehandler 12000lb / 55ft', dayRate: 800, weekRate: 4400, monthRate: 14500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  // Boom Lifts
  { id: 11, category: 'BOOM LIFTS', item: 'Boom Lift 40ft Artic.', dayRate: 300, weekRate: 1650, monthRate: 5500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 12, category: 'BOOM LIFTS', item: 'Boom Lift 45ft Artic.', dayRate: 350, weekRate: 1950, monthRate: 6500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
: 6500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 13, category: 'BOOM LIFTS', item: 'Boom Lift 60ft Straight', dayRate: 450, weekRate: 2500, monthRate: 8500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 14, category: 'BOOM LIFTS', item: 'Boom Lift 80ft Straight', dayRate: 600, weekRate: 3300, monthRate: 11000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 15, category: 'BOOM LIFTS', item: 'Boom Lift 100ft Straight', dayRate: 850, weekRate: 4500, monthRate: 15000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 16, category: 'BOOM LIFTS', item: 'Boom Lift 120ft Straight', dayRate: 1100, weekRate: 6000, monthRate: 20000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  // Scissor Lifts
  { id: 17, category: 'SCISSOR LIFTS', item: 'Scissor Lift 19ft Electric', dayRate: 125, weekRate: 650, monthRate: 2100, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 18, category: 'SCISSOR LIFTS', item: 'Scissor Lift 26ft RT Diesel', dayRate: 250, weekRate: 1300, monthRate: 4200, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 19, category: 'SCISSOR LIFTS', item: 'Scissor Lift 32ft RT Diesel', dayRate: 300, weekRate: 1600, monthRate: 5200, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 20, category: 'SCISSOR LIFTS', item: 'Scissor Lift 40ft RT Diesel', dayRate: 400, weekRate: 2100, monthRate: 7000, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  // Forklifts
  { id: 21, category: 'FORKLIFTS', item: 'Forklift 5000lb (shop/yard)', dayRate: 200, weekRate: 1100, monthRate: 3500, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 22, category: 'FORKLIFTS', item: 'Forklift 8000lb RT', dayRate: 300, weekRate: 1600, monthRate: 5500, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 23, category: 'FORKLIFTS', item: 'Forklift 15000lb RT', dayRate: 450, weekRate: 2400, monthRate: 8000, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  // Welding & Power
  { id: 24, category: 'WELDING & POWER', item: 'Welder/Generator 300A', dayRate: 150, weekRate: 750, monthRate: 2500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 25, category: 'WELDING & POWER', item: 'Welder/Generator 500A', dayRate: 200, weekRate: 1000, monthRate: 3500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 26, category: 'WELDING & POWER', item: 'Air Compressor 185CFM', dayRate: 175, weekRate: 900, monthRate: 3000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 27, category: 'WELDING & POWER', item: 'Generator 25kW', dayRate: 150, weekRate: 750, monthRate: 2500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 28, category: 'WELDING & POWER', item: 'Generator 56kW', dayRate: 250, weekRate: 1250, monthRate: 4200, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  // Trucks & Trailers
  { id: 29, category: 'TRUCKS & TRAILERS', item: 'Flatbed Truck + Trailer', dayRate: 350, weekRate: 1800, monthRate: 6000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 30, category: 'TRUCKS & TRAILERS', item: 'Service Truck (crew)', dayRate: 150, weekRate: 750, monthRate: 2500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 31, category: 'TRUCKS & TRAILERS', item: 'Lowboy Trailer (equip hauling)', dayRate: 300, weekRate: 1500, monthRate: 5000, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  // Rigging & Misc
  { id: 32, category: 'RIGGING & MISC', item: 'Spreader Bar Rental', dayRate: 100, weekRate: 500, monthRate: 1500, period: 'Week', qty: 0, pickup: 0, dropoff: 0 },
  { id: 33, category: 'RIGGING & MISC', item: 'Rigging Package (chokers/shackles)', dayRate: 50, weekRate: 250, monthRate: 800, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 34, category: 'RIGGING & MISC', item: 'Temporary Guardrail System', dayRate: 75, weekRate: 375, monthRate: 1200, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
  { id: 35, category: 'RIGGING & MISC', item: 'Fall Arrest System (complete)', dayRate: 40, weekRate: 200, monthRate: 650, period: 'Month', qty: 0, pickup: 0, dropoff: 0 },
]

/* ─── Misc Metals Rates ─── */
const defaultMiscMetalsRates = [
  { id: 1, item: 'Pan tread (galvanized)', rate: 75, unit: '$/tread' },
  { id: 2, item: 'Pan tread (mild)', rate: 55, unit: '$/tread' },
  { id: 3, item: 'Checker plate tread', rate: 85, unit: '$/tread' },
  { id: 4, item: 'Galv grating', rate: 25, unit: '$/sqft' },
  { id: 5, item: 'Guardrail pre-fab', rate: 95, unit: '$/lnft' },
  { id: 6, item: 'Handrail pre-fab', rate: 65, unit: '$/lnft' },
]

/* ─── Code Limits (OBC / OHSA) ─── */
const defaultCodeLimits = [
  { id: 1, item: 'Post spacing max (rails)', value: 6, unit: 'ft (1.83m)', reference: 'OBC' },
  { id: 2, item: 'Riser max (stair)', value: 180, unit: 'mm', reference: 'OBC 3.4' },
  { id: 3, item: 'Run min (stair)', value: 255, unit: 'mm', reference: 'OBC 3.4' },
  { id: 4, item: 'Handrail height min', value: 865, unit: 'mm', reference: 'OBC 3.4' },
  { id: 5, item: 'Handrail height max', value: 1065, unit: 'mm', reference: 'OBC 3.4' },
  { id: 6, item: 'Risers max before landing', value: 12, unit: '', reference: 'OBC 3.4' },
  { id: 7, item: 'Baluster spacing max', value: 100, unit: 'mm', reference: 'OBC 3.4' },
  { id: 8, item: 'Rung spacing (ladder)', value: 12, unit: 'in', reference: 'OHSA' },
  { id: 9, item: 'Cage required above', value: 6, unit: 'm', reference: 'OHSA' },
  { id: 10, item: 'Shoring / jacks per day', value: 250, unit: '$/day', reference: '' },
  { id: 11, item: 'Scissor lift day rate', value: 300, unit: '$/day', reference: '' },
]

/* ─── Default Rates Bundle ─── */
const defaultRates = {
  materialRates: defaultMaterialRates,
  labourRates: defaultLabourRates,
  safetyFactors: defaultSafetyFactors,
  markup: defaultMarkup,
  travelFreight: defaultTravelFreight,
  engDrawings: defaultEngDrawings,
  equipment: defaultEquipment,
  equipmentMarkup: 15,
  miscMetalsRates: defaultMiscMetalsRates,
  codeLimits: defaultCodeLimits,
  productivityDefaults: { fabHrsPerTon: 10, installHrsPerTon: 8 },
  // legacy compat
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
  rates: JSON.parse(JSON.stringify(defaultRates)),
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

/* ─── Helper: compute equipment rental cost for a row ─── */
function calcEquipRentalCost(row) {
  const rateMap = { Day: row.dayRate, Week: row.weekRate, Month: row.monthRate }
  return (rateMap[row.period] || 0) * (row.qty || 0)
}

/* ─── Reducer ─── */
function projectReducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECT_INFO':
      return { ...state, projectInfo: { ...state.projectInfo, ...action.payload }, isDirty: true }

    case 'SET_RATES':
      return { ...state, rates: { ...state.rates, ...action.payload }, isDirty: true }

    /* Material Rates */
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

    /* Labour Rates */
    case 'SET_LABOUR_RATES':
      return { ...state, rates: { ...state.rates, labourRates: { ...state.rates.labourRates, ...action.payload } }, isDirty: true }

    /* Safety Factors */
    case 'SET_SAFETY_FACTORS':
      return { ...state, rates: { ...state.rates, safetyFactors: { ...state.rates.safetyFactors, ...action.payload } }, isDirty: true }

    /* Markup */
    case 'SET_MARKUP':
      return { ...state, rates: { ...state.rates, markup: { ...state.rates.markup, ...action.payload } }, isDirty: true }

    /* Travel & Freight */
    case 'SET_TRAVEL_FREIGHT':
      return { ...state, rates: { ...state.rates, travelFreight: { ...state.rates.travelFreight, ...action.payload } }, isDirty: true }

    /* Eng & Drawings */
    case 'SET_ENG_DRAWINGS':
      return { ...state, rates: { ...state.rates, engDrawings: { ...state.rates.engDrawings, ...action.payload } }, isDirty: true }

    /* Equipment */
    case 'UPDATE_EQUIPMENT': {
      const equipment = state.rates.equipment.map(r =>
        r.id === action.payload.id ? { ...r, ...action.payload } : r
      )
      return { ...state, rates: { ...state.rates, equipment }, isDirty: true }
    }
    case 'SET_EQUIPMENT_MARKUP':
      return { ...state, rates: { ...state.rates, equipmentMarkup: action.payload }, isDirty: true }

    /* Misc Metals Rates */
    case 'SET_MISC_METALS_RATE': {
      const miscMetalsRates = state.rates.miscMetalsRates.map(r =>
        r.id === action.payload.id ? { ...r, ...action.payload } : r
      )
      return { ...state, rates: { ...state.rates, miscMetalsRates }, isDirty: true }
    }
    case 'ADD_MISC_METALS_RATE': {
      const newId = Math.max(0, ...state.rates.miscMetalsRates.map(r => r.id)) + 1
      return { ...state, rates: { ...state.rates, miscMetalsRates: [...state.rates.miscMetalsRates, { id: newId, item: '', rate: 0, unit: '$/unit' }] }, isDirty: true }
    }
    case 'DELETE_MISC_METALS_RATE':
      return { ...state, rates: { ...state.rates, miscMetalsRates: state.rates.miscMetalsRates.filter(r => r.id !== action.payload) }, isDirty: true }

    /* Productivity */
    case 'SET_PRODUCTIVITY':
      return { ...state, rates: { ...state.rates, productivityDefaults: { ...state.rates.productivityDefaults, ...action.payload } }, isDirty: true }

    /* ─── Structural takeoff ─── */
    case 'SET_STRUCTURAL':
      return { ...state, structural: action.payload, isDirty: true }

    case 'ADD_STRUCTURAL_ROW': {
      const newId = Date.now()
      const sf = state.rates.safetyFactors
      return {
        ...state,
        structural: [...state.structural, {
          id: newId, mark: '', drawingRef: '', profile: '', qty: 1, lengthFt: 0,
          plateBP: 0, anchorsPerPc: 0,
          fabSetup: 0, fabCut: 0, fabDrill: 0, fabFeed: 0, fabWeld: 0, fabGrind: 0, fabPaint: 0,
          instUnload: 0, instRig: 0, instFit: 0, instBolt: 0, instTouchup: 0, instQC: 0,
          fabCrew: state.rates.labourRates.fabCrew,
          instCrew: state.rates.labourRates.installCrew,
          type: '', lbsPerFt: 0, notes: ''
        }],
        isDirty: true
      }
    }

    case 'UPDATE_STRUCTURAL_ROW': {
      const structural = state.structural.map(row =>
        row.id === action.payload.id ? { ...row, ...action.payload } : row
      )
      return { ...state, structural, isDirty: true }
    }

    case 'DELETE_STRUCTURAL_ROW':
      return { ...state, structural: state.structural.filter(r => r.id !== action.payload), isDirty: true }

    /* ─── Misc metals ─── */
    case 'SET_MISC_METALS':
      return { ...state, miscMetals: action.payload, isDirty: true }

    case 'ADD_MISC_METAL_ROW': {
      const newId = Date.now()
      return {
        ...state,
        miscMetals: [...state.miscMetals, {
          id: newId, mark: '', drawingRef: '', profile: '', qty: 1, lengthFt: 0,
          plateBP: 0, anchorsPerPc: 0,
          fabSetup: 0, fabCut: 0, fabDrill: 0, fabFeed: 0, fabWeld: 0, fabGrind: 0, fabPaint: 0,
          instUnload: 0, instRig: 0, instFit: 0, instBolt: 0, instTouchup: 0, instQC: 0,
          fabCrew: state.rates.labourRates.fabCrew,
          instCrew: state.rates.labourRates.installCrew,
          type: '', lbsPerFt: 0, notes: ''
        }],
        isDirty: true
      }
    }

    case 'UPDATE_MISC_METAL_ROW': {
      const miscMetals = state.miscMetals.map(row =>
        row.id === action.payload.id ? { ...row, ...action.payload } : row
      )
      return { ...state, miscMetals, isDirty: true }
    }

    case 'DELETE_MISC_METAL_ROW':
      return { ...state, miscMetals: state.miscMetals.filter(r => r.id !== action.payload), isDirty: true }

    /* ─── Stairs ─── */
    case 'SET_STAIRS':
      return { ...state, stairs: { ...state.stairs, ...action.payload }, isDirty: true }

    /* ─── Railings ─── */
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

    /* ─── Ladder ─── */
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

    /* ─── Joist Reinforcement ─── */
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

    /* ─── Purchased items ─── */
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

    /* ─── Soft costs ─── */
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

    /* ─── Reset ─── */
    case 'RESET_TO_DEFAULTS':
      return { ...JSON.parse(JSON.stringify(defaultState)), projectInfo: { ...defaultProjectInfo, quoteNumber: generateQuoteNumber() } }

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
  return (
    <ProjectContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject must be used within ProjectProvider')
  return context
}

export { defaultRates, defaultState, calcEquipRentalCost }
