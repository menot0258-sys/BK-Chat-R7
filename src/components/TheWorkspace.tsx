import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Code2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Copy,
  Check,
  Folder,
  Loader2,
  FileCode,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface TheWorkspaceProps {
  open: boolean;
  onClose: () => void;
  onSaveToDrive: (filename: string, content: string) => void;
  geminiKey?: string;
}

const QUICK_PROMPTS = [
  {
    category: 'office',
    label: 'Office: Quarterly Financial Performance',
    prompt:
      'Create an executive quarterly financial performance report with monthly revenue line charts, regional sales bar graphs, 4 KPI cards (Gross Margin, Operating Profit, CAC, Retention Rate), and a strategic growth summary table.',
  },
  {
    category: 'developer',
    label: 'Developer: Microservices SLA & Latency',
    prompt:
      'Design a technical developer dashboard report analyzing microservices latency (p50, p95, p99), error rates, throughput across 6 Kubernetes services, with a responsive telemetry line chart and resource allocation table.',
  },
  {
    category: 'teacher',
    label: 'Teacher: Physics Science Lab Curriculum',
    prompt:
      'Build a comprehensive physics lab curriculum document on Gravitational Acceleration & Projectile Motion, including an interactive velocity vs time chart, scientific hypothesis cards, experimental measurement data table, and assignment questions.',
  },
  {
    category: 'coder',
    label: 'Coder: Algorithm Complexity & Benchmarks',
    prompt:
      'Generate an interactive technical benchmarking report comparing Big-O time complexity across QuickSort, MergeSort, HeapSort, and RadixSort with an execution time comparison bar graph, memory footprint cards, and optimization notes.',
  },
];

export const TheWorkspace: React.FC<TheWorkspaceProps> = ({
  open,
  onClose,
  onSaveToDrive,
  geminiKey,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [docCategory, setDocCategory] = useState<'report' | 'analytics' | 'education' | 'tech_spec'>('report');
  const [docTitle, setDocTitle] = useState('Executive Workspace Document');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  // Optional attached dataset (JSON or CSV)
  const [attachedDataName, setAttachedDataName] = useState<string | null>(null);
  const [attachedDataContext, setAttachedDataContext] = useState<any | null>(null);

  // Active Document HTML content
  const [docHtml, setDocHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load default template initially if empty
  useEffect(() => {
    if (!docHtml) {
      loadDefaultTemplate();
    }
  }, []);

  // Update iframe on HTML change
  useEffect(() => {
    if (iframeRef.current && docHtml) {
      iframeRef.current.srcdoc = docHtml;
    }
  }, [docHtml, viewMode]);

  const loadDefaultTemplate = () => {
    const initial = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-6 md:p-10 font-sans antialiased">
  <div class="max-w-4xl mx-auto space-y-8">
    <header class="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <span class="text-xs font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950 border border-cyan-800/50 px-2.5 py-1 rounded">The Workspace • AI Document Architect</span>
        <h1 class="text-3xl font-bold text-white mt-2">Executive Business & Systems Intelligence</h1>
        <p class="text-sm text-slate-400 mt-1">Prompt-driven automated layout, analytical graphs & publication format</p>
      </div>
      <div class="text-xs text-slate-400 font-mono text-left md:text-right">
        <p>EDITION: 2026.4</p>
        <p>DATE: ${new Date().toLocaleDateString()}</p>
        <p class="text-emerald-400 font-semibold">STATUS: LIVE VERIFIED</p>
      </div>
    </header>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <p class="text-xs text-slate-400">Total Throughput</p>
        <p class="text-2xl font-bold text-white mt-1">98.4%</p>
        <p class="text-[11px] text-emerald-400 mt-1">+14.2% Growth</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <p class="text-xs text-slate-400">Cycle Latency</p>
        <p class="text-2xl font-bold text-white mt-1">16.2 ms</p>
        <p class="text-[11px] text-emerald-400 mt-1">-28% Optimized</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <p class="text-xs text-slate-400">Active Nodes</p>
        <p class="text-2xl font-bold text-white mt-1">1,240</p>
        <p class="text-[11px] text-cyan-400 mt-1">100% Operational</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <p class="text-xs text-slate-400">SLA Confidence</p>
        <p class="text-2xl font-bold text-white mt-1">99.99%</p>
        <p class="text-[11px] text-emerald-400 mt-1">Target Reached</p>
      </div>
    </div>

    <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-semibold text-white">Interactive Performance Trajectory</h2>
          <p class="text-xs text-slate-400">Dynamic telemetry visualization generated via prompt</p>
        </div>
        <span class="text-[11px] font-mono text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">Chart.js Engine</span>
      </div>
      <div class="relative h-64 w-full">
        <canvas id="workspaceDocChart"></canvas>
      </div>
    </div>

    <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <h2 class="text-base font-semibold text-white">Component Resource Breakdown</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="text-slate-400 border-b border-slate-800 bg-slate-950 uppercase text-[10px] tracking-wider">
            <tr>
              <th class="py-2.5 px-3">System Module</th>
              <th class="py-2.5 px-3">Domain</th>
              <th class="py-2.5 px-3">Utilization</th>
              <th class="py-2.5 px-3">Integrity</th>
              <th class="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td class="py-2.5 px-3 font-mono font-medium text-white">Core-Neural-Bridge</td>
              <td class="py-2.5 px-3">AI / Engine</td>
              <td class="py-2.5 px-3">91.2%</td>
              <td class="py-2.5 px-3 text-emerald-400">99.1%</td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">Operational</span></td>
            </tr>
            <tr>
              <td class="py-2.5 px-3 font-mono font-medium text-white">Telemetry-Pipeline</td>
              <td class="py-2.5 px-3">Data Stream</td>
              <td class="py-2.5 px-3">74.5%</td>
              <td class="py-2.5 px-3 text-emerald-400">99.8%</td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">Operational</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const ctx = document.getElementById('workspaceDocChart');
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5 (Proj)', 'Q6 (Proj)'],
            datasets: [
              {
                label: 'Observed Trajectory (Units)',
                data: [45, 62, 79, 88, 102, 120],
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0.35,
              },
              {
                label: 'Baseline Standard',
                data: [40, 50, 60, 70, 80, 90],
                borderColor: '#a855f7',
                borderDash: [5, 5],
                fill: false,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#94a3b8' } }
            },
            scales: {
              x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
          }
        });
      }
    });
  </script>
