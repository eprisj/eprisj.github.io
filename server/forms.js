"use strict";

/* EPRIS FORMS — анкеты для авторов.
 *
 * Зачем свой механизм, а не Google Forms: анкета автора — это редакционный
 * документ. Он содержит имя, почту, иногда гонорарные и паспортные данные, и
 * отдавать его чужому сервису значит терять контроль над тем, где эти данные
 * лежат и кто их видит. Плюс ответы нужны РЯДОМ с материалом — в той же
 * админке, где редактор ведёт статью, а не в отдельной вкладке чужого сайта.
 *
 * Отдельный процесс, как у Interview Studio: выкат сайта перезапускает
 * deploy-webhook несколько раз в день, и незачем ронять вместе с ним приём
 * ответов, который может идти в этот момент.
 *
 * Хранение — файлы JSON, по одному на форму и по одному на пачку ответов.
 * База данных здесь не окупается: форм десятки, ответов сотни, а файл можно
 * скопировать, прочитать глазами и положить в бэкап без дампов.
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");

const ROOT = process.env.FORMS_DIR || "/opt/epris-forms";
const FORMS_DIR = path.join(ROOT, "forms");
const RESPONSES_DIR = path.join(ROOT, "responses");
const UPLOADS_DIR = path.join(ROOT, "uploads");

/* ФАЙЛЫ АВТОРА.
 *
 * Портфолио, макеты, оригиналы фотографий — то, ради чего анкету и заводят.
 * Формально «без ограничений» не бывает: на диске VPS шесть с небольшим
 * свободных гигабайт, и анкета, забившая его под ноль, уронит вместе с собой
 * сайт, радио и админку. Поэтому пределы щедрые, но названные, и они
 * настраиваются переменными окружения без правки кода:
 *   FORMS_MAX_FILE_MB     — один файл (по умолчанию 512 МБ)
 *   FORMS_MAX_RESPONSE_MB — все файлы одного ответа (по умолчанию 2 ГБ)
 *   FORMS_MIN_FREE_GB     — сколько места на диске беречь (по умолчанию 2 ГБ)
 * Тип файла не ограничен вовсе: «любые» здесь означает буквально любые. Файл
 * никогда не отдаётся по прямому пути и не исполняется — он лежит под
 * случайным именем и скачивается только редакцией, по паролю. */
const MAX_FILE_BYTES = Math.round((Number(process.env.FORMS_MAX_FILE_MB) || 512) * 1024 * 1024);
const MAX_RESPONSE_BYTES = Math.round((Number(process.env.FORMS_MAX_RESPONSE_MB) || 2048) * 1024 * 1024);
const MIN_FREE_BYTES = Math.round((Number(process.env.FORMS_MIN_FREE_GB) || 2) * 1024 * 1024 * 1024);
/* Файл, загруженный и брошенный (человек передумал отправлять анкету), живёт
   сутки. Иначе диск копит чужие черновики вечно. */
const ORPHAN_FILE_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_BODY_BYTES = 512 * 1024;      // анкета — это текст, не медиатека
const MAX_FIELDS = 60;
const MAX_ANSWER_CHARS = 8000;
const DEFAULT_MAX_LENGTH = 5000;
const MAX_RESPONSES_PER_FORM = 5000;
/* Один IP — десять ответов в час. Живой автор столько не отправляет, а
   скрипту этого мало, чтобы засорить анкету. */
const RATE_LIMIT_PER_HOUR = 10;

const FIELD_TYPES = new Set([
  "short-text", "long-text", "email", "url", "number", "date",
  "single-choice", "multi-choice", "consent", "section", "files",
  /* Картинка в анкете — не вопрос, а часть текста: пример макета, обложка
     номера, схема проезда. Ответа не требует и в выгрузку не попадает. */
  "image",
]);

function ensureDirs() {
  for (const dir of [ROOT, FORMS_DIR, RESPONSES_DIR, UPLOADS_DIR]) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* уже есть */ }
  }
}
ensureDirs();

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomBytes(9).toString("hex");
const clean = (value, max = 300) => String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
const cleanMultiline = (value, max = MAX_ANSWER_CHARS) => String(value == null ? "" : value).replace(/\r\n/g, "\n").trim().slice(0, max);

/* Ссылка на анкету должна читаться и диктоваться по телефону, поэтому slug —
   из букв заголовка, а не случайная строка.

   Кириллический заголовок превращать в транслит («anketa-avtora-osennyi-nomer»)
   — плохой выход: такую ссылку не прочитает ни русскоязычный, ни иностранный
   автор, а именно её отправляют людям, для которых журнал англоязычный.
   Поэтому заголовок на кириллице даёт короткий английский адрес по словарю
   ходовых слов анкет, а редактор всегда может задать свой явно. */
