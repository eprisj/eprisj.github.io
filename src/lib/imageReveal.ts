/**
 * Проявление картинок по факту загрузки.
 *
 * Как было: в index.css висело `img[loading="lazy"] { animation: imgReveal }`.
 * CSS-анимация стартует в момент вставки элемента в документ, а не тогда,
 * когда картинка пришла. Полсекунды отсчитывались от появления пустого
 * <img>, и если файл не успевал прилететь за это время (а на телефоне в
 * сети он не успевает почти никогда), кадр просто выскакивал уже после
 * того, как анимация закончилась. Проверено в браузере: незагруженные
 * картинки на главной стояли с opacity 1 ещё до того, как у них появились
 * пиксели. Анимация была, работы не делала.
 *
 * Три предохранителя, потому что у этого сайта уже была история с
 * невидимыми картинками и LCP 21,6 с:
 *
 *  1. Прячем только то, что ещё не загружено. Готовый кадр не трогаем
 *     вообще, чтобы не спрятать уже нарисованное.
 *  2. Герой-карусель исключена. Её центральный кадр — кандидат в LCP,
 *     и прятать его ради красоты значит откатывать ту самую работу,
 *     ради которой в App.tsx стоят fetchPriority и eager.
 *  3. Таймаут. Что бы ни случилось с событием load, через REVEAL_TIMEOUT
 *     кадр становится видимым. Отказ этого модуля не может привести к
 *     невидимой картинке: без единой проставленной пометки CSS оставляет
 *     всё непрозрачным.
 */

const PENDING = 'pending';
const DONE = 'done';
const ATTR = 'data-reveal';
const REVEAL_TIMEOUT = 4000;

/** Кадры первого экрана ведёт App.tsx, у них свои приоритеты загрузки. */
function isAboveTheFold(img: HTMLImageElement): boolean {
  return Boolean(img.closest('.home-carousel-media')) || img.loading !== 'lazy';
}

/**
 * Ждём подхода к экрану, и только тогда прячем кадр под проявление.
 *
 * Первая версия ставила пометку сразу при вставке в документ, и это
 * повторяло исходную ошибку в другом виде: у loading="lazy" браузер не
 * начинает качать файл, пока картинка далеко внизу. Отсчёт шёл, страховочный
 * таймаут срабатывал за экраном, кадр «проявлялся» там, где его никто не
 * видит, а к моменту долистывания снова выскакивал. Проверено пробной
 * картинкой в браузере: через полторы секунды после вставки она так и висела
 * незагруженной. Теперь отсчёт начинается тогда же, когда браузер берётся
 * за загрузку, и проявление совпадает с появлением кадра в поле зрения.
 */
const NEAR_VIEWPORT = '320px';
let nearViewport: IntersectionObserver | null = null;

function reveal(img: HTMLImageElement): void {
  img.setAttribute(ATTR, DONE);
}

/** Кадр подошёл к экрану: если пикселей ещё нет, проявляем по загрузке. */
function arm(img: HTMLImageElement): void {
  if (img.complete && img.naturalWidth > 0) return;

  img.setAttribute(ATTR, PENDING);

  const done = () => {
    window.clearTimeout(timer);
    img.removeEventListener('load', done);
    img.removeEventListener('error', done);
    reveal(img);
  };

  // Битая картинка тоже должна проявиться: пусть читатель видит, что кадр
  // не пришёл, а не пустое место, о котором нельзя догадаться.
  const timer = window.setTimeout(done, REVEAL_TIMEOUT);
  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', done, { once: true });

  // Гонка: картинка могла долететь между проверкой и подпиской.
  if (img.complete) done();
}

function watch(img: HTMLImageElement): void {
  if (img.hasAttribute(ATTR) || img.dataset.revealWatched || isAboveTheFold(img)) return;

  // Уже с пикселями: показываем как есть, без мигания.
  if (img.complete && img.naturalWidth > 0) return;

  if (!nearViewport) {
    arm(img);
    return;
  }
  img.dataset.revealWatched = '1';
  nearViewport.observe(img);
}

function scan(root: ParentNode): void {
  if (root instanceof HTMLImageElement) {
    watch(root);
    return;
  }
  root.querySelectorAll?.('img').forEach((node) => watch(node as HTMLImageElement));
}

export function startImageReveal(): () => void {
  // Уважаем системную настройку так же, как остальные эффекты сайта.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  // Без IntersectionObserver (очень старые движки) просто работаем как
  // раньше, сразу по вставке: хуже по точности, но не ломается.
  if ('IntersectionObserver' in window) {
    nearViewport = new IntersectionObserver((entries, self) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        self.unobserve(entry.target);
        arm(entry.target as HTMLImageElement);
      }
    }, { rootMargin: NEAR_VIEWPORT });
  }

  scan(document);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node as ParentNode);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    nearViewport?.disconnect();
    nearViewport = null;
  };
}
