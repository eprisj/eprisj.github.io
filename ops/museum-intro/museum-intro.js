/* EPRIS Museum — заставка при открытии главной.
 *
 * Ритм взят с вертикальных роликов аукционных домов: картина в раме на
 * тёмной стене, камера медленно подъезжает или проходит вдоль, через две
 * секунды жёсткая склейка на следующую, внизу по центру — белая подпись.
 * В конце — название музея и вход.
 *
 * Подключение: одна строка перед </body> главной (в build-index.py):
 *   <script src="/museum-intro.js" defer></script>
 *
 * Что показывать — по порядку, первое найденное:
 *   1. window.MUSEUM_INTRO.works = [{ src, title, artist, year, frame }]
 *   2. <script type="application/json" id="museum-intro-works">[…]</script>
 *   3. картинки самой страницы: <img data-intro> — если таких нет, то все
 *      крупные <img> на главной (alt идёт в подпись).
 * Меньше трёх загрузившихся картинок — заставка не показывается вовсе.
 *
 * Показывается при каждом открытии главной (pathname '/' или '/index.html').
 * ?intro=0 в адресе — не показывать, ?intro=1 — показать на любой странице.
 */
(function () {
  'use strict';

  var cfg = window.MUSEUM_INTRO || {};
  var params = new URLSearchParams(location.search);
  if (params.get('intro') === '0') return;
  var isHome = /^\/(index\.html)?$/.test(location.pathname);
  if (!isHome && params.get('intro') !== '1' && !cfg.anyPage) return;

  var T = Object.assign({
    title: 'EPRIS Museum',
    subtitle: 'Painting, sculpture and photography. No walls, no ticket, no closing hour.',
    enter: 'Enter the museum',
    skip: 'Skip',
  }, cfg.text || {});

  var SHOT_MS = cfg.shotMs || 2300;   // длительность одного кадра
  var MAX_WORKS = cfg.max || 8;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Экран закрываем сразу, до загрузки картинок: иначе главная успевает
  // мелькнуть и потом её накрывает заставка.
  var root = document.createElement('div');
  root.className = 'mi';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', T.title);
  document.documentElement.classList.add('mi-lock');

  var css = document.createElement('style');
  css.textContent = [
    '.mi-lock,.mi-lock body{overflow:hidden!important}',
    '.mi{position:fixed;inset:0;z-index:2147483000;color:#fff;overflow:hidden;',
    ' font:500 15px/1.35 "Inter","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;',
    ' background:radial-gradient(120% 80% at 50% 38%,#2b3450 0%,#1a2033 55%,#0e121d 100%);',
    ' transition:opacity .7s ease}',
    '.mi.mi-out{opacity:0;pointer-events:none}',
    // стили главной не должны протекать внутрь: всё своё задаём явно
    '.mi *,.mi *::before,.mi *::after{box-sizing:border-box}',
    '.mi .mi-cap,.mi .mi-end h1,.mi .mi-end p{color:#fff;text-transform:none}',
    // пол: тёмная полоса с отблеском, как паркет под стеной
    '.mi::after{content:"";position:absolute;left:0;right:0;bottom:0;height:22%;pointer-events:none;',
    ' background:linear-gradient(to bottom,rgba(0,0,0,0) 0,rgba(6,8,14,.75) 30%,#07090f 100%)}',
    '.mi-stage{position:absolute;inset:0;perspective:1400px;perspective-origin:50% 42%}',
    '.mi-shot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    ' padding:9vh 7vw 19vh;opacity:0;transition:opacity .16s linear}',
    '.mi-shot.on{opacity:1}',
    '.mi-art{position:relative;max-width:100%;max-height:100%;transform-style:preserve-3d;will-change:transform;',
    ' animation-duration:var(--d);animation-timing-function:cubic-bezier(.25,.1,.25,1);animation-fill-mode:both}',
    '.mi-art img{display:block;max-width:min(78vw,900px);max-height:62vh;width:auto;height:auto}',
    // рамы: золото, чёрное дерево, белая с паспарту
    '.mi-art{box-shadow:0 30px 60px -12px rgba(0,0,0,.65),0 12px 24px rgba(0,0,0,.4)}',
    '.mi-f-gold{padding:clamp(8px,1.6vmin,16px);background:linear-gradient(135deg,#8a6a2e,#e3c374 22%,#9c7a35 45%,#f0d48a 62%,#7d5e27 100%);',
    ' box-shadow:inset 0 0 0 2px rgba(60,40,10,.6),inset 0 0 0 5px rgba(255,230,160,.35),0 30px 60px -12px rgba(0,0,0,.7),0 12px 24px rgba(0,0,0,.45)}',
    '.mi-f-gold img{box-shadow:0 0 0 2px #5a4318,inset 0 0 12px rgba(0,0,0,.5)}',
    '.mi-f-black{padding:clamp(7px,1.3vmin,13px);background:linear-gradient(135deg,#191613,#34302b 40%,#12100e)}',
    '.mi-f-white{padding:clamp(6px,1.1vmin,11px);background:#ebe6dc;box-shadow:inset 0 0 0 1px #cfc8ba,0 30px 60px -12px rgba(0,0,0,.65),0 12px 24px rgba(0,0,0,.4)}',
    '.mi-f-white img{outline:clamp(10px,2.4vmin,24px) solid #f4efe4;margin:clamp(10px,2.4vmin,24px)}',
    // свет от потолочного софита
    '.mi-art::before{content:"";position:absolute;inset:-40% -30% auto;height:80%;pointer-events:none;',
    ' background:radial-gradient(closest-side,rgba(255,240,215,.16),transparent);transform:translateZ(1px)}',
    // движение камеры — четыре приёма, чередуются
    '@keyframes mi-push{from{transform:scale(1) rotateY(0)}to{transform:scale(1.09) rotateY(0)}}',
    '@keyframes mi-trackL{from{transform:translateX(5%) rotateY(-16deg) scale(1.02)}to{transform:translateX(-2%) rotateY(-8deg) scale(1.07)}}',
    '@keyframes mi-trackR{from{transform:translateX(-5%) rotateY(15deg) scale(1.02)}to{transform:translateX(2%) rotateY(7deg) scale(1.07)}}',
    '@keyframes mi-pull{from{transform:scale(1.12) translateY(-2%)}to{transform:scale(1.02) translateY(0)}}',
    '@keyframes mi-still{from{opacity:.001}to{opacity:1}}',
    // подпись
    '.mi-cap{position:absolute;left:50%;bottom:calc(9vh + env(safe-area-inset-bottom));transform:translateX(-50%);',
    ' width:min(86vw,560px);text-align:center;z-index:2;text-shadow:0 1px 3px rgba(0,0,0,.8),0 0 18px rgba(0,0,0,.5)}',
    '.mi-cap b{display:block;font-weight:600;font-size:clamp(15px,2.1vmin,19px);letter-spacing:.005em}',
    '.mi-cap span{display:block;opacity:.82;font-size:clamp(13px,1.8vmin,16px);margin-top:2px}',
    // полоски прогресса, «пропустить»
    '.mi-bars{position:absolute;top:calc(14px + env(safe-area-inset-top));left:16px;right:96px;display:flex;gap:4px;z-index:3}',
    '.mi-bar{flex:1;height:2px;background:rgba(255,255,255,.28);border-radius:2px;overflow:hidden}',
    '.mi-bar i{display:block;height:100%;width:0;background:#fff}',
    '.mi-bar.done i{width:100%}',
    '.mi-bar.run i{animation:mi-fill var(--d) linear forwards}',
    '@keyframes mi-fill{to{width:100%}}',
    '.mi .mi-skip{position:absolute;border-radius:0;text-transform:none;box-shadow:none;top:calc(4px + env(safe-area-inset-top));right:8px;z-index:3;padding:10px 12px;',
    ' background:none;border:0;color:#fff;font:inherit;font-size:13px;letter-spacing:.04em;opacity:.8;cursor:pointer}',
    '.mi .mi-skip:hover,.mi .mi-skip:focus-visible{opacity:1;text-decoration:underline}',
    // финальный кадр
    '.mi-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;',
    ' text-align:center;padding:0 24px 8vh;opacity:0;transform:translateY(10px);transition:opacity .8s ease,transform .8s ease;z-index:2}',
    '.mi-end.on{opacity:1;transform:none}',
    '.mi-end h1{margin:0;font:400 clamp(34px,7vmin,68px)/1.05 "Cormorant Garamond","Playfair Display",Georgia,serif;letter-spacing:.01em}',
    '.mi-end p{margin:14px 0 30px;max-width:30em;opacity:.8;font-size:clamp(14px,1.9vmin,17px)}',
    '.mi .mi-go{appearance:none;border:1px solid rgba(255,255,255,.7);background:transparent;color:#fff;cursor:pointer;',
    ' font:inherit;font-size:14px;letter-spacing:.14em;text-transform:uppercase;padding:14px 28px;border-radius:999px;transition:background .2s,color .2s}',
    '.mi .mi-go:hover,.mi .mi-go:focus-visible{background:#fff;color:#141a2a}',
    '@media (prefers-reduced-motion:reduce){.mi-bar.run i{animation:none;width:100%}}',
  ].join('\n');

  function mount() {
    document.head.appendChild(css);
    document.body.appendChild(root);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var closed = false;
  function close() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    root.classList.add('mi-out');
    document.documentElement.classList.remove('mi-lock');
    removeEventListener('keydown', onKey);
    setTimeout(function () { root.remove(); css.remove(); }, 800);
  }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
  }
  addEventListener('keydown', onKey);

  // --- откуда брать работы ----------------------------------------------
  function readWorks() {
    if (Array.isArray(cfg.works) && cfg.works.length) return cfg.works;
    var tag = document.getElementById('museum-intro-works');
    if (tag) { try { return JSON.parse(tag.textContent); } catch (e) {} }
    var imgs = [].slice.call(document.querySelectorAll('img[data-intro]'));
    if (!imgs.length) {
      imgs = [].slice.call(document.querySelectorAll('main img, img')).filter(function (im) {
        return !im.closest('.mi') && (im.naturalWidth || im.width || 0) >= 300;
      });
    }
    var seen = {};
    return imgs.map(function (im) {
      var src = im.currentSrc || im.src;
      if (!src || seen[src]) return null;
      seen[src] = 1;
      return {
        src: src,
        title: im.dataset.introTitle || im.alt || '',
        artist: im.dataset.introArtist || '',
        year: im.dataset.introYear || '',
      };
    }).filter(Boolean);
  }

  function load(w) {
    return new Promise(function (res) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { res(im.naturalWidth ? { w: w, img: im } : null); };
      im.onerror = function () { res(null); };
      im.src = w.src;
    });
  }

  var shots = [], idx = -1, timer = 0, bars = [];
  var MOVES = ['mi-push', 'mi-trackL', 'mi-pull', 'mi-trackR'];
  var FRAMES = ['gold', 'black', 'white'];

  function start(list) {
    list = list.filter(Boolean);
    if (list.length < 3) { close(); return; }

    var stage = document.createElement('div');
    stage.className = 'mi-stage';
    var barBox = document.createElement('div');
    barBox.className = 'mi-bars';
    var cap = document.createElement('div');
    cap.className = 'mi-cap';
    cap.setAttribute('aria-live', 'polite');

    list.forEach(function (it, i) {
      var w = it.w;
      var shot = document.createElement('div');
      shot.className = 'mi-shot';
      var art = document.createElement('div');
      art.className = 'mi-art mi-f-' + (w.frame || FRAMES[i % FRAMES.length]);
      art.style.setProperty('--d', (SHOT_MS + 300) + 'ms');
      it.img.alt = w.title || '';
      art.appendChild(it.img);
      shot.appendChild(art);
      stage.appendChild(shot);
      shots.push({ el: shot, art: art, w: w, move: reduced ? 'mi-still' : MOVES[i % MOVES.length] });
      var b = document.createElement('div');
      b.className = 'mi-bar';
      b.style.setProperty('--d', SHOT_MS + 'ms');
      b.appendChild(document.createElement('i'));
      barBox.appendChild(b);
      bars.push(b);
    });
    // полоска для финального кадра
    var lastBar = document.createElement('div');
    lastBar.className = 'mi-bar';
    lastBar.appendChild(document.createElement('i'));
    barBox.appendChild(lastBar);
    bars.push(lastBar);

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'mi-skip';
    skip.textContent = T.skip;
    skip.onclick = close;

    var end = document.createElement('div');
    end.className = 'mi-end';
    end.innerHTML = '<h1></h1><p></p><button type="button" class="mi-go"></button>';
    end.querySelector('h1').textContent = T.title;
    end.querySelector('p').textContent = T.subtitle;
    end.querySelector('.mi-go').textContent = T.enter;
    end.querySelector('.mi-go').onclick = close;

    root.appendChild(stage);
    root.appendChild(cap);
    root.appendChild(end);
    root.appendChild(barBox);
    root.appendChild(skip);
    stage.addEventListener('click', next);
    cap._set = function (w) {
      cap.innerHTML = '';
      if (!w) return;
      var line2 = [w.artist, w.year].filter(Boolean).join(', ');
      if (w.title) { var b = document.createElement('b'); b.textContent = w.title; cap.appendChild(b); }
      if (line2) { var s = document.createElement('span'); s.textContent = line2; cap.appendChild(s); }
    };
    root._cap = cap;
    root._end = end;
    next();
  }

  function next() {
    if (closed) return;
    clearTimeout(timer);
    var prev = shots[idx];
    if (prev) prev.el.classList.remove('on');
    if (bars[idx]) { bars[idx].classList.remove('run'); bars[idx].classList.add('done'); }
    idx++;
    if (idx < shots.length) {
      var s = shots[idx];
      // перезапуск анимации: снять, прочитать layout, поставить заново
      s.art.style.animationName = 'none';
      void s.art.offsetWidth;
      s.art.style.animationName = s.move;
      s.el.classList.add('on');
      root._cap._set(s.w);
      bars[idx].classList.add('run');
      timer = setTimeout(next, SHOT_MS);
    } else if (idx === shots.length) {
      root._cap._set(null);
      bars[idx].classList.add('done');
      root._end.classList.add('on');
      root._end.querySelector('.mi-go').focus({ preventScroll: true });
    } else {
      close();
    }
  }

  function boot() {
    var works = readWorks().slice(0, MAX_WORKS);
    if (works.length < 3) { close(); return; }
    // Не ждём самую медленную картинку дольше 4 секунд.
    var deadline = new Promise(function (res) { setTimeout(function () { res('late'); }, 4000); });
    var loads = works.map(load);
    Promise.race([Promise.all(loads), deadline]).then(function (r) {
      if (r !== 'late') return start(r);
      // по таймауту берём то, что уже успело
      Promise.all(loads.map(function (p) {
        return Promise.race([p, Promise.resolve(null)]);
      })).then(start);
    });
  }

  // Картинки страницы появляются только после разбора документа.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
