import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Download, FileText, Share2, Link2, Check, RotateCcw } from 'lucide-react';
import QRCode from 'qrcode';
import { PassportPreview } from './PassportPreview';
import { PassportBook } from './PassportBook';
import { generatePassportCode } from '../../lib/passportCode';
import { publishPassport, fetchPassport, getSavedAdminPassword, saveAdminPassword, verifyAdminPassword } from './passportApi';
import { renderPassportPNG, type PassportFields } from './passportRender';
import { PhotoCropper } from './PhotoCropper';

const MEMBERSHIP_TYPES = ['Author', 'Researcher', 'Editor', 'Reviewer', 'Contributor', 'Patron', 'Fellow'];

function todayISO(offsetYears = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + offsetYears);
  return d.toISOString().slice(0, 10);
}

function emptyFields(): PassportFields {
  return {
    surname: '',
    givenNames: '',
    dob: '',
    country: '',
    city: '',
    field: '',
    membershipType: MEMBERSHIP_TYPES[0],
    memberNumber: '',
    link: '',
    issueDate: todayISO(),
    expiryDate: todayISO(5),
    motto: '',
    sex: '',
  };
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block group">
      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pp-burgundy)]/50 group-focus-within:text-[var(--pp-burgundy)]/90 mb-2 transition-colors duration-300">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full bg-white/60 backdrop-blur-sm border border-[var(--pp-burgundy)]/20 rounded-md focus:border-[var(--pp-burgundy)]/60 focus:bg-white focus:ring-4 focus:ring-[var(--pp-burgundy)]/5 outline-none px-4 py-2.5 font-serif text-[15px] text-[var(--pp-ink)] placeholder-[var(--pp-ink)]/30 transition-all duration-300 shadow-[0_2px_10px_rgba(80,26,44,0.02)] focus:shadow-[0_4px_20px_rgba(80,26,44,0.06)]';

