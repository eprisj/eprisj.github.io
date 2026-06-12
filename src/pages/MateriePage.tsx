import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, Loader2, ArrowLeft, Scan, Home, Layers, Activity, Zap,
  ChevronRight, AlertCircle, Maximize, Box, Sun, Wind, Thermometer,
  Waves, Check, ArrowRight, BookOpen, Star, Aperture,
} from 'lucide-react';
import { analyzeImage, analyzeImageText } from '../lib/openrouter';

// ─── Shared types ──────────────────────────────────────────────────────────

type T = (key: string) => string;
type Tool = null | 'lab' | 'studio' | 'chronicle';

interface UploadState {
  src: string;
  base64: string;
  mimeType: string;
}

// ─── Lab types ─────────────────────────────────────────────────────────────

interface LabNode {
  id: number;
  title: string;
  type: string;
  status: string;
  box_2d: [number, number, number, number];
  description: string;
  forensics: {
    composition: string;
    durability: string;
    context: string;
    integrity_score: number;
    material_origin: string;
    year_estimate: string;
  };
}

interface LabReport {
  title: string;
  style: string;
  era: string;
  materials: { name: string; value: number }[];
  nodes: LabNode[];
  summary: string;
}

type VisualMode = 'rgb' | 'thermal' | 'xray' | 'edge';

const VISUAL_FILTERS: Record<VisualMode, string> = {
  rgb: 'none',
  thermal: 'hue-rotate(30deg) saturate(3) brightness(1.2)',
  xray: 'invert(1) grayscale(1) contrast(2)',
  edge: 'grayscale(1) contrast(5) brightness(0.9)',
};

// ─── Studio types ──────────────────────────────────────────────────────────

interface StudioElement {
  name: string;
  category: string;
  box_2d: [number, number, number, number];
}

interface StudioReport {
  description: string;
  tags: string[];
  palette: { name: string; hex: string }[];
  metrics: { light: number; acoustics: number; warmth: number; air: number };
  elements: StudioElement[];
  critique: { strengths: string[]; opportunities: string[] };
  lighting: { sources: string[]; mood: string; suggestion: string };
}

type StudioTab = 'dna' | 'palette' | 'metrics' | 'critique';

// ─── CHRONICLE types ───────────────────────────────────────────────────────

interface ChronicleReport {
  headline: string;
  subheadline: string;
  narrative: string;
  caption: string;
  emotion: string;
  secondary_emotions: string[];
  tension: string;
  light_quality: string;
  composition: string;
  era: string;
  human_presence: 'direct' | 'implied' | 'absent';
  tags: string[];
  editorial_score: number;
}

// ─── Status / category colors ──────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  Intact: '#4A7C59',
  Weathered: '#B8860B',
  Damaged: '#8B3A3A',
  Unknown: '#888888',
};
function statusColor(s: string) { return STATUS_COLOR[s] ?? STATUS_COLOR.Unknown; }

const CATEGORY_COLOR: Record<string, string> = {
  Furniture: '#501a2c',
  Lighting: '#B8860B',
  Decor: '#4A7C59',
  Structure: '#4A5568',
};

const SCORE_COLOR = (v: number) => v >= 75 ? '#4A7C59' : v >= 50 ? '#B8860B' : '#8B3A3A';
const PRESENCE_LABEL: Record<string, string> = { direct: 'Human presence', implied: 'Implied presence', absent: 'No human presence' };

// ─── Shared helpers ────────────────────────────────────────────────────────

function UploadZone({ onFile, label }: { onFile: (s: UploadState) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target!.result as string;
      const [meta, base64] = dataUrl.split(',');
      const mimeType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      onFile({ src: dataUrl, base64, mimeType });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) handle(f);
  }, []);

  return (
    <div
      className="border border-dashed border-[#501a2c]/30 flex flex-col items-center justify-center gap-4 py-20 cursor-pointer hover:border-[#501a2c] hover:bg-[#E8DED5]/40 transition-all group"
      onClick={() => ref.current?.click()}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="w-12 h-12 border border-[#501a2c]/20 group-hover:border-[#501a2c] flex items-center justify-center transition-colors">
        <Upload size={20} className="text-[#501a2c]/40 group-hover:text-[#501a2c] transition-colors" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/50">{label}</p>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/25">JPG · PNG · WEBP</p>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
    </div>
  );
}

function BackBtn({ onClick, t }: { onClick: () => void; t: T }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 hover:text-[#501a2c] transition-colors mb-8">
      <ArrowLeft size={14} /> {t('materie.back')}
    </button>
  );
}

function ToolHeader({ kicker, title, tagline }: { kicker: string; title: string; tagline: string }) {
  return (
    <div className="mb-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-1">{kicker}</p>
      <h1 className="font-mono text-3xl sm:text-5xl tracking-[0.1em] text-[#501a2c]">{title}</h1>
      <p className="font-mono text-xs text-[#501a2c]/50 mt-2 uppercase tracking-widest">{tagline}</p>
    </div>
  );
}

