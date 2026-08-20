"use strict";

/* HTTP-слой анкет. Отдельный процесс — по той же причине, что и у Interview
 * Studio: выкат сайта перезапускает deploy-webhook несколько раз в день, а
 * приём ответа не должен зависеть от того, правил ли редактор статью.
 *
 * Два круга доступа, и они не пересекаются:
 *   • публичный  — прочитать открытую анкету и отправить ответ;
 *   • редакционный — всё остальное, только с паролем админки.
 * Ответы наружу не отдаются никогда, ни по какому адресу.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const F = require("./forms.js");
const { buildZip } = require("./zip.js");

const PORT = Number(process.env.PORT || 9878);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD || "";

const ALLOWED_ORIGINS = [
  "https://eprisjournal.com",
  "https://www.eprisjournal.com",
  "https://admin.eprisjournal.com",
  // Локальные порты разработки: витрина (5173/5199) и статика админки (8901).
  "http://localhost:5173",
  "http://localhost:5199",
  "http://localhost:8901",
];

function setCors(res, origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  // X-File-Name обязателен в списке: имя файла едет заголовком, и без него
  // предварительный запрос браузера отклоняет всю загрузку.
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password, X-File-Name");
  res.setHeader("Vary", "Origin");
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function isEditor(req) {
  const password = String(req.headers["x-admin-password"] || "");
  if (!password) return false;
  return (ADMIN_PASSWORD && password === ADMIN_PASSWORD) || (EDITOR_PASSWORD && password === EDITOR_PASSWORD);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      // Обрываем на пороге, а не после: анкета на полмегабайта — это уже не
      // анкета, и дочитывать её в память незачем.
      if (size > F.MAX_BODY_BYTES) { reject(new Error("payload too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "";
}

const server = http.createServer(async (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  // Путь приходит и как /forms/..., и как /... — nginx может срезать префикс.
  if (parts[0] === "forms") parts.shift();

  try {
    if (req.method === "GET" && parts[0] === "health") {
      return send(res, 200, { ok: true, forms: F.listForms().length });
    }

    /* ── Публично: открытая анкета и отправка ответа ───────────────────── */
    /* Приглашение можно передать и путём, и параметром: путь /i/<имя> нужен
       для красивой ссылки в письме, параметр ?t= остаётся ради ссылок,
       которые уже разосланы. */
    if (req.method === "GET" && parts[0] === "public" && parts[1] && parts[2] === "i" && parts[3]) {
      url.searchParams.set("t", parts[3]);
      parts.length = 2;
    }
    if (req.method === "POST" && parts[0] === "public" && parts[1] && parts[2] === "i" && parts[3] && parts[4]) {
      url.searchParams.set("t", parts[3]);
      parts.splice(2, 2);
    }

    if (req.method === "GET" && parts[0] === "public" && parts[1]) {
      const form = F.findFormBySlug(parts[1]);
      if (!form) return send(res, 404, { ok: false, error: "form not found" });
      /* Предпросмотр: анкету видно до открытия приёма, но отправить нельзя.
         Проверка стоит до всех отказов, потому что смысл ссылки именно в том,
         чтобы посмотреть на закрытую анкету. */
      const previewing = F.matchesFormPreview(form, url.searchParams.get("preview"));
      if (!previewing) {
        if (form.status !== "open") return send(res, 403, { ok: false, error: "form closed", status: form.status });
        const closedReason = F.formClosedReason(form);
        if (closedReason) return send(res, 403, { ok: false, error: closedReason });
      }
      if (previewing) return send(res, 200, { ok: true, form: F.publicForm(form), preview: true });
      if (form.access === "invite") {
        const token = F.clean(url.searchParams.get("t"), 60);
        const invite = form.invites.find((item) => item.token === token && !item.revoked);
        if (!invite) return send(res, 403, { ok: false, error: "invite required" });
        return send(res, 200, { ok: true, form: F.publicForm(form), invite: { label: invite.label, usedAt: invite.usedAt || null } });
      }
      return send(res, 200, { ok: true, form: F.publicForm(form) });
    }

    if (req.method === "POST" && parts[0] === "public" && parts[1] && parts[2] === "submit") {
      const form = F.findFormBySlug(parts[1]);
      if (!form) return send(res, 404, { ok: false, error: "form not found" });
      if (form.status !== "open") return send(res, 403, { ok: false, error: "form closed" });
      const closed = F.formClosedReason(form);
      if (closed) return send(res, 403, { ok: false, error: closed });

      const body = await readBody(req);
      /* Ловушка для роботов: поле скрыто от человека, поэтому заполнить его
         может только тот, кто читает разметку. Отвечаем ему успехом — иначе
         скрипт узнает, что его отсекли, и попробует иначе. */
      if (F.clean(body?.website, 100)) return send(res, 200, { ok: true, accepted: true });

      let invite = null;
      if (form.access === "invite") {
        const token = F.clean(body?.token, 60);
        invite = form.invites.find((item) => item.token === token && !item.revoked);
        if (!invite) return send(res, 403, { ok: false, error: "invite required" });
      }

      const { answers, errors } = F.validateAnswers(form, body?.answers || {});
      if (errors.length) return send(res, 400, { ok: false, error: "missing answers", fields: errors });

      const attachedBytes = Object.values(answers).reduce((total, value) => (
        Array.isArray(value) ? total + value.reduce((sum, item) => sum + (Number(item?.size) || 0), 0) : total
      ), 0);
      if (attachedBytes > F.MAX_RESPONSE_BYTES) {
        return send(res, 413, { ok: false, error: "attachments too large", limitMb: Math.round(F.MAX_RESPONSE_BYTES / 1048576) });
      }

      const responses = F.readResponses(form.id);
      if (responses.length >= F.MAX_RESPONSES_PER_FORM) return send(res, 429, { ok: false, error: "form is full" });

      const fingerprint = F.ipFingerprint(clientIp(req));
      if (F.tooManyRecent(responses, fingerprint)) return send(res, 429, { ok: false, error: "too many submissions" });

      const response = {
        id: F.newId(),
        submittedAt: F.nowIso(),
        source: fingerprint,
        inviteToken: invite ? invite.token : "",
        inviteLabel: invite ? invite.label : "",
        answers,
      };
      /* Запись идёт через очередь службы, а не «прочитал-дописал-записал»:
         два ответа в одну секунду раньше затирали друг друга, и пропажу
         никто не замечал — оба автора видели «спасибо». */
      const total = await F.appendResponse(form.id, response);

      if (invite) {
        invite.usedAt = F.nowIso();
        invite.uses = Number(invite.uses || 0) + 1;
        await F.writeJsonAtomic(F.formPath(form.id), form);
      }
      /* Автору отвечаем сразу, письмо редакции уходит следом: приём анкеты не
         должен ждать чужой почтовый сервер и тем более падать вместе с ним. */
      send(res, 200, { ok: true, accepted: true, thankYou: form.thankYou });
      F.notifyNewResponse(form, response, total).catch(() => {});
      return;
    }

    /* Загрузка файла к анкете.
     *
     * Файл идёт потоком прямо на диск: анкету с оригиналами фотографий нельзя
     * складывать в память процесса — она кончится раньше, чем закончится
     * загрузка. Имя и поле приходят заголовками, тело — сырой файл; так не
     * нужен разбор multipart ради одного вложения. */
    if (req.method === "POST" && parts[0] === "public" && parts[1] && parts[2] === "upload") {
      const form = F.findFormBySlug(parts[1]);
      if (!form) return send(res, 404, { ok: false, error: "form not found" });
      if (form.status !== "open") return send(res, 403, { ok: false, error: "form closed" });
      if (form.access === "invite") {
        const token = F.clean(url.searchParams.get("t"), 60);
        if (!form.invites.find((item) => item.token === token && !item.revoked)) {
          return send(res, 403, { ok: false, error: "invite required" });
        }
      }
      const declared = Number(req.headers["content-length"] || 0);
      if (declared > F.MAX_FILE_BYTES) {
        return send(res, 413, { ok: false, error: "file too large", limitMb: Math.round(F.MAX_FILE_BYTES / 1048576) });
      }
      /* Место на диске проверяем ДО приёма: свободные два гигабайта — это не
         запас на всякий случай, а условие работы сайта, радио и админки,
         которые живут на том же разделе. */
      if (!F.diskHasRoom(declared)) return send(res, 507, { ok: false, error: "no space left" });

      const fileId = F.newId() + F.newId();
      const dir = F.uploadDirFor(form.id);
      fs.mkdirSync(dir, { recursive: true });
      const target = F.uploadPath(form.id, fileId);

      let written = 0;
      let aborted = false;
      const sink = fs.createWriteStream(target);
      req.on("data", (chunk) => {
        written += chunk.length;
        // Заголовок Content-Length можно подделать, поэтому режем и по факту.
        if (written > F.MAX_FILE_BYTES && !aborted) { aborted = true; req.destroy(); sink.destroy(); }
      });
      try {
        await pipeline(req, sink);
      } catch {
        fs.rmSync(target, { force: true });
        return send(res, aborted ? 413 : 400, { ok: false, error: aborted ? "file too large" : "upload failed" });
      }

      const meta = {
        id: fileId,
        formId: form.id,
        name: F.safeFileName(decodeURIComponent(String(req.headers["x-file-name"] || "file"))),
        type: F.clean(req.headers["content-type"], 120) || "application/octet-stream",
        size: written,
        uploadedAt: F.nowIso(),
      };
      await F.saveFileMeta(form.id, meta);
      return send(res, 200, { ok: true, file: { fileId: meta.id, name: meta.name, size: meta.size, type: meta.type } });
    }

    /* ── Дальше только редакция ────────────────────────────────────────── */
    if (!isEditor(req)) return send(res, 401, { ok: false, error: "unauthorised" });

    if (req.method === "GET" && (!parts[0] || parts[0] === "list")) {
      const forms = F.listForms().map((form) => ({
        ...F.publicForm(form),
        invites: form.invites.length,
        responses: F.readResponses(form.id).length,
        updatedAt: form.updatedAt,
        createdAt: form.createdAt,
      }));
      return send(res, 200, { ok: true, forms });
    }

    if (req.method === "POST" && (!parts[0] || parts[0] === "save")) {
      const body = await readBody(req);
      const existing = body?.id ? F.readJson(F.formPath(F.clean(body.id, 40)), null) : null;
      const form = F.normaliseForm(body, existing);
      /* Один slug — одна анкета. Иначе публичная ссылка вела бы то в одну,
         то в другую, в зависимости от порядка файлов на диске.
         Занятый адрес получает номер («author-questionnaire-2»), а не хвост
         из шестнадцатеричного мусора: ссылку диктуют по телефону и пишут в
         письме, и «-10e5» в ней выглядит поломкой. */
      const taken = new Set(F.listForms().filter((item) => item.id !== form.id).map((item) => item.slug));
      if (taken.has(form.slug)) {
        const base = form.slug;
        let n = 2;
        while (taken.has(`${base}-${n}`) && n < 50) n += 1;
        form.slug = `${base}-${n}`;
      }
      await F.writeJsonAtomic(F.formPath(form.id), form);
      return send(res, 200, { ok: true, form: { ...F.publicForm(form), previewToken: F.previewTokenFor(form) } });
    }

    const formId = F.clean(parts[0], 40);
    const form = formId ? F.readJson(F.formPath(formId), null) : null;
    if (!form) return send(res, 404, { ok: false, error: "form not found" });

    if (req.method === "GET" && parts[1] === "responses") {
      const responses = F.readResponses(form.id);
      if (url.searchParams.get("format") === "csv") {
        return send(res, 200, F.responsesCsv(form, responses), {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${form.slug}-responses.csv"`,
        });
      }
      // Редакция открывает анкету вместе с её ссылкой на предпросмотр: она
      // нужна ровно здесь, рядом с кнопкой «открыть анкету».
      return send(res, 200, { ok: true, form: { ...F.publicForm(form), previewToken: F.previewTokenFor(form) }, responses });
    }

    if (req.method === "DELETE" && parts[1] === "responses" && parts[2]) {
      const id = F.clean(parts[2], 40);
      const all = F.readResponses(form.id);
      const doomed = all.find((item) => item.id === id);
      if (doomed) F.removeResponseFiles(form.id, doomed);
      const responses = all.filter((item) => item.id !== id);
      await F.writeResponses(form.id, responses);
      return send(res, 200, { ok: true, responses: responses.length });
    }

    /* Файл отдаётся только редакции и только через эту точку: на диске он
       лежит под случайным именем, nginx его не раздаёт, прямой ссылки нет. */
    if (req.method === "GET" && parts[1] === "files" && parts[2]) {
      const meta = F.fileMeta(form.id, F.clean(parts[2], 60));
      if (!meta) return send(res, 404, { ok: false, error: "file not found" });
      const file = F.uploadPath(form.id, meta.id);
      if (!fs.existsSync(file)) return send(res, 404, { ok: false, error: "file missing on disk" });
      res.writeHead(200, {
        // Всегда как вложение: что бы ни лежало внутри, браузер редактора это
        // сохраняет, а не открывает и не исполняет.
        "Content-Type": "application/octet-stream",
        "Content-Length": meta.size,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file).pipe(res);
      return true;
    }

    /* АРХИВ ФОТОГРАФИЙ ОДНИМ ФАЙЛОМ.
     *
     * Двадцать снимков — это двадцать нажатий «скачать» и двадцать файлов в
     * загрузках без всякого порядка. Отдаём один zip: либо весь по анкете,
     * либо по одному ответу (?response=ID), с именами вида
     * «02 Abbie Downey/фасад.jpg», чтобы в архиве было видно, кто что прислал.
     *
     * Поддерживаем Range: архив на сотни мегабайт по мобильной связи иначе
     * приходится качать заново после каждого обрыва. */
    if (req.method === "GET" && parts[1] === "files.zip") {
      const responses = F.readResponses(form.id);
      const wanted = F.clean(url.searchParams.get("response"), 40);
      const chosen = wanted ? responses.filter((item) => item.id === wanted) : responses;

      const entries = [];
      chosen.forEach((response, index) => {
        const who = F.clean(response.inviteLabel, 60) || `ответ ${index + 1}`;
        const folder = `${String(index + 1).padStart(2, "0")} ${who}`;
        for (const value of Object.values(response.answers || {})) {
          if (!Array.isArray(value)) continue;
          for (const item of value) {
            if (!item || !item.fileId) continue;
            const file = F.uploadPath(form.id, item.fileId);
            if (!fs.existsSync(file)) continue;
            entries.push({ name: `${folder}/${item.name || item.fileId}`, path: file, date: new Date(response.submittedAt) });
          }
        }
      });

      if (!entries.length) return send(res, 404, { ok: false, error: "no files" });

      const zip = buildZip(entries);
      const filename = `${form.slug}${wanted ? "-" + wanted : ""}-files.zip`;
      const range = String(req.headers.range || "");
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : zip.length - 1;
        if (start >= zip.length || end >= zip.length || start > end) {
          res.writeHead(416, { "Content-Range": `bytes */${zip.length}` });
          res.end();
          return true;
        }
        res.writeHead(206, {
          "Content-Type": "application/zip",
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${zip.length}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        });
        res.end(zip.subarray(start, end + 1));
        return true;
      }

      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Length": zip.length,
        "Accept-Ranges": "bytes",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      });
      res.end(zip);
      return true;
    }

    if (req.method === "GET" && parts[1] === "storage") {
      return send(res, 200, {
        ok: true,
        freeBytes: F.freeBytes(),
        maxFileBytes: F.MAX_FILE_BYTES,
        maxResponseBytes: F.MAX_RESPONSE_BYTES,
      });
    }

    if (req.method === "POST" && parts[1] === "invites") {
      const body = await readBody(req);
      const label = F.clean(body?.label, 120) || "Автор";
      /* Ключ приглашения делается из имени, а не из случайных цифр: ссылку
         вставляют в письмо человеку, и «?t=c48d35d5f6f5958105ae27c8» в ней
         выглядит как техническая ошибка. Совпадение имён разводится номером.
         Секретности здесь и не требовалось: приглашение говорит, ЧЬЙ это
         ответ, а не охраняет тайну; кто получил ссылку, тот и отвечает. */
      const base = F.slugify(label) || "guest";
      const taken = new Set(form.invites.map((item) => item.token));
      let token = base;
      let n = 2;
      while (taken.has(token) && n < 50) { token = `${base}-${n}`; n += 1; }
      const invite = { token, label, createdAt: F.nowIso(), usedAt: null, uses: 0, revoked: false };
      form.invites.push(invite);
      form.updatedAt = F.nowIso();
      await F.writeJsonAtomic(F.formPath(form.id), form);
      return send(res, 200, { ok: true, invite });
    }

    if (req.method === "GET" && parts[1] === "invites") {
      return send(res, 200, { ok: true, invites: form.invites });
    }

    if (req.method === "DELETE" && parts[1] === "invites" && parts[2]) {
      const token = F.clean(parts[2], 80);
      const invite = form.invites.find((item) => item.token === token);
      // Приглашение отзывается, а не удаляется: ответ, присланный по нему,
      // должен остаться подписанным — иначе непонятно, кто отвечал.
      if (invite) invite.revoked = true;
      form.updatedAt = F.nowIso();
      await F.writeJsonAtomic(F.formPath(form.id), form);
      return send(res, 200, { ok: true });
    }

    if (req.method === "DELETE" && !parts[1]) {
      await F.writeJsonAtomic(F.formPath(form.id), { ...form, status: "closed", deletedAt: F.nowIso() });
      return send(res, 200, { ok: true, closed: true });
    }

    return send(res, 404, { ok: false, error: "unknown route" });
  } catch (error) {
    if (/payload too large/.test(error.message)) return send(res, 413, { ok: false, error: "payload too large" });
    console.error("[forms] error:", error);
    if (!res.headersSent) send(res, 500, { ok: false, error: "internal error" });
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`[forms] listening on 127.0.0.1:${PORT}`));

/* Раз в час убираем файлы, которые загрузили и бросили, не отправив анкету.
   Первый проход — через минуту после старта, чтобы выкат не совпал с уборкой. */
setTimeout(() => { try { F.sweepOrphanFiles(); } catch (e) { console.warn("[forms] sweep:", e.message); } }, 60 * 1000).unref?.();
setInterval(() => {
  try {
    const removed = F.sweepOrphanFiles();
    if (removed) console.log(`[forms] swept ${removed} orphan file(s)`);
  } catch (e) { console.warn("[forms] sweep:", e.message); }
}, 60 * 60 * 1000).unref?.();
