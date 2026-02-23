const DEFAULTS = Object.freeze({
  owner: 'eprisj',
  repo: 'eprisj.github.io',
  branch: 'main',
  path: 'src/content/site-content.json',
  uploadDir: 'public/uploads',
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
const applyEntryBtn = byId('applyEntryBtn');
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
  applyEntryBtn,
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
  syncUploadHint();
  syncExternalLinks();
  updateStatsFromEditor();
  refreshVisualEditor();
  updateEditorState();
  saveSettings();
  queueMonitoringChecks();

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
  pickImageBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    pickImageFile();
  });
  useUploadedUrlBtn.addEventListener('click', useUploadedUrlInCurrentEntry);
  useUploadedPagesUrlBtn.addEventListener('click', useUploadedPagesUrlInCurrentEntry);
  copyUploadedUrlBtn.addEventListener('click', copyUploadedUrl);
  imageFileInput.addEventListener('change', onImageFileChange);
  monitorRunBtn.addEventListener('click', runMonitoringChecks);

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
      queueMonitoringChecks();
    });
    input.addEventListener('input', () => {
      saveSettings();
      syncRepoSummary();
      syncUploadHint();
      syncExternalLinks();
      queueMonitoringChecks();
    });
  }

  editor.addEventListener('input', () => {
    updateStatsFromEditor();
    updateEditorState();
    scheduleDraftSave();
    scheduleVisualRefresh();
    queueMonitoringChecks();
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

function queueMonitoringChecks(delay = 450) {
  if (monitorTimer) {
    clearTimeout(monitorTimer);
  }

  monitorTimer = setTimeout(() => {
    runMonitoringChecks();
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
  if (!owner || !repo) {
    return '';
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io`;
  }

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

async function runMonitoringChecks() {
  const cfg = getConfig();
  const content = parseEditorJsonSafe();

  monitorRunBtn.disabled = true;
  monitorRunBtn.textContent = 'Проверка...';

  try {
    const localResults = [
      runContentQualityChecks(content),
      runMediaQualityChecks(content)
    ];

    const remoteResults = await Promise.all([
      runGitHubAuthCheck(cfg),
      runDeployStatusCheck(cfg),
      runPagesAvailabilityCheck(cfg),
      runUploadDirectoryCheck(cfg)
    ]);

    renderMonitoringResults([...remoteResults, ...localResults]);
  } finally {
    monitorRunBtn.disabled = false;
    monitorRunBtn.textContent = 'Обновить мониторинг';
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
  queueMonitoringChecks(120);
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
    <label class="full">Контент статьи (JSON блоков)<textarea id="vf-content-json">${escapeHtml(JSON.stringify(entry.content || [], null, 2))}</textarea></label>
    <p class="form-hint full">Для блоков в статье можно вставлять URL картинок прямо в <code>content</code> у блока типа <code>image</code> или в массиве <code>gallery</code>.</p>
  `;
  bindPhotoPreviewInputs();
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
        imageUrl: getOptionalString(getFieldValue('vf-imageUrl')),
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
