"use strict";

// EPRIS Interview Studio — deliberately separate from the public CMS store.
// Audio and transcripts are editorial working material: no source file is
// exposed by nginx, every request is authorised, and every processing step is
// recoverable after a service restart.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { pipeline } = require("stream/promises");

const ROOT = process.env.INTERVIEW_DIR || "/opt/epris-interviews";
const JOBS_DIR = path.join(ROOT, "jobs");
const AUDIO_DIR = path.join(ROOT, "audio");
const MAX_BYTES = 512 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 90;
const activeJobs = new Set();

function now() { return new Date().toISOString(); }
function clip(value, length) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, length); }
function safeId(value) { return /^[a-z0-9_-]{12,64}$/i.test(String(value || "")) ? String(value) : ""; }
function safeExt(filename, type) {
  const ext = String(filename || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1] || "";
  const allowed = new Set(["mp3", "m4a", "wav", "mp4", "mpeg", "mpga", "ogg", "webm", "flac"]);
  if (allowed.has(ext)) return ext;
  const byMime = { "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm", "audio/flac": "flac" };
  return byMime[String(type || "").split(";")[0].toLowerCase()] || "";
}
function ensureDirs() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}
function jobPath(id) { return path.join(JOBS_DIR, `${id}.json`); }
function saveJob(job) {
  ensureDirs();
  job.updatedAt = now();
  const target = jobPath(job.id);
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(job, null, 2));
  fs.renameSync(temporary, target);
  return job;
}
function readJob(id) {
  if (!safeId(id)) return null;
  try { return JSON.parse(fs.readFileSync(jobPath(id), "utf8")); } catch { return null; }
}
function listJobs() {
  ensureDirs();
  return fs.readdirSync(JOBS_DIR)
    .filter((name) => /^[a-z0-9_-]{12,64}\.json$/i.test(name))
    .map((name) => readJob(name.slice(0, -5)))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}
