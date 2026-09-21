const API = '/api';

let currentEditId = null;
let currentView = 'all';
let currentCategory = 'all';
let allNotes = [];
let categories = [];

const categoryColors = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

// DOM Elements
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const editorModal = document.getElementById('editor-modal');
const categoryModal = document.getElementById('category-modal');
const searchInput = document.getElementById('search-input');
const clearSearch = document.getElementById('clear-search');
const sectionTitle = document.getElementById('section-title');

// Toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.querySelector('span').textContent = message;
  toast.querySelector('i').className = type === 'error'
    ? 'fas fa-exclamation-circle'
    : 'fas fa-check-circle';
  toast.querySelector('i').style.color = type === 'error' ? 'var(--danger)' : 'var(--success)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Safe value for HTML data-attribute (handles quotes, newlines, unicode)
function encodeAttr(value) {
  return encodeURIComponent(String(value == null ? '' : value));
}

function decodeAttr(value) {
  try {
    return decodeURIComponent(value || '');
  } catch (e) {
    return '';
  }
}

// Fetch with timeout so hanging requests fail visibly instead of silently
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Fetch all data
async function loadData() {
  try {
    const [notesRes, catsRes] = await Promise.all([
      fetchWithTimeout(`${API}/notes`, {}, 8000),
      fetchWithTimeout(`${API}/categories`, {}, 8000)
    ]);
    const notes = notesRes.ok ? await notesRes.json() : [];
    const cats = catsRes.ok ? await catsRes.json() : [];
    allNotes = notes;
    categories = cats;
    renderCategories();
    renderNotes();
  } catch (error) {
    console.error('Failed to load data:', error);
    showToast('Failed to load notes', 'error');
  }
}

// Render categories sidebar
function renderCategories() {
  const list = document.getElementById('category-list');
  const existing = list.querySelector('[data-category="all"]');
  const newItems = document.createElement('div');
  newItems.className = 'category-list';
  newItems.innerHTML = `
    <button class="category-item ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
      <span class="cat-dot" style="background: linear-gradient(135deg,#6366f1,#8b5cf6)"></span>
      <span>All</span>
    </button>
    ${categories.map(cat => `
      <button class="category-item ${currentCategory === String(cat.id) ? 'active' : ''}" data-category="${cat.id}">
        <span class="cat-dot" style="background: ${cat.color}"></span>
        <span>${escapeHtml(cat.name)}</span>
        <span class="count" style="margin-left:auto">${cat.note_count || 0}</span>
      </button>
    `).join('')}
  `;
  existing.replaceWith(newItems);

  // Bind events
  newItems.querySelectorAll('.category-item').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category;
      currentView = 'all';
      document.getElementById('category-list').querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelector('[data-view="all"]').classList.add('active');
      renderNotes();
    });
  });

  // Update category select in editor
  updateCategorySelect();
}

