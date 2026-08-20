import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Check, AlertCircle, Paperclip, X } from 'lucide-react';

/* ПУБЛИЧНАЯ АНКЕТА.
 *
 * Автору приходит ссылка вида /form/anketa-avtora — и на этом всё: ни
 * регистрации, ни чужого сервиса, ни рекламы Google на странице журнала.
 * Страница живёт по тем же типографским правилам, что и статьи: те же
 * шрифты, та же ширина полосы, тот же язык интерфейса.
 *
 * Всё, что здесь проверяется, проверяется ещё раз на сервере. Здешние
 * проверки — вежливость к человеку (подсветить пропущенное до отправки), а
 * не защита: защита живёт там, куда нельзя дотянуться из браузера.
 */

const API_BASE = 'https://api.eprisjournal.com/forms';

type UploadedFile = { fileId: string; name: string; size: number; type: string };

type FormField = {
  id: string;
  type: 'short-text' | 'long-text' | 'email' | 'url' | 'number' | 'date' | 'single-choice' | 'multi-choice' | 'consent' | 'section' | 'files' | 'image';
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  minLength?: number | null;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  maxFiles?: number | null;
  accept?: string;
  imageUrl?: string;
  showIf?: { fieldId: string; value: string } | null;
};

type PublicForm = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thankYou?: string;
  language?: string;
  status: string;
  access: string;
  fields: FormField[];
  closesAt?: string;
  maxResponses?: number;
  support?: {
    free: string;
    invite: string;
    methods: { label: string; value: string; note?: string }[];
  } | null;
};

type AnswerValue = string | string[] | boolean | UploadedFile[];

const COPY = {
  EN: { loading: 'Loading the form…', closed: 'This form is closed.', missing: 'Form not found.',
        invite: 'This form is open by invitation. Use the personal link the editors sent you.',
        required: 'Please fill in the highlighted fields.', send: 'Send answers', sending: 'Sending…',
        sent: 'Thank you. Your answers are with the editors.', error: 'Could not send the form. Try again in a minute.',
        requiredMark: 'required', invitedAs: 'Answering as', progress: 'Filled in', thisRequired: 'This answer is required.', left: 'Left', dropHint: 'or drop them here', filesFull: 'Maximum files attached:', minLength: 'at least', closedDeadline: 'The deadline for this form has passed.', closedLimit: 'This form has collected all the answers it needed.', supportShow: 'Support the journal', supportHide: 'Hide details', copy: 'Copy', copied: 'Copied',
        savedHere: 'Saved on this device. You can close the tab and come back.', restored: 'We brought back the answers you started earlier.', leaveWarning: 'Your answers are saved here, but not sent yet.',
        previewBanner: 'Preview. This is how the form looks to the author; answers cannot be sent from here.',
        attach: 'Attach files', uploading: 'Uploading…', remove: 'Remove',
        tooLarge: 'This file is too large.', uploadFailed: 'Upload failed. Try again.', noSpace: 'The server is out of space. Tell the editors.' },
  RU: { loading: 'Загружаем анкету…', closed: 'Анкета закрыта.', missing: 'Анкета не найдена.',
        invite: 'Анкета открыта по приглашению. Откройте личную ссылку, которую прислала редакция.',
        required: 'Заполните отмеченные поля.', send: 'Отправить ответы', sending: 'Отправляем…',
        sent: 'Спасибо. Ответы у редакции.', error: 'Не удалось отправить. Попробуйте через минуту.',
        requiredMark: 'обязательно', invitedAs: 'Отвечает', progress: 'Заполнено', thisRequired: 'Без этого ответа нельзя отправить.', left: 'Осталось', dropHint: 'или перетащите их сюда', filesFull: 'Больше файлов не нужно, максимум:', minLength: 'не меньше', closedDeadline: 'Срок подачи закончился.', closedLimit: 'Анкета собрала нужное число ответов.', supportShow: 'Поддержать журнал', supportHide: 'Свернуть', copy: 'Копировать', copied: 'Скопировано',
        savedHere: 'Сохраняется на этом устройстве. Вкладку можно закрыть и вернуться позже.', restored: 'Вернули ответы, которые вы начали раньше.', leaveWarning: 'Ответы сохранены здесь, но ещё не отправлены.',
        previewBanner: 'Предпросмотр. Так анкету видит автор; отправить ответы отсюда нельзя.',
        attach: 'Прикрепить файлы', uploading: 'Загружаем…', remove: 'Убрать',
        tooLarge: 'Файл слишком большой.', uploadFailed: 'Не загрузилось. Попробуйте ещё раз.', noSpace: 'На сервере кончилось место. Сообщите редакции.' },
  UA: { loading: 'Завантажуємо анкету…', closed: 'Анкету закрито.', missing: 'Анкету не знайдено.',
        invite: 'Анкета відкрита за запрошенням. Відкрийте особисте посилання від редакції.',
        required: 'Заповніть позначені поля.', send: 'Надіслати відповіді', sending: 'Надсилаємо…',
        sent: 'Дякуємо. Відповіді у редакції.', error: 'Не вдалося надіслати. Спробуйте за хвилину.',
        requiredMark: 'обовʼязково', invitedAs: 'Відповідає', progress: 'Заповнено', thisRequired: 'Без цієї відповіді не надіслати.', left: 'Залишилось', dropHint: 'або перетягніть їх сюди', filesFull: 'Більше файлів не потрібно, максимум:', minLength: 'не менше', closedDeadline: 'Строк подання завершився.', closedLimit: 'Анкета зібрала потрібну кількість відповідей.', supportShow: 'Підтримати журнал', supportHide: 'Згорнути', copy: 'Копіювати', copied: 'Скопійовано',
        savedHere: 'Зберігається на цьому пристрої. Вкладку можна закрити й повернутися пізніше.', restored: 'Повернули відповіді, які ви почали раніше.', leaveWarning: 'Відповіді збережені тут, але ще не надіслані.',
        previewBanner: 'Попередній перегляд. Так анкету бачить автор; надіслати відповіді звідси не можна.',
        attach: 'Прикріпити файли', uploading: 'Завантажуємо…', remove: 'Прибрати',
        tooLarge: 'Файл завеликий.', uploadFailed: 'Не завантажилось. Спробуйте ще раз.', noSpace: 'На сервері скінчилось місце. Повідомте редакцію.' },
} as const;