function jobSummary(job, full = false) {
  const out = {
    id: job.id,
    title: job.title,
    filename: job.filename,
    size: job.size,
    language: job.language,
    speakers: job.speakers || [],
    status: job.status,
    stage: job.stage,
    progress: Number(job.progress || 0),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt || null,
    retentionAt: job.retentionAt || null,
    error: job.error || "",
    segmentCount: Array.isArray(job.segments) ? job.segments.length : 0,
    hasAudio: Boolean(job.sourcePath && fs.existsSync(job.sourcePath)),
  };
  if (full) out.segments = Array.isArray(job.segments) ? job.segments : [];
  return out;
}
function respond(res, status, payload, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(payload));
}
function editorOnly(req, res, resolveRole) {
  const role = resolveRole(req.headers["x-admin-password"] || "");
  if (role) return role;
  respond(res, 401, { ok: false, error: "invalid password" });
  return null;
}
function parseSpeakers(raw) {
  return String(raw || "").split(/[\n,]/).map((item) => clip(item, 80)).filter(Boolean).slice(0, 12);
}
function cleanupExpired() {
  const cutoff = Date.now();
  for (const job of listJobs()) {
    if (!job.retentionAt || Date.parse(job.retentionAt) > cutoff || job.status === "processing" || job.status === "queued") continue;
    try { fs.rmSync(path.dirname(job.sourcePath || path.join(AUDIO_DIR, job.id)), { recursive: true, force: true }); } catch {}
    try { fs.unlinkSync(jobPath(job.id)); } catch {}
  }
}
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { maxBuffer: 1024 * 1024, timeout: options.timeout || 30 * 60 * 1000 }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || error.message).trim().slice(-800);
        reject(new Error(`${command} failed${detail ? `: ${detail}` : ""}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
async function ffmpegReady() {
  try { await run("ffmpeg", ["-version"], { timeout: 8000 }); return true; } catch { return false; }
}
async function transcribeChunk(chunkPath, language) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured on VPS");
  const file = await fsp.readFile(chunkPath);
  const form = new FormData();
  form.append("file", new Blob([file], { type: "audio/mpeg" }), path.basename(chunkPath));
  form.append("model", "gpt-4o-transcribe-diarize");
  form.append("response_format", "diarized_json");
  form.append("chunking_strategy", "auto");
  if (language) form.append("language", language);
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const payload = await response.json().catch(async () => ({ error: { message: (await response.text()).slice(0, 300) } }));
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI returned ${response.status}`);
  return payload;
}
function normaliseSegments(payload, offset) {
  const source = Array.isArray(payload?.segments) ? payload.segments : [];
  const segments = source.map((segment, index) => ({
    id: crypto.randomUUID(),
    start: Math.max(0, Number(segment.start ?? segment.start_time ?? index * 2) + offset),
    end: Math.max(0, Number(segment.end ?? segment.end_time ?? index * 2 + 1) + offset),
    speaker: clip(segment.speaker || segment.speaker_id || "Speaker", 80) || "Speaker",
    text: clip(segment.text || "", 12000),
  })).filter((segment) => segment.text);
  if (segments.length) return segments;
  const text = clip(payload?.text || "", 50000);
  return text ? [{ id: crypto.randomUUID(), start: offset, end: offset, speaker: "Speaker", text }] : [];
}
async function processJob(id) {
  if (activeJobs.has(id)) return;
  activeJobs.add(id);
  try {
    let job = readJob(id);
    if (!job || !job.sourcePath || !fs.existsSync(job.sourcePath)) throw new Error("source audio is unavailable");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured on VPS");
    if (!await ffmpegReady()) throw new Error("ffmpeg is not installed on VPS");
    job.status = "processing";
    job.stage = "Preparing audio";
    job.progress = Math.max(2, Number(job.progress || 0));
    job.error = "";
    job.segments = [];
    saveJob(job);
    const chunksDir = path.join(path.dirname(job.sourcePath), "chunks");
    await fsp.rm(chunksDir, { recursive: true, force: true });
    await fsp.mkdir(chunksDir, { recursive: true });
    // 15-minute mono MP3 chunks keep each upload compact and make a 1–2 hour
    // interview restartable. OpenAI receives each chunk sequentially.
    await run("ffmpeg", ["-y", "-i", job.sourcePath, "-vn", "-ac", "1", "-ar", "16000", "-codec:a", "libmp3lame", "-b:a", "48k", "-f", "segment", "-segment_time", "900", path.join(chunksDir, "part-%03d.mp3")]);
    const chunks = (await fsp.readdir(chunksDir)).filter((name) => /^part-\d+\.mp3$/.test(name)).sort();
    if (!chunks.length) throw new Error("ffmpeg did not create audio chunks");
    for (let index = 0; index < chunks.length; index += 1) {
      job = readJob(id);
      job.status = "processing";
      job.stage = `Transcribing part ${index + 1} of ${chunks.length}`;
      job.progress = Math.min(96, Math.round(8 + (index / chunks.length) * 86));
      saveJob(job);
      const payload = await transcribeChunk(path.join(chunksDir, chunks[index]), job.language || "en");
      const offset = index * 900;
      const next = normaliseSegments(payload, offset);
      job = readJob(id);
      job.segments = [...(Array.isArray(job.segments) ? job.segments : []), ...next];
      job.progress = Math.min(98, Math.round(8 + ((index + 1) / chunks.length) * 88));
      saveJob(job);
    }
    job = readJob(id);
    job.status = "ready";
    job.stage = "Transcript ready";
    job.progress = 100;
    job.completedAt = now();
    saveJob(job);
  } catch (error) {
    const job = readJob(id);
    if (job) {
      job.status = "failed";
      job.stage = "Needs attention";
      job.error = clip(error.message, 800);
      saveJob(job);
    }
    console.error(`[interviews] ${id}:`, error.message);
  } finally {
    activeJobs.delete(id);
  }
}
function retrySoon(id) { setTimeout(() => processJob(id), 40).unref(); }
function toTimestamp(seconds, separator = ".") {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  const ms = Math.floor((value - Math.floor(value)) * 1000);
  return [hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":") + `${separator}${String(ms).padStart(3, "0")}`;
}
function exportText(job, format) {
  const segments = Array.isArray(job.segments) ? job.segments : [];
  if (format === "srt") return segments.map((s, i) => `${i + 1}\n${toTimestamp(s.start, ",")} --> ${toTimestamp(Math.max(s.end, s.start + .1), ",")}\n${s.speaker}: ${s.text}\n`).join("\n");
  if (format === "vtt") return `WEBVTT\n\n${segments.map((s) => `${toTimestamp(s.start)} --> ${toTimestamp(Math.max(s.end, s.start + .1))}\n${s.speaker}: ${s.text}\n`).join("\n")}`;
  return [`${job.title || "Interview"}`, "", ...segments.map((s) => `[${toTimestamp(s.start)}] ${s.speaker}: ${s.text}`)].join("\n");
}

