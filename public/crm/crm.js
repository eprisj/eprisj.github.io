/*
  EPRIS CRM — одна база редакции, две двери

  Данные лежат там же, где их держит панель: /crm на api.eprisjournal.com
  (contacts, companies, deals, partners, subscribers, tasks, activities,
  interviews, notes) плюс отдельный реестр /leads — авторы и питчи, который
  уже наполняется публичной формой сотрудничества. CRM не заводит своей
  копии этих людей: реестр показывается как есть и правится на месте.

  Запись всегда идёт точечно, через /crm/entity: панель, этот интерфейс и
  Mini App работают одновременно, и «прочитал документ целиком — записал
  документ целиком» здесь означало бы тихо стереть чужую правку.

  Пароль один на все двери. В Telegram он выдаётся обменом initData, в
  браузере берётся из того же ключа localStorage, что и у панели, поэтому
  вошедший в панель попадает сюда без второго логина.
*/

const API = "https://api.eprisjournal.com";
const PW_KEY = "epris_admin_pw_saved";   // тот же ключ, что у /admin
const ROLE_KEY = "epris_admin_role";

let PW = "";
let ROLE = "admin";
const state = {
  doc: null,
  leads: [],
  section: "overview",
  query: "",
  filter: "",
  editing: null,     // { collection, item, isNew }
};

/* ── Мелочи ──────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "crm-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 10);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMoney(v) {
  const n = Number(v || 0);
  if (!n) return "";
  return n.toLocaleString("ru-RU") + " €";
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.round((d - new Date()) / 86400000);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": PW,
      ...(options.headers || {}),
    },
  });
  let data = null;
  try { data = await res.json(); } catch { /* сервер мог ответить пустым телом */ }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || ("HTTP " + res.status));
  }
  return data;
}

/* ── Описание разделов ───────────────────────────────────────────────────── */
// Каждый раздел знает, из какой коллекции берёт записи, что показывать в
// таблице и что редактировать в ящике. Один описатель — один раздел; новый
// раздел добавляется строчкой здесь, а не копией всей страницы.
const STATUS_TONE = {
  "активен": "green", "готово": "green", "оплачено": "green", "опубликовано": "green",
  "подписан": "green", "принято": "green", "выиграна": "green",
  "в работе": "amber", "переговоры": "amber", "ожидание": "amber", "на рассмотрении": "amber",
  "просрочено": "red", "отказ": "red", "проиграна": "red", "отписан": "red",
};
const tone = v => STATUS_TONE[String(v || "").toLowerCase()] || "gray";