function copyFor(language?: string) {
  const key = String(language || 'EN').toUpperCase();
  return (COPY as unknown as Record<string, typeof COPY.EN>)[key] || COPY.EN;
}

/* Размер шрифта в полях — 16px и не меньше.
   Это не вкус: Safari на iPhone принудительно приближает страницу, когда
   фокус попадает в поле с текстом мельче шестнадцати пикселей, и человек
   заполняет анкету, ёрзая по увеличенной странице. Всё остальное здесь —
   про попадание пальцем: высокая строка ввода, крупные варианты ответа,
   заметный фокус. */
const inputClass =
  'w-full rounded-[2px] border border-[rgb(var(--c-accent-rgb)_/_0.22)] bg-[rgb(var(--c-accent-rgb)_/_0.02)] ' +
  'px-4 py-3.5 font-serif text-[16px] leading-relaxed text-[var(--c-accent)] outline-none transition-all ' +
  'placeholder:text-[rgb(var(--c-accent-rgb)_/_0.35)] ' +
  'focus:border-[var(--c-accent)] focus:bg-transparent focus:ring-4 focus:ring-[rgb(var(--c-accent-rgb)_/_0.07)]';

/* Варианты ответа — не точки диаметром в десять пикселей, а целые строки:
   палец попадает по всей карточке, а выбранная видна с расстояния. */
const choiceClass = (selected: boolean) =>
  'flex cursor-pointer items-start gap-3 rounded-[2px] border px-4 py-3 font-serif text-[16px] leading-snug transition-all ' +
  (selected
    ? 'border-[var(--c-accent)] bg-[rgb(var(--c-accent-rgb)_/_0.06)] text-[var(--c-accent)]'
    : 'border-[rgb(var(--c-accent-rgb)_/_0.18)] text-[rgb(var(--c-accent-rgb)_/_0.8)] hover:border-[rgb(var(--c-accent-rgb)_/_0.45)]');


/* БЛОК ПОДДЕРЖКИ.

   Свёрнут по умолчанию: видна одна строка о том, что публикация бесплатна, и
   сдержанная кнопка. Реквизиты появляются, только если человек сам этого
   захотел. У каждого способа своя кнопка копирования: номер карты и IBAN
   выделять пальцем на телефоне мучительно, а ошибиться в одной цифре легко. */