const TRANSLIT = {
  а:"a",б:"b",в:"v",г:"g",ґ:"g",д:"d",е:"e",є:"ie",ж:"zh",з:"z",и:"y",і:"i",ї:"i",й:"i",к:"k",л:"l",м:"m",
  н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"iu",я:"ia",
};
/* Словарь на те слова, из которых редакция реально составляет названия
   анкет. Промахнулись — редактор правит адрес руками, поле для этого есть. */
const SLUG_WORDS = {
  анкета: "questionnaire", анкети: "questionnaire", анкета_автора: "author-questionnaire",
  автор: "author", автора: "author", авторов: "authors", авторська: "author",
  интервью: "interview", интервʼю: "interview", інтервю: "interview", інтерв: "interview",
  вопросы: "questions", питання: "questions", опрос: "survey", опитування: "survey",
  заявка: "application", заявки: "application", подача: "submission", матеріал: "story",
  материал: "story", статья: "story", стаття: "story", номер: "issue", выпуск: "issue",
  осенний: "autumn", осінній: "autumn", зимний: "winter", весенний: "spring", летний: "summer",
  фото: "photo", фотограф: "photographer", портфолио: "portfolio", портфоліо: "portfolio",
  редакция: "editorial", редакція: "editorial", обратная: "feedback", связь: "feedback",
  сотрудничество: "collaboration", співпраця: "collaboration", участие: "participation",
};

