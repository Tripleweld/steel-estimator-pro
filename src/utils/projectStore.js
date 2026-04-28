// Project Store — localStorage CRUD for multi-project support
const INDEX_KEY = 'tw-projects-index';
const PROJECT_PREFIX = 'tw-project-';

export function getProjectsList() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); }
  catch { return []; }
}

export function saveProjectsList(list) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export function getProjectData(id) {
  try { return JSON.parse(localStorage.getItem(PROJECT_PREFIX + id) || 'null'); }
  catch { return null; }
}

export function saveProjectData(id, data) {
  localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify({ ...data, _savedAt: new Date().toISOString() }));
}

export function deleteProjectData(id) {
  localStorage.removeItem(PROJECT_PREFIX + id);
  const list = getProjectsList().filter(p => p.id !== id);
  saveProjectsList(list);
}

export function duplicateProject(id) {
  const data = getProjectData(id);
  if (!data) return null;
  const list = getProjectsList();
  const original = list.find(p => p.id === id);
  const newId = generateProjectId();
  const newMeta = {
    ...original,
    id: newId,
    name: (original?.name || 'Project') + ' (Copy)',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const newData = { ...data, projectInfo: { ...data.projectInfo, projectName: newMeta.name } };
  saveProjectData(newId, newData);
  saveProjectsList([newMeta, ...list]);
  return newId;
}

export function generateProjectId() {
  return 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

export function generateQuoteNumber() {
  const d = new Date();
  const seq = Math.floor(Math.random() * 900) + 100;
  return `TW${String(d.getMonth() + 1).padStart(2, '0')}-${seq}-${String(d.getFullYear()).slice(2)}`;
}

export function updateProjectMeta(id, updates) {
  const list = getProjectsList();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  saveProjectsList(list);
}

export function migrateLegacyProject() {
  const legacy = localStorage.getItem('tw-estimator-state');
  if (!legacy) return null;
  const list = getProjectsList();
  if (list.length > 0) return null;
  try {
    const data = JSON.parse(legacy);
    const id = generateProjectId();
    const meta = {
      id,
      name: data.projectInfo?.projectName || 'Untitled Project',
      gc: data.projectInfo?.gcClient || '',
      quoteNumber: data.projectInfo?.quoteNumber || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveProjectData(id, data);
    saveProjectsList([meta]);
    return id;
  } catch { return null; }
}
