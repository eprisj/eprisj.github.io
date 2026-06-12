const DEFAULTS = Object.freeze({
  owner: 'eprisj',
  repo: 'eprisj.github.io',
  branch: 'main',
  path: 'src/content/site-content.json',
  uploadDir: 'public/uploads',
  message: 'chore(content): обновление контента через админку',
  rememberToken: false,
  token: '',
  autoLoadOnStart: true
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
const uploadDirInput = byId('uploadDir');
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
const translateEntryBtn = byId('translateEntryBtn');
const translateAllArticlesBtn = byId('translateAllArticlesBtn');
const applyEntryBtn = byId('applyEntryBtn');
const creatorQualityEl = byId('creatorQuality');
const creatorTitleInput = byId('creatorTitle');
const creatorCategoryInput = byId('creatorCategory');
const creatorSeedInput = byId('creatorSeed');
const creatorImageUrlInput = byId('creatorImageUrl');
const storyBlueprintBtn = byId('storyBlueprintBtn');
const guideBlueprintBtn = byId('guideBlueprintBtn');
const photoEssayBlueprintBtn = byId('photoEssayBlueprintBtn');
const reviewBlueprintBtn = byId('reviewBlueprintBtn');
const insertStructureBtn = byId('insertStructureBtn');
const insertChecklistTemplateBtn = byId('insertChecklistTemplateBtn');
const insertPollTemplateBtn = byId('insertPollTemplateBtn');
const contentAuditMetricsEl = byId('contentAuditMetrics');
const entryPreviewEl = byId('entryPreview');
const findMissingLangBtn = byId('findMissingLangBtn');
const findNoPhotoBtn = byId('findNoPhotoBtn');
const findNoPollBtn = byId('findNoPollBtn');
const findThinTextBtn = byId('findThinTextBtn');
const visualFormEl = byId('visualForm');
const visualNoticeEl = byId('visualNotice');
const uploadDropZone = byId('uploadDropZone');
const imageFileInput = byId('imageFileInput');
const pickImageBtn = byId('pickImageBtn');
const uploadedImageUrlInput = byId('uploadedImageUrl');
const uploadedImagePagesUrlInput = byId('uploadedImagePagesUrl');
const useUploadedUrlBtn = byId('useUploadedUrlBtn');
const useUploadedPagesUrlBtn = byId('useUploadedPagesUrlBtn');
const copyUploadedUrlBtn = byId('copyUploadedUrlBtn');
const uploadHintEl = byId('uploadHint');
const monitorRunBtn = byId('monitorRunBtn');
const monitorSummaryEl = byId('monitorSummary');
const monitorGridEl = byId('monitorGrid');
const monitorTimestampEl = byId('monitorTimestamp');
const openRepoLink = byId('openRepoLink');
const openActionsLink = byId('openActionsLink');
const openPagesLink = byId('openPagesLink');

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
  translateEntryBtn,
  translateAllArticlesBtn,
  applyEntryBtn,
  storyBlueprintBtn,
  guideBlueprintBtn,
  photoEssayBlueprintBtn,
  reviewBlueprintBtn,
  insertStructureBtn,
  insertChecklistTemplateBtn,
  insertPollTemplateBtn,
  findMissingLangBtn,
  findNoPhotoBtn,
  findNoPollBtn,
  findThinTextBtn,
  pickImageBtn,
  useUploadedUrlBtn,
  useUploadedPagesUrlBtn,
  copyUploadedUrlBtn,
  monitorRunBtn
];

let currentSha = '';
let lastSyncedSnapshot = '';
let pendingVisualEntryId = null;
let visualRefreshTimer = null;
let draftSaveTimer = null;
let monitorTimer = null;
let lastSyncedTime = null;

const toastContainerEl = byId('toastContainer');
const loadingBarEl = byId('loadingBar');
const lastSyncedEl = byId('lastSynced');
const helpBtn = byId('helpBtn');

function byId(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Не найден элемент #${id}`);
  }
  return element;
}


// ===== AUTH GATE =====
const AUTH_STORAGE_KEY = 'epris_admin_token';
const authOverlay = byId('authOverlay');
const authTokenInput = byId('authTokenInput');
const authRememberCheck = byId('authRememberCheck');
const authLoginBtn = byId('authLoginBtn');
const authError = byId('authError');
const authLoading = byId('authLoading');

async function verifyToken(token) {
  const resp = await fetch('https://api.github.com/user', {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!resp.ok) throw new Error('Недействительный токен');
  return await resp.json();
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.hidden = false;
  authLoading.hidden = true;
  authLoginBtn.disabled = false;
}

function hideAuthOverlay() {
  authOverlay.classList.add('hidden');
  setTimeout(() => { authOverlay.style.display = 'none'; }, 350);
}

async function handleLogin() {
  const token = authTokenInput.value.trim();
  if (!token) { showAuthError('Введите токен'); return; }
  authError.hidden = true;
  authLoading.hidden = false;
  authLoginBtn.disabled = true;
  try {
    await verifyToken(token);
    tokenInput.value = token;
    if (authRememberCheck.checked) {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      rememberTokenInput.checked = true;
    }
    hideAuthOverlay();
    await init({ fromLogin: true });
  } catch (e) {
    showAuthError('Токен не прошёл проверку. Убедитесь что PAT действителен.');
  }
}

async function tryAutoLogin() {
  const saved = localStorage.getItem(AUTH_STORAGE_KEY);
  const autoToken = saved;
  if (!autoToken) {
    authLoading.hidden = true;
    authLoginBtn.disabled = false;
    return;
  }
  authTokenInput.value = autoToken;
  authLoading.hidden = false;
  authLoginBtn.disabled = true;
  try {
    await verifyToken(autoToken);
    tokenInput.value = autoToken;
    rememberTokenInput.checked = true;
    hideAuthOverlay();
    await init({ fromLogin: true });
  } catch (e) {
    if (saved) localStorage.removeItem(AUTH_STORAGE_KEY);
    authLoading.hidden = true;
    authLoginBtn.disabled = false;
  }
}

// Bootstrap: auth gate first, then init
authLoginBtn.addEventListener('click', handleLogin);
authTokenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
tryAutoLogin();

async function init(options = {}) {
  const { fromLogin = false } = options;
  hydrateSettings();
  bindEvents();
  syncRepoSummary();
  syncUploadHint();
  syncExternalLinks();
  updateStatsFromEditor();
  refreshVisualEditor();
  updateEditorState();
  saveSettings();

  if (fromLogin || getConfig().autoLoadOnStart) {
    await loadFromGitHub();
  } else {
    restoreDraftIfAny();
  }
  queueMonitoringChecks(320, 'full');
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
  translateEntryBtn.addEventListener('click', translateSelectedEntryToAvailableLanguages);
  translateAllArticlesBtn.addEventListener('click', translateCurrentSectionToAvailableLanguages);
  applyEntryBtn.addEventListener('click', applyVisualChanges);
  storyBlueprintBtn.addEventListener('click', () => createArticleFromBlueprint('story'));
  guideBlueprintBtn.addEventListener('click', () => createArticleFromBlueprint('guide'));
  photoEssayBlueprintBtn.addEventListener('click', () => createArticleFromBlueprint('photoEssay'));
  reviewBlueprintBtn.addEventListener('click', () => createArticleFromBlueprint('review'));
  insertStructureBtn.addEventListener('click', () => appendArticlePreset('structure'));
  insertChecklistTemplateBtn.addEventListener('click', () => appendArticlePreset('checklist'));
  insertPollTemplateBtn.addEventListener('click', () => appendArticlePreset('poll'));
  findMissingLangBtn.addEventListener('click', () => selectFirstIssueEntry('missingLang'));
  findNoPhotoBtn.addEventListener('click', () => selectFirstIssueEntry('noPhoto'));
  findNoPollBtn.addEventListener('click', () => selectFirstIssueEntry('noPoll'));
  findThinTextBtn.addEventListener('click', () => selectFirstIssueEntry('thinText'));
  pickImageBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    pickImageFile();
  });
  useUploadedUrlBtn.addEventListener('click', useUploadedUrlInCurrentEntry);
  useUploadedPagesUrlBtn.addEventListener('click', useUploadedPagesUrlInCurrentEntry);
  copyUploadedUrlBtn.addEventListener('click', copyUploadedUrl);
  imageFileInput.addEventListener('change', onImageFileChange);
  monitorRunBtn.addEventListener('click', () => runMonitoringChecks({ mode: 'full' }));

  uploadDropZone.addEventListener('click', pickImageFile);
  uploadDropZone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    pickImageFile();
  });
  uploadDropZone.addEventListener('dragenter', onUploadDragEnter);
  uploadDropZone.addEventListener('dragover', onUploadDragEnter);
  uploadDropZone.addEventListener('dragleave', onUploadDragLeave);
  uploadDropZone.addEventListener('drop', onUploadDrop);

  const inputs = [
    ownerInput,
    repoInput,
    branchInput,
    pathInput,
    uploadDirInput,
    tokenInput,
    rememberTokenInput,
    autoLoadOnStartInput,
    messageInput
  ];

  for (const input of inputs) {
    input.addEventListener('change', () => {
      saveSettings();
      syncRepoSummary();
      syncUploadHint();
      syncExternalLinks();
      queueMonitoringChecks(550, 'local');
    });
    input.addEventListener('input', () => {
      saveSettings();
      syncRepoSummary();
      syncUploadHint();
      syncExternalLinks();
      queueMonitoringChecks(550, 'local');
    });
  }

  editor.addEventListener('input', () => {
    updateStatsFromEditor();
    updateEditorState();
    scheduleDraftSave();
    scheduleVisualRefresh();
    queueMonitoringChecks(350, 'local');
  });

  helpBtn.addEventListener('click', showShortcutsPanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
      event.preventDefault();
      showShortcutsPanel();
      return;
    }

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

function queueMonitoringChecks(delay = 450, mode = 'local') {
  if (monitorTimer) {
    clearTimeout(monitorTimer);
  }

  monitorTimer = setTimeout(() => {
    runMonitoringChecks({ mode });
  }, delay);
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
  updateLastSyncedBadge();
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
  uploadDirInput.value = normalizeUploadDir(config.uploadDir ?? DEFAULTS.uploadDir);
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
    autoLoadOnStart: true
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
  syncUploadHint();
  syncExternalLinks();
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
  uploadedImageUrlInput.value = '';
  uploadedImagePagesUrlInput.value = '';
  setLastSyncedSnapshotFromText('');
  updateStatsFromEditor();
  refreshVisualEditor();
  syncRepoSummary();
  syncUploadHint();
  syncExternalLinks();
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
      uploadDir: cfg.uploadDir,
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
    uploadDir: normalizeUploadDir(uploadDirInput.value || DEFAULTS.uploadDir),
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
  if (!owner || !repo) return '';
  // eprisj repo → custom domain
  if (owner === 'eprisj' && repo === 'eprisj.github.io') return 'https://eprisjournal.com';
  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) return `https://${owner}.github.io`;
  return `https://${owner}.github.io/${repo}`;
}

function getRepoWebUrl(owner, repo) {
  if (!owner || !repo) {
    return '';
  }
  return `https://github.com/${owner}/${repo}`;
}

function syncRepoSummary() {
  const cfg = getConfig();
  const pagesUrl = getPagesBaseUrl(cfg.owner, cfg.repo);
  const adminUrl = pagesUrl ? `${pagesUrl}/admin/index.html` : '';

  repoSummaryEl.innerHTML = [
    `<strong>Репозиторий:</strong> ${escapeHtml(cfg.owner || '-')} / ${escapeHtml(cfg.repo || '-')}`,
    `<strong>Ветка:</strong> ${escapeHtml(cfg.branch || '-')}`,
    `<strong>Файл контента:</strong> ${escapeHtml(cfg.path || '-')}`,
    `<strong>Папка для фото:</strong> ${escapeHtml(cfg.uploadDir || '-')}`,
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

function syncUploadHint() {
  const cfg = getConfig();
  uploadHintEl.textContent = `Файл загрузится в "${cfg.uploadDir}". Быстрый URL работает сразу, URL сайта начнет работать после деплоя.`;
}

function syncExternalLinks() {
  const cfg = getConfig();
  const repoUrl = getRepoWebUrl(cfg.owner, cfg.repo);
  const actionsUrl = repoUrl ? `${repoUrl}/actions` : '#';
  const pagesUrl = getPagesBaseUrl(cfg.owner, cfg.repo) || '#';

  openRepoLink.href = repoUrl || '#';
  openActionsLink.href = actionsUrl;
  openPagesLink.href = pagesUrl;

  openRepoLink.setAttribute('aria-disabled', repoUrl ? 'false' : 'true');
  openActionsLink.setAttribute('aria-disabled', repoUrl ? 'false' : 'true');
  openPagesLink.setAttribute('aria-disabled', pagesUrl !== '#' ? 'false' : 'true');
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

function normalizeUploadDir(value) {
  const raw = String(value || '')
    .trim()
    .replaceAll('\\', '/');

  if (!raw) {
    return DEFAULTS.uploadDir;
  }

  return raw.replace(/^\/+/, '').replace(/\/+$/, '');
}

function requireImageUploadConfig() {
  const cfg = getConfig();
  if (!cfg.owner || !cfg.repo) {
    throw new Error('Сначала заполните владельца и репозиторий.');
  }

  if (!cfg.token) {
    throw new Error('Для загрузки фото нужен GitHub Token.');
  }

  if (!cfg.uploadDir.startsWith('public/')) {
    throw new Error('Для GitHub Pages укажите папку внутри public/, например public/uploads.');
  }

  return cfg;
}

function joinUrl(base, path) {
  return `${String(base || '').replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

function toPublicAssetPath(repoPath) {
  const normalized = String(repoPath || '').replace(/^\/+/, '');
  if (normalized.startsWith('public/')) {
    return normalized.slice('public/'.length);
  }
  return normalized;
}

function buildPagesAssetUrl(cfg, repoPath) {
  const pagesBase = getPagesBaseUrl(cfg.owner, cfg.repo);
  if (!pagesBase) {
    return '';
  }
  const publicPath = toPublicAssetPath(repoPath);
  return joinUrl(pagesBase, publicPath);
}

function inferExtensionFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif'
  };
  return map[String(mimeType || '').toLowerCase()] || '';
}

function buildUploadFileName(originalName, mimeType) {
  const fromName = String(originalName || '').toLowerCase().match(/\.([a-z0-9]{2,10})$/)?.[1] || '';
  const extension = fromName || inferExtensionFromMime(mimeType) || 'jpg';

  let base = String(originalName || '')
    .replace(/\.[^/.]+$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  if (!base) {
    base = 'image';
  }

  return `${base}-${Date.now()}.${extension}`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать выбранный файл.'));
    reader.onload = () => {
      const value = String(reader.result || '');
      const commaIndex = value.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Не удалось преобразовать файл в base64.'));
        return;
      }
      resolve(value.slice(commaIndex + 1));
    };
    reader.readAsDataURL(file);
  });
}

function pickImageFile() {
  if (pickImageBtn.disabled) {
    return;
  }
  imageFileInput.click();
}

function onImageFileChange(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  uploadImageToGitHub(file);
  input.value = '';
}

function onUploadDragEnter(event) {
  event.preventDefault();
  event.stopPropagation();
  uploadDropZone.classList.add('dragover');
}

function onUploadDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  const related = event.relatedTarget;
  if (related instanceof Node && uploadDropZone.contains(related)) {
    return;
  }
  uploadDropZone.classList.remove('dragover');
}

function onUploadDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  uploadDropZone.classList.remove('dragover');

  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    return;
  }
  uploadImageToGitHub(file);
}

function injectUploadedUrlIntoCurrentEntry(url) {
  const target = document.getElementById('vf-imageUrl');
  if (!target) {
    return false;
  }

  target.value = url;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  refreshPhotoPreviewFromInputs();
  return true;
}

function applyUrlToCurrentEntry(url, label) {
  const normalized = String(url || '').trim();
  if (!normalized) {
    throw new Error(`Сначала загрузите фото, чтобы появился ${label}.`);
  }

  const updated = injectUploadedUrlIntoCurrentEntry(normalized);
  if (!updated) {
    throw new Error('Сейчас нет поля URL изображения. Откройте запись в разделах "Статьи" или "Галерея".');
  }

  applyVisualChanges();
  setStatus('success', `${label} подставлен и применен в текущей записи. Теперь нажмите "Сохранить в GitHub".`);
}

async function copyUploadedUrl() {
  try {
    const url = uploadedImageUrlInput.value.trim();
    if (!url) {
      throw new Error('Сначала загрузите фото, чтобы появился быстрый URL.');
    }
    await copyToClipboard(url);
    setStatus('success', 'Быстрый URL загруженного фото скопирован.');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function useUploadedUrlInCurrentEntry() {
  try {
    applyUrlToCurrentEntry(uploadedImageUrlInput.value, 'Быстрый URL');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function useUploadedPagesUrlInCurrentEntry() {
  try {
    applyUrlToCurrentEntry(uploadedImagePagesUrlInput.value, 'URL сайта');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

async function uploadImageToGitHub(file) {
  try {
    const cfg = requireImageUploadConfig();
    if (!String(file.type || '').startsWith('image/')) {
      throw new Error('Можно загрузить только файл изображения (JPG, PNG, WebP и т.д.).');
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Файл слишком большой. Максимум: 15 MB.');
    }

    saveSettings();
    setBusy(true);
    uploadDropZone.classList.add('is-uploading');
    setStatus('info', `Загружаю "${file.name}" в GitHub...`);

    const fileName = buildUploadFileName(file.name, file.type);
    const repoPath = `${cfg.uploadDir}/${fileName}`;
    const base64Content = await readFileAsBase64(file);

    const putUrl = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(repoPath)}`;
    const uploadResult = await githubRequest(putUrl, {
      method: 'PUT',
      headers: {
        ...headers(cfg.token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `chore(media): upload ${fileName} via admin`,
        content: base64Content,
        branch: cfg.branch
      })
    });

    const immediateUrl = String(uploadResult?.content?.download_url || '').trim();
    const websiteUrl = buildPagesAssetUrl(cfg, repoPath);
    const websiteUrlWithCache = websiteUrl ? `${websiteUrl}?v=${Date.now()}` : '';

    uploadedImageUrlInput.value = immediateUrl || websiteUrlWithCache;
    uploadedImagePagesUrlInput.value = websiteUrlWithCache;

    const inserted = immediateUrl || websiteUrlWithCache;
    const hasApplied = inserted ? injectUploadedUrlIntoCurrentEntry(inserted) : false;
    if (hasApplied) {
      applyVisualChanges();
      setStatus('success', 'Фото загружено. Быстрый URL подставлен и применен в текущей записи.');
    } else {
      setStatus('success', 'Фото загружено. Выберите, какой URL подставить в запись.');
    }
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
    uploadDropZone.classList.remove('is-uploading', 'dragover');
    syncUploadHint();
  }
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
  const response = await fetch(url, {
    cache: 'no-store',
    ...options
  });

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
  loadingBarEl.classList.toggle('active', value);
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
    lastSyncedTime = new Date();
    updateLastSyncedBadge();
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

  // Overview strip — quick stats bar at top of content tab
  const strip = document.getElementById('overviewStrip');
  if (strip) {
    const articlesCount = Array.isArray(data.articles) ? data.articles.length : 0;
    const reviewsCount = Array.isArray(data.reviews) ? data.reviews.length : 0;
    const itemsCount = Array.isArray(data.items) ? data.items.length : 0;
    const libCount = Array.isArray(data.libraryItems) ? data.libraryItems.length : 0;
    const langCount = typeof data.translations === 'object' && data.translations ? Object.keys(data.translations).length : 0;
    const kbSize = Math.round(bytes / 1024);

    const articlesWithContent = Array.isArray(data.articles)
      ? data.articles.filter(a => Array.isArray(a.content) && a.content.length > 0).length
      : 0;
    const articlesWithPhoto = Array.isArray(data.articles)
      ? data.articles.filter(a => a.imageUrl || a.imageSeed).length
      : 0;

    strip.style.display = 'grid';
    strip.innerHTML = [
      { label: 'Статьи', value: articlesCount, sub: `${articlesWithContent} с контентом` },
      { label: 'С фото', value: articlesWithPhoto, sub: `из ${articlesCount} статей` },
      { label: 'Обзоры', value: reviewsCount, sub: 'записей' },
      { label: 'Галерея', value: itemsCount, sub: 'элементов' },
      { label: 'Библиотека', value: libCount, sub: 'файлов' },
      { label: 'Языки UI', value: langCount, sub: `+ EN базовый` },
      { label: 'Размер', value: `${kbSize}`, sub: 'КБ' },
    ].map(({ label, value, sub }) =>
      `<div class="overview-cell">
        <div class="overview-cell-label">${label}</div>
        <div class="overview-cell-value">${value}</div>
        <div class="overview-cell-sub">${sub}</div>
      </div>`
    ).join('');
  }
}

const MONITOR_LEVEL_ORDER = {
  info: 0,
  ok: 1,
  warn: 2,
  error: 3
};

function getHigherMonitorLevel(left, right) {
  const leftScore = MONITOR_LEVEL_ORDER[left] ?? 0;
  const rightScore = MONITOR_LEVEL_ORDER[right] ?? 0;
  return leftScore >= rightScore ? left : right;
}

function createMonitorResult(level, title, detail, items = [], linkUrl = '', linkLabel = '') {
  return {
    level,
    title,
    detail,
    items,
    linkUrl,
    linkLabel
  };
}

function monitorLabel(level) {
  if (level === 'ok') return 'OK';
  if (level === 'warn') return 'Внимание';
  if (level === 'error') return 'Ошибка';
  return 'Инфо';
}

function renderMonitoringResults(results) {
  const counts = {
    ok: 0,
    warn: 0,
    error: 0,
    info: 0
  };

  for (const result of results) {
    counts[result.level] = (counts[result.level] || 0) + 1;
  }

  monitorGridEl.innerHTML = results
    .map((result) => {
      const list = Array.isArray(result.items) && result.items.length
        ? `<ul class="monitor-card-list">${result.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '';

      const link = result.linkUrl
        ? `<a class="monitor-card-link" target="_blank" rel="noreferrer" href="${escapeHtml(result.linkUrl)}">${escapeHtml(result.linkLabel || 'Открыть')}</a>`
        : '';

      return `
        <article class="monitor-card ${escapeHtml(result.level)}">
          <div class="monitor-card-head">
            <h3 class="monitor-card-title">${escapeHtml(result.title)}</h3>
            <span class="monitor-pill ${escapeHtml(result.level)}">${monitorLabel(result.level)}</span>
          </div>
          <p class="monitor-card-detail">${escapeHtml(result.detail)}</p>
          ${list}
          ${link}
        </article>
      `;
    })
    .join('');

  const summaryLevel = counts.error > 0 ? 'error' : counts.warn > 0 ? 'warn' : 'ok';
  monitorSummaryEl.className = `monitor-summary is-${summaryLevel}`;
  monitorSummaryEl.textContent = `OK: ${counts.ok} · Внимание: ${counts.warn} · Ошибки: ${counts.error} · Инфо: ${counts.info}`;
  monitorTimestampEl.textContent = `Последняя проверка: ${new Date().toLocaleString('ru-RU')}`;
}

function collectDuplicateIdIssues(entries, sectionLabel) {
  const seen = new Set();
  const duplicates = new Set();

  for (const entry of entries || []) {
    const id = Number(entry?.id);
    if (!Number.isFinite(id)) {
      continue;
    }
    if (seen.has(id)) {
      duplicates.add(id);
    } else {
      seen.add(id);
    }
  }

  if (!duplicates.size) {
    return [];
  }

  return [`${sectionLabel}: дубли ID (${Array.from(duplicates).join(', ')})`];
}

function runContentQualityChecks(data) {
  if (!data) {
    return createMonitorResult('error', 'Качество контента', 'JSON некорректный. Сначала исправьте структуру.', []);
  }

  const issues = [];
  const warnings = [];

  const sections = [
    ['items', 'Галерея'],
    ['articles', 'Статьи'],
    ['reviews', 'Обзоры'],
    ['libraryItems', 'Библиотека']
  ];

  for (const [sectionKey, sectionLabel] of sections) {
    if (!Array.isArray(data[sectionKey])) {
      issues.push(`${sectionLabel}: отсутствует массив ${sectionKey}`);
      continue;
    }
    warnings.push(...collectDuplicateIdIssues(data[sectionKey], sectionLabel));
  }

  const translations = data.translations && typeof data.translations === 'object' ? data.translations : {};
  const baseTranslation = translations[DEFAULT_LANGUAGE] && typeof translations[DEFAULT_LANGUAGE] === 'object'
    ? translations[DEFAULT_LANGUAGE]
    : {};
  const baseKeys = Object.keys(baseTranslation);

  for (const [lang, bucket] of Object.entries(translations)) {
    if (lang === DEFAULT_LANGUAGE || !bucket || typeof bucket !== 'object') {
      continue;
    }
    const missing = baseKeys.filter((key) => !String(bucket[key] ?? '').trim());
    if (missing.length) {
      warnings.push(`${lang}: не заполнено ключей интерфейса — ${missing.length}`);
    }
  }

  const localized = data.localizedCollections && typeof data.localizedCollections === 'object'
    ? data.localizedCollections
    : {};

  for (const [lang, bucket] of Object.entries(localized)) {
    if (!bucket || typeof bucket !== 'object') {
      issues.push(`${lang}: локализованная коллекция повреждена.`);
      continue;
    }

    for (const [sectionKey, sectionLabel] of sections) {
      if (!Array.isArray(bucket[sectionKey])) {
        warnings.push(`${lang}: нет массива ${sectionKey}, используется EN fallback.`);
        continue;
      }

      if (Array.isArray(data[sectionKey]) && bucket[sectionKey].length !== data[sectionKey].length) {
        warnings.push(`${lang}/${sectionLabel}: ${bucket[sectionKey].length} записей вместо ${data[sectionKey].length}`);
      }

      warnings.push(...collectDuplicateIdIssues(bucket[sectionKey], `${lang}/${sectionLabel}`));
    }
  }

  const level = issues.length > 0 ? 'error' : warnings.length > 0 ? 'warn' : 'ok';
  const detail = level === 'ok'
    ? 'Ключевые проверки структуры, ID и переводов пройдены.'
    : issues.length > 0
      ? 'Найдены критичные проблемы в структуре контента.'
      : 'Есть предупреждения по переводам или локализованным коллекциям.';

  return createMonitorResult(level, 'Качество контента', detail, [...issues, ...warnings].slice(0, 8));
}

function runMediaQualityChecks(data) {
  if (!data) {
    return createMonitorResult('warn', 'Медиа и изображения', 'Проверка медиа ограничена, пока JSON невалиден.', []);
  }

  const warnings = [];
  const errors = [];

  const checkRecords = (entries, sectionLabel) => {
    for (const entry of entries || []) {
      const imageUrl = String(entry?.imageUrl || '').trim();
      const imageSeed = String(entry?.imageSeed || '').trim();
      if (!imageUrl && !imageSeed) {
        warnings.push(`${sectionLabel} #${entry?.id ?? '?'}: нет imageUrl и imageSeed`);
      }

      if (imageUrl && !/^(https?:)?\/\//i.test(imageUrl) && !imageUrl.startsWith('/') && !imageUrl.startsWith('./') && !imageUrl.startsWith('../')) {
        errors.push(`${sectionLabel} #${entry?.id ?? '?'}: imageUrl имеет неподдерживаемый формат`);
      }
    }
  };

  checkRecords(data.items, 'Галерея');
  checkRecords(data.articles, 'Статьи');

  const level = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warn' : 'ok';
  const detail = level === 'ok'
    ? 'Медиа-поля заполнены корректно.'
    : errors.length > 0
      ? 'Обнаружены ошибки формата URL изображений.'
      : 'Есть записи без imageUrl/imageSeed.';

  return createMonitorResult(level, 'Медиа и изображения', detail, [...errors, ...warnings].slice(0, 8));
}

async function runGitHubAuthCheck(cfg) {
  if (!cfg.token) {
    return createMonitorResult('warn', 'Доступ GitHub API', 'Токен не заполнен. Часть проверок и запись в репозиторий недоступны.', []);
  }

  try {
    const payload = await githubRequest('https://api.github.com/user', {
      method: 'GET',
      headers: headers(cfg.token)
    });
    return createMonitorResult('ok', 'Доступ GitHub API', `Токен валиден. Пользователь: ${payload.login || 'unknown'}.`, []);
  } catch (error) {
    return createMonitorResult('error', 'Доступ GitHub API', `Ошибка авторизации: ${getErrorMessage(error)}`, []);
  }
}

async function runDeployStatusCheck(cfg) {
  if (!cfg.owner || !cfg.repo) {
    return createMonitorResult('warn', 'Статус деплоя', 'Заполните owner/repo для проверки деплоя.', []);
  }

  try {
    const workflowData = await githubRequest(
      `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/actions/workflows?per_page=100`,
      {
        method: 'GET',
        headers: headers(cfg.token)
      }
    );

    const workflows = Array.isArray(workflowData.workflows) ? workflowData.workflows : [];
    const workflow =
      workflows.find((item) => String(item.path || '').includes('deploy-pages')) ||
      workflows.find((item) => /deploy github pages/i.test(String(item.name || ''))) ||
      workflows.find((item) => /pages/i.test(String(item.name || '')));

    if (!workflow) {
      return createMonitorResult('warn', 'Статус деплоя', 'Не найден workflow деплоя Pages.', []);
    }

    const runsData = await githubRequest(
      `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/actions/workflows/${workflow.id}/runs?branch=${encodeURIComponent(cfg.branch)}&per_page=1`,
      {
        method: 'GET',
        headers: headers(cfg.token)
      }
    );

    const run = Array.isArray(runsData.workflow_runs) ? runsData.workflow_runs[0] : null;
    if (!run) {
      return createMonitorResult('warn', 'Статус деплоя', 'Запусков workflow пока нет.', [], workflow.html_url || '');
    }

    if (run.status !== 'completed') {
      return createMonitorResult('warn', 'Статус деплоя', `Workflow "${workflow.name}" сейчас в состоянии "${run.status}".`, [], run.html_url || '', 'Открыть запуск');
    }

    if (run.conclusion === 'success') {
      return createMonitorResult('ok', 'Статус деплоя', `Последний деплой успешен (${new Date(run.updated_at).toLocaleString('ru-RU')}).`, [], run.html_url || '', 'Открыть запуск');
    }

    return createMonitorResult('error', 'Статус деплоя', `Последний запуск завершился с "${run.conclusion || 'unknown'}".`, [], run.html_url || '', 'Открыть запуск');
  } catch (error) {
    return createMonitorResult('error', 'Статус деплоя', `Не удалось получить данные workflow: ${getErrorMessage(error)}`, []);
  }
}

async function probeUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store'
    });

    if (response.ok) {
      return { level: 'ok', detail: `${url} доступен (HTTP ${response.status}).` };
    }

    if (response.status >= 500) {
      return { level: 'error', detail: `${url} отвечает ошибкой сервера (HTTP ${response.status}).` };
    }

    return { level: 'warn', detail: `${url} отвечает с кодом HTTP ${response.status}.` };
  } catch {
    try {
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store'
      });
      return { level: 'warn', detail: `${url}: браузер не дал прочитать HTTP-статус (CORS), но запрос отправлен.` };
    } catch (error) {
      return { level: 'error', detail: `${url} недоступен: ${getErrorMessage(error)}` };
    }
  }
}