function slugify(value) {
  const raw = String(value || "").toLowerCase().trim();
  const latin = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // Заголовок уже латиницей — берём как есть, ничего не выдумывая.
  if (latin.length >= 3) return latin.slice(0, 60);

  const words = raw.split(/[^a-zа-яёіїєґ0-9]+/i).filter(Boolean);
  const mapped = words.map((word) => SLUG_WORDS[word] || "").filter(Boolean);
  if (mapped.length) return [...new Set(mapped)].join("-").slice(0, 60);

  const translit = raw.split("").map((ch) => TRANSLIT[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return translit.slice(0, 60) || `form-${newId().slice(0, 6)}`;
}

const formPath = (id) => path.join(FORMS_DIR, `${id}.json`);
const responsesPath = (id) => path.join(RESPONSES_DIR, `${id}.json`);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
/* Запись через временный файл: половина анкеты на диске хуже, чем её
   отсутствие, а отключение питания посреди fs.writeFile даёт именно её. */
async function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
  await fsp.rename(tmp, file);
}

function listForms() {
  ensureDirs();
  return fs.readdirSync(FORMS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(path.join(FORMS_DIR, name), null))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

/* Поиск анкеты по адресу учитывает и прежние адреса.

   Адрес анкеты меняют по делу: «interview-abbie-downey/abbie-downey» читается
   с дублем имени, а «interview/abbie-downey» нет. Но письмо со старой ссылкой
   уже ушло, и оно должно открываться и через год. Прежние адреса копятся в
   aliases и работают наравне с нынешним. */
function findFormBySlug(slug) {
  const target = clean(slug, 80).toLowerCase();
  const forms = listForms();
  return forms.find((form) => String(form.slug).toLowerCase() === target)
    || forms.find((form) => (form.aliases || []).some((alias) => String(alias).toLowerCase() === target))
    || null;
}

function readResponses(formId) {
  const stored = readJson(responsesPath(formId), null);
  return Array.isArray(stored?.responses) ? stored.responses : [];
}

async function writeResponses(formId, responses) {
  await writeJsonAtomic(responsesPath(formId), { formId, updatedAt: nowIso(), responses });
}

/* ЖУРНАЛ ПРИЁМА: КАЖДЫЙ ОТВЕТ ПИШЕТСЯ ДВАЖДЫ.
 *
 * Основной файл анкеты перезаписывается целиком, и это нормально, пока пишет
 * кто-то один. Но ответ может прийти и во время выката, и одновременно со
 * вторым ответом, и в момент, когда на разделе кончается место, — а человек по
 * ту сторону уже увидел «спасибо» и второй раз анкету не пришлёт.
 *
 * Поэтому рядом ведётся журнал: одна строка JSON на ответ, только дозапись,
 * ничего никогда не перезаписывается. Он не используется при обычной работе и
 * нужен ровно для одного случая: если ответ пропал из основного файла, он
 * лежит здесь целиком, вместе с временем приёма.                            */
function responsesLogPath(formId) {
  return path.join(RESPONSES_DIR, `${formId}.log.jsonl`);
}

function appendResponseLog(formId, response) {
  try {
    ensureDirs();
    fs.appendFileSync(responsesLogPath(formId), JSON.stringify(response) + "\n");
  } catch (error) {
    // Журнал — страховка, а не условие приёма: его отказ не должен отменять
    // уже принятый ответ.
    console.error("[forms] response log failed", formId, error.message);
  }
}

function readResponseLog(formId) {
  try {
    return fs.readFileSync(responsesLogPath(formId), "utf8")
      .split("\n").filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

/* ПРИЁМ ОТВЕТА ПО ОЧЕРЕДИ.
 *
 * Раньше приём был «прочитать файл целиком, добавить ответ, записать целиком».
 * Два человека, нажавшие «отправить» в одну и ту же секунду, читали один и тот
 * же список, и тот, кто записал позже, затирал чужой ответ. Никакой ошибки при
 * этом не появлялось: оба видели «спасибо», а в панель приходил один.
 *
 * Очередь на анкету выстраивает такие записи в цепочку. Внутри процесса этого
 * достаточно: служба одна и работает в одном экземпляре.                     */
const responseQueues = new Map();

function appendResponse(formId, response) {
  const previous = responseQueues.get(formId) || Promise.resolve();
  const next = previous.then(async () => {
    appendResponseLog(formId, response);
    const all = readResponses(formId);
    all.push(response);
    await writeResponses(formId, all);
    return all.length;
  }).catch((error) => {
    console.error("[forms] append failed", formId, error.message);
    throw error;
  });
  /* В карте лежит «хвост» очереди, а не результат: ошибка одной записи не
     должна рвать цепочку для следующих ответов. */
  const tail = next.catch(() => {});
  responseQueues.set(formId, tail);
  tail.then(() => { if (responseQueues.get(formId) === tail) responseQueues.delete(formId); });
  return next;
}


/* ── Файлы ────────────────────────────────────────────────────────────────── */
const uploadDirFor = (formId) => path.join(UPLOADS_DIR, String(formId));
const uploadPath = (formId, fileId) => path.join(uploadDirFor(formId), fileId);

function freeBytes() {
  try {
    const stat = fs.statfsSync(ROOT);
    return stat.bavail * stat.bsize;
  } catch {
    // Нет statfs — не притворяемся, что места нет: проверку просто пропускаем.
    return Number.MAX_SAFE_INTEGER;
  }
}

function diskHasRoom(expectedBytes = 0) {
  return freeBytes() - expectedBytes > MIN_FREE_BYTES;
}

/* Имя файла показывается редактору, но НЕ участвует в пути на диске: путь
   строится из случайного идентификатора. Иначе «../../etc/passwd» в имени
   стал бы путём, а два автора с «portfolio.pdf» затёрли бы друг друга. */
function safeFileName(name) {
  const cleaned = String(name || "file").replace(/[\r\n\t]/g, " ").replace(/[/\\]/g, "-").trim();
  return cleaned.slice(0, 180) || "file";
}

function fileMeta(formId, fileId) {
  const meta = readJson(`${uploadPath(formId, fileId)}.json`, null);
  return meta && meta.id === fileId ? meta : null;
}

async function saveFileMeta(formId, meta) {
  await writeJsonAtomic(`${uploadPath(formId, meta.id)}.json`, meta);
}

/* Файлы, на которые не сослался ни один ответ, — это брошенные черновики.
   Собираются раз в час и после суток жизни удаляются вместе с описанием. */
function sweepOrphanFiles() {
  ensureDirs();
  let removed = 0;
  for (const formDir of fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })) {
    if (!formDir.isDirectory()) continue;
    const formId = formDir.name;
    const used = new Set();
    for (const response of readResponses(formId)) {
      for (const value of Object.values(response.answers || {})) {
        if (Array.isArray(value)) for (const item of value) if (item && item.fileId) used.add(item.fileId);
      }
    }
    for (const entry of fs.readdirSync(uploadDirFor(formId))) {
      if (entry.endsWith(".json")) continue;
      if (used.has(entry)) continue;
      const file = uploadPath(formId, entry);
      try {
        if (Date.now() - fs.statSync(file).mtimeMs < ORPHAN_FILE_TTL_MS) continue;
        fs.unlinkSync(file);
        fs.rmSync(`${file}.json`, { force: true });
        removed += 1;
      } catch { /* уже удалён */ }
    }
  }
  return removed;
}

/* Ответ удаляют вместе с приложенными файлами: иначе «удалить ответ» означало
   бы «спрятать текст, оставив портфолио на диске навсегда». */
function removeResponseFiles(formId, response) {
  for (const value of Object.values(response?.answers || {})) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || !item.fileId) continue;
      try {
        fs.rmSync(uploadPath(formId, item.fileId), { force: true });
        fs.rmSync(`${uploadPath(formId, item.fileId)}.json`, { force: true });
      } catch { /* уже удалён */ }
    }
  }
}

