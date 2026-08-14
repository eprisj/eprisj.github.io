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
// Large source videos are streamed through nginx straight to disk. 1.5 GB keeps
// room for the extracted audio and transcription chunks on the 20 GB VPS.
const MAX_BYTES = 1536 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 90;
const activeJobs = new Set();
const pendingJobs = new Set();
let transcriptionWorkerBusy = false;
const LOCAL_TRANSCRIBE_SCRIPT = process.env.INTERVIEW_TRANSCRIBE_SCRIPT || path.join(__dirname, "transcribe-local.py");
const LOCAL_PYTHON = process.env.INTERVIEW_PYTHON_BIN || "python3";
// The VPS has one CPU core and limited RAM.  small.en is the highest practical
// English-only model here: it is materially stronger than base/tiny while
// keeping the public site responsive through a low-priority background job.
const LOCAL_MODEL = process.env.INTERVIEW_WHISPER_MODEL || "/opt/epris-interviews/models/small.en";

function now() { return new Date().toISOString(); }
function clip(value, length) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, length); }
function safeId(value) { return /^[a-z0-9_-]{12,64}$/i.test(String(value || "")) ? String(value) : ""; }
function safeExt(filename, type) {
  const ext = String(filename || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1] || "";
  // Includes Apple Voice Memos and files exported by iOS recorders. ffmpeg
  // normalises them before local transcription; this is a safe intake gate.
  const allowed = new Set(["3g2", "3ga", "3gp", "aac", "ac3", "aif", "aifc", "aiff", "alac", "amr", "ape", "asf", "au", "avi", "caf", "dts", "eac3", "flac", "m4a", "m4b", "m4r", "m4v", "mka", "mkv", "mov", "mp1", "mp2", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "opus", "ra", "ram", "rm", "rmvb", "snd", "spx", "tta", "voc", "wav", "weba", "webm", "wma", "wmv", "wv"]);
  if (allowed.has(ext)) return ext;
  const byMime = { "audio/3gpp": "3ga", "audio/aac": "aac", "audio/aiff": "aiff", "audio/amr": "amr", "audio/basic": "au", "audio/flac": "flac", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/opus": "opus", "audio/vnd.wave": "wav", "audio/wav": "wav", "audio/webm": "weba", "audio/x-aiff": "aiff", "audio/x-caf": "caf", "audio/x-m4a": "m4a", "audio/x-realaudio": "ra", "audio/x-tta": "tta", "audio/x-voc": "voc", "audio/x-wav": "wav", "audio/x-wavpack": "wv", "audio/x-ms-wma": "wma", "audio/x-ms-asf": "asf", "video/3gpp": "3gp", "video/avi": "avi", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/x-matroska": "mkv", "video/x-ms-asf": "asf", "video/x-msvideo": "avi", "video/x-ms-wmv": "wmv" };
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
function isRetiredImportPlaceholder(job) {
  // Before local-only intake, a failed link import could leave a shell with no
  // source file and no transcript. It is not editorial work and must not look
  // like a recoverable recording in the current archive.
  return Boolean(job
    && job.sourceKind === "remote"
    && !job.articleDraft?.id
    && !(Array.isArray(job.segments) && job.segments.length)
    && (!job.sourcePath || !fs.existsSync(job.sourcePath)));
}
function jobSummary(job, full = false) {
  const out = {
    id: job.id,
    title: job.title,
    filename: job.filename,
    // Remote imports were deliberately retired: an interview is processed
    // only from the original file the editor uploads to the private VPS.
    sourceUrl: "",
    sourceKind: job.sourceKind || "upload",
    size: job.size,
    language: job.language,
    speakers: job.speakers || [],
    status: job.status,
    stage: job.stage,
    progress: Number(job.progress || 0),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt || null,
    reviewedAt: job.reviewedAt || null,
    articleDraft: job.articleDraft && Number.isFinite(Number(job.articleDraft.id)) ? {
      id: Number(job.articleDraft.id),
      title: clip(job.articleDraft.title, 180),
      createdAt: job.articleDraft.createdAt || null,
    } : null,
    articleDraftPending: Boolean(job.articleDraftLock && Date.parse(job.articleDraftLock.createdAt || 0) > Date.now() - 10 * 60 * 1000),
    retentionAt: job.retentionAt || null,
    error: job.error || "",
    segmentCount: Array.isArray(job.segments) ? job.segments.length : 0,
    hasAudio: Boolean(job.sourcePath && fs.existsSync(job.sourcePath)),
    engine: job.engine || "local-whisper",
    model: job.model || "",
    processing: {
      phase: job.phase || (job.status === "queued" ? "queued" : job.status || "idle"),
      sourceDurationSeconds: Math.max(0, Number(job.sourceDurationSeconds) || 0),
      chunkCount: Math.max(0, Number(job.chunkCount) || 0),
      completedChunks: Math.max(0, Number(job.completedChunks) || 0),
      currentChunk: Math.max(0, Number(job.currentChunk) || 0),
      attempt: Math.max(1, Number(job.attempt) || 1),
      checkpointAt: job.checkpointAt || job.updatedAt || null,
      startedAt: job.startedAt || null,
      attemptStartedAt: job.attemptStartedAt || job.startedAt || null,
    },
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
    execFile(command, args, { maxBuffer: 8 * 1024 * 1024, timeout: options.timeout || 30 * 60 * 1000 }, (error, stdout, stderr) => {
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
async function ffprobeReady() {
  try { await run("ffprobe", ["-version"], { timeout: 8000 }); return true; } catch { return false; }
}
async function localEngineStatus() {
  if (!fs.existsSync(LOCAL_TRANSCRIBE_SCRIPT)) {
    return { ready: false, engine: "Local Whisper", model: LOCAL_MODEL, detail: "Local worker is not installed on VPS." };
  }
  try {
    const { stdout } = await run(LOCAL_PYTHON, [LOCAL_TRANSCRIBE_SCRIPT, "--health"], { timeout: 12000 });
    const result = JSON.parse(String(stdout || "{}"));
    return { ...result, ready: Boolean(result.ready), engine: result.engine || "Local Whisper", model: result.model || LOCAL_MODEL };
  } catch (error) {
    return { ready: false, engine: "Local Whisper", model: LOCAL_MODEL, detail: "Local worker needs server setup.", technical: clip(error.message, 260) };
  }
}
async function transcribeChunk(chunkPath, language) {
  // `nice` is intentional: the public journal always wins CPU time over a
  // background transcription on this small VPS.
  const { stdout } = await run("nice", ["-n", "15", LOCAL_PYTHON, LOCAL_TRANSCRIBE_SCRIPT, "--input", chunkPath, "--language", language || "en", "--model", LOCAL_MODEL], { timeout: 60 * 60 * 1000 });
  let payload;
  try { payload = JSON.parse(String(stdout || "{}")); } catch { throw new Error("Local worker returned an invalid transcript."); }
  if (payload?.error) throw new Error(payload.error);
  return payload;
}
async function inspectSourceAudio(sourcePath) {
  try {
    const { stdout } = await run("ffprobe", [
      "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name:format=duration",
      "-of", "json", sourcePath,
    ], { timeout: 20000 });
    const payload = JSON.parse(String(stdout || "{}"));
    if (!Array.isArray(payload.streams) || !payload.streams.length) {
      throw new Error("no audio stream");
    }
    const duration = Number(payload?.format?.duration);
    return { duration: Number.isFinite(duration) && duration > 0 ? duration : 0 };
  } catch {
    throw new Error("The file could not be read as audio. Re-export the original iPhone recording and upload it again.");
  }
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
    if (!job) throw new Error("interview is unavailable");
    if (!job.sourcePath || !fs.existsSync(job.sourcePath)) {
      throw new Error("Source audio is unavailable. Upload the original file again.");
    }
    if (!await ffmpegReady() || !await ffprobeReady()) throw new Error("Audio preparation is not installed on VPS");
    const engine = await localEngineStatus();
    if (!engine.ready) throw new Error(engine.detail || "Local transcription service is not ready on VPS.");
    job.status = "processing";
    job.engine = "local-whisper";
    job.model = engine.model || LOCAL_MODEL;
    job.phase = "checking";
    job.stage = "Checking the source file";
    job.startedAt = job.startedAt || now();
    job.attemptStartedAt = job.attemptStartedAt || now();
    job.progress = Math.max(3, Number(job.progress || 0));
    job.error = "";
    job.segments = [];
    job.completedChunks = 0;
    job.currentChunk = 0;
    job.chunkCount = 0;
    job.checkpointAt = now();
    saveJob(job);
    const sourceInfo = await inspectSourceAudio(job.sourcePath);
    job = readJob(id);
    job.sourceDurationSeconds = sourceInfo.duration;
    job.phase = "preparing";
    job.stage = "Creating audio parts locally";
    job.progress = 8;
    job.checkpointAt = now();
    saveJob(job);
    const chunksDir = path.join(path.dirname(job.sourcePath), "chunks");
    await fsp.rm(chunksDir, { recursive: true, force: true });
    await fsp.mkdir(chunksDir, { recursive: true });
    // 15-minute mono chunks are restartable and keep RAM steady on a modest VPS.
    // The chunks stay on the server and are consumed by the local worker only.
    await run("ffmpeg", ["-y", "-i", job.sourcePath, "-vn", "-ac", "1", "-ar", "16000", "-codec:a", "libmp3lame", "-b:a", "48k", "-f", "segment", "-segment_time", "900", path.join(chunksDir, "part-%03d.mp3")]);
    const chunks = (await fsp.readdir(chunksDir)).filter((name) => /^part-\d+\.mp3$/.test(name)).sort();
    if (!chunks.length) throw new Error("ffmpeg did not create audio chunks");
    job = readJob(id);
    job.phase = "transcribing";
    job.chunkCount = chunks.length;
    job.completedChunks = 0;
    job.currentChunk = 1;
    job.stage = `Transcribing locally: part 1 of ${chunks.length}`;
    job.progress = 10;
    job.checkpointAt = now();
    saveJob(job);
    for (let index = 0; index < chunks.length; index += 1) {
      job = readJob(id);
      job.status = "processing";
      job.phase = "transcribing";
      job.chunkCount = chunks.length;
      job.completedChunks = index;
      job.currentChunk = index + 1;
      job.stage = `Transcribing locally: part ${index + 1} of ${chunks.length}`;
      job.progress = Math.min(94, Math.round(10 + (index / chunks.length) * 84));
      job.checkpointAt = now();
      saveJob(job);
      const payload = await transcribeChunk(path.join(chunksDir, chunks[index]), job.language || "en");
      const offset = index * 900;
      const next = normaliseSegments(payload, offset);
      job = readJob(id);
      job.segments = [...(Array.isArray(job.segments) ? job.segments : []), ...next];
      job.phase = "saving";
      job.completedChunks = index + 1;
      job.currentChunk = index + 1;
      job.stage = `Saving part ${index + 1} of ${chunks.length}`;
      job.progress = Math.min(98, Math.round(10 + ((index + 1) / chunks.length) * 86));
      job.checkpointAt = now();
      saveJob(job);
    }
    job = readJob(id);
    job.status = "ready";
    job.phase = "ready";
    job.stage = "Transcript ready for editing";
    job.progress = 100;
    job.completedAt = now();
    job.checkpointAt = now();
    saveJob(job);
  } catch (error) {
    const job = readJob(id);
    if (job) {
      job.status = "failed";
      job.phase = "failed";
      job.stage = "Needs attention";
      job.error = clip(error.message, 800);
      job.checkpointAt = now();
      saveJob(job);
    }
    console.error(`[interviews] ${id}:`, error.message);
  } finally {
    activeJobs.delete(id);
  }
}
async function drainTranscriptionQueue() {
  if (transcriptionWorkerBusy) return;
  const next = [...pendingJobs]
    .map((id) => readJob(id))
    .filter((job) => job && ["queued", "processing"].includes(job.status))
    .sort((a, b) => String(a.createdAt || a.updatedAt || "").localeCompare(String(b.createdAt || b.updatedAt || "")))[0];
  if (!next) return;
  pendingJobs.delete(next.id);
  transcriptionWorkerBusy = true;
  try { await processJob(next.id); }
  finally {
    transcriptionWorkerBusy = false;
    if (pendingJobs.size) retrySoon([...pendingJobs][0], 0);
  }
}
function retrySoon(id, delay = 40) {
  if (!safeId(id)) return;
  pendingJobs.add(id);
  const timer = setTimeout(() => { void drainTranscriptionQueue(); }, Math.max(0, Number(delay) || 0));
  timer.unref();
}
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
        const localEngine = await localEngineStatus();
        respond(res, 200, { ok: true, localEngine, ffmpegReady: await ffmpegReady(), ffprobeReady: await ffprobeReady(), maxUploadBytes: MAX_BYTES, defaultRetentionDays: DEFAULT_RETENTION_DAYS, intake: "local-file-only" });
        return true;
      }
      if (url.pathname === "/interviews" && req.method === "GET") {
        respond(res, 200, { ok: true, jobs: listJobs().filter((job) => !isRetiredImportPlaceholder(job)).map((job) => jobSummary(job)) });
        return true;
      }
      if (url.pathname === "/interviews/upload" && req.method === "POST") {
        const ext = safeExt(req.headers["x-interview-filename"], req.headers["content-type"]);
        const declared = Number(req.headers["content-length"] || 0);
        if (!ext) { respond(res, 400, { ok: false, error: "Supported formats: iPhone Voice Memos (M4A/AAC), CAF, WAV, AIFF, MP3, FLAC, OGG/OPUS and common video files." }); return true; }
        if (declared && declared > MAX_BYTES) { respond(res, 413, { ok: false, error: "Media file is larger than 1.5 GB." }); return true; }
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
          const createdAt = now();
          const job = {
            id,
            title: clip(req.headers["x-interview-title"] || String(req.headers["x-interview-filename"] || "Interview").replace(/\.[^.]+$/, ""), 180),
            filename: clip(req.headers["x-interview-filename"], 180),
            size,
            language: clip(req.headers["x-interview-language"] || "en", 12) || "en",
            speakers: parseSpeakers(req.headers["x-interview-speakers"]),
            sourceUrl: "",
            sourceKind: "upload",
            sourcePath: target,
            mimeType: clip(req.headers["content-type"], 100) || "audio/mpeg",
            status: "queued",
            phase: "queued",
            stage: "Waiting for the local transcription worker",
            progress: 1,
            sourceDurationSeconds: 0,
            chunkCount: 0,
            completedChunks: 0,
            currentChunk: 0,
            attempt: 1,
            attemptStartedAt: createdAt,
            checkpointAt: createdAt,
            segments: [],
            createdAt,
            updatedAt: createdAt,
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
      const match = url.pathname.match(/^\/interviews\/([a-z0-9_-]{12,64})(?:\/(audio|export|retry|article-draft|retention))?$/i);
      if (!match) { respond(res, 404, { ok: false, error: "interview not found" }); return true; }
      const [, id, action] = match;
      const job = readJob(id);
      if (!job) { respond(res, 404, { ok: false, error: "interview not found" }); return true; }
      if (!action && req.method === "GET") { respond(res, 200, { ok: true, job: jobSummary(job, true) }); return true; }
      // A transcript is a working asset, never a source of truth for an
      // article. Deleting it therefore removes only the private audio and
      // transcript job. A linked CMS article is intentionally untouched.
      if (!action && req.method === "DELETE") {
        if (activeJobs.has(id) || ["queued", "processing"].includes(job.status)) {
          respond(res, 409, { ok: false, error: "wait until local processing finishes before removing this interview" });
          return true;
        }
        const folder = path.join(AUDIO_DIR, id);
        try {
          await fsp.rm(folder, { recursive: true, force: true });
          await fsp.unlink(jobPath(id)).catch((error) => { if (error.code !== "ENOENT") throw error; });
          respond(res, 200, { ok: true, deletedId: id, linkedArticleId: Number(job.articleDraft?.id) || null });
        } catch (error) {
          respond(res, 500, { ok: false, error: "could not remove interview working files" });
        }
        return true;
      }
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
        if (['queued', 'processing'].includes(job.status)) { respond(res, 409, { ok: false, error: "this interview is already in the local queue" }); return true; }
        if (job.status === "ready") { respond(res, 409, { ok: false, error: "the transcript is already ready for editing" }); return true; }
        job.status = "queued";
        job.phase = "queued";
        job.stage = "Waiting for the local transcription worker";
        job.progress = 1;
        job.error = "";
        job.attempt = Math.max(1, Number(job.attempt) || 1) + 1;
        job.attemptStartedAt = now();
        job.checkpointAt = now();
        saveJob(job);
        retrySoon(id);
        respond(res, 200, { ok: true, job: jobSummary(job) });
        return true;
      }
      if (action === "retention" && req.method === "POST") {
        if (!job.sourcePath || !fs.existsSync(job.sourcePath)) {
          respond(res, 409, { ok: false, error: "audio expired; only the transcript remains" });
          return true;
        }
        const body = parsed && typeof parsed === "object" ? parsed : {};
        const requestedDays = Number(body.days);
        const allowedDays = [7, DEFAULT_RETENTION_DAYS, MAX_RETENTION_DAYS];
        if (body.days != null && !allowedDays.includes(requestedDays)) {
          respond(res, 400, { ok: false, error: "retention must be 7, 30, or 90 days" });
          return true;
        }
        const currentRetention = Date.parse(job.retentionAt || "");
        const retentionBase = Math.max(Date.now(), Number.isFinite(currentRetention) ? currentRetention : 0);
        const days = allowedDays.includes(requestedDays) ? requestedDays : DEFAULT_RETENTION_DAYS;
        job.retentionAt = new Date(retentionBase + days * 86400000).toISOString();
        saveJob(job);
        respond(res, 200, { ok: true, job: jobSummary(job, true) });
        return true;
      }
      if (action === "article-draft" && req.method === "POST") {
        const body = parsed && typeof parsed === "object" ? parsed : {};
        const actionName = clip(body.action, 24);
        const lockIsFresh = job.articleDraftLock && Date.parse(job.articleDraftLock.createdAt || 0) > Date.now() - 10 * 60 * 1000;
        if (actionName === "reserve") {
          if (job.articleDraft?.id) {
            respond(res, 409, { ok: false, error: `draft #${job.articleDraft.id} already exists for this interview`, job: jobSummary(job, true) });
            return true;
          }
          if (lockIsFresh) {
            respond(res, 409, { ok: false, error: "another editor is creating a draft from this interview", job: jobSummary(job, true) });
            return true;
          }
          const token = crypto.randomUUID();
          job.articleDraftLock = { token, createdAt: now() };
          saveJob(job);
          respond(res, 200, { ok: true, token, job: jobSummary(job, true) });
          return true;
        }
        const token = clip(body.token, 100);
        if (actionName === "link-existing") {
          const draftId = Number(body.articleId);
          if (!Number.isInteger(draftId) || draftId < 1) { respond(res, 400, { ok: false, error: "articleId must be a positive integer" }); return true; }
          if (job.articleDraft?.id && Number(job.articleDraft.id) !== draftId) {
            respond(res, 409, { ok: false, error: `draft #${job.articleDraft.id} is already linked to this interview`, job: jobSummary(job, true) });
            return true;
          }
          job.articleDraft = { id: draftId, title: clip(body.title, 180), createdAt: job.articleDraft?.createdAt || now() };
          delete job.articleDraftLock;
          saveJob(job);
          respond(res, 200, { ok: true, job: jobSummary(job, true) });
          return true;
        }
        if (!lockIsFresh || !token || token !== job.articleDraftLock?.token) {
          respond(res, 409, { ok: false, error: "the draft reservation expired; start again", job: jobSummary(job, true) });
          return true;
        }
        if (actionName === "complete") {
          const draftId = Number(body.articleId);
          if (!Number.isInteger(draftId) || draftId < 1) { respond(res, 400, { ok: false, error: "articleId must be a positive integer" }); return true; }
          job.articleDraft = { id: draftId, title: clip(body.title, 180), createdAt: now() };
          delete job.articleDraftLock;
          saveJob(job);
          respond(res, 200, { ok: true, job: jobSummary(job, true) });
          return true;
        }
        if (actionName === "release") {
          delete job.articleDraftLock;
          saveJob(job);
          respond(res, 200, { ok: true, job: jobSummary(job, true) });
          return true;
        }
        respond(res, 400, { ok: false, error: "unknown draft action" });
        return true;
      }
      if (!action && req.method === "PATCH") {
        const body = parsed && typeof parsed === "object" ? parsed : {};
        if (body.title != null) job.title = clip(body.title, 180) || job.title;
        if (Array.isArray(body.speakers)) job.speakers = body.speakers.map((value) => clip(value, 80)).filter(Boolean).slice(0, 12);
        if (typeof body.reviewed === "boolean") job.reviewedAt = body.reviewed ? (job.reviewedAt || now()) : null;
        if (Array.isArray(body.segments)) {
          job.segments = body.segments.slice(0, 12000).map((segment) => ({
            id: safeId(segment.id) || crypto.randomUUID(),
            start: Math.max(0, Number(segment.start) || 0),
            end: Math.max(0, Number(segment.end) || 0),
            speaker: clip(segment.speaker, 80) || "Speaker",
            text: clip(segment.text, 12000),
            needsReview: Boolean(segment.needsReview),
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
