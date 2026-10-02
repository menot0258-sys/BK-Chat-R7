import React, { useState } from 'react';
import { Image, Video, X, Download, MessageSquare, Loader2 } from 'lucide-react';

interface MediaGenModalProps {
  open: boolean;
  onClose: () => void;
  onInsertToChat: (content: string) => void;
}

export const MediaGenModal: React.FC<MediaGenModalProps> = ({
  open,
  onClose,
  onInsertToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, width: 1024, height: 1024 }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        throw new Error(data.error?.message || 'Failed to generate image');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, duration: 6 }),
      });
      const data = await res.json();
      if (data.videoData) {
        setGeneratedVideo(data.videoData);
      } else {
        throw new Error(data.error?.message || 'Failed to generate video sequence');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate video');
    } finally {
      setLoading(false);
    }
  };

  const downloadMediaFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#18191a] border gemini-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl fade-in">
        {/* Modal Header */}
        <div className="p-4 border-b gemini-border flex justify-between items-center bg-[#1e1f20]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-zinc-800 text-white">
              {activeTab === 'image' ? (
                <Image className="w-4 h-4 text-white" />
              ) : (
                <Video className="w-4 h-4 text-white" />
              )}
            </span>
            <div>
              <h3 className="text-sm font-medium text-white tracking-wide">
                {activeTab === 'image' ? 'Image Generation' : 'Video Generation'}
              </h3>
              <p className="text-[11px] text-zinc-400">Generative multi-modal AI studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        {/* Minimal Tab Selector */}
        <div className="p-2 border-b gemini-border flex gap-2 bg-[#131314]">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'image'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Image className="w-3.5 h-3.5 text-zinc-200" />
            <span>Image Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'video'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-zinc-200" />
            <span>Video Studio</span>
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Prompt</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'image'
                  ? 'Describe image prompt in detail (e.g. minimalist schematic blueprint of arc reactor on dark slate, 8k)'
                  : 'Describe dynamic motion scene (e.g. robotic arm assembling circuit board with particle lighting)'
              }
              className="w-full bg-[#131314] border gemini-border rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-zinc-500 custom-scroll"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-[#131314] border gemini-border rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="cinematic">Cinematic 8K</option>
                <option value="photorealistic">Photorealistic</option>
                <option value="minimalist technical blueprint">Technical Blueprint</option>
                <option value="holographic sci-fi">Holographic Sci-Fi</option>
                <option value="3D digital render">3D Render</option>
                <option value="cyberpunk studio">Cyberpunk Studio</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={activeTab === 'image' ? handleGenerateImage : handleGenerateVideo}
                disabled={loading || !prompt.trim()}
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{activeTab === 'image' ? 'Generate Image' : 'Generate Video'}</span>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Image Result Display */}
          {activeTab === 'image' && generatedImage && (
            <div className="p-3 bg-[#131314] border gemini-border rounded-2xl space-y-3 fade-in">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 aspect-square max-h-72 flex items-center justify-center bg-black">
                <img
                  src={generatedImage}
                  alt={prompt}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadMediaFile(generatedImage, `image_${Date.now()}.jpg`)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    onInsertToChat(`![${prompt}](${generatedImage})`);
                    onClose();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Insert to Chat</span>
                </button>
              </div>
            </div>
          )}

          {/* Video Result Display */}
          {activeTab === 'video' && generatedVideo && (
            <div className="p-3 bg-[#131314] border gemini-border rounded-2xl space-y-3 fade-in">
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black aspect-video flex flex-col justify-between p-4">
                <img
                  src={generatedVideo.posterUrl}
                  alt={prompt}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="relative z-10 flex justify-between items-start text-xs font-mono text-zinc-300">
                  <span className="bg-black/70 px-2 py-0.5 rounded border border-zinc-700 text-[10px]">
                    RENDER [JARVIS MARK 85]
                  </span>
                  <span className="bg-black/70 px-2 py-0.5 rounded border border-zinc-700 text-[10px]">
                    30 FPS • 4K
                  </span>
                </div>
                <div className="relative z-10 text-[11px] text-zinc-300 bg-black/80 p-2.5 rounded-lg border border-zinc-800">
                  {generatedVideo.scenes[0]?.description}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadMediaFile(generatedVideo.posterUrl, `video_frame_${Date.now()}.jpg`)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Frame</span>
                </button>
                <button
                  onClick={() => {
                    onInsertToChat(`### Video Sequence Generated\n\n**Scene Description:** ${prompt}\n\n![Scene Frame](${generatedVideo.posterUrl})\n\n- **Duration:** ${generatedVideo.duration}s\n- **Style:** ${generatedVideo.style}`);
                    onClose();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Insert to Chat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
