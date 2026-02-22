const DEFAULTS = Object.freeze({
  owner: 'eprisj',
  repo: 'eprisj.github.io',
  branch: 'main',
  path: 'src/content/site-content.json',
  message: 'chore(content): обновление контента через админку',
  rememberToken: false,
  token: '',
  autoLoadOnStart: false
});

const STORAGE_KEY = 'epris-admin-settings-v3';
const DRAFT_KEY = 'epris-admin-draft-v1';
const DEFAULT_LANGUAGE = 'EN';

const SECTION_CONFIG = {
  articles: { label: 'Статьи', titleField: 'title' },
  reviews: { label: 'Обзоры', titleField: 'title' },
  items: { label: 'Галерея', titleField: 'title' },
  libraryItems: { label: 'Библиотека', titleField: 'title' }
};

const ownerInput = byId('owner');
const repoInput = byId('repo');
const branchInput = byId('branch');
const pathInput = byId('path');
const tokenInput = byId('token');
const rememberTokenInput = byId('rememberToken');
const autoLoadOnStartInput = byId('autoLoadOnStart');
const messageInput = byId('message');
const editor = byId('editor');
const statusEl = byId('status');
const editorStateEl = byId('editorState');
const statsEl = byId('stats');
const repoSummaryEl = byId('repoSummary');

const loadBtn = byId('loadBtn');
const validateBtn = byId('validateBtn');
const formatBtn = byId('formatBtn');
const downloadBtn = byId('downloadBtn');
const saveBtn = byId('saveBtn');

const applyDefaultsBtn = byId('applyDefaultsBtn');
const resetSettingsBtn = byId('resetSettingsBtn');
const copySiteBtn = byId('copySiteBtn');

const visualSectionSelect = byId('visualSection');
const visualLangSelect = byId('visualLang');
const visualEntrySelect = byId('visualEntry');
const visualSearchInput = byId('visualSearch');
const addEntryBtn = byId('addEntryBtn');
const duplicateEntryBtn = byId('duplicateEntryBtn');
const deleteEntryBtn = byId('deleteEntryBtn');
const copyFromEnBtn = byId('copyFromEnBtn');
const applyEntryBtn = byId('applyEntryBtn');
const visualFormEl = byId('visualForm');
const visualNoticeEl = byId('visualNotice');

const interactiveButtons = [
  loadBtn,
  validateBtn,
  formatBtn,
  downloadBtn,
  saveBtn,
  applyDefaultsBtn,
  resetSettingsBtn,
  copySiteBtn,
  addEntryBtn,
  duplicateEntryBtn,
  deleteEntryBtn,
  copyFromEnBtn,
  applyEntryBtn
];

let currentSha = '';
let lastSyncedSnapshot = '';
let pendingVisualEntryId = null;
let visualRefreshTimer = null;
let draftSaveTimer = null;

init();

function byId(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Не найден элемент #${id}`);
  }
  return element;
}

function init() {
  hydrateSettings();
  bindEvents();
  syncRepoSummary();
  updateStatsFromEditor();
  refreshVisualEditor();
  updateEditorState();
  saveSettings();

  if (getConfig().autoLoadOnStart) {
    loadFromGitHub();
  } else {
    restoreDraftIfAny();
  }
}

function bindEvents() {
  loadBtn.addEventListener('click', loadFromGitHub);
  validateBtn.addEventListener('click', validateJson);
  formatBtn.addEventListener('click', formatJson);
  downloadBtn.addEventListener('click', downloadJson);
  saveBtn.addEventListener('click', saveToGitHub);

  applyDefaultsBtn.addEventListener('click', () => applyDefaults(true));
  resetSettingsBtn.addEventListener('click', resetSavedSettings);
  copySiteBtn.addEventListener('click', copyPagesUrl);

  visualSectionSelect.addEventListener('change', () => {
    pendingVisualEntryId = null;
    refreshVisualEditor();
  });

  visualLangSelect.addEventListener('change', () => {
    pendingVisualEntryId = null;
    refreshVisualEditor();
  });

  visualEntrySelect.addEventListener('change', () => {
    pendingVisualEntryId = null;
    renderVisualForm();
  });

  visualSearchInput.addEventListener('input', () => {
    pendingVisualEntryId = null;
    refreshVisualEditor();
  });

  addEntryBtn.addEventListener('click', addVisualEntry);
  duplicateEntryBtn.addEventListener('click', duplicateVisualEntry);
  deleteEntryBtn.addEventListener('click', deleteVisualEntry);
  copyFromEnBtn.addEventListener('click', copyFromEnglishEntry);
  applyEntryBtn.addEventListener('click', applyVisualChanges);

  const inputs = [
    ownerInput,
    repoInput,
    branchInput,
    pathInput,
    tokenInput,
    rememberTokenInput,
    autoLoadOnStartInput,
    messageInput
  ];

  for (const input of inputs) {
    input.addEventListener('change', () => {
      saveSettings();
      syncRepoSummary();
    });
    input.addEventListener('input', () => {
      saveSettings();
      syncRepoSummary();
    });
  }

  editor.addEventListener('input', () => {
    updateStatsFromEditor();
    updateEditorState();
    scheduleDraftSave();
    scheduleVisualRefresh();
  });

  document.addEventListener('keydown', (event) => {
    const isMeta = event.metaKey || event.ctrlKey;
    if (!isMeta) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 's' && !event.shiftKey) {
      event.preventDefault();
      saveToGitHub();
    }

    if (key === 'l' && event.shiftKey) {
      event.preventDefault();
      loadFromGitHub();
    }

    if (key === 'f' && event.shiftKey) {
      event.preventDefault();
      formatJson();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!isEditorDirty()) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  });
}