async function runPagesAvailabilityCheck(cfg) {
  const pagesUrl = getPagesBaseUrl(cfg.owner, cfg.repo);
  if (!pagesUrl) {
    return createMonitorResult('warn', 'Доступность сайта', 'Не удалось вычислить URL Pages для проверки.', []);
  }

  const adminUrl = joinUrl(pagesUrl, 'admin/index.html');
  const siteProbe = await probeUrl(pagesUrl);
  const adminProbe = await probeUrl(adminUrl);
  const level = getHigherMonitorLevel(siteProbe.level, adminProbe.level);

  return createMonitorResult(
    level,
    'Доступность сайта',
    'Проверка главной страницы и админки завершена.',
    [siteProbe.detail, adminProbe.detail],
    pagesUrl,
    'Открыть сайт'
  );
}

async function runUploadDirectoryCheck(cfg) {
  if (!cfg.owner || !cfg.repo) {
    return createMonitorResult('warn', 'Папка загрузок', 'Заполните owner/repo, чтобы проверить папку загрузок.', []);
  }

  if (!cfg.uploadDir.startsWith('public/')) {
    return createMonitorResult('error', 'Папка загрузок', 'Папка для фото должна быть внутри public/.', []);
  }

  try {
    const payload = await githubRequest(
      `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePath(cfg.uploadDir)}?ref=${encodeURIComponent(cfg.branch)}`,
      {
        method: 'GET',
        headers: headers(cfg.token)
      }
    );

    if (!Array.isArray(payload)) {
      return createMonitorResult('warn', 'Папка загрузок', `Путь ${cfg.uploadDir} существует, но не является папкой.`, []);
    }

    const files = payload.filter((item) => item && item.type === 'file');
    const latest = files
      .slice(0, 3)
      .map((item) => String(item.name || '').trim())
      .filter(Boolean);

    return createMonitorResult(
      'ok',
      'Папка загрузок',
      `Папка ${cfg.uploadDir} доступна. Файлов: ${files.length}.`,
      latest.length ? [`Последние файлы: ${latest.join(', ')}`] : []
    );
  } catch (error) {
    const message = getErrorMessage(error);
    if (/404/.test(message) || /Not Found/i.test(message)) {
      return createMonitorResult('warn', 'Папка загрузок', `Папка ${cfg.uploadDir} пока не создана. Она появится после первой загрузки.`, []);
    }

    return createMonitorResult('error', 'Папка загрузок', `Не удалось проверить папку: ${message}`, []);
  }
}

async function runMonitoringChecks(options = {}) {
  const mode = options.mode === 'full' ? 'full' : 'local';
  const cfg = getConfig();
  const content = parseEditorJsonSafe();

  if (mode === 'full') {
    monitorRunBtn.disabled = true;
    monitorRunBtn.textContent = 'Проверка...';
  }

  try {
    const localResults = [
      runContentQualityChecks(content),
      runMediaQualityChecks(content)
    ];

    let remoteResults = [];
    if (mode === 'full') {
      remoteResults = await Promise.all([
        runGitHubAuthCheck(cfg),
        runDeployStatusCheck(cfg),
        runPagesAvailabilityCheck(cfg),
        runUploadDirectoryCheck(cfg)
      ]);
    } else {
      remoteResults = [
        createMonitorResult(
          'info',
          'Внешние проверки',
          'Быстрая локальная проверка завершена. Для полного мониторинга нажмите «Обновить мониторинг».',
          []
        )
      ];
    }

    renderMonitoringResults([...remoteResults, ...localResults]);
  } finally {
    if (mode === 'full') {
      monitorRunBtn.disabled = false;
      monitorRunBtn.textContent = 'Обновить мониторинг';
    }
  }
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
  const confirmed = await showConfirmModal(
    '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f?',
    '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0431\u0443\u0434\u0443\u0442 \u0437\u0430\u043a\u043e\u043c\u043c\u0438\u0447\u0435\u043d\u044b \u0432 <strong>GitHub</strong> \u0438 \u0441\u0430\u0439\u0442 \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.',
    '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'
  );
  if (!confirmed) return;
  try {
    setBusy(true);
    setStatus('info', 'Создаю коммит в GitHub...');

    const cfg = requireRepoFields();
    if (!cfg.token) {
      throw new Error('Для сохранения изменений нужен Token.');
    }

    const parsed = parseEditorJson();
    const syncSummary = await ensureAllContentLanguages(parsed, visualLangSelect.value || DEFAULT_LANGUAGE);
    if (syncSummary.created) {
      setEditorData(parsed);
      setStatus('info', `Перед сохранением создано переводов: ${syncSummary.created}. Отправляю в GitHub...`);
    }
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
    lastSyncedTime = new Date();
    updateLastSyncedBadge();
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

  if (type === 'error' || type === 'success') {
    showToast(type, message);
  }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(type, text, duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '\u2713', error: '\u2717', info: '\u2139' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-body">${escapeHtml(text)}</span><button class="toast-close" type="button">\u00D7</button><div class="toast-progress" style="animation-duration:${duration}ms"></div>`;
  toastContainerEl.appendChild(toast);
  const close = toast.querySelector('.toast-close');
  const dismiss = () => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 260); };
  close.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

// ===== LAST SYNCED BADGE =====
function updateLastSyncedBadge() {
  if (!lastSyncedTime) { lastSyncedEl.textContent = ''; return; }
  const dirty = isEditorDirty();
  const ago = formatTimeAgo(lastSyncedTime);
  lastSyncedEl.innerHTML = `<span class="last-synced-dot ${dirty ? 'dirty' : 'synced'}"></span>${ago}`;
}

function formatTimeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return '\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
  if (s < 60) return `${s}\u0441 \u043d\u0430\u0437\u0430\u0434`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}\u043c \u043d\u0430\u0437\u0430\u0434`;
  const h = Math.floor(m / 60);
  return `${h}\u0447 \u043d\u0430\u0437\u0430\u0434`;
}

setInterval(updateLastSyncedBadge, 15000);

// ===== SAVE CONFIRMATION MODAL =====
function showConfirmModal(title, bodyHtml, confirmLabel = '\u0414\u0430') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-card"><h3 class="modal-title">${escapeHtml(title)}</h3><div class="modal-body">${bodyHtml}</div><div class="modal-actions"><button class="btn" type="button" data-action="cancel">\u041e\u0442\u043c\u0435\u043d\u0430</button><button class="btn btn-primary" type="button" data-action="confirm">${escapeHtml(confirmLabel)}</button></div></div>`;
    document.body.appendChild(overlay);
    const close = (result) => { overlay.classList.add('removing'); setTimeout(() => overlay.remove(), 200); resolve(result); };
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