const SECTIONS = [
  {
    id: "overview", title: "Обзор", icon: "◧",
    lede: "Что происходит в редакции прямо сейчас",
    custom: renderOverview,
  },
  {
    id: "leads", title: "Авторы и питчи", icon: "✎", source: "leads",
    lede: "Реестр сотрудничества: заявки с сайта и собственные находки",
    lede2: "Правки уходят в тот же файл, который читает публичная страница сотрудничества",
    columns: [
      { k: "name", h: "Имя", main: true, sub: r => [r.discipline, r.city, r.country].filter(Boolean).join(" · ") },
      { k: "status", h: "Статус", chip: true },
      { k: "priority", h: "Приоритет", chip: true },
      { k: "score", h: "Балл" },
      { k: "addedAt", h: "Добавлен", date: true },
    ],
    filterKey: "status",
    fields: [
      { k: "name", l: "Имя", req: true },
      { k: "instagram", l: "Instagram" },
      { k: "discipline", l: "Направление" },
      { k: "country", l: "Страна", half: true },
      { k: "city", l: "Город", half: true },
      { k: "status", l: "Статус", opts: ["На рассмотрении", "В работе", "Принято", "Опубликовано", "Отказ"] },
      { k: "priority", l: "Приоритет", opts: ["Review", "High", "Medium", "Low"] },
      { k: "score", l: "Балл", type: "number" },
      { k: "portfolio", l: "Портфолио" },
      { k: "why", l: "Почему он нам интересен", area: true },
      { k: "notes", l: "Заметка редакции", area: true },
    ],
  },
  {
    id: "contacts", title: "Люди", icon: "☺", source: "contacts",
    lede: "Авторы, редакторы, представители брендов — все, с кем есть переписка",
    columns: [
      { k: "name", h: "Имя", main: true, sub: r => [r.role, r.company].filter(Boolean).join(" · ") },
      { k: "email", h: "Почта" },
      { k: "telegram", h: "Telegram" },
      { k: "kind", h: "Тип", chip: true },
      { k: "updatedAt", h: "Обновлён", date: true },
    ],
    filterKey: "kind",
    fields: [
      { k: "name", l: "Имя", req: true },
      { k: "kind", l: "Тип", opts: ["Автор", "Редактор", "Бренд", "Фотограф", "Партнёр", "Другое"] },
      { k: "role", l: "Роль", half: true },
      { k: "company", l: "Компания", half: true },
      { k: "email", l: "Почта", half: true },
      { k: "phone", l: "Телефон", half: true },
      { k: "telegram", l: "Telegram", half: true },
      { k: "instagram", l: "Instagram", half: true },
      { k: "city", l: "Город" },
      { k: "note", l: "Заметка", area: true },
    ],
  },
  {
    id: "companies", title: "Компании", icon: "▤", source: "companies",
    lede: "Бренды, издания и агентства",
    columns: [
      { k: "name", h: "Название", main: true, sub: r => [r.industry, r.country].filter(Boolean).join(" · ") },
      { k: "stage", h: "Отношения", chip: true },
      { k: "site", h: "Сайт" },
      { k: "owner", h: "Ответственный" },
      { k: "updatedAt", h: "Обновлена", date: true },
    ],
    filterKey: "stage",
    fields: [
      { k: "name", l: "Название", req: true },
      { k: "stage", l: "Отношения", opts: ["Лид", "Переговоры", "Активен", "Пауза", "Отказ"] },
      { k: "industry", l: "Сфера", half: true },
      { k: "country", l: "Страна", half: true },
      { k: "site", l: "Сайт" },
      { k: "contactName", l: "Контактное лицо", half: true },
      { k: "contactEmail", l: "Почта контакта", half: true },
      { k: "owner", l: "Ответственный в редакции" },
      { k: "note", l: "Заметка", area: true },
    ],
  },
  {
    id: "deals", title: "Сделки", icon: "◆", source: "deals",
    lede: "Размещения и коллаборации по стадиям",
    custom: renderDeals,
    fields: [
      { k: "title", l: "Сделка", req: true },
      { k: "company", l: "Компания" },
      { k: "stage", l: "Стадия", opts: ["Лид", "Переговоры", "Предложение", "Выиграна", "Проиграна"] },
      { k: "amount", l: "Сумма, €", type: "number", half: true },
      { k: "dueAt", l: "Дедлайн", type: "date", half: true },
      { k: "format", l: "Формат", opts: ["Статья", "Спецпроект", "Баннер", "Рассылка", "Событие", "Другое"] },
      { k: "owner", l: "Ответственный" },
      { k: "note", l: "Заметка", area: true },
    ],
  },
  {
    id: "partners", title: "Партнёры", icon: "⬡", source: "partners",
    lede: "Постоянные партнёрства и подписки на сотрудничество",
    columns: [
      { k: "name", h: "Партнёр", main: true, sub: r => r.kind },
      { k: "status", h: "Статус", chip: true },
      { k: "plan", h: "Формат" },
      { k: "renewAt", h: "Продление", date: true },
      { k: "amount", h: "Сумма", money: true },
    ],
    filterKey: "status",
    fields: [
      { k: "name", l: "Партнёр", req: true },
      { k: "kind", l: "Тип", opts: ["Бренд", "Институция", "Медиа", "Шоурум", "Другое"] },
      { k: "status", l: "Статус", opts: ["Подписан", "Ожидание", "Пауза", "Завершён"] },
      { k: "plan", l: "Формат", half: true },
      { k: "amount", l: "Сумма, €", type: "number", half: true },
      { k: "startAt", l: "Начало", type: "date", half: true },
      { k: "renewAt", l: "Продление", type: "date", half: true },
      { k: "contact", l: "Контакт" },
      { k: "note", l: "Условия", area: true },
    ],
  },
  {
    id: "subscribers", title: "Читатели", icon: "✉", source: "subscribers",
    lede: "Подписки на рассылку и сегменты",
    columns: [
      { k: "email", h: "Почта", main: true, sub: r => r.name },
      { k: "segment", h: "Сегмент", chip: true },
      { k: "lang", h: "Язык" },
      { k: "status", h: "Статус", chip: true },
      { k: "createdAt", h: "Подписан", date: true },
    ],
    filterKey: "segment",
    fields: [
      { k: "email", l: "Почта", req: true },
      { k: "name", l: "Имя" },
      { k: "segment", l: "Сегмент", opts: ["Общая", "Дизайн", "Мода", "Музей", "Партнёры"] },
      { k: "lang", l: "Язык", opts: ["RU", "UA", "EN", "PL", "DE", "FR", "ES"], half: true },
      { k: "status", l: "Статус", opts: ["Активен", "Пауза", "Отписан"], half: true },
      { k: "source", l: "Откуда пришёл" },
      { k: "note", l: "Заметка", area: true },
    ],
  },
  {
    id: "tasks", title: "Задачи", icon: "✓", source: "tasks",
    lede: "Что кому сделать и к какому числу",
    columns: [
      { k: "title", h: "Задача", main: true, sub: r => r.about },
      { k: "assignee", h: "Кому" },
      { k: "dueAt", h: "Срок", date: true, due: true },
      { k: "status", h: "Статус", chip: true },
    ],
    filterKey: "status",
    fields: [
      { k: "title", l: "Задача", req: true },
      { k: "about", l: "К кому относится" },
      { k: "assignee", l: "Кому", half: true },
      { k: "dueAt", l: "Срок", type: "date", half: true },
      { k: "status", l: "Статус", opts: ["Ожидание", "В работе", "Готово", "Отменена"] },
      { k: "note", l: "Детали", area: true },
    ],
  },
  {
    id: "notes", title: "Заметки", icon: "▭", source: "notes",
    lede: "Общий блокнот редакции — тот же, что в панели",
    columns: [
      { k: "text", h: "Текст", main: true },
      { k: "createdAt", h: "Создана", date: true },
      { k: "updatedAt", h: "Изменена", date: true },
    ],
    fields: [{ k: "text", l: "Текст", area: true, req: true }],
  },
  {
    id: "activities", title: "История касаний", icon: "◔", source: "activities",
    lede: "Звонки, письма и встречи — по кому и когда",
    columns: [
      { k: "about", h: "О ком", main: true, sub: r => r.text },
      { k: "kind", h: "Тип", chip: true },
      { k: "author", h: "Кто" },
      { k: "createdAt", h: "Когда", date: true },
    ],
    filterKey: "kind",
    fields: [
      { k: "about", l: "О ком или о чём", req: true },
      { k: "kind", l: "Тип", opts: ["Письмо", "Звонок", "Встреча", "Сообщение", "Заметка"] },
      { k: "author", l: "Кто" },
      { k: "text", l: "Что было", area: true },
    ],
  },
];

