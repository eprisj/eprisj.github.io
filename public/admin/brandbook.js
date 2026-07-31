/* ══════════════════════════════════════════════════════════
   БРЕНД-БУК EPRIS JOURNAL

   Раздел живёт в двух режимах:
     • чтение — доступно всем, кто открыл панель, и работает
       даже когда контент ещё не загружен (тогда показываются
       значения по умолчанию из этого файла);
     • правка — только для роли admin: тексты редактируются
       прямо на месте и уходят в content.brandbook, дальше
       обычной кнопкой «Сохранить».

   Что редактируется, а что нет. Правятся суждения: описание
   бренда, правила, компоненты, движение, изображения, голос,
   доступность, референсы, план. НЕ правятся факты, снятые
   прогоном по коду сайта, — палитра, дрейф цветов, шрифты,
   кегельная шкала, сетка, аудит: их место в коде, и врать про
   них в бренд-буке нельзя. Цифры сняты из
   eprisjournal/src/index.css, tailwind.config.js и index.html
   на 31.07.2026.
   ══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ── редактируемая часть: значения по умолчанию ───────── */

  const DEFAULTS = {
    intro: 'Что есть в коде сайта сегодня, что из этого канон, а что — накопленный дрейф; и как свести одно к другому, ничего не сломав.',
    identity: [
      { title: 'Что это', body: 'Независимый lifestyle-журнал: длинные тексты, фотография, аудио, дизайн-объекты. Носитель — не лента, а выпуск. Всё оформление отталкивается от печатной метафоры: бумага, типографская краска, регистрационные метки.' },
      { title: 'Тон', body: 'Сдержанно, без восклицаний. Интерфейс не соперничает с материалом: молчаливый mono, воздух, тонкие линии. Анимация — медленная и редкая.' },
      { title: 'Узнаваемость по трём признакам', body: 'Бордо на тёплой бумаге. Разряженный OCR-B в верхнем регистре. Прямой угол: никаких скруглений на редакционной графике.' },
    ],
    rules: [
      'Бордо — это текст, а не фон. Фоном бордо становится только в футере и в тёмных врезках.',
      'Золото никогда не несёт основного текста: только линии, номера, рубрики, hover.',
      'Mono всегда в верхнем регистре с разрядкой. Mono строчными буквами не существует.',
      'Сериф никогда не разряжается: tracking для PT Serif — normal.',
      'Редакционная графика (фото, обложки, врезки) — прямые углы. Скругление — признак интерфейса.',
      'Тень не используется как декор; глубина строится фоном (paper-raised / paper-sunken).',
      'Минимальный кегль — 8px и только для mono в верхнем регистре. Сериф ниже 13px не опускается.',
    ],
    components: [
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
          'Один тег на карточку. Категория и статус одновременно — только в панели.'],
        dont: 'Не красить теги в разные цвета по категориям — категория читается словом.' },
      { name: 'Карточка материала',
        anatomy: 'Фон paper-sunken, рамка 1px бордо, фото 16:9 сверху, padding 24–32, прямые углы.',
        spec: ['Порядок: фото → рубрика → заголовок serif → подзаголовок mono → текст → линия → мета.',
          'Заголовок serif 23–28px, никогда не uppercase.',
          'Мета прижата книзу, чтобы низ карточек в ряду совпадал.'],
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
          'FIG. NN — только в галерее, сквозная нумерация в пределах выпуска.'],
        dont: 'Не дублировать подписью то, что уже сказано в заголовке.' },
    ],
    dodont: [
      { topic: 'Заголовок', good: 'Serif, смешанный регистр, без разрядки.', bad: 'Serif в верхнем регистре с tracking .2em.' },
      { topic: 'Рубрика', good: 'Mono uppercase, разрядка .2em, 10px.', bad: 'Mono нижним регистром без разрядки.' },
      { topic: 'Акцент', good: 'Золото на линии под рубрикой.', bad: 'Золотой текст абзаца на бумаге.' },
      { topic: 'Карточка', good: 'Прямые углы, рамка 1px, без тени.', bad: 'Радиус 16 и мягкая тень под карточкой.' },
      { topic: 'Кнопка', good: 'Рамка + hover-заливка бордовым.', bad: 'Градиент и тень, поднимающаяся при наведении.' },
      { topic: 'Отступ', good: 'Шаг сетки: 8 / 16 / 24 / 32.', bad: 'Произвольные 13, 19, 27 «на глаз».' },
    ],
    motionRules: [
      'Одна переменная на роль: 0.7s и 0.8s в коде (8 мест) сводятся к 0.5s.',
      'Смягчение всегда одно: cubic-bezier(.22,.61,.36,1). Никаких linear и bounce.',
      'Движение только по opacity и transform — никаких анимаций высоты и цвета фона.',
      'Reveal срабатывает один раз; повторная анимация при скролле назад запрещена.',
      'prefers-reduced-motion: всё сводится к мгновенному появлению.',
    ],
    imagery: [
      { title: 'Пропорции', body: 'Карточка 16:9, главный обзор и обложка 4:3, портрет автора 1:1. Других не заводим.' },
      { title: 'Обработка', body: 'Тёплый, слегка приглушённый цвет; контраст без чёрных провалов. Фото ложится на ink-800, поэтому тёмные кадры не «висят» на светлом.' },
      { title: 'Кадр', body: 'Вещи и пространство важнее лиц анфас. Пустота в кадре — черта, а не ошибка.' },
      { title: 'Запрещено', body: 'Стоковые улыбки, тяжёлые фильтры, рамки-тени, коллажи с обводкой, текст поверх фото (кроме плашки-рубрики).' },
      { title: 'Файлы', body: 'WebP, длинная сторона 1600px для карточек и 2400px для обложек, имя — slug материала.' },
    ],
    voice: [
      { good: 'read', bad: 'ЧИТАТЬ ДАЛЕЕ →', note: 'Кнопки — одно слово нижним регистром в mono.' },
      { good: 'Issue 04 · MMXXVI', bad: 'Выпуск №4, 2026 год', note: 'Номера — римские в колофоне, арабские в навигации.' },
      { good: 'Ресторан «Olea», Лимасол', bad: 'Обзор ресторана Olea в городе Лимасол', note: 'Подзаголовок называет объект, а не пересказывает.' },
      { good: 'Медленная середина.', bad: 'Минус: местами слегка затянуто, но это не критично.', note: 'Минусы — коротко и без извинений.' },
    ],
    a11y: [
      'Основной текст — не менее 4.5:1. Бордо на бумаге даёт 11.8:1, запас большой.',
      'Золото не используется для текста на светлом: 2.1:1 — это декор.',
      'Фокус виден всегда: 2px золотая обводка с отступом 2px, никогда outline:none без замены.',
      'Минимальная зона нажатия 44×44px, даже если визуально кнопка мельче.',
      'У каждого фото есть alt; у декоративных — пустой alt.',
      'Язык страницы переключается вместе с интерфейсом: атрибут lang должен соответствовать выбранному.',
      'Разрядка не применяется к длинным серифным абзацам — это вредит чтению.',
    ],
    refs: [
      { group: 'Редакционные', name: 'The Gentlewoman', url: 'https://thegentlewoman.co.uk',
        why: 'Эталон «тихой» редакционной сетки: огромные поля, один акцентный цвет, сериф без украшений.',
        take: 'Подтверждение курса на воздух вместо декора. Взять ритм полей в раздел выпуска.' },
      { group: 'Редакционные', name: 'Apartamento', url: 'https://www.apartamentomagazine.com',
        why: 'Домашняя, «непричёсанная» фотография и очень сдержанная типографика.',
        take: 'Наш раздел фото имеет право на кадры без стилизации — это в характере бренда.' },
      { group: 'Редакционные', name: 'Kinfolk', url: 'https://www.kinfolk.com',
        why: 'Кремовая палитра и очень большие междустрочия в длинных текстах.',
        take: 'Аргумент поднять line-height основного текста с 1.6 до 1.7.' },
      { group: 'Редакционные', name: 'MUBI Notebook', url: 'https://mubi.com/en/notebook',
        why: 'Обзоры как отдельный раздел с чёткой карточкой и минимальной метой.',
        take: 'Модель для нашего раздела обзоров: вердикт, короткий текст, подпись.' },
      { group: 'Редакционные', name: '032c', url: 'https://032c.com',
        why: 'Противоположный полюс: агрессивный mono, резкие плашки.',
        take: 'Показывает границу, за которую EPRIS не идёт — берём только дисциплину верхнего регистра.' },
      { group: 'Редакционные', name: 'Are.na', url: 'https://www.are.na',
        why: 'Интерфейс, полностью уступающий контенту; mono как рабочий, а не декоративный шрифт.',
        take: 'Прямое подтверждение нашей роли mono. Смотреть их состояния фокуса.' },
      { group: 'Дизайн-системы', name: 'Radix Colors', url: 'https://www.radix-ui.com/colors',
        why: 'Шкала из 12 шагов, где у каждого шага есть назначение: фон, граница, текст.',
        take: 'Модель для наших ink/paper уровней: не «похожие оттенки», а роли.' },
      { group: 'Дизайн-системы', name: 'Material Design 3 — tokens', url: 'https://m3.material.io/foundations/design-tokens',
        why: 'Разделение на reference / system / component токены.',
        take: 'Нам хватит двух уровней: сырой цвет и роль. Третий не заводим.' },
      { group: 'Дизайн-системы', name: 'IBM Carbon — type', url: 'https://carbondesignsystem.com/elements/typography/overview',
        why: 'Типографика как набор именованных стилей, а не набор размеров.',
        take: 'Прямой прообраз наших .t-label, .t-caption, .t-meta.' },
      { group: 'Дизайн-системы', name: 'GOV.UK Design System', url: 'https://design-system.service.gov.uk',
        why: 'Каждое решение сопровождается разделом «когда не использовать».',
        take: 'Формат наших карточек компонентов: анатомия, правила, чего не делать.' },
      { group: 'Дизайн-системы', name: 'GitHub Primer', url: 'https://primer.style',
        why: 'Пример жизни системы в коде: токены, линтеры, миграции.',
        take: 'Отсюда идея скрипта-сторожа против сырых HEX.' },
      { group: 'Инструменты и нормы', name: 'WCAG 2.2 — Contrast', url: 'https://www.w3.org/TR/WCAG22/#contrast-minimum',
        why: 'Норматив, по которому считаются пары в разделе «Доступность».',
        take: 'Формула контраста в этом бренд-буке считает именно по нему.' },
      { group: 'Инструменты и нормы', name: 'OKLCH Color Picker', url: 'https://oklch.com',
        why: 'Даёт равномерные по восприятию шейды от базового цвета.',
        take: 'Инструмент для построения ink/paper уровней без «грязных» промежутков.' },
      { group: 'Инструменты и нормы', name: 'Type Scale', url: 'https://typescale.com',
        why: 'Проверка кегельной шкалы на модульность.',
        take: 'Наша шкала близка к 1.25 — на ней и фиксируемся.' },
    ],
    deliverables: [
      { title: 'index.css', body: 'Полный :root из 20+ токенов вместо 7. Тема из «Оформления» наконец управляет всем сайтом.' },
      { title: 'tailwind.config.js', body: 'Цвета и разрядка через var(). Классы и переменные перестают быть двумя разными правдами.' },
      { title: 'Три утилитных класса', body: 'Закрывают более 300 мест ручного набора стиля.' },
      { title: 'scripts/check-tokens.sh', body: 'Деплой падает, если в src/ появился сырой HEX. Палитра не расползётся второй раз.' },
      { title: 'Этот раздел', body: 'Единый источник правды для дизайна и для любого, кто потом будет править код.' },
    ],
    plan: [
      { title: 'Расширить :root до полного набора токенов', risk: 'низкий',
        what: 'Добавить в index.css --c-ink-900/800/700, --c-paper-raised/sunken, --c-clay, --c-muted, --c-muted-soft, --c-success/danger/warning. Визуально ничего не менять — просто дать именам существовать.',
        effect: 'Правки темы из «Оформления» начинают действовать на весь сайт, а не на три цвета.' },
      { title: 'Прокинуть токены в tailwind.config.js', risk: 'низкий',
        what: 'colors переписать через var(--c-*), чтобы bg-pp-ink и bg-[var(--c-ink-800)] были одним и тем же.',
        effect: 'Исчезает соблазн писать сырой HEX — есть класс.' },
      { title: 'Свести бордовые к одному', risk: 'средний',
        what: '#501a2c, #3d1220, #3a1520, #2d1820, #241016 → var(--c-accent). 41 вхождение.',
        effect: 'Главный цвет бренда перестаёт двоиться. Нужен визуальный проход по тёмным секциям.' },
      { title: 'Три уровня чернил вместо пяти', risk: 'низкий',
        what: '#1a0812 и #1a0a12 → ink-800; остальные остаются на своих уровнях.',
        effect: 'Минус два цвета, тёмные секции становятся предсказуемыми.' },
      { title: 'Три бумаги вместо восьми', risk: 'низкий',
        what: '#f5f0ea, #f7f2ec, #f7f2ea, #f8f4ed, #eee8df → paper и paper-raised.',
        effect: 'Минус пять цветов. Разница глазу незаметна, но фон наконец однороден.' },
      { title: 'Решить судьбу терракотовых', risk: 'средний',
        what: 'Легализовать #9f4f42 как --c-clay и свести к нему #a34f42, #a65346; #8b3a3a и #b33939 отдать семантике danger.',
        effect: 'Либо новое официальное семейство, либо минус пять случайных цветов — но не «как сейчас».' },
      { title: 'Две шкалы вместо двух дюжин значений', risk: 'средний',
        what: 'Кегли — 10 шагов шкалы, разрядка — 4 значения. Оформить утилитными классами.',
        effect: 'Типографика становится узнаваемой, а не «примерно как рядом».' },
      { title: 'Зафиксировать правило', risk: 'низкий',
        what: 'В CLAUDE.md сайта: никаких сырых HEX в src/ — только токены. Проверять грепом на деплое.',
        effect: 'Палитра не расползётся снова через полгода.' },
    ],
  };

  /* ── факты из кода: не редактируются ──────────────────── */

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
    { hex: '#ede1c6', name: 'Cream Base', token: 'pp-cream-base', role: 'Обложки выпусков, паспортные бланки.' },
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
      note: '#501a2c — цвет прежней панели, просочившийся на сайт. Глаз разницы не видит, но две правды в коде ломают любую смену темы.' },
    { group: 'Чернильные', target: '#1a0b10', targetName: 'pp-ink',
      variants: [['#28151b', 32], ['#1a0812', 14], ['#0d0408', 13], ['#1a0b10', 6], ['#1a0a12', 4]],
      note: 'Пять почти-чёрных. Предложение: три уровня — ink-900 #0d0408, ink-800 #1a0b10, ink-700 #28151b.' },
    { group: 'Бумажные и светлые', target: '#f5f0eb', targetName: '--c-bg',
      variants: [['#e8ded5', 29], ['#f5f0ea', 9], ['#fbf8f4', 5], ['#f7f2ec', 5], ['#f7f2ea', 5], ['#f8f4ed', 2], ['#f5f0eb', 2], ['#eee8df', 2]],
      note: 'Восемь оттенков бумаги, четыре из них различаются на одну-две единицы. Достаточно трёх.' },
    { group: 'Терракотовые акценты', target: '#9f4f42', targetName: 'clay (новый токен)',
      variants: [['#9f4f42', 10], ['#a34f42', 6], ['#a65346', 3], ['#8b3a3a', 7], ['#b33939', 7]],
      note: 'Незадокументированное семейство — появилось в /materie и в состояниях ошибок. Либо легализуем как clay, либо сводим к бордо.' },
    { group: 'Серо-лиловый текст', target: '#755e66', targetName: 'muted',
      variants: [['#755e66', 5], ['#826d74', 4], ['#8a747b', 3], ['#8b757d', 2], ['#725b63', 3], ['#67545a', 3]],
      note: 'Шесть вариантов приглушённого текста. Хватает двух уровней: muted #755e66 и muted-soft #8a747b.' },
  ];
  const FONTS = [
    { cls: 'font-mono', css: '—', uses: 434, weights: '400',
      stack: "'OCR-B 10 BT', 'OCR-B', 'Courier New', monospace", sample: 'EPRIS JOURNAL — ISSUE 04 / MMXXVI',
      role: 'Рабочая лошадка EPRIS: рубрики, даты, подписи, навигация, счётчики, паспортные поля. Всегда в верхнем регистре с разрядкой.' },
    { cls: 'font-display', css: '--font-display', uses: 13, weights: '400 500 600 700 + italic',
      stack: "'Playfair Display', 'PT Serif', serif", sample: 'Тишина, которую слышно',
      role: 'Заголовки обложек и hero. Крупный кегль, курсив для акцента.' },
    { cls: 'font-serif', css: '—', uses: 159, weights: '400 700 + italic',
      stack: "'PT Serif', serif", sample: 'Каждый выпуск — это попытка остановить время.',
      role: 'Тело статьи. Длинное чтение, локальные шрифты из /fonts, без Google.' },
    { cls: 'font-sans', css: '--font-body', uses: 7, weights: '400 700 + italic',
      stack: "'PT Sans', sans-serif", sample: 'Подписаться на рассылку',
      role: 'Базовый body-шрифт. Интерфейсные надписи, формы, кнопки.' },
    { cls: 'font-crimson', css: '—', uses: 6, weights: '400 600 + italic',
      stack: "'Crimson Text', serif", sample: '«Мы пишем о том, что не успевает стать новостью»',
      role: 'Цитаты и лиды в отдельных материалах.' },
  ];
  const SCALE = [
    { name: 'micro', px: 8, tracking: '.25em', font: 'mono', uses: 51, role: 'Копирайт, служебные метки, номера страниц.' },
    { name: 'caption', px: 9, tracking: '.22em', font: 'mono', uses: 118, role: 'Подписи к фото, даты, теги.' },
    { name: 'label', px: 10, tracking: '.2em', font: 'mono', uses: 152, role: 'Рубрики, навигация, кнопки. Самый частый размер.' },
    { name: 'meta', px: 11, tracking: '.18em', font: 'mono', uses: 34, role: 'Автор, время чтения, метаданные карточки.' },
    { name: 'body-sm', px: 13, tracking: 'normal', font: 'serif', uses: 6, role: 'Лиды карточек, анонсы.' },
    { name: 'body', px: 15, tracking: 'normal', font: 'serif', uses: 10, role: 'Основной текст статьи.' },
    { name: 'lead', px: 17, tracking: 'normal', font: 'serif', uses: 1, role: 'Вводный абзац.' },
    { name: 'h3', px: 23, tracking: '.02em', font: 'display', uses: 1, role: 'Подзаголовки в статье.' },
    { name: 'h2', px: 32, tracking: '.02em', font: 'display', uses: 1, role: 'Заголовок материала.' },
    { name: 'h1', px: 34, tracking: '.03em', font: 'display', uses: 1, role: 'Hero, обложка выпуска.' },
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
  const MOTION = [
    ['--dur-fast .2s', 'Смена цвета: hover, focus, активная вкладка.', '12 мест с duration-200'],
    ['--dur-base .3s', 'Появление элемента, раскрытие превью.', '31 место с duration-300'],
    ['--dur-slow .5s', 'Reveal секции при скролле, смена маршрута.', '9 мест с duration-500'],
  ];
  const AUDIT = [
    ['113', 'уникальных HEX в src/', true, 'при 10 задекларированных токенах'],
    ['540', 'обращений к var(--c-*)', false, 'accent 302 · bg 115 · gold 123'],
    ['12', 'значений разрядки', true, 'сводим к 4'],
    ['13', 'жёстких кеглей', true, 'сводим к шкале из 10 шагов'],
    ['7', 'шрифтовых семейств', true, '5 в Tailwind плюс Orbit и Zeyada'],
  ];

  const TOKENS_CSS = `:root {
  /* Бренд */
  --c-accent:        #4a1728;   /* бордо — главный */
  --c-accent-rgb:    74 23 40;
  --c-gold:          #b8956e;
  --c-gold-rgb:      184 149 110;

  /* Бумага: три уровня вместо восьми */
  --c-paper:         #f5f0eb;
  --c-paper-raised:  #fbf8f4;
  --c-paper-sunken:  #e8ded5;

  /* Чернила: три уровня вместо пяти */
  --c-ink-900:       #0d0408;
  --c-ink-800:       #1a0b10;
  --c-ink-700:       #28151b;

  /* Текст */
  --c-muted:         #755e66;
  --c-muted-soft:    #8a747b;

  /* Акцентное семейство */
  --c-clay:          #9f4f42;

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

  /* ── контраст по WCAG 2.2 ─────────────────────────────── */

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
  const verdictFor = (r) => (r >= 7 ? ['AAA', '#2d6b35'] : r >= 4.5 ? ['AA', '#2d6b35'] : r >= 3 ? ['AA крупный', '#8a5100'] : ['декор', '#9e2a2b']);
  const MATRIX_BG = [['#f5f0eb', 'paper'], ['#e8ded5', 'paper-sunken'], ['#1a0b10', 'ink-800'], ['#4a1728', 'accent']];
  const MATRIX_FG = [['#4a1728', 'accent'], ['#b8956e', 'gold'], ['#f5f0eb', 'paper'], ['#755e66', 'muted'], ['#4a7c59', 'success']];

  /* ── данные: умолчания плюс правки из контента ────────── */

  const editorEl = () => document.getElementById('editor');

  function loadedContent() {
    try { return JSON.parse(editorEl()?.value || '{}'); } catch { return {}; }
  }

  // Раздел обязан читаться и до загрузки контента, поэтому сохранённое
  // кладётся поверх умолчаний по каждому ключу, а не вместо них целиком.
  function data() {
    const saved = loadedContent().brandbook;
    if (!saved || typeof saved !== 'object') return DEFAULTS;
    const out = {};
    for (const key of Object.keys(DEFAULTS)) {
      out[key] = key in saved ? saved[key] : DEFAULTS[key];
    }
    return out;
  }

  function isAdmin() {
    if (document.body.classList.contains('role-editor')) return false;
    const role = localStorage.getItem('epris_admin_role');
    return !role || role === 'admin';
  }

  function contentLoaded() {
    const raw = editorEl()?.value?.trim();
    return !!raw && raw !== '{}';
  }

  // Пишем в общий редактор панели и сообщаем ей, что появились
  // изменения: дальше их подхватит обычная кнопка «Сохранить».
  function commit(next) {
    const el = editorEl();
    if (!el) return false;
    let content;
    try { content = JSON.parse(el.value || '{}'); } catch { return false; }
    content.brandbook = next;
    el.value = JSON.stringify(content, null, 2);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function setPath(path, value) {
    const next = JSON.parse(JSON.stringify(data()));
    const parts = path.split('.');
    let node = next;
    for (let i = 0; i < parts.length - 1; i += 1) node = node[parts[i]];
    node[parts[parts.length - 1]] = value;
    return commit(next);
  }

  /* ── вспомогательное ──────────────────────────────────── */

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MONO_SITE = "'OCR-B 10 BT','Courier New',monospace";
  const SERIF_SITE = "'PT Serif',Georgia,serif";
  const DISPLAY_SITE = "'Playfair Display','PT Serif',serif";
  const fontOf = (k) => (k === 'mono' ? MONO_SITE : k === 'serif' ? SERIF_SITE : DISPLAY_SITE);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  let editing = false;

  // Правимое поле. В режиме чтения это обычный текст — без
  // contenteditable и без лишнего шума для скринридера.
  const ed = (path, value) => (editing
    ? `<span class="bb-editable" contenteditable="plaintext-only" role="textbox" aria-multiline="true" data-path="${path}" spellcheck="true">${esc(value)}</span>`
    : esc(value));

  const factNote = (text) => `<p class="bb-fact-note">${esc(text)}</p>`;

  /* ── разметка ─────────────────────────────────────────── */

  function sectionHTML(id, n, title, sub, body) {
    return `
      <section class="bb-section" id="bb-${id}" aria-labelledby="bb-${id}-h">
        <div class="bb-section-head">
          <span class="n" aria-hidden="true">${n}</span>
          <h2 id="bb-${id}-h" tabindex="-1">${title}</h2>
          <span class="rule" aria-hidden="true"></span>
        </div>
        ${sub ? `<p class="bb-sub">${sub}</p>` : ''}
        ${body}
      </section>`;
  }

  function swatchHTML(s) {
    const onWhite = contrast(s.hex, '#ffffff').toFixed(1);
    return `
      <div class="bb-card">
        <button type="button" class="bb-swatch-btn" data-copy="${s.hex}"
          aria-label="Скопировать ${esc(s.name)}, ${s.hex}"
          style="background:${s.hex};color:${s.onDark ? '#fff' : '#1a0b10'}">
          <span aria-hidden="true">${s.hex.toUpperCase()}</span>
        </button>
        <div class="bb-card-pad">
          <h3 class="bb-swatch-name">${esc(s.name)}</h3>
          ${s.token ? `<p class="bb-swatch-token bb-mono">${esc(s.token)}</p>` : ''}
          <p>${esc(s.role)}</p>
          <p class="bb-meta-line">контраст с белым ${onWhite}:1</p>
        </div>
      </div>`;
  }

  function buildHTML() {
    const d = data();
    const canEdit = isAdmin();

    const identity = `
      <div class="bb-grid c3 bb-mb">
        ${d.identity.map((c, i) => `
          <article class="bb-card bb-card-pad">
            <h3>${ed(`identity.${i}.title`, c.title)}</h3>
            <p>${ed(`identity.${i}.body`, c.body)}</p>
          </article>`).join('')}
      </div>
      <div class="bb-grid c2 bb-mb">
        <div class="bb-specimen bb-specimen-light">
          <p class="bb-spec-kicker">Epris Journal</p>
          <hr class="bb-spec-rule">
          <p class="bb-spec-title">Тишина,<br>которую слышно</p>
          <p class="bb-spec-meta">Issue 04 · MMXXVI</p>
        </div>
        <div class="bb-specimen bb-specimen-dark">
          <p class="bb-spec-kicker">Тот же блок на чернилах</p>
          <hr class="bb-spec-rule">
          <p class="bb-spec-title">Тишина,<br>которую слышно</p>
          <p class="bb-spec-meta">Issue 04 · MMXXVI</p>
        </div>
      </div>
      <p class="bb-note">Две поверхности — и никакого другого решения не нужно: бренд держится на паре «бумага и чернила» плюс золотая линия. Всё остальное в палитре служебное.</p>`;

    const palette = `
      <h3 class="bb-subtitle" id="bb-palette-core">Ядро</h3>
      <div class="bb-grid c3 bb-mb">${CORE.map(swatchHTML).join('')}</div>
      <h3 class="bb-subtitle" id="bb-palette-cream">Кремовая гамма — обложки и бланки</h3>
      <div class="bb-grid c3 bb-mb">${CREAM.map(swatchHTML).join('')}</div>
      <h3 class="bb-subtitle" id="bb-palette-state">Семантика состояний</h3>
      <div class="bb-grid c3 bb-mb">${SEMANTIC.map(swatchHTML).join('')}</div>
      <p class="bb-note">Семантические цвета <b>не задекларированы</b> в <code>:root</code> — они живут россыпью по компонентам. Раздел «Токены» это исправляет.</p>
      <h3 class="bb-subtitle">Уровни поверхностей — от врезки до чернил</h3>
      <div class="bb-card bb-ramp">
        ${SURFACES.map((s) => `<button type="button" data-copy="${s.hex}" aria-label="Скопировать ${s.name}, ${s.hex}" style="background:${s.hex};color:${s.on}"><span aria-hidden="true">${s.name}<br>${s.hex}</span></button>`).join('')}
      </div>
      ${factNote('Палитра снята из src/index.css и tailwind.config.js — правится в коде сайта, не здесь.')}`;

    const drift = `<div class="bb-grid">${DRIFT.map((g) => {
      const total = g.variants.reduce((a, v) => a + v[1], 0);
      return `
      <article class="bb-card">
        <div class="bb-card-head bb-card-head-block">
          <h3>${g.group}</h3>
          <p class="bb-meta-line">${g.variants.length} ${plural(g.variants.length, 'вариант', 'варианта', 'вариантов')} · ${total} вхождений · сводим к <b class="bb-mono">${g.target}</b> <span class="bb-mono">${esc(g.targetName)}</span></p>
        </div>
        <div class="bb-card-pad">
          <div class="bb-chips">
            ${g.variants.map(([hex, n]) => `<button type="button" class="bb-chip${hex === g.target ? ' target' : ''}" data-copy="${hex}" aria-label="Скопировать ${hex}, ${n} вхождений"><i style="background:${hex}" aria-hidden="true"></i><span class="bb-mono">${hex}</span><em>×${n}</em></button>`).join('')}
          </div>
          <p>${esc(g.note)}</p>
        </div>
      </article>`;
    }).join('')}${factNote('Числа — прогон по src/ сайта на 31.07.2026.')}</div>`;

    const tokens = `
      <div class="bb-code-tabs" role="tablist" aria-label="Файлы спецификации">
        ${CODE_TABS.map(([label], i) => `<button type="button" role="tab" id="bb-codetab-${i}" aria-selected="${i === 0}" aria-controls="bb-code-body" class="bb-code-tab${i === 0 ? ' active' : ''}" data-code="${i}">${label}</button>`).join('')}
      </div>
      <div class="bb-code">
        <div class="bb-code-head">
          <span id="bb-code-title">${CODE_TABS[0][0]}</span>
          <button type="button" data-copy-code="1">Копировать</button>
        </div>
        <pre id="bb-code-body" tabindex="0" role="tabpanel" aria-labelledby="bb-codetab-0">${esc(CODE_TABS[0][1])}</pre>
      </div>
      <p class="bb-note">Правило именования: <code>--c-*</code> — цвет, <code>--font-*</code> — гарнитура, <code>--track-*</code> — разрядка, <code>--dur-*</code> и <code>--ease</code> — движение. Уровней ровно два: сырой цвет и роль. Третий уровень, токен на компонент, не заводим — в масштабе одного издания он лишь добавляет звеньев.</p>`;

    const type = `
      <div class="bb-grid">${FONTS.map((f) => `
        <article class="bb-card bb-card-pad">
          <div class="bb-font-head">
            <h3 class="bb-mono">${f.cls}</h3>
            <span class="bb-tag">${f.uses} использований</span>
          </div>
          <p class="bb-meta-line bb-mono">${esc(f.stack)}</p>
          <p class="bb-font-sample" style="font-family:${esc(f.stack)};font-size:${f.cls === 'font-mono' ? 15 : 26}px;letter-spacing:${f.cls === 'font-mono' ? '.2em' : '.01em'}">${esc(f.sample)}</p>
          <p>${esc(f.role)}</p>
          <p class="bb-meta-line bb-mono">начертания: ${f.weights} · CSS-переменная: ${f.css}</p>
        </article>`).join('')}
      </div>
      <p class="bb-note"><b>Предложение:</b> <code>font-crimson</code> (6 использований) и <code>font-sans</code> (7) не держат отдельной роли — цитаты можно отдать курсиву PT Serif, интерфейс и так наследует PT Sans из <code>:root</code>. Минус два семейства в загрузке — это минус один запрос к Google Fonts и около 40 КБ.</p>`;

    const scale = `
      <div class="bb-card">
        ${SCALE.map((s) => `
        <div class="bb-scale-row">
          <div class="bb-scale-name"><b>${s.name}</b><span class="bb-mono">${s.px}px · ${s.tracking}</span></div>
          <p class="bb-scale-demo" style="font-family:${fontOf(s.font)};font-size:${Math.min(s.px, 30)}px;letter-spacing:${s.tracking};text-transform:${s.font === 'mono' ? 'uppercase' : 'none'}">${s.font === 'mono' ? 'Epris Journal — Issue 04' : 'Тишина, которую слышно'}</p>
          <p class="bb-scale-role">${esc(s.role)}</p>
          <p class="bb-scale-uses bb-mono">${s.font} · ×${s.uses}</p>
        </div>`).join('')}
      </div>
      <p class="bb-note">Шаги 8 → 9 → 10 → 11 — это не модульная шкала, а сознательно плотная серия для mono: на этих кеглях разница в один пиксель читается как разница уровня. Серифная часть (13 → 15 → 17) и дисплейная (23 → 32 → 34) идут с шагом около 1.25 — на нём и фиксируемся.</p>
      <h3 class="bb-subtitle">Разрядка: 12 значений в коде против 4 в шкале</h3>
      <div class="bb-grid c2">
        <div class="bb-card bb-card-pad">
          <h4 class="bb-minor">Сейчас</h4>
          <div class="bb-chips">
            ${TRACKING_NOW.map(([v, n]) => {
              const keep = TRACKING_TARGET.some((t) => t[0] === v);
              return `<span class="bb-track${keep ? ' keep' : ''}"><span class="bb-mono">${v}</span> ×${n}${keep ? ' · остаётся' : ''}</span>`;
            }).join('')}
          </div>
        </div>
        <div class="bb-card bb-card-pad">
          <h4 class="bb-minor">Становится</h4>
          <dl class="bb-dl">
            ${TRACKING_TARGET.map(([v, role]) => `<dt class="bb-mono">${v}</dt><dd>${role}</dd>`).join('')}
          </dl>
        </div>
      </div>`;

    const shape = `
      <div class="bb-grid c2 bb-mb">
        <div class="bb-card">
          <div class="bb-card-head"><h3>Радиусы</h3></div>
          ${SHAPE.map((s) => `<div class="bb-row bb-row-flex">
            <span class="bb-radius-demo" style="border-radius:${s.px}px" aria-hidden="true"></span>
            <span class="bb-grow"><b class="bb-mono">${s.token}</b><span class="bb-block">${esc(s.role)}</span></span>
            <span class="bb-mono bb-meta-line">×${s.uses}</span>
          </div>`).join('')}
        </div>
        <div class="bb-card">
          <div class="bb-card-head"><h3>Ритм отступов, сетка 4px</h3></div>
          ${SPACING.map(([v, role]) => `<div class="bb-row"><b class="bb-mono bb-accent">${v}</b><span class="bb-block">${role}</span></div>`).join('')}
          <div class="bb-row">Линии всегда 1px цвета <code>--c-rule</code>. Более толстых рамок в системе нет.</div>
        </div>
      </div>
      <div class="bb-card bb-card-pad">
        <h3 class="bb-minor">Что уже стоит в коде</h3>
        <p>Самые частые промежутки: <code>gap-2</code> (101), <code>gap-3</code> (77), <code>gap-4</code> (42) — то есть 8, 12 и 16px, сетка соблюдается. Вертикаль секций держится на <code>py-16</code> (18) и <code>py-24</code> (17) — 64 и 96px. Ширина контейнера колеблется: <code>max-w-6xl</code> (11), <code>max-w-5xl</code> (8), <code>max-w-[1600px]</code> (7). <b>Предложение:</b> оставить две ширины — 1200px для чтения и 1600px для галерей.</p>
      </div>`;

    const rules = `<ol class="bb-card bb-ol">${d.rules.map((r, i) => `<li class="bb-row">${ed(`rules.${i}`, r)}</li>`).join('')}</ol>`;

    const components = `
      <h3 class="bb-subtitle">Живые образцы</h3>
      <div class="bb-specimen bb-specimen-light bb-mb">
        <div class="bb-specimen-row">
          <button type="button" class="bb-pill">read</button>
          <span class="bb-spec-tag">рубрика</span>
          <span class="bb-spec-gold">gold label</span>
          <span class="bb-spec-h">Заголовок карточки</span>
        </div>
        <hr class="bb-spec-rule">
        <p class="bb-spec-verdict">Вердикт — одна мысль, которую читатель забирает с собой.</p>
        <div class="bb-specimen-row">
          <span class="bb-spec-photo" aria-hidden="true"></span>
          <span class="bb-spec-caption">fig. 04 · лимасол · 2026</span>
        </div>
      </div>
      <div class="bb-grid">${d.components.map((c, i) => `
        <article class="bb-card">
          <div class="bb-card-head bb-card-head-block">
            <h3>${ed(`components.${i}.name`, c.name)}</h3>
            <p class="bb-mono bb-meta-line">${ed(`components.${i}.anatomy`, c.anatomy)}</p>
          </div>
          <div class="bb-card-pad">
            <ul class="bb-ul">${(c.spec || []).map((s, si) => `<li>${ed(`components.${i}.spec.${si}`, s)}</li>`).join('')}</ul>
            <p class="bb-dont"><span aria-hidden="true">✕</span> <span class="bb-sr-only">Не делать: </span>${ed(`components.${i}.dont`, c.dont)}</p>
          </div>
        </article>`).join('')}
      </div>`;

    const dodont = `<div class="bb-grid c2">${d.dodont.map((x, i) => `
      <article class="bb-card">
        <div class="bb-card-head"><h3>${ed(`dodont.${i}.topic`, x.topic)}</h3></div>
        <p class="bb-row bb-good"><span aria-hidden="true">✓</span> <span class="bb-sr-only">Так: </span>${ed(`dodont.${i}.good`, x.good)}</p>
        <p class="bb-row bb-dont"><span aria-hidden="true">✕</span> <span class="bb-sr-only">Не так: </span>${ed(`dodont.${i}.bad`, x.bad)}</p>
      </article>`).join('')}</div>`;

    const motion = `
      <div class="bb-grid c3 bb-mb">${MOTION.map(([token, role, found]) => `
        <div class="bb-card bb-card-pad">
          <b class="bb-mono bb-accent">${token}</b>
          <p>${role}</p>
          <p class="bb-meta-line bb-mono">${found}</p>
        </div>`).join('')}
      </div>
      <ul class="bb-card bb-ol">${d.motionRules.map((r, i) => `<li class="bb-row">${ed(`motionRules.${i}`, r)}</li>`).join('')}</ul>`;

    const imagery = `
      <div class="bb-grid c3 bb-mb">${d.imagery.map((x, i) => `
        <article class="bb-card bb-card-pad">
          <h3>${ed(`imagery.${i}.title`, x.title)}</h3>
          <p>${ed(`imagery.${i}.body`, x.body)}</p>
        </article>`).join('')}
      </div>
      <h3 class="bb-subtitle">Разрешённые пропорции</h3>
      <div class="bb-ratios">
        ${[['16 / 9', 'карточка'], ['4 / 3', 'главный обзор и обложка'], ['1 / 1', 'портрет автора']].map(([r, l]) => `
          <figure class="bb-ratio">
            <div class="bb-ratio-box" style="aspect-ratio:${r}" aria-hidden="true"></div>
            <figcaption class="bb-mono">${r} · ${l}</figcaption>
          </figure>`).join('')}
      </div>`;

    const voice = `<div class="bb-card">${d.voice.map((v, i) => `
      <div class="bb-row bb-voice">
        <div>
          <p class="bb-good"><span aria-hidden="true">✓</span> <span class="bb-mono">${ed(`voice.${i}.good`, v.good)}</span></p>
          <p class="bb-meta-line">${ed(`voice.${i}.note`, v.note)}</p>
        </div>
        <p class="bb-dont"><span aria-hidden="true">✕</span> ${ed(`voice.${i}.bad`, v.bad)}</p>
      </div>`).join('')}</div>`;

    const a11y = `
      <h3 class="bb-subtitle" id="bb-matrix-h">Матрица контраста</h3>
      <div class="bb-matrix-wrap" tabindex="0" role="region" aria-labelledby="bb-matrix-h">
        <table class="bb-matrix">
          <caption class="bb-sr-only">Коэффициенты контраста между цветом текста и фоном, посчитанные по WCAG 2.2</caption>
          <thead><tr><th scope="col">текст / фон</th>${MATRIX_BG.map(([, n]) => `<th scope="col">${n}</th>`).join('')}</tr></thead>
          <tbody>
            ${MATRIX_FG.map(([fg, fgName]) => `
              <tr>
                <th scope="row"><span class="bb-dot" style="background:${fg}" aria-hidden="true"></span>${fgName}</th>
                ${MATRIX_BG.map(([bg]) => {
                  const r = contrast(fg, bg); const [label, color] = verdictFor(r);
                  return `<td style="background:${bg}">
                    <span class="bb-matrix-demo" style="color:${fg}">Aa Тишина</span>
                    <span class="bb-mono bb-matrix-ratio" style="color:${fg}">${r.toFixed(2)}:1</span>
                    <span class="bb-verdict" style="background:${color}">${label}</span>
                  </td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <ol class="bb-card bb-ol">${d.a11y.map((r, i) => `<li class="bb-row">${ed(`a11y.${i}`, r)}</li>`).join('')}</ol>`;

    const audit = `<div class="bb-grid c4">${AUDIT.map(([n, label, bad, note]) => `
      <div class="bb-card bb-card-pad">
        <b class="bb-stat-big ${bad ? 'bb-bad' : 'bb-ok'}">${n}</b>
        <p class="bb-stat-label">${label}</p>
        <p class="bb-meta-line bb-mono">${note}</p>
      </div>`).join('')}</div>${factNote('Прогон по src/ сайта, 31.07.2026.')}`;

    const groups = [...new Set(d.refs.map((r) => r.group))];
    const refs = groups.map((g) => `
      <h3 class="bb-subtitle">${esc(g)}</h3>
      <div class="bb-grid c2 bb-mb">
        ${d.refs.map((r, i) => (r.group !== g ? '' : `
          <article class="bb-card bb-card-pad">
            <a href="${esc(r.url)}" target="_blank" rel="noreferrer" class="bb-ref-link">${esc(r.name)} <span aria-hidden="true">↗</span><span class="bb-sr-only">(откроется в новой вкладке)</span></a>
            <p class="bb-ref-url bb-mono">${esc(r.url.replace(/^https?:\/\//, ''))}</p>
            <p>${ed(`refs.${i}.why`, r.why)}</p>
            <p class="bb-take"><span class="bb-tag">берём</span> ${ed(`refs.${i}.take`, r.take)}</p>
          </article>`)).join('')}
      </div>`).join('');

    const deliverables = `<div class="bb-grid c3">${d.deliverables.map((x, i) => `
      <article class="bb-card bb-card-pad">
        <h3 class="bb-mono bb-accent">${ed(`deliverables.${i}.title`, x.title)}</h3>
        <p>${ed(`deliverables.${i}.body`, x.body)}</p>
      </article>`).join('')}</div>`;

    const riskClass = (r) => (r === 'низкий' ? 'ok' : r === 'средний' ? 'warn' : 'bad');
    const plan = `
      <ol class="bb-grid bb-plan-list">${d.plan.map((s, i) => `
        <li class="bb-card bb-plan">
          <span class="bb-plan-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div class="bb-plan-body">
            <div class="bb-plan-head">
              <h3><span class="bb-sr-only">Шаг ${i + 1}. </span>${ed(`plan.${i}.title`, s.title)}</h3>
              <span class="bb-risk ${riskClass(s.risk)}">риск: ${esc(s.risk)}</span>
            </div>
            <p>${ed(`plan.${i}.what`, s.what)}</p>
            <p class="bb-effect"><span class="bb-meta-line">Эффект:</span> ${ed(`plan.${i}.effect`, s.effect)}</p>
          </div>
        </li>`).join('')}
      </ol>
      <p class="bb-note">Порядок имеет значение: шаги 3–6 без шагов 1–2 придётся делать дважды. Вместе консолидация убирает <b>около 55 цветов из 113</b> и сводит типографику к двум шкалам — без единого заметного изменения внешнего вида сайта.</p>`;

    const editBar = !canEdit ? '' : `
      <div class="bb-editbar">
        <button type="button" id="bb-edit-toggle" class="bb-btn${editing ? ' active' : ''}" aria-pressed="${editing}">
          ${editing ? 'Готово' : 'Редактировать тексты'}
        </button>
        <span class="bb-editbar-hint">${editing
          ? (contentLoaded()
            ? 'Правки уходят в черновик — нажмите «Сохранить» в левой панели, чтобы отправить их на сайт.'
            : 'Контент не загружен: нажмите «Загрузить» в левой панели, иначе правки некуда записывать.')
          : 'Правятся суждения: правила, компоненты, план, референсы. Палитра и цифры берутся из кода сайта.'}</span>
      </div>`;

    return `
      <div class="bb${editing ? ' bb-editing' : ''}">
        <header class="bb-hero">
          <p class="bb-kicker">Epris Journal · Design System · MMXXVI</p>
          <h1>Бренд-бук</h1>
          <p class="bb-lede">${ed('intro', d.intro)} Значения сняты из <code>src/index.css</code>, <code>tailwind.config.js</code> и <code>index.html</code>; цифры использования — прогон по <code>src/</code> на 31.07.2026.</p>
          <dl class="bb-stats">
            ${[['113', 'цветов в коде'], ['10', 'задекларировано'], ['18', 'разделов здесь'], ['8', 'шагов плана']]
              .map(([n, l]) => `<div><dt class="bb-stat-n">${n}</dt><dd class="bb-stat-l">${l}</dd></div>`).join('')}
          </dl>
        </header>

        ${editBar}

        <nav class="bb-nav" aria-label="Разделы бренд-бука">
          ${SECTIONS.map(([id, label], i) => `<button type="button" data-goto="bb-${id}"${i === 0 ? ' class="active" aria-current="true"' : ''}>${label}</button>`).join('')}
        </nav>

        <div class="bb-main">
          ${sectionHTML('identity', '01', 'Идентичность', '', identity)}
          ${sectionHTML('palette', '02', 'Палитра', 'Клик по плитке копирует HEX.', palette)}
          ${sectionHTML('drift', '03', 'Рассинхрон цвета', 'Задекларировано 10 цветов. В коде — 113. Вот куда они расползлись.', drift)}
          ${sectionHTML('tokens', '04', 'Целевая спецификация токенов', 'Готовый код, который можно перенести в сайт как есть. Это шаги 1–2 плана: визуально ничего не меняется, но появляются имена, к которым сводится остальное.', tokens)}
          ${sectionHTML('type', '05', 'Шрифты', 'Пять семейств в Tailwind плюс два акцидентных. Образцы показаны шрифтом, который реально подгружает сайт.', type)}
          ${sectionHTML('scale', '06', 'Кегельная шкала', 'Шкала, к которой сводим. Справа — сколько раз размер уже встречается в коде.', scale)}
          ${sectionHTML('shape', '07', 'Сетка, пространство, форма', '', shape)}
          ${sectionHTML('rules', '08', 'Правила, которые не обсуждаются', '', rules)}
          ${sectionHTML('components', '09', 'Компоненты', 'Анатомия, правила и главное — чего не делать.', components)}
          ${sectionHTML('dodont', '10', 'Так и не так', '', dodont)}
          ${sectionHTML('motion', '11', 'Движение', 'В коде более десяти разных длительностей. Ролей на самом деле три.', motion)}
          ${sectionHTML('imagery', '12', 'Изображения', '', imagery)}
          ${sectionHTML('voice', '13', 'Голос и микрокопия', 'То, как звучат надписи, узнаётся так же, как цвет.', voice)}
          ${sectionHTML('a11y', '14', 'Доступность', 'Коэффициенты считаются прямо на странице по формуле WCAG 2.2 — это не переписанные от руки числа.', a11y)}
          ${sectionHTML('audit', '15', 'Аудит состояния', '', audit)}
          ${sectionHTML('refs', '16', 'Референсы', 'Каждый пункт с пояснением, что именно оттуда берём. Референс без «что берём» — просто картинка.', refs)}
          ${sectionHTML('deliverables', '17', 'Что появится в репозитории', 'Бренд-бук должен заканчиваться файлами, а не намерением.', deliverables)}
          ${sectionHTML('plan', '18', 'План консолидации', 'Шаги 1–2 ничего не меняют визуально и делают остальное дешёвым. Дальше по одному, с визуальной проверкой.', plan)}
        </div>
      </div>`;
  }

  /* ── поведение ────────────────────────────────────────── */

  function announce(text) {
    let live = document.getElementById('bb-live');
    if (!live) {
      live = document.createElement('div');
      live.id = 'bb-live';
      live.className = 'bb-sr-only';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    live.textContent = text;
  }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'bb-toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
    announce(text);
  }

  function copy(text) {
    // Панель открывают и по http при локальном просмотре, где clipboard
    // API недоступен — иначе кнопка молча не срабатывала бы.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Скопировано: ' + text)).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Скопировано: ' + text); } catch { toast('Не удалось скопировать'); }
    ta.remove();
  }

  let observer = null;

  function render() {
    const root = document.getElementById('tab-brandbook');
    if (!root) return;
    root.innerHTML = buildHTML();
    wireObserver(root);
  }

  function wireObserver(root) {
    if (observer) { observer.disconnect(); observer = null; }
    const navBtns = [...root.querySelectorAll('.bb-nav button')];
    observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((x) => x.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      navBtns.forEach((b) => {
        const on = b.dataset.goto === visible.target.id;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }, { rootMargin: '-10% 0px -70% 0px' });
    root.querySelectorAll('.bb-section').forEach((s) => observer.observe(s));
  }

  function onClick(e) {
    const root = document.getElementById('tab-brandbook');
    if (!root || !root.contains(e.target)) return;

    if (e.target.closest('#bb-edit-toggle')) {
      editing = !editing;
      render();
      announce(editing ? 'Режим правки включён' : 'Режим правки выключен');
      document.getElementById('bb-edit-toggle')?.focus();
      return;
    }

    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) { copy(copyBtn.dataset.copy); return; }

    if (e.target.closest('[data-copy-code]')) {
      copy(document.getElementById('bb-code-body').textContent);
      return;
    }

    const codeTab = e.target.closest('[data-code]');
    if (codeTab) {
      const i = Number(codeTab.dataset.code);
      document.getElementById('bb-code-title').textContent = CODE_TABS[i][0];
      const body = document.getElementById('bb-code-body');
      body.textContent = CODE_TABS[i][1];
      body.setAttribute('aria-labelledby', `bb-codetab-${i}`);
      root.querySelectorAll('[data-code]').forEach((b) => {
        const on = b === codeTab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
      return;
    }

    const goto = e.target.closest('[data-goto]');
    if (goto) {
      const target = document.getElementById(goto.dataset.goto);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.querySelector('h2')?.focus({ preventScroll: true });
    }
  }

  // Правку принимаем по уходу фокуса: так изменение попадает в черновик
  // один раз за поле, а не на каждое нажатие клавиши.
  function onFocusOut(e) {
    if (!editing) return;
    const field = e.target.closest?.('.bb-editable');
    if (!field || !field.dataset.path) return;
    if (!contentLoaded()) { toast('Сначала нажмите «Загрузить»'); return; }
    if (setPath(field.dataset.path, field.textContent.trim())) announce('Изменение записано в черновик');
    else toast('Не удалось записать правку');
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && editing) {
      editing = false;
      render();
      document.getElementById('bb-edit-toggle')?.focus();
    }
  }

  /* ── монтирование ─────────────────────────────────────── */

  let mounted = false;
  function mount() {
    if (mounted) return;
    if (!document.getElementById('tab-brandbook')) return;
    mounted = true;
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', onClick);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeyDown);
    document.querySelector('.tab-btn[data-tab="brandbook"]')
      ?.addEventListener('click', () => setTimeout(mount, 30));
    if (document.getElementById('tab-brandbook')?.classList.contains('active')) mount();
  });
})();