function CreatorForm({
  fields, setFields, onPhotoFile, errors,
}: {
  fields: PassportFields;
  setFields: (f: PassportFields) => void;
  onPhotoFile: (f: File) => void;
  errors: Record<string, string>;
}) {
  const set = <K extends keyof PassportFields>(k: K, v: PassportFields[K]) => setFields({ ...fields, [k]: v });
  return (
    <div className="space-y-6 bg-white/40 p-6 sm:p-8 rounded-xl shadow-[0_8px_30px_rgba(80,26,44,0.04)] border border-white/60 backdrop-blur-md">
      <Labeled label="Portrait Photo">
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[var(--pp-burgundy)]/25 bg-white/50 hover:bg-white hover:border-[var(--pp-burgundy)]/50 rounded-lg px-6 py-8 cursor-pointer transition-all duration-300 group">
          <div className="p-3 bg-[var(--pp-burgundy)]/5 text-[var(--pp-burgundy)] rounded-full group-hover:scale-110 group-hover:bg-[var(--pp-burgundy)]/10 transition-transform duration-300">
            <Upload size={20} />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--pp-burgundy)]/80 group-hover:text-[var(--pp-burgundy)] transition-colors">Upload &amp; crop photo</span>
          <span className="font-serif text-[13px] text-[var(--pp-ink)]/40 italic">Ideal size: 35×45mm aspect ratio</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoFile(f); e.target.value = ''; }}
          />
        </label>
      </Labeled>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Surname">
          <input className={inputCls} value={fields.surname} onChange={(e) => set('surname', e.target.value)} maxLength={40} />
          {errors.surname && <p className="text-[10px] text-red-700 mt-1">{errors.surname}</p>}
        </Labeled>
        <Labeled label="Given Names">
          <input className={inputCls} value={fields.givenNames} onChange={(e) => set('givenNames', e.target.value)} maxLength={60} />
          {errors.givenNames && <p className="text-[10px] text-red-700 mt-1">{errors.givenNames}</p>}
        </Labeled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Date of Birth">
          <input type="date" className={inputCls} value={fields.dob} onChange={(e) => set('dob', e.target.value)} />
        </Labeled>
        <Labeled label="Sex">
          <select className={inputCls} value={fields.sex} onChange={(e) => set('sex', e.target.value)}>
            <option value="">Unspecified (X)</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="X">X</option>
          </select>
        </Labeled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Country">
          <input className={inputCls} value={fields.country} onChange={(e) => set('country', e.target.value)} maxLength={40} />
        </Labeled>
        <Labeled label="City">
          <input className={inputCls} value={fields.city} onChange={(e) => set('city', e.target.value)} maxLength={40} />
        </Labeled>
      </div>

      <Labeled label="Professional Field">
        <input className={inputCls} placeholder="Architecture, Editorial…" value={fields.field} onChange={(e) => set('field', e.target.value)} maxLength={50} />
      </Labeled>

      <Labeled label="Membership Type">
        <select className={inputCls} value={fields.membershipType} onChange={(e) => set('membershipType', e.target.value)}>
          {MEMBERSHIP_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Labeled>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Member Number (optional)">
          <input className={inputCls} placeholder="auto-assigned if blank" value={fields.memberNumber} onChange={(e) => set('memberNumber', e.target.value)} maxLength={30} />
        </Labeled>
        <Labeled label="Website / ORCID / Social">
          <input className={inputCls} placeholder="orcid.org/0000-…" value={fields.link} onChange={(e) => set('link', e.target.value)} maxLength={100} />
        </Labeled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Issue Date">
          <input type="date" className={inputCls} value={fields.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
        </Labeled>
        <Labeled label="Expiry Date">
          <input type="date" className={inputCls} value={fields.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
          {errors.expiryDate && <p className="text-[10px] text-red-700 mt-1">{errors.expiryDate}</p>}
        </Labeled>
      </div>

      <Labeled label="Personal Motto / Role">
        <input className={inputCls} placeholder="A short line about you…" value={fields.motto} onChange={(e) => set('motto', e.target.value)} maxLength={90} />
      </Labeled>
    </div>
  );
}

function VerifyView({ code }: { code: string }) {
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('loading');
  const [fields, setFieldsState] = useState<PassportFields | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPassport(code).then((res) => {
      if (cancelled) return;
      if (res.ok && res.record) {
        setFieldsState(res.record.fields);
        setPhotoUrl(res.record.photoUrl);
        setStatus('found');
        QRCode.toDataURL(window.location.href, { margin: 0, width: 200 }).then((d) => !cancelled && setQrDataUrl(d));
      } else {
        setStatus('missing');
      }
    });
    return () => { cancelled = true; };
  }, [code]);

  if (status === 'loading') {
    return <div className="py-24 text-center font-mono text-xs tracking-widest text-[var(--pp-burgundy)]/60">VERIFYING…</div>;
  }
  if (status === 'missing' || !fields) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-2xl text-[var(--pp-burgundy)] mb-3">Not found</p>
        <p className="font-sans text-base text-[var(--pp-ink)]/70 max-w-sm mx-auto">This EPRIS Digital Member Passport is private or does not exist.</p>
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col items-center animate-fade-in-up" style={{ animationDuration: '1s' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp ease-out forwards; }
      `}} />

      {/* The passport as a book: closed cover → opens to the data page. */}
      <PassportBook fields={fields} photoUrl={photoUrl} code={code} qrDataUrl={qrDataUrl} />
    </div>
  );
}

// Gates passport creation/editing behind the same password as the admin
// panel. Sharing an existing published passport is a fictional keepsake and
// stays open to everyone (see VerifyView) — this only guards the form that
// creates or edits one. Shares a localStorage entry with public/admin/app.js,
// so being logged into /admin already unlocks this with no extra prompt.
function PassportAuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'locked'>('checking');
  const [pwInput, setPwInput] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const saved = getSavedAdminPassword();
    if (!saved) { setStatus('locked'); return; }
    verifyAdminPassword(saved).then((valid) => setStatus(valid ? 'ok' : 'locked'));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    const valid = await verifyAdminPassword(pwInput);
    setChecking(false);
    if (valid) {
      if (remember) saveAdminPassword(pwInput);
      setStatus('ok');
    } else {
      setError('Неверный пароль.');
    }
  }, [pwInput, remember]);

  if (status === 'ok') return <>{children}</>;

  return (
    <div className="min-h-screen w-full bg-[var(--pp-cream)] text-[var(--pp-ink)] flex items-center justify-center font-sans px-4" style={{ '--pp-burgundy': '#501a2c', '--pp-ink': '#241016', '--pp-cream': '#f7f2ea', '--pp-sand': '#c9a690' } as CSSProperties}>
      {status === 'checking' ? (
        <p className="font-mono text-xs tracking-widest text-[var(--pp-burgundy)]/60">CHECKING…</p>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white/50 border border-white/60 rounded-xl p-8 shadow-[0_8px_30px_rgba(80,26,44,0.06)]">
          <p className="font-serif text-2xl text-[var(--pp-burgundy)] mb-2">Editorial access required</p>
          <p className="font-sans text-sm text-[var(--pp-ink)]/70 mb-6">
            Creating or editing an EPRIS Digital Member Passport requires the editorial password (same as the admin panel).
          </p>
          <input
            type="password"
            autoFocus
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/70 border border-[var(--pp-burgundy)]/20 rounded-md focus:border-[var(--pp-burgundy)]/60 outline-none px-4 py-2.5 font-serif text-[15px] text-[var(--pp-ink)] mb-3"
          />
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only" />
            <div
              className="w-4 h-4 rounded-sm border transition-all duration-150 flex items-center justify-center"
              style={{ backgroundColor: remember ? 'var(--pp-burgundy)' : 'rgba(255,255,255,0.8)', borderColor: remember ? 'var(--pp-burgundy)' : 'rgba(74,23,40,0.3)' }}
            >
              {remember && <Check size={11} className="text-white" strokeWidth={3.5} />}
            </div>
            <span className="font-sans text-[13px] text-[var(--pp-ink)]/70">Remember on this device</span>
          </label>
          {error && <p className="text-[12px] font-serif text-red-700 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={checking || !pwInput}
            className="w-full bg-[var(--pp-burgundy)] text-white font-mono text-[11px] uppercase tracking-widest px-5 py-3 rounded-lg disabled:opacity-50 transition-opacity"
          >
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      )}
    </div>
  );
}

export function PassportPage({ viewCode, onBack }: { viewCode: string | null; onBack: () => void }) {
  const [fields, setFields] = useState<PassportFields>(emptyFields);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [code, setCode] = useState(() => generatePassportCode());
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pngStatus, setPngStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const isEditing = mode === 'edit';

  // Admin deep link only — never surfaced on the public verification page —
  // that loads the existing record straight into the editor: /passport/CODE?edit=1
  const isAdminEditRequest = useMemo(
    () => Boolean(viewCode) && new URLSearchParams(window.location.search).get('edit') === '1',
    [viewCode],
  );
  const [adminEditStatus, setAdminEditStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!isAdminEditRequest || !viewCode) return;
    let cancelled = false;
    setAdminEditStatus('loading');
    fetchPassport(viewCode).then((res) => {
      if (cancelled) return;
      if (res.ok && res.record) {
        setFields(res.record.fields);
        setPhotoDataUrl(null);
        setExistingPhotoUrl(res.record.photoUrl);
        setCode(viewCode);
        setIsPublic(true);
        setConsent(true);
        setMode('edit');
        setAdminEditStatus('ready');
      } else {
        setAdminEditStatus('error');
      }
    });
    return () => { cancelled = true; };
  }, [isAdminEditRequest, viewCode]);

  const verifyUrl = useMemo(() => `${window.location.origin}/passport/${code}`, [code]);
  const displayMemberNumber = fields.memberNumber || code;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 240, color: { dark: '#241016', light: '#ffffff00' } })
      .then((d) => !cancelled && setQrDataUrl(d));
    return () => { cancelled = true; };
  }, [verifyUrl]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!fields.surname.trim()) e.surname = 'Required';
    if (!fields.givenNames.trim()) e.givenNames = 'Required';
    if (fields.issueDate && fields.expiryDate && fields.expiryDate < fields.issueDate) {
      e.expiryDate = 'Must be after issue date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [fields]);

  const previewFields = useMemo(() => ({ ...fields, memberNumber: displayMemberNumber }), [fields, displayMemberNumber]);
  const effectivePhotoUrl = photoDataUrl || existingPhotoUrl;

  const handleReset = useCallback(() => {
    setFields(emptyFields());
    setPhotoDataUrl(null);
    setExistingPhotoUrl(null);
    setCode(generatePassportCode());
    setIsPublic(false);
    setConsent(false);
    setErrors({});
    setPublishStatus('idle');
    setMode('create');
    if (isAdminEditRequest) window.history.replaceState(null, '', window.location.pathname);
  }, [isAdminEditRequest]);

  const handleDownloadPNG = useCallback(async () => {
    if (!validate()) return;
    setPngStatus('loading');
    try {
      const dataUrl = await renderPassportPNG(previewFields, effectivePhotoUrl, code, verifyUrl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `EPRIS-Passport-${code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setPngStatus('done');
    } catch (err) {
      console.error('PNG export failed:', err);
      setPngStatus('idle');
    }
    setTimeout(() => setPngStatus('idle'), 2500);
  }, [validate, previewFields, effectivePhotoUrl, code, verifyUrl]);

  const handleDownloadPDF = useCallback(async () => {
    if (!validate()) return;
    setPdfStatus('loading');
    try {
      const dataUrl = await renderPassportPNG(previewFields, effectivePhotoUrl, code, verifyUrl);
      const [{ pdf }, { Document, Page, Image }, { createElement }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@react-pdf/renderer'),
        import('react'),
      ]);
      const element = createElement(Document, null,
        createElement(Page, { size: [507, 354] },
          createElement(Image, { src: dataUrl, style: { width: '100%', height: '100%' } })
        )
      );
      const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EPRIS-Passport-${code}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPdfStatus('done');
    } catch (err) {
      console.error('PDF export failed:', err);
      setPdfStatus('idle');
    }
    setTimeout(() => setPdfStatus('idle'), 2500);
  }, [validate, previewFields, effectivePhotoUrl, code, verifyUrl, qrDataUrl]);

  const handlePublish = useCallback(async () => {
    if (!validate() || !consent) return;
    setPublishStatus('loading');
    const res = await publishPassport(code, previewFields, photoDataUrl, isEditing ? { overwrite: true, existingPhotoUrl } : {});
    if (res.ok) {
      if (res.code && res.code !== code) setCode(res.code);
      if (photoDataUrl) setExistingPhotoUrl(photoDataUrl);
      setIsPublic(true);
      setPublishStatus('done');
    } else {
      setPublishStatus('error');
    }
  }, [validate, consent, code, previewFields, photoDataUrl, isEditing, existingPhotoUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch { /* clipboard may be unavailable */ }
  }, [verifyUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'My EPRIS Digital Member Passport', url: verifyUrl }); return; } catch { /* user cancelled */ }
    }
    handleCopyLink();
  }, [verifyUrl, handleCopyLink]);

  if (isAdminEditRequest && adminEditStatus !== 'ready') {
    return (
      <PassportAuthGate>
        <div className="min-h-screen w-full bg-[var(--pp-cream)] text-[var(--pp-ink)] flex items-center justify-center font-sans" style={{ '--pp-burgundy': '#501a2c', '--pp-ink': '#241016', '--pp-cream': '#f7f2ea', '--pp-sand': '#c9a690' } as CSSProperties}>
          {adminEditStatus === 'error' ? (
            <p className="font-serif text-xl text-[var(--pp-burgundy)]">Passport not found.</p>
          ) : (
            <p className="font-mono text-xs tracking-widest text-[var(--pp-burgundy)]/60">LOADING…</p>
          )}
        </div>
      </PassportAuthGate>
    );
  }

  if (viewCode && !isEditing) {
    return (
      <div className="min-h-screen w-full bg-[var(--pp-cream)] text-[var(--pp-ink)] flex flex-col font-sans" style={{ '--pp-burgundy': '#501a2c', '--pp-ink': '#241016', '--pp-cream': '#f7f2ea', '--pp-sand': '#c9a690' } as CSSProperties}>
        <div className="p-4 sm:p-8 w-full max-w-[1240px] mx-auto flex-grow flex flex-col pt-12 sm:pt-20">
          <button onClick={onBack} className="self-start flex items-center justify-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--pp-burgundy)] hover:opacity-70 transition-all duration-300 mb-8 sm:mb-12 py-2">
            <ArrowLeft size={14} /> RETURN TO JOURNAL
          </button>

          <div className="flex-grow flex items-start justify-center pb-24">
            <VerifyView code={viewCode} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PassportAuthGate>
    <div
      className="pt-16 pb-24 px-4 sm:px-8 max-w-7xl mx-auto"
      style={{ '--pp-burgundy': '#501a2c', '--pp-ink': '#241016', '--pp-cream': '#f7f2ea', '--pp-sand': '#c9a690' } as CSSProperties}
    >
      <button onClick={onBack} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--pp-burgundy)] mb-6">
        <ArrowLeft size={14} /> Back to EPRIS Journal
      </button>

      <div className="mb-6 sm:mb-8 text-center lg:text-left">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--pp-burgundy)]">{isEditing ? 'Edit Your EPRIS Digital Member Passport' : 'EPRIS Digital Member Passport'}</h1>
        <p className="font-crimson text-sm sm:text-base text-[var(--pp-ink)]/70 mt-3 max-w-2xl mx-auto lg:mx-0">
          {isEditing
            ? 'Update your published passport below. Changes are saved in place at the same link — nothing is duplicated.'
            : 'Design your own fictional EPRIS Journal membership passport — a cultural keepsake, not an identity document. Personal data and your photo are processed locally in your browser and are never sent anywhere unless you choose to publish a public profile below.'}
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[440px_1fr] gap-8 lg:gap-14">
        <div className="order-1 lg:order-1">
          <CreatorForm fields={fields} setFields={setFields} onPhotoFile={setCropFile} errors={errors} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 mb-6">
            <button
              onClick={handleDownloadPNG}
              disabled={pngStatus === 'loading'}
              className="flex justify-center items-center gap-2 bg-[var(--pp-burgundy)] text-white font-mono text-[11px] uppercase tracking-widest px-5 py-3.5 sm:py-3 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-300 w-full"
            >
              <Download size={15} /> {pngStatus === 'loading' ? 'Rendering…' : pngStatus === 'done' ? 'Downloaded ✓' : 'PNG (high-res)'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfStatus === 'loading'}
              className="flex justify-center items-center gap-2 bg-white/80 border border-[var(--pp-burgundy)]/20 text-[var(--pp-burgundy)] font-mono text-[11px] uppercase tracking-widest px-5 py-3.5 sm:py-3 rounded-lg shadow-sm hover:shadow-md hover:bg-white hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-300 w-full"
            >
              <FileText size={15} /> {pdfStatus === 'loading' ? 'Rendering…' : pdfStatus === 'done' ? 'Downloaded ✓' : 'Print-ready PDF'}
            </button>
            <button
              onClick={handleReset}
              className="col-span-1 sm:col-span-2 flex justify-center items-center gap-2 font-mono text-[11px] uppercase tracking-widest px-4 py-3 rounded-lg text-[var(--pp-ink)]/50 hover:text-[var(--pp-ink)] hover:bg-[var(--pp-ink)]/5 active:scale-95 transition-all duration-300"
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="space-y-4 bg-white/40 p-6 rounded-xl border border-white/60 shadow-[0_4px_20px_rgba(80,26,44,0.03)] backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 font-mono text-[11px] uppercase tracking-widest text-[var(--pp-burgundy)]">
              <Link2 size={14} /> Web Profile
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex items-center justify-center mt-0.5">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="sr-only" />
                <div
                  className="w-5 h-5 rounded border transition-all duration-200"
                  style={{
                    backgroundColor: isPublic ? 'var(--pp-burgundy)' : 'rgba(255,255,255,0.8)',
                    borderColor: isPublic ? 'var(--pp-burgundy)' : 'rgba(74,23,40,0.3)',
                  }}
                />
                <Check size={14} className="absolute text-white transition-opacity duration-200 pointer-events-none" style={{ opacity: isPublic ? 1 : 0 }} strokeWidth={3} />
              </div>
              <span className="font-serif text-[15px] text-[var(--pp-ink)]/80 leading-snug transition-colors">
                Publish as a public member profile (viewable via the verification link/QR). Leave unchecked to keep it private and local-only.
              </span>
            </label>

            {isPublic && (
              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-[var(--pp-burgundy)]/10">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="sr-only" />
                  <div
                    className="w-5 h-5 rounded border transition-all duration-200"
                    style={{
                      backgroundColor: consent ? 'var(--pp-burgundy)' : 'rgba(255,255,255,0.8)',
                      borderColor: consent ? 'var(--pp-burgundy)' : 'rgba(74,23,40,0.3)',
                    }}
                  />
                  <Check size={14} className="absolute text-white transition-opacity duration-200 pointer-events-none" style={{ opacity: consent ? 1 : 0 }} strokeWidth={3} />
                </div>
                <span className="font-serif text-[15px] text-[var(--pp-ink)]/80 leading-snug transition-colors">
                  I consent to my entered details and photo being stored by EPRIS Journal and shown publicly at the verification link above.
                </span>
              </label>
            )}

            {isPublic && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                <button
                  onClick={handlePublish}
                  disabled={!consent || publishStatus === 'loading'}
                  className="w-full flex justify-center items-center gap-2 bg-[var(--pp-ink)] text-[var(--pp-cream)] font-mono text-[11px] uppercase tracking-widest px-5 py-3.5 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-40 disabled:hover:translate-y-0 transition-all duration-300"
                >
                  {publishStatus === 'loading' ? (isEditing ? 'Saving…' : 'Publishing…') : publishStatus === 'done' ? (isEditing ? 'Saved ✓' : 'Published ✓') : (isEditing ? 'Save changes' : 'Publish public profile')}
                </button>
                {publishStatus === 'error' && <p className="text-[12px] font-serif text-red-700 mt-3 text-center">Publishing failed — please try again.</p>}
                
                {publishStatus === 'done' && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 bg-white/60 border border-[var(--pp-burgundy)]/10 rounded-lg">
                    <div className="flex-1 font-mono text-[11px] tracking-wider text-[var(--pp-ink)] truncate max-w-[200px] sm:max-w-[250px]">
                      {verifyUrl}
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleCopyLink} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--pp-burgundy)] bg-[var(--pp-burgundy)]/5 hover:bg-[var(--pp-burgundy)]/10 px-3 py-1.5 rounded transition-colors">
                        {copyStatus === 'copied' ? <Check size={13} /> : <Link2 size={13} />} {copyStatus === 'copied' ? 'Copied' : 'Copy'}
                      </button>
                      <button onClick={handleShare} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--pp-burgundy)] bg-[var(--pp-burgundy)]/5 hover:bg-[var(--pp-burgundy)]/10 px-3 py-1.5 rounded transition-colors">
                        <Share2 size={13} /> Share
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        <div className="order-2 lg:order-2 lg:sticky lg:top-20 h-fit">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <PassportPreview fields={previewFields} photoUrl={effectivePhotoUrl} code={code} qrDataUrl={qrDataUrl} />
          </motion.div>
          <p className="font-mono text-[9px] text-[var(--pp-ink)]/45 mt-3 leading-relaxed">
            This is a fictional cultural membership item created for EPRIS Journal. It is not a passport, visa, ID card or any government-issued document, and cannot be used as one.
          </p>
        </div>
      </div>

      {cropFile && (
        <PhotoCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(dataUrl) => { setPhotoDataUrl(dataUrl); setCropFile(null); }}
        />
      )}
    </div>
    </PassportAuthGate>
  );
}