const sectionById = id => SECTIONS.find(s => s.id === id) || SECTIONS[0];
const rows = section => section.source === "leads"
  ? state.leads
  : ((state.doc && state.doc[section.source]) || []);

/* ── Рейка ───────────────────────────────────────────────────────────────── */
function renderRail() {
  const groups = [
    ["", ["overview"]],
    ["Люди", ["leads", "contacts"]],
    ["Деньги", ["companies", "deals", "partners"]],
    ["Аудитория", ["subscribers"]],
    ["Работа", ["tasks", "notes", "activities"]],
  ];
  $("rail").innerHTML = groups.map(([label, ids]) => {
    const head = label ? `<div class="group">${esc(label)}</div>` : "";
    return head + ids.map(id => {
      const s = sectionById(id);
      const n = s.source ? rows(s).length : "";
      return `<button data-go="${id}" class="${state.section === id ? "active" : ""}">
        <span class="ic">${s.icon}</span><span>${esc(s.title)}</span>
        ${n === "" ? "" : `<span class="count">${n}</span>`}
      </button>`;
    }).join("");
  }).join("");
}

/* ── Обзор ───────────────────────────────────────────────────────────────── */
function renderOverview() {
  const deals = rows(sectionById("deals"));
  const open = deals.filter(d => !["Выиграна", "Проиграна"].includes(d.stage));
  const pipeline = open.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const won = deals.filter(d => d.stage === "Выиграна").reduce((s, d) => s + Number(d.amount || 0), 0);
  const tasks = rows(sectionById("tasks"));
  const openTasks = tasks.filter(t => !["Готово", "Отменена"].includes(t.status));
  const late = openTasks.filter(t => (daysUntil(t.dueAt) ?? 99) < 0);
  const newLeads = state.leads.filter(l => String(l.status || "").toLowerCase() === "на рассмотрении");
  const subs = rows(sectionById("subscribers")).filter(s => s.status !== "Отписан");

  const tiles = [
    ["Питчи на рассмотрении", newLeads.length, "из " + state.leads.length + " в реестре"],
    ["Открытые сделки", open.length, fmtMoney(pipeline) + " в работе"],
    ["Выиграно", fmtMoney(won) || "0 €", "по закрытым сделкам"],
    ["Задачи", openTasks.length, late.length ? late.length + " просрочено" : "всё в срок"],
    ["Партнёры", rows(sectionById("partners")).filter(p => p.status === "Подписан").length, "подписаны"],
    ["Читатели", subs.length, "активных подписок"],
  ];

  const soon = openTasks
    .filter(t => t.dueAt)
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
    .slice(0, 6);
  const recent = rows(sectionById("activities")).slice(0, 6);

  return `
    <h2>Обзор</h2>
    <p class="lede">Что происходит в редакции прямо сейчас</p>
    <div class="tiles">
      ${tiles.map(([k, v, n]) => `<div class="tile"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="n">${esc(n)}</div></div>`).join("")}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">
      <div>
        <h2 style="font-size:15px">Ближайшие сроки</h2>
        <p class="lede">Открытые задачи с датой</p>
        <div class="table-wrap">${soon.length ? `<table><tbody>${soon.map(t => {
          const d = daysUntil(t.dueAt);
          const chip = d < 0 ? `<span class="chip red">просрочено</span>`
            : d <= 2 ? `<span class="chip amber">${d === 0 ? "сегодня" : d + " дн."}</span>`
            : `<span class="chip gray">${fmtDate(t.dueAt)}</span>`;
          return `<tr data-open="tasks:${esc(t.id)}"><td><strong>${esc(t.title)}</strong>
            <div class="muted">${esc(t.assignee || "без исполнителя")}</div></td>
            <td style="text-align:right">${chip}</td></tr>`;
        }).join("")}</tbody></table>` : `<div class="empty">Задач со сроком нет</div>`}</div>
      </div>
      <div>
        <h2 style="font-size:15px">Последние касания</h2>
        <p class="lede">Свежие записи в истории</p>
        <div class="table-wrap">${recent.length ? `<table><tbody>${recent.map(a => `
          <tr data-open="activities:${esc(a.id)}"><td><strong>${esc(a.about || "—")}</strong>
          <div class="muted">${esc((a.text || "").slice(0, 90))}</div></td>
          <td style="text-align:right" class="muted">${esc(fmtDate(a.createdAt))}</td></tr>`).join("")}</tbody></table>`
          : `<div class="empty">Пока ничего не записано</div>`}</div>
      </div>
    </div>`;
}

