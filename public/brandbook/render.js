/* ══════════════════════════════════════════════════════════
   Публичный бренд-бук: сборка страницы.

   Данные берутся из общего data.js, а поверх накладывается то,
   что редакция сохранила в панели (content.brandbook). Контент
   тянем из открытого API сайта; если он недоступен — страница
   всё равно показывается на значениях по умолчанию, потому что
   бренд-бук нужнее самой свежести правок.
   ══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const CONTENT_API = 'https://api.eprisjournal.com/content';
  const BB = window.EPRIS_BRANDBOOK;

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  const FONT_OF = {
    mono: "'OCR-B 10 BT','Courier New',monospace",
    serif: "'PT Serif',Georgia,serif",
    display: "'Playfair Display','PT Serif',serif",
  };

  const SECTIONS = [
    ['identity', 'Идентичность'],
    ['palette', 'Цвет'],
    ['type', 'Шрифт'],
    ['scale', 'Размеры'],
    ['elements', 'Элементы'],
    ['imagery', 'Фотография'],
    ['voice', 'Голос'],
    ['dodont', 'Так и не так'],
    ['motion', 'Движение'],
    ['rules', 'Правила'],
    ['contrast', 'Контраст'],
    ['refs', 'Ориентиры'],
  ];

  function merged(saved) {
    const out = {};
    for (const key of Object.keys(BB.defaults)) {
      out[key] = saved && key in saved ? saved[key] : BB.defaults[key];
    }
    return out;
  }

  const section = (id, num, title, sub, body) => `
    <section id="${id}" aria-labelledby="${id}-h">
      <div class="wrap">
        <div class="sec-head"><span class="sec-num" aria-hidden="true">${num}</span><h2 id="${id}-h">${title}</h2></div>
        ${sub ? `<p class="sec-sub">${sub}</p>` : ''}
        ${body}
      </div>
    </section>`;

  function swatch(s) {
    return `
      <div class="swatch">
        <div class="swatch-chip" style="background:${s.hex};color:${s.onDark ? 'rgba(255,255,255,.9)' : 'rgba(26,11,16,.75)'}">${s.hex.toUpperCase()}</div>
        <div class="swatch-body">
          <h3>${esc(s.name)}</h3>
          <p class="swatch-hex">${s.hex}</p>
          <p>${esc(s.role)}</p>
        </div>
      </div>`;
  }

  function build(d) {
    const identity = `<div class="grid g3">${d.identity.map((c) => `
      <article class="card"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></article>`).join('')}</div>`;

    const palette = `
      <div class="grid g3">${BB.palette.core.map(swatch).join('')}</div>
      <h4>Кремовая гамма — обложки и бланки</h4>
      <div class="grid g3">${BB.palette.cream.map(swatch).join('')}</div>
      <h4>Состояния</h4>
      <div class="grid g3">${BB.palette.state.map(swatch).join('')}</div>
      <h4>Поверхности — от врезки до чернил</h4>
      <div class="ramp">${BB.palette.surfaces.map((s) => `<span style="background:${s.hex};color:${s.on}">${esc(s.name)}<br>${s.hex}</span>`).join('')}</div>`;

    const type = `<div class="grid g2">${BB.fonts.map((f) => `
      <article class="font-row">
        <p class="font-name">${esc(f.name)}</p>
        <p class="font-sample" style="font-family:${esc(f.stack)};font-size:${f.size}px;letter-spacing:${f.tracking}">${esc(f.sample)}</p>
        <p class="font-role">${esc(f.role)}</p>
      </article>`).join('')}</div>`;

    const scale = `<div>${BB.scale.map((s) => `
      <div class="scale-row">
        <span class="scale-name">${esc(s.name)} · ${s.px}</span>
        <span class="scale-demo" style="font-family:${FONT_OF[s.font]};font-size:${Math.min(s.px, 30)}px;letter-spacing:${s.tracking};text-transform:${s.font === 'mono' ? 'uppercase' : 'none'}">${s.font === 'mono' ? 'Epris Journal — Issue 04' : 'Тишина, которую слышно'}</span>
        <span class="scale-role">${esc(s.role)}</span>
      </div>`).join('')}</div>`;

    const elements = `
      <div class="specimen">
        <div class="specimen-row">
          <button type="button" class="pill">read</button>
          <span class="tagline">рубрика</span>
          <span class="gold-label">золотая метка</span>
          <span style="font-family:var(--read);font-size:22px">Заголовок карточки</span>
        </div>
        <p class="verdict">Вердикт — одна мысль, которую читатель забирает с собой.</p>
        <div class="specimen-row">
          <span class="photo-slot" aria-hidden="true"></span>
          <span class="caption">fig. 04 · лимасол · 2026</span>
        </div>
      </div>
      <div class="grid g2" style="margin-top:var(--gap)">${d.components.map((c) => `
        <article class="comp">
          <div class="comp-head"><h3>${esc(c.name)}</h3><p>${esc(c.anatomy)}</p></div>
          <div class="comp-body">
            <ul>${(c.spec || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
            <p class="dont"><span aria-hidden="true">✕</span><span><span class="sr-only">Не делать: </span>${esc(c.dont)}</span></p>
          </div>
        </article>`).join('')}</div>`;

    const imagery = `
      <div class="grid g3">${d.imagery.map((i) => `
        <article class="card"><h3>${esc(i.title)}</h3><p>${esc(i.body)}</p></article>`).join('')}</div>
      <h4>Пропорции кадра</h4>
      <div class="ratios">
        ${[['16 / 9', 'карточка'], ['4 / 3', 'обложка и главный материал'], ['1 / 1', 'портрет автора']].map(([r, l]) => `
          <figure class="ratio"><div class="ratio-box" style="aspect-ratio:${r}"></div><figcaption>${r} · ${l}</figcaption></figure>`).join('')}
      </div>`;

    const voice = `<div class="grid g2">${d.voice.map((v) => `
      <article class="pair">
        <p class="pair-line good"><span aria-hidden="true">✓</span><span style="font-family:var(--mono);font-size:.92em">${esc(v.good)}</span></p>
        <p class="pair-line dont"><span aria-hidden="true">✕</span><span>${esc(v.bad)}</span></p>
        <p class="pair-line" style="color:var(--muted);font-size:.88em">${esc(v.note)}</p>
      </article>`).join('')}</div>`;

    const dodont = `<div class="grid g2">${d.dodont.map((x) => `
      <article class="pair">
        <p class="pair-topic">${esc(x.topic)}</p>
        <p class="pair-line good"><span aria-hidden="true">✓</span><span>${esc(x.good)}</span></p>
        <p class="pair-line dont"><span aria-hidden="true">✕</span><span>${esc(x.bad)}</span></p>
      </article>`).join('')}</div>`;

    const motion = `
      <div class="grid g3">${BB.motion.map(([time, role]) => `
        <article class="card"><h3>${time}</h3><p>${esc(role)}</p></article>`).join('')}</div>
      <ol class="rules" style="margin-top:var(--gap)">${d.motionRules ? d.motionRules.map((r) => `<li>${esc(r)}</li>`).join('') : ''}</ol>
      <h4>Ритм отступов</h4>
      <div class="grid g2">${BB.space.map(([v, role]) => `
        <article class="card"><h3 style="font-family:var(--mono);font-size:15px;letter-spacing:.1em">${esc(v)}</h3><p>${esc(role)}</p></article>`).join('')}</div>`;

    const rules = `<ol class="rules">${d.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`;

    const pairs = [
      ['#4a1728', '#f5f0eb', 'Бордо на бумаге', 'Базовая пара: весь текст сайта.'],
      ['#f5f0eb', '#1a0b10', 'Бумага на чернилах', 'Тёмные секции и футер.'],
      ['#b8956e', '#f5f0eb', 'Золото на бумаге', 'Только декор: для текста контраста не хватает.'],
      ['#b8956e', '#1a0b10', 'Золото на чернилах', 'Метки и рубрики на тёмном.'],
    ];
    const contrastBlock = `
      <div class="grid g2">${pairs.map(([fg, bg, name, note]) => {
        const r = contrast(fg, bg);
        return `
        <article class="contrast-card">
          <div class="contrast-demo" style="background:${bg};color:${fg}">
            <p class="aa">Тишина, которую слышно</p>
            <p class="ratio">${r.toFixed(2)} : 1 — ${name}</p>
          </div>
          <p class="contrast-note">${esc(note)}</p>
        </article>`;
      }).join('')}</div>
      <ol class="rules" style="margin-top:var(--gap)">${d.a11y.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`;

    const groups = [...new Set(d.refs.map((r) => r.group))];
    const refs = groups.map((g) => `
      <h4>${esc(g)}</h4>
      ${d.refs.filter((r) => r.group === g).map((r) => `
        <div class="ref">
          <a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.name)} <span aria-hidden="true">↗</span></a>
          <p>${esc(r.why)}</p>
          <p class="take">Берём: ${esc(r.take)}</p>
        </div>`).join('')}`).join('');

    document.getElementById('bb-lede').textContent = d.intro;
    document.getElementById('bb-toc').innerHTML = SECTIONS
      .map(([id, label]) => `<a href="#${id}">${label}</a>`).join('');
    document.getElementById('bb-body').innerHTML = [
      section('identity', '01', 'Идентичность', '', identity),
      section('palette', '02', 'Цвет', 'Четыре цвета несут бренд, остальное — служебное.', palette),
      section('type', '03', 'Шрифт', 'Пять гарнитур, у каждой одна работа.', type),
      section('scale', '04', 'Размеры', 'Шкала, по которой набирается всё — от копирайта до обложки.', scale),
      section('elements', '05', 'Элементы', 'Из чего собирается страница.', elements),
      section('imagery', '06', 'Фотография', '', imagery),
      section('voice', '07', 'Голос', 'Как звучат надписи — это узнаётся так же, как цвет.', voice),
      section('dodont', '08', 'Так и не так', '', dodont),
      section('motion', '09', 'Движение и ритм', 'Три скорости и шаг сетки.', motion),
      section('rules', '10', 'Правила', 'Семь пунктов, которые не обсуждаются.', rules),
      section('contrast', '11', 'Контраст и доступность', 'Числа посчитаны прямо на странице по норме WCAG 2.2.', contrastBlock),
      section('refs', '12', 'Ориентиры', 'Издания, на которые EPRIS похож по характеру, и чем мы проверяем решения.', refs),
    ].join('');

    wireToc();
  }

  function wireToc() {
    const links = [...document.querySelectorAll('#bb-toc a')];
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      links.forEach((a) => a.removeAttribute('aria-current'));
      byId.get(visible.target.id)?.setAttribute('aria-current', 'true');
    }, { rootMargin: '-15% 0px -70% 0px' });
    document.querySelectorAll('section[id]').forEach((s) => observer.observe(s));
  }

  function stamp(text) {
    const el = document.getElementById('bb-updated');
    if (el) el.textContent = text;
  }

  async function load() {
    build(merged(null));
    try {
      const res = await fetch(CONTENT_API, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const content = await res.json();
      build(merged(content?.brandbook));
      stamp('Актуально: правки редакции подтянуты');
    } catch {
      // Открытая страница не должна ломаться из-за недоступного API —
      // показываем базовую версию и честно это подписываем.
      stamp('Базовая версия: свежие правки редакции сейчас недоступны');
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