// ===== KEYBOARD SHORTCUTS PANEL =====
function showShortcutsPanel() {
  const existing = document.querySelector('.shortcuts-panel');
  if (existing) { existing.classList.add('removing'); setTimeout(() => existing.remove(), 200); return; }
  const shortcuts = [
    { keys: ['Ctrl', 'S'], desc: '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0432 GitHub' },
    { keys: ['Ctrl', 'Shift', 'L'], desc: '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u0437 GitHub' },
    { keys: ['Ctrl', 'Shift', 'F'], desc: '\u0424\u043e\u0440\u043c\u0430\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c JSON' },
    { keys: ['?'], desc: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c/\u0441\u043a\u0440\u044b\u0442\u044c \u044d\u0442\u0443 \u043f\u0430\u043d\u0435\u043b\u044c' }
  ];
  const rows = shortcuts.map(s => `<div class="shortcut-row"><span class="shortcut-desc">${escapeHtml(s.desc)}</span><span class="shortcut-keys">${s.keys.map(k => `<span class="shortcut-key">${k}</span>`).join('')}</span></div>`).join('');
  const panel = document.createElement('div');
  panel.className = 'shortcuts-panel';
  panel.innerHTML = `<div class="shortcuts-card"><div class="shortcuts-title">\u0413\u043e\u0440\u044f\u0447\u0438\u0435 \u043a\u043b\u0430\u0432\u0438\u0448\u0438<button class="shortcuts-close" type="button">\u00D7</button></div><div class="shortcuts-grid">${rows}</div></div>`;
  document.body.appendChild(panel);
  const close = () => { panel.classList.add('removing'); setTimeout(() => panel.remove(), 200); };
  panel.querySelector('.shortcuts-close').addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
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
  setTimeout(() => { try { renderDashboard(); } catch {} }, 100);
  if (markSynced) {
    setLastSyncedSnapshotFromText(editor.value);
  }
  if (clearDraft) {
    localStorage.removeItem(DRAFT_KEY);
  } else {
    saveDraft();
  }
  saveSettings();
  queueMonitoringChecks(120);
  // Auto-update polls when data changes
  if (typeof renderPollResults === 'function') {
    try { renderPollResults(); } catch {}
  }
  // Re-seed Issue Builder + Translations from freshly loaded content
  if (typeof renderIssuesTab === 'function' && document.getElementById('issueArticlesList')) {
    _issues = null; // force resync of issue archive from reloaded content
    try { renderIssuesTab(); } catch {}
  }
  if (typeof renderTranslationsTab === 'function' && document.getElementById('translBody')) {
    try { renderTranslationsTab(); } catch {}
  }
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
    renderCreatorQuality(null);
    renderContentCommand(null);
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

const ARTICLE_BLUEPRINTS = {
  story: {
    title: 'New editorial story',
    category: 'Culture',
    subcategory: 'Feature',
    tags: ['story', 'culture', 'editorial'],
    excerpt: 'A focused opening paragraph for a new editorial story.',
    blocks: [
      { type: 'text', content: 'Start with the strongest scene, fact, or observation. Keep this first block tight and specific.' },
      { type: 'image', content: '', caption: 'Lead image' },
      { type: 'quote', content: 'Add a line worth remembering here.' },
      { type: 'note', content: 'Editorial note, source context, or a short aside.' },
      { type: 'checklist', caption: 'What to cover', content: { items: ['Context', 'Key detail', 'Human angle', 'What changes next'] } },
      { type: 'poll', content: { question: 'What should we explore next?', options: [{ label: 'More context', votes: 0 }, { label: 'Practical guide', votes: 0 }] } }
    ]
  },
  guide: {
    title: 'New practical guide',
    category: 'Guide',
    subcategory: 'How to',
    tags: ['guide', 'how-to', 'editorial'],
    excerpt: 'A practical guide with a clear promise and usable steps.',
    blocks: [
      { type: 'text', content: 'Define the problem and the outcome the reader will get by the end.' },
      { type: 'checklist', caption: 'Steps', content: { items: ['Prepare the basics', 'Do the main action', 'Check the result', 'Save the useful links'] } },
      { type: 'note', content: 'Add timing, limits, or caveats here.' },
      { type: 'image', content: '', caption: 'Process visual' },
      { type: 'poll', content: { question: 'Was this guide useful?', options: [{ label: 'Yes', votes: 0 }, { label: 'Needs more detail', votes: 0 }] } }
    ]
  },
  photoEssay: {
    title: 'New photo essay',
    category: 'Photo Essay',
    subcategory: 'Visual story',
    tags: ['photo', 'essay', 'visual'],
    excerpt: 'A visual story built around images, captions, and a concise narrative line.',
    blocks: [
      { type: 'text', content: 'Set the visual premise in one short paragraph.' },
      { type: 'image', content: '', caption: 'Opening frame' },
      { type: 'gallery', content: [], caption: 'Sequence' },
      { type: 'quote', content: 'A small quote or caption line that gives the sequence texture.' },
      { type: 'text', content: 'Close with what the images reveal, not just what they show.' }
    ]
  },
  review: {
    title: 'New review',
    category: 'Review',
    subcategory: 'Critique',
    tags: ['review', 'critique', 'editorial'],
    excerpt: 'A review with a clear verdict, criteria, and context.',
    blocks: [
      { type: 'text', content: 'Open with the verdict and the reason it matters.' },
      { type: 'quote', content: 'The line that captures the whole review.' },
      { type: 'checklist', caption: 'Criteria', content: { items: ['Idea', 'Execution', 'Usefulness', 'Originality'] } },
      { type: 'image', content: '', caption: 'Reference image' },
      { type: 'poll', content: { question: 'Would you read more reviews like this?', options: [{ label: 'Yes', votes: 0 }, { label: 'Not this format', votes: 0 }] } }
    ]
  }
};

const ARTICLE_BLOCK_PRESETS = {
  structure: [
    { type: 'text', content: 'Lead: one strong paragraph that explains what is new, important, or beautiful here.' },
    { type: 'quote', content: 'A quote, thesis, or memorable line.' },
    { type: 'image', content: '', caption: 'Supporting visual' },
    { type: 'note', content: 'Context, source, or editor note.' }
  ],
  checklist: [
    { type: 'checklist', caption: 'Checklist', content: { items: ['Main point', 'Useful detail', 'Source or example', 'Next step'] } }
  ],
  poll: [
    { type: 'poll', content: { question: 'What should we add next?', options: [{ label: 'More examples', votes: 0 }, { label: 'Shorter summary', votes: 0 }] } }
  ]
};

function getAdminDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getNextEntryId(data, section) {
  const ids = getConcreteEntryIds(data, section);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function slugifySeed(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || fallback;
}

function getCreatorInputValue(input) {
  return String(input?.value || '').trim();
}

function buildArticleBlueprint(kind, nextId) {
  const blueprint = ARTICLE_BLUEPRINTS[kind] || ARTICLE_BLUEPRINTS.story;
  const title = getCreatorInputValue(creatorTitleInput) || blueprint.title;
  const category = getCreatorInputValue(creatorCategoryInput) || blueprint.category;
  const seedFallback = `${kind || 'article'}-${nextId}`;
  const imageSeed = getCreatorInputValue(creatorSeedInput) || slugifySeed(title, seedFallback);
  const imageUrl = getOptionalString(getCreatorInputValue(creatorImageUrlInput));
  const content = deepClone(blueprint.blocks).map((block, index) => {
    if (block.type === 'image' && !block.content) {
      return { ...block, content: `${imageSeed}-${index + 1}` };
    }

    if (block.type === 'gallery' && Array.isArray(block.content) && !block.content.length) {
      return {
        ...block,
        content: [`${imageSeed}-gallery-1`, `${imageSeed}-gallery-2`, `${imageSeed}-gallery-3`]
      };
    }

    return block;
  });

  return {
    id: nextId,
    title,
    author: 'EPRIS Journal',
    role: 'Editorial Desk',
    date: getAdminDateLabel(),
    excerpt: blueprint.excerpt,
    category,
    subcategory: blueprint.subcategory,
    tags: deepClone(blueprint.tags),
    imageSeed,
    imageUrl,
    content
  };
}

function renderCreatorQuality(data, section, lang, entry) {
  if (!creatorQualityEl) {
    return;
  }

  if (!data || !entry) {
    creatorQualityEl.innerHTML = '<span class="quality-chip warn">Нет записи</span>';
    return;
  }

  const chips = [];
  const addChip = (label, ok, danger = false) => {
    chips.push({
      label,
      state: ok ? 'ok' : (danger ? 'danger' : 'warn')
    });
  };

  const languages = getTranslationLanguages(data);
  const entryId = Number(entry.id);
  const concreteLangs = languages.filter((language) => hasConcreteEntryForLanguage(data, section, language, entryId));

  addChip(entry.title ? 'Заголовок' : 'Нет заголовка', Boolean(entry.title), true);
  addChip(`${concreteLangs.length}/${languages.length} языков`, languages.length > 0 && concreteLangs.length === languages.length, true);

  if (section === 'articles') {
    const blocks = Array.isArray(entry.content) ? entry.content : [];
    const hasMedia = Boolean(entry.imageUrl || entry.imageSeed) || blocks.some((block) => ['image', 'gallery'].includes(block?.type));
    const hasPoll = blocks.some((block) => {
      const options = block?.content?.options;
      return block?.type === 'poll' && block.content?.question && Array.isArray(options) && options.length >= 2;
    });
    const words = blocks.reduce((sum, block) => {
      if (['text', 'quote', 'note'].includes(block?.type) && typeof block.content === 'string') {
        return sum + countWords(block.content);
      }
      return sum;
    }, 0);

    addChip(entry.excerpt ? 'Лид' : 'Нет лида', Boolean(entry.excerpt));
    addChip(hasMedia ? 'Обложка' : 'Нет фото', hasMedia);
    addChip(`${blocks.length} блоков`, blocks.length >= 3);
    addChip(`${words} слов`, words >= 80);
    addChip(Array.isArray(entry.tags) && entry.tags.length ? 'Теги' : 'Нет тегов', Array.isArray(entry.tags) && entry.tags.length);
    addChip(hasPoll ? 'Опрос' : 'Нет опроса', hasPoll);
  } else if (section === 'items') {
    addChip(entry.description ? 'Описание' : 'Нет описания', Boolean(entry.description));
    addChip(entry.imageUrl || entry.imageSeed ? 'Фото' : 'Нет фото', Boolean(entry.imageUrl || entry.imageSeed));
  } else if (section === 'reviews') {
    addChip(entry.content ? 'Текст' : 'Нет текста', Boolean(entry.content));
    addChip(Number(entry.rating) > 0 ? 'Рейтинг' : 'Нет рейтинга', Number(entry.rating) > 0);
  } else if (section === 'libraryItems') {
    addChip(entry.type ? 'Тип' : 'Нет типа', Boolean(entry.type));
    addChip(entry.year ? 'Год' : 'Нет года', Boolean(entry.year));
  }

  creatorQualityEl.innerHTML = chips
    .map((chip) => `<span class="quality-chip ${chip.state}">${escapeHtml(chip.label)}</span>`)
    .join('');
}

function getEntryWordCount(section, entry) {
  if (!entry || typeof entry !== 'object') {
    return 0;
  }

  if (section === 'articles') {
    const blocks = Array.isArray(entry.content) ? entry.content : [];
    const blockWords = blocks.reduce((sum, block) => {
      if (['text', 'quote', 'note'].includes(block?.type) && typeof block.content === 'string') {
        return sum + countWords(block.content);
      }
      return sum;
    }, 0);
    return blockWords + countWords(entry.excerpt || '');
  }

  if (section === 'items') {
    return countWords(`${entry.subtitle || ''} ${entry.description || ''}`);
  }

  if (section === 'reviews') {
    return countWords(`${entry.subject || ''} ${entry.content || ''}`);
  }

  return countWords(`${entry.title || ''} ${entry.type || ''} ${entry.year || ''}`);
}

function entryHasMedia(section, entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  if (section !== 'articles' && section !== 'items') {
    return true;
  }

  if (entry.imageUrl || entry.imageSeed) {
    return true;
  }

  const blocks = Array.isArray(entry.content) ? entry.content : [];
  return blocks.some((block) => {
    if (block?.type === 'image') {
      return Boolean(block.content);
    }
    if (block?.type === 'gallery') {
      return Array.isArray(block.content) && block.content.length > 0;
    }
    return false;
  });
}

function entryHasPoll(section, entry) {
  if (section !== 'articles') {
    return true;
  }

  const blocks = Array.isArray(entry?.content) ? entry.content : [];
  return blocks.some((block) => {
    const options = block?.content?.options;
    return block?.type === 'poll' && Boolean(block.content?.question) && Array.isArray(options) && options.length >= 2;
  });
}

function entryIsThin(section, entry) {
  if (!entry || typeof entry !== 'object') {
    return true;
  }

  if (!entry.title) {
    return true;
  }

  const words = getEntryWordCount(section, entry);
  if (section === 'articles') {
    const blocks = Array.isArray(entry.content) ? entry.content : [];
    return !entry.excerpt || blocks.length < 3 || words < 80;
  }

  if (section === 'items') {
    return !entry.description || words < 18;
  }

  if (section === 'reviews') {
    return !entry.content || words < 25;
  }

  return !entry.type || !entry.year;
}

function getAuditEntry(data, section, preferredLang, entryId) {
  try {
    return requireSourceEntry(data, section, preferredLang, entryId);
  } catch {
    for (const lang of getTranslationLanguages(data)) {
      const entry = findEntryInLanguage(data, section, lang, entryId);
      if (entry) {
        return { entry, lang };
      }
    }
  }

  return null;
}

function buildSectionAudit(data, section, preferredLang = DEFAULT_LANGUAGE) {
  const languages = getTranslationLanguages(data);
  const ids = getConcreteEntryIds(data, section).sort((a, b) => a - b);
  const audit = {
    total: ids.length,
    languages,
    completeLangEntries: 0,
    missingPairs: 0,
    missingLangItems: [],
    noPhoto: [],
    noPoll: [],
    thinText: []
  };

  for (const id of ids) {
    const missingLangs = languages.filter((lang) => !hasConcreteEntryForLanguage(data, section, lang, id));
    if (missingLangs.length) {
      audit.missingPairs += missingLangs.length;
      audit.missingLangItems.push({ id, lang: missingLangs[0], missingLangs });
    } else {
      audit.completeLangEntries += 1;
    }

    const source = getAuditEntry(data, section, preferredLang, id);
    if (!source) {
      continue;
    }

    if (!entryHasMedia(section, source.entry)) {
      audit.noPhoto.push({ id, lang: source.lang });
    }

    if (!entryHasPoll(section, source.entry)) {
      audit.noPoll.push({ id, lang: source.lang });
    }

    if (entryIsThin(section, source.entry)) {
      audit.thinText.push({ id, lang: source.lang });
    }
  }

  return audit;
}

function renderAuditMetric(label, value, state) {
  return `
    <div class="audit-metric ${state || ''}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function setIssueButton(button, label, count) {
  button.textContent = count ? `${label} (${count})` : label;
  button.disabled = count === 0;
}

function getPreviewMeta(section, entry) {
  if (section === 'articles') {
    return [entry.category, entry.subcategory, entry.date].filter(Boolean).join(' · ');
  }
  if (section === 'items') {
    return [entry.fig, entry.subtitle].filter(Boolean).join(' · ');
  }
  if (section === 'reviews') {
    return [entry.subject, entry.rating ? `${entry.rating}/5` : ''].filter(Boolean).join(' · ');
  }
  return [entry.type, entry.size, entry.year].filter(Boolean).join(' · ');
}

function truncateText(value, maxLength = 180) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function renderEntryPreview(data, section, lang, entry) {
  if (!entry) {
    return `
      <div class="preview-empty-state">
        <p class="panel-kicker">Предпросмотр</p>
        <h3>Запись не выбрана</h3>
      </div>
    `;
  }

  const title = getEntryTitle(section, entry);
  const imageSource = section === 'articles' || section === 'items'
    ? resolvePreviewImageSource(entry.imageUrl, entry.imageSeed)
    : '';
  const words = getEntryWordCount(section, entry);
  const languages = getTranslationLanguages(data);
  const concreteLangs = languages.filter((language) => hasConcreteEntryForLanguage(data, section, language, entry.id));
  const meta = getPreviewMeta(section, entry);
  const excerpt = section === 'articles'
    ? entry.excerpt
    : section === 'items'
      ? entry.description
      : section === 'reviews'
        ? entry.content
        : `${entry.type || ''} ${entry.size || ''} ${entry.year || ''}`;
  const blocks = Array.isArray(entry.content) ? entry.content : [];
  const tags = Array.isArray(entry.tags) ? entry.tags.slice(0, 5) : [];

  return `
    <div class="preview-head">
      <div>
        <p class="panel-kicker">Предпросмотр</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <span class="preview-id">#${escapeHtml(entry.id)} · ${escapeHtml(lang)}</span>
    </div>
    ${imageSource
      ? `<img class="preview-image" src="${escapeHtml(imageSource)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
      : '<div class="preview-image-empty">Нет обложки</div>'
    }
    <p class="preview-meta">${escapeHtml(meta || getSectionLabel(section))}</p>
    <p class="preview-excerpt">${escapeHtml(truncateText(excerpt, 220) || 'Текст пока пустой.')}</p>
    <div class="preview-pills">
      <span>${escapeHtml(String(words))} слов</span>
      <span>${escapeHtml(String(concreteLangs.length))}/${escapeHtml(String(languages.length))} языков</span>
      ${section === 'articles' ? `<span>${escapeHtml(String(blocks.length))} блоков</span>` : ''}
    </div>
    ${tags.length
      ? `<div class="preview-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`
      : ''
    }
  `;
}

function renderContentCommand(data, section = visualSectionSelect.value, lang = visualLangSelect.value || DEFAULT_LANGUAGE, entry = null) {
  if (!contentAuditMetricsEl || !entryPreviewEl) {
    return;
  }

  if (!data) {
    contentAuditMetricsEl.innerHTML = renderAuditMetric('JSON', 'не загружен', 'warn');
    entryPreviewEl.innerHTML = renderEntryPreview({ translations: {} }, section, lang, null);
    [findMissingLangBtn, findNoPhotoBtn, findNoPollBtn, findThinTextBtn].forEach((button) => { button.disabled = true; });
    return;
  }

  const audit = buildSectionAudit(data, section, lang);
  const completeState = audit.total && audit.completeLangEntries === audit.total ? 'ok' : 'warn';
  const missingState = audit.missingPairs ? 'danger' : 'ok';
  const weakState = audit.thinText.length ? 'warn' : 'ok';
  const metrics = [
    renderAuditMetric('Записей', String(audit.total), audit.total ? 'ok' : 'warn'),
    renderAuditMetric('7 языков', `${audit.completeLangEntries}/${audit.total}`, completeState),
    renderAuditMetric('Пропусков языка', String(audit.missingPairs), missingState),
    renderAuditMetric(section === 'articles' || section === 'items' ? 'Без фото' : 'Медиа', String(audit.noPhoto.length), audit.noPhoto.length ? 'warn' : 'ok'),
    renderAuditMetric(section === 'articles' ? 'Без опроса' : 'Опросы', String(audit.noPoll.length), audit.noPoll.length ? 'warn' : 'ok'),
    renderAuditMetric('Слабый текст', String(audit.thinText.length), weakState)
  ];

  contentAuditMetricsEl.innerHTML = metrics.join('');
  setIssueButton(findMissingLangBtn, 'Нет языка', audit.missingLangItems.length);
  setIssueButton(findNoPhotoBtn, 'Нет фото', audit.noPhoto.length);
  setIssueButton(findNoPollBtn, 'Нет опроса', audit.noPoll.length);
  setIssueButton(findThinTextBtn, 'Слабый текст', audit.thinText.length);
  entryPreviewEl.innerHTML = renderEntryPreview(data, section, lang, entry);
}

function getFirstIssueTarget(audit, issueType) {
  if (issueType === 'missingLang') {
    return audit.missingLangItems[0] || null;
  }
  if (issueType === 'noPhoto') {
    return audit.noPhoto[0] || null;
  }
  if (issueType === 'noPoll') {
    return audit.noPoll[0] || null;
  }
  if (issueType === 'thinText') {
    return audit.thinText[0] || null;
  }
  return null;
}

function getIssueLabel(issueType) {
  if (issueType === 'missingLang') return 'пропуск языка';
  if (issueType === 'noPhoto') return 'нет фото';
  if (issueType === 'noPoll') return 'нет опроса';
  if (issueType === 'thinText') return 'слабый текст';
  return 'задача';
}

function selectFirstIssueEntry(issueType) {
  try {
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const currentLang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const audit = buildSectionAudit(data, section, currentLang);
    const target = getFirstIssueTarget(audit, issueType);

    if (!target) {
      setStatus('success', `В разделе «${getSectionLabel(section)}» нет проблемы: ${getIssueLabel(issueType)}.`);
      return;
    }

    visualSearchInput.value = '';
    if (target.lang) {
      visualLangSelect.value = target.lang;
    }
    pendingVisualEntryId = target.id;
    refreshVisualEditor();
    setStatus('info', `Открыта запись #${target.id}: ${getIssueLabel(issueType)}.`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function buildQualityEntryFromForm(section, fallback = {}) {
  const base = { ...fallback, id: Number(visualEntrySelect.value) || fallback.id };

  if (section === 'items') {
    return {
      ...base,
      title: getFieldValue('vf-title').trim(),
      description: getFieldValue('vf-description').trim(),
      imageSeed: getFieldValue('vf-imageSeed').trim(),
      imageUrl: getFieldValue('vf-imageUrl').trim()
    };
  }

  if (section === 'reviews') {
    return {
      ...base,
      title: getFieldValue('vf-title').trim(),
      content: getFieldValue('vf-content').trim(),
      rating: Number(getFieldValue('vf-rating'))
    };
  }

  if (section === 'libraryItems') {
    return {
      ...base,
      title: getFieldValue('vf-title').trim(),
      type: getFieldValue('vf-type').trim(),
      size: getFieldValue('vf-size').trim(),
      url: getFieldValue('vf-url').trim(),
      year: getFieldValue('vf-year').trim()
    };
  }

  return {
    ...base,
    title: getFieldValue('vf-title').trim(),
    excerpt: getFieldValue('vf-excerpt').trim(),
    tags: getFieldValue('vf-tags').split(',').map((tag) => tag.trim()).filter(Boolean),
    imageSeed: getFieldValue('vf-imageSeed').trim(),
    imageUrl: getFieldValue('vf-imageUrl').trim(),
    content: collectBlockEditorContent()
  };
}

function refreshCreatorQualityFromForm(fallback = {}) {
  const data = getVisualData();
  if (!data) {
    return;
  }

  const section = visualSectionSelect.value;
  const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
  const entry = buildQualityEntryFromForm(section, fallback);
  renderCreatorQuality(data, section, lang, entry);
  renderContentCommand(data, section, lang, entry);
}

function bindCreatorQualityInputs(fallback = {}) {
  visualFormEl.querySelectorAll('input, textarea, select').forEach((field) => {
    field.addEventListener('input', () => refreshCreatorQualityFromForm(fallback));
    field.addEventListener('change', () => refreshCreatorQualityFromForm(fallback));
  });
}

async function createArticleFromBlueprint(kind) {
  try {
    setBusy(true);
    const data = parseEditorJson();
    const sourceLang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const entries = getSectionArray(data, 'articles', sourceLang, sourceLang !== DEFAULT_LANGUAGE);
    const nextId = getNextEntryId(data, 'articles');
    const baseArticle = buildArticleBlueprint(kind, nextId);
    let sourceArticle = baseArticle;

    if (sourceLang !== DEFAULT_LANGUAGE) {
      setStatus('info', `Готовлю шаблон на ${sourceLang}...`);
      sourceArticle = await translateEntryForSection('articles', baseArticle, sourceLang, DEFAULT_LANGUAGE);
      const titleOverride = getCreatorInputValue(creatorTitleInput);
      const categoryOverride = getCreatorInputValue(creatorCategoryInput);
      if (titleOverride) sourceArticle.title = titleOverride;
      if (categoryOverride) sourceArticle.category = categoryOverride;
    }

    entries.push(sourceArticle);
    setStatus('info', `Создаю языковые версии статьи #${nextId}...`);
    const syncedLangs = await syncMissingEntryLanguages(data, 'articles', sourceLang, sourceArticle);

    visualSectionSelect.value = 'articles';
    visualLangSelect.value = sourceLang;
    pendingVisualEntryId = nextId;
    setEditorData(data);
    const syncNote = syncedLangs.length ? ` Языки: ${syncedLangs.join(', ')}.` : '';
    setStatus('success', `Шаблон статьи #${nextId} создан.${syncNote}`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

function appendArticlePreset(kind) {
  try {
    if (visualSectionSelect.value !== 'articles') {
      throw new Error('Быстрые блоки доступны в разделе «Статьи».');
    }

    const editorEl = document.getElementById('vf-block-editor');
    if (!editorEl) {
      throw new Error('Сначала выберите статью.');
    }

    const preset = ARTICLE_BLOCK_PRESETS[kind];
    if (!preset) {
      throw new Error('Неизвестный шаблон блока.');
    }

    const blocks = collectBlockEditorContent();
    const seed = getFieldValue('vf-imageSeed').trim() || getCreatorInputValue(creatorSeedInput) || `article-${visualEntrySelect.value || 'new'}`;
    const nextBlocks = deepClone(preset).map((block, index) => {
      if (block.type === 'image' && !block.content) {
        return { ...block, content: `${seed}-section-${blocks.length + index + 1}` };
      }
      return block;
    });

    editorEl.innerHTML = renderBlockEditor([...blocks, ...nextBlocks]);
    bindBlockEditorEvents();
    bindCreatorQualityInputs(buildQualityEntryFromForm('articles'));
    const data = getVisualData();
    const previewEntry = {
      id: Number(visualEntrySelect.value),
      title: getFieldValue('vf-title').trim(),
      excerpt: getFieldValue('vf-excerpt').trim(),
      tags: getFieldValue('vf-tags').split(',').map((tag) => tag.trim()).filter(Boolean),
      imageSeed: getFieldValue('vf-imageSeed').trim(),
      imageUrl: getFieldValue('vf-imageUrl').trim(),
      content: collectBlockEditorContent()
    };
    renderCreatorQuality(data, 'articles', visualLangSelect.value || DEFAULT_LANGUAGE, previewEntry);
    renderContentCommand(data, 'articles', visualLangSelect.value || DEFAULT_LANGUAGE, previewEntry);
    setStatus('success', 'Блоки добавлены. Нажмите «Применить изменения», чтобы записать их в JSON.');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
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

  // For non-EN languages, build dropdown from ALL EN entries so untranslated ones are visible
  let dropdownEntries;
  if (lang !== DEFAULT_LANGUAGE) {
    const enEntries = getSectionArray(data, section, DEFAULT_LANGUAGE, false);
    const localizedIds = new Set(entries.map(e => Number(e.id)));
    dropdownEntries = enEntries.map(enEntry => {
      const localizedEntry = entries.find(le => Number(le.id) === Number(enEntry.id));
      return {
        id: enEntry.id,
        _entry: localizedEntry || enEntry,
        _hasTranslation: localizedIds.has(Number(enEntry.id)),
        _enTitle: getEntryTitle(section, enEntry)
      };
    });
  } else {
    dropdownEntries = entries.map(entry => ({
      id: entry.id,
      _entry: entry,
      _hasTranslation: true,
      _enTitle: getEntryTitle(section, entry)
    }));
  }

  const visibleDropdown = !search
    ? dropdownEntries
    : dropdownEntries.filter((item) => {
        const idText = String(item.id || '').toLowerCase();
        const title = getEntryTitle(section, item._entry).toLowerCase();
        const enTitle = item._enTitle.toLowerCase();
        return idText.includes(search) || title.includes(search) || enTitle.includes(search);
      });

  const optionsHtml = visibleDropdown
    .map((item) => {
      const id = Number(item.id);
      const label = item._hasTranslation
        ? getEntryTitle(section, item._entry)
        : item._enTitle + ' (не переведено)';
      return `<option value="${id}">#${id} - ${escapeHtml(label)}</option>`;
    })
    .join('');

  visualEntrySelect.innerHTML = optionsHtml;

  if (!dropdownEntries.length) {
    setVisualNotice(`В разделе "${getSectionLabel(section)}" пока нет записей.`, 'info');
    visualFormEl.innerHTML = '';
    renderCreatorQuality(data, section, lang, null);
    renderContentCommand(data, section, lang, null);
    return;
  }

  if (!visibleDropdown.length) {
    setVisualNotice(`По запросу "${search}" ничего не найдено.`, 'info');
    visualFormEl.innerHTML = '';
    renderCreatorQuality(data, section, lang, null);
    renderContentCommand(data, section, lang, null);
    return;
  }

  const desiredId = pendingVisualEntryId !== null ? String(pendingVisualEntryId) : visualEntrySelect.value;
  pendingVisualEntryId = null;

  if (desiredId && visibleDropdown.some((item) => String(item.id) === desiredId)) {
    visualEntrySelect.value = desiredId;
  } else {
    visualEntrySelect.value = String(visibleDropdown[0].id);
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

function getOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function isCustomMediaReference(value) {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || value.startsWith('data:') || value.startsWith('blob:');
}

function resolvePreviewImageSource(imageUrl, imageSeed) {
  const normalizedUrl = String(imageUrl || '').trim();
  if (normalizedUrl) {
    return normalizedUrl;
  }

  const normalizedSeed = String(imageSeed || '').trim();
  if (!normalizedSeed) {
    return '';
  }

  if (isCustomMediaReference(normalizedSeed)) {
    return normalizedSeed;
  }

  return `https://picsum.photos/seed/${encodeURIComponent(normalizedSeed)}/900/520?grayscale`;
}

function renderPhotoPreviewMarkup(source) {
  const hasSource = Boolean(source);
  return `
    <div class="photo-preview full">
      <p class="form-hint">
        Предпросмотр. Если заполнен URL, на сайте будет использоваться он. Если URL пустой, используется imageSeed.
      </p>
      <img
        id="vf-preview-image"
        src="${hasSource ? escapeHtml(source) : ''}"
        alt="Предпросмотр изображения"
        loading="lazy"
        referrerpolicy="no-referrer"
        ${hasSource ? '' : 'hidden'}
      />
      <div id="vf-preview-empty" class="photo-preview-empty" ${hasSource ? 'hidden' : ''}>
        Добавьте URL фото или imageSeed, чтобы увидеть превью.
      </div>
    </div>
  `;
}

function refreshPhotoPreviewFromInputs() {
  const imageEl = document.getElementById('vf-preview-image');
  const emptyEl = document.getElementById('vf-preview-empty');
  if (!imageEl || !emptyEl) {
    return;
  }

  const source = resolvePreviewImageSource(getFieldValue('vf-imageUrl'), getFieldValue('vf-imageSeed'));
  if (!source) {
    imageEl.setAttribute('hidden', 'hidden');
    imageEl.setAttribute('src', '');
    emptyEl.removeAttribute('hidden');
    return;
  }

  imageEl.setAttribute('src', source);
  imageEl.removeAttribute('hidden');
  emptyEl.setAttribute('hidden', 'hidden');
}

function bindPhotoPreviewInputs() {
  const imageUrlInput = document.getElementById('vf-imageUrl');
  const imageSeedInput = document.getElementById('vf-imageSeed');
  if (!imageUrlInput || !imageSeedInput) {
    return;
  }

  imageUrlInput.addEventListener('input', refreshPhotoPreviewFromInputs);
  imageSeedInput.addEventListener('input', refreshPhotoPreviewFromInputs);
  refreshPhotoPreviewFromInputs();
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
    renderCreatorQuality(data, section, lang, null);
    renderContentCommand(data, section, lang, null);
    return;
  }

  const selectedId = Number(visualEntrySelect.value);
  let entry = entries.find((item) => Number(item.id) === selectedId);

  // If entry not found in localized collection, check if it exists in EN
  if (!entry && lang !== DEFAULT_LANGUAGE) {
    const enEntries = getSectionArray(data, section, DEFAULT_LANGUAGE, false);
    const enEntry = enEntries.find((item) => Number(item.id) === selectedId);
    if (enEntry) {
      setVisualNotice(`Запись #${selectedId} ещё не переведена на ${lang}. Нажмите «Копия из EN», чтобы создать перевод.`, 'info');
      // Show the EN content as read-only preview
      entry = enEntry;
    }
  }

  if (!entry) {
    entry = entries[0];
  }

  if (!entry) {
    visualFormEl.innerHTML = '';
    renderCreatorQuality(data, section, lang, null);
    renderContentCommand(data, section, lang, null);
    return;
  }

  setVisualNotice(`Редактируется: ${getSectionLabel(section)} / #${entry.id} / язык ${lang}`, 'info');
  renderCreatorQuality(data, section, lang, entry);
  renderContentCommand(data, section, lang, entry);

  if (section === 'items') {
    const previewSource = resolvePreviewImageSource(entry.imageUrl, entry.imageSeed);
    visualFormEl.innerHTML = `
      <label>ID<input id="vf-id" value="${escapeHtml(entry.id)}" disabled /></label>
      <label>FIG<input id="vf-fig" value="${escapeHtml(entry.fig || '')}" /></label>
      <label class="full">Заголовок<input id="vf-title" value="${escapeHtml(entry.title || '')}" /></label>
      <label class="full">Подзаголовок<input id="vf-subtitle" value="${escapeHtml(entry.subtitle || '')}" /></label>
      <label class="full">Описание<textarea id="vf-description">${escapeHtml(entry.description || '')}</textarea></label>
      <label class="full">URL фото (необязательно)<input id="vf-imageUrl" placeholder="https://..." value="${escapeHtml(entry.imageUrl || '')}" /></label>
      <label class="full">imageSeed (если URL пустой)<input id="vf-imageSeed" value="${escapeHtml(entry.imageSeed || '')}" /></label>
      ${renderPhotoPreviewMarkup(previewSource)}
    `;
    bindPhotoPreviewInputs();
    bindCreatorQualityInputs(entry);
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
    bindCreatorQualityInputs(entry);
    return;
  }

  if (section === 'libraryItems') {
    visualFormEl.innerHTML = `
      <label>ID<input id="vf-id" value="${escapeHtml(entry.id)}" disabled /></label>
      <label>Тип<input id="vf-type" value="${escapeHtml(entry.type || '')}" /></label>
      <label class="full">Название<input id="vf-title" value="${escapeHtml(entry.title || '')}" /></label>
      <label class="full">PDF URL<input id="vf-url" placeholder="https://..." value="${escapeHtml(entry.url || '')}" /></label>
      <label>Размер<input id="vf-size" value="${escapeHtml(entry.size || '')}" /></label>
      <label>Год<input id="vf-year" value="${escapeHtml(entry.year || '')}" /></label>
    `;
    bindCreatorQualityInputs(entry);
    return;
  }

  const previewSource = resolvePreviewImageSource(entry.imageUrl, entry.imageSeed);
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
    <label class="full">URL обложки (необязательно)<input id="vf-imageUrl" placeholder="https://..." value="${escapeHtml(entry.imageUrl || '')}" /></label>
    <label class="full">imageSeed (если URL пустой)<input id="vf-imageSeed" value="${escapeHtml(entry.imageSeed || '')}" /></label>
    ${renderPhotoPreviewMarkup(previewSource)}
    <div class="block-editor" id="vf-block-editor">${renderBlockEditor(entry.content || [])}</div>
  `;
  bindPhotoPreviewInputs();
  bindBlockEditorEvents();
  bindCreatorQualityInputs(entry);
}

function getFieldValue(id) {
  const element = document.getElementById(id);
  if (!element) {
    return '';
  }
  return element.value;
}

async function applyVisualChanges() {
  try {
    setBusy(true);
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
        imageSeed: getFieldValue('vf-imageSeed').trim(),
        imageUrl: getOptionalString(getFieldValue('vf-imageUrl'))
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
        url: getFieldValue('vf-url').trim(),
        year: getFieldValue('vf-year').trim()
      };
    } else {
      const parsedContent = collectBlockEditorContent();

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
        imageUrl: getOptionalString(getFieldValue('vf-imageUrl')),
        content: parsedContent
      };
    }

    entries[entryIndex] = next;
    const syncedLangs = await syncMissingEntryLanguages(data, section, lang, next);
    pendingVisualEntryId = selectedId;
    setEditorData(data);
    const syncNote = syncedLangs.length ? ` Недостающие языки созданы: ${syncedLangs.join(', ')}.` : '';
    setStatus('success', `Запись #${selectedId} обновлена (${getSectionLabel(section)} / ${lang}).${syncNote}`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

function createDefaultEntry(section, nextId) {
  if (section === 'items') {
    return {
      id: nextId,
      title: 'New item',
      subtitle: '',
      fig: `FIG. ${String(nextId).padStart(2, '0')}`,
      description: '',
      imageSeed: `new-item-${nextId}`
    };
  }

  if (section === 'reviews') {
    return {
      id: nextId,
      title: 'New review',
      subject: '',
      rating: 5,
      content: '',
      author: ''
    };
  }

  if (section === 'libraryItems') {
    return {
      id: nextId,
      title: 'New file',
      type: 'PDF',
      size: '0 MB',
      url: '',
      year: String(new Date().getFullYear())
    };
  }

  return buildArticleBlueprint('story', nextId);
}

async function duplicateVisualEntry() {
  try {
    setBusy(true);
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

    const nextId = getNextEntryId(data, section);
    const duplicate = deepClone(entries[entryIndex]);
    duplicate.id = nextId;
    if (typeof duplicate.title === 'string') {
      duplicate.title = `${duplicate.title} (копия)`;
    }

    entries.splice(entryIndex + 1, 0, duplicate);
    const syncedLangs = await syncMissingEntryLanguages(data, section, lang, duplicate);
    pendingVisualEntryId = nextId;
    setEditorData(data);
    const syncNote = syncedLangs.length ? ` Языки: ${syncedLangs.join(', ')}.` : '';
    setStatus('success', `Запись #${selectedId} дублирована в #${nextId}.${syncNote}`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
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

const TRANSLATION_TARGET_CODES = {
  EN: 'en',
  RU: 'ru',
  UA: 'uk',
  UK: 'uk',
  TR: 'tr',
  DE: 'de',
  IT: 'it',
  ES: 'es',
  FR: 'fr',
  PL: 'pl',
  PT: 'pt'
};

const translationCache = new Map();

function getTranslationTargetCode(lang) {
  return TRANSLATION_TARGET_CODES[String(lang || '').toUpperCase()] || String(lang || '').toLowerCase();
}

function isLikelyMediaOrUrl(value) {
  const text = String(value || '').trim();
  return (
    /^(https?:)?\/\//i.test(text) ||
    text.startsWith('/') ||
    text.startsWith('./') ||
    text.startsWith('../') ||
    text.startsWith('data:') ||
    /\.(avif|gif|jpe?g|png|svg|webp|mp3|mp4|wav)(\?.*)?$/i.test(text)
  );
}

function splitTextForTranslation(text, maxLength = 1700) {
  const source = String(text || '');
  if (source.length <= maxLength) {
    return [source];
  }

  const parts = source.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [source];
  const chunks = [];
  let current = '';

  for (const part of parts) {
    if ((current + part).length > maxLength && current) {
      chunks.push(current);
      current = '';
    }

    if (part.length > maxLength) {
      for (let i = 0; i < part.length; i += maxLength) {
        chunks.push(part.slice(i, i + maxLength));
      }
      continue;
    }

    current += part;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function readGoogleTranslatePayload(payload) {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return '';
  }

  return payload[0]
    .map((part) => (Array.isArray(part) ? part[0] : ''))
    .filter(Boolean)
    .join('');
}

async function translateText(value, targetLang, sourceLang = DEFAULT_LANGUAGE) {
  const text = String(value || '');
  if (!text.trim() || isLikelyMediaOrUrl(text)) {
    return text;
  }

  const sourceCode = getTranslationTargetCode(sourceLang);
  const targetCode = getTranslationTargetCode(targetLang);
  if (!targetCode || sourceCode === targetCode) {
    return text;
  }

  const cacheKey = `${sourceCode}:${targetCode}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const translatedParts = [];
  for (const chunk of splitTextForTranslation(text)) {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', sourceCode);
    url.searchParams.set('tl', targetCode);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', chunk);

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Сервис перевода ответил HTTP ${response.status}. Попробуйте позже.`);
    }

    const payload = await response.json();
    translatedParts.push(readGoogleTranslatePayload(payload) || chunk);
  }

  const translated = translatedParts.join('');
  translationCache.set(cacheKey, translated);
  return translated;
}

function getTranslationLanguages(data) {
  const fromTranslations = data?.translations && typeof data.translations === 'object'
    ? Object.keys(data.translations)
    : [];
  const fromCollections = data?.localizedCollections && typeof data.localizedCollections === 'object'
    ? Object.keys(data.localizedCollections)
    : [];
  return Array.from(new Set([DEFAULT_LANGUAGE, ...fromTranslations, ...fromCollections]))
    .filter((lang) => getTranslationTargetCode(lang))
    .sort((a, b) => (a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : a.localeCompare(b)));
}

async function translateStringArray(values, targetLang, sourceLang = DEFAULT_LANGUAGE) {
  if (!Array.isArray(values)) {
    return [];
  }

  const translated = [];
  for (const value of values) {
    translated.push(await translateText(value, targetLang, sourceLang));
  }
  return translated;
}

async function translateArticleBlock(block, targetLang, sourceLang = DEFAULT_LANGUAGE) {
  const next = deepClone(block || {});

  if (typeof next.caption === 'string') {
    next.caption = await translateText(next.caption, targetLang, sourceLang);
  }

  if (['text', 'quote', 'note', 'link', 'map'].includes(next.type) && typeof next.content === 'string') {
    next.content = await translateText(next.content, targetLang, sourceLang);
    return next;
  }

  if (next.type === 'checklist' && next.content && typeof next.content === 'object' && Array.isArray(next.content.items)) {
    next.content = {
      ...next.content,
      items: await translateStringArray(next.content.items, targetLang, sourceLang)
    };
    return next;
  }

  if (next.type === 'poll' && next.content && typeof next.content === 'object') {
    const options = Array.isArray(next.content.options) ? next.content.options : [];
    const translatedOptions = [];
    for (const option of options) {
      if (option && typeof option === 'object') {
        translatedOptions.push({
          ...option,
          label: await translateText(option.label || '', targetLang, sourceLang)
        });
      } else {
        translatedOptions.push(await translateText(option, targetLang, sourceLang));
      }
    }

    next.content = {
      ...next.content,
      question: await translateText(next.content.question || '', targetLang, sourceLang),
      options: translatedOptions
    };
  }

  return next;
}

async function translateArticleEntry(article, targetLang, sourceLang = DEFAULT_LANGUAGE) {
  const next = deepClone(article);

  next.title = await translateText(article.title, targetLang, sourceLang);
  next.role = article.role ? await translateText(article.role, targetLang, sourceLang) : article.role;
  next.date = article.date ? await translateText(article.date, targetLang, sourceLang) : article.date;
  next.excerpt = await translateText(article.excerpt, targetLang, sourceLang);
  next.category = await translateText(article.category, targetLang, sourceLang);
  next.subcategory = article.subcategory ? await translateText(article.subcategory, targetLang, sourceLang) : article.subcategory;
  next.tags = await translateStringArray(article.tags, targetLang, sourceLang);

  const blocks = Array.isArray(article.content) ? article.content : [];
  next.content = [];
  for (const block of blocks) {
    next.content.push(await translateArticleBlock(block, targetLang, sourceLang));
  }

  return next;
}

async function translateEntryForSection(section, entry, targetLang, sourceLang = DEFAULT_LANGUAGE) {
  if (section === 'articles') {
    return translateArticleEntry(entry, targetLang, sourceLang);
  }

  const next = deepClone(entry);
  if (section === 'items') {
    next.title = await translateText(entry.title, targetLang, sourceLang);
    next.subtitle = await translateText(entry.subtitle, targetLang, sourceLang);
    next.description = await translateText(entry.description, targetLang, sourceLang);
    return next;
  }

  if (section === 'reviews') {
    next.title = await translateText(entry.title, targetLang, sourceLang);
    next.subject = await translateText(entry.subject, targetLang, sourceLang);
    next.content = await translateText(entry.content, targetLang, sourceLang);
    return next;
  }

  if (section === 'libraryItems') {
    next.title = await translateText(entry.title, targetLang, sourceLang);
    next.type = await translateText(entry.type, targetLang, sourceLang);
    return next;
  }

  return next;
}

function getEntriesForLanguage(data, section, lang, createLocalized = false) {
  return getSectionArray(data, section, lang, createLocalized && lang !== DEFAULT_LANGUAGE);
}

function hasConcreteEntryForLanguage(data, section, lang, entryId) {
  const entries = lang === DEFAULT_LANGUAGE
    ? data[section]
    : data.localizedCollections?.[lang]?.[section];

  return Array.isArray(entries) && entries.some((item) => Number(item.id) === Number(entryId));
}

function upsertEntryForLanguage(data, section, lang, entry) {
  const targetEntries = getEntriesForLanguage(data, section, lang, true);
  const targetIndex = targetEntries.findIndex((item) => Number(item.id) === Number(entry.id));
  if (targetIndex >= 0) {
    targetEntries[targetIndex] = entry;
  } else {
    targetEntries.push(entry);
  }
}

async function syncMissingEntryLanguages(data, section, sourceLang, sourceEntry) {
  const createdLangs = [];
  const targetLangs = getTranslationLanguages(data).filter((lang) => lang !== sourceLang);

  for (const lang of targetLangs) {
    if (hasConcreteEntryForLanguage(data, section, lang, sourceEntry.id)) {
      continue;
    }

    const translated = await translateEntryForSection(section, sourceEntry, lang, sourceLang);
    upsertEntryForLanguage(data, section, lang, translated);
    createdLangs.push(lang);
  }

  return createdLangs;
}

function getConcreteEntryIds(data, section) {
  const ids = new Set();
  if (Array.isArray(data[section])) {
    data[section].forEach((entry) => ids.add(Number(entry.id)));
  }

  const localized = data.localizedCollections && typeof data.localizedCollections === 'object'
    ? data.localizedCollections
    : {};

  for (const collection of Object.values(localized)) {
    const entries = collection?.[section];
    if (!Array.isArray(entries)) continue;
    entries.forEach((entry) => ids.add(Number(entry.id)));
  }

  return Array.from(ids).filter(Number.isFinite);
}

async function ensureAllContentLanguages(data, preferredSourceLang = DEFAULT_LANGUAGE) {
  const sections = ['articles', 'items', 'reviews', 'libraryItems'];
  let created = 0;

  for (const section of sections) {
    for (const id of getConcreteEntryIds(data, section)) {
      const source = requireSourceEntry(data, section, preferredSourceLang, id);
      setStatus('info', `Проверяю языки: ${getSectionLabel(section)} #${id}...`);
      const createdLangs = await syncMissingEntryLanguages(data, section, source.lang, source.entry);
      created += createdLangs.length;
    }
  }

  return { created };
}

function findEntryInLanguage(data, section, lang, selectedId) {
  const sourceEntries = getEntriesForLanguage(data, section, lang, false);
  return sourceEntries.find((item) => Number(item.id) === Number(selectedId));
}

function getSourceEntriesForLanguage(data, section, preferredLang) {
  const baseEntries = getEntriesForLanguage(data, section, DEFAULT_LANGUAGE, false);
  if (preferredLang === DEFAULT_LANGUAGE) {
    return baseEntries.map((entry) => ({ entry, lang: DEFAULT_LANGUAGE }));
  }

  const preferredEntries = getEntriesForLanguage(data, section, preferredLang, false);
  const preferredById = new Map(preferredEntries.map((entry) => [Number(entry.id), entry]));
  const baseIds = new Set(baseEntries.map((entry) => Number(entry.id)));
  const merged = baseEntries.map((baseEntry) => {
    const preferredEntry = preferredById.get(Number(baseEntry.id));
    return preferredEntry
      ? { entry: preferredEntry, lang: preferredLang }
      : { entry: baseEntry, lang: DEFAULT_LANGUAGE };
  });

  for (const entry of preferredEntries) {
    if (!baseIds.has(Number(entry.id))) {
      merged.push({ entry, lang: preferredLang });
    }
  }

  return merged;
}

function requireSourceEntry(data, section, preferredSourceLang, selectedId) {
  const preferredEntry = findEntryInLanguage(data, section, preferredSourceLang, selectedId);
  if (preferredEntry) {
    return { entry: preferredEntry, lang: preferredSourceLang };
  }

  const defaultEntry = findEntryInLanguage(data, section, DEFAULT_LANGUAGE, selectedId);
  if (defaultEntry) {
    return { entry: defaultEntry, lang: DEFAULT_LANGUAGE };
  }

  for (const lang of getTranslationLanguages(data)) {
    const entry = findEntryInLanguage(data, section, lang, selectedId);
    if (entry) {
      return { entry, lang };
    }
  }

  throw new Error(`Не найдена запись #${selectedId} ни в одном языке.`);
}

async function translateSelectedEntryToAvailableLanguages() {
  const data = parseEditorJson();
  const section = visualSectionSelect.value;
  const preferredSourceLang = visualLangSelect.value || DEFAULT_LANGUAGE;
  const selectedId = Number(visualEntrySelect.value);
  const source = requireSourceEntry(data, section, preferredSourceLang, selectedId);
  const sourceLang = source.lang;
  const sourceEntry = source.entry;
  const targetLangs = getTranslationLanguages(data).filter((lang) => lang !== sourceLang);

  setBusy(true);
  setStatus('info', `Перевожу запись #${selectedId} из ${sourceLang}: ${targetLangs.join(', ')}...`);

  try {
    for (const lang of targetLangs) {
      const translated = await translateEntryForSection(section, sourceEntry, lang, sourceLang);
      upsertEntryForLanguage(data, section, lang, translated);
    }

    pendingVisualEntryId = selectedId;
    setEditorData(data);
    setStatus('success', `Запись #${selectedId} доступна на языках: ${getTranslationLanguages(data).join(', ')}. Проверьте и сохраните в GitHub.`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}

async function translateCurrentSectionToAvailableLanguages() {
  try {
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const preferredSourceLang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const sourceEntries = getSourceEntriesForLanguage(data, section, preferredSourceLang);
    const allLangs = getTranslationLanguages(data);

    if (!sourceEntries.length) {
      throw new Error(`В разделе «${getSectionLabel(section)}» нет записей для перевода.`);
    }

    if (allLangs.length < 2) {
      throw new Error('Недостаточно языков для перевода.');
    }

    const confirmed = await showConfirmModal(
      `Автоматически перевести раздел «${escapeHtml(getSectionLabel(section))}»?`,
      `Основной источник: <strong>${escapeHtml(preferredSourceLang)}</strong>. Если в нём нет записи, будет взята EN-версия. Раздел будет разложен по всем языкам: <strong>${escapeHtml(allLangs.join(', '))}</strong>. После машинного перевода лучше быстро вычитать тексты.`,
      'Перевести'
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    let done = 0;
    const total = sourceEntries.reduce((sum, item) => sum + allLangs.filter((lang) => lang !== item.lang).length, 0);

    for (const source of sourceEntries) {
      const entry = source.entry;
      const sourceLang = source.lang;
      const targetLangs = allLangs.filter((lang) => lang !== sourceLang);
      for (const lang of targetLangs) {
        done += 1;
        setStatus('info', `Автоперевод ${done}/${total}: ${getSectionLabel(section)} #${entry.id} ${sourceLang} → ${lang}`);
        const translated = await translateEntryForSection(section, entry, lang, sourceLang);
        upsertEntryForLanguage(data, section, lang, translated);
      }
    }

    setEditorData(data);
    setStatus('success', `Раздел «${getSectionLabel(section)}» переведен: ${sourceEntries.length} записей разложены по ${allLangs.length} языкам. Проверьте и сохраните в GitHub.`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
  }
}


// ===== IMPROVED BLOCK EDITOR FOR ARTICLES =====
const BLOCK_TYPES = [
  { type: 'text', label: 'Текст', icon: '\u270E' },
  { type: 'quote', label: 'Цитата', icon: '\u201C' },
  { type: 'note', label: 'Заметка', icon: '\u2139' },
  { type: 'image', label: 'Фото', icon: '\uD83D\uDDBC' },
  { type: 'gallery', label: 'Галерея', icon: '\uD83D\uDDBC\uD83D\uDDBC' },
  { type: 'audio', label: 'Аудио', icon: '\u266B' },
  { type: 'link', label: 'Ссылка', icon: '\uD83D\uDD17' },
  { type: 'checklist', label: 'Чеклист', icon: '\u2611' },
  { type: 'map', label: 'Карта', icon: '\uD83D\uDCCD' },
  { type: 'poll', label: 'Опрос', icon: '\uD83D\uDCCA' }
];

let blockCollapseStates = {};

function getBlockTypeLabel(type) {
  const found = BLOCK_TYPES.find((bt) => bt.type === type);
  return found ? found.label : type;
}

function getBlockTypeIcon(type) {
  const found = BLOCK_TYPES.find((bt) => bt.type === type);
  return found ? found.icon : '\u25A0';
}

function getBlockContentPreview(block) {
  const t = block.type || 'text';
  const c = block.content || '';
  if (t === 'text' || t === 'quote' || t === 'note') {
    const text = typeof c === 'string' ? c : '';
    return text.substring(0, 60) + (text.length > 60 ? '...' : '');
  }
  if (t === 'image') return typeof c === 'string' ? (c.substring(0, 40) || 'пусто') : 'пусто';
  if (t === 'gallery') return Array.isArray(c) ? c.length + ' фото' : '0 фото';
  if (t === 'audio') return typeof c === 'string' ? (c.substring(0, 40) || 'пусто') : 'пусто';
  if (t === 'link') return typeof c === 'string' ? (c || 'пусто') : 'пусто';
  if (t === 'checklist') return (c && c.items) ? c.items.length + ' пунктов' : '0 пунктов';
  if (t === 'map') return typeof c === 'string' ? (c || 'место') : 'место';
  if (t === 'poll') return (c && c.question) ? c.question.substring(0, 40) : 'опрос';
  return '';
}

function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countChars(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.length;
}

function resolveBlockImageUrl(src) {
  if (!src || typeof src !== 'string') return '';
  const s = src.trim();
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('/') || s.startsWith('./') || s.startsWith('data:')) return s;
  return 'https://picsum.photos/seed/' + encodeURIComponent(s) + '/400/250?grayscale';
}

function renderBlockBody(block, index) {
  const t = block.type || 'text';
  const c = block.content || '';

  if (t === 'text' || t === 'quote' || t === 'note') {
    const textVal = typeof c === 'string' ? c : '';
    const words = countWords(textVal);
    const chars = countChars(textVal);
    let toolbar = '';
    if (t === 'text') {
      toolbar = `<div class="block-toolbar">
        <button type="button" class="block-toolbar-btn" onclick="wrapSelection(${index}, '**', '**')" title="Жирный"><b>B</b></button>
        <button type="button" class="block-toolbar-btn" onclick="wrapSelection(${index}, '*', '*')" title="Курсив"><i>I</i></button>
        <button type="button" class="block-toolbar-btn" onclick="wrapSelection(${index}, '~~', '~~')" title="Зачёркнутый"><s>S</s></button>
        <span class="block-toolbar-sep"></span>
        <button type="button" class="block-toolbar-btn" onclick="wrapSelection(${index}, '[', '](url)')" title="Ссылка" style="font-family:var(--font-mono);font-size:.6rem">🔗</button>
      </div>`;
    }
    return toolbar + `<textarea data-block-field="content" data-block-index="${index}" class="auto-expand" placeholder="Введите текст...">${escapeHtml(textVal)}</textarea>
    <div class="block-word-count" style="text-align:right;padding:0 4px;">${words} слов · ${chars} символов</div>`;
  }

  if (t === 'image') {
    const src = typeof c === 'string' ? c : '';
    const cap = block.caption || '';
    const previewUrl = resolveBlockImageUrl(src);
    return `
      <div><span class="block-field-label">Источник (URL или seed)</span>
      <input data-block-field="content" data-block-index="${index}" value="${escapeHtml(src)}" placeholder="URL или imageSeed" oninput="refreshBlockImagePreview(${index})" /></div>
      <div class="block-image-preview" id="block-img-preview-${index}">
        ${previewUrl ? '<img src="' + escapeHtml(previewUrl) + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'" />' : '<div class="block-image-preview-empty">Нет превью</div>'}
      </div>
      <div><span class="block-field-label">Подпись</span>
      <input data-block-field="caption" value="${escapeHtml(cap)}" placeholder="Подпись к фото" /></div>`;
  }

  if (t === 'gallery') {
    const items = Array.isArray(c) ? c : [];
    const cap = block.caption || '';
    let html = '<span class="block-field-label">Элементы галереи (URL или seed)</span><div class="block-gallery-items" data-block-gallery="' + index + '">';
    items.forEach((item, gi) => {
      html += '<div class="block-gallery-item"><input data-gallery-item="' + gi + '" value="' + escapeHtml(item) + '" placeholder="URL или seed" /><button type="button" class="block-action-btn danger" onclick="removeGalleryItem(' + index + ', ' + gi + ')" title="Удалить">\u2716</button></div>';
    });
    html += '</div><button type="button" class="add-block-btn" onclick="addGalleryItem(' + index + ')">+ элемент</button>';
    // Gallery preview
    const previews = items.filter(Boolean).map(item => resolveBlockImageUrl(item)).filter(Boolean);
    if (previews.length) {
      html += '<div class="block-gallery-preview">';
      previews.forEach(url => {
        html += '<img src="' + escapeHtml(url) + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'" />';
      });
      html += '</div>';
    }
    html += '<div><span class="block-field-label">Подпись</span><input data-block-field="caption" value="' + escapeHtml(cap) + '" placeholder="Подпись к галерее" /></div>';
    return html;
  }

  if (t === 'audio') {
    const src = typeof c === 'string' ? c : '';
    const cap = block.caption || '';
    return `
      <div><span class="block-field-label">URL аудио</span>
      <input data-block-field="content" value="${escapeHtml(src)}" placeholder="https://..." /></div>
      <div><span class="block-field-label">Подпись</span>
      <input data-block-field="caption" value="${escapeHtml(cap)}" placeholder="Описание аудио" /></div>`;
  }

  if (t === 'link') {
    const text = typeof c === 'string' ? c : '';
    const url = block.url || '';
    return `
      <div><span class="block-field-label">Текст ссылки</span>
      <input data-block-field="content" value="${escapeHtml(text)}" placeholder="Текст" /></div>
      <div><span class="block-field-label">URL</span>
      <input data-block-field="url" value="${escapeHtml(url)}" placeholder="https://..." /></div>`;
  }

  if (t === 'checklist') {
    const items = (c && c.items) ? c.items : [];
    const cap = block.caption || '';
    let html = '<span class="block-field-label">Элементы чеклиста</span><div class="block-checklist-items" data-block-checklist="' + index + '">';
    items.forEach((item, ci) => {
      html += '<div class="block-checklist-item"><input data-checklist-item="' + ci + '" value="' + escapeHtml(item) + '" placeholder="Пункт..." /><button type="button" class="block-action-btn danger" onclick="removeChecklistItem(' + index + ', ' + ci + ')" title="Удалить">\u2716</button></div>';
    });
    html += '</div><button type="button" class="add-block-btn" onclick="addChecklistItem(' + index + ')">+ пункт</button>';
    html += '<div><span class="block-field-label">Заголовок</span><input data-block-field="caption" value="' + escapeHtml(cap) + '" placeholder="Заголовок чеклиста" /></div>';
    return html;
  }

  if (t === 'map') {
    const place = typeof c === 'string' ? c : '';
    const lat = (block.coordinates && block.coordinates.lat) || '';
    const lng = (block.coordinates && block.coordinates.lng) || '';
    return `
      <div><span class="block-field-label">Место</span>
      <input data-block-field="content" value="${escapeHtml(place)}" placeholder="Название места" /></div>
      <div class="block-field-row">
        <div><span class="block-field-label">Широта (lat)</span><input data-block-field="lat" type="number" step="any" value="${escapeHtml(String(lat))}" /></div>
        <div><span class="block-field-label">Долгота (lng)</span><input data-block-field="lng" type="number" step="any" value="${escapeHtml(String(lng))}" /></div>
      </div>`;
  }

  if (t === 'poll') {
    const question = (c && c.question) ? c.question : '';
    const options = (c && c.options) ? c.options : [];
    let html = '<div><span class="block-field-label">Вопрос</span><input data-block-field="poll-question" value="' + escapeHtml(question) + '" placeholder="Вопрос опроса" /></div>';
    html += '<span class="block-field-label">Варианты</span><div class="block-poll-options" data-block-poll="' + index + '">';
    options.forEach((opt, oi) => {
      html += '<div class="block-poll-option"><input data-poll-label="' + oi + '" value="' + escapeHtml(opt.label || '') + '" placeholder="Вариант" /><input data-poll-votes="' + oi + '" type="number" min="0" value="' + (opt.votes || 0) + '" placeholder="Голоса" /><button type="button" class="block-action-btn danger" onclick="removePollOption(' + index + ', ' + oi + ')" title="Удалить">\u2716</button></div>';
    });
    html += '</div><button type="button" class="add-block-btn" onclick="addPollOption(' + index + ')">+ вариант</button>';
    return html;
  }

  // Fallback: raw JSON
  const raw = typeof c === 'object' ? JSON.stringify(c, null, 2) : String(c);
  return '<textarea data-block-field="content-raw">' + escapeHtml(raw) + '</textarea>';
}

function renderBlockEditor(blocks) {
  if (!Array.isArray(blocks)) blocks = [];
  let html = '';

  // Stats bar
  let totalWords = 0;
  let totalChars = 0;
  blocks.forEach(b => {
    if ((b.type === 'text' || b.type === 'quote' || b.type === 'note') && typeof b.content === 'string') {
      totalWords += countWords(b.content);
      totalChars += countChars(b.content);
    }
  });

  if (blocks.length > 0) {
    html += '<div class="block-collapse-all-row">';
    html += '<button type="button" class="block-collapse-all-btn" onclick="collapseAllBlocks()">Свернуть все</button>';
    html += '<button type="button" class="block-collapse-all-btn" onclick="expandAllBlocks()">Развернуть все</button>';
    html += '</div>';
  }

  blocks.forEach((block, i) => {
    const t = block.type || 'text';
    const isCollapsed = blockCollapseStates[i] === true;
    const preview = getBlockContentPreview(block);

    // Insert-between button before each block
    html += '<div class="block-insert-between"><button type="button" class="block-insert-btn" onclick="showInsertMenu(' + i + ', this)" title="Вставить блок">+ вставить</button></div>';

    html += '<div class="block-card' + (isCollapsed ? ' collapsed' : '') + '" data-block-index="' + i + '" data-block-type="' + t + '" draggable="true">';
    html += '<div class="block-card-header">';
    html += '<span class="block-drag-handle" title="Перетащить">\u2630</span>';
    html += '<span class="block-type-badge type-' + t + '">' + getBlockTypeIcon(t) + ' ' + escapeHtml(getBlockTypeLabel(t)) + '</span>';
    html += '<span style="font-size:.6rem;color:var(--text-muted);opacity:.5;">#' + (i + 1) + '</span>';
    if (preview && isCollapsed) {
      html += '<span class="block-content-preview">' + escapeHtml(preview) + '</span>';
    }
    if ((t === 'text' || t === 'quote' || t === 'note') && typeof block.content === 'string') {
      const w = countWords(block.content);
      if (w > 0) html += '<span class="block-word-count">' + w + ' сл.</span>';
    }
    html += '<div class="block-actions">';
    html += '<button type="button" class="block-action-btn collapse-btn" onclick="toggleBlockCollapse(' + i + ')" title="' + (isCollapsed ? 'Развернуть' : 'Свернуть') + '">' + (isCollapsed ? '\u25BC' : '\u25B2') + '</button>';
    html += '<button type="button" class="block-action-btn" onclick="duplicateBlock(' + i + ')" title="Дублировать">\u2398</button>';
    html += '<button type="button" class="block-action-btn" onclick="moveBlock(' + i + ', -1)" title="Вверх" ' + (i === 0 ? 'disabled' : '') + '>\u2191</button>';
    html += '<button type="button" class="block-action-btn" onclick="moveBlock(' + i + ', 1)" title="Вниз" ' + (i === blocks.length - 1 ? 'disabled' : '') + '>\u2193</button>';
    html += '<button type="button" class="block-action-btn danger" onclick="removeBlock(' + i + ')" title="Удалить блок">\u2716</button>';
    html += '</div>';
    html += '</div>';
    html += '<div class="block-card-body">' + renderBlockBody(block, i) + '</div>';
    html += '</div>';
  });

  // Add block row at end
  html += '<div class="add-block-row">';
  BLOCK_TYPES.forEach((bt) => {
    html += '<button type="button" class="add-block-btn" onclick="addBlock(\'' + bt.type + '\')">' + bt.icon + ' ' + escapeHtml(bt.label) + '</button>';
  });
  html += '</div>';

  // Stats bar
  if (blocks.length > 0) {
    html += '<div class="block-stats-bar">';
    html += '<span>\u2630 ' + blocks.length + ' блоков</span>';
    html += '<span>\u270E ' + totalWords + ' слов</span>';
    html += '<span>\u2328 ' + totalChars + ' символов</span>';
    html += '</div>';
  }

  return html;
}

function bindBlockEditorEvents() {
  const editorEl = document.getElementById('vf-block-editor');
  if (!editorEl) return;

  // Auto-expand textareas
  editorEl.querySelectorAll('textarea.auto-expand').forEach(ta => {
    autoExpandTextarea(ta);
    ta.addEventListener('input', () => {
      autoExpandTextarea(ta);
      updateBlockWordCount(ta);
    });
  });

  // Drag & drop
  const cards = editorEl.querySelectorAll('.block-card[draggable]');
  cards.forEach(card => {
    card.addEventListener('dragstart', handleBlockDragStart);
    card.addEventListener('dragend', handleBlockDragEnd);
    card.addEventListener('dragover', handleBlockDragOver);
    card.addEventListener('dragenter', handleBlockDragEnter);
    card.addEventListener('dragleave', handleBlockDragLeave);
    card.addEventListener('drop', handleBlockDrop);
  });

  queueMicrotask(() => {
    try {
      refreshCreatorQualityFromForm();
    } catch {}
  });
}

function autoExpandTextarea(ta) {
  ta.style.height = 'auto';
  ta.style.height = Math.max(80, ta.scrollHeight) + 'px';
}

function updateBlockWordCount(ta) {
  const countEl = ta.parentElement.querySelector('.block-word-count');
  if (countEl) {
    const words = countWords(ta.value);
    const chars = countChars(ta.value);
    countEl.textContent = words + ' слов \u00B7 ' + chars + ' символов';
  }
}

// ===== DRAG & DROP =====
let dragSrcIndex = null;

function handleBlockDragStart(e) {
  dragSrcIndex = Number(this.dataset.blockIndex);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragSrcIndex));
}

function handleBlockDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.block-card.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleBlockDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleBlockDragEnter(e) {
  e.preventDefault();
  const card = e.target.closest('.block-card');
  if (card && Number(card.dataset.blockIndex) !== dragSrcIndex) {
    card.classList.add('drag-over');
  }
}

function handleBlockDragLeave(e) {
  const card = e.target.closest('.block-card');
  if (card) {
    const rect = card.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      card.classList.remove('drag-over');
    }
  }
}

function handleBlockDrop(e) {
  e.preventDefault();
  const card = e.target.closest('.block-card');
  if (!card) return;
  const targetIndex = Number(card.dataset.blockIndex);
  if (targetIndex === dragSrcIndex || dragSrcIndex === null) return;

  const blocks = collectBlockEditorContent();
  const moved = blocks.splice(dragSrcIndex, 1)[0];
  blocks.splice(targetIndex, 0, moved);

  // Shift collapse states
  const newStates = {};
  blocks.forEach((_, i) => { newStates[i] = false; });
  blockCollapseStates = newStates;

  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
  dragSrcIndex = null;
}

// ===== TEXT FORMATTING =====
window.wrapSelection = function(blockIndex, before, after) {
  const ta = document.querySelector('[data-block-field="content"][data-block-index="' + blockIndex + '"]');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = ta.value;
  const selected = text.substring(start, end) || 'текст';
  ta.value = text.substring(0, start) + before + selected + after + text.substring(end);
  ta.focus();
  ta.setSelectionRange(start + before.length, start + before.length + selected.length);
  autoExpandTextarea(ta);
  updateBlockWordCount(ta);
};

// ===== BLOCK COLLAPSE =====
window.toggleBlockCollapse = function(index) {
  blockCollapseStates[index] = !blockCollapseStates[index];
  const blocks = collectBlockEditorContent();
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
};

window.collapseAllBlocks = function() {
  const blocks = collectBlockEditorContent();
  blocks.forEach((_, i) => { blockCollapseStates[i] = true; });
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
};

window.expandAllBlocks = function() {
  blockCollapseStates = {};
  const blocks = collectBlockEditorContent();
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
};

// ===== IMAGE PREVIEW =====
window.refreshBlockImagePreview = function(index) {
  const input = document.querySelector('[data-block-field="content"][data-block-index="' + index + '"]');
  const preview = document.getElementById('block-img-preview-' + index);
  if (!input || !preview) return;
  const url = resolveBlockImageUrl(input.value);
  if (url) {
    preview.innerHTML = '<img src="' + escapeHtml(url) + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'" />';
  } else {
    preview.innerHTML = '<div class="block-image-preview-empty">Нет превью</div>';
  }
};

// ===== INSERT BLOCK BETWEEN =====
window.showInsertMenu = function(beforeIndex, triggerEl) {
  const existingOverlay = document.querySelector('.block-insert-overlay');
  const existingPopup = document.querySelector('.block-insert-popup');
  if (existingOverlay) existingOverlay.remove();
  if (existingPopup) existingPopup.remove();

  const overlay = document.createElement('div');
  overlay.className = 'block-insert-overlay';
  document.body.appendChild(overlay);

  const popup = document.createElement('div');
  popup.className = 'block-insert-popup';
  popup.innerHTML = BLOCK_TYPES.map(bt =>
    `<button class="block-insert-popup-btn" type="button" data-type="${bt.type}"><span class="popup-icon">${bt.icon}</span>${escapeHtml(bt.label)}</button>`
  ).join('');
  document.body.appendChild(popup);

  if (triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    popup.style.top = (rect.bottom + 4) + 'px';
    popup.style.left = Math.max(8, rect.left) + 'px';
  } else {
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
  }

  const closePopup = () => { overlay.remove(); popup.remove(); };
  overlay.addEventListener('click', closePopup);

  popup.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    closePopup();
    const type = btn.dataset.type;
    const blocks = collectBlockEditorContent();
    const newBlock = { type, content: '' };
    if (type === 'gallery') newBlock.content = [];
    if (type === 'checklist') newBlock.content = { items: [''] };
    if (type === 'poll') newBlock.content = { question: '', options: [{ label: '', votes: 0 }] };
    if (type === 'map') { newBlock.content = ''; newBlock.coordinates = { lat: 0, lng: 0 }; }

    blocks.splice(beforeIndex, 0, newBlock);
    const newStates = {};
    Object.keys(blockCollapseStates).forEach(k => {
      const ki = Number(k);
      if (ki >= beforeIndex) newStates[ki + 1] = blockCollapseStates[ki];
      else newStates[ki] = blockCollapseStates[ki];
    });
    blockCollapseStates = newStates;

    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) {
      editorEl.innerHTML = renderBlockEditor(blocks);
      bindBlockEditorEvents();
    }
  });
};

// ===== BLOCK DUPLICATION =====
window.duplicateBlock = function(index) {
  const blocks = collectBlockEditorContent();
  if (index < 0 || index >= blocks.length) return;
  const clone = JSON.parse(JSON.stringify(blocks[index]));
  blocks.splice(index + 1, 0, clone);
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
};

function getCurrentArticleBlocks() {
  const editorEl = document.getElementById('vf-block-editor');
  if (!editorEl) return [];
  return collectBlockEditorContent();
}

function collectBlockEditorContent() {
  const editorEl = document.getElementById('vf-block-editor');
  if (!editorEl) return [];

  const blockCards = editorEl.querySelectorAll('.block-card');
  const blocks = [];

  blockCards.forEach((card) => {
    const body = card.querySelector('.block-card-body');
    if (!body) return;

    const blockType = card.dataset.blockType || detectBlockType(body);
    const block = buildBlockFromDom(blockType, body);
    if (block) blocks.push(block);
  });

  return blocks;
}

function detectBlockType(body) {
  const card = body.closest('.block-card');
  if (card && card.dataset.blockType) return card.dataset.blockType;

  if (body.querySelector('[data-block-field="poll-question"]')) return 'poll';
  if (body.querySelector('[data-block-checklist]')) return 'checklist';
  if (body.querySelector('[data-block-gallery]')) return 'gallery';
  if (body.querySelector('[data-block-field="url"]')) return 'link';
  if (body.querySelector('[data-block-field="lat"]')) return 'map';
  if (body.querySelector('[data-block-field="content-raw"]')) return 'raw';

  const contentField = body.querySelector('[data-block-field="content"]');
  const captionField = body.querySelector('[data-block-field="caption"]');

  if (contentField && contentField.tagName === 'TEXTAREA' && !captionField) {
    const badge = body.closest('.block-card').querySelector('.block-type-badge');
    const badgeText = badge ? badge.textContent.trim().toLowerCase() : '';
    if (badgeText.includes('цитата')) return 'quote';
    if (badgeText.includes('заметка')) return 'note';
    return 'text';
  }

  if (contentField && contentField.tagName === 'INPUT' && captionField) {
    const badge = body.closest('.block-card').querySelector('.block-type-badge');
    const badgeText = badge ? badge.textContent.trim().toLowerCase() : '';
    if (badgeText.includes('аудио')) return 'audio';
    return 'image';
  }

  return 'text';
}

function buildBlockFromDom(type, body) {
  if (type === 'text' || type === 'quote' || type === 'note') {
    const ta = body.querySelector('[data-block-field="content"]');
    return { type, content: ta ? ta.value : '' };
  }

  if (type === 'image') {
    const src = body.querySelector('[data-block-field="content"]');
    const cap = body.querySelector('[data-block-field="caption"]');
    const block = { type: 'image', content: src ? src.value.trim() : '' };
    if (cap && cap.value.trim()) block.caption = cap.value.trim();
    return block;
  }

  if (type === 'gallery') {
    const items = [];
    body.querySelectorAll('[data-gallery-item]').forEach((inp) => {
      if (inp.value.trim()) items.push(inp.value.trim());
    });
    const cap = body.querySelector('[data-block-field="caption"]');
    const block = { type: 'gallery', content: items };
    if (cap && cap.value.trim()) block.caption = cap.value.trim();
    return block;
  }

  if (type === 'audio') {
    const src = body.querySelector('[data-block-field="content"]');
    const cap = body.querySelector('[data-block-field="caption"]');
    const block = { type: 'audio', content: src ? src.value.trim() : '' };
    if (cap && cap.value.trim()) block.caption = cap.value.trim();
    return block;
  }

  if (type === 'link') {
    const text = body.querySelector('[data-block-field="content"]');
    const url = body.querySelector('[data-block-field="url"]');
    return { type: 'link', content: text ? text.value.trim() : '', url: url ? url.value.trim() : '' };
  }

  if (type === 'checklist') {
    const items = [];
    body.querySelectorAll('[data-checklist-item]').forEach((inp) => {
      if (inp.value.trim()) items.push(inp.value.trim());
    });
    const cap = body.querySelector('[data-block-field="caption"]');
    const block = { type: 'checklist', content: { items } };
    if (cap && cap.value.trim()) block.caption = cap.value.trim();
    return block;
  }

  if (type === 'map') {
    const place = body.querySelector('[data-block-field="content"]');
    const lat = body.querySelector('[data-block-field="lat"]');
    const lng = body.querySelector('[data-block-field="lng"]');
    const block = { type: 'map', content: place ? place.value.trim() : '' };
    const latVal = lat ? parseFloat(lat.value) : NaN;
    const lngVal = lng ? parseFloat(lng.value) : NaN;
    if (!Number.isNaN(latVal) && !Number.isNaN(lngVal)) {
      block.coordinates = { lat: latVal, lng: lngVal };
    }
    return block;
  }

  if (type === 'poll') {
    const q = body.querySelector('[data-block-field="poll-question"]');
    const options = [];
    body.querySelectorAll('[data-poll-label]').forEach((inp, oi) => {
      const votesInp = body.querySelector('[data-poll-votes="' + oi + '"]');
      options.push({
        label: inp.value.trim(),
        votes: votesInp ? parseInt(votesInp.value, 10) || 0 : 0
      });
    });
    return { type: 'poll', content: { question: q ? q.value.trim() : '', options } };
  }

  // raw fallback
  const raw = body.querySelector('[data-block-field="content-raw"]');
  if (raw) {
    try {
      return { type: 'text', content: JSON.parse(raw.value) };
    } catch (e) {
      return { type: 'text', content: raw.value };
    }
  }

  return { type: 'text', content: '' };
}

// Global block manipulation functions (called from onclick)
window.moveBlock = function(index, direction) {
  const blocks = collectBlockEditorContent();
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= blocks.length) return;
  const temp = blocks[index];
  blocks[index] = blocks[newIndex];
  blocks[newIndex] = temp;
  // Swap collapse states
  const s1 = blockCollapseStates[index];
  const s2 = blockCollapseStates[newIndex];
  blockCollapseStates[index] = s2;
  blockCollapseStates[newIndex] = s1;
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
};

window.removeBlock = function(index) {
  if (!confirm('Удалить блок #' + (index + 1) + '?')) return;
  const blocks = collectBlockEditorContent();
  blocks.splice(index, 1);
  // Shift collapse states
  const newStates = {};
  blocks.forEach((_, i) => { newStates[i] = blockCollapseStates[i >= index ? i + 1 : i] || false; });
  blockCollapseStates = newStates;
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
  }
};

window.addBlock = function(type) {
  const blocks = collectBlockEditorContent();
  const newBlock = { type, content: '' };
  if (type === 'gallery') newBlock.content = [];
  if (type === 'checklist') newBlock.content = { items: [''] };
  if (type === 'poll') newBlock.content = { question: '', options: [{ label: '', votes: 0 }] };
  if (type === 'map') { newBlock.content = ''; newBlock.coordinates = { lat: 0, lng: 0 }; }
  blocks.push(newBlock);
  const editorEl = document.getElementById('vf-block-editor');
  if (editorEl) {
    editorEl.innerHTML = renderBlockEditor(blocks);
    bindBlockEditorEvents();
    // Scroll to new block
    const lastCard = editorEl.querySelector('.block-card:last-of-type');
    if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

window.addGalleryItem = function(blockIndex) {
  const blocks = collectBlockEditorContent();
  if (blocks[blockIndex] && blocks[blockIndex].type === 'gallery') {
    if (!Array.isArray(blocks[blockIndex].content)) blocks[blockIndex].content = [];
    blocks[blockIndex].content.push('');
    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) { editorEl.innerHTML = renderBlockEditor(blocks); bindBlockEditorEvents(); }
  }
};

window.removeGalleryItem = function(blockIndex, itemIndex) {
  const blocks = collectBlockEditorContent();
  if (blocks[blockIndex] && Array.isArray(blocks[blockIndex].content)) {
    blocks[blockIndex].content.splice(itemIndex, 1);
    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) { editorEl.innerHTML = renderBlockEditor(blocks); bindBlockEditorEvents(); }
  }
};

window.addChecklistItem = function(blockIndex) {
  const blocks = collectBlockEditorContent();
  if (blocks[blockIndex] && blocks[blockIndex].type === 'checklist') {
    if (!blocks[blockIndex].content || !blocks[blockIndex].content.items) blocks[blockIndex].content = { items: [] };
    blocks[blockIndex].content.items.push('');
    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) { editorEl.innerHTML = renderBlockEditor(blocks); bindBlockEditorEvents(); }
  }
};

window.removeChecklistItem = function(blockIndex, itemIndex) {
  const blocks = collectBlockEditorContent();
  if (blocks[blockIndex] && blocks[blockIndex].content && blocks[blockIndex].content.items) {
    blocks[blockIndex].content.items.splice(itemIndex, 1);
    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) { editorEl.innerHTML = renderBlockEditor(blocks); bindBlockEditorEvents(); }
  }
};

window.addPollOption = function(blockIndex) {
  const blocks = collectBlockEditorContent();
  if (blocks[blockIndex] && blocks[blockIndex].type === 'poll') {
    if (!blocks[blockIndex].content || !blocks[blockIndex].content.options) blocks[blockIndex].content = { question: '', options: [] };
    blocks[blockIndex].content.options.push({ label: '', votes: 0 });
    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) { editorEl.innerHTML = renderBlockEditor(blocks); bindBlockEditorEvents(); }
  }
};

window.removePollOption = function(blockIndex, optionIndex) {
  const blocks = collectBlockEditorContent();
  if (blocks[blockIndex] && blocks[blockIndex].content && blocks[blockIndex].content.options) {
    blocks[blockIndex].content.options.splice(optionIndex, 1);
    const editorEl = document.getElementById('vf-block-editor');
    if (editorEl) { editorEl.innerHTML = renderBlockEditor(blocks); bindBlockEditorEvents(); }
  }
};

async function addVisualEntry() {
  try {
    setBusy(true);
    const data = parseEditorJson();
    const section = visualSectionSelect.value;
    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const entries = getSectionArray(data, section, lang, lang !== DEFAULT_LANGUAGE);
    const nextId = getNextEntryId(data, section);
    let entry = createDefaultEntry(section, nextId);

    if (lang !== DEFAULT_LANGUAGE) {
      setStatus('info', `Готовлю новую запись на ${lang}...`);
      entry = await translateEntryForSection(section, entry, lang, DEFAULT_LANGUAGE);
    }

    entries.push(entry);
    setStatus('info', `Создаю языковые версии записи #${nextId}...`);
    const syncedLangs = await syncMissingEntryLanguages(data, section, lang, entry);

    pendingVisualEntryId = nextId;
    setEditorData(data);
    const syncNote = syncedLangs.length ? ` Языки: ${syncedLangs.join(', ')}.` : '';
    setStatus('success', `Добавлена новая запись #${nextId} (${getSectionLabel(section)} / ${lang}).${syncNote}`);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  } finally {
    setBusy(false);
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

/* ── Poll Results Section ── */
const pollResultsGrid = byId('pollResultsGrid');
const pollRefreshBtn = byId('pollRefreshBtn');
const pollTimestamp = byId('pollTimestamp');

function getPollStorageKeyForArticle(articleId, blockIndex) {
  return `epris-poll-v2-article-${articleId}-block-${blockIndex}`;
}

const POLL_COUNTER_NAMESPACE = 'eprisj-github-io';
const POLL_COUNTER_BASE_URL = 'https://api.counterapi.dev/v1';

function getPollCounterName(pollKey, optionIndex) {
  return `${pollKey}-option-${optionIndex}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function readPollCounter(pollKey, optionIndex) {
  const name = getPollCounterName(pollKey, optionIndex);
  const response = await fetch(`${POLL_COUNTER_BASE_URL}/${POLL_COUNTER_NAMESPACE}/${encodeURIComponent(name)}/`, {
    cache: 'no-store'
  });

  if (response.status === 400 || response.status === 404) {
    return 0;
  }

  if (!response.ok) {
    throw new Error(`Poll counter read failed: ${response.status}`);
  }

  const payload = await response.json();
  return Number(payload.count) || 0;
}

async function readPollCounters(poll) {
  const counts = await Promise.all(poll.options.map((_, index) => readPollCounter(poll.pollKey, index)));
  return poll.options.map((option, index) => ({
    ...option,
    onlineVotes: counts[index] || 0
  }));
}

function collectPollsFromContent() {
  const polls = [];
  try {
    const data = parseEditorJson();
    const localized = data.localizedCollections && typeof data.localizedCollections === 'object'
      ? data.localizedCollections
      : {};
    const languagesByArticleId = new Map();

    for (const [lang, collection] of Object.entries(localized)) {
      if (!collection || !Array.isArray(collection.articles)) continue;
      for (const article of collection.articles) {
        const id = Number(article?.id);
        if (!Number.isFinite(id)) continue;
        const list = languagesByArticleId.get(id) || [];
        list.push(lang);
        languagesByArticleId.set(id, list);
      }
    }

    for (const article of data.articles || []) {
      if (!Array.isArray(article.content)) continue;
      article.content.forEach((block, blockIndex) => {
        if (block.type !== 'poll' || !block.content) return;
          const pollData = block.content;
          const storageKey = getPollStorageKeyForArticle(article.id, blockIndex);
          let savedVotes = null;
          try {
            const saved = localStorage.getItem(storageKey);
            if (saved) savedVotes = JSON.parse(saved);
          } catch {}
          const options = pollData.options || [];
          polls.push({
            question: pollData.question || '(без вопроса)',
            options: options.map((opt, i) => ({
              label: opt.label || opt,
              baseVotes: opt.votes || 0,
              localVotes: savedVotes && typeof savedVotes.votedIndex === 'number' && savedVotes.votedIndex === i ? 1 : 0,
              onlineVotes: 0
            })),
            articleTitle: article.title || `#${article.id}`,
            articleId: article.id,
            blockIndex,
            localizedLanguages: languagesByArticleId.get(Number(article.id)) || [],
            pollKey: `article-${article.id}-block-${blockIndex}`,
            storageKey,
            lastVoteTime: savedVotes ? savedVotes.timestamp : null
          });
      });
    }
  } catch {}
  return polls;
}