function updateCategorySelect() {
  const select = document.getElementById('note-category');
  select.innerHTML = '<option value="">No Category</option>' + categories.map(cat =>
    `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
  ).join('');
}

// Render notes
function renderNotes() {
  let filtered = [...allNotes];

  if (currentView === 'pinned') {
    filtered = filtered.filter(n => n.pinned);
    sectionTitle.textContent = 'Pinned Notes';
  } else if (currentCategory !== 'all') {
    filtered = filtered.filter(n => String(n.category_id) === String(currentCategory));
    const cat = categories.find(c => String(c.id) === String(currentCategory));
    sectionTitle.textContent = cat ? cat.name : 'Notes';
  } else {
    sectionTitle.textContent = 'All Notes';
  }

  const search = searchInput.value.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(search) ||
      n.content.toLowerCase().includes(search) ||
      (n.tags || []).some(t => t.toLowerCase().includes(search))
    );
  }

  filtered.sort((a, b) => (b.pinned - a.pinned) || new Date(b.updated_at) - new Date(a.updated_at));

  // Update counts
  document.getElementById('all-count').textContent = allNotes.length;
  document.getElementById('pin-count').textContent = allNotes.filter(n => n.pinned).length;

  if (filtered.length === 0) {
    notesGrid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  notesGrid.innerHTML = filtered.map(note => {
    const cat = categories.find(c => String(c.id) === String(note.category_id));
    const isPinned = note.pinned;
    const contentPreview = stripHtml(note.content).slice(0, 150);
    const tags = note.tags || [];

    return `
      <div class="note-card ${isPinned ? 'pinned' : ''}" data-note-id="${encodeAttr(note.id)}" data-title="${encodeAttr(note.title)}" data-content="${encodeAttr(note.content)}" data-tags="${encodeAttr(JSON.stringify(tags))}" data-category="${encodeAttr(note.category_id || '')}" data-pinned="${isPinned}" data-color="${encodeAttr(note.color || '#ffffff')}">
        <div class="note-card-header">
          <div class="note-card-title">${escapeHtml(note.title) || 'Untitled Note'}</div>
          ${isPinned ? '<i class="fas fa-thumbtack pin-icon"></i>' : ''}
        </div>
        ${contentPreview ? `<div class="note-card-body">${contentPreview}</div>` : '<div class="note-card-body" style="color:var(--text-muted)">No content</div>'}
        <div class="note-card-footer">
          ${tags.length > 0 ? `
            <div class="note-tags">
              ${tags.slice(0, 2).map(tag => `<span class="note-tag">#${escapeHtml(tag)}</span>`).join('')}
              ${tags.length > 2 ? `<span class="note-tag">+${tags.length - 2}</span>` : ''}
            </div>
          ` : '<div></div>'}
          <div class="note-meta">
            ${cat ? `<span class="category-badge"><span class="cat-dot" style="background:${cat.color};width:8px;height:8px"></span>${escapeHtml(cat.name)}</span>` : ''}
            <span>${formatDate(note.updated_at)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bind click events on cards
  notesGrid.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => openEditorFromCard(card));
  });
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 3600000) return 'just now';
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Open editor for new note
function openEditor() {
  currentEditId = null;
  document.getElementById('note-title').value = '';
  document.getElementById('note-content').innerHTML = '';
  document.getElementById('note-tags').value = '';
  document.getElementById('note-category').value = '';
  document.getElementById('note-pinned').checked = false;
  document.getElementById('note-color').value = '#ffffff';
  document.getElementById('delete-note-btn').style.display = 'none';
  editorModal.classList.add('active');
  setTimeout(() => document.getElementById('note-title').focus(), 100);
}

// Open editor from note card
function openEditorFromCard(card) {
  currentEditId = decodeAttr(card.dataset.noteId);
  document.getElementById('note-title').value = decodeAttr(card.dataset.title);
  document.getElementById('note-content').innerHTML = decodeAttr(card.dataset.content);
  let tags = [];
  try {
    tags = JSON.parse(decodeAttr(card.dataset.tags)) || [];
  } catch (e) {
    tags = [];
  }
  document.getElementById('note-tags').value = tags.join(', ');
  document.getElementById('note-category').value = decodeAttr(card.dataset.category) || '';
  document.getElementById('note-pinned').checked = card.dataset.pinned === 'true';
  document.getElementById('note-color').value = decodeAttr(card.dataset.color) || '#ffffff';
  document.getElementById('delete-note-btn').style.display = 'flex';
  editorModal.classList.add('active');
  setTimeout(() => document.getElementById('note-title').focus(), 100);
}

// Save note
async function saveNote() {
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').innerHTML;
  const tags = document.getElementById('note-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const category_id = document.getElementById('note-category').value || null;
  const pinned = document.getElementById('note-pinned').checked;
  const color = document.getElementById('note-color').value;

  if (!title && !content.replace(/<[^>]*>/g, '').trim()) {
    showToast('Note is empty', 'error');
    return;
  }

  const data = {
    title: title || 'Untitled Note',
    content,
    tags,
    category_id,
    pinned,
    color
  };

  try {
    const res = currentEditId
      ? await fetch(`${API}/notes/${currentEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      : await fetch(`${API}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

    if (!res.ok) {
      let message = 'Failed to save note';
      try {
        const err = await res.json();
        if (err && err.error) message = err.error;
      } catch (_) {}
      showToast(message, 'error');
      return;
    }

    showToast(currentEditId ? 'Note updated!' : 'Note created!');
    editorModal.classList.remove('active');
    await loadData();
  } catch (error) {
    console.error('Failed to save note:', error);
    showToast('Failed to save note', 'error');
  }
}

// Delete note
async function deleteNote() {
  if (!currentEditId) return;
  if (!confirm('Are you sure you want to delete this note?')) return;

  try {
    await fetchWithTimeout(`${API}/notes/${currentEditId}`, { method: 'DELETE' }, 10000);
    editorModal.classList.remove('active');
    showToast('Note deleted');
    await loadData();
  } catch (error) {
    console.error('Failed to delete note:', error);
    showToast('Failed to delete note', 'error');
  }
}

// Rich text editor commands
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const cmd = btn.dataset.cmd;
    if (!cmd) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      document.execCommand(cmd, false, btn.dataset.val || null);
    } catch (err) {
      console.error('Editor command failed:', err);
    }
    document.getElementById('note-content').focus();
  });
});

document.getElementById('text-color').addEventListener('input', (e) => {
  e.stopPropagation();
  try {
    document.execCommand('foreColor', false, e.target.value);
  } catch (err) { console.error(err); }
  document.getElementById('note-content').focus();
});

document.getElementById('hl-color').addEventListener('input', (e) => {
  e.stopPropagation();
  try {
    document.execCommand('hiliteColor', false, e.target.value);
  } catch (err) { console.error(err); }
  document.getElementById('note-content').focus();
});

// Category modal
function openCategoryModal() {
  document.getElementById('category-name').value = '';
  const colorOptions = document.getElementById('color-options');
  colorOptions.innerHTML = categoryColors.map((color, i) =>
    `<div class="color-option ${i === 0 ? 'selected' : ''}" data-color="${color}" style="background:${color}"></div>`
  ).join('');
  let selectedColor = categoryColors[0];
  colorOptions.querySelectorAll('.color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      colorOptions.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedColor = opt.dataset.color;
    });
  });
  categoryModal.classList.add('active');
  setTimeout(() => document.getElementById('category-name').focus(), 100);
}

async function saveCategory() {
  const name = document.getElementById('category-name').value.trim();
  if (!name) {
    showToast('Enter a category name', 'error');
    return;
  }
  const selected = document.querySelector('.color-option.selected');
  const color = selected ? selected.dataset.color : '#6366f1';

  try {
    await fetchWithTimeout(`${API}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    }, 10000);
    categoryModal.classList.remove('active');
    showToast('Category created!');
    await loadData();
  } catch (error) {
    showToast('Category already exists', 'error');
  }
}

// Event Listeners
document.getElementById('new-note-btn').addEventListener('click', openEditor);
document.getElementById('close-editor').addEventListener('click', () => editorModal.classList.remove('active'));
document.getElementById('save-note-btn').addEventListener('click', saveNote);
document.getElementById('delete-note-btn').addEventListener('click', deleteNote);
document.getElementById('add-category-btn').addEventListener('click', openCategoryModal);
document.getElementById('save-category').addEventListener('click', saveCategory);
document.getElementById('cancel-category').addEventListener('click', () => categoryModal.classList.remove('active'));

// Close modals on overlay click
[editorModal, categoryModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    editorModal.classList.remove('active');
    categoryModal.classList.remove('active');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && editorModal.classList.contains('active')) {
    e.preventDefault();
    saveNote();
  }
});