/* ── Нормализация формы ─────────────────────────────────────────────────────
   Всё, что приходит из админки, приводится к известной форме здесь, а не в
   браузере: анкета живёт годами и переживает несколько версий редактора. */
function normaliseField(raw, index) {
  const type = FIELD_TYPES.has(raw?.type) ? raw.type : "short-text";
  const options = Array.isArray(raw?.options)
    ? raw.options.map((option) => clean(option, 160)).filter(Boolean).slice(0, 30)
    : [];
  /* «Ограничения нет» и «ограничение равно нулю» — разные вещи, и Number()
     их не различает: Number(null) даёт 0, а зажим в допустимый диапазон
     превращал этот ноль в единицу. Так у анкеты, пересохранённой без явных
     настроек, все поля получили предел в ОДИН символ, и человек видел
     счётчик «0 / 1», не в силах написать ни слова.

     Пустое значение любого вида означает отсутствие ограничения. */
  const num = (value, min, max) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(min, Math.min(max, Math.round(parsed)));
  };
  /* УСЛОВНЫЙ ПОКАЗ.
     Половина вопросов в анкете нужна не всем: «какой у вас формат съёмки»
     спрашивают только фотографа. Раньше редакция обходила это двумя анкетами
     и двумя ссылками; теперь вопрос показывается, когда в другом выбран
     нужный вариант. Условие хранится ссылкой на поле и значение. */
  const showIf = raw?.showIf && clean(raw.showIf.fieldId, 40)
    ? { fieldId: clean(raw.showIf.fieldId, 40), value: clean(raw.showIf.value, 160) }
    : null;
  return {
    id: clean(raw?.id, 40) || `f${index + 1}-${newId().slice(0, 4)}`,
    type,
    label: clean(raw?.label, 300) || `Вопрос ${index + 1}`,
    hint: clean(raw?.hint, 400),
    /* У согласия в подписи стоит не подсказка, а сам текст разрешения: это
       юридическая формулировка, и обрезать её на ста шестидесяти знаках
       значит опубликовать половину условия. */
    placeholder: clean(raw?.placeholder, type === "consent" ? 1500 : 160),
    // У раздела и согласия обязательность смысла не имеет — у первого нет
    // ответа, у второго она означает «нельзя отправить без галочки».
    required: (type === "section" || type === "image") ? false : Boolean(raw?.required),
    imageUrl: type === "image" ? clean(raw?.imageUrl, 500) : "",
    options: (type === "single-choice" || type === "multi-choice") ? options : [],
    /* Рамки ответа. Пустое значение означает «без ограничения» — это не то же
       самое, что ноль, поэтому null, а не 0. */
    minLength: ["short-text", "long-text"].includes(type) ? num(raw?.minLength, 0, 20000) : null,
    /* Верхняя граница по умолчанию щедрая: пять тысяч знаков это примерно
       страница с четвертью, и развёрнутый ответ на вопрос интервью в неё
       укладывается с запасом. Предел нужен не чтобы ограничить человека, а
       чтобы вставленная по ошибке книга не легла в анкету целиком. */
    maxLength: ["short-text", "long-text"].includes(type)
      ? (num(raw?.maxLength, 1, 20000) ?? DEFAULT_MAX_LENGTH)
      : null,
    min: type === "number" ? num(raw?.min, -1e9, 1e9) : null,
    max: type === "number" ? num(raw?.max, -1e9, 1e9) : null,
    maxFiles: type === "files" ? num(raw?.maxFiles, 1, 30) : null,
    accept: type === "files" ? clean(raw?.accept, 160) : "",
    showIf,
  };
}

/* ПОКАЗАТЬ АНКЕТУ ДО ТОГО, КАК ЕЁ ОТКРЫЛИ.
 *
 * Черновик отвечал «анкета закрыта» всем, включая саму редакцию: посмотреть,
 * как вопросы выглядят глазами автора, можно было только открыв приём — то
 * есть согласившись принимать ответы раньше, чем анкета готова. Предпросмотр
 * в панели упирался в то же самое.
 *
 * Ссылка вида /form/<slug>?preview=<токен> показывает черновик, не открывая
 * приёма: отправить по ней ничего нельзя, форма помечена как предпросмотр.
 * Токен постоянный и выводится из идентификатора анкеты, поэтому у каждой
 * анкеты он свой и не меняется от правки к правке. Секретом он не является:
 * он защищает от случайного захода, а не от целенаправленного поиска, ровно
 * как ссылки на черновики статей.                                           */