async function renderPollResults() {
  if (!pollResultsGrid) return;
  const polls = collectPollsFromContent();

  if (!polls.length) {
    pollResultsGrid.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:32px 0;">Опросы не найдены. Загрузите контент из GitHub.</p>';
    return;
  }

  pollResultsGrid.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:32px 0;">Загружаю онлайн-голоса...</p>';

  let html = '';
  for (const poll of polls) {
    let optionsWithOnlineVotes = poll.options;
    let onlineError = '';
    try {
      optionsWithOnlineVotes = await readPollCounters(poll);
    } catch (error) {
      onlineError = getErrorMessage(error);
    }

    const jsonTotalVotes = poll.options.reduce((s, o) => s + o.baseVotes, 0);
    const onlineTotalVotes = optionsWithOnlineVotes.reduce((s, o) => s + o.onlineVotes, 0);
    const browserTotalVotes = poll.options.reduce((s, o) => s + o.localVotes, 0);
    const combinedTotalVotes = optionsWithOnlineVotes.reduce((s, o) => s + o.baseVotes + o.onlineVotes, 0);
    html += `<div class="monitor-card" style="margin-bottom:16px;">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">`;
    html += `<div>`;
    html += `<h3 style="font-size:14px;font-weight:600;margin:0 0 4px;">${escapeHtml(poll.question)}</h3>`;
    html += `<p style="font-size:12px;color:#94a3b8;margin:0;">Статья: ${escapeHtml(poll.articleTitle)} · блок #${poll.blockIndex + 1}</p>`;
    if (poll.localizedLanguages.length) {
      html += `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">Переводы статьи: ${escapeHtml(poll.localizedLanguages.join(', '))}</p>`;
    }
    html += `</div>`;
    html += `<span style="font-size:12px;color:#64748b;white-space:nowrap;margin-left:12px;">Всего: ${combinedTotalVotes}</span>`;
    html += `</div>`;
    html += `<p style="font-size:11px;color:#64748b;margin:0 0 10px;">JSON: ${jsonTotalVotes} · Онлайн: ${onlineTotalVotes} · Этот браузер: ${browserTotalVotes}</p>`;
    if (onlineError) {
      html += `<p style="font-size:11px;color:#b45309;margin:0 0 10px;">Онлайн-счётчик временно недоступен: ${escapeHtml(onlineError)}</p>`;
    }

    for (const opt of optionsWithOnlineVotes) {
      const visibleVotes = opt.baseVotes + opt.onlineVotes;
      const pct = combinedTotalVotes > 0 ? Math.round((visibleVotes / combinedTotalVotes) * 100) : 0;
      html += `<div style="margin-bottom:8px;">`;
      html += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">`;
      html += `<span>${escapeHtml(opt.label)}</span>`;
      html += `<span style="color:#94a3b8;">${visibleVotes} (${pct}%) · JSON ${opt.baseVotes} · онлайн ${opt.onlineVotes}</span>`;
      html += `</div>`;
      html += `<div style="height:8px;background:#1e293b;border-radius:4px;overflow:hidden;">`;
      html += `<div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:4px;transition:width .3s;"></div>`;
      html += `</div>`;
      html += `</div>`;
    }

    if (poll.lastVoteTime) {
      const d = new Date(poll.lastVoteTime);
      html += `<p style="font-size:11px;color:#475569;margin:8px 0 0;text-align:right;">Последний голос: ${d.toLocaleString('ru-RU')}</p>`;
    }
    html += `</div>`;
  }

  pollResultsGrid.innerHTML = html;
  if (pollTimestamp) {
    pollTimestamp.textContent = `Обновлено: ${new Date().toLocaleString('ru-RU')}`;
  }
}