/* ── Канбан сделок ───────────────────────────────────────────────────────── */
function renderDeals(section) {
  const stages = ["Лид", "Переговоры", "Предложение", "Выиграна", "Проиграна"];
  const all = rows(section);
  const q = state.query.toLowerCase();
  const list = q ? all.filter(d => JSON.stringify(d).toLowerCase().includes(q)) : all;
  return `
    <h2>Сделки</h2>
    <p class="lede">${esc(section.lede)}</p>
    <div class="toolbar">
      <input type="search" id="q" placeholder="Поиск по сделкам" value="${esc(state.query)}">
      <button class="btn primary" data-new="deals">Новая сделка</button>
    </div>
    <div class="board">
      ${stages.map(st => {
        const cards = list.filter(d => (d.stage || "Лид") === st);
        const sum = cards.reduce((s, d) => s + Number(d.amount || 0), 0);
        return `<div class="col">
          <h3><span>${esc(st)}</span><span>${cards.length}${sum ? " · " + fmtMoney(sum) : ""}</span></h3>
          ${cards.map(d => `<div class="card" data-open="deals:${esc(d.id)}">
            <div class="t">${esc(d.title || "Без названия")}</div>
            <div class="m">${esc([d.company, d.format].filter(Boolean).join(" · ") || "—")}</div>
            ${d.amount ? `<div class="sum">${esc(fmtMoney(d.amount))}</div>` : ""}
            ${d.dueAt ? `<div class="m">до ${esc(fmtDate(d.dueAt))}</div>` : ""}
          </div>`).join("") || `<div class="empty" style="padding:14px">Пусто</div>`}
        </div>`;
      }).join("")}
    </div>`;
}