// Search
let searchTimeout;
searchInput.addEventListener('input', () => {
  if (searchInput.value.trim()) {
    clearSearch.classList.add('visible');
  } else {
    clearSearch.classList.remove('visible');
  }
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(renderNotes, 200);
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  clearSearch.classList.remove('visible');
  renderNotes();
});

// Nav items (all / pinned)
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    currentView = item.dataset.view;
    currentCategory = 'all';
    document.querySelectorAll('.category-item').forEach(b => b.classList.remove('active'));
    const allCat = document.querySelector('[data-category="all"]');
    if (allCat) allCat.classList.add('active');
    renderNotes();
  });
});

// Theme toggle
function toggleTheme() {
  const isDark = document.body.dataset.theme === 'dark';
  if (isDark) {
    delete document.body.dataset.theme;
    document.getElementById('theme-icon').className = 'fas fa-moon';
  } else {
    document.body.dataset.theme = 'dark';
    document.getElementById('theme-icon').className = 'fas fa-sun';
  }
  localStorage.setItem('notely-theme', document.body.dataset.theme || 'light');
}

document.getElementById('toggle-theme').addEventListener('click', toggleTheme);

// Init
(function init() {
  const savedTheme = localStorage.getItem('notely-theme');
  if (savedTheme === 'dark') {
    document.body.dataset.theme = 'dark';
    document.getElementById('theme-icon').className = 'fas fa-sun';
  }
  loadData();
})();