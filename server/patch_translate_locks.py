#!/usr/bin/env python3
"""Adds translation locks to /opt/epris-api/epris-translate-queue.js.

Locks live in /opt/epris-content/translate-locks.json, a file the admin
panel never writes, e.g. {"articles:46": ["UA", "RU"], "reviews:3": "*"}.
A locked language is never written by the queue: not by a forced manual
re-run, a needsDecision "overwrite", the upgrade sweep or audit repair,
because every one of those ends in runJob's per-language loop.
"""
import shutil, sys, time
F = "/opt/epris-api/epris-translate-queue.js"
s = open(F, encoding="utf-8").read()
if "translate-locks.json" in s:
    print("already patched"); sys.exit(0)

def rep(old, new):
    global s
    assert s.count(old) == 1, ("anchor not unique/missing", old[:80], s.count(old))
    s = s.replace(old, new)

rep('''  const STAMPS_FILE = path.join(contentDir, "translate-stamps.json");''',
'''  const STAMPS_FILE = path.join(contentDir, "translate-stamps.json");
  /* ЗАМКИ ПЕРЕВОДА (25.09.2026). Языки записи, которые правили руками и
     которые автоматика не должна трогать никогда: {"articles:46": ["UA","RU"]}
     или "*" на все языки. Отдельный файл, а не поле в записи: админка сохраняет
     контент целиком и о таких полях не знает. Читается на каждой проверке,
     чтобы замок действовал без перезапуска службы. */
  const LOCKS_FILE = path.join(contentDir, "translate-locks.json");
  function lockedFor(section, id, lang, entry) {
    if (entry && entry.locked === true) return true;
    const locks = loadJson(LOCKS_FILE, {});
    const v = locks[`${section}:${id}`];
    if (!v) return false;
    if (v === "*" || v === true) return true;
    return Array.isArray(v) && v.map((x) => String(x).toUpperCase()).includes(String(lang).toUpperCase());
  }''')

rep('''      const existing = findEntry(data, job.section, lang, job.entryId);
      if (!job.force && handEdited(job.section, job.entryId, lang, existing)) {''',
'''      // Замок сильнее force: принудительный перезапуск, «перезаписать» в
      // решениях, upgrade и починка аудита приходят сюда же.
      const srcNow = findEntry(data, job.section, job.sourceLang, job.entryId) || source;
      if (lockedFor(job.section, job.entryId, lang, srcNow)) {
        job.skipped.push({ lang, reason: "locked" });
        log(`[translate] #${job.entryId} ${lang}: skipped, locked`);
        continue;
      }

      const existing = findEntry(data, job.section, lang, job.entryId);
      if (!job.force && handEdited(job.section, job.entryId, lang, existing)) {''')

rep('''        for (const lang of langsForEntry(data, section, entry.id)) {
          const existing = findEntry(data, section, lang, entry.id);
          const st = stamps[stampKey(section, entry.id, lang)];
          if (existing && handEdited(section, entry.id, lang, existing)) {''',
'''        for (const lang of langsForEntry(data, section, entry.id)) {
          if (lockedFor(section, entry.id, lang, entry)) continue;
          const existing = findEntry(data, section, lang, entry.id);
          const st = stamps[stampKey(section, entry.id, lang)];
          if (existing && handEdited(section, entry.id, lang, existing)) {''')

shutil.copy2(F, F + time.strftime(".bak-locks-%Y%m%d-%H%M%S"))
open(F, "w", encoding="utf-8").write(s)
print("patched")
