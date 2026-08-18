import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

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
  type: 'short-text' | 'long-text' | 'email' | 'url' | 'number' | 'date' | 'single-choice' | 'multi-choice' | 'consent' | 'section' | 'files';
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
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
};

type AnswerValue = string | string[] | boolean | UploadedFile[];

const COPY = {
  EN: { loading: 'Loading the form…', closed: 'This form is closed.', missing: 'Form not found.',
        invite: 'This form is open by invitation. Use the personal link the editors sent you.',
        required: 'Please fill in the highlighted fields.', send: 'Send answers', sending: 'Sending…',
        sent: 'Thank you — your answers are with the editors.', error: 'Could not send the form. Try again in a minute.',
        requiredMark: 'required', invitedAs: 'Answering as',
        attach: 'Attach files', uploading: 'Uploading…', remove: 'Remove',
        tooLarge: 'This file is too large.', uploadFailed: 'Upload failed — try again.', noSpace: 'The server is out of space. Tell the editors.' },
  RU: { loading: 'Загружаем анкету…', closed: 'Анкета закрыта.', missing: 'Анкета не найдена.',
        invite: 'Анкета открыта по приглашению. Откройте личную ссылку, которую прислала редакция.',
        required: 'Заполните отмеченные поля.', send: 'Отправить ответы', sending: 'Отправляем…',
        sent: 'Спасибо — ответы у редакции.', error: 'Не удалось отправить. Попробуйте через минуту.',
        requiredMark: 'обязательно', invitedAs: 'Отвечает',
        attach: 'Прикрепить файлы', uploading: 'Загружаем…', remove: 'Убрать',
        tooLarge: 'Файл слишком большой.', uploadFailed: 'Не загрузилось — попробуйте ещё раз.', noSpace: 'На сервере кончилось место. Сообщите редакции.' },
  UA: { loading: 'Завантажуємо анкету…', closed: 'Анкету закрито.', missing: 'Анкету не знайдено.',
        invite: 'Анкета відкрита за запрошенням. Відкрийте особисте посилання від редакції.',
        required: 'Заповніть позначені поля.', send: 'Надіслати відповіді', sending: 'Надсилаємо…',
        sent: 'Дякуємо — відповіді у редакції.', error: 'Не вдалося надіслати. Спробуйте за хвилину.',
        requiredMark: 'обовʼязково', invitedAs: 'Відповідає',
        attach: 'Прикріпити файли', uploading: 'Завантажуємо…', remove: 'Прибрати',
        tooLarge: 'Файл завеликий.', uploadFailed: 'Не завантажилось — спробуйте ще раз.', noSpace: 'На сервері скінчилось місце. Повідомте редакцію.' },
} as const;

function copyFor(language?: string) {
  const key = String(language || 'EN').toUpperCase();
  return (COPY as unknown as Record<string, typeof COPY.EN>)[key] || COPY.EN;
}

const inputClass =
  'w-full rounded-none border border-[rgb(var(--c-accent-rgb)_/_0.25)] bg-transparent px-3 py-2.5 font-serif text-[15px] ' +
  'text-[var(--c-accent)] outline-none transition-colors placeholder:text-[rgb(var(--c-accent-rgb)_/_0.4)] ' +
  'focus:border-[var(--c-accent)]';