// escapeHtml already defined above (line 678)

if (pollRefreshBtn) {
  pollRefreshBtn.addEventListener('click', renderPollResults);
}

// Expose for cross-script access (tab switching in index.html)
window._renderPollResults = renderPollResults;

// Auto-render polls when content is loaded
const origLoadBtn = loadBtn;
if (origLoadBtn) {
  const origClickHandlers = origLoadBtn.onclick;
  origLoadBtn.addEventListener('click', () => {
    setTimeout(renderPollResults, 2000);
  });
}

// Auto-render polls on initial load if data is already present
setTimeout(() => {
  try { renderPollResults(); } catch {}
}, 500);

// ===== AI GENERATION (via api.eprisjournal.com proxy) =====
const EPRIS_API = 'https://api.eprisjournal.com';

async function callOpenRouter(prompt) {
  const res = await fetch(`${EPRIS_API}/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`AI proxy ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'AI error');
  return data.text;
}

function extractJSON(text) {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  const obj = text.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : text;
}

async function aiGenerateArticle() {
  const title = (byId('creatorTitle').value || '').trim();
  const category = (byId('creatorCategory').value || 'Culture').trim();
  const seed = (byId('creatorSeed').value || '').trim();

  if (!title) { showToast('Введите заголовок для AI-генерации', 'error'); return; }

  const btn = byId('aiGenerateBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Генерирую...';
  showToast('AI генерирует статью...', 'info');

  const prompt = `You are a content writer for EPRIS Journal — a sophisticated lifestyle magazine about design, art, travel, architecture.

Write a complete article in English. Return ONLY valid JSON (no markdown) with this exact structure:
{
  "title": "${title}",
  "excerpt": "2-3 sentence summary",
  "category": "${category}",
  "subcategory": "specific subcategory",
  "tags": ["tag1", "tag2", "tag3"],
  "author": "Author Name",
  "date": "${new Date().toISOString().slice(0,10)}",
  "imageSeed": "${seed || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}",
  "content": [
    {"type": "text", "content": "Opening paragraph (3-4 sentences, elegant and atmospheric)"},
    {"type": "text", "content": "Second paragraph developing the theme"},
    {"type": "quote", "content": "An insightful quote related to the theme", "caption": "— Source"},
    {"type": "text", "content": "Third paragraph with depth and nuance"},
    {"type": "heading", "content": "A Compelling Subheading"},
    {"type": "text", "content": "Fourth paragraph"},
    {"type": "checklist", "content": {"caption": "Key Takeaways", "items": ["insight 1", "insight 2", "insight 3"]}},
    {"type": "text", "content": "Closing paragraph that resonates"}
  ]
}`;

  try {
    const raw = await callOpenRouter(prompt);
    const article = JSON.parse(extractJSON(raw));

    // Insert into editor
    let data;
    try { data = JSON.parse(editor.value); } catch { showToast('Сначала загрузите контент', 'error'); return; }

    const lang = visualLangSelect.value || DEFAULT_LANGUAGE;
    const section = 'articles';
    const allEntries = getSectionEntries(data, section, lang);
    const maxId = allEntries.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0);
    article.id = maxId + 1;

    setSectionEntries(data, section, lang, [...allEntries, article]);
    editor.value = JSON.stringify(data, null, 2);
    markDirty();
    refreshVisualEditor();

    // Select the new entry
    setTimeout(() => {
      visualSectionSelect.value = 'articles';
      visualSectionSelect.dispatchEvent(new Event('change'));
      setTimeout(() => {
        const opts = Array.from(visualEntrySelect.options);
        const last = opts[opts.length - 1];
        if (last) { visualEntrySelect.value = last.value; renderVisualForm(); }
      }, 200);
    }, 100);

    showToast(`✨ Статья "${article.title}" создана!`, 'success');
  } catch (e) {
    showToast('Ошибка AI: ' + e.message, 'error');
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ AI Generate';
  }
}