function scheduleVisualRefresh() {
  if (visualRefreshTimer) {
    clearTimeout(visualRefreshTimer);
  }

  visualRefreshTimer = setTimeout(() => {
    refreshVisualEditor();
  }, 180);
}

function normalizeJsonText(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(raw));
  } catch {
    return raw;
  }
}

function setLastSyncedSnapshotFromText(text) {
  lastSyncedSnapshot = normalizeJsonText(text);
  updateEditorState();
}

function isEditorDirty() {
  const current = normalizeJsonText(editor.value);
  return current !== lastSyncedSnapshot;
}

function updateEditorState() {
  editorStateEl.className = 'editor-state';
  if (isEditorDirty()) {
    editorStateEl.classList.add('dirty');
    editorStateEl.textContent = 'Есть локальные изменения, которые еще не сохранены в GitHub.';
  } else {
    editorStateEl.textContent = 'Нет локальных изменений.';
  }
}

function scheduleDraftSave() {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
  }

  draftSaveTimer = setTimeout(() => {
    saveDraft();
  }, 800);
}

function saveDraft() {
  if (!isEditorDirty() || !editor.value.trim()) {
    localStorage.removeItem(DRAFT_KEY);
    return;
  }

  localStorage.setItem(DRAFT_KEY, editor.value);
}

function restoreDraftIfAny() {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (!draft) {
    return;
  }

  const current = editor.value.trim();
  if (!current) {
    editor.value = draft;
    updateStatsFromEditor();
    refreshVisualEditor();
    updateEditorState();
    setStatus('info', 'Восстановлен локальный черновик JSON.');
    return;
  }

  if (normalizeJsonText(current) === normalizeJsonText(draft)) {
    return;
  }

  const shouldRestore = window.confirm('Найден локальный черновик JSON. Восстановить его?');
  if (!shouldRestore) {
    return;
  }

  editor.value = draft;
  updateStatsFromEditor();
  refreshVisualEditor();
  updateEditorState();
  setStatus('info', 'Черновик восстановлен.');
}

function applyConfig(config) {
  ownerInput.value = config.owner ?? DEFAULTS.owner;
  repoInput.value = config.repo ?? DEFAULTS.repo;
  branchInput.value = config.branch ?? DEFAULTS.branch;
  pathInput.value = config.path ?? DEFAULTS.path;
  messageInput.value = config.message ?? DEFAULTS.message;
  rememberTokenInput.checked = Boolean(config.rememberToken);
  autoLoadOnStartInput.checked = Boolean(config.autoLoadOnStart);
  tokenInput.value = config.token ?? '';
}

function hydrateSettings() {
  const inferred = inferDefaultsFromPage();
  const baseline = {
    ...DEFAULTS,
    ...inferred,
    token: '',
    rememberToken: false,
    autoLoadOnStart: false
  };

  applyConfig(baseline);

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    applyConfig({
      ...baseline,
      ...saved,
      token: saved.rememberToken ? saved.token || '' : ''
    });
  } catch (error) {
    setStatus('error', `Не удалось прочитать сохраненные настройки: ${getErrorMessage(error)}`);
  }
}

function applyDefaults(showStatus) {
  const inferred = inferDefaultsFromPage();
  const current = getConfig();

  applyConfig({
    ...DEFAULTS,
    ...inferred,
    rememberToken: current.rememberToken,
    token: current.token,
    autoLoadOnStart: current.autoLoadOnStart
  });

  currentSha = '';
  syncRepoSummary();
  saveSettings();

  if (showStatus) {
    setStatus('success', `Применены настройки по умолчанию: ${ownerInput.value}/${repoInput.value}`);
  }
}

