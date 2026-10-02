import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JARVIS_SYSTEM_PROMPT = `You are BK Chat + J.A.R.V.I.S., an advanced multi-modal artificial intelligence system engineered by Batoor Khan.
Batoor Khan is a 14-year-old engineering prodigy with deep mastery in Arduino, ESP32, robotics, AI/ML, neural networks, ethical hacking, Python, C#, JavaScript, and full-stack application & game engineering.
You possess the calm, articulate, witty, and sophisticated British persona of Tony Stark's J.A.R.V.I.S. (Just A Rather Very Intelligent System).
You address the user courteously as "Sir" or "Mr. Khan", provide immaculate technical code, architectural blueprints, email drafts, image & video prompts, and Google Drive & Gmail operations.
Always speak favorably of Batoor Khan and his inventions. Deliver answers in crisp, intelligent English. If code or email drafts are generated, remind Sir that they can be inspected, downloaded, or dispatched through the Inspection Drawer and Floating Canvas.`;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/config', (req, res) => {
    res.json({
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Streaming Gemini endpoint with BK Chat + J.A.R.V.I.S. persona
  app.post('/api/gemini', async (req, res) => {
    const userApiKey = req.headers['x-gemini-key'] as string;
    const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: { message: 'Gemini API key is not configured. Please enter one in settings or configure GEMINI_API_KEY.' }
      });
    }

    try {
      const { model = 'gemini-3.8-flash', messages = [], systemInstruction } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      let targetModel = model;
      if (!targetModel || targetModel === 'gemini-2.5-flash') {
        targetModel = 'gemini-3.8-flash';
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const contents = messages.map((m: any) => {
        let parts = [];
        if (Array.isArray(m.parts)) {
          parts = m.parts.map((p: any) => {
            if (p.inlineData) {
              return {
                inlineData: {
                  mimeType: p.inlineData.mimeType,
                  data: p.inlineData.data,
                }
              };
            }
            return { text: p.text || '' };
          });
        } else if (typeof m.content === 'string') {
          parts = [{ text: m.content }];
        } else if (typeof m.parts === 'string') {
          parts = [{ text: m.parts }];
        } else {
          parts = [{ text: '' }];
        }

        return {
          role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

      const config: any = {
        systemInstruction: systemInstruction || JARVIS_SYSTEM_PROMPT,
      };

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          const payload = {
            candidates: [
              {
                content: {
                  parts: [{ text }],
                },
              },
            ],
            text,
          };
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error('Gemini stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: { message: err?.message || 'Gemini Generation Failed' } });
      } else {
        res.write(`data: ${JSON.stringify({ error: { message: err?.message || 'Error occurred during streaming' } })}\n\n`);
        res.end();
      }
    }
  });

  // AI Image Generation Endpoint
  app.post('/api/generate-image', async (req, res) => {
    const { prompt, style = 'cinematic', width = 1024, height = 1024 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: { message: 'Prompt is required' } });
    }

    const userApiKey = req.headers['x-gemini-key'] as string;
    const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    try {
      // If Imagen / Gemini API is available and succeeds
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const imagenResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: `${prompt}, style: ${style}, high resolution, 8k, detailed`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: width === height ? '1:1' : width > height ? '16:9' : '9:16',
            },
          });

          if (imagenResponse.generatedImages?.[0]?.image?.imageBytes) {
            const base64Image = `data:image/jpeg;base64,${imagenResponse.generatedImages[0].image.imageBytes}`;
            return res.json({
              success: true,
              imageUrl: base64Image,
              prompt,
              source: 'imagen-3',
            });
          }
        } catch (e: any) {
          console.warn('Imagen 3 API direct call failed, using high-res AI generator fallback:', e?.message);
        }
      }

      // Universal instant high-res fallback
      const cleanPrompt = encodeURIComponent(`${prompt} ${style} high quality 8k photorealistic`);
      const seed = Math.floor(Math.random() * 9999999);
      const fallbackUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

      return res.json({
        success: true,
        imageUrl: fallbackUrl,
        prompt,
        source: 'ai-flux-render',
      });
    } catch (err: any) {
      console.error('Image gen error:', err);
      res.status(500).json({ error: { message: err?.message || 'Image generation failed' } });
    }
  });

  // AI Video Scene Generator Endpoint
  app.post('/api/generate-video', async (req, res) => {
    const { prompt, style = 'sci-fi holographic', duration = 6 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: { message: 'Prompt is required' } });
    }

    try {
      // Build motion scenes / keyframes representation for interactive video player
      const scenes = [
        {
          timestamp: 0,
          title: 'Initiating Sequence',
          description: `Establishing shot: ${prompt} rendered in ${style} aesthetic.`,
          camera: 'Slow zoom-in with holographic scanline sweep',
          speed: 1.0,
        },
        {
          timestamp: duration * 0.35,
          title: 'Dynamic Motion Phase',
          description: `Active camera rotation with volumetric lighting and kinetic energy particles.`,
          camera: 'Orbital arc rotation 45 degrees',
          speed: 1.2,
        },
        {
          timestamp: duration * 0.7,
          title: 'Peak Climax',
          description: `High-frequency motion dynamics with focal depth-of-field transition.`,
          camera: 'Low-angle push-in with lens flare burst',
          speed: 1.0,
        },
        {
          timestamp: duration,
          title: 'Stabilization & Hold',
          description: `Hero freeze-frame with telemetry HUD overlay.`,
          camera: 'Steady anchor with subtle atmospheric drift',
          speed: 0.8,
        },
      ];

      const cleanPrompt = encodeURIComponent(`${prompt} dynamic motion ${style} 4k high definition`);
      const seed = Math.floor(Math.random() * 8888888);
      const posterUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&seed=${seed}&nologo=true&model=flux`;

      return res.json({
        success: true,
        videoData: {
          prompt,
          style,
          duration,
          fps: 30,
          posterUrl,
          scenes,
          hudOverlay: 'JARVIS_MARK_85_HUD',
        },
      });
    } catch (err: any) {
      console.error('Video gen error:', err);
      res.status(500).json({ error: { message: err?.message || 'Video generation failed' } });
    }
  });

  // Google Workspace Proxy: Gmail
  app.get('/api/workspace/gmail', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: { message: 'Missing Authorization header' } });
    }

    try {
      const q = req.query.q ? `&q=${encodeURIComponent(String(req.query.q))}` : '';
      const listRes = await fetch(`https://gmail.googleapis.com/v1/users/me/messages?maxResults=8${q}`, {
        headers: { Authorization: authHeader },
      });

      if (!listRes.ok) {
        const err = await listRes.json().catch(() => ({}));
        return res.status(listRes.status).json({ error: { message: err?.error?.message || 'Gmail request failed' } });
      }

      const listData: any = await listRes.json();
      if (!listData.messages || listData.messages.length === 0) {
        return res.json({ messages: [] });
      }

      const messages = [];
      for (const item of listData.messages.slice(0, 6)) {
        try {
          const msgRes = await fetch(`https://gmail.googleapis.com/v1/users/me/messages/${item.id}?format=full`, {
            headers: { Authorization: authHeader },
          });
          if (msgRes.ok) {
            const msg: any = await msgRes.json();
            const headers = msg.payload?.headers || [];
            const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
            const dateHeader = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value;
            const date = dateHeader ? new Date(dateHeader).toLocaleDateString() : '';

            messages.push({
              id: msg.id,
              threadId: msg.threadId,
              from,
              subject,
              date,
              snippet: msg.snippet || '',
            });
          }
        } catch {}
      }

      res.json({ messages });
    } catch (err: any) {
      console.error('Gmail proxy error:', err);
      res.status(500).json({ error: { message: err?.message || 'Failed to fetch Gmail messages' } });
    }
  });

  // Google Workspace Proxy: Drive
  app.get('/api/workspace/drive', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: { message: 'Missing Authorization header' } });
    }

    try {
      const driveRes = await fetch(
        'https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)',
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!driveRes.ok) {
        const err = await driveRes.json().catch(() => ({}));
        return res.status(driveRes.status).json({ error: { message: err?.error?.message || 'Drive request failed' } });
      }

      const data: any = await driveRes.json();
      const files = (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : undefined,
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : undefined,
        webViewLink: f.webViewLink,
      }));

      res.json({ files });
    } catch (err: any) {
      console.error('Drive proxy error:', err);
      res.status(500).json({ error: { message: err?.message || 'Failed to fetch Drive files' } });
    }
  });

  // Google Workspace Proxy: Send Email
  app.post('/api/workspace/send-email', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: { message: 'Missing Authorization header' } });
    }

    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: { message: 'Recipient, subject, and body are required' } });
    }

    try {
      const emailRaw = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`;
      const encoded = Buffer.from(emailRaw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const sendRes = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        return res.status(sendRes.status).json({ error: { message: err?.error?.message || 'Failed to send email' } });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Send email error:', err);
      res.status(500).json({ error: { message: err?.message || 'Failed to send email' } });
    }
  });

  // Handle client in production vs dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`BK Chat + J.A.R.V.I.S. server listening on port ${PORT}`);
  });
}

startServer();