/** Animated scanline overlay shown while AI is processing */
function ScanOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-[#F5F0EB]/10 overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #501a2c 40%, #C9A690 50%, #501a2c 60%, transparent 100%)' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[#F5F0EB] border border-[#501a2c] px-6 py-4 flex items-center gap-3 shadow-sm">
          <Loader2 size={15} className="animate-spin text-[#501a2c]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]">{label}</span>
        </div>
      </div>
    </div>
  );
}

/** Circular SVG integrity gauge */
function IntegrityGauge({ value }: { value: number }) {
  const color = value >= 75 ? '#4A7C59' : value >= 40 ? '#B8860B' : '#8B3A3A';
  const r = 16;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#501a2c" strokeWidth="2" strokeOpacity="0.1" />
          <motion.circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - value / 100) }}
            transition={{ duration: 0.9, ease: 'easeOut' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-[#501a2c]">{value}</span>
      </div>
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35">Integrity</p>
        <p className="font-mono text-[10px] font-bold" style={{ color }}>
          {value >= 75 ? 'Good' : value >= 40 ? 'Fair' : 'Poor'}
        </p>
      </div>
    </div>
  );
}

// ─── MATTER LAB ────────────────────────────────────────────────────────────

const LAB_PROMPT = `
Role: Expert Architectural Forensic Analyst.
Analyze the image. Identify 4-6 specific architectural/material elements.
Return JSON:
{
  "title": "short scene title",
  "style": "architectural style",
  "era": "estimated era",
  "summary": "2-sentence analysis",
  "materials": [{"name":"Material","value":0-100}],
  "nodes": [{
    "id": 1,
    "title": "Element Name",
    "type": "Structural|Surface|Detail|Fixture",
    "status": "Intact|Weathered|Damaged|Unknown",
    "box_2d": [ymin,xmin,ymax,xmax],
    "description": "one sentence",
    "forensics": {
      "composition": "material composition",
      "durability": "durability estimate",
      "context": "contextual note",
      "integrity_score": 0-100,
      "material_origin": "local/imported/synthetic",
      "year_estimate": "estimated year range"
    }
  }]
}
Coordinates are 0-100 normalized, [ymin,xmin,ymax,xmax].
`;

function LabTool({ onBack, t }: { onBack: () => void; t: T }) {
  const [upload, setUpload]             = useState<UploadState | null>(null);
  const [scanning, setScanning]         = useState(false);
  const [report, setReport]             = useState<LabReport | null>(null);
  const [activeNode, setActiveNode]     = useState<number | null>(null);
  const [visualMode, setVisualMode]     = useState<VisualMode>('rgb');
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [fullscreen, setFullscreen]     = useState(false);

  const handleUpload = async (state: UploadState) => {
    setUpload(state); setReport(null); setActiveNode(null);
    setDeepAnalysis(null); setError(null); setScanning(true);
    try {
      const result = await analyzeImage<LabReport>(state.base64, state.mimeType, LAB_PROMPT);
      setReport(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg.includes('Rate') ? 'Rate limited — please wait a moment and try again.' : `Analysis failed: ${msg}`);
    } finally { setScanning(false); }
  };

  const handleDeepAnalysis = async (kind: 'restoration' | 'risk') => {
    if (activeNode === null || !report || !upload) return;
    const node = report.nodes[activeNode];
    setDeepLoading(true); setDeepAnalysis(null);
    const prompt = kind === 'restoration'
      ? `You are a conservation specialist. Based on this element: "${node.title}" (${node.forensics.composition}), integrity score ${node.forensics.integrity_score}/100. Provide a technical restoration protocol in 3-4 bullet points.`
      : `You are a structural engineer. Element: "${node.title}" (${node.forensics.composition}), integrity ${node.forensics.integrity_score}/100. List 3 failure risks and mitigation steps.`;
    try {
      const result = await analyzeImageText(upload.base64, upload.mimeType, prompt);
      setDeepAnalysis(result);
    } catch { setDeepAnalysis('Analysis failed.'); }
    finally { setDeepLoading(false); }
  };

  const activeNodeData = activeNode !== null ? report?.nodes[activeNode] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#F5F0EB] px-4 sm:px-8 md:px-16 py-8">
      <BackBtn onClick={onBack} t={t} />
      <ToolHeader kicker="EPRIS / MATERIE" title="MATTER LAB" tagline={t('materie.lab.tagline')} />

      {!upload && <div className="max-w-2xl"><UploadZone onFile={handleUpload} label={t('materie.lab.upload')} /></div>}

      {upload && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="md:col-span-1 lg:col-span-2 space-y-4">
            {/* Visual mode bar */}
            <div className="flex gap-0 border border-[#501a2c] overflow-hidden">
              {(['rgb', 'thermal', 'xray', 'edge'] as VisualMode[]).map(m => (
                <button key={m} type="button" onClick={() => setVisualMode(m)}
                  className={`flex-1 py-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest transition-colors ${visualMode === m ? 'bg-[#501a2c] text-[#F5F0EB]' : 'text-[#501a2c] hover:bg-[#E8DED5]'}`}>
                  {m}
                </button>
              ))}
              <button type="button" onClick={() => setFullscreen(!fullscreen)}
                className="px-3 text-[#501a2c] hover:bg-[#E8DED5] transition-colors border-l border-[#501a2c] shrink-0">
                <Maximize size={14} />
              </button>
            </div>

            {/* Image + bounding boxes */}
            <div className={`relative bg-[#E8DED5] overflow-hidden ${fullscreen ? 'fixed inset-4 z-50' : ''}`}>
              {fullscreen && (
                <button type="button" onClick={() => setFullscreen(false)}
                  className="absolute top-3 right-3 z-10 bg-[#501a2c] text-[#F5F0EB] p-1">
                  <X size={16} />
                </button>
              )}
              <img src={upload.src} alt="Analysis target" className="w-full object-contain"
                style={{ filter: VISUAL_FILTERS[visualMode] }} />
              {scanning && <ScanOverlay label={t('materie.scanning')} />}
              {report?.nodes.map((node, i) => (
                <motion.button key={node.id} type="button"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => { setActiveNode(i); setDeepAnalysis(null); }}
                  className="absolute group"
                  style={{
                    top: `${node.box_2d[0]}%`, left: `${node.box_2d[1]}%`,
                    width: `${node.box_2d[3] - node.box_2d[1]}%`,
                    height: `${node.box_2d[2] - node.box_2d[0]}%`,
                    border: `1.5px solid ${activeNode === i ? '#C9A690' : statusColor(node.status)}`,
                    background: activeNode === i ? 'rgba(201,166,144,0.12)' : 'rgba(80,26,44,0.03)',
                  }}>
                  <span className="absolute -top-px -left-px font-mono text-[8px] px-1.5 py-0.5 leading-none text-[#F5F0EB]"
                    style={{ backgroundColor: activeNode === i ? '#C9A690' : statusColor(node.status) }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="absolute bottom-0 left-0 right-0 bg-[#501a2c]/80 text-[#F5F0EB] font-mono text-[8px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                    {node.title}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Material composition */}
            {report?.materials && report.materials.length > 0 && (
              <div className="border border-[#501a2c]/20 p-4 space-y-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40">Material Composition</p>
                {report.materials.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#501a2c]/70 uppercase tracking-wider">{m.name}</span>
                      <span className="font-mono text-[10px] text-[#501a2c]/50">{m.value}%</span>
                    </div>
                    <div className="h-px bg-[#501a2c]/10">
                      <motion.div className="h-px bg-[#501a2c]"
                        initial={{ width: 0 }}
                        animate={{ width: `${m.value}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="button"
              onClick={() => { setUpload(null); setReport(null); setActiveNode(null); }}
              className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] transition-colors flex items-center gap-2">
              <Upload size={12} /> {t('materie.newimage')}
            </button>
          </div>

          {/* Report panel */}
          <div className="space-y-0 border border-[#501a2c]">
            <div className="bg-[#501a2c] text-[#F5F0EB] p-4">
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-1">
                {report ? `${report.style} · ${report.era}` : 'Awaiting scan'}
              </div>
              <div className="font-mono text-sm tracking-wider">{report?.title ?? 'MATTER LAB REPORT'}</div>
            </div>
            {error && (
              <div className="p-4 flex items-start gap-3 border-b border-[#501a2c]/20">
                <AlertCircle size={14} className="text-[#501a2c] mt-0.5 shrink-0" />
                <p className="font-mono text-xs text-[#501a2c]">{error}</p>
              </div>
            )}
            {report && (
              <>
                <div className="divide-y divide-[#501a2c]/10">
                  {report.nodes.map((node, i) => (
                    <button key={node.id} type="button"
                      onClick={() => { setActiveNode(i); setDeepAnalysis(null); }}
                      className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${activeNode === i ? 'bg-[#E8DED5]' : 'hover:bg-[#F5F0EB]'}`}>
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor(node.status) }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs uppercase tracking-wider text-[#501a2c] truncate">{node.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[9px] text-[#501a2c]/40 uppercase">{node.type}</span>
                          <span className="font-mono text-[9px] uppercase font-medium" style={{ color: statusColor(node.status) }}>{node.status}</span>
                        </div>
                        <div className="mt-1.5 h-px bg-[#501a2c]/10">
                          <div className="h-px" style={{ width: `${node.forensics.integrity_score}%`, backgroundColor: statusColor(node.status) }} />
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#501a2c]/30 mt-0.5 shrink-0">{node.forensics.integrity_score}</span>
                    </button>
                  ))}
                </div>
                <div className="p-4 border-t border-[#501a2c]/20 bg-[#F5F0EB]">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Summary</p>
                  <p className="font-serif text-sm text-[#501a2c]/80 leading-relaxed">{report.summary}</p>
                </div>
              </>
            )}
            {activeNodeData && (
              <div className="border-t border-[#501a2c] bg-[#E8DED5] p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-1">Forensic Detail</div>
                    <div className="font-mono text-sm uppercase text-[#501a2c]">{activeNodeData.title}</div>
                    <p className="font-serif text-xs text-[#501a2c]/70 mt-1 leading-relaxed">{activeNodeData.description}</p>
                  </div>
                  <IntegrityGauge value={activeNodeData.forensics.integrity_score} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-[#501a2c]/15">
                  {[
                    ['Composition', activeNodeData.forensics.composition],
                    ['Origin', activeNodeData.forensics.material_origin],
                    ['Year Est.', activeNodeData.forensics.year_estimate],
                    ['Durability', activeNodeData.forensics.durability],
                  ].map(([k, v]) => (
                    <div key={k} className="font-mono text-[10px]">
                      <div className="text-[#501a2c]/35 uppercase mb-0.5">{k}</div>
                      <div className="text-[#501a2c] leading-snug">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  {(['restoration', 'risk'] as const).map(kind => (
                    <button key={kind} type="button"
                      onClick={() => handleDeepAnalysis(kind)}
                      disabled={deepLoading}
                      className="flex-1 py-2.5 border border-[#501a2c] font-mono text-[9px] uppercase tracking-wider text-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {deepLoading ? <Loader2 size={11} className="animate-spin" /> : null}
                      {kind === 'restoration' ? 'Restoration' : 'Risk Analysis'}
                    </button>
                  ))}
                </div>
                {deepAnalysis && (
                  <div className="bg-[#F5F0EB] border border-[#501a2c]/20 p-4">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-3">Analysis Result</p>
                    <div className="space-y-2">
                      {deepAnalysis.split('\n').filter(Boolean).map((line, i) => (
                        <p key={i} className="font-serif text-xs text-[#501a2c]/80 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── INTERIOR STUDIO ───────────────────────────────────────────────────────

const STUDIO_PROMPT = `
Analyze this interior image as a senior design consultant.
Return JSON:
{
  "description": "2-sentence architectural description",
  "tags": ["STYLE_TAG_1","STYLE_TAG_2","STYLE_TAG_3"],
  "palette": [{"name":"Material/Color name","hex":"#xxxxxx"},{"name":"...","hex":"..."},{"name":"...","hex":"..."},{"name":"...","hex":"..."}],
  "metrics": {"light":0-100,"acoustics":0-100,"warmth":0-100,"air":0-100},
  "elements": [{"name":"Element","category":"Furniture|Lighting|Decor|Structure","box_2d":[ymin,xmin,ymax,xmax]}],
  "critique": {"strengths":["point 1","point 2"],"opportunities":["suggestion 1","suggestion 2"]},
  "lighting": {"sources":["Natural","Spotlight"],"mood":"Serene","suggestion":"improvement tip"}
}
Coordinates 0-100 normalized, [ymin,xmin,ymax,xmax]. Return ONLY JSON.
`;

function MetricRow({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  const color = value >= 70 ? '#4A7C59' : value >= 40 ? '#B8860B' : '#8B3A3A';
  return (
    <div className="flex items-center gap-4">
      <div className="text-[#501a2c]/35 shrink-0 w-5 flex justify-center">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/50">{label}</span>
          <span className="font-mono text-xl leading-none font-light" style={{ color }}>{value}</span>
        </div>
        <div className="h-px bg-[#501a2c]/10">
          <motion.div className="h-px" style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }} />
        </div>
      </div>
    </div>
  );
}

function StudioTool({ onBack, t }: { onBack: () => void; t: T }) {
  const [upload, setUpload]                 = useState<UploadState | null>(null);
  const [analyzing, setAnalyzing]           = useState(false);
  const [report, setReport]                 = useState<StudioReport | null>(null);
  const [activeTab, setActiveTab]           = useState<StudioTab>('dna');
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  const handleUpload = async (state: UploadState) => {
    setUpload(state); setReport(null); setError(null); setAnalyzing(true);
    try {
      const result = await analyzeImage<StudioReport>(state.base64, state.mimeType, STUDIO_PROMPT);
      setReport(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg.includes('Rate') ? 'Rate limited — please wait a moment and try again.' : `Analysis failed: ${msg}`);
    } finally { setAnalyzing(false); }
  };

  const TABS: { id: StudioTab; label: string }[] = [
    { id: 'dna',     label: 'DNA' },
    { id: 'palette', label: 'Palette' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'critique',label: 'Critique' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#F5F0EB] px-4 sm:px-8 md:px-16 py-8">
      <BackBtn onClick={onBack} t={t} />
      <ToolHeader kicker="EPRIS / MATERIE" title="INTERIOR STUDIO" tagline={t('materie.studio.tagline')} />

      {!upload && <div className="max-w-2xl"><UploadZone onFile={handleUpload} label={t('materie.studio.upload')} /></div>}

      {upload && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <div className="space-y-4">
            <div className="relative bg-[#E8DED5] overflow-hidden">
              <img src={upload.src} alt="Interior" className="w-full object-contain" />
              {report?.elements.map((el, i) => (
                <div key={i} className="absolute transition-all cursor-pointer group"
                  style={{
                    top: `${el.box_2d[0]}%`, left: `${el.box_2d[1]}%`,
                    width: `${el.box_2d[3] - el.box_2d[1]}%`,
                    height: `${el.box_2d[2] - el.box_2d[0]}%`,
                    border: `1.5px solid ${hoveredElement === i ? '#C9A690' : CATEGORY_COLOR[el.category] || '#501a2c'}`,
                    background: hoveredElement === i ? 'rgba(201,166,144,0.12)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredElement(i)}
                  onMouseLeave={() => setHoveredElement(null)}>
                  {hoveredElement === i && (
                    <span className="absolute top-0 left-0 font-mono text-[8px] px-1.5 py-0.5 text-[#F5F0EB] whitespace-nowrap"
                      style={{ backgroundColor: CATEGORY_COLOR[el.category] || '#501a2c' }}>
                      {el.name}
                    </span>
                  )}
                </div>
              ))}
              {analyzing && <ScanOverlay label={t('materie.analyzing')} />}
            </div>
            {report && (
              <div className="flex flex-wrap gap-2">
                {report.tags.map(tag => (
                  <span key={tag} className="border border-[#501a2c] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { setUpload(null); setReport(null); }}
              className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] transition-colors flex items-center gap-2">
              <Upload size={12} /> {t('materie.newimage')}
            </button>
          </div>

          <div className="border border-[#501a2c]">
            <div className="grid grid-cols-4 border-b border-[#501a2c]">
              {TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={`py-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${activeTab === tab.id ? 'bg-[#501a2c] text-[#F5F0EB]' : 'text-[#501a2c] hover:bg-[#E8DED5]'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-6 min-h-[320px]">
              {error && (
                <div className="flex items-start gap-3">
                  <AlertCircle size={14} className="text-[#501a2c] mt-0.5 shrink-0" />
                  <p className="font-mono text-xs text-[#501a2c]">{error}</p>
                </div>
              )}
              {!report && !error && (
                <div className="flex items-center justify-center h-full py-16">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30">
                    {analyzing ? 'Processing...' : 'Upload image to begin'}
                  </p>
                </div>
              )}
              {report && activeTab === 'dna' && (
                <div className="space-y-5">
                  <p className="font-serif text-sm text-[#501a2c]/80 leading-relaxed">{report.description}</p>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Detected Elements</p>
                    <div className="divide-y divide-[#501a2c]/10">
                      {report.elements.map((el, i) => (
                        <div key={i} className="py-2 flex justify-between items-center cursor-default transition-opacity"
                          style={{ opacity: hoveredElement !== null && hoveredElement !== i ? 0.35 : 1 }}
                          onMouseEnter={() => setHoveredElement(i)}
                          onMouseLeave={() => setHoveredElement(null)}>
                          <span className="font-mono text-xs text-[#501a2c]">{el.name}</span>
                          <span className="font-mono text-[9px] uppercase pl-3"
                            style={{ color: CATEGORY_COLOR[el.category] || '#501a2c', borderLeft: `2px solid ${CATEGORY_COLOR[el.category] || '#501a2c'}` }}>
                            {el.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#501a2c]/10">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-1">Lighting</p>
                    <p className="font-mono text-xs text-[#501a2c] mb-1">{report.lighting.mood} — {report.lighting.sources.join(', ')}</p>
                    <p className="font-serif text-xs text-[#501a2c]/60 italic">{report.lighting.suggestion}</p>
                  </div>
                </div>
              )}
              {report && activeTab === 'palette' && (
                <div className="space-y-4">
                  <div className="h-5 flex overflow-hidden border border-[#501a2c]/10">
                    {report.palette.map((item, i) => (
                      <div key={i} style={{ backgroundColor: item.hex, flex: 1 }} title={item.name} />
                    ))}
                  </div>
                  {report.palette.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-10 shrink-0 border border-[#501a2c]/10" style={{ backgroundColor: item.hex }} />
                      <div>
                        <div className="font-mono text-xs uppercase tracking-wider text-[#501a2c]">{item.name}</div>
                        <div className="font-mono text-[10px] text-[#501a2c]/40">{item.hex}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {report && activeTab === 'metrics' && (
                <div className="space-y-6">
                  <MetricRow label="Natural Light"  value={report.metrics.light}     icon={<Sun size={14} />} />
                  <MetricRow label="Acoustics"       value={report.metrics.acoustics}  icon={<Waves size={14} />} />
                  <MetricRow label="Warmth"          value={report.metrics.warmth}     icon={<Thermometer size={14} />} />
                  <MetricRow label="Air Quality"     value={report.metrics.air}        icon={<Wind size={14} />} />
                </div>
              )}
              {report && activeTab === 'critique' && (
                <div className="space-y-5">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-3">Strengths</p>
                    <ul className="space-y-2.5">
                      {report.critique.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-[#4A7C59]/12 border border-[#4A7C59]/30 flex items-center justify-center shrink-0">
                            <Check size={9} className="text-[#4A7C59]" />
                          </span>
                          <span className="font-serif text-sm text-[#501a2c]/70 leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-[#501a2c]/10">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 mb-3">Opportunities</p>
                    <ul className="space-y-2.5">
                      {report.critique.opportunities.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-[#C9A690]/15 border border-[#C9A690]/40 flex items-center justify-center shrink-0">
                            <ArrowRight size={9} className="text-[#C9A690]" />
                          </span>
                          <span className="font-serif text-sm text-[#501a2c]/70 leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── CHRONICLE ─────────────────────────────────────────────────────────────

const CHRONICLE_PROMPT = `
You are a senior photo editor and documentary critic at a prestigious international magazine.
Analyze this photograph with the eye of a seasoned photojournalist and cultural critic.
This could be any image — people, landscape, event, still life, architecture, abstract, art.
Return ONLY this JSON (no markdown, no explanation):
{
  "headline": "a sharp, publishable editorial headline (6-10 words, no quotes around it)",
  "subheadline": "a secondary line adding context or irony (8-14 words)",
  "narrative": "a serious 3-4 sentence editorial paragraph reading this photograph — its story, context, and significance, written in the voice of a magazine journalist",
  "caption": "a ready-to-publish photo caption (15-25 words) as it would appear under the image in a printed magazine",
  "emotion": "the single dominant emotion this photograph communicates (one word, e.g. Grief, Defiance, Wonder, Solitude)",
  "secondary_emotions": ["second emotion", "third emotion"],
  "tension": "what creates visual or narrative tension in this frame (one sentence)",
  "light_quality": "describe the light quality and its effect on meaning (one evocative phrase)",
  "composition": "key compositional technique at work (e.g. Rule of thirds, Leading lines, Frame within frame)",
  "era": "estimated time period this image feels tied to (e.g. Present day, Early 2000s, Mid-century, Timeless)",
  "human_presence": "direct|implied|absent",
  "tags": ["EDITORIAL_TAG_1", "EDITORIAL_TAG_2", "EDITORIAL_TAG_3"],
  "editorial_score": a number 0-100 representing editorial publishability and visual impact
}
`;

function ChronicleTool({ onBack, t }: { onBack: () => void; t: T }) {
  const [upload, setUpload]   = useState<UploadState | null>(null);
  const [reading, setReading] = useState(false);
  const [report, setReport]   = useState<ChronicleReport | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handleUpload = async (state: UploadState) => {
    setUpload(state); setReport(null); setError(null); setReading(true);
    try {
      const result = await analyzeImage<ChronicleReport>(state.base64, state.mimeType, CHRONICLE_PROMPT);
      setReport(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg.includes('Rate') ? 'Rate limited — please wait a moment and try again.' : `Analysis failed: ${msg}`);
    } finally { setReading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#F5F0EB] px-4 sm:px-8 md:px-16 py-8">
      <BackBtn onClick={onBack} t={t} />
      <ToolHeader kicker="EPRIS / MATERIE" title="CHRONICLE" tagline={t('materie.chronicle.tagline')} />

      {!upload && <div className="max-w-2xl"><UploadZone onFile={handleUpload} label={t('materie.chronicle.upload')} /></div>}

      {upload && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-5xl">

          {/* ── Left: image + caption strip ── */}
          <div className="flex flex-col">
            <div className="relative bg-[#1a1008] overflow-hidden">
              <img src={upload.src} alt="Chronicle subject"
                className="w-full object-contain max-h-[75vh]" />
              {reading && <ScanOverlay label="Reading photograph..." />}

              {report && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-12 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {report.secondary_emotions.map(e => (
                      <span key={e} className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">{e}</span>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C9A690]/70 mb-1">{report.emotion}</p>
                </motion.div>
              )}
            </div>

            {/* Caption bar */}
            {report && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="bg-[#1a1008] px-5 py-4 border-t border-white/10">
                <p className="font-serif text-xs text-white/60 italic leading-relaxed">{report.caption}</p>
              </motion.div>
            )}
          </div>

          {/* ── Right: editorial reading ── */}
          <div className="border border-[#501a2c] border-l-0 flex flex-col">
            {!report && !error && (
              <div className="flex-1 flex items-center justify-center py-20">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30">
                  {reading ? 'Analysing…' : 'Upload photograph to begin'}
                </p>
              </div>
            )}

            {error && (
              <div className="p-6 flex items-start gap-3">
                <AlertCircle size={14} className="text-[#501a2c] mt-0.5 shrink-0" />
                <p className="font-mono text-xs text-[#501a2c]">{error}</p>
              </div>
            )}

            {report && (
              <>
                {/* Headline block */}
                <div className="bg-[#501a2c] text-[#F5F0EB] px-6 py-6">
                  <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-[#C9A690]/50 mb-2">Chronicle / Editorial</p>
                  <h2 className="font-serif text-2xl md:text-3xl leading-tight text-[#F5F0EB] mb-2">{report.headline}</h2>
                  <p className="font-serif text-sm italic text-[#F5F0EB]/55 leading-snug">{report.subheadline}</p>
                </div>

                {/* Narrative */}
                <div className="px-6 py-6 border-b border-[#501a2c]/15">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35 mb-3">Editorial Reading</p>
                  <p className="font-serif text-sm text-[#501a2c]/80 leading-relaxed">{report.narrative}</p>
                </div>

                {/* Tension + Light */}
                <div className="grid grid-cols-2 border-b border-[#501a2c]/15">
                  <div className="px-5 py-4 border-r border-[#501a2c]/15">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mb-1.5">Tension</p>
                    <p className="font-serif text-xs text-[#501a2c]/70 leading-snug">{report.tension}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mb-1.5">Light</p>
                    <p className="font-serif text-xs text-[#501a2c]/70 leading-snug">{report.light_quality}</p>
                  </div>
                </div>

                {/* Technical + era */}
                <div className="grid grid-cols-2 border-b border-[#501a2c]/15">
                  <div className="px-5 py-4 border-r border-[#501a2c]/15">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mb-1">Composition</p>
                    <p className="font-mono text-[10px] text-[#501a2c]">{report.composition}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mb-1">Era</p>
                    <p className="font-mono text-[10px] text-[#501a2c]">{report.era}</p>
                  </div>
                </div>

                {/* Human presence + Editorial score */}
                <div className="px-6 py-5 border-b border-[#501a2c]/15 flex items-center gap-4 justify-between">
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mb-1">Subject</p>
                    <p className="font-mono text-[10px] text-[#501a2c]">{PRESENCE_LABEL[report.human_presence] ?? report.human_presence}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mb-1">Editorial Score</p>
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="font-mono text-3xl leading-none font-light"
                        style={{ color: SCORE_COLOR(report.editorial_score) }}>
                        {report.editorial_score}
                      </span>
                      <span className="font-mono text-[9px] text-[#501a2c]/30">/100</span>
                    </div>
                    <div className="mt-2 w-24 ml-auto h-px bg-[#501a2c]/10">
                      <motion.div className="h-px" style={{ backgroundColor: SCORE_COLOR(report.editorial_score) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${report.editorial_score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="px-6 py-5 flex flex-wrap gap-2">
                  {report.tags.map(tag => (
                    <span key={tag} className="border border-[#501a2c]/25 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/55">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="mt-auto px-6 pb-5 pt-2 border-t border-[#501a2c]/10">
              <button type="button"
                onClick={() => { setUpload(null); setReport(null); }}
                className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] transition-colors flex items-center gap-2">
                <Upload size={12} /> {t('materie.newimage')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── MATERIE LANDING ───────────────────────────────────────────────────────

const MATERIE_BG = 'https://raw.githubusercontent.com/eprisj/eprisj.github.io/main/%D1%81over/cover_main_section.png';

const TOOL_CARDS = (t: T) => [
  {
    id: 'lab' as const,
    num: '01',
    kicker: 'Matter Lab',
    icon: <Scan size={18} />,
    accent: '#501a2c',
    title: t('materie.lab.title'),
    desc: t('materie.lab.desc'),
    features: [
      { icon: <Scan size={10} />,     label: 'Material scan' },
      { icon: <Box size={10} />,      label: 'Bounding boxes' },
      { icon: <Activity size={10} />, label: 'Integrity score' },
      { icon: <Zap size={10} />,      label: 'Restoration AI' },
    ],
    cta: t('materie.lab.open'),
  },
  {
    id: 'studio' as const,
    num: '02',
    kicker: 'Interior Studio',
    icon: <Layers size={18} />,
    accent: '#C9A690',
    title: t('materie.studio.title'),
    desc: t('materie.studio.desc'),
    features: [
      { icon: <Layers size={10} />,   label: 'Design DNA' },
      { icon: <Home size={10} />,     label: 'Color palette' },
      { icon: <Activity size={10} />, label: 'Space metrics' },
      { icon: <Zap size={10} />,      label: 'AI critique' },
    ],
    cta: t('materie.studio.open'),
  },
  {
    id: 'chronicle' as const,
    num: '03',
    kicker: 'Chronicle',
    icon: <Aperture size={18} />,
    accent: '#4A5568',
    title: t('materie.chronicle.title'),
    desc: t('materie.chronicle.desc'),
    features: [
      { icon: <BookOpen size={10} />,  label: 'Editorial reading' },
      { icon: <Star size={10} />,      label: 'Editorial score' },
      { icon: <Activity size={10} />,  label: 'Visual tension' },
      { icon: <Aperture size={10} />,  label: 'Photo caption' },
    ],
    cta: t('materie.chronicle.open'),
  },
];

export function MateriePage({ t }: { t: T }) {
  const [tool, setTool] = useState<Tool>(null);

  return (
    <AnimatePresence mode="wait">
      {tool === 'lab'    && <LabTool    key="lab"    onBack={() => setTool(null)} t={t} />}
      {tool === 'studio' && <StudioTool key="studio" onBack={() => setTool(null)} t={t} />}
      {tool === 'chronicle' && <ChronicleTool key="chronicle" onBack={() => setTool(null)} t={t} />}
      {!tool && (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-[calc(100vh-4rem)] bg-[#F5F0EB]">

          {/* ── Hero ── */}
          <div className="relative overflow-hidden border-b border-[#501a2c]/20">
            <img src={MATERIE_BG} alt="" aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-30 pointer-events-none select-none" />
            <div className="relative z-10 px-6 sm:px-10 md:px-16 pt-14 pb-12 sm:pt-20 sm:pb-16">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#501a2c]/50 mb-5">{t('materie.kicker')}</p>
              <h1 className="font-mono text-5xl sm:text-7xl lg:text-8xl tracking-[0.06em] text-[#501a2c] leading-none mb-6">MATERIE</h1>
              <p className="font-serif text-lg sm:text-2xl text-[#501a2c]/55 italic max-w-xl leading-relaxed">{t('materie.subtitle')}</p>
              <div className="flex gap-8 sm:gap-14 mt-10 pt-8 border-t border-[#501a2c]/15">
                {[
                  { num: '03', label: t('materie.stats.tools') },
                  { num: 'AI', label: t('materie.stats.models') },
                  { num: '∞',  label: t('materie.stats.analyses') },
                ].map(({ num, label }) => (
                  <div key={label}>
                    <p className="font-mono text-2xl sm:text-3xl text-[#501a2c] leading-none">{num}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tool cards — 3 col ── */}
          <div className="px-6 sm:px-10 md:px-16 py-12 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 max-w-6xl">
              {TOOL_CARDS(t).map((card) => (
                <button key={card.id} type="button" onClick={() => setTool(card.id)}
                  className="group text-left border border-[#501a2c] hover:bg-[#501a2c] transition-colors duration-300 overflow-hidden">
                  <div className="h-1 transition-colors duration-300"
                    style={{ backgroundColor: card.accent }} />
                  <div className="p-7 sm:p-8">
                    <div className="flex items-start justify-between mb-7">
                      <div className="w-10 h-10 border border-[#501a2c] group-hover:border-[#F5F0EB]/40 flex items-center justify-center transition-colors">
                        <span className="text-[#501a2c] group-hover:text-[#F5F0EB] transition-colors">{card.icon}</span>
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/30 group-hover:text-[#F5F0EB]/30 transition-colors mt-1">{card.num}</span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.25em] mb-2 transition-colors group-hover:text-[#C9A690]"
                      style={{ color: card.accent + '99' }}>{card.kicker}</p>
                    <h2 className="font-mono text-xl sm:text-2xl tracking-[0.08em] text-[#501a2c] group-hover:text-[#F5F0EB] mb-4 transition-colors leading-tight">
                      {card.title}
                    </h2>
                    <p className="font-serif text-sm text-[#501a2c]/60 group-hover:text-[#F5F0EB]/60 leading-relaxed mb-7 transition-colors">
                      {card.desc}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 mb-7">
                      {card.features.map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-[#501a2c]/45 group-hover:text-[#F5F0EB]/45 transition-colors">
                          <span className="opacity-60">{icon}</span>{label}
                        </div>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c] group-hover:text-[#C9A690] flex items-center gap-2 transition-colors">
                      {card.cta} <ChevronRight size={13} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── How it works ── */}
          <div className="px-6 sm:px-10 md:px-16 pb-14 border-t border-[#501a2c]/10 pt-10 max-w-6xl">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#501a2c]/35 mb-8">{t('materie.how')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
              {[
                { n: '01', title: t('materie.step1.title'), desc: t('materie.step1.desc') },
                { n: '02', title: t('materie.step2.title'), desc: t('materie.step2.desc') },
                { n: '03', title: t('materie.step3.title'), desc: t('materie.step3.desc') },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-5">
                  <span className="font-mono text-[10px] text-[#C9A690] mt-0.5 shrink-0 w-5">{n}</span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c] mb-1">{title}</p>
                    <p className="font-serif text-sm text-[#501a2c]/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-6 border-t border-[#501a2c]/10">
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/25">{t('materie.powered')}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