function SupportBlock({ support, open, onToggle, copied, onCopy, t }: {
  support: NonNullable<PublicForm['support']>;
  open: boolean;
  onToggle: () => void;
  copied: string;
  onCopy: (label: string, value: string) => void;
  t: typeof COPY.EN;
}) {
  return (
    <aside className="mt-14 border-t border-[rgb(var(--c-accent-rgb)_/_0.18)] pt-6">
      {/* Строка про бесплатность набрана плотнее остального мелкого текста:
          это единственное здесь утверждение, ради которого блок и существует,
          и оно не должно читаться как сноска. Кнопка держит тот же вес. */}
      <p className="font-serif text-[15px] font-medium leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.88)]">{support.free}</p>
      <button type="button" onClick={onToggle}
        className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.45)] px-5 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]">
        {open ? t.supportHide : t.supportShow}
      </button>
      {open && (
        <div className="mt-4">
          <p className="font-serif text-[14px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.55)]">{support.invite}</p>
          <dl className="mt-3 space-y-2">
            {support.methods.map((method) => (
              <div key={method.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <dt className="min-w-[52px] font-mono text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.45)]">{method.label}</dt>
                <dd id={`support-${method.label}`} className="select-all font-mono text-[13px] text-[var(--c-accent)]">
                  {method.value}
                  {method.note && <span className="ml-2 text-[rgb(var(--c-accent-rgb)_/_0.45)]">{method.note}</span>}
                </dd>
                <button type="button" onClick={() => onCopy(method.label, method.value)}
                  className="rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.22)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.6)] transition-colors hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]">
                  {copied === method.label ? t.copied : t.copy}
                </button>
              </div>
            ))}
          </dl>
        </div>
      )}
    </aside>
  );
}