function previewTokenFor(form) {
  return crypto.createHash("sha256")
    .update(`epris-form-preview:${form.id}`)
    .digest("hex")
    .slice(0, 24);
}

function matchesFormPreview(form, token) {
  const given = clean(token, 40);
  return Boolean(given) && given === previewTokenFor(form);
}

function normaliseForm(raw, existing = null) {
  const title = clean(raw?.title, 200) || existing?.title || "Анкета автора";
  const id = existing?.id || clean(raw?.id, 40) || newId();
  const requestedSlug = clean(raw?.slug, 80);
  const fields = Array.isArray(raw?.fields) ? raw.fields.slice(0, MAX_FIELDS).map(normaliseField) : (existing?.fields || []);
  const status = ["draft", "open", "closed"].includes(raw?.status) ? raw.status : (existing?.status || "draft");
  const access = ["link", "invite"].includes(raw?.access) ? raw.access : (existing?.access || "link");
  const slug = slugify(requestedSlug || existing?.slug || title);
  /* Прежний адрес запоминается ровно в момент переименования. Список короткий:
     повторные правки одного и того же адреса не плодят дублей. */
  const aliases = Array.from(new Set([
    ...(Array.isArray(existing?.aliases) ? existing.aliases : []),
    ...(existing?.slug && existing.slug !== slug ? [existing.slug] : []),
  ])).filter((alias) => alias !== slug).slice(0, 10);

  return {
    id,
    slug,
    aliases,
    title,
    description: cleanMultiline(raw?.description, 2000) || existing?.description || "",
    /* Что автор увидит после отправки. Пустая страница «спасибо» — самый
       частый способ заставить человека отправить анкету дважды. */
    thankYou: cleanMultiline(raw?.thankYou, 800) || existing?.thankYou || "",
    language: clean(raw?.language, 5).toUpperCase() || existing?.language || "EN",
    status,
    access,
    /* Анкета закрывается сама: по дате или по числу ответов. Без этого
       редакция вспоминает закрыть приём через месяц после дедлайна, и автор
       присылает работу в пустоту. */
    closesAt: clean(raw?.closesAt, 40) || existing?.closesAt || "",
    maxResponses: Number.isFinite(Number(raw?.maxResponses)) && Number(raw?.maxResponses) > 0
      ? Math.min(MAX_RESPONSES_PER_FORM, Math.round(Number(raw.maxResponses)))
      : (existing?.maxResponses || 0),
    fields,
    invites: Array.isArray(existing?.invites) ? existing.invites : [],
    // По умолчанию блок поддержки показывается везде; выключается осознанно.
    supportNote: raw?.supportNote === false ? false : (existing?.supportNote === false ? false : true),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}


/* ПОДДЕРЖКА ПРОЕКТА, ОДИН РАЗ И ВО ВСЕХ АНКЕТАХ.
 *
 * Публикация в журнале бесплатна, и это важно сказать вслух: человек,
 * заполняющий анкету, обычно не знает, попросят ли с него денег, и на всякий
 * случай ждёт подвоха. Строчка про бесплатность снимает этот вопрос сразу.
 *
 * Реквизиты идут следом и намеренно тихо: мелким шрифтом, под чертой, после
 * всех вопросов. Это приглашение, а не условие, поэтому блок не мигает, ничего
 * не требует и не мешает отправить анкету.
 *
 * Живёт здесь, а не в тексте каждой анкеты: реквизиты меняются редко, но
 * менять их в десяти местах никто не станет, и половина форм останется со
 * старыми. Отключается для отдельной анкеты полем supportNote: false.       */
const SUPPORT_NOTE = {
  free: {
    EN: "Publication in EPRIS Journal is free. We never charge authors or designers for being published.",
    RU: "Публикация в EPRIS Journal бесплатна. Мы никогда не берём денег с авторов и дизайнеров за публикацию.",
    UA: "Публікація в EPRIS Journal безкоштовна. Ми ніколи не беремо грошей з авторів і дизайнерів за публікацію.",
  },
  invite: {
    EN: "If you would like to support the journal, it helps us keep it independent:",
    RU: "Если захотите поддержать журнал, это помогает сохранять его независимым:",
    UA: "Якщо захочете підтримати журнал, це допомагає зберігати його незалежним:",
  },
  methods: [
    { label: "PayPal", value: "munister@outlook.com" },
    { label: "Card", value: "4149 5100 2837 6350", note: "MUNISTER VIACHESLAV" },
    { label: "IBAN", value: "UA733003350000002620715221312" },
  ],
};

function supportNoteFor(language) {
  const lang = String(language || "EN").toUpperCase();
  const pick = (dict) => dict[lang] || dict.EN;
  return {
    free: pick(SUPPORT_NOTE.free),
    invite: pick(SUPPORT_NOTE.invite),
    methods: SUPPORT_NOTE.methods,
  };
}

/* Публичный вид анкеты: без приглашений и без служебных полей. Отдавать
   наружу целиком объект формы значило бы раздать все токены приглашений. */
function publicForm(form) {
  return {
    id: form.id, slug: form.slug, title: form.title, description: form.description,
    thankYou: form.thankYou, language: form.language, status: form.status,
    access: form.access, fields: form.fields,
    closesAt: form.closesAt || "", maxResponses: form.maxResponses || 0,
    support: form.supportNote === false ? null : supportNoteFor(form.language),
  };
}

/* Анкета может быть открыта, но уже не принимать: вышел срок или набрано
   нужное число ответов. Причина возвращается наружу, чтобы страница написала
   человеку по-человечески, а не «403». */
function formClosedReason(form) {
  if (form.closesAt) {
    const deadline = Date.parse(form.closesAt);
    if (Number.isFinite(deadline) && deadline < Date.now()) return "deadline passed";
  }
  if (form.maxResponses && readResponses(form.id).length >= form.maxResponses) return "response limit reached";
  return "";
}

/* ── Проверка ответа ────────────────────────────────────────────────────────
   Проверяем на сервере, а не только в браузере: форма открыта миру, и до
   диска доходит ровно то, что мы согласились принять. */
/* Виден ли вопрос при таких ответах. Скрытый вопрос не спрашивают — и не
   требуют: иначе анкета отказывалась бы отправляться из-за поля, которого
   автор в глаза не видел. */
function fieldVisible(field, answers) {
  if (!field.showIf || !field.showIf.fieldId) return true;
  const source = answers?.[field.showIf.fieldId];
  if (Array.isArray(source)) return source.includes(field.showIf.value);
  if (typeof source === "boolean") return source === (field.showIf.value === "true" || field.showIf.value === "да");
  return String(source ?? "") === field.showIf.value;
}

function validateAnswers(form, rawAnswers) {
  const answers = {};
  const errors = [];
  for (const field of form.fields) {
    if (field.type === "section" || field.type === "image") continue;
    if (!fieldVisible(field, rawAnswers)) { answers[field.id] = ""; continue; }
    const raw = rawAnswers?.[field.id];
    let value;
    if (field.type === "multi-choice") {
      const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      value = list.map((item) => clean(item, 160)).filter((item) => field.options.includes(item)).slice(0, 30);
      if (field.required && !value.length) errors.push(field.label);
    } else if (field.type === "single-choice") {
      value = clean(raw, 160);
      if (value && !field.options.includes(value)) value = "";
      if (field.required && !value) errors.push(field.label);
    } else if (field.type === "files") {
      /* В ответе приходят не сами файлы, а ссылки на уже загруженные. Каждую
         сверяем с описанием на диске: без этого можно было бы приписать
         своему ответу чужой файл, подставив его идентификатор. */
      const list = Array.isArray(raw) ? raw : [];
      value = list.slice(0, field.maxFiles || 30).map((item) => {
        const meta = fileMeta(form.id, clean(item?.fileId, 40));
        return meta ? { fileId: meta.id, name: meta.name, size: meta.size, type: meta.type } : null;
      }).filter(Boolean);
      if (field.required && !value.length) errors.push(field.label);
    } else if (field.type === "consent") {
      value = Boolean(raw);
      if (field.required && !value) errors.push(field.label);
    } else if (field.type === "number") {
      value = raw === "" || raw == null ? "" : String(Number(raw));
      if (value === "NaN") value = "";
      if (field.required && value === "") errors.push(field.label);
      if (value !== "") {
        const parsed = Number(value);
        if (field.min !== null && field.min !== undefined && parsed < field.min) errors.push(`${field.label} — не меньше ${field.min}`);
        if (field.max !== null && field.max !== undefined && parsed > field.max) errors.push(`${field.label} — не больше ${field.max}`);
      }
    } else if (field.type === "email") {
      value = clean(raw, 200).toLowerCase();
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) errors.push(`${field.label} — неверный адрес`);
      else if (field.required && !value) errors.push(field.label);
    } else {
      value = field.type === "long-text" ? cleanMultiline(raw) : clean(raw, 500);
      if (field.required && !value) errors.push(field.label);
      else if (value) {
        if (field.minLength && value.length < field.minLength) errors.push(`${field.label} — не короче ${field.minLength} знаков`);
        if (field.maxLength && value.length > field.maxLength) value = value.slice(0, field.maxLength);
      }
    }
    answers[field.id] = value;
  }
  return { answers, errors };
}