function createInterviewModule({ resolveRole }) {
  cleanupExpired();
  setTimeout(() => listJobs().filter((job) => ["queued", "processing"].includes(job.status)).forEach((job) => retrySoon(job.id)), 1500).unref();
  return {
    async handle(req, res, parsed) {
      const url = new URL(req.url, "http://x");
      if (!url.pathname.startsWith("/interviews")) return false;
      // The raw stream must be handled before the generic JSON body reader.
      if (parsed === null && !(url.pathname === "/interviews/upload" && req.method === "POST")) return false;
      const role = editorOnly(req, res, resolveRole);
      if (!role) return true;
      cleanupExpired();
      if (url.pathname === "/interviews/health" && req.method === "GET") {
        respond(res, 200, { ok: true, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), ffmpegReady: await ffmpegReady(), maxUploadBytes: MAX_BYTES, defaultRetentionDays: DEFAULT_RETENTION_DAYS });
        return true;
      }
      if (url.pathname === "/interviews" && req.method === "GET") {
        respond(res, 200, { ok: true, jobs: listJobs().map((job) => jobSummary(job)) });
        return true;
      }
      if (url.pathname === "/interviews/upload" && req.method === "POST") {
        const ext = safeExt(req.headers["x-interview-filename"], req.headers["content-type"]);
        const declared = Number(req.headers["content-length"] || 0);
        if (!ext) { respond(res, 400, { ok: false, error: "Supported formats: MP3, M4A, WAV, MP4, OGG, WebM or FLAC." }); return true; }
        if (declared && declared > MAX_BYTES) { respond(res, 413, { ok: false, error: "Audio is larger than 512 MB." }); return true; }
        const id = `int_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
        const folder = path.join(AUDIO_DIR, id);
        await fsp.mkdir(folder, { recursive: true });
        const target = path.join(folder, `source.${ext}`);
        try {
          let size = 0;
          req.on("data", (chunk) => { size += chunk.length; if (size > MAX_BYTES) req.destroy(new Error("audio too large")); });
          await pipeline(req, fs.createWriteStream(target, { flags: "wx" }));
          if (!size) throw new Error("empty audio file");
          const retentionDays = Math.max(1, Math.min(MAX_RETENTION_DAYS, Number(req.headers["x-interview-retention-days"]) || DEFAULT_RETENTION_DAYS));
          const job = {
            id,
            title: clip(req.headers["x-interview-title"] || String(req.headers["x-interview-filename"] || "Interview").replace(/\.[^.]+$/, ""), 180),
            filename: clip(req.headers["x-interview-filename"], 180),
            size,
            language: clip(req.headers["x-interview-language"] || "en", 12) || "en",
            speakers: parseSpeakers(req.headers["x-interview-speakers"]),
            sourcePath: target,
            mimeType: clip(req.headers["content-type"], 100) || "audio/mpeg",
            status: "queued",
            stage: "Queued securely",
            progress: 1,
            segments: [],
            createdAt: now(),
            updatedAt: now(),
            retentionAt: new Date(Date.now() + retentionDays * 86400000).toISOString(),
          };
          saveJob(job);
          respond(res, 201, { ok: true, job: jobSummary(job) });
          retrySoon(id);
        } catch (error) {
          try { await fsp.rm(folder, { recursive: true, force: true }); } catch {}
          respond(res, error.message === "audio too large" ? 413 : 500, { ok: false, error: error.message || "upload failed" });
        }
        return true;
      }
      const match = url.pathname.match(/^\/interviews\/([a-z0-9_-]{12,64})(?:\/(audio|export|retry))?$/i);
      if (!match) { respond(res, 404, { ok: false, error: "interview not found" }); return true; }
      const [, id, action] = match;
      const job = readJob(id);
      if (!job) { respond(res, 404, { ok: false, error: "interview not found" }); return true; }
      if (!action && req.method === "GET") { respond(res, 200, { ok: true, job: jobSummary(job, true) }); return true; }
      if (action === "audio" && req.method === "GET") {
        if (!job.sourcePath || !fs.existsSync(job.sourcePath)) { respond(res, 404, { ok: false, error: "audio expired" }); return true; }
        const stat = fs.statSync(job.sourcePath);
        res.writeHead(200, { "Content-Type": job.mimeType || "audio/mpeg", "Content-Length": stat.size, "Cache-Control": "private, no-store", "Accept-Ranges": "bytes" });
        fs.createReadStream(job.sourcePath).pipe(res);
        return true;
      }
      if (action === "export" && req.method === "GET") {
        const format = ["txt", "srt", "vtt"].includes(url.searchParams.get("format")) ? url.searchParams.get("format") : "txt";
        const mime = format === "txt" ? "text/plain" : format === "srt" ? "application/x-subrip" : "text/vtt";
        const filename = `${(job.title || "interview").replace(/[^a-z0-9_-]+/ig, "-").slice(0, 80) || "interview"}.${format}`;
        res.writeHead(200, { "Content-Type": `${mime}; charset=utf-8`, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" });
        res.end(exportText(job, format));
        return true;
      }
      if (action === "retry" && req.method === "POST") {
        if (!job.sourcePath || !fs.existsSync(job.sourcePath)) { respond(res, 409, { ok: false, error: "audio expired; upload it again" }); return true; }
        job.status = "queued"; job.stage = "Queued again"; job.progress = 1; job.error = ""; saveJob(job); retrySoon(id);
        respond(res, 200, { ok: true, job: jobSummary(job) });
        return true;
      }
      if (!action && req.method === "PATCH") {
        const body = parsed && typeof parsed === "object" ? parsed : {};
        if (body.title != null) job.title = clip(body.title, 180) || job.title;
        if (Array.isArray(body.speakers)) job.speakers = body.speakers.map((value) => clip(value, 80)).filter(Boolean).slice(0, 12);
        if (Array.isArray(body.segments)) {
          job.segments = body.segments.slice(0, 12000).map((segment) => ({
            id: safeId(segment.id) || crypto.randomUUID(),
            start: Math.max(0, Number(segment.start) || 0),
            end: Math.max(0, Number(segment.end) || 0),
            speaker: clip(segment.speaker, 80) || "Speaker",
            text: clip(segment.text, 12000),
          })).filter((segment) => segment.text);
        }
        saveJob(job);
        respond(res, 200, { ok: true, job: jobSummary(job, true) });
        return true;
      }
      respond(res, 405, { ok: false, error: "method not allowed" });
      return true;
    }
  };
}

module.exports = { createInterviewModule };