/* ── Таблица раздела ─────────────────────────────────────────────────────── */
function renderTable(section) {
  const all = rows(section);
  const q = state.query.toLowerCase();
  let list = q ? all.filter(r => JSON.stringify(r).toLowerCase().includes(q)) : all.slice();
  if (state.filter && section.filterKey) {
    list = list.filter(r => String(r[section.filterKey] || "") === state.filter);
  }
  const values = section.filterKey
    ? [...new Set(all.map(r => String(r[section.filterKey] || "")).filter(Boolean))].sort()
    : [];

  const cell = (r, c) => {
    if (c.date) return `<span class="muted">${esc(fmtDate(r[c.k]))}</span>`;
    if (c.money) return esc(fmtMoney(r[c.k]));
    if (c.chip) return r[c.k] ? `<span class="chip ${tone(r[c.k])}">${esc(r[c.k])}</span>` : "";
    if (c.main) {
      const sub = c.sub ? c.sub(r) : "";
      const main = String(r[c.k] || "—");
      return `<strong>${esc(main.length > 80 ? main.slice(0, 80) + "…" : main)}</strong>` +
        (sub ? `<div class="muted">${esc(sub)}</div>` : "");
    }
    return esc(r[c.k] || "");
  };

  return `
    <h2>${esc(section.title)}</h2>
    <p class="lede">${esc(section.lede2 || section.lede)}</p>
    <div class="toolbar">
      <input type="search" id="q" placeholder="Поиск" value="${esc(state.query)}">
      ${values.length ? `<select id="f"><option value="">Все</option>${values.map(v =>
        `<option ${state.filter === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : ""}
      <button class="btn primary" data-new="${section.id}">Добавить</button>
      <span style="flex:1"></span>
      <span class="muted">${list.length} из ${all.length}</span>
    </div>
    <div class="table-wrap">
      ${list.length ? `<table>
        <thead><tr>${section.columns.map(c => `<th>${esc(c.h)}</th>`).join("")}</tr></thead>
        <tbody>${list.map(r => `<tr data-open="${section.id}:${esc(r.id)}">
          ${section.columns.map(c => `<td>${cell(r, c)}</td>`).join("")}
        </tr>`).join("")}</tbody></table>`
        : `<div class="empty">Записей нет${q || state.filter ? " по этому запросу" : ""}</div>`}
    </div>`;
}

function render() {
  const section = sectionById(state.section);
  $("win-title").textContent = section.title;
  $("win-sub").textContent = section.source ? rows(section).length + " записей" : "";
  $("work").innerHTML = section.custom ? section.custom(section) : renderTable(section);
  renderRail();
  const q = $("q");
  if (q) {
    q.addEventListener("input", e => { state.query = e.target.value; renderWorkOnly(); });
  }
  const f = $("f");
  if (f) f.addEventListener("change", e => { state.filter = e.target.value; renderWorkOnly(); });
}
function renderWorkOnly() {
  const section = sectionById(state.section);
  const focus = document.activeElement && document.activeElement.id;
  const pos = focus === "q" ? document.activeElement.selectionStart : null;
  $("work").innerHTML = section.custom ? section.custom(section) : renderTable(section);
  const q = $("q");
  if (q) {
    q.addEventListener("input", e => { state.query = e.target.value; renderWorkOnly(); });
    if (focus === "q") { q.focus(); if (pos != null) q.setSelectionRange(pos, pos); }
  }
  const f = $("f");
  if (f) f.addEventListener("change", e => { state.filter = e.target.value; renderWorkOnly(); });
}

/* ── Ящик записи ─────────────────────────────────────────────────────────── */
function openRecord(sectionId, id) {
  const section = sectionById(sectionId);
  const item = rows(section).find(r => String(r.id) === String(id));
  if (!item) return;
  showDrawer(section, item, false);
}
function newRecord(sectionId) {
  showDrawer(sectionById(sectionId), { id: uid() }, true);
}

function showDrawer(section, item, isNew) {
  state.editing = { section, item: { ...item }, isNew };
  $("drawer-title").textContent = (isNew ? "Новая запись · " : "") + section.title;
  $("drawer-delete").style.display = isNew || ROLE !== "admin" ? "none" : "";

  const field = f => {
    const v = item[f.k] == null ? "" : item[f.k];
    const input = f.area
      ? `<textarea data-k="${f.k}">${esc(v)}</textarea>`
      : f.opts
        ? `<select data-k="${f.k}"><option value=""></option>${f.opts.map(o =>
            `<option ${String(v) === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
        : `<input data-k="${f.k}" type="${f.type || "text"}" value="${esc(f.type === "date" ? String(v).slice(0, 10) : v)}">`;
    return `<div class="field"><label>${esc(f.l)}${f.req ? " *" : ""}</label>${input}</div>`;
  };

  const related = (state.doc && state.doc.activities || []).filter(a =>
    String(a.about || "").toLowerCase() === String(item.name || item.title || item.email || "").toLowerCase());

  // Поля с флагом half встают парами в одну строку — форма перестаёт быть
  // километровым столбцом из «Страна», «Город», «Начало», «Продление».
  const fieldsHtml = (() => {
    const out = [];
    for (let i = 0; i < section.fields.length; i++) {
      const f = section.fields[i], n = section.fields[i + 1];
      if (f.half && n && n.half) {
        out.push(`<div class="pair">${field(f)}${field(n)}</div>`);
        i++;
      } else out.push(field(f));
    }
    return out.join("");
  })();

  $("drawer-body").innerHTML =
    fieldsHtml +
    (isNew ? "" : `
      <div class="log">
        <h4>История</h4>
        ${related.length ? related.map(a => `<div class="row">
          <span class="when">${esc(fmtDate(a.createdAt))}</span> · ${esc(a.kind || "заметка")} — ${esc(a.text || "")}
        </div>`).join("") : `<div class="row muted">Касаний не записано</div>`}
        <div style="margin-top:10px;display:flex;gap:6px">
          <input id="touch-text" placeholder="Добавить касание" style="flex:1;border:1px solid var(--line-2);border-radius:10px;padding:8px 11px;font-size:13px">
          <button class="btn" id="touch-add">В историю</button>
        </div>
        <div class="row muted" style="border:0;margin-top:8px">
          ${[item.createdAt ? "создана " + esc(fmtDate(item.createdAt)) : "",
             item.updatedAt ? "изменена " + esc(fmtDate(item.updatedAt)) : ""].filter(Boolean).join(" · ")}
        </div>
      </div>`);

  const add = $("touch-add");
  if (add) add.addEventListener("click", () => addTouch(item));

  $("scrim").classList.add("open");
  $("drawer").classList.add("open");
}

function closeDrawer() {
  state.editing = null;
  $("scrim").classList.remove("open");
  $("drawer").classList.remove("open");
}

function collectDrawer() {
  const out = { ...state.editing.item };
  $("drawer-body").querySelectorAll("[data-k]").forEach(el => {
    const key = el.getAttribute("data-k");
    const raw = el.value.trim();
    out[key] = el.type === "number" ? (raw === "" ? "" : Number(raw)) : raw;
  });
  return out;
}

async function saveDrawer() {
  const { section, isNew } = state.editing;
  const item = collectDrawer();
  const missing = section.fields.filter(f => f.req && !String(item[f.k] || "").trim());
  if (missing.length) { toast("Заполните: " + missing.map(f => f.l).join(", ")); return; }

  $("drawer-save").disabled = true;
  try {
    if (section.source === "leads") {
      // Реестр питчей живёт целым файлом — сервер принимает только весь массив.
      const next = isNew
        ? [{ addedAt: new Date().toISOString(), ...item }, ...state.leads]
        : state.leads.map(l => (String(l.id) === String(item.id) ? { ...l, ...item } : l));
      await api("/leads", { method: "POST", body: JSON.stringify({ leads: next }) });
      state.leads = next;
    } else {
      const saved = await api("/crm/entity", {
        method: "POST",
        body: JSON.stringify({ collection: section.source, item }),
      });
      const list = state.doc[section.source];
      const at = list.findIndex(r => String(r.id) === String(saved.item.id));
      if (at >= 0) list[at] = saved.item; else list.unshift(saved.item);
    }
    toast("Сохранено");
    closeDrawer();
    render();
  } catch (e) {
    toast("Не сохранилось: " + e.message);
  } finally {
    $("drawer-save").disabled = false;
  }
}

async function deleteDrawer() {
  const { section, item } = state.editing;
  if (!confirm("Удалить запись безвозвратно?")) return;
  try {
    if (section.source === "leads") {
      const next = state.leads.filter(l => String(l.id) !== String(item.id));
      await api("/leads", { method: "POST", body: JSON.stringify({ leads: next }) });
      state.leads = next;
    } else {
      await api("/crm/entity", {
        method: "POST",
        body: JSON.stringify({ collection: section.source, id: item.id, remove: true }),
      });
      state.doc[section.source] = state.doc[section.source].filter(r => String(r.id) !== String(item.id));
    }
    toast("Удалено");
    closeDrawer();
    render();
  } catch (e) {
    toast("Не удалилось: " + e.message);
  }
}

async function addTouch(item) {
  const input = $("touch-text");
  const text = input.value.trim();
  if (!text) return;
  const about = item.name || item.title || item.email || "";
  try {
    const saved = await api("/crm/entity", {
      method: "POST",
      body: JSON.stringify({
        collection: "activities",
        item: { about, kind: "Заметка", author: ROLE === "admin" ? "Редакция" : ROLE, text },
      }),
    });
    state.doc.activities.unshift(saved.item);
    input.value = "";
    toast("Записано в историю");
    showDrawer(state.editing.section, state.editing.item, false);
  } catch (e) {
    toast("Не записалось: " + e.message);
  }
}

/* ── Загрузка ────────────────────────────────────────────────────────────── */
async function loadAll() {
  $("sync-state").textContent = "загрузка…";
  const [crm, leads] = await Promise.all([
    api("/crm"),
    api("/leads").catch(() => ({ leads: [] })),   // реестр может быть недоступен — CRM это переживёт
  ]);
  state.doc = crm;
  state.leads = Array.isArray(leads.leads) ? leads.leads : [];
  $("sync-state").textContent = "синхронизировано " +
    new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  render();
}

/* ── Вход ────────────────────────────────────────────────────────────────── */
function rememberPw(pw) {
  PW = pw;
  try { localStorage.setItem(PW_KEY, btoa(pw)); } catch { /* приватный режим */ }
}
function savedPw() {
  try {
    const raw = localStorage.getItem(PW_KEY);
    return raw ? atob(raw) : "";
  } catch { return ""; }
}

async function boot() {
  try { ROLE = localStorage.getItem(ROLE_KEY) || "admin"; } catch { /* приватный режим */ }

  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.initData) {
    tg.ready();
    tg.expand();
    try {
      const res = await fetch(API + "/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      const data = await res.json();
      if (data && data.ok && data.password) {
        PW = data.password;
        if (data.role) ROLE = data.role;
        $("who").textContent = (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.first_name) || "Telegram";
        await loadAll();
        return;
      }
    } catch { /* упадём на обычный вход по паролю */ }
  }

  const pw = savedPw();
  if (pw) {
    PW = pw;
    try {
      await loadAll();
      $("who").textContent = ROLE === "editor" ? "редактор" : "администратор";
      return;
    } catch { /* пароль устарел — просим заново */ }
  }
  $("gate").classList.add("open");
  $("gate-pw").focus();
}

async function gateSubmit() {
  const pw = $("gate-pw").value.trim();
  if (!pw) return;
  $("gate-err").textContent = "";
  $("gate-go").disabled = true;
  PW = pw;
  try {
    await loadAll();
    rememberPw(pw);
    $("who").textContent = ROLE === "editor" ? "редактор" : "администратор";
    $("gate").classList.remove("open");
  } catch (e) {
    $("gate-err").textContent = e.message === "invalid password" ? "Пароль не подошёл" : e.message;
  } finally {
    $("gate-go").disabled = false;
  }
}

/* ── События ─────────────────────────────────────────────────────────────── */
document.addEventListener("click", e => {
  const go = e.target.closest("[data-go]");
  if (go) {
    state.section = go.getAttribute("data-go");
    state.query = ""; state.filter = "";
    render();
    return;
  }
  const open = e.target.closest("[data-open]");
  if (open) {
    const [sec, id] = open.getAttribute("data-open").split(":");
    openRecord(sec, id);
    return;
  }
  const add = e.target.closest("[data-new]");
  if (add) newRecord(add.getAttribute("data-new"));
});

$("gate-go").addEventListener("click", gateSubmit);
$("gate-pw").addEventListener("keydown", e => { if (e.key === "Enter") gateSubmit(); });
$("drawer-close").addEventListener("click", closeDrawer);
$("scrim").addEventListener("click", closeDrawer);
$("drawer-save").addEventListener("click", saveDrawer);
$("drawer-delete").addEventListener("click", deleteDrawer);
$("btn-refresh").addEventListener("click", () => loadAll().catch(e => toast(e.message)));
$("btn-admin").addEventListener("click", () => { location.href = "/admin/"; });
$("btn-exit").addEventListener("click", () => {
  try { localStorage.removeItem(PW_KEY); } catch { /* приватный режим */ }
  location.reload();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

boot().catch(e => {
  $("gate").classList.add("open");
  $("gate-err").textContent = e.message;
});
