# Правки бэкенда под приложение

Применены на VPS 173.242.49.73 (EPRIS) 07.08.2026. Файлы на сервере не под git,
поэтому патчи лежат здесь — они идемпотентны и сами делают бэкап рядом с целью.

| Скрипт | Цель на сервере | Что делает |
|---|---|---|
| `patch_content_etag.py` | `/opt/deploy-webhook.js` | `GET /content` отдаёт `ETag`; при совпадении `If-None-Match` — `304` вместо 1.6 МБ |
| `patch_weak_etag.py` | `/opt/deploy-webhook.js` | сравнивает ETag без префикса `W/` |
| `patch_nginx_gzip.py` | `/etc/nginx/conf.d/eprisjournal-api.conf` | `gzip` для `application/json` **только** в блоке `api.eprisjournal.com` |

## Мина: gzip делает ETag слабым

nginx при сжатии переписывает `ETag: "abc"` в `W/"abc"`. Клиент возвращает
именно слабую форму, а Node сравнивал строку строго — и `304` не срабатывал
**ни у одного реального клиента**, хотя curl без `--compressed` показывал `304`.
Отсюда второй патч. Если будете трогать этот код — проверяйте round-trip
именно тем значением, которое сервер отдал:

```bash
ET=$(curl -s --compressed -o /dev/null -D - https://api.eprisjournal.com/content | grep -i '^etag:' | sed 's/[Ee][Tt]ag: *//' | tr -d '\r')
curl -s --compressed -o /dev/null -D - -H "If-None-Match: $ET" https://api.eprisjournal.com/content -w 'downloaded: %{size_download}\n' | grep -iE '^HTTP|downloaded'
```

Ожидаемо: `304`, `downloaded: 0`.

## Результат

| | было | стало |
|---|---|---|
| Полная загрузка | 1 617 208 б | 515 182 б (gzip) |
| Повторная, контент не менялся | 1 617 208 б | 0 б (304) |

Применение патча к Node требует `systemctl restart eprisjournal-webhook` —
на пару секунд недоступны админка и деплой-вебхук. nginx — только `reload`.

## Откат

Бэкапы лежат рядом с оригиналами: `/opt/deploy-webhook.js.bak-etag-*`,
`.bak-weaketag-*`, `/etc/nginx/conf.d/eprisjournal-api.conf.bak-gzip-*`.

## Локальная расшифровка интервью

`interviews.js` и `transcribe-local.py` образуют закрытый контур: запись
остаётся в `/opt/epris-interviews`, разбивается на двухминутные части и
обрабатывается на VPS через `faster-whisper`. Каждый готовый кусок сразу
сохраняется в закрытый архив и доступен редактору для чтения до конца записи.
При этом модель загружается один раз на всю запись, поэтому частые контрольные
точки не добавляют лишнего ожидания на каждом фрагменте. Внешнего API и ключа
OpenAI нет.

В студию можно загружать не только аудио, но и исходный видеофайл: MP4, MOV,
MKV, AVI, WebM, M4V, 3GP и распространённые аудиоформаты (MP3, M4A, WAV, AAC,
OPUS, FLAC и др.). `ffmpeg` извлекает звук на VPS до запуска расшифровки.
Ссылка на YouTube или Vimeo сохраняется только как редакционная ссылка на
первоисточник; студия не скачивает ролики с внешних платформ. Для расшифровки
редакция загружает экспортированный файл, на который у неё есть права.

На текущем сервере используется локальная английская модель `small.en`: это
разумный баланс качества и памяти для одного CPU/≈1.7 ГБ RAM. Процесс запускается
с пониженным приоритетом, поэтому журнал не должен «замирать» во время длинной
расшифровки. Для более быстрого или более точного уровня нужен отдельный worker
с большим объёмом памяти либо GPU — основной сайт менять не придётся.

Разовая установка после доставки серверных файлов:

```bash
install -m 755 /path/to/setup-local-transcription.sh /opt/epris-interviews/setup-local-transcription.sh
/opt/epris-interviews/setup-local-transcription.sh /opt/epris-interviews/transcribe-local.py
```

В unit `eprisjournal-webhook` должны быть заданы:

```ini
Environment=INTERVIEW_PYTHON_BIN=/opt/epris-interviews/.venv/bin/python
Environment=INTERVIEW_TRANSCRIBE_SCRIPT=/opt/epris-interviews/transcribe-local.py
Environment=INTERVIEW_WHISPER_MODEL=/opt/epris-interviews/models/small.en
Environment=INTERVIEW_WHISPER_THREADS=1
```

После `daemon-reload` и перезапуска `/interviews/health` показывает только
готовность локального движка — редактор не видит технических ключей и не должен
настраивать VPS сам.
