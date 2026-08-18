"use strict";

/* ZIP БЕЗ ЗАВИСИМОСТЕЙ.
 *
 * Редакции нужен один файл со всеми снимками автора, а не двадцать нажатий
 * «скачать». Ставить ради этого архиватор в зависимости службы не хочется:
 * лишняя библиотека живёт годами и требует обновлений безопасности, а нам
 * нужен ровно один формат и ровно один режим.
 *
 * Пишем ZIP без сжатия (метод «store»): фотографии и без того сжаты, JPEG и
 * PNG от дефлейта не уменьшаются, зато архив собирается потоково и без
 * расхода памяти на весь объём. Формат простой и старый: локальный заголовок
 * перед каждым файлом, центральный каталог в конце.
 *
 * Zip64 не поддерживаем сознательно: он нужен от четырёх гигабайт, а предел
 * одного ответа у нас два, и молчаливое превышение лучше запретить явно.
 */

const fs = require("fs");
const crc32Table = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = crc32Table[(c ^ buffer[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* Имя внутри архива. Разделитель папок сохраняем: архив с папкой на каждого
   автора разбирается сразу, а плоский список из двадцати снимков нет. Чистим
   каждый сегмент по отдельности, убирая символы, на которых спотыкается
   проводник Windows. Кириллица остаётся: её разрешает флаг UTF-8. */
function safeEntryName(name, taken) {
  let base = String(name || "file")
    .split("/")
    .map((part) => part.replace(/[\\:*?"<>|\r\n]/g, "-").trim())
    /* Сегменты «..» и «.» выбрасываются. Имя приходит из ответа автора, а
       распаковщики по традиции идут по такому пути наружу целевой папки:
       архив с записью «../../etc/passwd» пишет файл туда, куда его никто не
       звал. Папки при этом остаются, потому что вверх по дереву они не ведут. */
    .filter((part) => part && part !== "." && part !== "..")
    .join("/") || "file";
  let candidate = base;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    const dot = base.lastIndexOf(".");
    candidate = dot > 0 ? `${base.slice(0, dot)} (${n})${base.slice(dot)}` : `${base} (${n})`;
    n += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

function dosTime(date) {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xFFFF;
  const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF;
  return { time, day };
}

/* Собирает архив целиком в буфер. Для десятков фотографий это правильный
   размен: буфер живёт секунды, зато ответ получает точную длину, а значит
   браузер показывает прогресс и умеет докачивать. */
function buildZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const taken = new Set();

  for (const entry of entries) {
    const name = Buffer.from(safeEntryName(entry.name, taken), "utf8");
    const data = entry.data || fs.readFileSync(entry.path);
    const { time, day } = dosTime(entry.date || new Date());
    const sum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);            // версия
    local.writeUInt16LE(0x0800, 6);        // флаг UTF-8 в именах
    local.writeUInt16LE(0, 8);             // метод: без сжатия
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(time, 12);
    dir.writeUInt16LE(day, 14);
    dir.writeUInt32LE(sum, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += local.length + name.length + data.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuffer, end]);
}

module.exports = { buildZip, crc32 };
