import React from 'react';

interface JarvisHUDProps {
  active: boolean;
  status: 'LISTENING' | 'THINKING / PROCESSING';
  transcript: string;
  onExit: () => void;
}

export const JarvisHUD: React.FC<JarvisHUDProps> = ({
  active,
  status,
  transcript,
  onExit,
}) => {
  return (
    <div id="jarvis-hud-overlay" className={active ? 'active' : ''}>
      {/* Top Telemetry Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3 text-xs font-mono tracking-widest text-sky-400">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 rounded-lg backdrop-blur">
          J.A.R.V.I.S. // MARK 85 • PROTOCOL ACTIVE
        </span>
        <span className="hidden sm:inline-block text-zinc-500 border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-lg">
          CPU: OPTIMAL | 44.1 kHz
        </span>
      </div>

      <button
        onClick={onExit}
        className="absolute top-6 right-6 text-zinc-400 hover:text-white border border-cyan-500/30 hover:bg-cyan-950/40 px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all"
      >
        [ EXIT INTERFACE ]
      </button>

      {/* Holographic Arc Reactor Core */}
      <div className="relative flex items-center justify-center my-8">
        <div className={`jarvis-reactor-stage ${status === 'THINKING / PROCESSING' ? 'thinking' : ''}`}>
          {/* Segmented rotating outer rings */}
          <div className="jarvis-outer-ring" />
          <div className="jarvis-middle-reticle" />
          <div className="jarvis-inner-ring" />

          {/* Center Arc Reactor Core with J.A.R.V.I.S. Text */}
          <div className="jarvis-center-core">
            <span className="text-[10px] font-mono tracking-[0.25em] text-cyan-400/80 uppercase">
              AI SYSTEM
            </span>
            <span className="text-sm font-bold tracking-[0.3em] text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">
              J.A.R.V.I.S.
            </span>
            <span className="text-[9px] font-mono tracking-widest text-cyan-300/70 mt-0.5">
              {status === 'THINKING / PROCESSING' ? 'PROCESSING' : 'ONLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Sound Frequency Waveform Bars */}
      <div className="flex items-center gap-1.5 h-8 my-4">
        {[4, 12, 22, 16, 28, 14, 20, 8, 24, 18, 10, 26, 15, 6].map((_, i) => (
          <div
            key={i}
            className="jarvis-wave-bar"
            style={{
              animationDelay: `${(i * 0.08).toFixed(2)}s`,
              height: status === 'THINKING / PROCESSING' ? '22px' : '10px',
            }}
          />
        ))}
      </div>

      {/* Live Transcript Subtitles */}
      <div className="max-w-xl text-center px-6">
        <p className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest mb-1.5">
          {status === 'THINKING / PROCESSING' ? 'NEURAL ENGINE REASONING' : 'AUDIO SENSOR INPUT'}
        </p>
        <p className="text-zinc-200 font-sans text-sm tracking-wide bg-zinc-900/60 border border-cyan-500/20 px-6 py-3 rounded-2xl backdrop-blur-md shadow-lg min-h-[48px] flex items-center justify-center">
          {transcript}
        </p>
      </div>

      {/* Bottom Interface Signature */}
      <div className="absolute bottom-6 text-[11px] font-mono tracking-widest text-zinc-500">
        BK CHAT COMPANY • J.A.R.V.I.S. OPERATING SYSTEM
      </div>
    </div>
  );
};
