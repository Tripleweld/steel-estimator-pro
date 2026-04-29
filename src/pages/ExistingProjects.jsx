import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import {
  getProjectsList,
  getProjectData,
  deleteProjectData,
  duplicateProject,
  migrateLegacyProject,
  updateProjectMeta,
} from '../utils/projectStore';
import {
  FolderOpen, Search, Plus, Copy, Trash2, ChevronDown,
  Calendar, Building2, ArrowRight, Filter, AlertTriangle,
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-600 text-slate-200',
  bidding: 'bg-yellow-600/80 text-yellow-100',
  submitted: 'bg-blue-600/80 text-blue-100',
  awarded: 'bg-green-600/80 text-green-100',
  lost: 'bg-red-600/60 text-red-200',
  cancelled: 'bg-slate-700 text-slate-400',
};

const STATUS_OPTIONS = ['all', 'draft', 'bidding', 'submitted', 'awarded', 'lost', 'cancelled'];

export default function ExistingProjects() {
  const navigate = useNavigate();
  const { dispatch } = useProject();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Load projects on mount + migrate legacy if needed
  useEffect(() => {
    migrateLegacyProject();
    setProjects(getProjectsList());
  }, []);

  // Filtered + searched projects
  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== 'all') {
      list = list.filter(p => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.gc || '').toLowerCase().includes(q) ||
        (p.quoteNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, search, statusFilter]);

  const openProject = (id) => {
    const data = getProjectData(id);
    if (!data) return;
    dispatch({ type: 'LOAD_PROJECT', payload: data });
    localStorage.setItem('tw-active-project', id);
    localStorage.setItem('tw-estimator-state', JSON.stringify(data));
    navigate('/');
  };

  const handleDuplicate = (id) => {
    const newId = duplicateProject(id);
    if (newId) {
      setProjects(getProjectsList());
    }
  };

  const handleDelete = (id) => {
    deleteProjectData(id);
    setProjects(getProjectsList());
    setDeleteConfirm(null);
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
  };

  const statusCounts = useMemo(() => {
    const counts = { all: projects.length };
    projects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <FolderOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Existing Projects</h1>
            <p className="text-sm text-slate-400">
              {projects.length} project{projects.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/new-project')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by project name, GC, or quote number..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {s} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Projects table */}
      {filtered.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          {projects.length === 0 ? (
            <>
              <FolderOpen size={48} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 mb-4">No projects yet. Create your first estimate!</p>
              <button
                onClick={() => navigate('/new-project')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <Plus size={18} />
                New Project
              </button>
            </>
          ) : (
            <>
              <Search size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No projects match your search.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Project</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">GC / Client</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Quote #</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Bid Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Modified</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-700/50 hover:bg-slate-750 hover:bg-slate-700/30 transition-colors cursor-pointer group"
                  onClick={() => openProject(p.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {p.name || 'Untitled'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{p.gc || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.quoteNumber || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                      {p.status || 'draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.bidDate || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openProject(p.id)}
                        className="p-1.5 rounded hover:bg-blue-600/20 text-blue-400 hover:text-blue-300"
                        title="Open project"
                      >
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(p.id)}
                        className="p-1.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-white"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        className="p-1.5 rounded hover:bg-red-600/20 text-slate-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="text-white font-semibold">Delete Project?</h3>
            </div>
            <p className="text-slate-400 text-sm mb-5">
              This will permanently delete <span className="text-white font-medium">{projects.find(p => p.id === deleteConfirm)?.name || 'this project'}</span> and all its data. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
