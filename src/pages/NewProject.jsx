import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import {
  generateProjectId,
  generateQuoteNumber,
  getProjectsList,
  saveProjectsList,
  saveProjectData,
} from '../utils/projectStore';
import { FolderPlus, ArrowRight, Building2, MapPin, Calendar, User, FileText } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'bidding', label: 'Bidding' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function NewProject() {
  const navigate = useNavigate();
  const { dispatch } = useProject();
  const [form, setForm] = useState({
    projectName: '',
    gcClient: '',
    location: '',
    engineer: '',
    bidDate: '',
    status: 'draft',
    drawingSet: '',
    drawingDate: '',
    notes: '',
  });

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleCreate = () => {
    const id = generateProjectId();
    const quoteNumber = generateQuoteNumber();
    const now = new Date().toISOString();

    // Create project metadata for the index
    const meta = {
      id,
      name: form.projectName || 'Untitled Project',
      gc: form.gcClient,
      quoteNumber,
      status: form.status,
      bidDate: form.bidDate,
      createdAt: now,
      updatedAt: now,
    };

    // Add to projects list
    const list = getProjectsList();
    saveProjectsList([meta, ...list]);

    // Reset ProjectContext to defaults and set project info
    dispatch({ type: 'RESET_TO_DEFAULTS' });
    dispatch({
      type: 'SET_PROJECT_INFO',
      payload: {
        projectName: form.projectName || 'Untitled Project',
        gcClient: form.gcClient,
        location: form.location,
        engineer: form.engineer,
        quoteNumber,
        quoteDate: new Date().toLocaleDateString('en-CA'),
        drawingSet: form.drawingSet,
        drawingDate: form.drawingDate,
        distanceKm: '',
        travelHrs: '',
        buildingAreaSqft: '',
      },
    });

    // Save the fresh state with the project ID
    localStorage.setItem('tw-active-project', id);

    // Navigate to dashboard to start estimating
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <FolderPlus size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">New Project</h1>
          <p className="text-sm text-slate-400">Start a fresh steel estimate from scratch</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
        {/* Project Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
            <Building2 size={14} className="text-blue-400" />
            Project Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.projectName}
            onChange={e => set('projectName', e.target.value)}
            placeholder="e.g. 123 Main Street — Structural Steel"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            autoFocus
          />
        </div>

        {/* GC / Client + Location row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <User size={14} className="text-blue-400" />
              General Contractor / Client
            </label>
            <input
              type="text"
              value={form.gcClient}
              onChange={e => set('gcClient', e.target.value)}
              placeholder="e.g. Mirabelli Contracting"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <MapPin size={14} className="text-blue-400" />
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Toronto, ON"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Engineer + Bid Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <User size={14} className="text-blue-400" />
              Structural Engineer
            </label>
            <input
              type="text"
              value={form.engineer}
              onChange={e => set('engineer', e.target.value)}
              placeholder="e.g. Smith & Associates"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <Calendar size={14} className="text-blue-400" />
              Bid Date
            </label>
            <input
              type="date"
              value={form.bidDate}
              onChange={e => set('bidDate', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Drawing Set + Status row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
              <FileText size={14} className="text-blue-400" />
              Drawing Set / Rev
            </label>
            <input
              type="text"
              value={form.drawingSet}
              onChange={e => set('drawingSet', e.target.value)}
              placeholder="e.g. IFC Rev 3"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-1.5 block">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any initial notes about the project scope..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            <FolderPlus size={18} />
            Create Project
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="text-slate-400 hover:text-white px-4 py-2.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Quick info */}
      <div className="mt-4 bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <p className="text-xs text-slate-500">
          This will create a blank estimate with default rates from your Rates & Config page.
          You can also use <span className="text-blue-400">AI Takeoff</span> to automatically extract quantities from PDF drawings.
        </p>
      </div>
    </div>
  );
}
