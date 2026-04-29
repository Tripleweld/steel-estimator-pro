import { createContext, useContext, useReducer, useEffect } from 'react'

const ProjectContext = createContext(null)

function generateQuoteNumber() {
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  const yr = String(new Date().getFullYear()).slice(-2)
  return `TW01-${seq}-${yr}`
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Material Rates ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultMaterialRates = [
  { id: 1, item: 'Structural steel', rate: 1.00, unit: '$/lb' },
  { id: 2, item: 'Galvanized steel', rate: 1.20, unit: '$/lb' },
  { id: 3, item: 'Stainless steel', rate: 3.00, unit: '$/lb' },
  { id: 4, item: 'OWSJ (get supplier quote)', rate: 0, unit: '$/LF' },
  { id: 5, item: 'Steel deck 38mm 20GA', rate: 5.00, unit: '$/sqft' },
  { id: 6, item: 'Anchors/bolts (per unit)', rate: 8.00, unit: '$/unit' },
  { id: 7, item: 'Stainless Steel 304', rate: 3.50, unit: '$/lb' },
  { id: 8, item: 'Stainless Steel 316', rate: 5.50, unit: '$/lb' },
  { id: 9, item: 'Powder Coat', rate: 1.50, unit: '$/lb' },
]

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Labour Rates ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultLabourRates = {
  fabRate: 50,
  fabCrew: 2,
  installRate: 55,
  installCrew: 4,
  travelRate: 55,
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Safety Factors ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultSafetyFactors = {
  fabLocal: 0.10,
  fabRemote: 0.15,
  installLocal: 0.10,
  installRemote: 0.20,
  projectType: 'Remote',   // 'Local' or 'Remote'
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Markup & Tax ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultMarkup = {
  markupPercent: 15,
  hstPercent: 13,
  wasteStructural: 3,
  wasteMisc: 3,
  connectionHardware: 5,
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Travel & Freight ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultTravelFreight = {
  freightRatePerKm: 3.50,
  numberOfDeliveries: 2,
  hotelRatePerNight: 175,
  installDays: 15,
  hotelNightsPerCrew: 15,
  perDiemPerDay: 75,
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ P.Eng & Shop Drawings ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultEngDrawings = {
  drafterRate: 0,
  drawingHours: 0,
  shopDrawingCost: 0,
  pengStamp: 0,
  siteVisitsQty: 0,
  siteVisitCostEach: 0,
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Equipment Rental Catalog ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultEquipment = [
  // Cranes
  { id: 1, category: 'CRANES', item: 'Mobile Crane 35T', dayRate: 1500, weekRate: 6500, monthRate: 22000, period: 'Day', qty: 0, pickup: 200, dropoff: 200 },
  { id: 2, category: 'CRANES', item: 'Mobile Crane 50T', dayRate: 2200, weekRate: 9500, monthRate: 32000, period: 'Day', qty: 0, pickup: 200, dropoff: 200 },
  { id: 3, category: 'CRANES', item: 'Mobile Crane 80T', dayRate: 3000, weekRate: 13000, monthRate: 44000, period: 'Day', qty: 0, pickup: 200, dropoff: 200 },
  { id: 4, category: 'CRANES', item: 'Mobile Crane 100T', dayRate: 3800, weekRate: 16500, monthRate: 55000, period: 'Day', qty: 0, pickup: 200, dropoff: 200 },
  { id: 5, category: 'CRANES', item: 'Mobile Crane 160T', dayRate: 5500, weekRate: 24000, monthRate: 80000, period: 'Day', qty: 0, pickup: 200, dropoff: 200 },
  { id: 6, category: 'CRANES', item: 'Carry Deck Crane 8T', dayRate: 800, weekRate: 3500, monthRate: 12000, period: 'Day', qty: 0, pickup: 200, dropoff: 200 },
  // Telehandlers
  { id: 7, category: 'TELEHANDLERS', item: 'Telehandler 6000lb / 36ft', dayRate: 400, weekRate: 2200, monthRate: 7500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 8, category: 'TELEHANDLERS', item: 'Telehandler 8000lb / 42ft', dayRate: 550, weekRate: 3150, monthRate: 10500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 9, category: 'TELEHANDLERS', item: 'Telehandler 10000lb / 48ft', dayRate: 650, weekRate: 3600, monthRate: 12000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 10, category: 'TELEHANDLERS', item: 'Telehandler 12000lb / 55ft', dayRate: 800, weekRate: 4400, monthRate: 14500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  // Boom Lifts
  { id: 11, category: 'BOOM LIFTS', item: 'Boom Lift 40ft Artic.', dayRate: 300, weekRate: 1650, monthRate: 5500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 12, category: 'BOOM LIFTS', item: 'Boom Lift 45ft Artic.', dayRate: 350, weekRate: 1950, monthRate: 6500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 13, category: 'BOOM LIFTS', item: 'Boom Lift 60ft Straight', dayRate: 450, weekRate: 2500, monthRate: 8500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 14, category: 'BOOM LIFTS', item: 'Boom Lift 80ft Straight', dayRate: 600, weekRate: 3300, monthRate: 11000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 15, category: 'BOOM LIFTS', item: 'Boom Lift 100ft Straight', dayRate: 850, weekRate: 4500, monthRate: 15000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 16, category: 'BOOM LIFTS', item: 'Boom Lift 120ft Straight', dayRate: 1100, weekRate: 6000, monthRate: 20000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  // Scissor Lifts
  { id: 17, category: 'SCISSOR LIFTS', item: 'Scissor Lift 19ft Electric', dayRate: 125, weekRate: 650, monthRate: 2100, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 18, category: 'SCISSOR LIFTS', item: 'Scissor Lift 26ft RT Diesel', dayRate: 250, weekRate: 1300, monthRate: 4200, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 19, category: 'SCISSOR LIFTS', item: 'Scissor Lift 32ft RT Diesel', dayRate: 300, weekRate: 1600, monthRate: 5200, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 20, category: 'SCISSOR LIFTS', item: 'Scissor Lift 40ft RT Diesel', dayRate: 400, weekRate: 2100, monthRate: 7000, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  // Forklifts
  { id: 21, category: 'FORKLIFTS', item: 'Forklift 5000lb (shop/yard)', dayRate: 200, weekRate: 1100, monthRate: 3500, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 22, category: 'FORKLIFTS', item: 'Forklift 8000lb RT', dayRate: 300, weekRate: 1600, monthRate: 5500, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 23, category: 'FORKLIFTS', item: 'Forklift 15000lb RT', dayRate: 450, weekRate: 2400, monthRate: 8000, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  // Welding & Power
  { id: 24, category: 'WELDING & POWER', item: 'Welder/Generator 300A', dayRate: 150, weekRate: 750, monthRate: 2500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 25, category: 'WELDING & POWER', item: 'Welder/Generator 500A', dayRate: 200, weekRate: 1000, monthRate: 3500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 26, category: 'WELDING & POWER', item: 'Air Compressor 185CFM', dayRate: 175, weekRate: 900, monthRate: 3000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 27, category: 'WELDING & POWER', item: 'Generator 25kW', dayRate: 150, weekRate: 750, monthRate: 2500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 28, category: 'WELDING & POWER', item: 'Generator 56kW', dayRate: 250, weekRate: 1250, monthRate: 4200, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  // Trucks & Trailers
  { id: 29, category: 'TRUCKS & TRAILERS', item: 'Flatbed Truck + Trailer', dayRate: 350, weekRate: 1800, monthRate: 6000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 30, category: 'TRUCKS & TRAILERS', item: 'Service Truck (crew)', dayRate: 150, weekRate: 750, monthRate: 2500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 31, category: 'TRUCKS & TRAILERS', item: 'Lowboy Trailer (equip hauling)', dayRate: 300, weekRate: 1500, monthRate: 5000, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  // Rigging & Misc
  { id: 32, category: 'RIGGING & MISC', item: 'Spreader Bar Rental', dayRate: 100, weekRate: 500, monthRate: 1500, period: 'Week', qty: 0, pickup: 200, dropoff: 200 },
  { id: 33, category: 'RIGGING & MISC', item: 'Rigging Package (chokers/shackles)', dayRate: 50, weekRate: 250, monthRate: 800, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 34, category: 'RIGGING & MISC', item: 'Temporary Guardrail System', dayRate: 75, weekRate: 375, monthRate: 1200, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
  { id: 35, category: 'RIGGING & MISC', item: 'Fall Arrest System (complete)', dayRate: 40, weekRate: 200, monthRate: 650, period: 'Month', qty: 0, pickup: 200, dropoff: 200 },
]

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Misc Metals Rates ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultMiscMetalsRates = [
  { id: 1, item: 'Pan tread (galvanized)', rate: 75, unit: '$/tread' },
  { id: 2, item: 'Pan tread (mild)', rate: 55, unit: '$/tread' },
  { id: 3, item: 'Checker plate tread', rate: 85, unit: '$/tread' },
  { id: 4, item: 'Galv grating', rate: 25, unit: '$/sqft' },
  { id: 5, item: 'Guardrail pre-fab', rate: 95, unit: '$/lnft' },
  { id: 6, item: 'Handrail pre-fab', rate: 65, unit: '$/lnft' },
  { id: 7, item: 'Channel grating diamond (galv)', rate: 95, unit: '$/tread' },
  { id: 8, item: 'Channel grating round (galv)', rate: 110, unit: '$/tread' },
  { id: 9, item: 'Bar grating tread (galv)', rate: 85, unit: '$/tread' },
  { id: 10, item: 'Bollard fixed 6" pipe (filled)', rate: 350, unit: '$/each' },
  { id: 11, item: 'Bollard fixed 8" pipe (filled)', rate: 480, unit: '$/each' },
  { id: 12, item: 'Bollard removable 6" sleeve', rate: 620, unit: '$/each' },
  { id: 13, item: 'Corner guard SS 2x2x12GA', rate: 45, unit: '$/lnft' },
  { id: 14, item: 'Corner guard SS 3x3x12GA', rate: 65, unit: '$/lnft' },
  { id: 15, item: 'Corner guard mild steel L76x76x6', rate: 30, unit: '$/lnft' },
  { id: 16, item: 'Corner guard mild steel L102x102x9.5', rate: 45, unit: '$/lnft' },
  { id: 17, item: 'Embed plate 8x8x1/4 (4 anchors)', rate: 85, unit: '$/each' },
  { id: 18, item: 'Embed plate 10x10x1/2 (4 anchors)', rate: 135, unit: '$/each' },
  { id: 19, item: 'Embed plate 12x12x1/2 (4 anchors)', rate: 185, unit: '$/each' },
  { id: 20, item: 'Lintel L102x102x9.5', rate: 35, unit: '$/lnft' },
  { id: 21, item: 'Lintel L127x127x12.7', rate: 55, unit: '$/lnft' },
  { id: 22, item: 'Edge angle L76x76x6', rate: 28, unit: '$/lnft' },
  { id: 23, item: 'Edge angle L102x102x9.5', rate: 42, unit: '$/lnft' },
  { id: 24, item: 'Bumper rail Pipe 42 Sch40', rate: 38, unit: '$/lnft' },
  { id: 25, item: 'Bumper rail Pipe 48 Sch40', rate: 48, unit: '$/lnft' },
  { id: 26, item: 'Wheel stop precast', rate: 95, unit: '$/each' },
  { id: 27, item: 'Wheel stop steel fab', rate: 145, unit: '$/each' },
  { id: 28, item: 'Floor plate (checker) per sqft', rate: 25, unit: '$/sqft' },
  { id: 29, item: 'Sump cover (galv)', rate: 185, unit: '$/each' },
  { id: 30, item: 'Roof hatch 30x36 std', rate: 1450, unit: '$/each' },
  { id: 31, item: 'Pipe support stanchion', rate: 165, unit: '$/each' },
  { id: 32, item: 'Anchor bolt J-bolt 3/4"', rate: 18, unit: '$/each' },
  { id: 33, item: 'Anchor bolt L-bolt 3/4"', rate: 16, unit: '$/each' },
  { id: 34, item: 'Anchor bolt threaded rod 3/4"', rate: 14, unit: '$/each' },
  { id: 35, item: 'Equipment dunnage (per lb)', rate: 4.50, unit: '$/lb' },
  { id: 36, item: 'Catwalk framing (per sqft)', rate: 95, unit: '$/sqft' },
  { id: 37, item: 'Architectural / signage (lump)', rate: 0, unit: 'lump $' },
]

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Code Limits (OBC / OHSA) ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
const defaultCodeLimits = [
  { id: 1, item: 'Post spacing max (rails)', value: 6, unit: 'ft (1.83m)', reference: 'OBC' },
  { id: 2, item: 'Riser max (stair)', value: 180, unit: 'mm', reference: 'OBC 3.4' },
  { id: 3, item: 'Run min (stair)', value: 255, unit: 'mm', reference: 'OBC 3.4' },
  { id: 4, item: 'Handrail height min', value: 865, unit: 'mm', reference: 'OBC 3.4' },
  { id: 5, item: 'Handrail height max', value: 1065, unit: 'mm', reference: 'OBC 3.4' },
  { id: 6, item: 'Risers max before landing', value: 12, unit: '', reference: 'OBC 3.4' },
  { id: 7, item: 'Baluster spacing max', value: 100, unit: 'mm', reference: 'OBC 3.4' },
  { id: 8, item: 'Rung spacing (ladder)', value: 12, unit: 'in', reference: 'OHSA' },
  { id: 9, item: 'Cage required above', value: 5, unit: 'm', reference: 'OHSA' },
  { id: 10, item: 'Shoring / jacks per day', value: 250, unit: '$/day', reference: '' },
  { id: 11, item: 'Scissor lift day rate', value: 300, unit: '$/day', reference: '' },
]

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Default Rates Bundle ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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
  status: 'bidding', // bidding | awarded | inProgress | closed
  awardedAt: null,
}

const defaultState = {
  projectInfo: { ...defaultProjectInfo },
  rates: JSON.parse(JSON.stringify(defaultRates)),
  structural: [],
  miscMetals: [],
  stairs: [],
  stairsComputed: { totalLbs: 0, materialCost: 0, treadsTotal: 0, railingsTotal: 0, labourTotal: 0, grandTotal: 0, fabHrs: 0, instHrs: 0 },
  ladderComputed: { totalLbs: 0, materialCost: 0, labourTotal: 0, grandTotal: 0, fabHrs: 0, instHrs: 0 },
  fabStandardOverrides: {},
  installStandardOverrides: {},
  fabStandardCustom: [],
  installStandardCustom: [],
  miscMetalsStandard: {
    bollards: [], cornerGuardsSS: [], cornerGuardsMS: [], embedPlates: [],
    lintels: [], edgeAngles: [], bumperRails: [], wheelStops: [],
    floorPlates: [], pipeSupports: [], anchorBolts: [], equipDunnage: [], architectural: [],
  },
  railings: [],
  ladder: [],
  joistReinf: [],
  purchased: [],
  softCosts: [
    { id: 1, item: 'Shop Drawings / Detailing', qty: 0, unit: 'hrs', rate: 0, notes: '' },
    { id: 2, item: 'Engineering Review', qty: 0, unit: 'ls', rate: 6000, notes: 'P.Eng stamp' },
    { id: 3, item: 'Crane Mobilization', qty: 0, unit: 'ls', rate: 3500, notes: '' },
    { id: 4, item: 'Equipment Rental', qty: 0, unit: 'ls', rate: 0, notes: 'See Equipment tab' },
    { id: 5, item: 'Travel & Accommodation', qty: 0, unit: 'ls', rate: 0, notes: 'See Travel & Freight' },
    { id: 6, item: 'Permits & Inspections', qty: 0, unit: 'ls', rate: 1500, notes: '' },
    { id: 7, item: 'Insurance', qty: 0, unit: '%', rate: 1.5, notes: '% of contract' },
    { id: 8, item: 'Small Tools & Consumables', qty: 0, unit: 'ls', rate: 1200, notes: '' },
    { id: 9, item: 'Contingency', qty: 0, unit: '%', rate: 5, notes: '% of subtotal' },
  ],
  projectManagement: {
    sov: { lines: [], retentionPercent: 10, billsToDate: 0 },
    tracking: { categories: [] },
    changeOrders: [],
    fieldReports: [],
    shopDrawings: { pieces: [], lastSync: null },
  },

  tenderRadar: {
    tenders: [],
    gcDirectory: [
    { id: 'gc-1', name: 'Seaforth Building Group', platform: 'BuilderTrend', contactPattern: 'seaforthbuildinggroup@buildertrend.com', relationshipTier: 'Strong', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-2', name: 'Seaforth Ltd.', platform: 'Direct email', contactPattern: 'estimating@seaforthltd.com', relationshipTier: 'Strong', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-3', name: 'StuCor Construction', platform: 'Invitely', contactPattern: 'prime.stucor@invitely.com', relationshipTier: 'Strong', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-4', name: 'JPace Contracting', platform: 'Direct email', contactPattern: 'ebaranova@jpacecontracting.ca', relationshipTier: 'Strong', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-5', name: 'Moro Group', platform: 'Direct email', contactPattern: 'estimating@morogroup.ca', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-6', name: 'HN Construction', platform: 'Direct email', contactPattern: 'ayacoub@hncon.ca', relationshipTier: 'Strong', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-7', name: 'Golden Gate Contracting', platform: 'Direct email', contactPattern: 'estimation@ggcontracting.ca', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-8', name: 'Quad Pro Construction', platform: 'Platform', contactPattern: 'Dennis Nam', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-9', name: 'Complete Building Systems (STAHLE)', platform: 'Platform', contactPattern: 'Dalaa Al Mhazam', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-10', name: 'Frontier Group of Companies', platform: 'Platform', contactPattern: 'Kushal Patel', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-11', name: 'Mirabelli Corp', platform: 'Direct email', contactPattern: 'edimar.castro@mirabellicorp.com', relationshipTier: 'Strong', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-12', name: 'Corebuild Construction', platform: 'Platform', contactPattern: 'Nimesh Shah', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-13', name: 'Harbridge & Cross', platform: 'Direct email', contactPattern: 'Rick Aubin', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-14', name: 'Icon Restoration Services', platform: 'Platform', contactPattern: 'Jayson Docusin', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-15', name: 'Quinan Construction', platform: 'SmartBuildBids', contactPattern: 'quinan@smrtbldbids.app', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 },
    { id: 'gc-16', name: 'Norlon', platform: 'Direct email', contactPattern: 'mpilecki@norlon.ca', relationshipTier: 'Neutral', paymentBehavior: 'Unknown', daysToPayAvg: 0, bidShoppingHistory: false, notes: '', tendersCount: 0, winsCount: 0 }
    ],
    config: { marginFloorPct: 5, goThreshold: 70, maybeThreshold: 45, downturnMode: true },
  },
  quoteScopeOverrides: {},
  quoteScopeCustom: [],
  miscMetalsCustom: [],
  quoteExclOverrides: {},
  quoteExclCustom: [],
  quoteTermsOverrides: {},
  quoteTermsCustom: [],
  isDirty: false,
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Helper: compute equipment rental cost for a row ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
function calcEquipRentalCost(row) {
  const rateMap = { Day: row.dayRate, Week: row.weekRate, Month: row.monthRate }
  return (rateMap[row.period] || 0) * (row.qty || 0)
}

/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Reducer ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Structural takeoff ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Misc metals ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Stairs ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
    case 'SET_STAIRS': {
      // Backward compat: if state.stairs is array, merge into row by id (or first row)
      let stairs = state.stairs;
      if (!Array.isArray(stairs)) {
        // Legacy object: migrate to single-element array
        stairs = stairs && Object.keys(stairs).length > 0 ? [{ id: 1, ...stairs }] : [];
      }
      const targetId = action.payload?.id;
      if (targetId != null) {
        stairs = stairs.map(r => r.id === targetId ? { ...r, ...action.payload } : r);
      } else if (stairs.length > 0) {
        stairs = stairs.map((r, i) => i === 0 ? { ...r, ...action.payload } : r);
      } else {
        stairs = [{ id: Date.now(), ...action.payload }];
      }
      return { ...state, stairs, isDirty: true };
    }
    case 'ADD_STAIRS_ROW': {
      let stairs = Array.isArray(state.stairs) ? state.stairs : (state.stairs && Object.keys(state.stairs).length > 0 ? [{ id: 1, ...state.stairs }] : []);
      return { ...state, stairs: [...stairs, { id: Date.now() }], isDirty: true };
    }
    case 'UPDATE_STAIRS_ROW': {
      let stairs = Array.isArray(state.stairs) ? state.stairs : (state.stairs && Object.keys(state.stairs).length > 0 ? [{ id: 1, ...state.stairs }] : []);
      stairs = stairs.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r);
      return { ...state, stairs, isDirty: true };
    }
    case 'DELETE_STAIRS_ROW': {
      let stairs = Array.isArray(state.stairs) ? state.stairs : [];
      return { ...state, stairs: stairs.filter(r => r.id !== action.payload), isDirty: true };
    }

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Railings ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Ladder ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Joist Reinforcement ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
    case 'ADD_JOIST_REINF_ROW': {
      return { ...state, joistReinf: [...state.joistReinf, action.payload], isDirty: true }
    }
    case 'UPDATE_JOIST_REINF_ROW': {
      const joistReinf = state.joistReinf.map(row => row.id === action.payload.id ? { ...row, ...action.payload } : row)
      return { ...state, joistReinf, isDirty: true }
    }
    case 'DELETE_JOIST_REINF_ROW':
      return { ...state, joistReinf: state.joistReinf.filter(r => r.id !== action.payload), isDirty: true }

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Purchased items ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
    case 'SET_PURCHASED':
      return { ...state, purchased: action.payload, isDirty: true }

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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Soft costs ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
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

    /* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Reset ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */
    case 'ENSURE_MATERIAL_RATES': {
      const existing = state.rates.materialRates.map(r => r.item);
      let nextId = state.rates.materialRates.reduce((m, r) => Math.max(m, r.id || 0), 0);
      const missing = (action.payload || []).filter(req => !existing.includes(req.item)).map(req => {
        nextId++;
        return { id: nextId, item: req.item, rate: req.rate, unit: req.unit || '$/lb' };
      });
      if (missing.length === 0) return state;
      return { ...state, rates: { ...state.rates, materialRates: [...state.rates.materialRates, ...missing] } };
    }

    case 'ENSURE_EQUIPMENT_DEFAULTS': {
      const equipment = state.rates.equipment.map(e => ({
        ...e,
        pickup: (e.pickup === 0 || e.pickup == null) ? (action.payload?.pickup ?? 200) : e.pickup,
        dropoff: (e.dropoff === 0 || e.dropoff == null) ? (action.payload?.dropoff ?? 200) : e.dropoff,
      }));
      return { ...state, rates: { ...state.rates, equipment } };
    }

    case 'RESET_TO_DEFAULTS':
      return { ...JSON.parse(JSON.stringify(defaultState)), projectInfo: { ...defaultProjectInfo, quoteNumber: generateQuoteNumber() } }

    case 'LOAD_PROJECT':
      return { ...action.payload, isDirty: false }

    case 'MARK_SAVED':
      return { ...state, isDirty: false }

    /* Material Rates by key (RatesConfig flat-key access) */
    case 'SET_MATERIAL_RATE_BY_KEY':
      return { ...state, rates: { ...state.rates, materialRatesByKey: { ...(state.rates.materialRatesByKey || {}), [action.payload.key]: action.payload.value } }, isDirty: true }

    /* Misc Metals Rates by key (RatesConfig flat-key access) */
    case 'SET_MISC_METALS_RATE_BY_KEY':
      return { ...state, rates: { ...state.rates, miscMetalsRatesByKey: { ...(state.rates.miscMetalsRatesByKey || {}), [action.payload.key]: action.payload.value } }, isDirty: true }

    case 'SET_STRUCTURAL_ROWS':
      return { ...state, structuralRows: action.payload, isDirty: true };
        case 'ADD_MM_STANDARD_ITEM': {
      const { section, defaults } = action.payload
      const arr = (state.miscMetalsStandard && state.miscMetalsStandard[section]) || []
      const newId = Date.now() + Math.floor(Math.random() * 100)
      return { ...state, miscMetalsStandard: { ...state.miscMetalsStandard, [section]: [...arr, { id: newId, qty: 1, rateOverride: null, notes: '', ...(defaults || {}) }] }, isDirty: true }
    }
    case 'UPDATE_MM_STANDARD_ITEM': {
      const { section, id, ...updates } = action.payload
      const arr = (state.miscMetalsStandard && state.miscMetalsStandard[section]) || []
      return { ...state, miscMetalsStandard: { ...state.miscMetalsStandard, [section]: arr.map((r) => (r.id === id ? { ...r, ...updates } : r)) }, isDirty: true }
    }
    case 'DELETE_MM_STANDARD_ITEM': {
      const { section, id } = action.payload
      const arr = (state.miscMetalsStandard && state.miscMetalsStandard[section]) || []
      return { ...state, miscMetalsStandard: { ...state.miscMetalsStandard, [section]: arr.filter((r) => r.id !== id) }, isDirty: true }
    }
    case 'SET_STAIRS_COMPUTED':
      return { ...state, stairsComputed: { ...(state.stairsComputed || {}), ...action.payload } }
    case 'SET_LADDER_COMPUTED':
      return { ...state, ladderComputed: { ...(state.ladderComputed || {}), ...action.payload } }
    case 'UPDATE_FAB_STANDARD':
      return { ...state, fabStandardOverrides: { ...(state.fabStandardOverrides || {}), [action.payload.id]: { ...((state.fabStandardOverrides || {})[action.payload.id] || {}), ...action.payload.changes } } }
    case 'UPDATE_INSTALL_STANDARD':
      return { ...state, installStandardOverrides: { ...(state.installStandardOverrides || {}), [action.payload.id]: { ...((state.installStandardOverrides || {})[action.payload.id] || {}), ...action.payload.changes } } }
    case 'RESET_FAB_STANDARD': {
      const next = { ...(state.fabStandardOverrides || {}) }
      delete next[action.payload.id]
      return { ...state, fabStandardOverrides: next }
    }
    case 'RESET_INSTALL_STANDARD': {
      const next = { ...(state.installStandardOverrides || {}) }
      delete next[action.payload.id]
      return { ...state, installStandardOverrides: next }
    }
    case 'RESET_ALL_STANDARDS':
      return { ...state, fabStandardOverrides: {}, installStandardOverrides: {}, fabStandardCustom: [], installStandardCustom: [] }
    case 'ADD_FAB_CUSTOM':
      return { ...state, fabStandardCustom: [...(state.fabStandardCustom || []), action.payload] }
    case 'UPDATE_FAB_CUSTOM':
      return { ...state, fabStandardCustom: (state.fabStandardCustom || []).map((r) => r.id === action.payload.id ? { ...r, ...action.payload.changes } : r) }
    case 'DELETE_FAB_CUSTOM':
      return { ...state, fabStandardCustom: (state.fabStandardCustom || []).filter((r) => r.id !== action.payload.id) }
    case 'ADD_INSTALL_CUSTOM':
      return { ...state, installStandardCustom: [...(state.installStandardCustom || []), action.payload] }
    case 'UPDATE_INSTALL_CUSTOM':
      return { ...state, installStandardCustom: (state.installStandardCustom || []).map((r) => r.id === action.payload.id ? { ...r, ...action.payload.changes } : r) }
    case 'DELETE_INSTALL_CUSTOM':
      return { ...state, installStandardCustom: (state.installStandardCustom || []).filter((r) => r.id !== action.payload.id) }

    /* Project Management - SOV */
    case 'SET_SOV_LINES': {
      const pm=state.projectManagement||{};
      const sov={...(pm.sov||{lines:[],retentionPercent:10,billsToDate:0}),lines:action.payload.lines};
      return {...state,projectManagement:{...pm,sov},isDirty:true};
    }
    case 'ADD_SOV_LINE': {
      const pm=state.projectManagement||{};
      const cur=pm.sov||{lines:[],retentionPercent:10,billsToDate:0};
      const sov={...cur,lines:[...(cur.lines||[]),action.payload]};
      return {...state,projectManagement:{...pm,sov},isDirty:true};
    }
    case 'UPDATE_SOV_LINE': {
      const pm=state.projectManagement||{};
      const cur=pm.sov||{lines:[],retentionPercent:10,billsToDate:0};
      const lines=(cur.lines||[]).map(ln=>ln.id===action.payload.id?{...ln,...action.payload.changes}:ln);
      return {...state,projectManagement:{...pm,sov:{...cur,lines}},isDirty:true};
    }
    case 'DELETE_SOV_LINE': {
      const pm=state.projectManagement||{};
      const cur=pm.sov||{lines:[],retentionPercent:10,billsToDate:0};
      const lines=(cur.lines||[]).filter(ln=>ln.id!==action.payload.id);
      return {...state,projectManagement:{...pm,sov:{...cur,lines}},isDirty:true};
    }
    case 'SET_SOV_RETENTION': {
      const pm=state.projectManagement||{};
      const cur=pm.sov||{lines:[],retentionPercent:10,billsToDate:0};
      return {...state,projectManagement:{...pm,sov:{...cur,retentionPercent:action.payload.retentionPercent}},isDirty:true};
    }

    /* PM - Change Orders */
    case 'ADD_CHANGE_ORDER': {
      const pm=state.projectManagement||{};
      return {...state,projectManagement:{...pm,changeOrders:[...(pm.changeOrders||[]),action.payload]},isDirty:true};
    }
    case 'UPDATE_CHANGE_ORDER': {
      const pm=state.projectManagement||{};
      const list=(pm.changeOrders||[]).map(c=>c.id===action.payload.id?{...c,...action.payload.changes}:c);
      return {...state,projectManagement:{...pm,changeOrders:list},isDirty:true};
    }
    case 'DELETE_CHANGE_ORDER': {
      const pm=state.projectManagement||{};
      const list=(pm.changeOrders||[]).filter(c=>c.id!==action.payload.id);
      return {...state,projectManagement:{...pm,changeOrders:list},isDirty:true};
    }

    /* PM - Field Reports */
    case 'ADD_FIELD_REPORT': {
      const pm=state.projectManagement||{};
      return {...state,projectManagement:{...pm,fieldReports:[...(pm.fieldReports||[]),action.payload]},isDirty:true};
    }
    case 'UPDATE_FIELD_REPORT': {
      const pm=state.projectManagement||{};
      const list=(pm.fieldReports||[]).map(r=>r.id===action.payload.id?{...r,...action.payload.changes}:r);
      return {...state,projectManagement:{...pm,fieldReports:list},isDirty:true};
    }
    case 'DELETE_FIELD_REPORT': {
      const pm=state.projectManagement||{};
      const list=(pm.fieldReports||[]).filter(r=>r.id!==action.payload.id);
      return {...state,projectManagement:{...pm,fieldReports:list},isDirty:true};
    }

    /* PM - Tracking */
    case 'SET_TRACKING_CATEGORIES': {
      const pm=state.projectManagement||{};
      return {...state,projectManagement:{...pm,tracking:{...(pm.tracking||{}),categories:action.payload.categories}},isDirty:true};
    }
    case 'ADD_TRACKING_CATEGORY': {
      const pm=state.projectManagement||{};
      const cur=pm.tracking||{categories:[]};
      return {...state,projectManagement:{...pm,tracking:{...cur,categories:[...(cur.categories||[]),action.payload]}},isDirty:true};
    }
    case 'UPDATE_TRACKING_CATEGORY': {
      const pm=state.projectManagement||{};
      const cur=pm.tracking||{categories:[]};
      const list=(cur.categories||[]).map(c=>c.id===action.payload.id?{...c,...action.payload.changes}:c);
      return {...state,projectManagement:{...pm,tracking:{...cur,categories:list}},isDirty:true};
    }
    case 'DELETE_TRACKING_CATEGORY': {
      const pm=state.projectManagement||{};
      const cur=pm.tracking||{categories:[]};
      const list=(cur.categories||[]).filter(c=>c.id!==action.payload.id);
      return {...state,projectManagement:{...pm,tracking:{...cur,categories:list}},isDirty:true};
    }

    /* PM - Shop Drawings */
    case 'SET_SHOP_DRAWINGS': {
      const pm=state.projectManagement||{};
      return {...state,projectManagement:{...pm,shopDrawings:{pieces:action.payload.pieces,lastSync:action.payload.lastSync}},isDirty:true};
    }
    case 'UPDATE_SHOP_DRAWING_PIECE': {
      const pm=state.projectManagement||{};
      const cur=pm.shopDrawings||{pieces:[],lastSync:null};
      const list=(cur.pieces||[]).map(p=>p.id===action.payload.id?{...p,...action.payload.changes}:p);
      return {...state,projectManagement:{...pm,shopDrawings:{...cur,pieces:list}},isDirty:true};
    }

    /* TenderRadar */
    case 'ADD_TENDER': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      return { ...state, tenderRadar: { ...tr, tenders: [...(tr.tenders||[]), action.payload] }, isDirty: true };
    }
    case 'UPDATE_TENDER': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      const list = (tr.tenders||[]).map(t => t.id === action.payload.id ? { ...t, ...action.payload.changes } : t);
      return { ...state, tenderRadar: { ...tr, tenders: list }, isDirty: true };
    }
    case 'DELETE_TENDER': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      const list = (tr.tenders||[]).filter(t => t.id !== action.payload.id);
      return { ...state, tenderRadar: { ...tr, tenders: list }, isDirty: true };
    }
    case 'ADD_GC': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      return { ...state, tenderRadar: { ...tr, gcDirectory: [...(tr.gcDirectory||[]), action.payload] }, isDirty: true };
    }
    case 'UPDATE_GC': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      const list = (tr.gcDirectory||[]).map(g => g.id === action.payload.id ? { ...g, ...action.payload.changes } : g);
      return { ...state, tenderRadar: { ...tr, gcDirectory: list }, isDirty: true };
    }
    case 'DELETE_GC': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      const list = (tr.gcDirectory||[]).filter(g => g.id !== action.payload.id);
      return { ...state, tenderRadar: { ...tr, gcDirectory: list }, isDirty: true };
    }
    case 'SET_TR_CONFIG': {
      const tr = state.tenderRadar || { tenders: [], gcDirectory: [], config: {} };
      return { ...state, tenderRadar: { ...tr, config: { ...(tr.config||{}), ...action.payload } }, isDirty: true };
    }

    case 'UPDATE_QUOTE_SCOPE_LINE':
      return { ...state, quoteScopeOverrides: { ...(state.quoteScopeOverrides || {}), [action.key]: { ...((state.quoteScopeOverrides || {})[action.key] || {}), ...action.patch } }, isDirty: true };
    case 'RESET_QUOTE_SCOPE_LINE': {
      const _o = { ...(state.quoteScopeOverrides || {}) };
      delete _o[action.key];
      return { ...state, quoteScopeOverrides: _o, isDirty: true };
    }
    case 'ADD_QUOTE_SCOPE_CUSTOM':
      return { ...state, quoteScopeCustom: [...(state.quoteScopeCustom || []), { id: 'qc-' + Date.now() + '-' + Math.floor(Math.random()*1000), text: action.text || '' }], isDirty: true };
    case 'UPDATE_QUOTE_SCOPE_CUSTOM':
      return { ...state, quoteScopeCustom: (state.quoteScopeCustom || []).map(_l => _l.id === action.id ? { ..._l, text: action.text } : _l), isDirty: true };
    case 'DELETE_QUOTE_SCOPE_CUSTOM':
      return { ...state, quoteScopeCustom: (state.quoteScopeCustom || []).filter(_l => _l.id !== action.id), isDirty: true };
    case 'ADD_MM_CUSTOM_ITEM':
      return { ...state, miscMetalsCustom: [...(state.miscMetalsCustom || []), { id: 'mmc-' + Date.now() + '-' + Math.floor(Math.random()*1000), name: '', qty: 0, unit: 'ea', rate: 0, notes: '' }], isDirty: true };
    case 'UPDATE_MM_CUSTOM_ITEM':
      return { ...state, miscMetalsCustom: (state.miscMetalsCustom || []).map(_it => _it.id === action.id ? { ..._it, ...action.patch } : _it), isDirty: true };
    case 'DELETE_MM_CUSTOM_ITEM':
      return { ...state, miscMetalsCustom: (state.miscMetalsCustom || []).filter(_it => _it.id !== action.id), isDirty: true };

    case 'UPDATE_QUOTE_EXCL_LINE':
      return { ...state, quoteExclOverrides: { ...(state.quoteExclOverrides || {}), [action.key]: { ...((state.quoteExclOverrides || {})[action.key] || {}), ...action.patch } }, isDirty: true };
    case 'RESET_QUOTE_EXCL_LINE': {
      const _o = { ...(state.quoteExclOverrides || {}) };
      delete _o[action.key];
      return { ...state, quoteExclOverrides: _o, isDirty: true };
    }
    case 'ADD_QUOTE_EXCL_CUSTOM':
      return { ...state, quoteExclCustom: [...(state.quoteExclCustom || []), { id: 'qec-' + Date.now() + '-' + Math.floor(Math.random()*1000), text: action.text || '' }], isDirty: true };
    case 'UPDATE_QUOTE_EXCL_CUSTOM':
      return { ...state, quoteExclCustom: (state.quoteExclCustom || []).map(_l => _l.id === action.id ? { ..._l, text: action.text } : _l), isDirty: true };
    case 'DELETE_QUOTE_EXCL_CUSTOM':
      return { ...state, quoteExclCustom: (state.quoteExclCustom || []).filter(_l => _l.id !== action.id), isDirty: true };
    case 'UPDATE_QUOTE_TERMS_LINE':
      return { ...state, quoteTermsOverrides: { ...(state.quoteTermsOverrides || {}), [action.key]: { ...((state.quoteTermsOverrides || {})[action.key] || {}), ...action.patch } }, isDirty: true };
    case 'RESET_QUOTE_TERMS_LINE': {
      const _o = { ...(state.quoteTermsOverrides || {}) };
      delete _o[action.key];
      return { ...state, quoteTermsOverrides: _o, isDirty: true };
    }
    case 'ADD_QUOTE_TERMS_CUSTOM':
      return { ...state, quoteTermsCustom: [...(state.quoteTermsCustom || []), { id: 'qtc-' + Date.now() + '-' + Math.floor(Math.random()*1000), text: action.text || '' }], isDirty: true };
    case 'UPDATE_QUOTE_TERMS_CUSTOM':
      return { ...state, quoteTermsCustom: (state.quoteTermsCustom || []).map(_l => _l.id === action.id ? { ..._l, text: action.text } : _l), isDirty: true };
    case 'DELETE_QUOTE_TERMS_CUSTOM':
      return { ...state, quoteTermsCustom: (state.quoteTermsCustom || []).filter(_l => _l.id !== action.id), isDirty: true };

    default:
      return state
  }
}

/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ localStorage Persistence ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */
const STORAGE_KEY = 'tw-estimator-state';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults so new fields are picked up on updates
      return {
        ...defaultState,
        ...parsed,
        rates: { ...defaultState.rates, ...(parsed.rates || {}) },
        projectInfo: { ...defaultState.projectInfo, ...(parsed.projectInfo || {}) },
      };
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }
  return defaultState;
}

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(projectReducer, null, loadState)
  useEffect(() => {
    dispatch({ type: 'ENSURE_MATERIAL_RATES', payload: [
      { item: 'Stainless Steel 304', rate: 3.50, unit: '$/lb' },
      { item: 'Stainless Steel 316', rate: 5.50, unit: '$/lb' },
      { item: 'Powder Coat', rate: 1.50, unit: '$/lb' },
    ]})
    dispatch({ type: 'ENSURE_EQUIPMENT_DEFAULTS', payload: { pickup: 200, dropoff: 200 } })
  }, [])

  // Auto-save to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }, [state])
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