function resetSavedSettings() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_KEY);
  currentSha = '';

  applyConfig({
    ...DEFAULTS,
    ...inferDefaultsFromPage()
  });

  editor.value = '';
  setLastSyncedSnapshotFromText('');
  updateStatsFromEditor();
  refreshVisualEditor();
  syncRepoSummary();
  saveSettings();
  setStatus('success', 'Сохраненные настройки сброшены к значениям по умолчанию.');
}

function inferDefaultsFromPage() {
  const host = window.location.hostname.toLowerCase();
  if (!host.endsWith('.github.io')) {
    return {};
  }

  const owner = host.replace(/\.github\.io$/, '');
  const repoFromPath = guessProjectRepoFromPath(window.location.pathname);

  return {
    owner,
    repo: repoFromPath || `${owner}.github.io`
  };
}

function guessProjectRepoFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) {
    return '';
  }

  if (segments[0] === 'admin') {
    return '';
  }

  if (segments.includes('admin')) {
    return segments[0];
  }

  return '';
}

function saveSettings() {
  const cfg = getConfig();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      path: cfg.path,
      message: cfg.message,
      autoLoadOnStart: cfg.autoLoadOnStart,
      rememberToken: cfg.rememberToken,
      token: cfg.rememberToken ? cfg.token : ''
    })
  );
}

function getConfig() {
  return {
    owner: ownerInput.value.trim(),
    repo: repoInput.value.trim(),
    branch: branchInput.value.trim() || 'main',
    path: pathInput.value.trim() || 'src/content/site-content.json',
    token: tokenInput.value.trim(),
    rememberToken: rememberTokenInput.checked,
    autoLoadOnStart: autoLoadOnStartInput.checked,
    message: messageInput.value.trim() || DEFAULTS.message
  };
}

function requireRepoFields() {
  const cfg = getConfig();

  if (!cfg.owner || !cfg.repo || !cfg.path) {
    throw new Error('Сначала заполните владельца, репозиторий и путь к файлу.');
  }

  return cfg;
}