// Helper: get/set section entries (handles both localizedCollections and translations structure)
function getSectionEntries(data, section, lang) {
  if (data?.localizedCollections?.[lang]?.[section]) return data.localizedCollections[lang][section];
  if (data?.translations?.[lang]?.[section]) return data.translations[lang][section];
  if (data?.[section]) return data[section];
  return [];
}
function setSectionEntries(data, section, lang, entries) {
  if (data?.localizedCollections?.[lang]) { data.localizedCollections[lang][section] = entries; return; }
  if (data?.translations?.[lang]) { data.translations[lang][section] = entries; return; }
  if (Object.prototype.hasOwnProperty.call(data, section)) { data[section] = entries; }
}

// Wire up AI button (injected into Creator Studio)
document.addEventListener('DOMContentLoaded', () => {
  const aiBtn = document.getElementById('aiGenerateBtn');
  if (aiBtn) aiBtn.addEventListener('click', aiGenerateArticle);
});
// Also wire immediately if DOM already loaded
const aiBtn = document.getElementById('aiGenerateBtn');
if (aiBtn) aiBtn.addEventListener('click', aiGenerateArticle);


// ===== VPS DEPLOY =====
async function deployVPS() {
  const btn = byId('deployVpsBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Деплой...';
  showToast('Запускаю деплой VPS...', 'info');
  try {
    const res = await fetch(`${EPRIS_API}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'epris-deploy-2026' }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast('🚀 Деплой запущен! Сборка займёт ~30 сек.', 'success');
    } else {
      showToast('Ошибка деплоя: ' + (data.error || 'unknown'), 'error');
    }
  } catch (e) {
    showToast('Ошибка деплоя: ' + e.message, 'error');
  } finally {
    setTimeout(() => { btn.disabled = false; btn.textContent = '🚀 Deploy VPS'; }, 5000);
  }
}

const deployBtn = document.getElementById('deployVpsBtn');
if (deployBtn) deployBtn.addEventListener('click', deployVPS);

// ═══════════════════════════════════════════════════════════
// ──  ISSUES TAB — Issue Builder  ──────────────────────────
//  Archive of issues + transparent collect → validate → publish.
// ═══════════════════════════════════════════════════════════

const DESIGNED_COVER_IDS = new Set([8, 9]); // articles that ship with cover art
let _issues = null;         // working copy of data.issues (array)
let _currentIssueIdx = 0;   // index of the issue being edited
let _issueOrder = null;     // ordered array of selected article ids
let _issueStatus = 'draft'; // workflow status of the current issue
let issueDragSrcId = null;  // article drag-and-drop source id

function issueArticlesOf(data) {
  return Array.isArray(data && data.articles) ? data.articles : [];
}

function nextIssueId(issues) {
  return issues.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0) + 1;
}

function defaultIssue(id) {
  return {
    id,
    name: `Issue ${id}`,
    season: '',
    tagline: '',
    coverUrl: '',
    articleIds: [],
    status: 'draft',
    publishedAt: '',
  };
}

// Migrate legacy single data.issue -> data.issues array. Returns the array.
function ensureIssuesArray(data) {
  if (Array.isArray(data.issues) && data.issues.length) return data.issues;
  if (data.issue) {
    const migrated = [{ ...data.issue, id: data.issue.id || 1 }];
    delete data.issue;
    data.issues = migrated;
    return migrated;
  }
  data.issues = [defaultIssue(1)];
  return data.issues;
}

// Save the current form + article order into _issues[_currentIssueIdx] (in memory only).
function captureCurrentIssueFromForm() {
  if (!_issues || !_issues[_currentIssueIdx]) return;
  const cur = _issues[_currentIssueIdx];
  cur.name = (document.getElementById('issueName')?.value || '').trim() || cur.name;
  cur.season = (document.getElementById('issueSeason')?.value || '').trim();
  cur.tagline = (document.getElementById('issueTagline')?.value || '').trim();
  cur.coverUrl = (document.getElementById('issueCoverUrl')?.value || '').trim();
  cur.articleIds = (_issueOrder || []).slice();
}

// Write _issues into the editor JSON (data.issues).
function commitIssuesToEditor() {
  const data = parseEditorJsonSafe();
  if (!data) return false;
  data.issues = _issues;
  delete data.issue;
  editor.value = JSON.stringify(data, null, 2);
  updateEditorState();
  return true;
}

// Switch the builder to a different issue by index, capturing current edits first.
function switchToIssue(idx) {
  if (!_issues || !_issues[idx]) return;
  captureCurrentIssueFromForm();
  _currentIssueIdx = idx;
  seedIssueForm(_issues[idx]);
  renderIssueSwitcher();
  renderIssueList();
  renderIssueCoverPicks();
  refreshIssueValidation();
}

function seedIssueForm(issueData) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('issueName', issueData.name);
  set('issueSeason', issueData.season);
  set('issueTagline', issueData.tagline);
  set('issueCoverUrl', issueData.coverUrl);
  _issueStatus = issueData.status === 'published' ? 'published' : (issueData.status === 'archived' ? 'archived' : 'draft');

  const data = parseEditorJsonSafe();
  const articles = issueArticlesOf(data);
  const existing = new Set(articles.map(a => Number(a.id)));
  const seeded = Array.isArray(issueData.articleIds) ? issueData.articleIds.map(Number).filter(id => existing.has(id)) : [];
  _issueOrder = seeded;
}

function renderIssueSwitcher() {
  const listEl = document.getElementById('issueSwitcherList');
  if (!listEl || !_issues) return;
  const statusLabel = { published: 'Опубликован', draft: 'Черновик', archived: 'Архив' };
  listEl.innerHTML = _issues.map((issue, idx) => {
    const status = issue.status === 'published' ? 'published' : (issue.status === 'archived' ? 'archived' : 'draft');
    const thumb = issue.coverUrl
      ? `<img class="issue-switcher-thumb" src="${escapeHtml(issue.coverUrl)}" alt="" onerror="this.style.visibility='hidden'" />`
      : '<div class="issue-switcher-thumb"></div>';
    return `
      <div class="issue-switcher-card ${idx === _currentIssueIdx ? 'active' : ''}" data-idx="${idx}">
        ${thumb}
        <div class="issue-switcher-info">
          <div class="issue-switcher-title">${escapeHtml(issue.name || 'Без названия')}</div>
          <div class="issue-switcher-meta"><span class="issue-switcher-dot ${status}"></span>${escapeHtml(issue.season || '—')} · ${statusLabel[status]}</div>
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.issue-switcher-card').forEach(card => {
    card.addEventListener('click', () => switchToIssue(Number(card.dataset.idx)));
  });
}

function renderIssueCoverPicks() {
  const wrap = document.getElementById('issueCoverPicks');
  if (!wrap) return;
  const data = parseEditorJsonSafe();
  const byId = new Map(issueArticlesOf(data).map(a => [Number(a.id), a]));
  const order = (_issueOrder || []);
  const candidates = order.map(id => byId.get(Number(id))).filter(a => a && a.imageUrl);

  if (!candidates.length) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = '<span style="font-family:var(--font-mono);font-size:.56rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;align-self:center;margin-right:2px">Обложка из статьи:</span>' +
    candidates.map(a => `
      <button class="issue-cover-pick" type="button" data-url="${escapeHtml(a.imageUrl)}" title="${escapeHtml(a.title)}">
        <img src="${escapeHtml(a.imageUrl)}" alt="" />
        ${escapeHtml(a.title.length > 16 ? a.title.slice(0, 16) + '…' : a.title)}
      </button>`).join('');

  wrap.querySelectorAll('.issue-cover-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('issueCoverUrl');
      if (input) {
        input.value = btn.dataset.url;
        refreshIssueValidation();
      }
    });
  });
}

