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
const F = require("./forms.js");

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");
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
    if (req.method === "GET" && parts[0] === "public" && parts[1]) {
      const form = F.findFormBySlug(parts[1]);
      if (!form) return send(res, 404, { ok: false, error: "form not found" });
      if (form.status !== "open") return send(res, 403, { ok: false, error: "form closed", status: form.status });
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

      const responses = F.readResponses(form.id);
      if (responses.length >= F.MAX_RESPONSES_PER_FORM) return send(res, 429, { ok: false, error: "form is full" });

      const fingerprint = F.ipFingerprint(clientIp(req));
      if (F.tooManyRecent(responses, fingerprint)) return send(res, 429, { ok: false, error: "too many submissions" });

      responses.push({
        id: F.newId(),
        submittedAt: F.nowIso(),
        source: fingerprint,
        inviteToken: invite ? invite.token : "",
        inviteLabel: invite ? invite.label : "",
        answers,
      });
      await F.writeResponses(form.id, responses);

      if (invite) {
        invite.usedAt = F.nowIso();
        invite.uses = Number(invite.uses || 0) + 1;
        await F.writeJsonAtomic(F.formPath(form.id), form);
      }
      return send(res, 200, { ok: true, accepted: true, thankYou: form.thankYou });
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
         то в другую, в зависимости от порядка файлов на диске. */
      const clash = F.listForms().find((item) => item.slug === form.slug && item.id !== form.id);
      if (clash) form.slug = `${form.slug}-${form.id.slice(0, 4)}`;
      await F.writeJsonAtomic(F.formPath(form.id), form);
      return send(res, 200, { ok: true, form: F.publicForm(form) });
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
      return send(res, 200, { ok: true, form: F.publicForm(form), responses });
    }

    if (req.method === "DELETE" && parts[1] === "responses" && parts[2]) {
      const id = F.clean(parts[2], 40);
      const responses = F.readResponses(form.id).filter((item) => item.id !== id);
      await F.writeResponses(form.id, responses);
      return send(res, 200, { ok: true, responses: responses.length });
    }

    if (req.method === "POST" && parts[1] === "invites") {
      const body = await readBody(req);
      const label = F.clean(body?.label, 120) || "Автор";
      const invite = { token: F.newId() + F.newId().slice(0, 6), label, createdAt: F.nowIso(), usedAt: null, uses: 0, revoked: false };
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
