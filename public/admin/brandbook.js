/* ══════════════════════════════════════════════════════════
   БРЕНД-БУК EPRIS JOURNAL — справочник дизайн-системы.

   Что здесь есть: канон (палитра, шрифты, шкала, компоненты,
   правила) и честный аудит того, что реально лежит в коде
   сайта — 113 уникальных HEX при 10 задекларированных токенах,
   12 значений tracking, пять почти одинаковых чёрных. Плюс
   целевая спецификация токенов готовым кодом и план, как
   свести одно к другому, ничего не сломав.

   Значения сняты из eprisjournal/src/index.css (:root),
   tailwind.config.js и index.html; цифры использования —
   прогон по src/ на 31.07.2026. Раздел статический: ничего
   не грузит, ничего не сохраняет, редактору тоже полезен.
   ══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ── данные ──────────────────────────────────────────── */

  const CORE = [
    { hex: '#4a1728', name: 'Burgundy / Бордо', token: '--c-accent · pp-burgundy', onDark: true,
      role: 'Главный цвет бренда. Текст, заголовки, линии, активные состояния.' },
    { hex: '#b8956e', name: 'Gold / Золото', token: '--c-gold · pp-gold',
      role: 'Акцент: рубрикаторы, номера, разделители, hover. Никогда не основной текст.' },
    { hex: '#f5f0eb', name: 'Paper / Бумага', token: '--c-bg',
      role: 'Фон страницы. Все поверхности светлее него — подъём, темнее — врезка.' },
    { hex: '#1a0b10', name: 'Ink / Чернила', token: 'pp-ink', onDark: true,
      role: 'Максимальный контраст: тёмные секции, футер, оверлеи, фон медиаплеера.' },
  ];

  const CREAM = [
    { hex: '#f5eddc', name: 'Cream Light', token: 'pp-cream-light', role: 'Фон карточек и врезок.' },
    { hex: '#ede1c6', name: 'Cream Base', token: 'pp-cream-base', role: 'Обложки номеров, паспортные бланки.' },
    { hex: '#e7d8b8', name: 'Cream Dark', token: 'pp-cream-dark', role: 'Границы и тени на креме.' },
  ];

  const SEMANTIC = [
    { hex: '#4a7c59', name: 'Success', onDark: true, role: 'Подтверждение, «в наличии», успешное действие.' },
    { hex: '#b33939', name: 'Danger', onDark: true, role: 'Ошибки, удаление, «нет в наличии».' },
    { hex: '#b8860b', name: 'Warning', onDark: true, role: 'Предупреждение, черновик, ожидание.' },
  ];

  const SURFACES = [
    { hex: '#fbf8f4', name: 'paper-raised', on: '#4a1728' },
    { hex: '#f5f0eb', name: 'paper', on: '#4a1728' },
    { hex: '#e8ded5', name: 'paper-sunken', on: '#4a1728' },
    { hex: '#28151b', name: 'ink-700', on: '#f5f0eb' },
    { hex: '#1a0b10', name: 'ink-800', on: '#f5f0eb' },
    { hex: '#0d0408', name: 'ink-900', on: '#f5f0eb' },
  ];

  const DRIFT = [
    { group: 'Бордовые', target: '#4a1728', targetName: '--c-accent',
      variants: [['#4a1728', 20], ['#501a2c', 20], ['#3d1220', 5], ['#3a1520', 5], ['#2d1820', 6], ['#241016', 5]],
      note: '#501a2c — цвет админки, просочившийся на сайт. Глаз разницы не видит, но две правды в коде ломают любую смену темы.' },
    { group: 'Чернильные', target: '#1a0b10', targetName: 'pp-ink',
      variants: [['#28151b', 32], ['#1a0812', 14], ['#0d0408', 13], ['#1a0b10', 6], ['#1a0a12', 4]],
      note: 'Пять почти-чёрных. Предложение: три уровня — ink-900 #0d0408, ink-800 #1a0b10, ink-700 #28151b.' },
    { group: 'Бумажные / светлые', target: '#f5f0eb', targetName: '--c-bg',
      variants: [['#e8ded5', 29], ['#f5f0ea', 9], ['#fbf8f4', 5], ['#f7f2ec', 5], ['#f7f2ea', 5], ['#f8f4ed', 2], ['#f5f0eb', 2], ['#eee8df', 2]],
      note: 'Восемь оттенков бумаги, четыре из них различаются на 1–2 единицы. Достаточно трёх: paper, paper-raised (#fbf8f4), paper-sunken (#e8ded5).' },
    { group: 'Терракотовые акценты', target: '#9f4f42', targetName: 'clay (новый токен)',
      variants: [['#9f4f42', 10], ['#a34f42', 6], ['#a65346', 3], ['#8b3a3a', 7], ['#b33939', 7]],
      note: 'Незадокументированное семейство — появилось в /materie и в состояниях ошибок. Либо легализуем как токен clay, либо сводим к бордо.' },
    { group: 'Серо-лиловый текст', target: '#755e66', targetName: 'muted',
      variants: [['#755e66', 5], ['#826d74', 4], ['#8a747b', 3], ['#8b757d', 2], ['#725b63', 3], ['#67545a', 3]],
      note: 'Шесть вариантов приглушённого текста. Хватает двух уровней: muted #755e66 и muted-soft #8a747b.' },
  ];

  const FONTS = [
    { cls: 'font-mono', css: '—', uses: 434, weights: '400',
      stack: "'OCR-B 10 BT', 'OCR-B', 'Courier New', monospace",
      sample: 'EPRIS JOURNAL — ISSUE 04 / MMXXVI',
      role: 'Рабочая лошадка EPRIS: рубрики, даты, подписи, навигация, счётчики, паспортные поля. Всегда в верхнем регистре с разрядкой.' },
    { cls: 'font-display', css: '--font-display', uses: 13, weights: '400 500 600 700 + italic',
      stack: "'Playfair Display', 'PT Serif', serif", sample: 'Тишина, которую слышно',
      role: 'Заголовки обложек и hero. Крупный кегль, курсив для акцента.' },
    { cls: 'font-serif', css: '—', uses: 159, weights: '400 700 + italic',
      stack: "'PT Serif', serif", sample: 'Каждый номер — это попытка остановить время.',
      role: 'Тело статьи. Длинное чтение, локальные шрифты из /fonts (без Google).' },
    { cls: 'font-sans', css: '--font-body', uses: 7, weights: '400 700 + italic',
      stack: "'PT Sans', sans-serif", sample: 'Подписаться на рассылку',
      role: 'Базовый body-шрифт (:root). Интерфейсные надписи, формы, кнопки.' },
    { cls: 'font-crimson', css: '—', uses: 6, weights: '400 600 + italic',
      stack: "'Crimson Text', serif", sample: '«Мы пишем о том, что не успевает стать новостью»',
      role: 'Цитаты и лиды в отдельных материалах.' },
  ];

  const EXTRA_FONTS = [
    { name: 'Orbit', role: 'Технические надписи в /materie и радио-плеере.' },
    { name: 'Zeyada', role: 'Рукописная подпись — только в колофоне и на открытках.' },
  ];

  const SCALE = [
    { name: 'micro', px: 8, tracking: '.25em', font: 'mono', uses: 51, role: 'Копирайт, служебные метки, номера страниц.' },
    { name: 'caption', px: 9, tracking: '.22em', font: 'mono', uses: 118, role: 'Подписи к фото, даты, теги.' },
    { name: 'label', px: 10, tracking: '.2em', font: 'mono', uses: 152, role: 'Рубрики, навигация, кнопки. Самый частый размер на сайте.' },
    { name: 'meta', px: 11, tracking: '.18em', font: 'mono', uses: 34, role: 'Автор, время чтения, метаданные карточки.' },
    { name: 'body-sm', px: 13, tracking: 'normal', font: 'serif', uses: 6, role: 'Лиды карточек, анонсы.' },
    { name: 'body', px: 15, tracking: 'normal', font: 'serif', uses: 10, role: 'Основной текст статьи.' },
    { name: 'lead', px: 17, tracking: 'normal', font: 'serif', uses: 1, role: 'Вводный абзац.' },
    { name: 'h3', px: 23, tracking: '.02em', font: 'display', uses: 1, role: 'Подзаголовки в статье.' },
    { name: 'h2', px: 32, tracking: '.02em', font: 'display', uses: 1, role: 'Заголовок материала.' },
    { name: 'h1', px: 34, tracking: '.03em', font: 'display', uses: 1, role: 'Hero, обложка номера.' },
  ];

  const TRACKING_NOW = [['.15em', 7], ['.16em', 8], ['.17em', 6], ['.18em', 21], ['.2em', 50], ['.22em', 7],
    ['.25em', 14], ['.28em', 4], ['.3em', 12], ['.32em', 2], ['.35em', 7], ['.4em', 3]];
  const TRACKING_TARGET = [
    ['.18em', 'плотная — длинные строки метаданных'],
    ['.2em', 'базовая — рубрики, навигация, кнопки'],
    ['.25em', 'широкая — мелкие служебные метки'],
    ['.35em', 'витринная — логотип, hero-кикер'],
  ];

  const SHAPE = [
    { token: 'rounded-none', px: 0, uses: '—', role: 'Фото, обложки, врезки, таблицы — всё редакционное.' },
    { token: 'rounded-full', px: 999, uses: '85', role: 'Пилюли-теги, аватары, кнопки плеера.' },
    { token: 'rounded-lg', px: 8, uses: '15', role: 'Карточки и панели интерфейса.' },
    { token: 'rounded-xl / 2xl', px: 14, uses: '17', role: 'Модалки и большие оверлеи.' },
  ];

  const SPACING = [
    ['4 / 8 / 12 / 16', 'Внутренние отступы компонентов.'],
    ['24 / 32', 'Между блоками в секции.'],
    ['48 / 64 / 96', 'Между секциями страницы.'],
    ['max-w 1200px', 'Сетка страницы; текстовая колонка — 68ch.'],
  ];

  const RULES = [
    'Бордо — это текст, а не фон. Фоном бордо становится только в футере и в тёмных врезках.',
    'Золото никогда не несёт основного текста: только линии, номера, рубрики, hover.',
    'Mono всегда в верхнем регистре с разрядкой. Mono строчными буквами не существует.',
    'Сериф никогда не разряжается: tracking для PT Serif — normal.',
    'Редакционная графика (фото, обложки, врезки) — прямые углы. Скругление — признак интерфейса.',
    'Тень не используется как декор; глубина строится фоном (paper-raised / paper-sunken).',
    'Минимальный кегль — 8px и только для mono в верхнем регистре. Сериф ниже 13px не опускается.',
  ];

  const COMPONENTS = [
    { name: 'Кнопка-пилюля (read, more, subscribe)',
      anatomy: 'Рамка 1px + mono 10px uppercase, разрядка .2em, padding 6/16, border-radius 999.',
      spec: ['Покой: бордовая рамка, бордовый текст, прозрачный фон.',
        'Hover: заливка бордовым, текст цвета бумаги. Только цвет, без сдвига и тени.',
        'На тёмном фоне инвертируется: рамка и текст — бумага.'],
      dont: 'Не делать заливкой по умолчанию — в EPRIS кнопка тихая, она не «продаёт».' },
    { name: 'Тег / рубрикатор',
      anatomy: 'mono 8–10px uppercase, разрядка .2em, padding 4/10, без рамки.',
      spec: ['На фото — плашка цвета бумаги с прозрачностью .9, текст бордовый.',
        'Без фото — золотой текст без плашки.',
        'Один тег на карточку. Категория и статус одновременно — только в админке.'],
      dont: 'Не красить теги в разные цвета по категориям — категория читается словом.' },
    { name: 'Карточка материала',
      anatomy: 'Фон paper-sunken, рамка 1px бордо, фото 16:9 сверху, padding 24–32, прямые углы.',
      spec: ['Порядок: фото → рубрика → заголовок serif → подзаголовок mono → текст → линия → мета.',
        'Заголовок serif 23–28px, никогда не uppercase.',
        'Мета прижата книзу (mt-auto), чтобы низ карточек в ряду совпадал.'],
      dont: 'Не добавлять тень и не скруглять — карточка это лист, а не кнопка.' },
    { name: 'Вердикт / цитата-врезка',
      anatomy: 'Serif italic 17–20px, левая золотая линия 2px, отступ слева 14–16.',
      spec: ['Максимум одна на карточку — это вывод, а не оформление.',
        'Длина до 120 знаков: вердикт должен читаться одним взглядом.'],
      dont: 'Не использовать кавычки вместе с линией — это двойная маркировка.' },
    { name: 'Линия-разделитель',
      anatomy: '1px, цвет --c-rule (бордо .18). Вертикальные отступы 24–32.',
      spec: ['Линия разделяет смыслы, а не украшает ритм.',
        'Внутри карточки максимум одна линия — перед метаданными.'],
      dont: 'Не ставить линию сразу под заголовком — заголовок и так отделён воздухом.' },
    { name: 'Подпись к фото',
      anatomy: 'mono 9px uppercase, разрядка .25em, цвет muted-soft, отступ 8 сверху.',
      spec: ['Формат: объект · место · год. Точка в конце не ставится.',
        'FIG. NN — только в галерее, сквозная нумерация в пределах номера.'],
      dont: 'Не дублировать подписью то, что уже сказано в заголовке.' },
  ];

  const DO_DONT = [
    ['Заголовок', 'Serif, смешанный регистр, без разрядки.', 'Serif в верхнем регистре с tracking .2em.'],
    ['Рубрика', 'Mono uppercase, разрядка .2em, 10px.', 'Mono нижним регистром без разрядки.'],
    ['Акцент', 'Золото на линии под рубрикой.', 'Золотой текст абзаца на бумаге.'],
    ['Карточка', 'Прямые углы, рамка 1px, без тени.', 'Радиус 16 и мягкая тень под карточкой.'],
    ['Кнопка', 'Рамка + hover-заливка бордовым.', 'Градиент и тень, поднимающаяся при наведении.'],
    ['Отступ', 'Шаг сетки: 8 / 16 / 24 / 32.', 'Произвольные 13, 19, 27 «на глаз».'],
  ];

  const MOTION = [
    ['--dur-fast .2s', 'Смена цвета: hover, focus, активная вкладка.', '12 мест с duration-200'],
    ['--dur-base .3s', 'Появление элемента, раскрытие превью.', '31 место с duration-300'],
    ['--dur-slow .5s', 'Reveal секции при скролле, смена маршрута.', '9 мест с duration-500'],
  ];

  const MOTION_RULES = [
    'Одна переменная на роль: 0.7s и 0.8s в коде (8 мест) сводятся к 0.5s.',
    'Смягчение всегда одно: cubic-bezier(.22,.61,.36,1). Никаких linear и bounce.',
    'Движение только по opacity и transform — никаких анимаций высоты и цвета фона.',
    'Reveal срабатывает один раз; повторная анимация при скролле назад запрещена.',
    'prefers-reduced-motion: всё сводится к мгновенному появлению.',
  ];

  const IMAGERY = [
    ['Пропорции', 'Карточка 16:9, главный обзор и обложка 4:3, портрет автора 1:1. Других не заводим.'],
    ['Обработка', 'Тёплый, слегка приглушённый цвет; контраст без чёрных провалов. Фото ложится на ink-800, поэтому тёмные кадры не «висят» на светлом.'],
    ['Кадр', 'Вещи и пространство важнее лиц анфас. Пустота в кадре — черта, а не ошибка.'],
    ['Запрещено', 'Стоковые улыбки, тяжёлые фильтры, рамки-тени, коллажи с обводкой, текст поверх фото (кроме плашки-рубрики).'],
    ['Файлы', 'WebP, длинная сторона 1600px для карточек и 2400px для обложек, имя — slug материала.'],
  ];

  const VOICE = [
    ['read', 'ЧИТАТЬ ДАЛЕЕ →', 'Кнопки — одно слово нижним регистром в mono.'],
    ['Issue 04 · MMXXVI', 'Выпуск №4, 2026 год', 'Номера — римские в колофоне, арабские в навигации.'],
    ['Ресторан «Olea», Лимасол', 'Обзор ресторана Olea в городе Лимасол', 'Подзаголовок называет объект, а не пересказывает.'],
    ['Медленная середина.', 'Минус: местами слегка затянуто, но это не критично.', 'Минусы — коротко и без извинений.'],
  ];

  const A11Y = [
    'Основной текст — не менее 4.5:1. Бордо на бумаге даёт 11.8:1, запас большой.',
    'Золото не используется для текста на светлом: 2.1:1 — это декор.',
    'Фокус виден всегда: 2px золотая обводка с отступом 2px, никогда outline:none без замены.',
    'Минимальная зона нажатия 44×44px, даже если визуально кнопка мельче.',
    'У каждого фото есть alt; у декоративных — alt="".',
    'Язык страницы переключается вместе с интерфейсом: <html lang> должен соответствовать выбранному.',
    'Разрядка не применяется к длинным серифным абзацам — это вредит чтению.',
  ];

  const AUDIT = [
    ['113', 'уникальных HEX в src/', true, 'при 10 задекларированных токенах'],
    ['540', 'обращений к var(--c-*)', false, 'accent 302 · bg 115 · gold 123'],
    ['12', 'значений tracking', true, 'сводим к 4'],
    ['13', 'жёстких кеглей text-[Npx]', true, 'сводим к шкале из 10 шагов'],
    ['7', 'шрифтовых семейств', true, '5 в Tailwind + Orbit + Zeyada'],
  ];

  const PLAN = [
    { n: 1, title: 'Расширить :root до полного набора токенов', risk: 'низкий',
      what: 'Добавить в index.css --c-ink-900/800/700, --c-paper-raised/sunken, --c-clay, --c-muted, --c-muted-soft, --c-success/danger/warning. Ничего не менять визуально — просто дать именам существовать.',
      effect: 'Правки темы из раздела «Оформление» начинают действовать на весь сайт, а не на 3 цвета.' },
    { n: 2, title: 'Прокинуть токены в tailwind.config.js', risk: 'низкий',
      what: 'colors переписать через var(--c-*), чтобы bg-pp-ink и bg-[var(--c-ink-800)] были одним и тем же.',
      effect: 'Исчезает соблазн писать bg-[#28151b] — есть класс.' },
    { n: 3, title: 'Свести бордовые к одному', risk: 'средний',
      what: '#501a2c, #3d1220, #3a1520, #2d1820, #241016 → var(--c-accent). 41 вхождение.',
      effect: 'Главный цвет бренда перестаёт двоиться. Нужен визуальный проход по тёмным секциям.' },
    { n: 4, title: 'Три уровня чернил вместо пяти', risk: 'низкий',
      what: '#1a0812 и #1a0a12 → ink-800; остальные остаются на своих уровнях.',
      effect: '−2 цвета, тёмные секции становятся предсказуемыми.' },
    { n: 5, title: 'Три бумаги вместо восьми', risk: 'низкий',
      what: '#f5f0ea, #f7f2ec, #f7f2ea, #f8f4ed, #eee8df → paper / paper-raised.',
      effect: '−5 цветов. Разница глазу незаметна, но фон наконец однороден.' },
    { n: 6, title: 'Решить судьбу терракотовых', risk: 'средний',
      what: 'Легализовать #9f4f42 как --c-clay и свести к нему #a34f42, #a65346; #8b3a3a и #b33939 отдать семантике danger.',
      effect: 'Либо новое официальное семейство, либо минус 5 случайных цветов — но не «как сейчас».' },
    { n: 7, title: 'Две шкалы вместо двух дюжин значений', risk: 'средний',
      what: 'Кегли → 10 шагов шкалы, tracking → 4 значения. Оформить утилитными классами .t-label, .t-caption, .t-meta.',
      effect: 'Типографика становится узнаваемой, а не «примерно как рядом».' },
    { n: 8, title: 'Зафиксировать правило', risk: 'низкий',
      what: 'В CLAUDE.md сайта: никаких сырых HEX в src/ — только токены. Проверять грепом на деплое.',
      effect: 'Палитра не расползётся снова через полгода.' },
  ];

  const DELIVERABLES = [
    ['index.css', 'Полный :root из 20+ токенов вместо 7. Тема из «Оформления» наконец управляет всем сайтом.'],
    ['tailwind.config.js', 'Цвета и разрядка через var(). Классы и переменные перестают быть двумя разными правдами.'],
    ['Три утилитных класса', '.t-label / .t-caption / .t-meta закрывают более 300 мест ручного набора стиля.'],
    ['scripts/check-tokens.sh', 'Деплой падает, если в src/ появился сырой HEX. Палитра не расползётся второй раз.'],
    ['Этот раздел', 'Единый источник правды для дизайна и для любого, кто потом будет править код.'],
  ];

  const REFS = [
    { title: 'Редакционные', sub: 'Издания, на которые EPRIS похож по характеру — и одно, на которое намеренно не похож.', items: [
      ['The Gentlewoman', 'https://thegentlewoman.co.uk', 'Эталон «тихой» редакционной сетки: огромные поля, один акцентный цвет, сериф без украшений.', 'Подтверждение курса на воздух вместо декора. Взять ритм полей в раздел выпуска.'],
      ['Apartamento', 'https://www.apartamentomagazine.com', 'Домашняя, «непричёсанная» фотография и очень сдержанная типографика.', 'Наш раздел фото имеет право на кадры без стилизации — это в характере бренда.'],
      ['Kinfolk', 'https://www.kinfolk.com', 'Кремовая палитра и очень большие междустрочия в длинных текстах.', 'Аргумент поднять line-height основного текста с 1.6 до 1.7.'],
      ['MUBI Notebook', 'https://mubi.com/en/notebook', 'Обзоры как отдельный раздел с чёткой карточкой и минимальной метой.', 'Модель для нашего /reviews: вердикт + короткий текст + подпись.'],
      ['032c', 'https://032c.com', 'Противоположный полюс: агрессивный mono, резкие плашки.', 'Показывает границу, за которую EPRIS не идёт — берём только дисциплину верхнего регистра.'],
      ['Are.na', 'https://www.are.na', 'Интерфейс, полностью уступающий контенту; mono как рабочий, а не декоративный шрифт.', 'Прямое подтверждение нашей роли mono. Смотреть их состояния фокуса.'],
    ] },
    { title: 'Дизайн-системы', sub: 'Откуда взята структура токенов, типографики и формат карточек компонентов.', items: [
      ['Radix Colors', 'https://www.radix-ui.com/colors', 'Шкала из 12 шагов, где у каждого шага есть назначение (фон, граница, текст).', 'Модель для наших ink/paper уровней: не «похожие оттенки», а роли.'],
      ['Material Design 3 — tokens', 'https://m3.material.io/foundations/design-tokens', 'Разделение на reference / system / component токены.', 'Нам хватит двух уровней: сырой цвет и роль. Третий не заводим.'],
      ['IBM Carbon — type', 'https://carbondesignsystem.com/elements/typography/overview', 'Типографика как набор именованных стилей, а не набор размеров.', 'Прямой прообраз наших .t-label / .t-caption / .t-meta.'],
      ['GOV.UK Design System', 'https://design-system.service.gov.uk', 'Каждое решение сопровождается разделом «когда не использовать».', 'Формат наших карточек компонентов: анатомия + правила + чего не делать.'],
      ['GitHub Primer', 'https://primer.style', 'Пример жизни системы в коде: токены, линтеры, миграции.', 'Отсюда идея скрипта-сторожа против сырых HEX.'],
      ['Utopia', 'https://utopia.fyi', 'Плавные типографические шкалы между брейкпойнтами.', 'Кандидат на второй этап — когда зафиксируем базовую шкалу.'],
    ] },
    { title: 'Инструменты и нормы', sub: 'Чем проверять решения.', items: [
      ['WCAG 2.2 — Contrast', 'https://www.w3.org/TR/WCAG22/#contrast-minimum', 'Норматив, по которому считаются пары в разделе «Доступность».', 'Формула контраста в этом бренд-буке считает именно по нему.'],
      ['OKLCH Color Picker', 'https://oklch.com', 'Даёт равномерные по восприятию шейды от базового цвета.', 'Инструмент для построения ink/paper уровней без «грязных» промежутков.'],
      ['Type Scale', 'https://typescale.com', 'Проверка кегельной шкалы на модульность.', 'Наша шкала близка к 1.25 — на ней и фиксируемся.'],
      ['Google Fonts', 'https://fonts.google.com', 'Источник Playfair Display, PT Sans, PT Serif, Crimson Text.', 'Проверить, не пора ли перенести все семейства в self-hosted, как уже сделано с PT.'],
    ] },
  ];

  const TOKENS_CSS = `:root {
  /* Бренд */
  --c-accent:        #4a1728;   /* бордо — главный */
  --c-accent-rgb:    74 23 40;
  --c-gold:          #b8956e;
  --c-gold-rgb:      184 149 110;

  /* Бумага: три уровня вместо восьми */
  --c-paper:         #f5f0eb;   /* фон страницы          (--c-bg) */
  --c-paper-raised:  #fbf8f4;   /* карточка над фоном */
  --c-paper-sunken:  #e8ded5;   /* врезка, плита темнее */

  /* Чернила: три уровня вместо пяти */
  --c-ink-900:       #0d0408;   /* максимум, оверлеи */
  --c-ink-800:       #1a0b10;   /* тёмные секции, футер */
  --c-ink-700:       #28151b;   /* границы и подложки на тёмном */

  /* Текст */
  --c-muted:         #755e66;
  --c-muted-soft:    #8a747b;

  /* Акцентное семейство */
  --c-clay:          #9f4f42;   /* терракота — /materie, пометки */

  /* Состояния */
  --c-success:       #4a7c59;
  --c-danger:        #b33939;
  --c-warning:       #b8860b;

  /* Линии */
  --c-rule:          rgb(var(--c-accent-rgb) / .18);
  --c-rule-strong:   rgb(var(--c-accent-rgb) / .35);

  /* Типографика */
  --font-display:    'Playfair Display', 'PT Serif', serif;
  --font-body:       'PT Sans', sans-serif;
  --font-read:       'PT Serif', serif;
  --font-mono:       'OCR-B 10 BT', 'OCR-B', 'Courier New', monospace;

  /* Разрядка */
  --track-tight:     .18em;
  --track-base:      .2em;
  --track-wide:      .25em;
  --track-display:   .35em;

  /* Движение */
  --dur-fast:        .2s;
  --dur-base:        .3s;
  --dur-slow:        .5s;
  --ease:            cubic-bezier(.22, .61, .36, 1);
}`;

  const TOKENS_TW = `// tailwind.config.js — классы ссылаются на те же переменные,
// поэтому bg-pp-ink и bg-[var(--c-ink-800)] перестают разъезжаться.
colors: {
  'pp-burgundy':   'var(--c-accent)',
  'pp-gold':       'var(--c-gold)',
  paper:           'var(--c-paper)',
  'paper-raised':  'var(--c-paper-raised)',
  'paper-sunken':  'var(--c-paper-sunken)',
  'ink-900':       'var(--c-ink-900)',
  'ink-800':       'var(--c-ink-800)',
  'ink-700':       'var(--c-ink-700)',
  muted:           'var(--c-muted)',
  'muted-soft':    'var(--c-muted-soft)',
  clay:            'var(--c-clay)',
},
letterSpacing: {
  tight:   'var(--track-tight)',
  base:    'var(--track-base)',
  wide:    'var(--track-wide)',
  display: 'var(--track-display)',
},`;

  const UTILS_CSS = `/* Три класса закрывают 300+ мест, где сейчас руками
   складывают font-mono + text-[10px] + tracking-[0.2em] + uppercase. */
.t-label   { font: 400 10px/1.4 var(--font-mono); letter-spacing: var(--track-base);
             text-transform: uppercase; }
.t-caption { font: 400 9px/1.5  var(--font-mono); letter-spacing: var(--track-wide);
             text-transform: uppercase; }
.t-meta    { font: 400 11px/1.5 var(--font-mono); letter-spacing: var(--track-tight);
             text-transform: uppercase; }
.t-read    { font: 400 15px/1.7 var(--font-read); }
.rule      { border: 0; border-top: 1px solid var(--c-rule); }`;

  const GUARD_SH = `# scripts/check-tokens.sh — ставится в деплой перед build.
# Ловит сырые HEX в src/ и не даёт палитре расползтись снова.
hits=$(grep -rnE '#[0-9a-fA-F]{6}' src --include='*.tsx' --include='*.ts' \\
       --include='*.css' | grep -v 'index.css' | grep -v 'ALLOWED')
if [ -n "$hits" ]; then
  echo "Сырые HEX вне токенов:"; echo "$hits"; exit 1
fi`;

  const CODE_TABS = [
    ['index.css', TOKENS_CSS],
    ['tailwind.config.js', TOKENS_TW],
    ['утилитные классы', UTILS_CSS],
    ['скрипт-сторож', GUARD_SH],
  ];

  const SECTIONS = [
    ['identity', 'Идентичность'], ['palette', 'Палитра'], ['drift', 'Рассинхрон'],
    ['tokens', 'Токены'], ['type', 'Шрифты'], ['scale', 'Шкала'], ['shape', 'Сетка'],
    ['rules', 'Правила'], ['components', 'Компоненты'], ['dodont', 'Так / не так'],
    ['motion', 'Движение'], ['imagery', 'Изображения'], ['voice', 'Голос'],
    ['a11y', 'Доступность'], ['audit', 'Аудит'], ['refs', 'Референсы'],
    ['deliverables', 'На выходе'], ['plan', 'План'],
  ];

  /* ── контраст по WCAG 2.2: считаем, а не переписываем числа ── */

  const channel = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const luminance = (hex) => {
    const h = hex.replace('#', '');
    return 0.2126 * channel(parseInt(h.slice(0, 2), 16))
         + 0.7152 * channel(parseInt(h.slice(2, 4), 16))
         + 0.0722 * channel(parseInt(h.slice(4, 6), 16));
  };
  const contrast = (a, b) => {
    const l1 = luminance(a), l2 = luminance(b);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  };
  const verdictFor = (r) =>
    r >= 7 ? ['AAA', '#4a7c59'] : r >= 4.5 ? ['AA', '#4a7c59'] : r >= 3 ? ['AA lg', '#b8860b'] : ['декор', '#b33939'];

  const MATRIX_BG = [['#f5f0eb', 'paper'], ['#e8ded5', 'paper-sunken'], ['#1a0b10', 'ink-800'], ['#4a1728', 'accent']];
  const MATRIX_FG = [['#4a1728', 'accent'], ['#b8956e', 'gold'], ['#f5f0eb', 'paper'], ['#755e66', 'muted'], ['#4a7c59', 'success']];

  /* ── вспомогательное ─────────────────────────────────── */

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MONO = "'OCR-B 10 BT','Courier New',monospace";
  const SERIF = "'PT Serif',Georgia,serif";
  const DISPLAY = "'Playfair Display','PT Serif',serif";
  const fontOf = (k) => (k === 'mono' ? MONO : k === 'serif' ? SERIF : DISPLAY);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  const section = (id, n, title, sub, body) => `
    <section class="bb-section" id="bb-${id}">
      <div class="bb-section-head"><span class="n">${n}</span><h2>${title}</h2><span class="rule"></span></div>
      ${sub ? `<p class="bb-sub">${sub}</p>` : ''}
      ${body}
    </section>`;

  const swatch = (s) => `
    <div class="bb-card">
      <button class="bb-swatch-btn" data-copy="${s.hex}" title="Скопировать HEX"
        style="background:${s.hex};color:${s.onDark ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.55)'}">${s.hex.toUpperCase()}</button>
      <div class="bb-card-pad">
        <div class="bb-swatch-name">${esc(s.name)}</div>
        ${s.token ? `<div class="bb-swatch-token">${esc(s.token)}</div>` : ''}
        <div class="bb-swatch-role">${esc(s.role)}</div>
      </div>
    </div>`;

  /* ── разметка ────────────────────────────────────────── */

  function buildHTML() {
    const identity = `
      <div class="bb-grid c3" style="margin-bottom:16px">
        <div class="bb-card bb-card-pad"><h3>Что это</h3><p>Независимый lifestyle-журнал: длинные тексты, фотография, аудио, дизайн-объекты. Носитель — не лента, а <b>выпуск</b>. Всё оформление отталкивается от печатной метафоры: бумага, типографская краска, регистрационные метки.</p></div>
        <div class="bb-card bb-card-pad"><h3>Тон</h3><p>Сдержанно, без восклицаний. Интерфейс не соперничает с материалом: молчаливый mono, воздух, тонкие линии. Анимация — медленная и редкая.</p></div>
        <div class="bb-card bb-card-pad"><h3>Узнаваемость по 3 признакам</h3><p>1. Бордо на тёплой бумаге.<br>2. Разряженный OCR-B в верхнем регистре.<br>3. Прямой угол: никаких скруглений на редакционной графике.</p></div>
      </div>
      <div class="bb-grid c2" style="margin-bottom:14px">
        <div style="background:#f5f0eb;border:1px solid #4a1728;padding:26px 24px">
          <div style="font-family:${MONO};font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:#4a1728">Epris Journal</div>
          <div style="height:1px;background:#b8956e;margin:14px 0 18px"></div>
          <div style="font-family:${DISPLAY};font-size:30px;color:#4a1728;line-height:1.1">Тишина,<br>которую слышно</div>
          <div style="font-family:${MONO};font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:rgba(74,23,40,.55);margin-top:18px">Issue 04 · MMXXVI</div>
        </div>
        <div style="background:#1a0b10;border:1px solid #2d1820;padding:26px 24px;color:#f5f0eb">
          <div style="font-family:${MONO};font-size:9px;letter-spacing:.35em;text-transform:uppercase;color:#b8956e">Тот же блок на чернилах</div>
          <div style="height:1px;background:rgba(184,149,110,.5);margin:14px 0 18px"></div>
          <div style="font-family:${DISPLAY};font-size:30px;line-height:1.1">Тишина,<br>которую слышно</div>
          <div style="font-family:${MONO};font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:rgba(245,240,235,.5);margin-top:18px">Issue 04 · MMXXVI</div>
        </div>
      </div>
      <div class="bb-note">Две поверхности — и никакого другого решения не нужно: бренд держится на паре «бумага / чернила» плюс золотая линия. Всё остальное в палитре — служебное.</div>`;

    const palette = `
      <div class="bb-subtitle">Ядро</div>
      <div class="bb-grid c3" style="margin-bottom:24px">${CORE.map(swatch).join('')}</div>
      <div class="bb-subtitle">Кремовая гамма — обложки и бланки</div>
      <div class="bb-grid c3" style="margin-bottom:24px">${CREAM.map(swatch).join('')}</div>
      <div class="bb-subtitle">Семантика состояний</div>
      <div class="bb-grid c3" style="margin-bottom:18px">${SEMANTIC.map(swatch).join('')}</div>
      <div class="bb-note">Семантические цвета <b>не задекларированы</b> в <code>:root</code> — они живут россыпью по компонентам. Раздел «Токены» это исправляет.</div>
      <div class="bb-subtitle">Уровни поверхностей — от врезки до чернил</div>
      <div class="bb-card bb-ramp">
        ${SURFACES.map((s) => `<button data-copy="${s.hex}" style="background:${s.hex};color:${s.on}">${s.name}<div style="opacity:.7;margin-top:5px">${s.hex}</div></button>`).join('')}
      </div>`;

    const drift = `<div class="bb-grid">${DRIFT.map((d) => {
      const total = d.variants.reduce((a, v) => a + v[1], 0);
      return `
      <div class="bb-card">
        <div class="bb-card-head">
          <b style="font-size:14px">${d.group}</b>
          <span style="font-size:11px;color:var(--text-muted)">${d.variants.length} ${plural(d.variants.length, 'вариант', 'варианта', 'вариантов')} · ${total} вхождений</span>
          <span style="margin-left:auto;font-size:11.5px;color:var(--text-muted)">→ <b style="color:var(--accent);font-family:var(--font-code)">${d.target}</b> ${esc(d.targetName)}</span>
        </div>
        <div class="bb-card-pad">
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
            ${d.variants.map(([hex, n]) => `<button class="bb-chip${hex === d.target ? ' target' : ''}" data-copy="${hex}"><i style="background:${hex}"></i>${hex}<em>×${n}</em></button>`).join('')}
          </div>
          <div style="font-size:12.5px;color:var(--text-muted);line-height:1.6">${esc(d.note)}</div>
        </div>
      </div>`;
    }).join('')}</div>`;

    const tokens = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" id="bb-code-tabs">
        ${CODE_TABS.map(([label], i) => `<button class="bb-nav-code${i === 0 ? ' active' : ''}" data-code="${i}" style="font-size:11.5px;padding:5px 13px;border-radius:999px;cursor:pointer;border:1px solid var(--line-strong);background:${i === 0 ? 'var(--accent)' : 'transparent'};color:${i === 0 ? '#fff' : 'var(--text-muted)'};font-family:var(--font-code)">${label}</button>`).join('')}
      </div>
      <div class="bb-code">
        <div class="bb-code-head"><span id="bb-code-title">${CODE_TABS[0][0]}</span><button data-copy-code="1">копировать</button></div>
        <pre id="bb-code-body">${esc(CODE_TABS[0][1])}</pre>
      </div>
      <div class="bb-note" style="margin-top:14px">Правило именования: <code>--c-*</code> — цвет, <code>--font-*</code> — гарнитура, <code>--track-*</code> — разрядка, <code>--dur-* / --ease</code> — движение. Уровней ровно два: сырой цвет и роль. Третий уровень (токен на компонент) не заводим — в масштабе одного издания он лишь добавляет звеньев.</div>`;

    const type = `
      <div class="bb-grid">${FONTS.map((f) => `
        <div class="bb-card bb-card-pad">
          <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin-bottom:12px">
            <b style="font-size:14px">${f.cls}</b>
            <span style="font-family:var(--font-code);font-size:11px;color:var(--text-muted)">${esc(f.stack)}</span>
            <span class="bb-tag" style="margin-left:auto">${f.uses} использований</span>
          </div>
          <div class="bb-font-sample" style="font-family:${esc(f.stack)};font-size:${f.cls === 'font-mono' ? 15 : 24}px;letter-spacing:${f.cls === 'font-mono' ? '.2em' : '.01em'}">${esc(f.sample)}</div>
          <p>${esc(f.role)}</p>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-family:var(--font-code)">начертания: ${f.weights} · CSS-переменная: ${f.css}</div>
        </div>`).join('')}
      </div>
      <div class="bb-subtitle">Акцидентные</div>
      <div class="bb-grid c3" style="margin-bottom:18px">
        ${EXTRA_FONTS.map((f) => `<div class="bb-card bb-card-pad"><h3>${f.name}</h3><p>${esc(f.role)}</p></div>`).join('')}
      </div>
      <div class="bb-note"><b>Предложение:</b> <code>font-crimson</code> (6 использований) и <code>font-sans</code> (7) не держат отдельной роли — цитаты можно отдать курсиву PT Serif, интерфейс и так наследует PT Sans из <code>:root</code>. Минус два семейства в загрузке — это минус один запрос к Google Fonts и ~40 КБ. Вторым шагом стоит перенести Playfair в self-hosted, как уже сделано с PT Sans / PT Serif в <code>/fonts</code>.</div>`;

    const scale = `
      <div class="bb-card">${SCALE.map((s) => `
        <div class="bb-scale-row">
          <div class="bb-scale-name"><b>${s.name}</b><span>${s.px}px</span></div>
          <div class="bb-scale-demo" style="font-family:${fontOf(s.font)};font-size:${Math.min(s.px, 30)}px;letter-spacing:${s.tracking};text-transform:${s.font === 'mono' ? 'uppercase' : 'none'}">${s.font === 'mono' ? 'Epris Journal — Issue 04' : 'Тишина, которую слышно'}</div>
          <div class="bb-scale-role">${esc(s.role)}</div>
          <div class="bb-scale-uses">${s.font} · ×${s.uses}</div>
        </div>`).join('')}
      </div>
      <div class="bb-note" style="margin-top:14px">Шаги 8 → 9 → 10 → 11 — это не модульная шкала, а сознательно плотная серия для mono: на этих кеглях разница в 1px читается как разница уровня. Серифная часть (13 → 15 → 17) и дисплейная (23 → 32 → 34) идут с шагом ≈1.25 — на нём и фиксируемся.</div>
      <div class="bb-subtitle">Разрядка: 12 значений в коде → 4 в шкале</div>
      <div class="bb-grid c2">
        <div class="bb-card bb-card-pad">
          <p style="margin-bottom:10px">Сейчас</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${TRACKING_NOW.map(([v, n]) => {
              const keep = TRACKING_TARGET.some((t) => t[0] === v);
              return `<span style="font-family:var(--font-code);font-size:11px;padding:4px 9px;border-radius:999px;border:1px solid ${keep ? 'var(--accent)' : 'var(--line)'};color:${keep ? 'var(--accent)' : 'var(--text-muted)'};background:${keep ? 'var(--accent-soft)' : 'var(--bg-soft)'}">${v} ×${n}</span>`;
            }).join('')}
          </div>
        </div>
        <div class="bb-card bb-card-pad">
          <p style="margin-bottom:10px">Становится</p>
          ${TRACKING_TARGET.map(([v, role]) => `<div style="display:flex;gap:10px;align-items:baseline;margin-bottom:7px"><b style="font-family:var(--font-code);font-size:11.5px;color:var(--accent);width:52px">${v}</b><span style="font-size:12px;color:var(--text-muted)">${role}</span></div>`).join('')}
        </div>
      </div>`;

    const shape = `
      <div class="bb-grid c2" style="margin-bottom:16px">
        <div class="bb-card">
          <div class="bb-card-head"><b style="font-size:13px">Радиусы</b></div>
          ${SHAPE.map((s) => `<div class="bb-row" style="display:flex;align-items:center;gap:12px">
            <span style="width:34px;height:34px;flex-shrink:0;background:#4a1728;border-radius:${s.px}px"></span>
            <span style="flex:1;min-width:0"><span style="font-family:var(--font-code);font-size:11.5px;display:block">${s.token}</span><span style="font-size:11.5px;color:var(--text-muted)">${esc(s.role)}</span></span>
            <span style="font-family:var(--font-code);font-size:10.5px;color:var(--text-muted)">×${s.uses}</span>
          </div>`).join('')}
        </div>
        <div class="bb-card">
          <div class="bb-card-head"><b style="font-size:13px">Ритм отступов (4px-сетка)</b></div>
          ${SPACING.map(([v, role]) => `<div class="bb-row"><span style="font-family:var(--font-code);color:var(--accent)">${v}</span><div style="color:var(--text-muted);margin-top:2px">${role}</div></div>`).join('')}
          <div class="bb-row" style="color:var(--text-muted)">Линии — всегда 1px цвета <span class="bb-inline-code">--c-rule</span> (бордо .18). Более толстых рамок в системе нет.</div>
        </div>
      </div>
      <div class="bb-subtitle">Что уже стоит в коде</div>
      <div class="bb-card bb-card-pad" style="font-size:12.5px;line-height:1.75;color:var(--text-muted)">
        Самые частые промежутки: <span class="bb-inline-code">gap-2</span> (101), <span class="bb-inline-code">gap-3</span> (77), <span class="bb-inline-code">gap-4</span> (42) — то есть 8 / 12 / 16px, сетка соблюдается. Вертикаль секций держится на <span class="bb-inline-code">py-16</span> (18) и <span class="bb-inline-code">py-24</span> (17) — 64 и 96px. Ширина контейнера колеблется: <span class="bb-inline-code">max-w-6xl</span> (11), <span class="bb-inline-code">max-w-5xl</span> (8), <span class="bb-inline-code">max-w-[1600px]</span> (7). <b style="color:var(--text)">Предложение:</b> оставить две ширины — 1200px для чтения и 1600px для галерей, остальные свести к ним.
      </div>`;

    const rules = `<div class="bb-card">${RULES.map((r, i) => `<div class="bb-row" style="display:flex;gap:12px"><span style="font-family:var(--font-code);font-size:11px;color:var(--accent);flex-shrink:0">${String(i + 1).padStart(2, '0')}</span><span>${esc(r)}</span></div>`).join('')}</div>`;

    const components = `
      <div class="bb-subtitle">Живые образцы</div>
      <div class="bb-specimen">
        <div style="display:flex;flex-wrap:wrap;gap:22px;align-items:center">
          <button class="bb-pill" type="button">read</button>
          <span style="background:rgba(245,240,235,.9);border:1px solid #4a1728;color:#4a1728;font-family:${MONO};font-size:9px;letter-spacing:.2em;text-transform:uppercase;padding:5px 11px">рубрика</span>
          <span style="font-family:${MONO};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#b8956e">gold label</span>
          <span style="font-family:${SERIF};font-size:22px;color:#4a1728">Заголовок карточки</span>
        </div>
        <hr style="border:0;border-top:1px solid rgba(74,23,40,.18);margin:22px 0">
        <p style="font-family:${SERIF};font-style:italic;font-size:18px;color:#4a1728;border-left:2px solid #b8956e;padding-left:14px;margin:0 0 18px;line-height:1.35">Вердикт — одна мысль, которую читатель забирает с собой.</p>
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <div style="width:120px;height:68px;background:#1a0b10"></div>
          <div style="font-family:${MONO};font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:rgba(74,23,40,.55);padding-top:6px">fig. 04 · лимасол · 2026</div>
        </div>
      </div>
      <div class="bb-grid">${COMPONENTS.map((c) => `
        <div class="bb-card">
          <div class="bb-card-head" style="display:block">
            <b style="font-size:13.5px">${esc(c.name)}</b>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-family:var(--font-code);line-height:1.55">${esc(c.anatomy)}</div>
          </div>
          <div class="bb-card-pad">
            <ul style="margin:0 0 10px 16px;padding:0;font-size:12.5px;line-height:1.7;color:var(--text-muted)">${c.spec.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
            <div class="bb-bad" style="font-size:12.5px;display:flex;gap:8px;line-height:1.55"><span>✕</span>${esc(c.dont)}</div>
          </div>
        </div>`).join('')}
      </div>`;

    const dodont = `<div class="bb-grid c2">${DO_DONT.map(([topic, good, bad]) => `
      <div class="bb-card">
        <div class="bb-card-head"><b style="font-size:12.5px">${topic}</b></div>
        <div class="bb-row" style="display:flex;gap:10px"><span class="bb-ok">✓</span>${esc(good)}</div>
        <div class="bb-row" style="display:flex;gap:10px;color:var(--text-muted)"><span class="bb-bad">✕</span>${esc(bad)}</div>
      </div>`).join('')}</div>`;

    const motion = `
      <div class="bb-grid c3" style="margin-bottom:16px">${MOTION.map(([token, role, found]) => `
        <div class="bb-card bb-card-pad">
          <div style="font-family:var(--font-code);font-size:12px;color:var(--accent)">${token}</div>
          <div style="font-size:12.5px;margin-top:6px;line-height:1.55">${role}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:5px;font-family:var(--font-code)">${found}</div>
        </div>`).join('')}
      </div>
      <div class="bb-card">${MOTION_RULES.map((r) => `<div class="bb-row">${esc(r)}</div>`).join('')}</div>`;

    const imagery = `
      <div class="bb-grid c3">${IMAGERY.map(([t, b]) => `<div class="bb-card bb-card-pad"><h3>${t}</h3><p>${esc(b)}</p></div>`).join('')}</div>
      <div class="bb-subtitle">Разрешённые пропорции</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        ${[['16 / 9', 160, 'карточка'], ['4 / 3', 130, 'главный обзор · обложка'], ['1 / 1', 96, 'портрет автора']].map(([r, w, l]) => `
          <div><div style="width:${w}px;aspect-ratio:${r};background:#1a0b10;border:1px solid #4a1728"></div>
          <div style="font-family:var(--font-code);font-size:10px;color:var(--text-muted);margin-top:6px">${r} · ${l}</div></div>`).join('')}
      </div>`;

    const voice = `<div class="bb-card">${VOICE.map(([good, bad, note]) => `
      <div class="bb-row" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:13px 17px">
        <div><div style="display:flex;gap:8px;align-items:baseline"><span class="bb-ok">✓</span><span style="font-family:var(--font-code);font-size:12.5px">${esc(good)}</span></div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;line-height:1.5">${esc(note)}</div></div>
        <div style="display:flex;gap:8px;align-items:baseline;color:var(--text-muted)"><span class="bb-bad">✕</span><span>${esc(bad)}</span></div>
      </div>`).join('')}</div>`;

    const matrix = `
      <div class="bb-subtitle">Матрица контраста</div>
      <div class="bb-card bb-matrix-wrap" style="overflow-x:auto;margin-bottom:18px">
        <table class="bb-matrix">
          <thead><tr><th>текст \\ фон</th>${MATRIX_BG.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead>
          <tbody>
            ${MATRIX_FG.map(([fg, fgName]) => `
              <tr>
                <td style="white-space:nowrap;font-weight:600"><span style="display:inline-block;width:10px;height:10px;background:${fg};margin-right:7px;border:1px solid rgba(0,0,0,.15)"></span>${fgName}</td>
                ${MATRIX_BG.map(([bg]) => {
                  const r = contrast(fg, bg); const [label, color] = verdictFor(r);
                  return `<td style="background:${bg}">
                    <div style="color:${fg};font-family:${SERIF};font-size:14px;margin-bottom:3px">Aa Тишина</div>
                    <div class="aa" style="color:${fg};opacity:.85">${r.toFixed(2)}:1</div>
                    <span class="bb-verdict" style="background:${color}">${label}</span>
                  </td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="bb-card">${A11Y.map((r, i) => `<div class="bb-row" style="display:flex;gap:12px"><span style="font-family:var(--font-code);font-size:11px;color:var(--accent);flex-shrink:0">${String(i + 1).padStart(2, '0')}</span><span>${esc(r)}</span></div>`).join('')}</div>`;

    const audit = `<div class="bb-grid c4">${AUDIT.map(([n, label, bad, note]) => `
      <div class="bb-card bb-card-pad">
        <div class="bb-stat-big ${bad ? 'bb-bad' : 'bb-ok'}">${n}</div>
        <div style="font-size:12.5px;font-weight:600;margin-top:6px">${label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px;font-family:var(--font-code)">${note}</div>
      </div>`).join('')}</div>`;

    const refs = REFS.map((g) => `
      <div style="margin-bottom:22px">
        <div class="bb-subtitle">${g.title}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${esc(g.sub)}</div>
        <div class="bb-grid c2">${g.items.map(([name, url, why, take]) => `
          <div class="bb-card bb-card-pad">
            <a href="${url}" target="_blank" rel="noreferrer" style="font-size:13.5px;font-weight:600;color:var(--accent);text-decoration:none">${esc(name)} ↗</a>
            <div class="bb-ref-url">${url.replace(/^https?:\/\//, '')}</div>
            <p style="margin-top:9px">${esc(why)}</p>
            <div style="font-size:12.5px;margin-top:8px;line-height:1.6"><span class="bb-tag">берём</span> ${esc(take)}</div>
          </div>`).join('')}
        </div>
      </div>`).join('');

    const deliverables = `<div class="bb-grid c3">${DELIVERABLES.map(([t, b]) => `
      <div class="bb-card bb-card-pad">
        <div style="font-family:var(--font-code);font-size:12px;color:var(--accent);margin-bottom:6px">${t}</div>
        <p>${esc(b)}</p>
      </div>`).join('')}</div>`;

    const riskColor = (r) => (r === 'низкий' ? 'var(--ok)' : r === 'средний' ? 'var(--warn)' : 'var(--danger)');
    const plan = `
      <div class="bb-grid">${PLAN.map((s) => `
        <div class="bb-card bb-plan">
          <div class="bb-plan-n">${String(s.n).padStart(2, '0')}</div>
          <div class="bb-plan-body">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:6px">
              <b style="font-size:13.5px">${esc(s.title)}</b>
              <span class="bb-risk" style="color:${riskColor(s.risk)};border:1px solid ${riskColor(s.risk)}">риск: ${s.risk}</span>
            </div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.65">${esc(s.what)}</div>
            <div style="font-size:12px;margin-top:8px;line-height:1.55"><span style="color:var(--text-muted)">Эффект: </span>${esc(s.effect)}</div>
          </div>
        </div>`).join('')}
      </div>
      <div class="bb-note" style="margin-top:18px">Порядок имеет значение: шаги 3–6 без шагов 1–2 придётся делать дважды. Вместе консолидация убирает <b>~55 цветов из 113</b> и сводит типографику к двум шкалам — без единого заметного изменения внешнего вида сайта.</div>`;

    return `
      <div class="bb">
        <div class="bb-hero">
          <div class="bb-kicker">Epris Journal · Design System · MMXXVI</div>
          <h1>Бренд-бук</h1>
          <p>Что есть в коде сайта сегодня, что из этого канон, а что — накопленный дрейф; и как свести одно к другому, ничего не сломав. Все значения сняты из <code>src/index.css</code>, <code>tailwind.config.js</code> и <code>index.html</code>; цифры использования — прогон по <code>src/</code> по состоянию на 31.07.2026.</p>
          <div class="bb-stats">
            ${[['113', 'цветов в коде'], ['10', 'задекларировано'], ['18', 'разделов здесь'], ['8', 'шагов плана']]
              .map(([n, l]) => `<div><div class="bb-stat-n">${n}</div><div class="bb-stat-l">${l}</div></div>`).join('')}
          </div>
        </div>

        <div class="bb-nav">${SECTIONS.map(([id, label], i) => `<button data-goto="bb-${id}"${i === 0 ? ' class="active"' : ''}>${label}</button>`).join('')}</div>

        ${section('identity', '01', 'Идентичность', '', identity)}
        ${section('palette', '02', 'Палитра', 'Клик по плитке копирует HEX.', palette)}
        ${section('drift', '03', 'Рассинхрон цвета', 'Задекларировано 10 цветов. В коде — 113. Вот куда они расползлись.', drift)}
        ${section('tokens', '04', 'Целевая спецификация токенов', 'Готовый код, который можно перенести в сайт как есть. Это шаги 1–2 плана: визуально ничего не меняется, но появляются имена, к которым сводится остальное.', tokens)}
        ${section('type', '05', 'Шрифты', 'Пять семейств в Tailwind плюс два акцидентных. Образцы показаны шрифтом, который реально подгружает сайт.', type)}
        ${section('scale', '06', 'Кегельная шкала', 'Шкала, к которой сводим. Справа — сколько раз размер уже встречается в коде.', scale)}
        ${section('shape', '07', 'Сетка, пространство, форма', '', shape)}
        ${section('rules', '08', 'Правила, которые не обсуждаются', '', rules)}
        ${section('components', '09', 'Компоненты', 'Анатомия, правила и главное — чего не делать.', components)}
        ${section('dodont', '10', 'Так / не так', '', dodont)}
        ${section('motion', '11', 'Движение', 'В коде 10+ разных длительностей. Ролей на самом деле три.', motion)}
        ${section('imagery', '12', 'Изображения', '', imagery)}
        ${section('voice', '13', 'Голос и микрокопия', 'То, как звучат надписи, узнаётся так же, как цвет.', voice)}
        ${section('a11y', '14', 'Доступность', 'Коэффициенты ниже считаются прямо на странице по формуле WCAG 2.2 — это не переписанные от руки числа.', matrix)}
        ${section('audit', '15', 'Аудит состояния', 'Прогон по src/ сайта, 31.07.2026.', audit)}
        ${section('refs', '16', 'Референсы', 'Каждый пункт — с пояснением, что именно оттуда берём. Референс без «что берём» — просто картинка.', refs)}
        ${section('deliverables', '17', 'Что появится в репозитории', 'Бренд-бук должен заканчиваться файлами, а не намерением.', deliverables)}
        ${section('plan', '18', 'План консолидации', 'Шаги 1–2 ничего не меняют визуально и делают остальное дешёвым. Дальше — по одному, с визуальной проверкой.', plan)}
      </div>`;
  }

  /* ── поведение ───────────────────────────────────────── */

  let rendered = false;

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'bb-toast';
    el.textContent = `скопировано: ${text}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  function copy(text) {
    // Раздел открывается и по http (локальный просмотр), где clipboard API
    // недоступен — тогда падаем на execCommand, иначе кнопка молча не работает.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(text)).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(text); } catch { /* ничего не поделать */ }
    ta.remove();
  }

  function mount() {
    const root = document.getElementById('tab-brandbook');
    if (!root || rendered) return;
    root.innerHTML = buildHTML();
    rendered = true;

    root.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) { copy(copyBtn.dataset.copy); return; }

      const codeCopy = e.target.closest('[data-copy-code]');
      if (codeCopy) { copy(document.getElementById('bb-code-body').textContent); return; }

      const codeTab = e.target.closest('[data-code]');
      if (codeTab) {
        const i = Number(codeTab.dataset.code);
        document.getElementById('bb-code-title').textContent = CODE_TABS[i][0];
        document.getElementById('bb-code-body').textContent = CODE_TABS[i][1];
        root.querySelectorAll('[data-code]').forEach((b) => {
          const on = b === codeTab;
          b.style.background = on ? 'var(--accent)' : 'transparent';
          b.style.color = on ? '#fff' : 'var(--text-muted)';
          b.style.borderColor = on ? 'var(--accent)' : 'var(--line-strong)';
        });
        return;
      }

      const goto = e.target.closest('[data-goto]');
      if (goto) {
        document.getElementById(goto.dataset.goto)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        root.querySelectorAll('.bb-nav button').forEach((b) => b.classList.toggle('active', b === goto));
      }
    });

    // Подсветка текущего раздела при скролле. Скроллится не окно, а контейнер
    // вкладки, поэтому наблюдаем с root: null — IntersectionObserver сам берёт
    // ближайшего прокручиваемого предка.
    const navBtns = [...root.querySelectorAll('.bb-nav button')];
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((x) => x.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      navBtns.forEach((b) => b.classList.toggle('active', b.dataset.goto === visible.target.id));
    }, { rootMargin: '-10% 0px -70% 0px' });
    root.querySelectorAll('.bb-section').forEach((s) => obs.observe(s));
  }

  // Рисуем лениво: раздел большой, а открывают его редко.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.tab-btn[data-tab="brandbook"]')?.addEventListener('click', () => setTimeout(mount, 30));
    if (document.getElementById('tab-brandbook')?.classList.contains('active')) mount();
  });
})();