export function FormPage({ slug, token }: { slug: string; token?: string }) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [inviteLabel, setInviteLabel] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'sent' | 'closed' | 'missing' | 'invite'>('loading');
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [thankYou, setThankYou] = useState('');
  const t = useMemo(() => copyFor(form?.language), [form?.language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = `${API_BASE}/public/${encodeURIComponent(slug)}${token ? `?t=${encodeURIComponent(token)}` : ''}`;
        const response = await fetch(url);
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 404) { setState('missing'); return; }
        if (response.status === 403) { setState(data?.error === 'invite required' ? 'invite' : 'closed'); return; }
        if (!data?.ok || !data.form) { setState('missing'); return; }
        setForm(data.form);
        setInviteLabel(String(data.invite?.label || ''));
        setState('ready');
        document.title = `${data.form.title} — EPRIS Journal`;
      } catch {
        if (!cancelled) setState('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, token]);

  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

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
        done.push(data.file as UploadedFile);
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

  const submit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!form || sending) return;
    setError('');

    /* Пропущенное показываем ДО отправки и рядом с полем: сообщение «заполните
       обязательные поля» под кнопкой заставляет искать их глазами по всей
       странице, а на длинной анкете это и есть причина её бросить. */
    const missing = form.fields.filter((field) => {
      if (!field.required || field.type === 'section') return false;
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
      setThankYou(String(data.thankYou || form.thankYou || ''));
      setState('sent');
    } catch {
      setError(t.error);
      setSending(false);
    }
  }, [answers, form, sending, t, token]);

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto min-h-screen w-full max-w-[720px] px-5 py-16 sm:px-8 sm:py-24">{children}</main>
  );

  if (state === 'loading') {
    return shell(<p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.6)]">
      <Loader2 className="h-4 w-4 animate-spin" />{copyFor('EN').loading}</p>);
  }
  if (state === 'missing' || state === 'closed' || state === 'invite') {
    const message = state === 'missing' ? t.missing : state === 'closed' ? t.closed : t.invite;
    return shell(
      <div className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">EPRIS / form</p>
        <h1 className="mt-3 font-crimson text-3xl text-[var(--c-accent)]">{message}</h1>
        <a href="/" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.2em] underline">eprisjournal.com</a>
      </div>,
    );
  }
  if (state === 'sent') {
    return shell(
      <div className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-8">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">
          <Check className="h-3.5 w-3.5" />EPRIS / form
        </p>
        <h1 className="mt-3 font-crimson text-3xl text-[var(--c-accent)]">{t.sent}</h1>
        {thankYou && <p className="mt-4 whitespace-pre-line font-serif text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{thankYou}</p>}
        <a href="/" className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.2em] underline">eprisjournal.com</a>
      </div>,
    );
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <header className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">EPRIS / form</p>
        <h1 className="mt-3 font-crimson text-3xl leading-tight text-[var(--c-accent)] sm:text-4xl">{form!.title}</h1>
        {form!.description && (
          <p className="mt-4 whitespace-pre-line font-serif text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.75)]">{form!.description}</p>
        )}
        {inviteLabel && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">{t.invitedAs}: {inviteLabel}</p>
        )}
      </header>

      <div className="mt-10 space-y-8">
        {form!.fields.map((field) => {
          if (field.type === 'section') {
            return (
              <div key={field.id} className="border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-6">
                <h2 className="font-crimson text-2xl text-[var(--c-accent)]">{field.label}</h2>
                {field.hint && <p className="mt-2 font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.65)]">{field.hint}</p>}
              </div>
            );
          }
          const missing = missingFields.includes(field.id);
          const value = answers[field.id];
          return (
            <div key={field.id} id={`field-${field.id}`}>
              <label className="block font-serif text-[15px] text-[var(--c-accent)]" htmlFor={`input-${field.id}`}>
                {field.label}
                {field.required && (
                  <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.45)]">{t.requiredMark}</span>
                )}
              </label>
              {field.hint && <p className="mt-1 font-serif text-[13px] text-[rgb(var(--c-accent-rgb)_/_0.6)]">{field.hint}</p>}
              <div className={`mt-2 ${missing ? 'ring-1 ring-[#B3261E]' : ''}`}>
                {field.type === 'long-text' && (
                  <textarea id={`input-${field.id}`} rows={6} className={inputClass} placeholder={field.placeholder}
                    value={String(value ?? '')} onChange={(e) => setAnswer(field.id, e.target.value)} />
                )}
                {(field.type === 'short-text' || field.type === 'email' || field.type === 'url' || field.type === 'number' || field.type === 'date') && (
                  <input id={`input-${field.id}`} className={inputClass} placeholder={field.placeholder}
                    type={field.type === 'short-text' ? 'text' : field.type}
                    value={String(value ?? '')} onChange={(e) => setAnswer(field.id, e.target.value)} />
                )}
                {field.type === 'single-choice' && (
                  <div className="space-y-2">
                    {(field.options || []).map((option) => (
                      <label key={option} className="flex cursor-pointer items-baseline gap-3 font-serif text-[15px] text-[rgb(var(--c-accent-rgb)_/_0.85)]">
                        <input type="radio" name={field.id} checked={value === option} onChange={() => setAnswer(field.id, option)} />
                        {option}
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
                        <label key={option} className="flex cursor-pointer items-baseline gap-3 font-serif text-[15px] text-[rgb(var(--c-accent-rgb)_/_0.85)]">
                          <input type="checkbox" checked={list.includes(option)}
                            onChange={(e) => setAnswer(field.id, e.target.checked ? [...list, option] : list.filter((item) => item !== option))} />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                )}
                {field.type === 'files' && (() => {
                  const list = Array.isArray(value) ? (value as UploadedFile[]) : [];
                  const busy = uploading[field.id];
                  const failed = uploadError[field.id];
                  return (
                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-2 border border-[rgb(var(--c-accent-rgb)_/_0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--c-accent)] transition-colors hover:bg-[rgb(var(--c-accent-rgb)_/_0.06)]">
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {busy ? t.uploading : t.attach}
                        <input type="file" multiple className="hidden" disabled={busy}
                          onChange={(e) => { if (e.target.files) uploadFiles(field, e.target.files); e.target.value = ''; }} />
                      </label>
                      {failed && <p className="mt-2 font-serif text-sm text-[#B3261E]">{failed}</p>}
                      {list.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {list.map((file) => (
                            <li key={file.fileId} className="flex items-baseline justify-between gap-3 border-b border-[rgb(var(--c-accent-rgb)_/_0.12)] pb-1.5 font-serif text-sm text-[rgb(var(--c-accent-rgb)_/_0.85)]">
                              <span className="truncate">{file.name}</span>
                              <span className="shrink-0 font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.5)]">
                                {file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}
                              </span>
                              <button type="button" className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] underline"
                                onClick={() => setAnswer(field.id, list.filter((item) => item.fileId !== file.fileId))}>
                                {t.remove}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
                {field.type === 'consent' && (
                  <label className="flex cursor-pointer items-baseline gap-3 font-serif text-[15px] text-[rgb(var(--c-accent-rgb)_/_0.85)]">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => setAnswer(field.id, e.target.checked)} />
                    {field.placeholder || field.label}
                  </label>
                )}
              </div>
            </div>
          );
        })}
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

      <div className="mt-10 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-6">
        <button type="submit" disabled={sending}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--c-accent)] px-7 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--c-accent)] transition-colors hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)] disabled:opacity-60">
          {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {sending ? t.sending : t.send}
        </button>
      </div>
    </form>,
  );
}