/* IP не храним. Для ограничения частоты хватает отпечатка: он позволяет
   отличить один источник от другого и бесполезен для установления личности. */
function ipFingerprint(ip) {
  return crypto.createHash("sha256").update(`epris-forms:${ip || "unknown"}`).digest("hex").slice(0, 16);
}

function tooManyRecent(responses, fingerprint) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = responses.filter((item) => item.source === fingerprint && Date.parse(item.submittedAt) > hourAgo);
  return recent.length >= RATE_LIMIT_PER_HOUR;
}

function csvEscape(value) {
  const list = Array.isArray(value)
    // Файлы в таблице — это их имена: идентификатор на диске в отчёте не нужен.
    ? value.map((item) => (item && typeof item === "object" && item.name ? item.name : item))
    : null;
  const text = list ? list.join("; ") : String(value == null ? "" : value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function responsesCsv(form, responses) {
  const columns = form.fields.filter((field) => field.type !== "section" && field.type !== "image");
  const header = ["submittedAt", "invite", ...columns.map((field) => field.label)];
  const rows = responses.map((response) => [
    response.submittedAt,
    response.inviteLabel || "",
    ...columns.map((field) => response.answers?.[field.id] ?? ""),
  ]);
  // BOM — иначе Excel открывает кириллицу как «ÐÐ½ÐºÐµÑ‚Ð°».
  return "﻿" + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

/* ПИСЬМО РЕДАКЦИИ О НОВОМ ОТВЕТЕ.
 *
 * Служба принимала анкету молча: файл ложился на диск, и узнать об этом можно
 * было, только открыв панель и нажав «ответы». Автор при этом уже ждёт реакции.
 *
 * Письмо отправляется вручную по SMTP, без библиотеки: одно соединение, четыре
 * команды, текст без вложений. Тянуть зависимость (и потом обновлять её на
 * машине, где живут ещё четыре проекта) ради этого не стоит.
 *
 * Уведомление НИКОГДА не влияет на приём: почта отвалилась, ящик переполнен,
 * настроек нет — ответ всё равно принят и лежит на диске. Поэтому отправка
 * идёт после ответа автору и её ошибки только пишутся в журнал.             */
const net = require("net");
const tls = require("tls");

const MAIL = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") !== "false",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASSWORD || "",
  from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  to: process.env.FORMS_NOTIFY_TO || "",
};

function mailConfigured() {
  return Boolean(MAIL.host && MAIL.user && MAIL.pass && MAIL.from && MAIL.to);
}

function encodeHeader(value) {
  // Тема с кириллицей без кодировки приезжает набором вопросительных знаков.
  return /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function smtpSend({ to, subject, text }) {
  return new Promise((resolve, reject) => {
    const socket = MAIL.secure
      ? tls.connect({ host: MAIL.host, port: MAIL.port, servername: MAIL.host })
      : net.connect({ host: MAIL.host, port: MAIL.port });
    socket.setTimeout(15000);

    const body = [
      `From: ${MAIL.from}`,
      `To: ${to}`,
      `Subject: ${encodeHeader(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n"),
    ].join("\r\n");

    /* Каждая строка — «команда и код, который сервер должен ответить». Держать
       их списком проще, чем цепочкой колбэков: видно весь диалог целиком. */
    const steps = [
      { send: "EHLO eprisjournal.com", expect: 250 },
      { send: "AUTH LOGIN", expect: 334 },
      { send: Buffer.from(MAIL.user).toString("base64"), expect: 334 },
      { send: Buffer.from(MAIL.pass).toString("base64"), expect: 235 },
      { send: `MAIL FROM:<${MAIL.from}>`, expect: 250 },
      { send: `RCPT TO:<${to}>`, expect: 250 },
      { send: "DATA", expect: 354 },
      { send: `${body}\r\n.`, expect: 250 },
      { send: "QUIT", expect: 221 },
    ];

    let index = -1;          // -1 = ждём приветствие сервера
    let buffer = "";
    let done = false;

    const finish = (error) => {
      if (done) return;
      done = true;
      socket.destroy();
      error ? reject(error) : resolve(true);
    };

    socket.on("timeout", () => finish(new Error("smtp timeout")));
    socket.on("error", (error) => finish(error));
    socket.on("close", () => finish(done ? null : new Error("smtp closed early")));

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      /* Ответ SMTP бывает многострочным: продолжение помечено дефисом после
         кода («250-SIZE»), последняя строка — пробелом («250 OK»). Пока не
         пришла она, отвечать рано. */
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (!/^\d{3} /.test(last)) return;
      buffer = "";

      const code = Number(last.slice(0, 3));
      const expected = index < 0 ? 220 : steps[index].expect;
      if (code !== expected) return finish(new Error(`smtp expected ${expected}, got: ${last.trim()}`));

      index += 1;
      if (index >= steps.length) return finish(null);
      socket.write(steps[index].send + "\r\n");
    });
  });
}

function answerPreview(form, response) {
  const asked = (form.fields || []).filter((field) => field.type !== "section" && field.type !== "image");
  return asked.map((field) => {
    const value = response.answers?.[field.id];
    const shown = Array.isArray(value)
      ? value.map((item) => item?.name || item).join(", ")
      : String(value ?? "");
    return `${field.label}\n${shown.trim() || "(пусто)"}`;
  }).join("\n\n");
}

/* ТЕЛЕГРАМ КАК ВТОРОЙ КАНАЛ.
 *
 * Почта требует чужого сервера и его настроек; телеграм — токена бота и номера
 * чата, и включается за пару минут. Каналы независимы: настроен один — работает
 * один, настроены оба — придёт и туда, и туда, потому что «ответ пришёл» лучше
 * увидеть дважды, чем не увидеть вовсе.                                      */
const TELEGRAM = {
  token: process.env.FORMS_TELEGRAM_TOKEN || "",
  chat: process.env.FORMS_TELEGRAM_CHAT || "",
};

function telegramConfigured() {
  return Boolean(TELEGRAM.token && TELEGRAM.chat);
}

async function telegramSend(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM.token}/sendMessage`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      // Без разметки: в ответах бывают любые символы, и падать из-за чужого
      // текста уведомление не должно.
      body: JSON.stringify({ chat_id: TELEGRAM.chat, text: text.slice(0, 3900), disable_web_page_preview: true }),
    });
    const data = await response.json().catch(() => null);
    if (!data?.ok) throw new Error(data?.description || `HTTP ${response.status}`);
    return true;
  } finally { clearTimeout(timer); }
}

async function notifyNewResponse(form, response, total) {
  if (!mailConfigured() && !telegramConfigured()) return false;
  const text = [
    `Анкета: ${form.title}`,
    `Ответ №${total}, принят ${response.submittedAt}`,
    response.inviteLabel ? `Персональная ссылка: ${response.inviteLabel}` : "",
    "",
    `Открыть в панели: https://eprisjournal.com/admin/#forms`,
    "",
    "————",
    "",
    answerPreview(form, response),
  ].filter((line) => line !== "").join("\n");

  /* Оба канала запускаются вместе и падают порознь: отказ почты не должен
     отменять телеграм, и наоборот. */
  const attempts = [];
  if (mailConfigured()) {
    attempts.push(smtpSend({ to: MAIL.to, subject: `Новый ответ: ${form.title}`, text })
      .catch((error) => { console.error("[forms] mail notify failed", error.message); return false; }));
  }
  if (telegramConfigured()) {
    attempts.push(telegramSend(text)
      .catch((error) => { console.error("[forms] telegram notify failed", error.message); return false; }));
  }
  const results = await Promise.all(attempts);
  return results.some(Boolean);
}

module.exports = {
  ROOT, FORMS_DIR, RESPONSES_DIR, UPLOADS_DIR, MAX_BODY_BYTES, MAX_RESPONSES_PER_FORM, FIELD_TYPES,
  MAX_FILE_BYTES, MAX_RESPONSE_BYTES, MIN_FREE_BYTES,
  uploadDirFor, uploadPath, freeBytes, diskHasRoom, safeFileName, fileMeta, saveFileMeta,
  sweepOrphanFiles, removeResponseFiles,
  ensureDirs, nowIso, newId, clean, cleanMultiline, slugify,
  formPath, responsesPath, readJson, writeJsonAtomic,
  listForms, findFormBySlug, readResponses, writeResponses,
  appendResponse, readResponseLog, responsesLogPath, notifyNewResponse, mailConfigured, telegramConfigured,
  normaliseForm, publicForm, validateAnswers, previewTokenFor, matchesFormPreview, fieldVisible, formClosedReason, supportNoteFor,
  ipFingerprint, tooManyRecent, responsesCsv,
};
