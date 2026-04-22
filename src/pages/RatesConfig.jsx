import React, { useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  DollarSign,
  HardHat,
  Shield,
  ShieldCheck,
  Percent,
  Truck,
  PenTool,
  Wrench,
  Layers,
  BookOpen,
  Plus,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (v) => {
  const n = Number(v);
  if (isNaN(n)) return '$0.00';
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
};

const fmtNum = (v, decimals = 2) => {
  const n = Number(v);
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const PROVINCES = ['ON', 'QC', 'AB', 'BC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL', 'NT', 'NU', 'YT'];
const BUILDING_TYPES = ['Commercial', 'Industrial', 'Institutional', 'Residential', 'Infrastructure'];
const SAFETY_OPTIONS = [
  { label: 'None', value: 1.0 },
  { label: 'Low', value: 1.05 },
  { label: 'Medium', value: 1.10 },
  { label: 'High', value: 1.15 },
];

// ---------------------------------------------------------------------------
// Equipment catalog data
// ---------------------------------------------------------------------------
const EQUIPMENT_CATALOG = [
  {
    category: 'Cranes',
    items: [
      { name: '30T RT Crane', dayRate: 2500, weekRate: 12500, monthRate: 40000 },
      { name: '50T RT Crane', dayRate: 3200, weekRate: 16000, monthRate: 51200 },
      { name: '80T RT Crane', dayRate: 4500, weekRate: 22500, monthRate: 72000 },
      { name: '100T RT Crane', dayRate: 6000, weekRate: 30000, monthRate: 96000 },
      { name: '160T Crawler', dayRate: 8500, weekRate: 42500, monthRate: 136000 },
      { name: 'Crane Operator', dayRate: 680, weekRate: 3400, monthRate: 13600 },
    ],
  },
  {
    category: 'Aerial Lifts',
    items: [
      { name: "Scissor Lift 26'", dayRate: 250, weekRate: 1000, monthRate: 2500 },
      { name: "Scissor Lift 32'", dayRate: 325, weekRate: 1300, monthRate: 3250 },
      { name: "Boom Lift 45'", dayRate: 450, weekRate: 1800, monthRate: 4500 },
      { name: "Boom Lift 60'", dayRate: 600, weekRate: 2400, monthRate: 6000 },
      { name: "Boom Lift 80'", dayRate: 850, weekRate: 3400, monthRate: 8500 },
    ],
  },
  {
    category: 'Welding',
    items: [
      { name: 'Welding Machine 300A', dayRate: 150, weekRate: 600, monthRate: 1500 },
      { name: 'Welding Machine 400A', dayRate: 185, weekRate: 740, monthRate: 1850 },
      { name: 'Welding Leads/Cables', dayRate: 50, weekRate: 200, monthRate: 500 },
      { name: 'Gas Bottles', dayRate: 35, weekRate: 140, monthRate: 350 },
    ],
  },
  {
    category: 'Rigging',
    items: [
      { name: 'Chain Slings', dayRate: 45, weekRate: 180, monthRate: 450 },
      { name: 'Nylon Slings', dayRate: 25, weekRate: 100, monthRate: 250 },
      { name: 'Shackles Set', dayRate: 30, weekRate: 120, monthRate: 300 },
      { name: 'Spreader Bar', dayRate: 125, weekRate: 500, monthRate: 1250 },
      { name: 'Come-Along', dayRate: 35, weekRate: 140, monthRate: 350 },
    ],
  },
  {
    category: 'Power Tools',
    items: [
      { name: 'Mag Drill', dayRate: 95, weekRate: 380, monthRate: 950 },
      { name: 'Ironworker Punch', dayRate: 175, weekRate: 700, monthRate: 1750 },
      { name: 'Porta-Band Saw', dayRate: 45, weekRate: 180, monthRate: 450 },
      { name: 'Impact Wrench', dayRate: 40, weekRate: 160, monthRate: 400 },
      { name: 'Grinder 7"', dayRate: 35, weekRate: 140, monthRate: 350 },
    ],
  },
  {
    category: 'Safety Equipment',
    items: [
      { name: 'Harness + Lanyard', dayRate: 25, weekRate: 100, monthRate: 250 },
      { name: 'Guardrail System', dayRate: 75, weekRate: 300, monthRate: 750 },
      { name: 'Safety Netting', dayRate: 150, weekRate: 600, monthRate: 1500 },
    ],
  },
  {
    category: 'Site Equipment',
    items: [
      { name: 'Job Box', dayRate: 15, weekRate: 60, monthRate: 150 },
      { name: 'Generator 7.5kW', dayRate: 125, weekRate: 500, monthRate: 1250 },
      { name: 'Compressor', dayRate: 95, weekRate: 380, monthRate: 950 },
      { name: 'Heater (winter)', dayRate: 85, weekRate: 340, monthRate: 850 },
    ],
  },
  {
    category: 'Transport',
    items: [
      { name: 'Flatbed Truck', dayRate: 450, weekRate: 2250, monthRate: 7200 },
      { name: 'Float/Lowboy', dayRate: 650, weekRate: 3250, monthRate: 10400 },
      { name: 'Escort Vehicle', dayRate: 275, weekRate: 1375, monthRate: 4400 },
      { name: 'Permit (oversize)', dayRate: 500, weekRate: 500, monthRate: 500 },
    ],
  },
];

const CODE_LIMITS = [
  { label: 'Guard Height Min', value: '1,070 mm' },
  { label: 'Handrail Height', value: '865-965 mm' },
  { label: 'Stair Width Min', value: '900 mm' },
  { label: 'Riser Height Max', value: '200 mm' },
  { label: 'Tread Depth Min', value: '250 mm' },
  { label: 'Landing Length Min', value: '900 mm' },
  { label: 'Ladder Rung Spacing', value: '300 mm' },
  { label: 'Ladder Width Min', value: '450 mm' },
  { label: 'Cage Start Height', value: '2,200 mm' },
  { label: 'Max Floor Opening', value: '25 mm' },
  { label: 'Live Load \u2014 Stairs', value: '4.8 kPa' },
];

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------
const SectionHeader = ({ icon: Icon, color, title, open, toggle }) => (
  <button
    onClick={toggle}
    className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg bg-steel-900/60 border border-steel-700/50 hover:bg-steel-800/60 transition-colors"
  >
    <Icon className={`w-5 h-5 ${color}`} />
    <span className="text-sm font-semibold uppercase tracking-wider text-steel-200 flex-1">{title}</span>
    {open ? <ChevronDown className="w-4 h-4 text-steel-400" /> : <ChevronRight className="w-4 h-4 text-steel-400" />}
  </button>
);

const BlueInput = ({ type = 'text', value, onChange, className = '', ...rest }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={onChange}
    className={`w-full bg-blue-500/5 border border-blue-500/30 rounded px-3 py-1.5 text-sm text-white placeholder-steel-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${className}`}
    {...rest}
  />
);

const BlueSelect = ({ value, onChange, children, className = '' }) => (
  <select
    value={value ?? ''}
    onChange={onChange}
    className={`w-full bg-steel-900 border border-blue-500/30 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${className}`}
  >
    {children}
  </select>
);

const ReadOnlyCell = ({ value }) => (
  <span className="text-sm text-white">{value}</span>
);

const Label = ({ children }) => (
  <label className="text-xs text-steel-400 font-medium">{children}</label>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function RatesConfig() {
  const { state, dispatch } = useProject();

  // Collapse state — all open by default
  const [open, setOpen] = useState({
    project: true,
    material: true,
    labour: true,
    safety: true,
    activeSafety: true,
    markup: true,
    travel: true,
    eng: true,
    equipment: true,
    misc: true,
    code: true,
  });

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  // ---- dispatchers --------------------------------------------------
  const setProjectField = useCallback(
    (field, value) => dispatch({ type: 'SET_PROJECT_INFO', payload: { [field]: value } }),
    [dispatch],
  );

  const setMarkup = useCallback(
    (key, value) => dispatch({ type: 'SET_MARKUP', payload: { [key]: Number(value) } }),
    [dispatch],
  );

  const setMaterialRate = useCallback(
    (key, value) => dispatch({ type: 'SET_MATERIAL_RATE_BY_KEY', payload: { key, value: Number(value) } }),
    [dispatch],
  );

  const setLabourRate = useCallback(
    (key, value) => dispatch({ type: 'SET_LABOUR_RATES', payload: { [key]: Number(value) } }),
    [dispatch],
  );

  const setSafetyFactor = useCallback(
    (key, value) => dispatch({ type: 'SET_SAFETY_FACTORS', payload: { [key]: Number(value) } }),
    [dispatch],
  );

  const setTravelFreight = useCallback(
    (key, value) => dispatch({ type: 'SET_TRAVEL_FREIGHT', payload: { [key]: value } }),
    [dispatch],
  );

  const setEngDrawings = useCallback(
    (key, value) => dispatch({ type: 'SET_ENG_DRAWINGS', payload: { [key]: value } }),
    [dispatch],
  );

  const updateEquipment = useCallback(
    (itemName, field, value) =>
      dispatch({ type: 'UPDATE_EQUIPMENT', payload: { itemName, [field]: Number(value) } }),
    [dispatch],
  );

  const setMiscMetalsRate = useCallback(
    (key, value) => dispatch({ type: 'SET_MISC_METALS_RATE_BY_KEY', payload: { key, value: Number(value) } }),
    [dispatch],
  );

  const setProductivity = useCallback(
    (key, value) => dispatch({ type: 'SET_PRODUCTIVITY', payload: { [key]: Number(value) } }),
    [dispatch],
  );

  // ---- accessors with defaults --------------------------------------
  const pi = state.projectInfo || {};
  const mr = state.rates?.materialRatesByKey || {};
  const lr = state.rates?.labourRates || {};
  const sf = state.rates?.safetyFactors || {};
  const mkp = state.rates?.markup || {};
  const tf = state.rates?.travelFreight || {};
  const eng = state.rates?.engDrawings || {};
  const equip = state.rates?.equipment || {};
  const mm = state.rates?.miscMetalsRatesByKey || {};

  // Material defaults
  const matDef = (key, def) => (mr[key] !== undefined ? mr[key] : def);
  const labDef = (key, def) => (lr[key] !== undefined ? lr[key] : def);
  const sfDef = (key, def) => (sf[key] !== undefined ? sf[key] : def);
  const mkpDef = (key, def) => (mkp[key] !== undefined ? mkp[key] : def);
  const tfDef = (key, def) => (tf[key] !== undefined ? tf[key] : def);
  const engDef = (key, def) => (eng[key] !== undefined ? eng[key] : def);
  const mmDef = (key, def) => (mm[key] !== undefined ? mm[key] : def);

  // Equipment helper
  const equipItem = (name) => {
    if (equip.items) {
      const found = equip.items.find((i) => i.name === name);
      if (found) return found;
    }
    return { qty: 0, days: 0 };
  };

  // Travel time auto-calc
  const distanceKm = tfDef('distanceToSite', 50);
  const travelTimeCalc = (Number(distanceKm) / 80).toFixed(2);

  return (
    <div className="min-h-screen bg-steel-950 text-white p-6 space-y-4 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Rates &amp; Configuration</h1>
        <p className="text-sm text-steel-400 mt-1">Steel Estimator Pro v5.1 — Triple Weld Inc.</p>
      </div>

      {/* ============================================================= */}
      {/* 1. PROJECT INFORMATION                                        */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={Building2}
          color="text-fire-500"
          title="1. Project Information"
          open={open.project}
          toggle={() => toggle('project')}
        />
        {open.project && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Project Name */}
            <div className="space-y-1">
              <Label>Project Name</Label>
              <BlueInput
                value={pi.projectName || ''}
                onChange={(e) => setProjectField('projectName', e.target.value)}
              />
            </div>
            {/* Quote Number */}
            <div className="space-y-1">
              <Label>Quote Number</Label>
              <BlueInput
                value={pi.quoteNumber || ''}
                onChange={(e) => setProjectField('quoteNumber', e.target.value)}
              />
            </div>
            {/* Client / GC */}
            <div className="space-y-1">
              <Label>Client / GC</Label>
              <BlueInput
                value={pi.clientGC || ''}
                onChange={(e) => setProjectField('clientGC', e.target.value)}
              />
            </div>
            {/* Project Address */}
            <div className="space-y-1">
              <Label>Project Address</Label>
              <BlueInput
                value={pi.projectAddress || ''}
                onChange={(e) => setProjectField('projectAddress', e.target.value)}
              />
            </div>
            {/* City */}
            <div className="space-y-1">
              <Label>City</Label>
              <BlueInput
                value={pi.city || ''}
                onChange={(e) => setProjectField('city', e.target.value)}
              />
            </div>
            {/* Province */}
            <div className="space-y-1">
              <Label>Province</Label>
              <BlueSelect
                value={pi.province || 'ON'}
                onChange={(e) => setProjectField('province', e.target.value)}
              >
                {PROVINCES.map((p) => (
                  <option key={p} value={p} className="bg-steel-900 text-white">{p}</option>
                ))}
              </BlueSelect>
            </div>
            {/* Building Type */}
            <div className="space-y-1">
              <Label>Building Type</Label>
              <BlueSelect
                value={pi.buildingType || 'Commercial'}
                onChange={(e) => setProjectField('buildingType', e.target.value)}
              >
                {BUILDING_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-steel-900 text-white">{t}</option>
                ))}
              </BlueSelect>
            </div>
            {/* Building Area */}
            <div className="space-y-1">
              <Label>Building Area (sqft)</Label>
              <BlueInput
                type="number"
                value={pi.buildingArea || ''}
                onChange={(e) => setProjectField('buildingArea', Number(e.target.value))}
              />
            </div>
            {/* Number of Floors */}
            <div className="space-y-1">
              <Label>Number of Floors</Label>
              <BlueInput
                type="number"
                value={pi.numberOfFloors || ''}
                onChange={(e) => setProjectField('numberOfFloors', Number(e.target.value))}
              />
            </div>
            {/* Building Height */}
            <div className="space-y-1">
              <Label>Building Height (ft)</Label>
              <BlueInput
                type="number"
                value={pi.buildingHeight || ''}
                onChange={(e) => setProjectField('buildingHeight', Number(e.target.value))}
              />
            </div>
            {/* Bid Due Date */}
            <div className="space-y-1">
              <Label>Bid Due Date</Label>
              <BlueInput
                type="date"
                value={pi.bidDueDate || ''}
                onChange={(e) => setProjectField('bidDueDate', e.target.value)}
              />
            </div>
            {/* Project Start Date */}
            <div className="space-y-1">
              <Label>Project Start Date</Label>
              <BlueInput
                type="date"
                value={pi.projectStartDate || ''}
                onChange={(e) => setProjectField('projectStartDate', e.target.value)}
              />
            </div>
            {/* Estimated Duration */}
            <div className="space-y-1">
              <Label>Estimated Duration (weeks)</Label>
              <BlueInput
                type="number"
                value={pi.estimatedDuration || ''}
                onChange={(e) => setProjectField('estimatedDuration', Number(e.target.value))}
              />
            </div>
            {/* Estimator Name */}
            <div className="space-y-1">
              <Label>Estimator Name</Label>
              <BlueInput
                value={pi.estimatorName !== undefined ? pi.estimatorName : 'Gustavo'}
                onChange={(e) => setProjectField('estimatorName', e.target.value)}
              />
            </div>
            {/* Notes */}
            <div className="space-y-1 md:col-span-2 lg:col-span-2">
              <Label>Notes / Special Conditions</Label>
              <textarea
                value={pi.notes || ''}
                onChange={(e) => setProjectField('notes', e.target.value)}
                rows={3}
                className="w-full bg-blue-500/5 border border-blue-500/30 rounded px-3 py-1.5 text-sm text-white placeholder-steel-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 2. MATERIAL RATES                                             */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={DollarSign}
          color="text-green-400"
          title="2. Material Rates"
          open={open.material}
          toggle={() => toggle('material')}
        />
        {open.material && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Structural Steel Rate ($/lb)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={matDef('structuralSteel', 1.15)}
                onChange={(e) => setMaterialRate('structuralSteel', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>HSS / Tube Rate ($/lb)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={matDef('hssTube', 1.35)}
                onChange={(e) => setMaterialRate('hssTube', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Plate / Flat Bar Rate ($/lb)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={matDef('plateFlatBar', 1.25)}
                onChange={(e) => setMaterialRate('plateFlatBar', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>OWSJ Rate ($/lb)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={matDef('owsj', 0.85)}
                onChange={(e) => setMaterialRate('owsj', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Steel Deck Rate ($/sqft)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={matDef('steelDeck', 4.50)}
                onChange={(e) => setMaterialRate('steelDeck', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Anchor Bolt Rate ($/each)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={matDef('anchorBolt', 2.50)}
                onChange={(e) => setMaterialRate('anchorBolt', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 3. LABOUR RATES                                               */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={HardHat}
          color="text-yellow-400"
          title="3. Labour Rates"
          open={open.labour}
          toggle={() => toggle('labour')}
        />
        {open.labour && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Fabrication Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={labDef('fabrication', 65)}
                onChange={(e) => setLabourRate('fabrication', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Installation Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={labDef('installation', 75)}
                onChange={(e) => setLabourRate('installation', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Drafting / Detailing Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={labDef('draftingDetailing', 55)}
                onChange={(e) => setLabourRate('draftingDetailing', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Project Management Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={labDef('projectManagement', 65)}
                onChange={(e) => setLabourRate('projectManagement', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Travel Time Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={labDef('travelTime', 55)}
                onChange={(e) => setLabourRate('travelTime', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 4. SAFETY FACTORS                                             */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={Shield}
          color="text-red-400"
          title="4. Safety Factors"
          open={open.safety}
          toggle={() => toggle('safety')}
        />
        {open.safety && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Shop Safety Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={sfDef('shop', 1.10)}
                onChange={(e) => setSafetyFactor('shop', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Field Safety Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={sfDef('field', 1.15)}
                onChange={(e) => setSafetyFactor('field', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Crane Safety Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={sfDef('crane', 1.20)}
                onChange={(e) => setSafetyFactor('crane', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Rigging Safety Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={sfDef('rigging', 1.10)}
                onChange={(e) => setSafetyFactor('rigging', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 5. ACTIVE SAFETY FACTORS                                      */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={ShieldCheck}
          color="text-orange-400"
          title="5. Active Safety Factors"
          open={open.activeSafety}
          toggle={() => toggle('activeSafety')}
        />
        {open.activeSafety && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Active Fab Safety</Label>
              <BlueSelect
                value={sfDef('activeFab', 1.0)}
                onChange={(e) => setSafetyFactor('activeFab', e.target.value)}
              >
                {SAFETY_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} className="bg-steel-900 text-white">
                    {o.label} ({o.value.toFixed(2)}x)
                  </option>
                ))}
              </BlueSelect>
            </div>
            <div className="space-y-1">
              <Label>Active Install Safety</Label>
              <BlueSelect
                value={sfDef('activeInstall', 1.0)}
                onChange={(e) => setSafetyFactor('activeInstall', e.target.value)}
              >
                {SAFETY_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} className="bg-steel-900 text-white">
                    {o.label} ({o.value.toFixed(2)}x)
                  </option>
                ))}
              </BlueSelect>
            </div>
            <div className="space-y-1">
              <Label>Active Crane Safety</Label>
              <BlueSelect
                value={sfDef('activeCrane', 1.0)}
                onChange={(e) => setSafetyFactor('activeCrane', e.target.value)}
              >
                {SAFETY_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} className="bg-steel-900 text-white">
                    {o.label} ({o.value.toFixed(2)}x)
                  </option>
                ))}
              </BlueSelect>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 6. MARKUP & TAX                                               */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={Percent}
          color="text-purple-400"
          title="6. Markup & Tax"
          open={open.markup}
          toggle={() => toggle('markup')}
        />
        {open.markup && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <Label>Markup %</Label>
              <BlueInput
                type="number"
                step="0.1"
                value={mkpDef('markup', 15)}
                onChange={(e) => setMarkup('markup', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>HST %</Label>
              <BlueInput
                type="number"
                step="0.1"
                value={mkpDef('hst', 13)}
                onChange={(e) => setMarkup('hst', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Contingency %</Label>
              <BlueInput
                type="number"
                step="0.1"
                value={mkpDef('contingency', 5)}
                onChange={(e) => setMarkup('contingency', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Escalation %</Label>
              <BlueInput
                type="number"
                step="0.1"
                value={mkpDef('escalation', 0)}
                onChange={(e) => setMarkup('escalation', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Bond %</Label>
              <BlueInput
                type="number"
                step="0.1"
                value={mkpDef('bond', 0)}
                onChange={(e) => setMarkup('bond', Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 7. TRAVEL & FREIGHT                                           */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={Truck}
          color="text-cyan-400"
          title="7. Travel & Freight"
          open={open.travel}
          toggle={() => toggle('travel')}
        />
        {open.travel && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Distance to Site (km)</Label>
              <BlueInput
                type="number"
                step="1"
                value={tfDef('distanceToSite', 50)}
                onChange={(e) => setTravelFreight('distanceToSite', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Travel Time (hrs one-way) — auto-calc</Label>
              <div className="w-full bg-steel-800/60 border border-steel-700/50 rounded px-3 py-1.5 text-sm text-white">
                {travelTimeCalc} hrs
              </div>
            </div>
            <div className="space-y-1">
              <Label>Hotel Rate ($/night)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={tfDef('hotelRate', 175)}
                onChange={(e) => setTravelFreight('hotelRate', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Per Diem ($/day)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={tfDef('perDiem', 75)}
                onChange={(e) => setTravelFreight('perDiem', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Mob/Demob (lump sum $)</Label>
              <BlueInput
                type="number"
                step="1"
                value={tfDef('mobDemob', 2500)}
                onChange={(e) => setTravelFreight('mobDemob', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Shipping / Freight Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={tfDef('shippingFreight', 125)}
                onChange={(e) => setTravelFreight('shippingFreight', Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 8. P.ENG & SHOP DRAWINGS                                      */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={PenTool}
          color="text-indigo-400"
          title="8. P.Eng & Shop Drawings"
          open={open.eng}
          toggle={() => toggle('eng')}
        />
        {open.eng && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Engineering Review Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={engDef('engineeringReviewRate', 185)}
                onChange={(e) => setEngDrawings('engineeringReviewRate', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Detailing Rate ($/hr)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={engDef('detailingRate', 55)}
                onChange={(e) => setEngDrawings('detailingRate', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Estimated Review Hours</Label>
              <BlueInput
                type="number"
                step="1"
                value={engDef('estimatedReviewHours', 16)}
                onChange={(e) => setEngDrawings('estimatedReviewHours', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Connection Design Hours</Label>
              <BlueInput
                type="number"
                step="1"
                value={engDef('connectionDesignHours', 24)}
                onChange={(e) => setEngDrawings('connectionDesignHours', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>PE Stamp Fee (lump sum $)</Label>
              <BlueInput
                type="number"
                step="1"
                value={engDef('peStampFee', 3500)}
                onChange={(e) => setEngDrawings('peStampFee', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Miscellaneous Drawing Costs ($)</Label>
              <BlueInput
                type="number"
                step="1"
                value={engDef('miscDrawingCosts', 500)}
                onChange={(e) => setEngDrawings('miscDrawingCosts', Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 9. EQUIPMENT RENTAL CATALOG                                   */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={Wrench}
          color="text-amber-400"
          title="9. Equipment Rental Catalog"
          open={open.equipment}
          toggle={() => toggle('equipment')}
        />
        {open.equipment && (
          <div className="mt-2 space-y-4">
            {EQUIPMENT_CATALOG.map((cat) => (
              <div
                key={cat.category}
                className="p-4 rounded-lg bg-steel-900/60 border border-steel-700/50"
              >
                <h3 className="text-sm font-semibold text-steel-300 mb-3 uppercase tracking-wide">
                  {cat.category}
                </h3>
                {/* Table header */}
                <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-steel-500 font-medium pb-2 border-b border-steel-700/40 mb-2">
                  <div className="col-span-3">Item</div>
                  <div className="col-span-1 text-right">Day</div>
                  <div className="col-span-1 text-right">Week</div>
                  <div className="col-span-1 text-right">Month</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-center">Days</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                {cat.items.map((item) => {
                  const ei = equipItem(item.name);
                  const qty = ei.qty || 0;
                  const days = ei.days || 0;
                  const total = qty * days * item.dayRate;
                  return (
                    <div
                      key={item.name}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center py-1.5 border-b border-steel-800/30 last:border-0"
                    >
                      <div className="col-span-3 text-sm text-white truncate">{item.name}</div>
                      <div className="col-span-1 text-sm text-steel-300 text-right">
                        {fmt(item.dayRate)}
                      </div>
                      <div className="col-span-1 text-sm text-steel-300 text-right">
                        {fmt(item.weekRate)}
                      </div>
                      <div className="col-span-1 text-sm text-steel-300 text-right">
                        {fmt(item.monthRate)}
                      </div>
                      <div className="col-span-2">
                        <BlueInput
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => updateEquipment(item.name, 'qty', e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <BlueInput
                          type="number"
                          min="0"
                          value={days}
                          onChange={(e) => updateEquipment(item.name, 'days', e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div className="col-span-2 text-sm text-right font-medium text-white">
                        {fmt(total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 10. MISC METALS RATES                                         */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={Layers}
          color="text-teal-400"
          title="10. Misc Metals Rates"
          open={open.misc}
          toggle={() => toggle('misc')}
        />
        {open.misc && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Stair Fabrication Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={mmDef('stairFabFactor', 1.8)}
                onChange={(e) => setMiscMetalsRate('stairFabFactor', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Railing Fab Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={mmDef('railingFabFactor', 2.0)}
                onChange={(e) => setMiscMetalsRate('railingFabFactor', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Ladder Fab Factor</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={mmDef('ladderFabFactor', 1.5)}
                onChange={(e) => setMiscMetalsRate('ladderFabFactor', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Grating Rate ($/sqft)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={mmDef('gratingRate', 12.50)}
                onChange={(e) => setMiscMetalsRate('gratingRate', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Embed Plate Rate ($/lb)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={mmDef('embedPlateRate', 2.25)}
                onChange={(e) => setMiscMetalsRate('embedPlateRate', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Bollard Rate ($/each)</Label>
              <BlueInput
                type="number"
                step="0.01"
                value={mmDef('bollardRate', 450)}
                onChange={(e) => setMiscMetalsRate('bollardRate', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 11. CODE LIMITS — OBC & OHSA                                  */}
      {/* ============================================================= */}
      <div>
        <SectionHeader
          icon={BookOpen}
          color="text-rose-400"
          title="11. Code Limits — OBC & OHSA"
          open={open.code}
          toggle={() => toggle('code')}
        />
        {open.code && (
          <div className="mt-2 p-4 rounded-lg bg-steel-900/60 border border-steel-700/50">
            <p className="text-xs text-steel-500 mb-3">
              Reference values (read-only). Based on Ontario Building Code &amp; OHSA requirements.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CODE_LIMITS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between bg-steel-800/40 rounded px-3 py-2 border border-steel-700/30"
                >
                  <span className="text-xs text-steel-400">{item.label}</span>
                  <ReadOnlyCell value={item.value} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