// Validate one article against the issue rules.
function validateIssueArticle(a) {
  const errors = [], warnings = [];
  if (!a.title || !String(a.title).trim()) errors.push('нет заголовка');
  if (!a.excerpt || !String(a.excerpt).trim()) warnings.push('нет описания');
  if (!a.category || !String(a.category).trim()) warnings.push('нет категории');
  if (!a.author || !String(a.author).trim()) warnings.push('нет автора');
  if (!a.date || !String(a.date).trim()) warnings.push('нет даты');
  const hasCover = DESIGNED_COVER_IDS.has(Number(a.id)) || (a.imageUrl && String(a.imageUrl).trim());
  if (!hasCover) warnings.push('нет обложки');
  const totalBlocks = Array.isArray(a.content) ? a.content.length : 0;
  if (totalBlocks < 3) warnings.push('мало контента');
  const level = errors.length ? 'danger' : (warnings.length ? 'warn' : 'ok');
  return { level, errors, warnings, totalBlocks };
}

// Validate the whole issue. Publishing is blocked only by errors (danger).
function validateIssue(data, order) {
  const articles = issueArticlesOf(data);
  const byId = new Map(articles.map(a => [Number(a.id), a]));
  const checks = []; // { level, text }

  const name = (document.getElementById('issueName')?.value || '').trim();
  const season = (document.getElementById('issueSeason')?.value || '').trim();
  const cover = (document.getElementById('issueCoverUrl')?.value || '').trim();

  checks.push(name ? { level: 'ok', text: 'Название выпуска задано' } : { level: 'danger', text: 'Не задано название выпуска' });
  checks.push(season ? { level: 'ok', text: 'Сезон задан' } : { level: 'danger', text: 'Не задан сезон' });
  checks.push(/^https?:\/\//.test(cover) ? { level: 'ok', text: 'URL обложки корректен' } : { level: 'danger', text: 'Нет/некорректный URL главной обложки' });
  checks.push(order.length ? { level: 'ok', text: `Выбрано статей: ${order.length}` } : { level: 'danger', text: 'Не выбрано ни одной статьи' });

  let articleErrors = 0, articleWarnings = 0;
  order.forEach(id => {
    const a = byId.get(Number(id));
    if (!a) { checks.push({ level: 'danger', text: `Статья ID ${id} не найдена` }); articleErrors++; return; }
    const v = validateIssueArticle(a);
    if (v.level === 'danger') { articleErrors++; checks.push({ level: 'danger', text: `«${a.title}»: ${v.errors.join(', ')}` }); }
    else if (v.level === 'warn') { articleWarnings++; checks.push({ level: 'warn', text: `«${a.title}»: ${v.warnings.join(', ')}` }); }
    else { checks.push({ level: 'ok', text: `«${a.title}» — готова` }); }
  });

  const errors = checks.filter(c => c.level === 'danger').length;
  const warnings = checks.filter(c => c.level === 'warn').length;
  return { checks, errors, warnings, canPublish: errors === 0, articleErrors, articleWarnings };
}

// First open / content reload: seed builder state from saved issues archive.
function renderIssuesTab() {
  const data = parseEditorJsonSafe();
  const listEl = document.getElementById('issueArticlesList');
  if (!listEl || !data) return;

  if (!_issues) {
    _issues = ensureIssuesArray(data).map(i => ({ ...i, articleIds: Array.isArray(i.articleIds) ? i.articleIds.slice() : [] }));
    // Default to the published issue, or the first one.
    const pubIdx = _issues.findIndex(i => i.status === 'published');
    _currentIssueIdx = pubIdx >= 0 ? pubIdx : 0;
    seedIssueForm(_issues[_currentIssueIdx]);
    // If no order was seeded (new/empty issue), default to all articles.
    if (!_issueOrder || !_issueOrder.length) {
      _issueOrder = issueArticlesOf(data).map(a => Number(a.id));
    }
  }

  renderIssueSwitcher();
  renderIssueList();
  renderIssueCoverPicks();
  refreshIssueValidation();
}

function renderIssueList() {
  const data = parseEditorJsonSafe();
  const listEl = document.getElementById('issueArticlesList');
  if (!listEl) return;
  const articles = issueArticlesOf(data);
  const countEl = document.getElementById('issueArticlesCount');

  if (!articles.length) {
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:.82rem">Загрузите контент, чтобы увидеть список статей.</p>';
    if (countEl) countEl.textContent = '';
    return;
  }

  const byId = new Map(articles.map(a => [Number(a.id), a]));
  const order = (_issueOrder || []).filter(id => byId.has(Number(id)));
  const unselected = articles.filter(a => !order.includes(Number(a.id)));
  if (countEl) countEl.textContent = `${order.length} из ${articles.length}`;

  const badge = (a) => {
    const v = validateIssueArticle(a);
    const txt = v.level === 'ok' ? 'готова' : v.level === 'warn' ? `${v.warnings.length} замеч.` : 'ошибка';
    return `<span class="issue-article-badge ${v.level}" title="${escapeHtml([...v.errors, ...v.warnings].join('; ') || 'все проверки пройдены')}">${txt}</span>`;
  };
  const thumbOf = (a) => a.imageUrl
    ? `<img class="issue-article-thumb" src="${escapeHtml(a.imageUrl)}" alt="" />`
    : '<div class="issue-article-thumb"></div>';

  const selectedRows = order.map((id, idx) => {
    const a = byId.get(Number(id));
    return `
      <div class="issue-article-row selected" data-id="${id}" draggable="true">
        <span class="issue-drag-handle" title="Перетащить для изменения порядка">⠿</span>
        <div class="issue-article-order">
          <button class="issue-order-btn" data-act="up" data-id="${id}" type="button" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="issue-order-btn" data-act="down" data-id="${id}" type="button" ${idx === order.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <span class="issue-order-num">${String(idx + 1).padStart(2, '0')}</span>
        <input type="checkbox" class="issue-art-check" data-id="${id}" checked />
        ${thumbOf(a)}
        <div class="issue-article-info">
          <div class="issue-article-title">${escapeHtml(a.title)}</div>
          <div class="issue-article-meta">${escapeHtml(a.category || '—')} · ID ${id}</div>
        </div>
        ${badge(a)}
      </div>`;
  }).join('');

  const divider = unselected.length && order.length
    ? '<div style="font-family:var(--font-mono);font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin:6px 0 2px">Не в выпуске</div>'
    : '';

  const unselectedRows = unselected.map(a => `
      <div class="issue-article-row" data-id="${a.id}">
        <span class="issue-order-num" style="opacity:.3">—</span>
        <input type="checkbox" class="issue-art-check" data-id="${a.id}" />
        ${thumbOf(a)}
        <div class="issue-article-info">
          <div class="issue-article-title">${escapeHtml(a.title)}</div>
          <div class="issue-article-meta">${escapeHtml(a.category || '—')} · ID ${a.id}</div>
        </div>
        ${badge(a)}
      </div>`).join('');

  listEl.innerHTML = selectedRows + divider + unselectedRows;

  // Checkbox toggle
  listEl.querySelectorAll('.issue-art-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.id);
      if (cb.checked) { if (!_issueOrder.includes(id)) _issueOrder.push(id); }
      else { _issueOrder = _issueOrder.filter(x => x !== id); }
      renderIssueList();
      renderIssueCoverPicks();
      refreshIssueValidation();
    });
  });
  // Reorder arrows
  listEl.querySelectorAll('.issue-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const i = _issueOrder.indexOf(id);
      if (i < 0) return;
      const j = btn.dataset.act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= _issueOrder.length) return;
      [_issueOrder[i], _issueOrder[j]] = [_issueOrder[j], _issueOrder[i]];
      renderIssueList();
      renderIssueCoverPicks();
      refreshIssueValidation();
    });
  });
  // Drag & drop reordering of selected articles
  listEl.querySelectorAll('.issue-article-row.selected[draggable]').forEach(row => {
    row.addEventListener('dragstart', () => {
      issueDragSrcId = Number(row.dataset.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (Number(row.dataset.id) !== issueDragSrcId) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const targetId = Number(row.dataset.id);
      if (issueDragSrcId === null || targetId === issueDragSrcId) return;
      const from = _issueOrder.indexOf(issueDragSrcId);
      const to = _issueOrder.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const [moved] = _issueOrder.splice(from, 1);
      _issueOrder.splice(to, 0, moved);
      issueDragSrcId = null;
      renderIssueList();
      renderIssueCoverPicks();
      refreshIssueValidation();
    });
  });
}

// Recompute validation, status bar, publish gate, cover preview, PDF structure.
function refreshIssueValidation() {
  const data = parseEditorJsonSafe();
  if (!data) return;
  const order = (_issueOrder || []);
  const result = validateIssue(data, order);

  // Validation chips + checks
  const sumEl = document.getElementById('issueValidationSummary');
  if (sumEl) {
    const ok = result.checks.filter(c => c.level === 'ok').length;
    sumEl.innerHTML = `
      <span class="issue-val-chip ok"><span class="n">${ok}</span> пройдено</span>
      <span class="issue-val-chip warn"><span class="n">${result.warnings}</span> предупр.</span>
      <span class="issue-val-chip danger"><span class="n">${result.errors}</span> ошибок</span>`;
  }
  const checksEl = document.getElementById('issueValidationChecks');
  if (checksEl) {
    const icon = { ok: '✓', warn: '!', danger: '✕' };
    checksEl.innerHTML = result.checks.map(c =>
      `<div class="issue-check-row ${c.level} ${c.level === 'ok' ? 'muted' : ''}">
        <span class="issue-check-icon">${icon[c.level]}</span>
        <span class="issue-check-text">${escapeHtml(c.text)}</span>
      </div>`).join('');
  }

  // Status bar
  const badgeEl = document.getElementById('issueStatusBadge');
  const titleEl = document.getElementById('issueStatusTitle');
  const subEl = document.getElementById('issueStatusSub');
  if (badgeEl) {
    badgeEl.className = `issue-status-badge ${_issueStatus}`;
    badgeEl.textContent = _issueStatus === 'published' ? 'Опубликован' : (_issueStatus === 'archived' ? 'В архиве' : 'Черновик');
  }
  if (titleEl) titleEl.textContent = (document.getElementById('issueName')?.value || 'Выпуск');
  if (subEl) {
    subEl.textContent = result.canPublish
      ? `Готов к публикации · ${order.length} статей · ${result.warnings} предупреждений`
      : `Публикация заблокирована · ${result.errors} ошибок`;
  }

  // Publish gate
  const pubBtn = document.getElementById('publishIssueBtn');
  if (pubBtn) {
    pubBtn.disabled = !result.canPublish;
    pubBtn.title = result.canPublish ? 'Опубликовать выпуск' : 'Сначала исправьте ошибки';
  }

  // Cover preview
  const cp = document.getElementById('issueCoverPreview');
  if (cp) {
    const url = (document.getElementById('issueCoverUrl')?.value || '').trim();
    cp.innerHTML = /^https?:\/\//.test(url)
      ? `<img src="${escapeHtml(url)}" alt="cover" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cover-empty',textContent:'Обложка не загрузилась'}))" />`
      : '<div class="cover-empty">Укажите URL обложки для предпросмотра</div>';
  }

  renderIssuePdfStructure(data, order);
}

function renderIssuePdfStructure(data, order) {
  const structEl = document.getElementById('issuePdfStructure');
  if (!structEl) return;
  const byId = new Map(issueArticlesOf(data).map(a => [Number(a.id), a]));
  const sel = order.map(id => byId.get(Number(id))).filter(Boolean);
  if (!sel.length) {
    structEl.innerHTML = '<p style="color:var(--text-muted);font-size:.82rem">Выберите статьи, чтобы увидеть структуру.</p>';
    return;
  }
  const short = (s) => (s.length > 11 ? s.slice(0, 11) + '…' : s);
  const pages = [
    { label: 'Обложка', type: 'cover' },
    { label: 'Письмо', type: 'letter' },
    { label: 'Содерж.', type: 'toc' },
    ...sel.flatMap(a => [
      { label: short(a.title), type: 'cover' },
      { label: short(a.title), type: 'article' },
    ]),
    { label: 'Колофон', type: 'colophon' },
  ];
  structEl.innerHTML = pages.map((p, i) => {
    const dark = p.type === 'cover' || p.type === 'colophon';
    return `<div class="issue-pdf-page">
        <div class="issue-pdf-rect ${dark ? 'cover-rect' : ''}"><span>${escapeHtml(p.label)}</span></div>
        <div class="issue-pdf-label">${p.type}</div>
        <div class="issue-pdf-num">${String(i + 1).padStart(2, '0')}</div>
      </div>`;
  }).join('');
}

// Write the current issue's config into _issues + editor JSON. status: 'draft' | 'published'.
function writeIssueConfig(status) {
  const data = parseEditorJsonSafe();
  if (!data || !_issues || !_issues[_currentIssueIdx]) { showToast('error', 'Загрузите JSON перед сохранением.'); return false; }
  const order = (_issueOrder || []);
  if (status === 'published') {
    const result = validateIssue(data, order);
    if (!result.canPublish) { showToast('error', `Нельзя опубликовать: ${result.errors} ошибок.`); return false; }
  }
  captureCurrentIssueFromForm();
  const cur = _issues[_currentIssueIdx];
  cur.articleIds = order;
  cur.status = status;
  cur.publishedAt = status === 'published' ? new Date().toISOString().slice(0, 10) : (cur.publishedAt || '');

  // Only one issue can be 'published' at a time — archive the previous one.
  if (status === 'published') {
    _issues.forEach((iss, idx) => {
      if (idx !== _currentIssueIdx && iss.status === 'published') iss.status = 'archived';
    });
  }

  commitIssuesToEditor();
  _issueStatus = status;
  renderIssueSwitcher();
  refreshIssueValidation();
  return true;
}

// Buttons
function bindIssueBuilder() {
  const onClick = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

  onClick('saveDraftBtn', () => {
    if (writeIssueConfig('draft')) showToast('success', 'Черновик сохранён — нажмите «Сохранить в GitHub».');
  });
  onClick('publishIssueBtn', () => {
    if (writeIssueConfig('published')) showToast('success', 'Выпуск опубликован — нажмите «Сохранить в GitHub», чтобы он попал на сайт.');
  });
  onClick('collectAllBtn', () => {
    const data = parseEditorJsonSafe();
    _issueOrder = issueArticlesOf(data).map(a => Number(a.id));
    renderIssueList(); renderIssueCoverPicks(); refreshIssueValidation();
    showToast('info', `Собраны все статьи: ${_issueOrder.length}.`);
  });
  onClick('collectValidBtn', () => {
    const data = parseEditorJsonSafe();
    _issueOrder = issueArticlesOf(data).filter(a => validateIssueArticle(a).level !== 'danger').map(a => Number(a.id));
    renderIssueList(); renderIssueCoverPicks(); refreshIssueValidation();
    showToast('info', `Собраны готовые статьи: ${_issueOrder.length}.`);
  });
  onClick('clearSelectionBtn', () => {
    _issueOrder = [];
    renderIssueList(); renderIssueCoverPicks(); refreshIssueValidation();
  });

  onClick('newIssueBtn', () => {
    if (!_issues) return;
    captureCurrentIssueFromForm();
    const issue = defaultIssue(nextIssueId(_issues));
    _issues.push(issue);
    if (!commitIssuesToEditor()) return;
    switchToIssue(_issues.length - 1);
    showToast('success', `Создан новый выпуск «${issue.name}».`);
  });

  onClick('duplicateIssueBtn', () => {
    if (!_issues || !_issues[_currentIssueIdx]) return;
    captureCurrentIssueFromForm();
    const src = _issues[_currentIssueIdx];
    const copy = { ...src, id: nextIssueId(_issues), name: `${src.name} (копия)`, status: 'draft', publishedAt: '', articleIds: (src.articleIds || []).slice() };
    _issues.splice(_currentIssueIdx + 1, 0, copy);
    if (!commitIssuesToEditor()) return;
    switchToIssue(_currentIssueIdx + 1);
    showToast('success', `Выпуск продублирован как «${copy.name}».`);
  });

  onClick('deleteIssueBtn', () => {
    if (!_issues || _issues.length <= 1) { showToast('error', 'Должен остаться хотя бы один выпуск.'); return; }
    const cur = _issues[_currentIssueIdx];
    if (!window.confirm(`Удалить выпуск «${cur.name}»? Это действие сразу применится к JSON.`)) return;
    _issues.splice(_currentIssueIdx, 1);
    if (_currentIssueIdx >= _issues.length) _currentIssueIdx = _issues.length - 1;
    if (!commitIssuesToEditor()) return;
    seedIssueForm(_issues[_currentIssueIdx]);
    renderIssueSwitcher();
    renderIssueList();
    renderIssueCoverPicks();
    refreshIssueValidation();
    showToast('success', `Выпуск «${cur.name}» удалён.`);
  });

  // Live-update validation as parameters change
  ['issueName', 'issueSeason', 'issueTagline', 'issueCoverUrl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', refreshIssueValidation);
  });
}
bindIssueBuilder();

// Wire tab rendering
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'issues') setTimeout(renderIssuesTab, 50);
    if (btn.dataset.tab === 'translations') setTimeout(renderTranslationsTab, 50);
    if (btn.dataset.tab === 'dashboard') setTimeout(renderDashboard, 50);
    if (btn.dataset.tab === 'studio') setTimeout(renderStudioTab, 50);
  });
});


// ═══════════════════════════════════════════════════════════
// ──  DASHBOARD  ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

