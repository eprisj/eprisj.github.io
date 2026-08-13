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