</body>
</html>`;
    setDocHtml(initial);
  };

  // Generate Document Primarily Driven by User Prompt (With Automatic Token Completion on Server)
  const handleGenerateFromPrompt = async (overridePrompt?: string) => {
    const promptToRun = (overridePrompt !== undefined ? overridePrompt : promptInput).trim();
    if (!promptToRun) return;

    setIsGenerating(true);
    setGenerationError(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (geminiKey) headers['x-gemini-key'] = geminiKey;

    try {
      const res = await fetch('/api/workspace/generate-doc', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: promptToRun,
          dataContext: attachedDataContext,
          docType: docCategory,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to generate document');
      }

      const data = await res.json();
      if (data.html) {
        setDocHtml(data.html);
        setDocTitle(promptToRun.slice(0, 35));
        setViewMode('preview');
      } else {
        throw new Error('No HTML returned');
      }
    } catch (err: any) {
      console.error('Doc gen error:', err);
      setGenerationError(err?.message || 'Failed to generate document from prompt.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Optional Data Upload (Secondary/Optional)
  const handleDataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        let parsed: any;
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else {
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          parsed = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const obj: any = {};
            headers.forEach((h, i) => {
              obj[h] = isNaN(Number(values[i])) ? values[i] : Number(values[i]);
            });
            return obj;
          });
        }
        setAttachedDataName(file.name);
        setAttachedDataContext(parsed);
      } catch (err) {
        alert('Invalid data file. Please upload valid JSON or CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export functions: PDF, HTML, PNG, JPG, SVG
  const exportAsHtml = () => {
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuOpen(false);
  };

  const exportAsPDF = () => {
    setDownloadMenuOpen(false);
    if (iframeRef.current?.contentDocument?.body) {
      if ((window as any).html2pdf) {
        const opt = {
          margin: 0.4,
          filename: `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#020617' },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        };
        (window as any).html2pdf().set(opt).from(iframeRef.current.contentDocument.body).save();
      } else {
        iframeRef.current.contentWindow?.print();
      }
    }
  };

  const exportAsImage = (format: 'png' | 'jpeg') => {
    setDownloadMenuOpen(false);
    const element = iframeRef.current?.contentDocument?.body;
    const h2c = (window as any).html2canvas;
    if (element && h2c) {
      h2c(element, { backgroundColor: '#020617', scale: 2 }).then((canvas: HTMLCanvasElement) => {
        const dataUrl = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${docTitle.toLowerCase().replace(/\s+/g, '_')}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        a.click();
      }).catch(() => {
        iframeRef.current?.contentWindow?.print();
      });
    } else {
      iframeRef.current?.contentWindow?.print();
    }
  };

  const exportAsSVG = () => {
    setDownloadMenuOpen(false);
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${docHtml}
        </div>
      </foreignObject>
    </svg>`;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`bg-[#131314] border gemini-border flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[94vh] rounded-2xl'
        }`}
      >
        {/* Workspace Toolbar Header */}
        <header className="p-3 sm:px-4 border-b gemini-border flex justify-between items-center bg-[#18191a] flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="p-1.5 rounded-lg bg-zinc-800 text-white">
              <FileText className="w-4 h-4 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white tracking-wide">The Workspace</h2>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                  PROMPT-DRIVEN
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Describe any document, dashboard, lab curriculum, or analytics report to generate it with interactive charts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle: Small Button to view code or visual document */}
            <div className="flex bg-[#131314] p-1 rounded-lg border border-zinc-700 text-xs">
              <button
                onClick={() => setViewMode('preview')}
                className={`py-1 px-2 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'preview' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="View Visual Rendered Document"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-[11px]">Visual Doc</span>
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`py-1 px-2 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'code' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="View HTML / Chart.js Source Code"
              >
                <Code2 className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-[11px]">View Code</span>
              </button>
            </div>

            {/* Comprehensive Download Dropdown (PDF, HTML, PNG, JPG, SVG) */}
            <div className="relative">
              <button
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download in multiple formats"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {downloadMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-[#1e1f20] border border-zinc-700 rounded-xl shadow-2xl py-1 z-30 text-xs text-zinc-200">
                  <button
                    onClick={exportAsPDF}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Download PDF</span>
                    <span className="text-[10px] text-zinc-500 font-mono">.pdf</span>
                  </button>
                  <button
                    onClick={exportAsHtml}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Download HTML</span>
                    <span className="text-[10px] text-zinc-500 font-mono">.html</span>
                  </button>
                  <button
                    onClick={() => exportAsImage('png')}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Download PNG</span>
                    <span className="text-[10px] text-zinc-500 font-mono">.png</span>
                  </button>
                  <button
                    onClick={() => exportAsImage('jpeg')}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Download JPG</span>
                    <span className="text-[10px] text-zinc-500 font-mono">.jpg</span>
                  </button>
                  <button
                    onClick={exportAsSVG}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-800 hover:text-white flex items-center justify-between"
                  >
                    <span>Download SVG Vector</span>
                    <span className="text-[10px] text-zinc-500 font-mono">.svg</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              title={isFullscreen ? 'Restore' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </header>

        {/* PRIMARY PROMPT INPUT BAR (Run Primarily by Prompt) */}
        <div className="p-3 sm:px-4 border-b gemini-border bg-[#18191a] space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateFromPrompt();
                }}
                placeholder="Describe your document, curriculum, spec, or graphs (e.g. Quarterly revenue & profit breakdown with line charts, SLA cards, and table)..."
                className="w-full bg-[#131314] text-white placeholder-zinc-500 border border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-zinc-500 pr-24"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                {/* Optional Attached Data Indicator */}
                <label className="text-[10px] text-zinc-400 hover:text-white cursor-pointer bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5 text-zinc-300" />
                  <span>{attachedDataName ? attachedDataName.slice(0, 10) : 'Attach Data'}</span>
                  <input type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleDataUpload} />
                </label>
              </div>
            </div>

            <button
              onClick={() => handleGenerateFromPrompt()}
              disabled={isGenerating || !promptInput.trim()}
              className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Architecting Doc...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Generate Document</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Prompts For Office Workers, Developers, Coders, Teachers */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-0.5 text-[11px]">
            <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider flex-shrink-0">
              Quick Prompts:
            </span>
            {QUICK_PROMPTS.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPromptInput(tmpl.prompt);
                  handleGenerateFromPrompt(tmpl.prompt);
                }}
                className="py-1 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all flex-shrink-0 flex items-center gap-1.5"
              >
                <span>{tmpl.label}</span>
              </button>
            ))}
          </div>

          {generationError && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/30 p-2 rounded-lg">
              {generationError}
            </p>
          )}
        </div>

        {/* Secondary Action Strip (Drive Save & Reset) */}
        <div className="px-3 sm:px-4 py-1.5 border-b gemini-border bg-[#131314] flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span>Doc Title:</span>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="bg-transparent text-white font-medium outline-none border-b border-zinc-700 pb-0.5 text-xs max-w-[240px] truncate"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSaveToDrive(`${docTitle.toLowerCase().replace(/\s+/g, '_')}.html`, docHtml)}
              className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center gap-1"
            >
              <Folder className="w-3.5 h-3.5 text-white" />
              <span>Save to Google Drive</span>
            </button>
            <button
              onClick={loadDefaultTemplate}
              className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs"
              title="Reset to Baseline Template"
            >
              <RefreshCw className="w-3 h-3 text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Document Rendering / Code Viewing Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-950">
          {viewMode === 'preview' ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-none bg-slate-950"
              title="The Workspace Rendered View"
            />
          ) : (
            <div className="w-full h-full flex flex-col p-4 bg-[#131314]">
              <div className="flex justify-between items-center pb-2 text-xs text-zinc-400 border-b border-zinc-800">
                <span>HTML / Tailwind / Chart.js Source Code</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(docHtml);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-white hover:text-cyan-400"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <textarea
                value={docHtml}
                onChange={(e) => setDocHtml(e.target.value)}
                className="flex-1 w-full mt-2 bg-[#18191a] text-zinc-200 font-mono text-xs p-4 rounded-xl border border-zinc-800 outline-none resize-none custom-scroll"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