export function FormPage({ slug, token }: { slug: string; token?: string }) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [inviteLabel, setInviteLabel] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'sent' | 'closed' | 'missing' | 'invite'>('loading');
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [thankYou, setThankYou] = useState('');
  // Анкета открыта по ссылке предпросмотра: показываем, но не принимаем ответы.
  const [previewMode, setPreviewMode] = useState(false);
  const t = useMemo(() => copyFor(form?.language), [form?.language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        /* Предпросмотр черновика: редакция открывает анкету до того, как включит
           приём. Токен идёт в том же запросе, что и приглашение. */
        const previewToken = new URLSearchParams(window.location.search).get('preview') || '';
        const params = new URLSearchParams();
        if (token) params.set('t', token);
        if (previewToken) params.set('preview', previewToken);
        const query = params.toString();
        const url = `${API_BASE}/public/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
        const response = await fetch(url);
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 404) { setState('missing'); return; }
        if (response.status === 403) {
          if (data?.error === 'invite required') setState('invite');
          else {
            setClosedReason(data?.error === 'deadline passed' ? 'deadline' : data?.error === 'response limit reached' ? 'limit' : '');
            setState('closed');
          }
          return;
        }
        if (!data?.ok || !data.form) { setState('missing'); return; }
        setForm(data.form);
        setInviteLabel(String(data.invite?.label || ''));
        setPreviewMode(Boolean(data.preview));
        setState('ready');
        document.title = `${data.form.title} · EPRIS Journal`;
      } catch {
        if (!cancelled) setState('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, token]);

  /* Черновик живёт в браузере автора.

     Длинную анкету заполняют не за один присест: человек уходит искать
     ссылку на портфолио, закрывает вкладку, возвращается с телефона на
     ноутбук. Потерянные ответы — самая частая причина, по которой анкету не
     присылают вовсе. Файлы сюда не пишем: их место на сервере, а в черновике
     остаются только ссылки на уже загруженное. */
  const draftKey = `epris_form_draft_${slug}`;
  const [restored, setRestored] = useState(false);
  /* Черновик восстановился молча, и человек об этом не знал: возвращаясь к
     анкете, он видел свои ответы и не понимал, откуда они, а уходя — боялся
     потерять написанное. Обе вещи стоит сказать вслух. */
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [dragField, setDragField] = useState('');
  /* Миниатюра берётся из выбранного файла в браузере и никуда не отправляется:
     тянуть картинку обратно с сервера ради превью значит гонять мегабайты по
     мобильному интернету второй раз. */
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [closedReason, setClosedReason] = useState('');
  /* Реквизиты закрыты кнопкой. Открытый список карт и IBAN под анкетой
     выглядит как счёт, даже когда сопровождается словами «публикация
     бесплатна»: цифры считываются раньше текста. Кнопка оставляет выбор
     за человеком, а тем, кто не собирался платить, не показывает ничего. */
  const [supportOpen, setSupportOpen] = useState(false);
  const [copied, setCopied] = useState('');

  const copyValue = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      // Буфер недоступен (старый браузер, отказ в правах): выделяем текст,
      // чтобы человек скопировал сам, а не остался ни с чем.
      const node = document.getElementById(`support-${label}`);
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, []);

  /* Файл уходит на сервер сразу при выборе, а не вместе с анкетой.
     Так автор видит, что пятисотмегабайтный макет действительно загрузился,
     до того как нажмёт «Отправить», — и не теряет заполненные ответы, если
     загрузка сорвалась. В самом ответе едут только ссылки на загруженное. */
  const uploadFiles = useCallback(async (field: FormField, files: FileList) => {
    if (!form || !files.length) return;
    setUploading((prev) => ({ ...prev, [field.id]: true }));
    setUploadError((prev) => ({ ...prev, [field.id]: '' }));
    const done: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      try {
        const query = token ? `?t=${encodeURIComponent(token)}` : '';
        const response = await fetch(`${API_BASE}/public/${encodeURIComponent(form.slug)}/upload${query}`, {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            // Имя едет заголовком и в кодировке URL: в нём бывают кириллица,
            // пробелы и переводы строк, которых заголовок не переживает.
            'X-File-Name': encodeURIComponent(file.name),
          },
          body: file,
        });
        const data = await response.json().catch(() => null);
        if (response.status === 413) { setUploadError((prev) => ({ ...prev, [field.id]: t.tooLarge })); continue; }
        if (response.status === 507) { setUploadError((prev) => ({ ...prev, [field.id]: t.noSpace })); continue; }
        if (!response.ok || !data?.ok) { setUploadError((prev) => ({ ...prev, [field.id]: t.uploadFailed })); continue; }
        const uploaded = data.file as UploadedFile;
        done.push(uploaded);
        if (file.type.startsWith('image/')) {
          setPreviews((prev) => ({ ...prev, [uploaded.fileId]: URL.createObjectURL(file) }));
        }
      } catch {
        setUploadError((prev) => ({ ...prev, [field.id]: t.uploadFailed }));
      }
    }
    if (done.length) {
      setAnswers((prev) => {
        const current = Array.isArray(prev[field.id]) ? (prev[field.id] as UploadedFile[]) : [];
        return { ...prev, [field.id]: [...current, ...done] };
      });
      setMissingFields((prev) => prev.filter((id) => id !== field.id));
    }
    setUploading((prev) => ({ ...prev, [field.id]: false }));
  }, [form, t, token]);

  const setAnswer = useCallback((fieldId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setMissingFields((prev) => prev.filter((id) => id !== fieldId));
  }, []);

  // Восстанавливаем черновик, когда анкета уже известна: иначе можно вернуть
  // ответы на вопросы, которых в ней больше нет.
  useEffect(() => {
    if (!form || restored) return;
    setRestored(true);
    try {
      const stored = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (stored && typeof stored === 'object') {
        const known = new Set(form.fields.map((field) => field.id));
        const filtered = Object.fromEntries(
          Object.entries(stored as Record<string, AnswerValue>).filter(([key]) => known.has(key)),
        ) as Record<string, AnswerValue>;
        if (Object.keys(filtered).length) {
          setAnswers((prev) => ({ ...filtered, ...prev }));
          setRestoredNotice(true);
        }
      }
    } catch { /* приватный режим — просто не восстанавливаем */ }
  }, [draftKey, form, restored]);

  useEffect(() => {
    if (!form || !restored) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(answers));
      // Пустой объект — это ещё не начатая анкета, о её «сохранении» сообщать не о чем.
      if (Object.keys(answers).length) setSavedAt(Date.now());
    } catch { /* нет места — не беда */ }
  }, [answers, draftKey, form, restored]);

  /* Уход со страницы с незаконченной анкетой. Ответы никуда не денутся, но
     человек этого не знает, а закрытая вкладка выглядит как потерянный час
     работы. Браузер покажет своё стандартное предупреждение; наш текст туда
     не попадёт, но само окно даёт шанс передумать. */
  useEffect(() => {
    const started = Object.keys(answers).length > 0;
    if (!started || state === 'sent') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t.leaveWarning;
      return t.leaveWarning;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [answers, state, t.leaveWarning]);

  /* Показывать ли вопрос при нынешних ответах. Скрытый не спрашивается и не
     требуется — иначе анкета отказывалась бы отправляться из-за поля, которого
     человек не видел. Правило то же, что на сервере. */
  const isVisible = useCallback((field: FormField) => {
    if (!field.showIf?.fieldId) return true;
    const source = answers[field.showIf.fieldId];
    if (Array.isArray(source)) return (source as string[]).includes(field.showIf.value);
    if (typeof source === 'boolean') return source === (field.showIf.value === 'true');
    return String(source ?? '') === field.showIf.value;
  }, [answers]);

  /* Сколько обязательного осталось. Полоса вверху отвечает на единственный
     вопрос, который человек задаёт длинной анкете: «сколько ещё?» */
  const progress = useMemo(() => {
    if (!form) return { done: 0, total: 0 };
    const required = form.fields.filter((field) => field.required && field.type !== 'section' && isVisible(field));
    const done = required.filter((field) => {
      const value = answers[field.id];
      if (field.type === 'multi-choice' || field.type === 'files') return Array.isArray(value) && value.length > 0;
      if (field.type === 'consent') return Boolean(value);
      return String(value ?? '').trim().length > 0;
    }).length;
    return { done, total: required.length };
  }, [answers, form, isVisible]);

  const submit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!form || sending) return;
    setError('');

    /* Пропущенное показываем ДО отправки и рядом с полем: сообщение «заполните
       обязательные поля» под кнопкой заставляет искать их глазами по всей
       странице, а на длинной анкете это и есть причина её бросить. */
    const missing = form.fields.filter((field) => {
      if (!field.required || field.type === 'section' || !isVisible(field)) return false;
      const value = answers[field.id];
      if (field.type === 'multi-choice' || field.type === 'files') return !Array.isArray(value) || !value.length;
      if (field.type === 'consent') return !value;
      return !String(value ?? '').trim();
    }).map((field) => field.id);
    if (missing.length) {
      setMissingFields(missing);
      setError(t.required);
      document.getElementById(`field-${missing[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    // В предпросмотре кнопка выключена, но обработчик всё равно не должен
    // отправлять: черновик анкеты не готов собирать ответы.
    if (previewMode) return;
    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/public/${encodeURIComponent(form.slug)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token || '', answers, website: '' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setError(Array.isArray(data?.fields) && data.fields.length ? `${t.required} ${data.fields.join(', ')}` : t.error);
        setSending(false);
        return;
      }
      try { localStorage.removeItem(draftKey); } catch { /* не важно */ }
      setThankYou(String(data.thankYou || form.thankYou || ''));
      setState('sent');
    } catch {
      setError(t.error);
      setSending(false);
    }
  }, [answers, draftKey, form, isVisible, previewMode, sending, t, token]);

  /* Полоса набора — 640 пикселей: примерно семьдесят знаков в строке, то есть
     ширина, на которой длинный вопрос читается без возврата глазом. На
     телефоне поля дышат по краям, на большом экране анкета не растягивается
     во всю ширину монитора. */
  const shell = (children: React.ReactNode) => (
    <main className="mx-auto min-h-screen w-full max-w-[640px] px-5 pb-24 pt-12 sm:px-8 sm:pb-32 sm:pt-20">{children}</main>
  );

  if (state === 'loading') {
    return shell(<p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.6)]">
      <Loader2 className="h-4 w-4 animate-spin" />{copyFor('EN').loading}</p>);
  }
  if (state === 'missing' || state === 'closed' || state === 'invite') {
    const message = state === 'missing' ? t.missing
      : state === 'closed'
        ? (closedReason === 'deadline' ? t.closedDeadline : closedReason === 'limit' ? t.closedLimit : t.closed)
        : t.invite;
    return shell(
      <div className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">EPRIS / form</p>
        <h1 className="mt-3 font-crimson text-3xl text-[var(--c-accent)]">{message}</h1>
        <a href="/" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.2em] underline">eprisjournal.com</a>
      </div>,
    );
  }
  if (state === 'sent') {
    /* Последний экран — единственное, что автор увидит после получаса работы,
       и раньше он выглядел как обрывок формы, прижатый к левому краю. Теперь
       это отдельная страница благодарности: по центру, с воздухом и выходом
       обратно в журнал. */
    return (
      <main className="mx-auto flex min-h-[80vh] w-full max-w-[560px] flex-col items-center justify-center px-6 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgb(var(--c-accent-rgb)_/_0.3)]">
          <Check className="h-6 w-6 text-[var(--c-accent)]" />
        </span>
        <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.24em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">EPRIS / form</p>
        <h1 className="mt-3 font-crimson text-[30px] leading-tight text-[var(--c-accent)] sm:text-[36px]">{t.sent}</h1>
        {thankYou && (
          <p className="mt-5 whitespace-pre-line font-serif text-[16px] leading-[1.75] text-[rgb(var(--c-accent-rgb)_/_0.72)]">{thankYou}</p>
        )}
        {form?.support && (
          <div className="mt-10 w-full text-left">
            <SupportBlock support={form.support} open={supportOpen} onToggle={() => setSupportOpen((v) => !v)} copied={copied} onCopy={copyValue} t={t} />
          </div>
        )}
        <span className="mt-9 h-px w-16 bg-[rgb(var(--c-accent-rgb)_/_0.25)]" />
        <a href="/" className="mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--c-accent)] px-7 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]">
          eprisjournal.com
        </a>
      </main>
    );
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <header className="border-t border-[rgb(var(--c-accent-rgb)_/_0.25)] pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">EPRIS / form</p>
        <h1 className="mt-3 font-crimson text-[32px] leading-[1.12] text-[var(--c-accent)] sm:text-[40px]">{form!.title}</h1>
        {form!.description && (
          <p className="mt-5 whitespace-pre-line font-serif text-[16px] leading-[1.7] text-[rgb(var(--c-accent-rgb)_/_0.72)]">{form!.description}</p>
        )}
        {previewMode && (
          <p className="mt-5 border border-[rgb(var(--c-accent-rgb)_/_0.3)] bg-[rgb(var(--c-accent-rgb)_/_0.04)] px-4 py-3 font-mono text-[10px] uppercase leading-[1.6] tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.7)]">
            {t.previewBanner}
          </p>
        )}
        {inviteLabel && (
          <p className="mt-5 inline-block border border-[rgb(var(--c-accent-rgb)_/_0.25)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--c-accent-rgb)_/_0.6)]">
            {t.invitedAs}: {inviteLabel}
          </p>
        )}
        {progress.total > 0 && (
          <div className="mt-8">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">
              <span>{t.progress}</span>
              <span>{progress.done} / {progress.total}</span>
            </div>
            {/* Полоса, а не проценты: доля читается взглядом, число — нет. */}
            <div className="mt-2 h-[3px] w-full bg-[rgb(var(--c-accent-rgb)_/_0.12)]">
              <div className="h-full bg-[var(--c-accent)] transition-[width] duration-500"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
            </div>
            {/* Анкета длинная, и главный страх отвечающего — потерять написанное.
                Строка появляется только когда есть что терять. */}
            {savedAt !== null && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.42)]">
                {t.savedHere}
              </p>
            )}
          </div>
        )}
        {restoredNotice && (
          <p className="mt-5 border-l-2 border-[rgb(var(--c-accent-rgb)_/_0.3)] pl-3 font-serif text-[14px] leading-[1.6] text-[rgb(var(--c-accent-rgb)_/_0.7)]">
            {t.restored}
          </p>
        )}
      </header>

      <div className="mt-12 space-y-10">
        {(() => { let questionNumber = 0; return form!.fields.map((field) => {
          if (field.type === 'image') {
            if (!field.imageUrl) return null;
            /* Картинка идёт во всю полосу набора и без рамки: это иллюстрация
               к вопросу, а не вложение — рамка превратила бы её в элемент
               управления, который хочется нажать. */
            return (
              <figure key={field.id} className="my-2">
                <img src={field.imageUrl} alt={field.label || ''} loading="lazy"
                  className="w-full rounded-[2px] object-cover" />
                {(field.label || field.hint) && (
                  <figcaption className="mt-2 font-serif text-[13px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.6)]">
                    {field.label}{field.hint ? `. ${field.hint}` : ''}
                  </figcaption>
                )}
              </figure>
            );
          }
          if (field.type === 'section') {
            return (
              <div key={field.id} className="border-t border-[rgb(var(--c-accent-rgb)_/_0.25)] pt-8">
                <h2 className="font-crimson text-[26px] leading-tight text-[var(--c-accent)]">{field.label}</h2>
                {field.hint && <p className="mt-2 font-serif text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.65)]">{field.hint}</p>}
              </div>
            );
          }
          if (!isVisible(field)) return null;
          questionNumber += 1;
          /* Вопрос часто приходит с собственной нумерацией: редакция пишет
             «1. Ваши интерьеры…», как в письме. Своя нумерация страницы тогда
             становится вторым числом рядом с первым, и они не совпадают:
             «03» слева и «1.» в тексте. Если номер уже есть в тексте, берём
             его и убираем из подписи, чтобы число осталось одно и верное. */
          const written = String(field.label || '').match(/^\s*(\d{1,2})[.)]\s+(.*)$/s);
          const shownNumber = written ? written[1].padStart(2, '0') : String(questionNumber).padStart(2, '0');
          const shownLabel = written ? written[2] : field.label;
          const missing = missingFields.includes(field.id);
          const value = answers[field.id];
          return (
            <div key={field.id} id={`field-${field.id}`} className="scroll-mt-24">
              {/* Номер вопроса: на телефоне над текстом, на широком экране
                  слева от него. Колонка с числом на узком экране отнимала у
                  длинного вопроса пятую часть строки и рвала его на слоги. */}
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-[rgb(var(--c-accent-rgb)_/_0.4)] sm:mt-[3px]">
                  {shownNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <label className="block font-serif text-[17px] leading-snug text-[var(--c-accent)]" htmlFor={`input-${field.id}`}>
                    {shownLabel}
                    {field.required && (
                      /* Неразрывный пробел перед пометкой: иначе слово
                         «обязательно» отрывается от вопроса и висит одно на
                         новой строке, что на узком экране читается как
                         отдельная мысль. */
                      <>
                        {'\u00A0'}
                        <span className="whitespace-nowrap align-[2px] font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{t.requiredMark}</span>
                      </>
                    )}
                  </label>
                  {field.hint && <p className="mt-1.5 font-serif text-[14px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.6)]">{field.hint}</p>}
                  {missing && <p className="mt-2 font-serif text-[14px] text-[#B3261E]">{t.thisRequired}</p>}
              <div className={`mt-3 ${missing ? 'rounded-[2px] ring-2 ring-[#B3261E]/35' : ''}`}>
                {field.type === 'long-text' && (
                  <textarea id={`input-${field.id}`} rows={5} maxLength={field.maxLength || undefined}
                    className={`${inputClass} resize-none overflow-hidden`}
                    placeholder={field.placeholder} value={String(value ?? '')}
                    /* Поле растёт под текст: полоса прокрутки внутри поля
                       прячет от автора начало собственного ответа. */
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                    onChange={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                      setAnswer(field.id, e.target.value);
                    }} />
                )}
                {(field.type === 'short-text' || field.type === 'email' || field.type === 'url' || field.type === 'number' || field.type === 'date') && (
                  <input id={`input-${field.id}`} className={inputClass} placeholder={field.placeholder}
                    type={field.type === 'short-text' ? 'text' : field.type}
                    maxLength={field.type === 'short-text' ? (field.maxLength || undefined) : undefined}
                    min={field.type === 'number' && field.min != null ? field.min : undefined}
                    max={field.type === 'number' && field.max != null ? field.max : undefined}
                    /* Числовое поле на телефоне открывает цифровую клавиатуру,
                       остальные — обычную: тип поля влияет на то, чем человек
                       набирает ответ, а не только на проверку. */
                    inputMode={field.type === 'number' ? 'decimal' : undefined}
                    value={String(value ?? '')} onChange={(e) => setAnswer(field.id, e.target.value)} />
                )}
                {field.type === 'single-choice' && (
                  <div className="space-y-2">
                    {(field.options || []).map((option) => (
                      <label key={option} className={choiceClass(value === option)}>
                        <input type="radio" className="mt-1 accent-[var(--c-accent)]" name={field.id}
                          checked={value === option} onChange={() => setAnswer(field.id, option)} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                {field.type === 'multi-choice' && (
                  <div className="space-y-2">
                    {(field.options || []).map((option) => {
                      // Ответ этого типа — всегда список строк; общий тип
                      // ответов шире, потому что файлы приходят объектами.
                      const list = (Array.isArray(value) ? value : []).filter((item): item is string => typeof item === 'string');
                      return (
                        <label key={option} className={choiceClass(list.includes(option))}>
                          <input type="checkbox" className="mt-1 accent-[var(--c-accent)]" checked={list.includes(option)}
                            onChange={(e) => setAnswer(field.id, e.target.checked ? [...list, option] : list.filter((item) => item !== option))} />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {/* Счётчик молчит, пока в нём нет нужды.

                    Предел в пять тысяч знаков стоит на каждом поле, и писать
                    «0 / 5000» под пустым вопросом значит намекать человеку,
                    что от него ждут пять тысяч знаков. Счётчик появляется,
                    когда до предела действительно недалеко, и сразу же, если
                    у вопроса задана нижняя граница. */}
                {(() => {
                  if (field.type !== 'long-text' && field.type !== 'short-text') return null;
                  const length = String(value ?? '').length;
                  const nearLimit = Boolean(field.maxLength) && length > field.maxLength! * 0.8;
                  const belowMin = Boolean(field.minLength) && length < field.minLength!;
                  if (!nearLimit && !belowMin) return null;
                  return (
                    <p className={`mt-1.5 text-right font-mono text-[10px] ${nearLimit ? 'text-[#B3261E]' : 'text-[rgb(var(--c-accent-rgb)_/_0.45)]'}`}>
                      {length}{field.maxLength ? ` / ${field.maxLength}` : ''}
                      {belowMin ? ` · ${t.minLength} ${field.minLength}` : ''}
                    </p>
                  );
                })()}
                {field.type === 'files' && (() => {
                  const list = Array.isArray(value) ? (value as UploadedFile[]) : [];
                  const busy = uploading[field.id];
                  const failed = uploadError[field.id];
                  const dragging = dragField === field.id;
                  const full = Boolean(field.maxFiles && list.length >= field.maxFiles);
                  return (
                    <div>
                      {/* Область для перетаскивания, она же кнопка выбора.
                          С ноутбука файлы кидают мышью из папки, с телефона
                          выбирают пальцем — работать должно и то, и другое. */}
                      <label
                        onDragOver={(e) => { e.preventDefault(); setDragField(field.id); }}
                        onDragLeave={() => setDragField('')}
                        onDrop={(e) => {
                          e.preventDefault(); setDragField('');
                          if (e.dataTransfer.files?.length) uploadFiles(field, e.dataTransfer.files);
                        }}
                        className={'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed px-5 py-8 text-center transition-colors '
                          + (dragging
                            ? 'border-[var(--c-accent)] bg-[rgb(var(--c-accent-rgb)_/_0.06)]'
                            : 'border-[rgb(var(--c-accent-rgb)_/_0.3)] hover:border-[rgb(var(--c-accent-rgb)_/_0.55)]')}>
                        {busy
                          ? <Loader2 className="h-5 w-5 animate-spin text-[var(--c-accent)]" />
                          : <Paperclip className="h-5 w-5 text-[rgb(var(--c-accent-rgb)_/_0.55)]" />}
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--c-accent)]">
                          {busy ? t.uploading : t.attach}
                        </span>
                        <span className="font-serif text-[13px] text-[rgb(var(--c-accent-rgb)_/_0.55)]">
                          {full ? `${t.filesFull} ${field.maxFiles}` : t.dropHint}
                        </span>
                        <input type="file" multiple className="hidden" disabled={busy || full} accept={field.accept || undefined}
                          onChange={(e) => { if (e.target.files) uploadFiles(field, e.target.files); e.target.value = ''; }} />
                      </label>
                      {failed && <p className="mt-2 font-serif text-[14px] text-[#B3261E]">{failed}</p>}
                      {list.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {list.map((file) => (
                            <li key={file.fileId} className="flex items-center gap-3 rounded-[2px] border border-[rgb(var(--c-accent-rgb)_/_0.16)] p-2.5">
                              {/* У картинки — её собственный кадр: так видно,
                                  что приложили именно ту работу. */}
                              {previews[file.fileId]
                                ? <img src={previews[file.fileId]} alt="" className="h-12 w-12 shrink-0 object-cover" />
                                : <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[rgb(var(--c-accent-rgb)_/_0.06)] font-mono text-[9px] uppercase text-[rgb(var(--c-accent-rgb)_/_0.5)]">
                                    {(file.name.split('.').pop() || 'file').slice(0, 4)}
                                  </span>}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-serif text-[15px] text-[var(--c-accent)]">{file.name}</span>
                                <span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.5)]">
                                  {file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}
                                </span>
                              </span>
                              <button type="button" aria-label={t.remove}
                                className="shrink-0 rounded-full p-2 text-[rgb(var(--c-accent-rgb)_/_0.55)] transition-colors hover:bg-[rgb(var(--c-accent-rgb)_/_0.08)] hover:text-[var(--c-accent)]"
                                onClick={() => setAnswer(field.id, list.filter((item) => item.fileId !== file.fileId))}>
                                <X className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
                {field.type === 'consent' && (
                  <label className={choiceClass(Boolean(value))}>
                    <input type="checkbox" className="mt-1 accent-[var(--c-accent)]" checked={Boolean(value)}
                      onChange={(e) => setAnswer(field.id, e.target.checked)} />
                    <span>{field.placeholder || field.label}</span>
                  </label>
                )}
              </div>
                </div>
              </div>
            </div>
          );
        }); })()}
      </div>

      {/* Ловушка для роботов: настоящий человек этого поля не видит и не
          заполняет. Скрыто стилями, а не type=hidden — заполнялки форм
          пропускают hidden и охотно пишут в «website». */}
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" onChange={(e) => setAnswers((prev) => ({ ...prev, website: e.target.value }))} /></label>
      </div>

      {error && (
        <p className="mt-8 flex items-start gap-2 font-serif text-sm text-[#B3261E]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </p>
      )}

      {/* ПОДДЕРЖКА ПРОЕКТА.

          Стоит после всех вопросов и до кнопки, набрана мелко и без единого
          восклицательного знака: человек уже сделал главное, ответил, и его
          нельзя встречать просьбой о деньгах в середине работы. Первая строка
          снимает вопрос, который автор боится задать вслух: публикация
          бесплатна. */}
      {form!.support && <SupportBlock support={form!.support} open={supportOpen} onToggle={() => setSupportOpen((v) => !v)} copied={copied} onCopy={copyValue} t={t} />}

      {/* Кнопка прилипает к низу экрана на телефоне: анкета длиннее экрана, и
          «Отправить» не должно требовать прокрутки в конец после того, как
          человек всё заполнил. На широком экране она остаётся обычной. */}
      <div className="sticky bottom-0 z-10 mt-12 border-t border-[rgb(var(--c-accent-rgb)_/_0.25)] bg-[var(--c-bg)] pb-[max(12px,env(safe-area-inset-bottom))] pt-5">
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={sending || previewMode}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[var(--c-accent)] bg-[var(--c-accent)] px-8 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--c-bg)] transition-opacity hover:opacity-85 disabled:opacity-60">
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {sending ? t.sending : t.send}
          </button>
          {progress.total > progress.done && (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">
              {t.left}: {progress.total - progress.done}
            </span>
          )}
        </div>
      </div>
    </form>,
  );
}
