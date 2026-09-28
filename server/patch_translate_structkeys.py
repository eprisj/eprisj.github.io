#!/usr/bin/env python3
"""Keeps structural fields out of the translator in /opt/epris-api/epris-translate-queue.js.

collectStrings() handed every string of a block to the provider, the block's
"type" and "align" included, under a prompt that says "translate EVERY string".
gpt-4.1-nano happened to leave "image" alone; gpt-4.1 (switched on 28.09.2026)
obeyed, and articles 48 and 49 came back with "type": "изображение",
"align": "центр" in every language, which the site cannot render.

Two guards: structural keys are never collected (so never sent), and after each
batch they are copied back from the source block, which also covers the
whole-JSON model fallback that does not go through collectStrings.
"""
import shutil, sys, time
F = "/opt/epris-api/epris-translate-queue.js"
s = open(F, encoding="utf-8").read()
if "STRUCT_KEYS" in s:
    print("already patched"); sys.exit(0)

def rep(old, new):
    global s
    assert s.count(old) == 1, ("anchor not unique/missing", old[:80], s.count(old))
    s = s.replace(old, new)

rep('''function collectStrings(node, out) {
  if (Array.isArray(node)) { for (const v of node) collectStrings(v, out); return out; }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) collectStrings(node[k], out);''',
'''/* СЛУЖЕБНЫЕ ПОЛЯ НЕ ПЕРЕВОДЯТСЯ (28.09.2026). Тип блока, выравнивание,
   ширина, адреса — это не текст, а разметка. Раньше они уходили переводчику
   вместе с текстом, и gpt-4.1 честно перевёл "image" в "изображение": статьи
   48 и 49 перестали отрисовываться на всех языках. */
const STRUCT_KEYS = new Set([
  "type", "align", "width", "height", "layout", "variant", "size", "position", "style",
  "url", "href", "src", "id", "slug", "imageUrl", "imageSeed", "previewToken",
  "authorId", "contributorId", "draft", "locked", "onlyLangs", "publishAt", "publishedAt", "updatedAt",
]);
function collectStrings(node, out) {
  if (Array.isArray(node)) { for (const v of node) collectStrings(v, out); return out; }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) { if (!STRUCT_KEYS.has(k)) collectStrings(node[k], out); }''')

rep('''    for (const k of Object.keys(node)) out[k] = applyStrings(node[k], queue);''',
'''    for (const k of Object.keys(node)) out[k] = STRUCT_KEYS.has(k) ? node[k] : applyStrings(node[k], queue);''')

rep('''          next.content.push(...out);''',
'''          // Запасной путь через модель отдаёт ей весь JSON — служебные поля
          // возвращаем из оригинала, что бы она с ними ни сделала.
          out.forEach((b, j) => {
            if (b && typeof b === "object" && batch[j] && typeof batch[j] === "object") {
              for (const k of STRUCT_KEYS) if (k in batch[j]) b[k] = batch[j][k];
            }
          });
          next.content.push(...out);''')

shutil.copy2(F, F + time.strftime(".bak-structkeys-%Y%m%d-%H%M%S"))
open(F, "w", encoding="utf-8").write(s)
print("patched")
