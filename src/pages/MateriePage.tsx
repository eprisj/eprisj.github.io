import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ArrowLeft, Scan, Home, Layers, Activity, Zap, ChevronRight, AlertCircle, Maximize, Box } from 'lucide-react';
import { analyzeImage, analyzeImageText } from '../lib/openrouter';

// ─── Shared types ──────────────────────────────────────────────────────────

type Tool = null | 'lab' | 'studio';

interface UploadState {
  src: string;       // data URL
  base64: string;
  mimeType: string;
}

// ─── Lab types ─────────────────────────────────────────────────────────────

interface LabNode {
  id: number;
  title: string;
  type: string;
  status: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-100
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
      className="border border-dashed border-[#501a2c]/30 rounded-none flex flex-col items-center justify-center gap-4 py-16 cursor-pointer hover:border-[#501a2c] hover:bg-[#E8DED5]/40 transition-all"
      onClick={() => ref.current?.click()}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Upload size={24} className="text-[#501a2c]/40" />
      <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/50">{label}</p>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 hover:text-[#501a2c] transition-colors mb-8">
      <ArrowLeft size={14} /> Back to Materie
    </button>
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

function LabTool({ onBack }: { onBack: () => void }) {
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<LabReport | null>(null);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [visualMode, setVisualMode] = useState<VisualMode>('rgb');
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const handleUpload = async (state: UploadState) => {
    setUpload(state);
    setReport(null);
    setActiveNode(null);
    setDeepAnalysis(null);
    setError(null);
    setScanning(true);
    try {
      const result = await analyzeImage<LabReport>(state.base64, state.mimeType, LAB_PROMPT);
      setReport(result);
    } catch (e) {
      setError('Analysis failed. Check your API key or try again.');
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const handleDeepAnalysis = async (type: 'restoration' | 'risk') => {
    if (activeNode === null || !report || !upload) return;
    const node = report.nodes[activeNode];
    setDeepLoading(true);
    setDeepAnalysis(null);
    const prompt = type === 'restoration'
      ? `You are a conservation specialist. Based on this element: "${node.title}" (${node.forensics.composition}), integrity score ${node.forensics.integrity_score}/100. Provide a technical restoration protocol in 3-4 bullet points.`
      : `You are a structural engineer. Element: "${node.title}" (${node.forensics.composition}), integrity ${node.forensics.integrity_score}/100. List 3 failure risks and mitigation steps.`;
    try {
      const result = await analyzeImageText(upload.base64, upload.mimeType, prompt);
      setDeepAnalysis(result);
    } catch (e) {
      setDeepAnalysis('Analysis failed.');
    } finally {
      setDeepLoading(false);
    }
  };

  const activeNodeData = activeNode !== null ? report?.nodes[activeNode] : null;

  return (
    <div className="min-h-screen bg-[#F5F0EB] px-4 sm:px-8 md:px-16 py-8">
      <BackBtn onClick={onBack} />

      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-1">EPRIS / MATERIE</p>
        <h1 className="font-mono text-3xl sm:text-5xl tracking-[0.1em] text-[#501a2c]">MATTER LAB</h1>
        <p className="font-mono text-xs text-[#501a2c]/50 mt-2 uppercase tracking-widest">Architectural forensics — AI material scanner</p>
      </div>

      {!upload && (
        <div className="max-w-2xl">
          <UploadZone onFile={handleUpload} label="Drop or click to upload architectural image" />
        </div>
      )}

      {upload && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: image */}
          <div className="lg:col-span-2 space-y-4">
            {/* Visual mode bar */}
            <div className="flex gap-0 border border-[#501a2c]">
              {(['rgb', 'thermal', 'xray', 'edge'] as VisualMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVisualMode(m)}
                  className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${visualMode === m ? 'bg-[#501a2c] text-[#F5F0EB]' : 'text-[#501a2c] hover:bg-[#E8DED5]'}`}
                >
                  {m}
                </button>
              ))}
              <button type="button" onClick={() => setFullscreen(!fullscreen)} className="px-3 text-[#501a2c] hover:bg-[#E8DED5] transition-colors border-l border-[#501a2c]">
                <Maximize size={14} />
              </button>
            </div>

            {/* Image + bounding boxes */}
            <div className={`relative bg-[#E8DED5] overflow-hidden ${fullscreen ? 'fixed inset-4 z-50' : ''}`}>
              {fullscreen && (
                <button type="button" onClick={() => setFullscreen(false)} className="absolute top-3 right-3 z-10 bg-[#501a2c] text-[#F5F0EB] p-1 rounded">
                  <X size={16} />
                </button>
              )}
              <img
                src={upload.src}
                alt="Analysis target"
                className="w-full object-contain"
                style={{ filter: VISUAL_FILTERS[visualMode] }}
              />
              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 bg-[#501a2c]/20 flex items-center justify-center">
                  <div className="bg-[#F5F0EB] border border-[#501a2c] px-6 py-4 flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-[#501a2c]" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[#501a2c]">Scanning structure...</span>
                  </div>
                </div>
              )}
              {/* Bounding boxes */}
              {report?.nodes.map((node, i) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => { setActiveNode(i); setDeepAnalysis(null); }}
                  className="absolute transition-all"
                  style={{
                    top: `${node.box_2d[0]}%`,
                    left: `${node.box_2d[1]}%`,
                    width: `${node.box_2d[3] - node.box_2d[1]}%`,
                    height: `${node.box_2d[2] - node.box_2d[0]}%`,
                    border: `1px solid ${activeNode === i ? '#C9A690' : '#501a2c'}`,
                    background: activeNode === i ? 'rgba(201,166,144,0.15)' : 'rgba(80,26,44,0.05)',
                  }}
                >
                  <span className="absolute top-0 left-0 bg-[#501a2c] text-[#F5F0EB] font-mono text-[9px] px-1 leading-tight">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </button>
              ))}
            </div>

            {/* Re-upload */}
            <button
              type="button"
              onClick={() => { setUpload(null); setReport(null); setActiveNode(null); }}
              className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] transition-colors flex items-center gap-2"
            >
              <Upload size={12} /> New image
            </button>
          </div>

          {/* Right: report panel */}
          <div className="space-y-0 border border-[#501a2c]">
            {/* Header */}
            <div className="bg-[#501a2c] text-[#F5F0EB] p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-50 mb-1">
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

            {/* Nodes list */}
            {report && (
              <>
                <div className="divide-y divide-[#501a2c]/10">
                  {report.nodes.map((node, i) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => { setActiveNode(i); setDeepAnalysis(null); }}
                      className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${activeNode === i ? 'bg-[#E8DED5]' : 'hover:bg-[#F5F0EB]'}`}
                    >
                      <span className="font-mono text-[10px] text-[#501a2c]/40 mt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <div className="font-mono text-xs uppercase tracking-wider text-[#501a2c] truncate">{node.title}</div>
                        <div className="font-mono text-[10px] text-[#501a2c]/50 uppercase">{node.type} · {node.status}</div>
                        <div className="mt-1 h-1 bg-[#501a2c]/10 w-full">
                          <div className="h-full bg-[#501a2c]" style={{ width: `${node.forensics.integrity_score}%` }} />
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-[#501a2c]/30 mt-1 shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 border-t border-[#501a2c]/20 bg-[#F5F0EB]">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Summary</p>
                  <p className="font-serif text-sm text-[#501a2c]/80 leading-relaxed">{report.summary}</p>
                </div>
              </>
            )}

            {/* Active node detail */}
            {activeNodeData && (
              <div className="border-t border-[#501a2c] bg-[#E8DED5] p-4 space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/50">Forensic Detail</div>
                <div className="font-mono text-sm uppercase text-[#501a2c]">{activeNodeData.title}</div>
                <p className="font-serif text-xs text-[#501a2c]/70">{activeNodeData.description}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {[
                    ['Composition', activeNodeData.forensics.composition],
                    ['Origin', activeNodeData.forensics.material_origin],
                    ['Est. Year', activeNodeData.forensics.year_estimate],
                    ['Durability', activeNodeData.forensics.durability],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[#501a2c]/40 uppercase">{k}</div>
                      <div className="text-[#501a2c]">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#501a2c]/40 uppercase">Integrity</span>
                  <span className="font-mono text-sm text-[#501a2c]">{activeNodeData.forensics.integrity_score}/100</span>
                </div>
                <div className="flex gap-2">
                  {(['restoration', 'risk'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleDeepAnalysis(t)}
                      disabled={deepLoading}
                      className="flex-1 py-2 border border-[#501a2c] font-mono text-[10px] uppercase tracking-wider text-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors disabled:opacity-40"
                    >
                      {deepLoading ? <Loader2 size={12} className="animate-spin mx-auto" /> : t}
                    </button>
                  ))}
                </div>
                {deepAnalysis && (
                  <div className="bg-[#F5F0EB] border border-[#501a2c]/20 p-3">
                    <p className="font-serif text-xs text-[#501a2c]/80 leading-relaxed whitespace-pre-line">{deepAnalysis}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/50">{label}</span>
        <span className="font-mono text-[10px] text-[#501a2c]">{value}</span>
      </div>
      <div className="h-px bg-[#501a2c]/10">
        <div className="h-px bg-[#501a2c] transition-all duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StudioTool({ onBack }: { onBack: () => void }) {
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<StudioReport | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>('dna');
  const [hoveredElement, setHoveredElement] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (state: UploadState) => {
    setUpload(state);
    setReport(null);
    setError(null);
    setAnalyzing(true);
    try {
      const result = await analyzeImage<StudioReport>(state.base64, state.mimeType, STUDIO_PROMPT);
      setReport(result);
    } catch (e) {
      setError('Analysis failed. Check your API key or try again.');
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const TABS: { id: StudioTab; label: string }[] = [
    { id: 'dna', label: 'DNA' },
    { id: 'palette', label: 'Palette' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'critique', label: 'Critique' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F0EB] px-4 sm:px-8 md:px-16 py-8">
      <BackBtn onClick={onBack} />

      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-1">EPRIS / MATERIE</p>
        <h1 className="font-mono text-3xl sm:text-5xl tracking-[0.1em] text-[#501a2c]">INTERIOR STUDIO</h1>
        <p className="font-mono text-xs text-[#501a2c]/50 mt-2 uppercase tracking-widest">AI interior analysis — design DNA & critique</p>
      </div>

      {!upload && (
        <div className="max-w-2xl">
          <UploadZone onFile={handleUpload} label="Drop or click to upload interior image" />
        </div>
      )}

      {upload && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image panel */}
          <div className="space-y-4">
            <div className="relative bg-[#E8DED5] overflow-hidden">
              <img src={upload.src} alt="Interior" className="w-full object-contain" />
              {/* Element overlays */}
              {report?.elements.map((el, i) => (
                <div
                  key={i}
                  className="absolute transition-all cursor-pointer"
                  style={{
                    top: `${el.box_2d[0]}%`,
                    left: `${el.box_2d[1]}%`,
                    width: `${el.box_2d[3] - el.box_2d[1]}%`,
                    height: `${el.box_2d[2] - el.box_2d[0]}%`,
                    border: `1px solid ${hoveredElement === i ? '#C9A690' : 'rgba(80,26,44,0.4)'}`,
                    background: hoveredElement === i ? 'rgba(201,166,144,0.15)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredElement(i)}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  {hoveredElement === i && (
                    <span className="absolute bottom-0 left-0 bg-[#501a2c] text-[#F5F0EB] font-mono text-[9px] px-1 whitespace-nowrap">
                      {el.name}
                    </span>
                  )}
                </div>
              ))}
              {analyzing && (
                <div className="absolute inset-0 bg-[#501a2c]/20 flex items-center justify-center">
                  <div className="bg-[#F5F0EB] border border-[#501a2c] px-6 py-4 flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-[#501a2c]" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[#501a2c]">Analyzing space...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {report && (
              <div className="flex flex-wrap gap-2">
                {report.tags.map(tag => (
                  <span key={tag} className="border border-[#501a2c] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#501a2c]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setUpload(null); setReport(null); }}
              className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] transition-colors flex items-center gap-2"
            >
              <Upload size={12} /> New image
            </button>
          </div>

          {/* Analysis panel */}
          <div className="border border-[#501a2c]">
            {/* Tabs */}
            <div className="grid grid-cols-4 border-b border-[#501a2c]">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 font-mono text-[10px] uppercase tracking-widest transition-colors ${activeTab === tab.id ? 'bg-[#501a2c] text-[#F5F0EB]' : 'text-[#501a2c] hover:bg-[#E8DED5]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[300px]">
              {error && (
                <div className="flex items-start gap-3">
                  <AlertCircle size={14} className="text-[#501a2c] mt-0.5 shrink-0" />
                  <p className="font-mono text-xs text-[#501a2c]">{error}</p>
                </div>
              )}

              {!report && !error && (
                <div className="flex items-center justify-center h-full py-12">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30">
                    {analyzing ? 'Processing...' : 'Upload image to begin'}
                  </p>
                </div>
              )}

              {report && activeTab === 'dna' && (
                <div className="space-y-4">
                  <p className="font-serif text-sm text-[#501a2c]/80 leading-relaxed">{report.description}</p>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Detected Elements</p>
                    <div className="divide-y divide-[#501a2c]/10">
                      {report.elements.map((el, i) => (
                        <div
                          key={i}
                          className={`py-2 flex justify-between font-mono text-xs cursor-default transition-colors ${hoveredElement === i ? 'text-[#501a2c]' : 'text-[#501a2c]/60'}`}
                          onMouseEnter={() => setHoveredElement(i)}
                          onMouseLeave={() => setHoveredElement(null)}
                        >
                          <span>{el.name}</span>
                          <span className="text-[#501a2c]/30 uppercase text-[10px]">{el.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-1">Lighting</p>
                    <p className="font-mono text-xs text-[#501a2c]">{report.lighting.mood} — {report.lighting.sources.join(', ')}</p>
                    <p className="font-serif text-xs text-[#501a2c]/60 mt-1 italic">{report.lighting.suggestion}</p>
                  </div>
                </div>
              )}

              {report && activeTab === 'palette' && (
                <div className="space-y-3">
                  {report.palette.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 shrink-0 border border-[#501a2c]/20" style={{ backgroundColor: item.hex }} />
                      <div>
                        <div className="font-mono text-xs uppercase tracking-wider text-[#501a2c]">{item.name}</div>
                        <div className="font-mono text-[10px] text-[#501a2c]/40">{item.hex}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {report && activeTab === 'metrics' && (
                <div className="space-y-5">
                  <MetricBar label="Natural Light" value={report.metrics.light} />
                  <MetricBar label="Acoustics" value={report.metrics.acoustics} />
                  <MetricBar label="Warmth" value={report.metrics.warmth} />
                  <MetricBar label="Air Quality" value={report.metrics.air} />
                </div>
              )}

              {report && activeTab === 'critique' && (
                <div className="space-y-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {report.critique.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 font-serif text-sm text-[#501a2c]/70">
                          <span className="text-[#C9A690] mt-0.5">—</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-2">Opportunities</p>
                    <ul className="space-y-1">
                      {report.critique.opportunities.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 font-serif text-sm text-[#501a2c]/70">
                          <span className="text-[#501a2c]/30 mt-0.5">+</span> {s}
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
    </div>
  );
}

// ─── MATERIE LANDING ───────────────────────────────────────────────────────

export function MateriePage() {
  const [tool, setTool] = useState<Tool>(null);

  if (tool === 'lab') return <LabTool onBack={() => setTool(null)} />;
  if (tool === 'studio') return <StudioTool onBack={() => setTool(null)} />;

  return (
    <div className="min-h-screen bg-[#F5F0EB] px-4 sm:px-8 md:px-16 py-16">
      {/* Header */}
      <div className="max-w-4xl mb-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/40 mb-3">EPRIS / MATERIE</p>
        <h1 className="font-mono text-5xl sm:text-7xl tracking-[0.08em] text-[#501a2c] leading-none mb-6">MATERIE</h1>
        <p className="font-serif text-xl text-[#501a2c]/60 italic max-w-lg leading-relaxed">
          AI-powered tools for reading architecture and interior space through material intelligence.
        </p>
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#501a2c] max-w-4xl">
        {/* Matter Lab */}
        <button
          type="button"
          onClick={() => setTool('lab')}
          className="group text-left p-8 sm:p-12 border-b md:border-b-0 md:border-r border-[#501a2c] hover:bg-[#501a2c] transition-colors duration-300"
        >
          <div className="mb-8">
            <div className="w-10 h-10 border border-[#501a2c] group-hover:border-[#F5F0EB] flex items-center justify-center mb-6 transition-colors">
              <Scan size={18} className="text-[#501a2c] group-hover:text-[#F5F0EB] transition-colors" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 group-hover:text-[#F5F0EB]/40 mb-2 transition-colors">01 / LAB</p>
            <h2 className="font-mono text-2xl sm:text-3xl tracking-[0.1em] text-[#501a2c] group-hover:text-[#F5F0EB] transition-colors">MATTER LAB</h2>
          </div>
          <p className="font-serif text-base text-[#501a2c]/60 group-hover:text-[#F5F0EB]/60 leading-relaxed mb-8 transition-colors">
            Upload any architectural image. The scanner identifies structural elements, estimates materials, composition and integrity — with bounding-box forensics.
          </p>
          <div className="flex flex-wrap gap-2 mb-8">
            {['Material scan', 'Bounding boxes', 'Forensic report', 'Restoration protocol'].map(t => (
              <span key={t} className="border border-[#501a2c]/30 group-hover:border-[#F5F0EB]/30 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#501a2c]/50 group-hover:text-[#F5F0EB]/50 transition-colors">
                {t}
              </span>
            ))}
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#501a2c] group-hover:text-[#F5F0EB] flex items-center gap-2 transition-colors">
            Open Lab <ChevronRight size={14} />
          </span>
        </button>

        {/* Interior Studio */}
        <button
          type="button"
          onClick={() => setTool('studio')}
          className="group text-left p-8 sm:p-12 hover:bg-[#501a2c] transition-colors duration-300"
        >
          <div className="mb-8">
            <div className="w-10 h-10 border border-[#501a2c] group-hover:border-[#F5F0EB] flex items-center justify-center mb-6 transition-colors">
              <Layers size={18} className="text-[#501a2c] group-hover:text-[#F5F0EB] transition-colors" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#501a2c]/40 group-hover:text-[#F5F0EB]/40 mb-2 transition-colors">02 / STUDIO</p>
            <h2 className="font-mono text-2xl sm:text-3xl tracking-[0.1em] text-[#501a2c] group-hover:text-[#F5F0EB] transition-colors">INTERIOR STUDIO</h2>
          </div>
          <p className="font-serif text-base text-[#501a2c]/60 group-hover:text-[#F5F0EB]/60 leading-relaxed mb-8 transition-colors">
            Scan an interior space to extract design DNA — palette, spatial metrics, lighting mood, and a professional critique of strengths and opportunities.
          </p>
          <div className="flex flex-wrap gap-2 mb-8">
            {['Design DNA', 'Color palette', 'Space metrics', 'AI critique'].map(t => (
              <span key={t} className="border border-[#501a2c]/30 group-hover:border-[#F5F0EB]/30 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#501a2c]/50 group-hover:text-[#F5F0EB]/50 transition-colors">
                {t}
              </span>
            ))}
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#501a2c] group-hover:text-[#F5F0EB] flex items-center gap-2 transition-colors">
            Open Studio <ChevronRight size={14} />
          </span>
        </button>
      </div>

      {/* Footer note */}
      <div className="max-w-4xl mt-12 pt-8 border-t border-[#501a2c]/10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/30">
          Powered by AI vision models via OpenRouter · Free tier · No data stored
        </p>
      </div>
    </div>
  );
}