function renderDashboard() {
  const data = parseEditorJsonSafe();

  // ── Stats row ──
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  if (!data) {
    setVal('dashCountArticles', '—');
    setVal('dashCountReviews', '—');
    setVal('dashCountIssues', '—');
    setVal('dashCountLangs', '—');
    setVal('dashIssueStatus', 'Нет данных');
    return;
  }

  const enArticles = (data.articles && data.articles['EN']) ? data.articles['EN'].length : 0;
  const enReviews  = (data.reviews  && data.reviews['EN'])  ? data.reviews['EN'].length  : 0;
  const issues     = Array.isArray(data.issues) ? data.issues : [];
  const langs      = data.translations ? Object.keys(data.translations).length : 0;
  const published  = issues.find(i => i.status === 'published');

  setVal('dashCountArticles', enArticles);
  setVal('dashCountReviews',  enReviews);
  setVal('dashCountIssues',   issues.length);
  setVal('dashCountLangs',    langs);
  setVal('dashIssueStatus',   published ? `${published.name} (${published.season || 'опубликован'})` : (issues.length ? `${issues[0].name} — черновик` : 'Нет выпусков'));

  // ── Translation coverage ──
  const covEl = document.getElementById('dashTranslCoverage');
  if (covEl && data.translations) {
    const enKeys = Object.keys(data.translations['EN'] || {});
    const total  = enKeys.length;
    const langsList = Object.keys(data.translations).filter(l => l !== 'EN');
    if (!total) {
      covEl.innerHTML = '<p class="dash-empty-hint">Нет ключей перевода.</p>';
    } else {
      covEl.innerHTML = langsList.map(lang => {
        const filled = enKeys.filter(k => data.translations[lang]?.[k]).length;
        const pct    = Math.round((filled / total) * 100);
        const color  = pct === 100 ? '#4A7C59' : pct > 70 ? '#B8860B' : '#8B3A3A';
        return `<div class="dash-lang-row">
          <span class="dash-lang-name">${escapeHtml(lang)}</span>
          <div class="dash-lang-track"><div class="dash-lang-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="dash-lang-pct" style="color:${color}">${pct}%</span>
        </div>`;
      }).join('');
    }
  }

  // ── Content audit ──
  const auditEl = document.getElementById('dashContentAudit');
  if (auditEl) {
    const sections = [
      { key: 'articles',     label: 'Статьи' },
      { key: 'reviews',      label: 'Обзоры' },
      { key: 'items',        label: 'Галерея' },
      { key: 'libraryItems', label: 'Библиотека' },
    ];
    const enLang = 'EN';
    auditEl.innerHTML = sections.map(sec => {
      const entries = (data[sec.key] && data[sec.key][enLang]) || [];
      const total   = entries.length;
      if (!total) return '';
      const withPhoto = entries.filter(e => e.imageUrl || e.image || (e.blocks || []).some(b => b.type === 'image' && b.src)).length;
      const pct = Math.round((withPhoto / total) * 100);
      const badge = pct === 100 ? 'ok' : pct > 60 ? 'warn' : 'danger';
      const badgeLabel = pct === 100 ? 'Полный' : pct > 60 ? 'Частично' : 'Неполный';
      return `<div class="dash-audit-row">
        <span class="dash-audit-section">${escapeHtml(sec.label)}</span>
        <div class="dash-audit-bar-wrap"><div class="dash-audit-bar-fill" style="width:${pct}%"></div></div>
        <span class="dash-audit-num">${total} зап.</span>
        <span class="dash-audit-badge ${badge}">${badgeLabel}</span>
      </div>`;
    }).filter(Boolean).join('') || '<p class="dash-empty-hint">Нет данных по разделам.</p>';
  }

  // ── Issue timeline ──
  const timelineEl = document.getElementById('dashIssueTimeline');
  if (timelineEl) {
    if (!issues.length) {
      timelineEl.innerHTML = '<p class="dash-empty-hint">Нет выпусков.</p>';
    } else {
      timelineEl.innerHTML = issues.slice().reverse().map(iss => {
        const statusLabel = iss.status === 'published' ? 'Опубликован' : iss.status === 'archived' ? 'Архив' : 'Черновик';
        const articles = Array.isArray(iss.articleIds) ? iss.articleIds.length : 0;
        return `<div class="dash-issue-card" onclick="document.querySelector('[data-tab=issues]').click()">
          <div class="dash-issue-card-status ${iss.status}">${statusLabel}</div>
          <div class="dash-issue-card-name">${escapeHtml(iss.name || `Выпуск ${iss.id}`)}</div>
          <div class="dash-issue-card-meta">${escapeHtml(iss.season || '')} · ${articles} ст.</div>
        </div>`;
      }).join('');
    }
  }
}

// Auto-refresh dashboard when JSON changes
const _origUpdateEditorState = updateEditorState;
// (patch inline at call sites via init/loadFromGitHub hooks — renderDashboard called after load)

// ═══════════════════════════════════════════════════════════
// ──  TRANSLATIONS TAB  ────────────────────────────────────
// ═══════════════════════════════════════════════════════════

let _translChanges = {}; // key → new value for selected lang
let _translShowMissingOnly = false;

function renderTranslationsTab() {
  const data = parseEditorJsonSafe();
  const bodyEl = document.getElementById('translBody');
  const langSelect = document.getElementById('translLangSelect');
  const statsEl = document.getElementById('translStats');
  const headerEl = document.getElementById('translLangHeader');
  if (!bodyEl || !langSelect) return;

  if (!data || !data.translations) {
    bodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);font-size:.82rem">Загрузите контент для работы с переводами.</td></tr>';
    return;
  }

  const langs = Object.keys(data.translations);
  const enKeys = data.translations['EN'] || {};
  const allKeys = Object.keys(enKeys);

  // ── Language overview pills ──
  const overviewEl = document.getElementById('translLangOverview');
  if (overviewEl) {
    const nonEnLangs = langs.filter(l => l !== 'EN');
    overviewEl.innerHTML = nonEnLangs.map(lang => {
      const filled = allKeys.filter(k => data.translations[lang]?.[k]).length;
      const pct = allKeys.length ? Math.round((filled / allKeys.length) * 100) : 0;
      const color = pct === 100 ? '#4A7C59' : pct > 70 ? '#B8860B' : '#8B3A3A';
      return `<div class="transl-lang-pill" data-lang="${escapeHtml(lang)}" title="${filled}/${allKeys.length} ключей">
        <span class="transl-lang-pill-name">${escapeHtml(lang)}</span>
        <div class="transl-lang-pill-track"><div class="transl-lang-pill-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="transl-lang-pill-pct" style="color:${color}">${pct}%</span>
      </div>`;
    }).join('');
    overviewEl.querySelectorAll('.transl-lang-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const sel = document.getElementById('translLangSelect');
        if (sel) { sel.value = pill.dataset.lang; sel.dispatchEvent(new Event('change')); }
      });
    });
  }

  // Populate lang selector
  const prevLang = langSelect.value;
  langSelect.innerHTML = langs.filter(l => l !== 'EN').map(l =>
    `<option value="${l}" ${l === prevLang ? 'selected' : ''}>${l}</option>`
  ).join('');
  const activeLang = langSelect.value || langs.find(l => l !== 'EN') || '';
  if (headerEl) headerEl.textContent = activeLang ? `${activeLang} — перевод` : 'Перевод';

  // Mark active pill
  if (overviewEl) {
    overviewEl.querySelectorAll('.transl-lang-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.lang === activeLang);
    });
  }

  const langMap = data.translations[activeLang] || {};
  _translChanges = {};

  const searchVal = (document.getElementById('translSearch')?.value || '').toLowerCase();

  const filtered = allKeys.filter(k => {
    if (_translShowMissingOnly && langMap[k]) return false;
    if (searchVal && !k.toLowerCase().includes(searchVal) && !(enKeys[k] || '').toLowerCase().includes(searchVal)) return false;
    return true;
  });

  const missing = allKeys.filter(k => !langMap[k]).length;
  const filled = allKeys.length - missing;
  const pct = allKeys.length ? Math.round((filled / allKeys.length) * 100) : 0;
  const statClass = pct === 100 ? 'ok' : pct > 70 ? 'warn' : 'danger';
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="transl-stat-item">Язык: <span class="transl-stat-val">${activeLang}</span></div>
      <div class="transl-stat-item">Ключей: <span class="transl-stat-val">${allKeys.length}</span></div>
      <div class="transl-stat-item">Заполнено: <span class="transl-stat-val ${statClass}">${filled}</span></div>
      <div class="transl-stat-item">Пропущено: <span class="transl-stat-val ${missing ? 'danger' : 'ok'}">${missing}</span></div>
      <div class="transl-stat-item">Покрытие: <span class="transl-stat-val ${statClass}">${pct}%</span></div>
    `;
  }

  if (!filtered.length) {
    bodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);font-size:.82rem">Нет ключей по фильтру.</td></tr>';
    return;
  }

  bodyEl.innerHTML = filtered.map(k => {
    const enVal = escapeHtml(enKeys[k] || '');
    const curVal = escapeHtml(langMap[k] || '');
    const isMissing = !langMap[k];
    return `
      <tr class="${isMissing ? 'transl-missing' : ''}" data-key="${escapeHtml(k)}">
        <td><span class="transl-key">${escapeHtml(k)}</span></td>
        <td class="transl-en-cell"><span class="transl-en-val">${enVal}</span></td>
        <td>
          <input class="transl-input" data-key="${escapeHtml(k)}" value="${curVal}" placeholder="${enVal}" />
        </td>
        <td style="text-align:center">
          ${isMissing ? `<button class="transl-copy-btn" data-copy="${escapeHtml(k)}" title="Скопировать EN">↙ EN</button>` : ''}
        </td>
      </tr>`;
  }).join('');

  // Track changes
  bodyEl.querySelectorAll('.transl-input').forEach(input => {
    const key = input.dataset.key;
    const original = langMap[key] || '';
    input.addEventListener('input', () => {
      if (input.value !== original) {
        _translChanges[key] = input.value;
        input.classList.add('changed');
      } else {
        delete _translChanges[key];
        input.classList.remove('changed');
      }
    });
  });

  // Copy from EN buttons
  bodyEl.querySelectorAll('.transl-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.copy;
      const input = bodyEl.querySelector(`.transl-input[data-key="${key}"]`);
      if (input) {
        input.value = enKeys[key] || '';
        input.dispatchEvent(new Event('input'));
      }
    });
  });
}

// Apply translation changes
const translSaveBtn = document.getElementById('translSaveBtn');
if (translSaveBtn) {
  translSaveBtn.addEventListener('click', () => {
    if (!Object.keys(_translChanges).length) {
      showToast('info', 'Нет изменений — отредактируйте переводы.');
      return;
    }
    const data = parseEditorJsonSafe();
    if (!data) { showToast('error', 'Загрузите JSON.'); return; }

    const langSelect = document.getElementById('translLangSelect');
    const activeLang = langSelect?.value;
    if (!activeLang) return;

    if (!data.translations[activeLang]) data.translations[activeLang] = {};
    Object.assign(data.translations[activeLang], _translChanges);

    editor.value = JSON.stringify(data, null, 2);
    updateEditorState();
    _translChanges = {};
    showToast('success', 'Переводы применены — сохраните в GitHub.');
    renderTranslationsTab();
  });
}

// Lang change
const translLangSelect = document.getElementById('translLangSelect');
if (translLangSelect) translLangSelect.addEventListener('change', renderTranslationsTab);

// Search
const translSearch = document.getElementById('translSearch');
if (translSearch) translSearch.addEventListener('input', renderTranslationsTab);

// Missing only / show all
const translOnlyMissing = document.getElementById('translOnlyMissing');
const translShowAll = document.getElementById('translShowAll');
if (translOnlyMissing) translOnlyMissing.addEventListener('click', () => { _translShowMissingOnly = true; renderTranslationsTab(); });
if (translShowAll) translShowAll.addEventListener('click', () => { _translShowMissingOnly = false; renderTranslationsTab(); });

// AI translate missing
const translAiBtn = document.getElementById('translAiBtn');
if (translAiBtn) {
  translAiBtn.addEventListener('click', async () => {
    const data = parseEditorJsonSafe();
    if (!data?.translations) { showToast('error', 'Загрузите JSON.'); return; }
    const langSelect = document.getElementById('translLangSelect');
    const activeLang = langSelect?.value;
    if (!activeLang) return;
    const enKeys = data.translations['EN'] || {};
    const langMap = data.translations[activeLang] || {};
    const missingKeys = Object.keys(enKeys).filter(k => !langMap[k]);
    if (!missingKeys.length) { showToast('info', 'Нет незаполненных переводов.'); return; }
    if (missingKeys.length > 40) { showToast('warn', `Слишком много ключей (${missingKeys.length}), запустите несколько раз.`); }
    const batch = missingKeys.slice(0, 40);
    translAiBtn.disabled = true;
    translAiBtn.textContent = `Перевожу ${batch.length} ключей…`;
    try {
      const payload = batch.map(k => `${k}: ${enKeys[k]}`).join('\n');
      const prompt = `Translate these UI strings from English to ${activeLang}.\nReturn ONLY a JSON object mapping each key to its translated value. Do not add explanations.\n\n${payload}`;
      const result = await callOpenRouter(prompt);
      const parsed = extractJSON(result);
      if (!parsed || typeof parsed !== 'object') throw new Error('Bad JSON response');
      Object.assign(_translChanges, parsed);
      // Show changes in inputs
      renderTranslationsTab();
      Object.entries(parsed).forEach(([k, v]) => {
        const input = document.querySelector(`.transl-input[data-key="${CSS.escape(k)}"]`);
        if (input) { input.value = v; input.classList.add('changed'); }
      });
      showToast('success', `Переведено ${Object.keys(parsed).length} ключей — нажмите «Применить».`);
    } catch (e) {
      showToast('error', `Ошибка перевода: ${e.message}`);
    } finally {
      translAiBtn.disabled = false;
      translAiBtn.textContent = '✨ Перевести пустые';
    }
  });
}


// ═══════════════════════════════════════════════════════════
// ──  STUDIO TAB  ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

let _studio = null; // working copy of the studio object

const STUDIO_STAT_KEYS = ['studio.stats.years', 'studio.stats.projects', 'studio.stats.cities'];

function defaultStudio() {
  return {
    name: '', instagram: '', email: '', heroImage: '',
    statement: '', services: [], stats: [], projects: [],
  };
}

function nextStudioProjectId(projects) {
  return projects.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
}

// Read current DOM form back into _studio (so add/remove/apply never lose edits)
function captureStudioForm() {
  if (!_studio) return;
  const val = (id) => (document.getElementById(id)?.value || '').trim();
  _studio.name = val('studioName');
  _studio.instagram = val('studioInstagram');
  _studio.email = val('studioEmail');
  _studio.heroImage = val('studioHeroImage');

  _studio.services = [...document.querySelectorAll('#studioServicesList .studio-service-input')]
    .map((i) => i.value.trim()).filter(Boolean);

  _studio.stats = [...document.querySelectorAll('#studioStatsList .studio-stat-row')].map((row) => ({
    value: row.querySelector('.studio-stat-value')?.value.trim() || '',
    key: row.querySelector('.studio-stat-key')?.value.trim() || 'studio.stats.years',
  })).filter((s) => s.value);

  _studio.projects = [...document.querySelectorAll('#studioProjectsList .studio-project-card')].map((card) => {
    const f = (cls) => card.querySelector('.' + cls)?.value.trim() || '';
    const gallery = (card.querySelector('.studio-proj-gallery')?.value || '')
      .split('\n').map((s) => s.trim()).filter(Boolean);
    return {
      id: Number(card.dataset.id),
      title: f('studio-proj-title'),
      category: f('studio-proj-category'),
      year: f('studio-proj-year'),
      location: f('studio-proj-location'),
      role: f('studio-proj-role'),
      imageUrl: f('studio-proj-image'),
      description: f('studio-proj-desc'),
      gallery,
      featured: card.querySelector('.studio-proj-featured')?.checked || false,
    };
  });
}

function renderStudioTab() {
  const data = parseEditorJsonSafe();
  const layout = document.querySelector('.studio-layout');
  if (!layout) return;
  if (!data) {
    document.getElementById('studioServicesList').innerHTML =
      '<p style="color:var(--text-muted);font-size:.82rem">Загрузите контент из GitHub, чтобы редактировать студию.</p>';
    return;
  }
  _studio = JSON.parse(JSON.stringify(data.studio || defaultStudio()));
  _studio.services = _studio.services || [];
  _studio.stats = _studio.stats || [];
  _studio.projects = _studio.projects || [];
  renderStudioForm();
}

function renderStudioForm() {
  if (!_studio) return;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('studioName', _studio.name);
  setVal('studioInstagram', _studio.instagram);
  setVal('studioEmail', _studio.email);
  setVal('studioHeroImage', _studio.heroImage);

  // Hero preview
  const prev = document.getElementById('studioHeroPreview');
  if (prev) {
    const url = (_studio.heroImage || '').trim();
    prev.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="hero" onerror="this.style.display='none'" />`
      : '<div class="studio-empty-prev">Укажите URL изображения</div>';
  }

  // Services
  const sList = document.getElementById('studioServicesList');
  if (sList) {
    sList.innerHTML = _studio.services.length
      ? _studio.services.map((s, i) => `
        <div class="studio-service-row" data-index="${i}">
          <span class="studio-row-num">${String(i + 1).padStart(2, '0')}</span>
          <input class="studio-service-input" value="${escapeHtml(s)}" placeholder="Название услуги" />
          <button class="studio-icon-btn" data-act="up" data-i="${i}" title="Вверх" type="button">↑</button>
          <button class="studio-icon-btn" data-act="down" data-i="${i}" title="Вниз" type="button">↓</button>
          <button class="studio-icon-btn danger" data-act="del" data-i="${i}" title="Удалить" type="button">✕</button>
        </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:.82rem">Нет услуг. Добавьте первую.</p>';
  }

  // Stats
  const stList = document.getElementById('studioStatsList');
  if (stList) {
    stList.innerHTML = _studio.stats.length
      ? _studio.stats.map((s, i) => `
        <div class="studio-stat-row" data-index="${i}">
          <input class="studio-stat-value" value="${escapeHtml(s.value || '')}" placeholder="8" />
          <select class="studio-stat-key">
            ${STUDIO_STAT_KEYS.map((k) => `<option value="${k}" ${k === s.key ? 'selected' : ''}>${k.replace('studio.stats.', '')}</option>`).join('')}
          </select>
          <button class="studio-icon-btn danger" data-act="del-stat" data-i="${i}" title="Удалить" type="button">✕</button>
        </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:.82rem">Нет показателей.</p>';
  }

  // Projects
  const pList = document.getElementById('studioProjectsList');
  if (pList) {
    pList.innerHTML = _studio.projects.length
      ? _studio.projects.map((p, i) => `
        <div class="studio-project-card" data-id="${p.id}" data-index="${i}">
          <div class="studio-proj-head">
            <span class="studio-row-num">${String(i + 1).padStart(2, '0')}</span>
            <label class="studio-featured-label">
              <input type="checkbox" class="studio-proj-featured" ${p.featured ? 'checked' : ''} />
              Featured
            </label>
            <div class="studio-proj-tools">
              <button class="studio-icon-btn" data-act="proj-up" data-i="${i}" title="Вверх" type="button">↑</button>
              <button class="studio-icon-btn" data-act="proj-down" data-i="${i}" title="Вниз" type="button">↓</button>
              <button class="studio-icon-btn" data-act="proj-dup" data-i="${i}" title="Дублировать" type="button">⧉</button>
              <button class="studio-icon-btn danger" data-act="proj-del" data-i="${i}" title="Удалить" type="button">✕</button>
            </div>
          </div>
          <div class="studio-proj-thumb">${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" onerror="this.style.display='none'" alt="" />` : ''}</div>
          <div class="studio-proj-grid">
            <input class="studio-proj-title" value="${escapeHtml(p.title || '')}" placeholder="Название проекта" />
            <input class="studio-proj-category" value="${escapeHtml(p.category || '')}" placeholder="Категория" />
            <input class="studio-proj-year" value="${escapeHtml(p.year || '')}" placeholder="Год" />
            <input class="studio-proj-location" value="${escapeHtml(p.location || '')}" placeholder="Локация" />
            <input class="studio-proj-role" value="${escapeHtml(p.role || '')}" placeholder="Роль" />
            <input class="studio-proj-image" value="${escapeHtml(p.imageUrl || '')}" placeholder="URL обложки" />
          </div>
          <textarea class="studio-proj-desc" rows="2" placeholder="Описание кейса">${escapeHtml(p.description || '')}</textarea>
          <textarea class="studio-proj-gallery" rows="2" placeholder="URL галереи — по одному на строку">${escapeHtml((p.gallery || []).join('\n'))}</textarea>
        </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:.82rem">Нет проектов. Добавьте первый.</p>';
  }

  bindStudioRowActions();
}

function bindStudioRowActions() {
  document.querySelectorAll('#tab-studio [data-act]').forEach((btn) => {
    btn.onclick = () => {
      captureStudioForm();
      const i = Number(btn.dataset.i);
      const act = btn.dataset.act;
      const arrMove = (arr, from, to) => { if (to < 0 || to >= arr.length) return; const [x] = arr.splice(from, 1); arr.splice(to, 0, x); };
      switch (act) {
        case 'up': arrMove(_studio.services, i, i - 1); break;
        case 'down': arrMove(_studio.services, i, i + 1); break;
        case 'del': _studio.services.splice(i, 1); break;
        case 'del-stat': _studio.stats.splice(i, 1); break;
        case 'proj-up': arrMove(_studio.projects, i, i - 1); break;
        case 'proj-down': arrMove(_studio.projects, i, i + 1); break;
        case 'proj-del': _studio.projects.splice(i, 1); break;
        case 'proj-dup': {
          const src = _studio.projects[i];
          _studio.projects.splice(i + 1, 0, { ...src, id: nextStudioProjectId(_studio.projects), title: src.title + ' (копия)', featured: false, gallery: (src.gallery || []).slice() });
          break;
        }
      }
      renderStudioForm();
    };
  });

  // live hero preview
  const hero = document.getElementById('studioHeroImage');
  if (hero) hero.oninput = () => {
    const prev = document.getElementById('studioHeroPreview');
    const url = hero.value.trim();
    if (prev) prev.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="hero" onerror="this.style.display='none'" />` : '<div class="studio-empty-prev">Укажите URL изображения</div>';
  };
}

// Add buttons
(function bindStudioAddButtons() {
  const onClick = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  onClick('studioAddServiceBtn', () => { captureStudioForm(); if (!_studio) return; _studio.services.push(''); renderStudioForm(); });
  onClick('studioAddStatBtn', () => { captureStudioForm(); if (!_studio) return; _studio.stats.push({ value: '', key: STUDIO_STAT_KEYS[0] }); renderStudioForm(); });
  onClick('studioAddProjectBtn', () => {
    captureStudioForm();
    if (!_studio) return;
    _studio.projects.push({ id: nextStudioProjectId(_studio.projects), title: '', category: '', year: new Date().getFullYear().toString(), location: '', role: '', imageUrl: '', description: '', gallery: [], featured: false });
    renderStudioForm();
  });
  onClick('studioApplyBtn', () => {
    const data = parseEditorJsonSafe();
    if (!data) { showToast('error', 'Загрузите JSON перед сохранением.'); return; }
    captureStudioForm();
    data.studio = _studio;
    editor.value = JSON.stringify(data, null, 2);
    updateEditorState();
    showToast('success', 'Студия обновлена — нажмите «Сохранить в GitHub».');
  });
})();

