import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Download, FileText, Share2, Link2, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { PhotoCropper } from './PhotoCropper';
import { PassportPreview } from './PassportPreview';
import { generatePassportCode } from '../../lib/passportCode';
import { renderPassportPNG, type PassportFields } from './passportRender';
import { publishPassport, fetchPassport } from './passportApi';

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
  };
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--pp-burgundy)]/70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full bg-white border border-[var(--pp-burgundy)]/25 focus:border-[var(--pp-burgundy)] outline-none px-3 py-2 font-crimson text-sm text-[var(--pp-ink)] transition-colors';

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
    <div className="space-y-4">
      <Labeled label="Portrait Photo">
        <label className="flex items-center gap-2 border border-dashed border-[var(--pp-burgundy)]/40 px-3 py-3 cursor-pointer hover:bg-[var(--pp-burgundy)]/5 transition-colors">
          <Upload size={16} className="text-[var(--pp-burgundy)]" />
          <span className="font-mono text-[11px] text-[var(--pp-burgundy)]">Upload &amp; crop photo</span>
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
        <Labeled label="Professional Field">
          <input className={inputCls} placeholder="Architecture, Editorial…" value={fields.field} onChange={(e) => set('field', e.target.value)} maxLength={50} />
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
        <p className="font-serif text-xl text-[var(--pp-burgundy)] mb-2">Not found</p>
        <p className="font-crimson text-sm text-[var(--pp-ink)]/70">This EPRIS Digital Member Passport is private or does not exist.</p>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4 font-mono text-[11px] tracking-widest text-green-800">
        <ShieldCheck size={16} /> VERIFIED · PUBLIC MEMBER PROFILE
      </div>
      <PassportPreview fields={fields} photoUrl={photoUrl} code={code} qrDataUrl={qrDataUrl} />
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

  const handleReset = useCallback(() => {
    setFields(emptyFields());
    setPhotoDataUrl(null);
    setCode(generatePassportCode());
    setIsPublic(false);
    setConsent(false);
    setErrors({});
    setPublishStatus('idle');
  }, []);

  const handleDownloadPNG = useCallback(async () => {
    if (!validate()) return;
    setPngStatus('loading');
    try {
      const dataUrl = await renderPassportPNG(previewFields, photoDataUrl, code, verifyUrl);
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
  }, [validate, previewFields, photoDataUrl, code, verifyUrl]);

  const handleDownloadPDF = useCallback(async () => {
    if (!validate()) return;
    setPdfStatus('loading');
    try {
      const [{ pdf }, { PassportCardPDF }, { createElement }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./PassportCardPDF'),
        import('react'),
      ]);
      const baseUrl = window.location.origin;
      const qr = qrDataUrl || await QRCode.toDataURL(verifyUrl, { margin: 0, width: 240 });
      const element = createElement(PassportCardPDF, { fields: previewFields, photoDataUrl, code, qrDataUrl: qr, baseUrl });
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
  }, [validate, previewFields, photoDataUrl, code, verifyUrl, qrDataUrl]);

  const handlePublish = useCallback(async () => {
    if (!validate() || !consent) return;
    setPublishStatus('loading');
    const res = await publishPassport(code, previewFields, photoDataUrl);
    if (res.ok) {
      if (res.code && res.code !== code) setCode(res.code);
      setIsPublic(true);
      setPublishStatus('done');
    } else {
      setPublishStatus('error');
    }
  }, [validate, consent, code, previewFields, photoDataUrl]);

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

  if (viewCode) {
    return (
      <div className="pt-16 pb-24 px-4 sm:px-8 max-w-6xl mx-auto" style={{ '--pp-burgundy': '#501a2c', '--pp-ink': '#241016' } as CSSProperties}>
        <button onClick={onBack} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--pp-burgundy)] mb-8">
          <ArrowLeft size={14} /> Back to EPRIS Journal
        </button>
        <VerifyView code={viewCode} />
      </div>
    );
  }

  return (
    <div
      className="pt-16 pb-24 px-4 sm:px-8 max-w-7xl mx-auto"
      style={{ '--pp-burgundy': '#501a2c', '--pp-ink': '#241016', '--pp-cream': '#f7f2ea', '--pp-sand': '#c9a690' } as CSSProperties}
    >
      <button onClick={onBack} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--pp-burgundy)] mb-6">
        <ArrowLeft size={14} /> Back to EPRIS Journal
      </button>

      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-[var(--pp-burgundy)]">EPRIS Digital Member Passport</h1>
        <p className="font-crimson text-sm text-[var(--pp-ink)]/70 mt-2 max-w-2xl">
          Design your own fictional EPRIS Journal membership passport — a cultural keepsake, not an identity document.
          Personal data and your photo are processed locally in your browser and are never sent anywhere unless you choose to publish a public profile below.
        </p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-8 lg:gap-12">
        <div>
          <CreatorForm fields={fields} setFields={setFields} onPhotoFile={setCropFile} errors={errors} />

          <label className="flex items-start gap-2 mt-6 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1 accent-[var(--pp-burgundy)]" />
            <span className="font-crimson text-sm text-[var(--pp-ink)]">
              Publish as a public member profile (viewable via the verification link/QR). Leave unchecked to keep it private and local-only.
            </span>
          </label>

          {isPublic && (
            <label className="flex items-start gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[var(--pp-burgundy)]" />
              <span className="font-crimson text-sm text-[var(--pp-ink)]">
                I consent to my entered details and photo being stored by EPRIS Journal and shown publicly at the verification link above.
              </span>
            </label>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleDownloadPNG}
              disabled={pngStatus === 'loading'}
              className="flex items-center gap-2 bg-[var(--pp-burgundy)] text-[var(--pp-cream)] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 hover:opacity-90 disabled:opacity-50"
            >
              <Download size={14} /> {pngStatus === 'loading' ? 'Rendering…' : pngStatus === 'done' ? 'Downloaded ✓' : 'PNG (high-res)'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfStatus === 'loading'}
              className="flex items-center gap-2 border border-[var(--pp-burgundy)] text-[var(--pp-burgundy)] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 hover:bg-[var(--pp-burgundy)]/5 disabled:opacity-50"
            >
              <FileText size={14} /> {pdfStatus === 'loading' ? 'Rendering…' : pdfStatus === 'done' ? 'Downloaded ✓' : 'Print-ready PDF'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 text-[var(--pp-ink)]/60 hover:text-[var(--pp-ink)]"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {isPublic && (
            <div className="mt-4">
              <button
                onClick={handlePublish}
                disabled={!consent || publishStatus === 'loading'}
                className="flex items-center gap-2 bg-[var(--pp-ink)] text-[var(--pp-cream)] font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 disabled:opacity-40"
              >
                {publishStatus === 'loading' ? 'Publishing…' : publishStatus === 'done' ? 'Published ✓' : 'Publish public profile'}
              </button>
              {publishStatus === 'error' && <p className="text-[11px] text-red-700 mt-2">Publishing failed — please try again.</p>}
              {publishStatus === 'done' && (
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <button onClick={handleCopyLink} className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--pp-burgundy)]">
                    {copyStatus === 'copied' ? <Check size={13} /> : <Link2 size={13} />} {verifyUrl}
                  </button>
                  <button onClick={handleShare} className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--pp-burgundy)]">
                    <Share2 size={13} /> Share
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-20 h-fit">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <PassportPreview fields={previewFields} photoUrl={photoDataUrl} code={code} qrDataUrl={qrDataUrl} />
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
  );
}