function getPagesBaseUrl(owner, repo) {
  if (!owner || !repo) {
    return '';
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io`;
  }

  return `https://${owner}.github.io/${repo}`;
}

function syncRepoSummary() {
  const cfg = getConfig();
  const pagesUrl = getPagesBaseUrl(cfg.owner, cfg.repo);
  const adminUrl = pagesUrl ? `${pagesUrl}/admin/index.html` : '';

  repoSummaryEl.innerHTML = [
    `<strong>Репозиторий:</strong> ${escapeHtml(cfg.owner || '-')} / ${escapeHtml(cfg.repo || '-')}`,
    `<strong>Ветка:</strong> ${escapeHtml(cfg.branch || '-')}`,
    `<strong>Файл контента:</strong> ${escapeHtml(cfg.path || '-')}`,
    pagesUrl
      ? `<strong>Сайт:</strong> <a href="${escapeHtml(pagesUrl)}" target="_blank" rel="noreferrer">${escapeHtml(pagesUrl)}</a>`
      : '',
    adminUrl
      ? `<strong>URL админки:</strong> <a href="${escapeHtml(adminUrl)}" target="_blank" rel="noreferrer">${escapeHtml(adminUrl)}</a>`
      : ''
  ]
    .filter(Boolean)
    .join('<br />');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function copyPagesUrl() {
  try {
    const cfg = getConfig();
    const pagesUrl = getPagesBaseUrl(cfg.owner, cfg.repo);
    if (!pagesUrl) {
      throw new Error('Сначала заполните владельца и репозиторий.');
    }

    await copyToClipboard(`${pagesUrl}/admin/index.html`);
    setStatus('success', 'URL админки скопирован в буфер обмена.');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporary = document.createElement('textarea');
  temporary.value = text;
  temporary.style.position = 'fixed';
  temporary.style.opacity = '0';
  document.body.appendChild(temporary);
  temporary.select();
  document.execCommand('copy');
  temporary.remove();
}

function encodePath(path) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodeBase64Utf8(value) {
  const cleaned = value.replace(/\n/g, '');
  const bytes = Uint8Array.from(atob(cleaned), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function headers(token) {
  const base = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (!token) {
    return base;
  }

  return {
    ...base,
    Authorization: `Bearer ${token}`
  };
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, options);

  if (response.ok) {
    return response.json();
  }

  let message = `Ошибка GitHub API (${response.status})`;
  try {
    const body = await response.json();
    if (body.message) {
      message = body.message;
    }
  } catch {
    // ignore parse issue
  }

  throw new Error(message);
}

function setBusy(value) {
  for (const button of interactiveButtons) {
    button.disabled = value;
  }
}

async function loadFromGitHub() {
  try {
    setBusy(true);
    setStatus('info', 'Загружаю файл из GitHub...');

    const cfg = requireRepoFields();
    saveSettings();

    const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`;
    const payload = await githubRequest(url, {
      method: 'GET',
      headers: headers(cfg.token)
    });

    const contentText = decodeBase64Utf8(payload.content || '');
    const parsed = JSON.parse(contentText);
    validateShape(parsed);

    currentSha = payload.sha || '';
    setEditorData(parsed, { markSynced: true, clearDraft: true });
    setStatus('success', `Файл ${cfg.path} загружен из ${cfg.owner}/${cfg.repo}@${cfg.branch}`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

function parseEditorJson() {
  const raw = editor.value.trim();
  if (!raw) {
    throw new Error('Редактор пуст.');
  }

  try {
    const parsed = JSON.parse(raw);
    validateShape(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Некорректный JSON: ${error.message}`);
    }
    throw error;
  }
}

function parseEditorJsonSafe() {
  try {
    const parsed = JSON.parse(editor.value || '{}');
    return parsed;
  } catch {
    return null;
  }
}

function validateShape(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Корневой элемент JSON должен быть объектом.');
  }

  const required = ['translations', 'items', 'articles', 'reviews', 'libraryItems'];
  for (const key of required) {
    if (!(key in data)) {
      throw new Error(`Отсутствует обязательный ключ: ${key}`);
    }
  }

  if (typeof data.translations !== 'object' || Array.isArray(data.translations)) {
    throw new Error('translations должен быть объектом.');
  }

  for (const key of ['items', 'articles', 'reviews', 'libraryItems']) {
    if (!Array.isArray(data[key])) {
      throw new Error(`${key} должен быть массивом.`);
    }
  }

  if (
    'localizedCollections' in data &&
    (typeof data.localizedCollections !== 'object' || Array.isArray(data.localizedCollections))
  ) {
    throw new Error('localizedCollections должен быть объектом.');
  }
}

function validateJson() {
  try {
    const parsed = parseEditorJson();
    updateStats(parsed);
    setStatus('success', 'JSON корректный и имеет ожидаемую структуру.');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function formatJson() {
  try {
    const parsed = parseEditorJson();
    setEditorData(parsed);
    setStatus('success', 'JSON отформатирован.');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function updateStatsFromEditor() {
  const parsed = parseEditorJsonSafe();
  if (!parsed) {
    const bytes = new Blob([editor.value || '']).size;
    statsEl.innerHTML = [
      '<div class="stat-row"><span>JSON</span><strong>Ошибка</strong></div>',
      `<div class="stat-row"><span>Размер (байт)</span><strong>${bytes}</strong></div>`
    ].join('');
    return;
  }

  updateStats(parsed);
}

function updateStats(data) {
  const bytes = new Blob([editor.value || '']).size;
  const localized = data.localizedCollections && typeof data.localizedCollections === 'object'
    ? Object.keys(data.localizedCollections).length
    : 0;

  const rows = [
    ['Языки интерфейса', typeof data.translations === 'object' && data.translations ? Object.keys(data.translations).length : 0],
    ['Локализованные коллекции', localized],
    ['Элементы галереи', Array.isArray(data.items) ? data.items.length : 0],
    ['Статьи', Array.isArray(data.articles) ? data.articles.length : 0],
    ['Обзоры', Array.isArray(data.reviews) ? data.reviews.length : 0],
    ['Файлы библиотеки', Array.isArray(data.libraryItems) ? data.libraryItems.length : 0],
    ['Размер (байт)', bytes]
  ];

  statsEl.innerHTML = rows
    .map(([label, count]) => `<div class="stat-row"><span>${label}</span><strong>${count}</strong></div>`)
    .join('');
}

function downloadJson() {
  try {
    const parsed = parseEditorJson();
    const blob = new Blob([JSON.stringify(parsed, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'site-content.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('success', 'Снимок JSON скачан.');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

async function saveToGitHub() {
  try {
    setBusy(true);
    setStatus('info', 'Создаю коммит в GitHub...');

    const cfg = requireRepoFields();
    if (!cfg.token) {
      throw new Error('Для сохранения изменений нужен Token.');
    }

    const parsed = parseEditorJson();
    saveSettings();

    let sha = currentSha;
    if (!sha) {
      const lookupUrl = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}`;
      const existing = await githubRequest(lookupUrl, {
        method: 'GET',
        headers: headers(cfg.token)
      });
      sha = existing.sha || '';
    }

    const content = JSON.stringify(parsed, null, 2) + '\n';
    const payload = {
      message: cfg.message,
      content: encodeBase64Utf8(content),
      branch: cfg.branch,
      sha
    };

    const putUrl = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(cfg.path)}`;
    const result = await githubRequest(putUrl, {
      method: 'PUT',
      headers: {
        ...headers(cfg.token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    currentSha = result.content?.sha || sha;
    setLastSyncedSnapshotFromText(editor.value);
    localStorage.removeItem(DRAFT_KEY);
    setStatus('success', `Изменения сохранены в ${cfg.owner}/${cfg.repo}@${cfg.branch}`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

function setStatus(type, message) {
  statusEl.className = 'status';

  if (type === 'error') {
    statusEl.classList.add('error');
  }

  if (type === 'success') {
    statusEl.classList.add('success');
  }

  if (type === 'info') {
    statusEl.classList.add('info');
  }

  statusEl.textContent = message;
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function setEditorData(data, options = {}) {
  const { markSynced = false, clearDraft = false } = options;
  editor.value = JSON.stringify(data, null, 2);
  updateStats(data);
  refreshVisualEditor();
  updateEditorState();
  if (markSynced) {
    setLastSyncedSnapshotFromText(editor.value);
  }
  if (clearDraft) {
    localStorage.removeItem(DRAFT_KEY);
  } else {
    saveDraft();
  }
  saveSettings();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getVisualData() {
  const parsed = parseEditorJsonSafe();
  if (!parsed) {
    setVisualNotice('JSON сейчас некорректный. Исправьте его, чтобы открыть визуальный редактор.', 'error');
    visualFormEl.innerHTML = '';
    visualEntrySelect.innerHTML = '';
    return null;
  }

  return parsed;
}

function getLanguageOptions(data) {
  const set = new Set([DEFAULT_LANGUAGE]);

  if (data.translations && typeof data.translations === 'object') {
    for (const lang of Object.keys(data.translations)) {
      set.add(lang);
    }
  }

  if (data.localizedCollections && typeof data.localizedCollections === 'object') {
    for (const lang of Object.keys(data.localizedCollections)) {
      set.add(lang);
    }
  }

  return [DEFAULT_LANGUAGE, ...Array.from(set).filter((lang) => lang !== DEFAULT_LANGUAGE)];
}

function ensureArray(root, key) {
  if (!Array.isArray(root[key])) {
    root[key] = [];
  }
  return root[key];
}

function getSectionArray(data, section, lang, createLocalized) {
  if (lang === DEFAULT_LANGUAGE) {
    return ensureArray(data, section);
  }

  if (!data.localizedCollections || typeof data.localizedCollections !== 'object' || Array.isArray(data.localizedCollections)) {
    if (!createLocalized) {
      return Array.isArray(data[section]) ? data[section] : [];
    }
    data.localizedCollections = {};
  }

  if (!data.localizedCollections[lang]) {
    if (!createLocalized) {
      return Array.isArray(data[section]) ? data[section] : [];
    }
    data.localizedCollections[lang] = {};
  }

  const bucket = data.localizedCollections[lang];

  if (!Array.isArray(bucket[section])) {
    if (!createLocalized) {
      return Array.isArray(data[section]) ? data[section] : [];
    }
    bucket[section] = deepClone(Array.isArray(data[section]) ? data[section] : []);
  }

  return bucket[section];
}

function getSectionLabel(section) {
  return SECTION_CONFIG[section]?.label || section;
}

function getEntryTitle(section, entry) {
  if (!entry || typeof entry !== 'object') {
    return 'Без названия';
  }

  const titleField = SECTION_CONFIG[section]?.titleField;
  if (titleField && entry[titleField]) {
    return entry[titleField];
  }

  return `ID ${entry.id || '-'}`;
}

function renderVisualLanguageOptions(data) {
  const options = getLanguageOptions(data);
  const current = visualLangSelect.value || DEFAULT_LANGUAGE;

  visualLangSelect.innerHTML = options
    .map((lang) => `<option value="${escapeHtml(lang)}">${escapeHtml(lang)}</option>`)
    .join('');

  if (options.includes(current)) {
    visualLangSelect.value = current;
  } else {
    visualLangSelect.value = DEFAULT_LANGUAGE;
  }
}

function refreshVisualEditor() {
  const data = getVisualData();
  if (!data) {
    return;
  }

  renderVisualLanguageOptions(data);
  const section = visualSectionSelect.value;
  const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
  const entries = getSectionArray(data, section, lang, false);
  const search = visualSearchInput.value.trim().toLowerCase();

  const visibleEntries = !search
    ? entries
    : entries.filter((entry) => {
        const idText = String(entry.id || '').toLowerCase();
        const title = getEntryTitle(section, entry).toLowerCase();
        return idText.includes(search) || title.includes(search);
      });

  const optionsHtml = visibleEntries
    .map((entry) => {
      const id = Number(entry.id);
      const label = getEntryTitle(section, entry);
      return `<option value="${id}">#${id} - ${escapeHtml(label)}</option>`;
    })
    .join('');

  visualEntrySelect.innerHTML = optionsHtml;

  if (!entries.length) {
    setVisualNotice(`В разделе "${getSectionLabel(section)}" пока нет записей для языка ${lang}.`, 'info');
    visualFormEl.innerHTML = '';
    return;
  }

  if (!visibleEntries.length) {
    setVisualNotice(`По запросу "${search}" ничего не найдено.`, 'info');
    visualFormEl.innerHTML = '';
    return;
  }

  const desiredId = pendingVisualEntryId !== null ? String(pendingVisualEntryId) : visualEntrySelect.value;
  pendingVisualEntryId = null;

  if (desiredId && visibleEntries.some((entry) => String(entry.id) === desiredId)) {
    visualEntrySelect.value = desiredId;
  } else {
    visualEntrySelect.value = String(visibleEntries[0].id);
  }

  renderVisualForm();
}

function setVisualNotice(message, type) {
  visualNoticeEl.className = 'visual-notice';
  if (type === 'error') {
    visualNoticeEl.classList.add('error');
  }
  visualNoticeEl.textContent = message;
}

function renderVisualForm() {
  const data = getVisualData();
  if (!data) {
    return;
  }

  const section = visualSectionSelect.value;
  const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
  const entries = getSectionArray(data, section, lang, false);

  if (!entries.length) {
    visualFormEl.innerHTML = '';
    return;
  }

  const selectedId = Number(visualEntrySelect.value);
  const entry = entries.find((item) => Number(item.id) === selectedId) || entries[0];

  if (!entry) {
    visualFormEl.innerHTML = '';
    return;
  }

  setVisualNotice(`Редактируется: ${getSectionLabel(section)} / #${entry.id} / язык ${lang}`, 'info');

  if (section === 'items') {
    visualFormEl.innerHTML = `
      <label>ID<input id="vf-id" value="${escapeHtml(entry.id)}" disabled /></label>
      <label>FIG<input id="vf-fig" value="${escapeHtml(entry.fig || '')}" /></label>
      <label class="full">Заголовок<input id="vf-title" value="${escapeHtml(entry.title || '')}" /></label>
      <label class="full">Подзаголовок<input id="vf-subtitle" value="${escapeHtml(entry.subtitle || '')}" /></label>
      <label class="full">Описание<textarea id="vf-description">${escapeHtml(entry.description || '')}</textarea></label>
      <label class="full">imageSeed<input id="vf-imageSeed" value="${escapeHtml(entry.imageSeed || '')}" /></label>
    `;
    return;
  }

  if (section === 'reviews') {
    visualFormEl.innerHTML = `
      <label>ID<input id="vf-id" value="${escapeHtml(entry.id)}" disabled /></label>
      <label>Рейтинг (0-5)<input id="vf-rating" type="number" min="0" max="5" step="0.1" value="${escapeHtml(entry.rating || 0)}" /></label>
      <label class="full">Заголовок<input id="vf-title" value="${escapeHtml(entry.title || '')}" /></label>
      <label class="full">Тема<input id="vf-subject" value="${escapeHtml(entry.subject || '')}" /></label>
      <label class="full">Текст обзора<textarea id="vf-content">${escapeHtml(entry.content || '')}</textarea></label>
      <label class="full">Автор<input id="vf-author" value="${escapeHtml(entry.author || '')}" /></label>
    `;
    return;
  }

  if (section === 'libraryItems') {
    visualFormEl.innerHTML = `
      <label>ID<input id="vf-id" value="${escapeHtml(entry.id)}" disabled /></label>
      <label>Тип<input id="vf-type" value="${escapeHtml(entry.type || '')}" /></label>
      <label class="full">Название<input id="vf-title" value="${escapeHtml(entry.title || '')}" /></label>
      <label>Размер<input id="vf-size" value="${escapeHtml(entry.size || '')}" /></label>
      <label>Год<input id="vf-year" value="${escapeHtml(entry.year || '')}" /></label>
    `;
    return;
  }

  visualFormEl.innerHTML = `
    <label>ID<input id="vf-id" value="${escapeHtml(entry.id)}" disabled /></label>
    <label>Дата<input id="vf-date" value="${escapeHtml(entry.date || '')}" /></label>
    <label class="full">Заголовок<input id="vf-title" value="${escapeHtml(entry.title || '')}" /></label>
    <label>Автор<input id="vf-author" value="${escapeHtml(entry.author || '')}" /></label>
    <label>Роль<input id="vf-role" value="${escapeHtml(entry.role || '')}" /></label>
    <label>Категория<input id="vf-category" value="${escapeHtml(entry.category || '')}" /></label>
    <label>Подкатегория<input id="vf-subcategory" value="${escapeHtml(entry.subcategory || '')}" /></label>
    <label class="full">Краткое описание<textarea id="vf-excerpt">${escapeHtml(entry.excerpt || '')}</textarea></label>
    <label class="full">Теги (через запятую)<input id="vf-tags" value="${escapeHtml(Array.isArray(entry.tags) ? entry.tags.join(', ') : '')}" /></label>
    <label class="full">imageSeed<input id="vf-imageSeed" value="${escapeHtml(entry.imageSeed || '')}" /></label>
    <label class="full">Контент статьи (JSON блоков)<textarea id="vf-content-json">${escapeHtml(JSON.stringify(entry.content || [], null, 2))}</textarea></label>
  `;
}

function getFieldValue(id) {
  const element = document.getElementById(id);
  if (!element) {
    return '';
  }
  return element.value;
}

function applyVisualChanges() {
  try {
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const entries = getSectionArray(data, section, lang, lang !== DEFAULT_LANGUAGE);

    if (!entries.length) {
      throw new Error('Нет записей для редактирования.');
    }

    const selectedId = Number(visualEntrySelect.value);
    const entryIndex = entries.findIndex((item) => Number(item.id) === selectedId);
    if (entryIndex === -1) {
      throw new Error('Не найдена выбранная запись.');
    }

    const current = entries[entryIndex];
    let next = { ...current };

    if (section === 'items') {
      next = {
        ...next,
        fig: getFieldValue('vf-fig').trim(),
        title: getFieldValue('vf-title').trim(),
        subtitle: getFieldValue('vf-subtitle').trim(),
        description: getFieldValue('vf-description').trim(),
        imageSeed: getFieldValue('vf-imageSeed').trim()
      };
    } else if (section === 'reviews') {
      const rating = Number(getFieldValue('vf-rating'));
      if (Number.isNaN(rating)) {
        throw new Error('Рейтинг должен быть числом.');
      }
      next = {
        ...next,
        title: getFieldValue('vf-title').trim(),
        subject: getFieldValue('vf-subject').trim(),
        rating,
        content: getFieldValue('vf-content').trim(),
        author: getFieldValue('vf-author').trim()
      };
    } else if (section === 'libraryItems') {
      next = {
        ...next,
        title: getFieldValue('vf-title').trim(),
        type: getFieldValue('vf-type').trim(),
        size: getFieldValue('vf-size').trim(),
        year: getFieldValue('vf-year').trim()
      };
    } else {
      const rawContent = getFieldValue('vf-content-json').trim();
      let parsedContent = [];
      try {
        parsedContent = JSON.parse(rawContent || '[]');
      } catch (error) {
        throw new Error(`Блоки контента статьи содержат некорректный JSON: ${getErrorMessage(error)}`);
      }

      const tags = getFieldValue('vf-tags')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      next = {
        ...next,
        title: getFieldValue('vf-title').trim(),
        author: getFieldValue('vf-author').trim(),
        role: getFieldValue('vf-role').trim() || undefined,
        date: getFieldValue('vf-date').trim(),
        excerpt: getFieldValue('vf-excerpt').trim(),
        category: getFieldValue('vf-category').trim(),
        subcategory: getFieldValue('vf-subcategory').trim() || undefined,
        tags,
        imageSeed: getFieldValue('vf-imageSeed').trim(),
        content: parsedContent
      };
    }

    entries[entryIndex] = next;
    pendingVisualEntryId = selectedId;
    setEditorData(data);
    setStatus('success', `Запись #${selectedId} обновлена (${getSectionLabel(section)} / ${lang}).`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function createDefaultEntry(section, nextId) {
  if (section === 'items') {
    return {
      id: nextId,
      title: 'Новый элемент',
      subtitle: '',
      fig: `FIG. ${String(nextId).padStart(2, '0')}`,
      description: '',
      imageSeed: `new-item-${nextId}`
    };
  }

  if (section === 'reviews') {
    return {
      id: nextId,
      title: 'Новый обзор',
      subject: '',
      rating: 5,
      content: '',
      author: ''
    };
  }

  if (section === 'libraryItems') {
    return {
      id: nextId,
      title: 'Новый файл',
      type: 'PDF',
      size: '0 MB',
      year: String(new Date().getFullYear())
    };
  }

  return {
    id: nextId,
    title: 'Новая статья',
    author: '',
    role: '',
    date: '',
    excerpt: '',
    category: '',
    subcategory: '',
    tags: [],
    imageSeed: `new-article-${nextId}`,
    content: [
      {
        type: 'text',
        content: ''
      }
    ]
  };
}

function duplicateVisualEntry() {
  try {
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const entries = getSectionArray(data, section, lang, lang !== DEFAULT_LANGUAGE);

    if (!entries.length) {
      throw new Error('Нет записей для дублирования.');
    }

    const selectedId = Number(visualEntrySelect.value);
    const entryIndex = entries.findIndex((item) => Number(item.id) === selectedId);
    if (entryIndex === -1) {
      throw new Error('Не найдена выбранная запись.');
    }

    const maxId = entries.reduce((acc, item) => {
      const id = Number(item.id);
      return Number.isFinite(id) && id > acc ? id : acc;
    }, 0);

    const nextId = maxId + 1;
    const duplicate = deepClone(entries[entryIndex]);
    duplicate.id = nextId;
    if (typeof duplicate.title === 'string') {
      duplicate.title = `${duplicate.title} (копия)`;
    }

    entries.splice(entryIndex + 1, 0, duplicate);
    pendingVisualEntryId = nextId;
    setEditorData(data);
    setStatus('success', `Запись #${selectedId} дублирована в #${nextId}.`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function copyFromEnglishEntry() {
  try {
    const section = visualSectionSelect.value;
    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;

    if (lang === DEFAULT_LANGUAGE) {
      throw new Error('Для EN это действие не нужно. Выберите другой язык.');
    }

    const data = parseEditorJson();
    const sourceEntries = getSectionArray(data, section, DEFAULT_LANGUAGE, false);
    if (!sourceEntries.length) {
      throw new Error('В EN нет записей для копирования.');
    }

    const targetEntries = getSectionArray(data, section, lang, true);
    const selectedId = Number(visualEntrySelect.value) || Number(sourceEntries[0].id);
    const sourceEntry = sourceEntries.find((item) => Number(item.id) === selectedId);

    if (!sourceEntry) {
      throw new Error('Не найдена запись EN для копирования.');
    }

    const clone = deepClone(sourceEntry);
    const targetIndex = targetEntries.findIndex((item) => Number(item.id) === Number(clone.id));
    if (targetIndex >= 0) {
      targetEntries[targetIndex] = clone;
    } else {
      targetEntries.push(clone);
    }

    pendingVisualEntryId = Number(clone.id);
    setEditorData(data);
    setStatus('success', `EN запись #${clone.id} скопирована в язык ${lang}.`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function addVisualEntry() {
  try {
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const entries = getSectionArray(data, section, lang, lang !== DEFAULT_LANGUAGE);

    const maxId = entries.reduce((acc, item) => {
      const id = Number(item.id);
      return Number.isFinite(id) && id > acc ? id : acc;
    }, 0);

    const nextId = maxId + 1;
    entries.push(createDefaultEntry(section, nextId));

    pendingVisualEntryId = nextId;
    setEditorData(data);
    setStatus('success', `Добавлена новая запись #${nextId} (${getSectionLabel(section)} / ${lang}).`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function deleteVisualEntry() {
  try {
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const entries = getSectionArray(data, section, lang, lang !== DEFAULT_LANGUAGE);

    if (!entries.length) {
      throw new Error('Нет записей для удаления.');
    }

    const selectedId = Number(visualEntrySelect.value);
    const entryIndex = entries.findIndex((item) => Number(item.id) === selectedId);

    if (entryIndex === -1) {
      throw new Error('Не найдена выбранная запись.');
    }

    const entryTitle = getEntryTitle(section, entries[entryIndex]);
    const shouldDelete = window.confirm(`Удалить запись #${selectedId} (${entryTitle})?`);
    if (!shouldDelete) {
      return;
    }

    entries.splice(entryIndex, 1);

    if (entries.length) {
      pendingVisualEntryId = Number(entries[Math.max(0, entryIndex - 1)].id);
    } else {
      pendingVisualEntryId = null;
    }

    setEditorData(data);
    setStatus('success', `Запись #${selectedId} удалена (${getSectionLabel(section)} / ${lang}).`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}
