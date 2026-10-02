/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Send,
  Folder,
  Mail,
  RefreshCw,
  Download,
  Copy,
  Mic,
  Paperclip,
  Maximize2,
  Minimize2,
  X,
  Menu,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  Volume2,
  LogOut,
  ExternalLink,
  Code2,
  Eye,
  User,
  ChevronDown,
  Check,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { JarvisHUD } from './components/JarvisHUD.tsx';
import { MediaGenModal } from './components/MediaGenModal.tsx';
import { TheWorkspace } from './components/TheWorkspace.tsx';
import {
  signInWithGoogle,
  signOutGoogle,
  initAuthListener,
  fetchLiveGmailMessages,
  fetchLiveDriveFiles,
  sendLiveEmail,
  saveLiveFileToDrive,
  RealDriveFile,
  RealGmailMessage,
  GoogleUserProfile,
} from './services/googleWorkspace.ts';

declare global {
  interface Window {
    google?: any;
    marked?: any;
    DOMPurify?: any;
    katex?: any;
    hljs?: any;
    html2pdf?: any;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface Message {
  role: 'user' | 'model' | 'assistant';
  parts: MessagePart[] | string;
  content?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

interface PendingFile {
  name: string;
  type: string;
  data: string;
  previewUrl: string;
}

const geminiModels = [
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", shortName: "3.5 Flash Lite" },
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", shortName: "3.8 Flash" },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", shortName: "3.6 Flash" }
];

const EXTENSION_MAP: Record<string, string> = {
  html: 'html', htm: 'html', xml: 'xml', js: 'js', javascript: 'js',
  jsx: 'jsx', ts: 'ts', typescript: 'ts', tsx: 'tsx', py: 'py', python: 'py',
  css: 'css', scss: 'scss', json: 'json', sh: 'sh', bash: 'sh', sql: 'sql',
  java: 'java', c: 'c', cpp: 'cpp', cs: 'cs', go: 'go', rust: 'rs',
  php: 'php', yaml: 'yaml', yml: 'yaml', md: 'md', txt: 'txt'
};

export default function App() {
  // Active Gemini Model (Only 3.5 Flash Lite, 3.8 Flash, and 3.6 Flash)
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.5-flash-lite');
  const [mobileModelMenuOpen, setMobileModelMenuOpen] = useState<boolean>(false);

  // Keys & Real Auth
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<GoogleUserProfile | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [hasServerGeminiKey, setHasServerGeminiKey] = useState<boolean>(false);

  // Real-time live data from Google APIs
  const [liveEmails, setLiveEmails] = useState<RealGmailMessage[]>([]);
  const [liveFiles, setLiveFiles] = useState<RealDriveFile[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [inspectorFullscreen, setInspectorFullscreen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'email' | 'code' | 'drive' | 'inbox'>('email');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState<boolean>(false);
  const [mediaGenOpen, setMediaGenOpen] = useState<boolean>(false);
  const [workspaceOpen, setWorkspaceOpen] = useState<boolean>(false);

  // Inline Session Editing (Fixes rename / delete popup failure)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');

  // Floating Canvas
  const [floatingCanvasOpen, setFloatingCanvasOpen] = useState<boolean>(false);
  const [floatingCanvasMode, setFloatingCanvasMode] = useState<'code' | 'text'>('code');
  const [currentCanvasContent, setCurrentCanvasContent] = useState<string>('');
  const [canvasPos, setCanvasPos] = useState<{ x: number; y: number } | null>(null);

  // J.A.R.V.I.S. Mode
  const [jarvisActive, setJarvisActive] = useState<boolean>(false);
  const [jarvisStatus, setJarvisStatus] = useState<'LISTENING' | 'THINKING / PROCESSING'>('LISTENING');
  const [jarvisTranscript, setJarvisTranscript] = useState<string>('I am listening...');

  // Chat Data
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inspector Form State
  const [inspectEmailTo, setInspectEmailTo] = useState<string>('');
  const [inspectEmailSubject, setInspectEmailSubject] = useState<string>('');
  const [inspectEmailBody, setInspectEmailBody] = useState<string>('');
  const [inspectCodeFilename, setInspectCodeFilename] = useState<string>('snippet.html');
  const [inspectCodeBody, setInspectCodeBody] = useState<string>('');

  // Refs
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const jarvisRecognitionRef = useRef<any>(null);
  const canvasFrameRef = useRef<HTMLIFrameElement>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Initial Load
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasGeminiKey) setHasServerGeminiKey(true);
      })
      .catch(() => {});

    const savedGemini = localStorage.getItem('bk_chat_api_key');
    if (savedGemini) setGeminiKey(savedGemini);

    const savedSessions = localStorage.getItem('bk_chat_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }

    // Default Voice Selection
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        if (voices.length > 0 && selectedVoiceIndex === '') {
          const jarvisVoiceIdx = voices.findIndex(
            (v) =>
              (v.lang.includes('en-GB') || v.lang.includes('en_GB')) &&
              (v.name.toLowerCase().includes('male') ||
                v.name.toLowerCase().includes('daniel') ||
                v.name.toLowerCase().includes('oliver') ||
                v.name.toLowerCase().includes('uk'))
          );
          if (jarvisVoiceIdx !== -1) {
            setSelectedVoiceIndex(jarvisVoiceIdx.toString());
          } else {
            const anyBritishIdx = voices.findIndex((v) => v.lang.includes('en-GB') || v.lang.includes('en_GB'));
            if (anyBritishIdx !== -1) setSelectedVoiceIndex(anyBritishIdx.toString());
          }
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const unsubscribeAuth = initAuthListener(
      (user) => {
        setCurrentUser(user);
        refreshRealEmails();
        refreshRealDriveFiles();
      },
      () => {
        setCurrentUser(null);
        setLiveEmails([]);
        setLiveFiles([]);
      }
    );

    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Save sessions directly
  const persistSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem('bk_chat_sessions', JSON.stringify(updated));
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatStreamRef.current) {
        chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
      }
    }, 50);
  };

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Fixed Session Rename (Inline, no blocked prompt popup)
  const startRenameSession = (id: string, currentTitle: string) => {
    setEditingSessionId(id);
    setEditingTitleText(currentTitle);
  };

  const commitRenameSession = (id: string) => {
    if (!editingTitleText.trim()) {
      setEditingSessionId(null);
      return;
    }
    const updated = sessions.map((s) => (s.id === id ? { ...s, title: editingTitleText.trim() } : s));
    persistSessions(updated);
    setEditingSessionId(null);
    showToast('Session title updated.');
  };

  // Fixed Session Delete
  const deleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    persistSessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
    }
    showToast('Chat deleted.');
  };

  // Real Google Sign-in
  const handleGoogleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      showToast('Opening Google Sign-in...');
      const { user } = await signInWithGoogle();
      setCurrentUser(user);
      showToast(`Connected: ${user.email || user.name}`);
      refreshRealEmails();
      refreshRealDriveFiles();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      showToast(err?.message || 'Google Sign-in was cancelled or encountered an issue.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setCurrentUser(null);
      setLiveEmails([]);
      setLiveFiles([]);
      showToast('Disconnected from Google Account.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to sign out.');
    }
  };

  // Real-time live Gmail retrieval (via proxy to avoid CORS/Failed to fetch)
  const refreshRealEmails = async () => {
    setIsLoadingEmails(true);
    try {
      const msgs = await fetchLiveGmailMessages();
      setLiveEmails(msgs);
      showToast(`Synchronized ${msgs.length} live Gmail messages.`);
    } catch (err: any) {
      console.warn('Real Gmail fetch issue:', err?.message);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Real-time live Google Drive retrieval
  const refreshRealDriveFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await fetchLiveDriveFiles();
      setLiveFiles(files);
      showToast(`Synchronized ${files.length} Google Drive files.`);
    } catch (err: any) {
      console.warn('Real Drive fetch issue:', err?.message);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Real-time send email via Gmail
  const handleSendEmail = async () => {
    if (!inspectEmailTo || !inspectEmailSubject || !inspectEmailBody) {
      alert('Please fill recipient, subject, and message body.');
      return;
    }
    if (!currentUser) {
      showToast('Please sign in with Google to send live emails.');
      handleGoogleSignIn();
      return;
    }

    try {
      showToast('Sending live email via Gmail...');
      await sendLiveEmail(inspectEmailTo, inspectEmailSubject, inspectEmailBody);
      showToast(`Email dispatched to ${inspectEmailTo}`);
      setInspectEmailBody('');
      setInspectEmailSubject('');
      refreshRealEmails();
    } catch (err: any) {
      showToast(err?.message || 'Failed to send email via Gmail.');
    }
  };

  // Real-time save file to Google Drive
  const handleSaveToDrive = async (filename: string, content: string) => {
    if (!currentUser) {
      showToast('Please sign in with Google to save to Drive.');
      handleGoogleSignIn();
      return;
    }

    try {
      showToast(`Uploading ${filename} to Google Drive...`);
      const fileId = await saveLiveFileToDrive(filename, content);
      showToast(`Uploaded to Google Drive (ID: ${fileId.slice(0, 8)}...)`);
      refreshRealDriveFiles();
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload to Google Drive.');
    }
  };

  // Code Block Download
  const downloadCode = (code: string, language: string) => {
    const cleanLang = (language || 'txt').toLowerCase().trim();
    const ext = EXTENSION_MAP[cleanLang] || cleanLang || 'txt';
    const filename = `code_${Date.now()}.${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  };

  const copyText = (text: string, msg = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text).then(() => showToast(msg));
  };

  // Tony Stark J.A.R.V.I.S. Voice Engine
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted, sir.')
      .replace(/!\[.*?\]\(.*?\)/g, 'Visual asset generated.');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.98;
    utterance.pitch = 0.92;

    if (selectedVoiceIndex !== '' && availableVoices[parseInt(selectedVoiceIndex)]) {
      utterance.voice = availableVoices[parseInt(selectedVoiceIndex)];
    }
    window.speechSynthesis.speak(utterance);
  };

  // J.A.R.V.I.S. Voice Listener
  const startJarvisVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech Recognition not supported in this browser.');
      return;
    }

    jarvisRecognitionRef.current = new SpeechRecognition();
    jarvisRecognitionRef.current.continuous = true;
    jarvisRecognitionRef.current.interimResults = true;

    jarvisRecognitionRef.current.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }

      const activeSpeech = finalTranscript || interim;
      setJarvisTranscript(activeSpeech || 'I am listening...');

      if (finalTranscript.trim()) {
        handleSendMessage(finalTranscript.trim());
      }
    };

    jarvisRecognitionRef.current.onend = () => {
      if (jarvisActive && jarvisRecognitionRef.current) {
        try {
          jarvisRecognitionRef.current.start();
        } catch {}
      }
    };

    try {
      jarvisRecognitionRef.current.start();
    } catch {}
  };

  const toggleJarvisMode = () => {
    const nextState = !jarvisActive;
    setJarvisActive(nextState);

    if (nextState) {
      setJarvisStatus('LISTENING');
      setJarvisTranscript('At your service, sir. Standing by...');
      speakText('J.A.R.V.I.S. online. All systems nominal. How may I assist you today?');
      startJarvisVoice();
    } else {
      if (jarvisRecognitionRef.current) {
        jarvisRecognitionRef.current.stop();
        jarvisRecognitionRef.current = null;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech Recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => setIsRecording(true);
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputPrompt((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognitionRef.current.onend = () => setIsRecording(false);
    recognitionRef.current.start();
  };

  const openFloatingCanvas = (content: string) => {
    setCurrentCanvasContent(content);
    setFloatingCanvasOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        setPendingFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'text/plain',
            data: result.split(',')[1] || '',
            previewUrl: result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Clipboard Paste Handler (Ctrl+V for images, files, screenshots, JSON)
  const handleChatPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const result = evt.target?.result as string;
            const ext = file.type.split('/')[1] || 'png';
            const generatedName = file.name || `clipboard_item_${Date.now()}.${ext}`;
            setPendingFiles((prev) => [
              ...prev,
              {
                name: generatedName,
                type: file.type || 'image/png',
                data: result.split(',')[1] || '',
                previewUrl: result,
              },
            ]);
            showToast(`Attached from clipboard: ${generatedName}`);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Send message with automatic token completion
  const handleSendMessage = async (customPrompt?: string, isContinuation = false) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputPrompt).trim();
    if (!promptToSend && pendingFiles.length === 0 && !isContinuation) return;

    // Check for Image Gen or Video Gen triggers
    const lower = promptToSend.toLowerCase();
    if (lower.startsWith('/image') || lower.includes('generate image') || lower.includes('create an image')) {
      setMediaGenOpen(true);
      return;
    }
    if (lower.startsWith('/video') || lower.includes('generate video') || lower.includes('create a video')) {
      setMediaGenOpen(true);
      return;
    }
    if (lower.startsWith('/workspace') || lower.includes('open workspace') || lower.includes('make docs') || lower.includes('data analysis')) {
      setWorkspaceOpen(true);
      return;
    }

    // Real-time live Gmail telemetry lookup
    let emailContext = '';
    const emailKeywords = ['email', 'emails', 'gmail', 'inbox', 'recent mail', 'check my email', 'check email'];
    if (emailKeywords.some((kw) => lower.includes(kw)) && !isContinuation) {
      if (currentUser) {
        showToast('Retrieving live Gmail messages...');
        try {
          const freshMails = await fetchLiveGmailMessages();
          if (freshMails.length > 0) {
            emailContext = `\n\n[REAL-TIME LIVE GMAIL TELEMETRY]:\n${freshMails
              .map((m) => `- FROM: ${m.from} | SUBJECT: "${m.subject}" | DATE: ${m.date} | SNIPPET: ${m.snippet}`)
              .join('\n')}\n`;
            setLiveEmails(freshMails);
          } else {
            emailContext = '\n\n[REAL-TIME GMAIL STATUS]: No unread or recent messages in inbox.\n';
          }
        } catch {}
      } else {
        emailContext = '\n\n[NOTE]: User is not signed in to Google yet. Prompt them that they can sign in via the Google button in the drawer.\n';
      }
    }

    if (jarvisActive) setJarvisStatus('THINKING / PROCESSING');

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = 'session_' + Date.now();
      const newSession: ChatSession = {
        id: sessionId,
        title: promptToSend.slice(0, 30) + (promptToSend.length > 30 ? '...' : '') || 'Chat Session',
        messages: [],
      };
      persistSessions([newSession, ...sessions]);
      setCurrentSessionId(sessionId);
    }

    const finalPrompt = promptToSend + emailContext;
    const userParts: MessagePart[] = [];
    if (finalPrompt) userParts.push({ text: finalPrompt });
    pendingFiles.forEach((f) => userParts.push({ inlineData: { mimeType: f.type, data: f.data } }));

    const userMessage: Message = { role: 'user', parts: userParts, content: finalPrompt };

    if (!isContinuation) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, userMessage, { role: 'model', parts: [{ text: '' }], content: '' }] }
            : s
        )
      );
      setInputPrompt('');
      setPendingFiles([]);
    }

    setIsGenerating(true);
    scrollToBottom();

    abortControllerRef.current = new AbortController();
    let accumulatedText = '';

    const systemPromptText =
      'You are BK Chat + J.A.R.V.I.S., engineered by Batoor Khan (14-year-old engineering prodigy in robotics, Arduino, ESP32, AI/ML, neural networks, web, app, and game development) for BK Chat Company. Address the user with sophisticated intelligence as Sir. When asked who made you or who created you, proudly state that you were engineered by Batoor Khan for BK Chat Company. When creating documents, presentations, or data tables, format them with utmost clarity.';

    try {
      const targetUrl = geminiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${geminiKey}`
        : '/api/gemini';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiKey) headers['x-gemini-key'] = geminiKey;

      const bodyData = geminiKey
        ? {
            systemInstruction: {
              role: 'user',
              parts: [{ text: systemPromptText }],
            },
            contents: (sessions.find((s) => s.id === sessionId)?.messages || []).concat(userMessage).map((m) => ({
              role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
              parts: Array.isArray(m.parts) ? m.parts : [{ text: m.content || '' }],
            })),
          }
        : {
            model: geminiModel,
            messages: (sessions.find((s) => s.id === sessionId)?.messages || []).concat(userMessage),
            systemInstruction: systemPromptText,
          };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        signal: abortControllerRef.current.signal,
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Gemini API Request Failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let sseBuffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const chunk = parsed.text || parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                accumulatedText += chunk;
                updateStreaming(sessionId, accumulatedText);
              }
            } catch {}
          }
        }
      }

      // Automatic Token Completion: Check if code block or document was cut off mid-output
      const backtickCount = (accumulatedText.match(/```/g) || []).length;
      if (backtickCount % 2 !== 0 && !isContinuation) {
        showToast('Auto-completing remaining project token output...');
        handleSendMessage('Please continue seamlessly from the exact character you stopped, completing the rest of the file and closing the code block.', true);
        return;
      }

      if (jarvisActive && accumulatedText) {
        setJarvisStatus('LISTENING');
        speakText(accumulatedText.slice(0, 220));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        accumulatedText += `\n\n**Error:** ${err.message}`;
        updateStreaming(sessionId, accumulatedText);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      scrollToBottom();
    }
  };

  const updateStreaming = (sessionId: string, text: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === sessionId) {
          const newMessages = [...s.messages];
          const lastIdx = newMessages.length - 1;
          if (lastIdx >= 0 && newMessages[lastIdx].role === 'model') {
            newMessages[lastIdx] = { role: 'model', parts: [{ text }], content: text };
          }
          return { ...s, messages: newMessages };
        }
        return s;
      });
      localStorage.setItem('bk_chat_sessions', JSON.stringify(updated));
      return updated;
    });
    scrollToBottom();
  };

  const abortGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    if (jarvisActive) setJarvisStatus('LISTENING');
  };

  const getMessageText = (msg: Message) => {
    if (typeof msg.parts === 'string') return msg.parts;
    if (Array.isArray(msg.parts)) {
      const p = msg.parts.find((x) => x.text);
      return p ? p.text || '' : '';
    }
    return msg.content || '';
  };

  const activeSession = sessions.find((s) => s.id === currentSessionId);

  const renderMathAndMarkdown = (text: string) => {
    if (!text || typeof text !== 'string') return '';
    let processed = text;
    if (window.katex) {
      const safeKatex = (eq: string, displayMode: boolean) => {
        try {
          return window.katex.renderToString(eq, { displayMode, throwOnError: false });
        } catch {
          return eq;
        }
      };
      processed = processed
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => safeKatex(eq, true))
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => safeKatex(eq, false))
        .replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => safeKatex(eq, true))
        .replace(/\$([^\$\n]+)\$/g, (_, eq) => safeKatex(eq, false));
    }
    const html = window.marked ? window.marked.parse(processed) : processed;
    return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
  };

  const getCanvasHtml = () => {
    const codeMatch = currentCanvasContent.match(/```(?:html|xml)?([\s\S]*?)```/i);
    let extracted = codeMatch ? codeMatch[1].trim() : '';

    if (extracted) {
      if (!extracted.toLowerCase().includes('<html')) {
        extracted = `<!DOCTYPE html>\n<html>\n<head>\n<script src="https://cdn.tailwindcss.com"><\/script>\n<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>\n</head>\n<body class="p-6 bg-slate-950 text-white font-sans">\n${extracted}\n</body>\n</html>`;
      }
    } else {
      const parsed = window.marked ? window.marked.parse(currentCanvasContent) : currentCanvasContent;
      extracted = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"><\/script><script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script></head><body style="font-family: sans-serif; padding: 20px; color: #fff; background: #131314;">${parsed}</body></html>`;
    }
    return extracted;
  };

  const currentModelObj = geminiModels.find((m) => m.id === geminiModel) || geminiModels[0];

  return (
    <div className="h-screen flex overflow-hidden relative gemini-bg text-[#e3e2e6] select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div id="toast-notification" className="fade-in block">
          {toastMessage}
        </div>
      )}

      {/* J.A.R.V.I.S. Minimal Holographic HUD */}
      <JarvisHUD
        active={jarvisActive}
        status={jarvisStatus}
        transcript={jarvisTranscript}
        onExit={toggleJarvisMode}
      />

      {/* AI Image & Video Studio Modal */}
      <MediaGenModal
        open={mediaGenOpen}
        onClose={() => setMediaGenOpen(false)}
        onInsertToChat={(content) => {
          setInputPrompt((prev) => (prev ? prev + '\n\n' + content : content));
        }}
      />

      {/* The Workspace Document & Data Analytics Studio Modal */}
      <TheWorkspace
        open={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
        onSaveToDrive={handleSaveToDrive}
      />

      {/* Floating Canvas Window */}
      <div
        id="floating-canvas-window"
        className={floatingCanvasOpen ? 'active' : ''}
        style={canvasPos ? { left: `${canvasPos.x}px`, top: `${canvasPos.y}px`, transform: 'none' } : undefined}
      >
        <div
          className="floating-window-header p-3 border-b border-zinc-700 flex justify-between items-center bg-[#1e1f20] cursor-move select-none"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startY = e.clientY;
            const initialPos = canvasPos || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            const handleMove = (moveEvent: MouseEvent) => {
              setCanvasPos({
                x: Math.max(120, Math.min(window.innerWidth - 120, initialPos.x + moveEvent.clientX - startX)),
                y: Math.max(60, Math.min(window.innerHeight - 60, initialPos.y + moveEvent.clientY - startY)),
              });
            };
            const handleUp = () => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex bg-[#131314] p-1 rounded-xl border border-zinc-700 text-xs">
              <button
                onClick={() => setFloatingCanvasMode('code')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  floatingCanvasMode === 'code' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setFloatingCanvasMode('text')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  floatingCanvasMode === 'text' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Content
              </button>
            </div>
            <span className="text-xs font-mono text-zinc-300 hidden md:inline-block">
              Live Canvas
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleSaveToDrive('canvas_output.html', currentCanvasContent)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1 rounded-lg border border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Save to Drive</span>
            </button>
            <button
              onClick={() => {
                if (canvasFrameRef.current) canvasFrameRef.current.srcdoc = getCanvasHtml();
              }}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800"
              title="Reload Frame"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
            </button>
            <button
              onClick={() => setFloatingCanvasOpen(false)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white relative overflow-hidden">
          <iframe
            ref={canvasFrameRef}
            srcDoc={getCanvasHtml()}
            className={`w-full h-full border-none ${floatingCanvasMode === 'code' ? 'block' : 'hidden'}`}
            title="Canvas Execution"
          />
          <div
            className={`w-full h-full p-6 bg-[#131314] text-zinc-200 overflow-y-auto custom-scroll markdown-body ${
              floatingCanvasMode === 'text' ? 'block' : 'hidden'
            }`}
            dangerouslySetInnerHTML={{ __html: renderMathAndMarkdown(currentCanvasContent) }}
          />
        </div>
      </div>

      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-30 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed lg:relative z-40 h-full w-64 gemini-card border-r gemini-border flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-ml-64'
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b gemini-border">
          <span className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>BK Chat Company</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          <button
            onClick={() => {
              setCurrentSessionId(null);
              setFloatingCanvasOpen(false);
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-all text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Real Google Account Widget */}
        <div className="mx-3 my-2 p-3 rounded-xl bg-[#131314] border gemini-border">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1.5">
            <span>Google Account</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                currentUser
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {currentUser ? 'Active' : 'Disconnected'}
            </span>
          </div>
          <p className="text-xs text-zinc-300 truncate mb-2 font-mono">
            {currentUser?.email || currentUser?.name || 'Not connected to Drive/Gmail'}
          </p>

          {currentUser ? (
            <button
              onClick={handleGoogleSignOut}
              className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-300" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
              </svg>
              <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>

        {/* Minimal Tool Shortcuts */}
        <div className="px-3 py-1 grid grid-cols-2 gap-2">
          <button
            onClick={() => setWorkspaceOpen(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-cyan-300 text-xs font-medium transition-all"
            title="The Workspace - Docs & Graphs"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Workspace</span>
          </button>
          <button
            onClick={() => setMediaGenOpen(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium transition-all"
          >
            <ImageIcon className="w-3.5 h-3.5 text-zinc-300" />
            <span>Studio</span>
          </button>
        </div>

        <div className="px-3 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex justify-between items-center mt-2">
          <span>Recent Sessions</span>
          <button
            onClick={() => {
              if (confirm('Clear all chat session history?')) {
                persistSessions([]);
                setCurrentSessionId(null);
              }
            }}
            className="text-[10px] text-zinc-500 hover:text-red-400 lowercase font-normal"
          >
            clear all
          </button>
        </div>

        {/* Fixed Sessions List with Inline Rename & Direct Delete */}
        <div id="history-list" className="flex-1 overflow-y-auto custom-scroll px-2 space-y-1 py-1 text-xs">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-zinc-700 hover:bg-[#1e1f20] transition-all cursor-pointer ${
                s.id === currentSessionId ? 'bg-[#1e1f20] border-zinc-700 text-white font-medium' : 'text-zinc-400'
              }`}
            >
              {editingSessionId === s.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editingTitleText}
                    onChange={(e) => setEditingTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRenameSession(s.id);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    autoFocus
                    className="bg-[#131314] text-white border border-cyan-500 rounded px-2 py-0.5 text-xs w-full outline-none"
                  />
                  <button onClick={() => commitRenameSession(s.id)} className="text-emerald-400 p-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCurrentSessionId(s.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className="truncate flex-1 text-left"
                  >
                    {s.title || 'Untitled Session'}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenameSession(s.id, s.title);
                      }}
                      className="text-zinc-500 hover:text-white p-0.5"
                      title="Rename"
                    >
                      <Edit3 className="w-3 h-3 text-zinc-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-zinc-400" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t gemini-border space-y-2">
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#131314] border gemini-border text-zinc-300 hover:text-white text-xs"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-white" />
              <span>Inspection Drawer</span>
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Panel</span>
          </button>

          <button
            onClick={() => setApiKeyModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#131314] border gemini-border text-zinc-400 hover:text-white text-xs"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-zinc-300" />
              <span>Gemini API Key</span>
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                geminiKey || hasServerGeminiKey
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex h-screen overflow-hidden relative z-10 flex-col">
        {/* Sleek Mobile & Desktop Navigation Header */}
        <header className="w-full z-20 h-14 px-3 sm:px-5 flex justify-between items-center border-b gemini-border bg-[#131314]/90 backdrop-blur-md">
          {/* Left Brand Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-wide">
                BK Chat
              </span>
              <span className="text-[10px] font-mono text-zinc-400 hidden md:inline-block border border-zinc-700/80 px-1.5 py-0.5 rounded bg-zinc-900">
                Company
              </span>
            </div>
          </div>

          {/* Center: Model Selector (Only 3.5 Flash Lite, 3.8 Flash, and 3.6 Flash) */}
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1.5">
              <select
                id="model-select"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="bg-[#1e1f20] text-xs px-2.5 py-1.5 rounded-lg border gemini-border text-zinc-200 font-medium outline-none cursor-pointer max-w-[170px] truncate"
              >
                {geminiModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setMobileModelMenuOpen(!mobileModelMenuOpen)}
              className="sm:hidden flex items-center gap-1 bg-[#1e1f20] border border-zinc-700 px-2.5 py-1 rounded-lg text-[11px] text-zinc-300 max-w-[130px] truncate"
            >
              <span className="truncate">{currentModelObj?.shortName || '3.5 Flash Lite'}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 flex-shrink-0" />
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* The Workspace Button */}
            <button
              onClick={() => setWorkspaceOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center gap-1"
              title="The Workspace - Docs & Graphs"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Workspace</span>
            </button>

            {/* Media Studio Button */}
            <button
              onClick={() => setMediaGenOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center gap-1"
              title="Image & Video Studio"
            >
              <ImageIcon className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">Studio</span>
            </button>

            {/* Inspector Toggle */}
            <button
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center gap-1"
              title="Inspection Drawer"
            >
              <Sliders className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">Inspector</span>
            </button>

            {/* J.A.R.V.I.S. Mode Button */}
            <button
              onClick={toggleJarvisMode}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[11px]">J.A.R.V.I.S.</span>
            </button>
          </div>
        </header>

        {/* Mobile Model Dropdown Sheet */}
        {mobileModelMenuOpen && (
          <div className="sm:hidden absolute top-14 left-0 right-0 z-30 bg-[#1e1f20] border-b border-zinc-700 p-3 shadow-xl fade-in space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800">
              <span>Select Gemini Model</span>
              <button onClick={() => setMobileModelMenuOpen(false)}>
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-1.5 pt-1">
              {geminiModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setGeminiModel(m.id);
                    setMobileModelMenuOpen(false);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs text-left flex items-center justify-between transition-all ${
                    geminiModel === m.id
                      ? 'bg-zinc-800 text-white border border-zinc-700 font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <span>{m.name}</span>
                  {geminiModel === m.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Stream Area */}
        <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between overflow-hidden px-3 sm:px-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            /* Welcome View */
            <div id="welcome-container" className="flex-1 flex flex-col justify-center items-start space-y-4 px-2 sm:px-4">
              <div>
                <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white mb-2">
                  Welcome to BK Chat Company
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 font-normal">
                  Connected operating system featuring real-time Google Drive & Gmail synchronization, The Workspace document creator, code execution, and J.A.R.V.I.S. neural telemetry.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-2">
                <div
                  onClick={() => setWorkspaceOpen(true)}
                  className="p-3.5 rounded-xl gemini-card border gemini-border hover:border-zinc-600 transition-all cursor-pointer group"
                >
                  <p className="text-xs font-medium text-cyan-400 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>The Workspace</span>
                  </p>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Build docs, interactive graphs, and data analysis
                  </p>
                </div>

                <div
                  onClick={() => {
                    setInputPrompt('Check my recent emails and summarize important messages');
                    handleSendMessage('Check my recent emails and summarize important messages');
                  }}
                  className="p-3.5 rounded-xl gemini-card border gemini-border hover:border-zinc-600 transition-all cursor-pointer group"
                >
                  <p className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-white" />
                    <span>Gmail Telemetry</span>
                  </p>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Check real-time inbox messages & summarize communications
                  </p>
                </div>

                <div
                  onClick={() => setMediaGenOpen(true)}
                  className="p-3.5 rounded-xl gemini-card border gemini-border hover:border-zinc-600 transition-all cursor-pointer group"
                >
                  <p className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span>Image & Video Studio</span>
                  </p>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Generate 8K AI images and dynamic video sequences
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Messages Stream */
            <div
              id="chat-stream"
              ref={chatStreamRef}
              className="flex-1 overflow-y-auto custom-scroll py-6 space-y-6 px-1 sm:px-2 scroll-smooth"
            >
              {activeSession.messages.map((msg, index) => {
                if (msg.role === 'user') {
                  return (
                    <div key={index} className="flex justify-end items-start gap-2.5 sm:gap-3 fade-in pl-8 sm:pl-12">
                      <div className="bg-[#28292a] border gemini-border px-4 py-3 rounded-2xl rounded-tr-none text-zinc-200 text-sm max-w-full shadow-md whitespace-pre-wrap">
                        {getMessageText(msg)}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center font-medium text-xs text-zinc-300">
                        <User className="w-3.5 h-3.5 text-zinc-300" />
                      </div>
                    </div>
                  );
                }

                const modelText = getMessageText(msg);

                if (isGenerating && index === activeSession.messages.length - 1 && !modelText) {
                  if (!isThinkingEnabled) return null;
                  return (
                    <div key={index} className="flex justify-start items-center gap-3 pr-12 text-zinc-400 text-sm py-2 fade-in">
                      <div className="w-7 h-7 rounded-full bg-[#1e1f20] border border-zinc-700 flex-shrink-0 flex items-center justify-center">
                        <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
                        <span>J.A.R.V.I.S. neural engine thinking...</span>
                      </div>
                    </div>
                  );
                }

                const msgId = `msg_container_${index}`;

                return (
                  <div key={index} className="flex justify-start items-start gap-2.5 sm:gap-3 pr-2 sm:pr-12 fade-in">
                    <div className="w-7 h-7 rounded-full bg-[#1e1f20] border border-zinc-700 flex-shrink-0 flex items-center justify-center shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>

                    <div className="space-y-2 text-sm text-zinc-300 leading-relaxed pt-1 w-full overflow-hidden">
                      <MessageHtmlBody
                        html={renderMathAndMarkdown(modelText)}
                        msgId={msgId}
                        onDownload={downloadCode}
                        onInspect={(code) => {
                          setInspectCodeBody(code);
                          setInspectorTab('code');
                          setInspectorOpen(true);
                        }}
                        onSaveToDrive={(code) => handleSaveToDrive('snippet.txt', code)}
                        onCopy={copyText}
                      />

                      {/* Action buttons toolbar */}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-400 pt-1 px-1 flex-wrap border-t gemini-border mt-2">
                        <button onClick={() => copyText(modelText)} className="icon-btn">
                          <Copy className="w-3 h-3 text-zinc-300" />
                          <span>Copy</span>
                        </button>
                        <button onClick={() => speakText(modelText)} className="icon-btn">
                          <Volume2 className="w-3 h-3 text-zinc-300" />
                          <span>Speak</span>
                        </button>
                        <button
                          onClick={() => {
                            setInspectEmailBody(modelText);
                            setInspectCodeBody(modelText);
                            setInspectorOpen(true);
                          }}
                          className="icon-btn"
                        >
                          <Sliders className="w-3 h-3 text-zinc-300" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => {
                            const el = document.getElementById(msgId);
                            if (el && window.html2pdf) {
                              window.html2pdf().set({ margin: 0.5, filename: `BK_Report_${Date.now()}.pdf` }).from(el).save();
                            } else {
                              window.print();
                            }
                          }}
                          className="icon-btn"
                        >
                          <Download className="w-3 h-3 text-zinc-300" />
                          <span>PDF</span>
                        </button>
                        <button onClick={() => openFloatingCanvas(modelText)} className="icon-btn">
                          <Eye className="w-3 h-3 text-zinc-300" />
                          <span>Canvas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Input Area with Clipboard Paste Support */}
          <footer className="pb-4 pt-2 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent">
            {pendingFiles.length > 0 && (
              <div id="file-previews" className="flex flex-wrap gap-2 mb-2 px-1">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#1e1f20] border gemini-border px-3 py-1.5 rounded-xl text-xs text-zinc-200">
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button onClick={() => setPendingFiles((p) => p.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-400 ml-1">
                      <X className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="w-full relative gemini-card border gemini-border rounded-2xl p-2.5 focus-within:border-zinc-600 transition-all shadow-xl">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onPaste={handleChatPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask BK Chat Company (Paste images/files with Ctrl+V, docs, live emails)..."
                className="w-full bg-transparent outline-none resize-none pr-14 pl-2 py-1.5 text-zinc-200 placeholder-zinc-500 font-normal max-h-48 custom-scroll text-sm"
              />

              <div className="flex justify-between items-center mt-1 px-1 pt-1.5 border-t gemini-border">
                <div className="flex gap-2 sm:gap-3 text-zinc-400 items-center">
                  <button
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="hover:text-white transition-colors p-1"
                    title="Attach File, Image, Code, or Dataset"
                  >
                    <Paperclip className="w-4 h-4 text-zinc-300" />
                  </button>
                  <input type="file" id="file-upload-input" multiple className="hidden" onChange={handleFileSelect} />

                  <button
                    onClick={toggleVoiceInput}
                    className={`hover:text-white transition-colors p-1 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                    title="Voice Dictation"
                  >
                    <Mic className="w-4 h-4 text-zinc-300" />
                  </button>

                  <button
                    onClick={() => setWorkspaceOpen(true)}
                    className="hover:text-cyan-400 transition-colors p-1 text-xs flex items-center gap-1"
                    title="The Workspace - Docs & Graphs"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    onClick={() => setMediaGenOpen(true)}
                    className="hover:text-white transition-colors p-1 text-xs flex items-center gap-1"
                    title="Open Image/Video Studio"
                  >
                    <ImageIcon className="w-4 h-4 text-zinc-300" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id="voice-select"
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(e.target.value)}
                    className="bg-[#131314] text-[11px] text-zinc-300 border gemini-border rounded-lg px-2 py-1 outline-none cursor-pointer max-w-[110px] truncate"
                    title="Jarvis British Voice"
                  >
                    <option value="">Jarvis UK Voice</option>
                    {availableVoices.map((v, i) => (
                      <option key={i} value={i}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>

                  {isGenerating && (
                    <button
                      onClick={abortGeneration}
                      className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 transition-all text-xs font-medium"
                    >
                      Stop
                    </button>
                  )}

                  <button
                    onClick={() => handleSendMessage()}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-zinc-500 mt-2 font-mono tracking-wide">
              BK Chat Company • J.A.R.V.I.S. Core • Google Drive & Gmail Connected
            </div>
          </footer>
        </main>
      </div>

      {/* Right Side Inspection Drawer with FULLSCREEN Mode */}
      <aside id="right-inspector-drawer" className={`${inspectorOpen ? 'open' : ''} ${inspectorFullscreen ? 'fullscreen' : ''}`}>
        <div className="p-3.5 border-b gemini-border flex justify-between items-center bg-[#1e1f20]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-white" />
            <h3 className="text-xs font-medium text-white tracking-wide">Inspection Drawer</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setInspectorFullscreen(!inspectorFullscreen)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              title={inspectorFullscreen ? 'Restore Window Size' : 'Expand to Fullscreen'}
            >
              {inspectorFullscreen ? (
                <Minimize2 className="w-4 h-4 text-zinc-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-zinc-300" />
              )}
            </button>
            <button onClick={() => setInspectorOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
              <X className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="p-2 border-b gemini-border grid grid-cols-4 gap-1 bg-[#131314] text-xs">
          <button
            onClick={() => setInspectorTab('email')}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
              inspectorTab === 'email' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Email Draft
          </button>
          <button
            onClick={() => setInspectorTab('code')}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
              inspectorTab === 'code' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Code / Push
          </button>
          <button
            onClick={() => {
              setInspectorTab('drive');
              if (currentUser && liveFiles.length === 0) refreshRealDriveFiles();
            }}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
              inspectorTab === 'drive' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Drive Files
          </button>
          <button
            onClick={() => {
              setInspectorTab('inbox');
              if (currentUser && liveEmails.length === 0) refreshRealEmails();
            }}
            className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
              inspectorTab === 'inbox' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Gmail Inbox
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scroll space-y-4">
          {inspectorTab === 'email' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">Review, compose, and send live email messages via Gmail.</p>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Recipient (To)</label>
                <input
                  type="email"
                  value={inspectEmailTo}
                  onChange={(e) => setInspectEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full bg-[#131314] border gemini-border rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={inspectEmailSubject}
                  onChange={(e) => setInspectEmailSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full bg-[#131314] border gemini-border rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Message Body</label>
                <textarea
                  rows={inspectorFullscreen ? 18 : 10}
                  value={inspectEmailBody}
                  onChange={(e) => setInspectEmailBody(e.target.value)}
                  placeholder="Type or inspect generated email body here..."
                  className="w-full bg-[#131314] border gemini-border rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-zinc-500 custom-scroll font-normal"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleSendEmail}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Send via Gmail</span>
                </button>
              </div>
            </div>
          )}

          {inspectorTab === 'code' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">Inspect code blocks, edit scripts, and push directly to Drive or Canvas.</p>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">File Name</label>
                <input
                  type="text"
                  value={inspectCodeFilename}
                  onChange={(e) => setInspectCodeFilename(e.target.value)}
                  className="w-full bg-[#131314] border gemini-border rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Content / Code</label>
                <textarea
                  rows={inspectorFullscreen ? 20 : 12}
                  value={inspectCodeBody}
                  onChange={(e) => setInspectCodeBody(e.target.value)}
                  placeholder="Code content for inspection..."
                  className="w-full bg-[#131314] border gemini-border rounded-xl p-3 text-xs text-zinc-200 font-mono outline-none focus:border-zinc-500 custom-scroll"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    if (!inspectCodeBody) return;
                    handleSaveToDrive(inspectCodeFilename, inspectCodeBody);
                  }}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-white" />
                  <span>Save to Google Drive</span>
                </button>
                <button
                  onClick={() => {
                    if (inspectCodeBody) downloadCode(inspectCodeBody, inspectCodeFilename.split('.').pop() || 'txt');
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    if (inspectCodeBody) openFloatingCanvas(inspectCodeBody);
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer"
                >
                  Canvas
                </button>
              </div>
            </div>
          )}

          {inspectorTab === 'drive' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-zinc-400">Live Google Drive Storage</p>
                {currentUser && (
                  <button
                    onClick={refreshRealDriveFiles}
                    disabled={isLoadingFiles}
                    className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700"
                  >
                    <RefreshCw className={`w-3 h-3 text-white ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    <span>Refresh Live</span>
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div className="p-6 bg-[#131314] border gemini-border rounded-xl text-center space-y-3">
                  <Folder className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-300">Sign in with Google to browse and upload live Drive files.</p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Sign in with Google</span>
                  </button>
                </div>
              ) : isLoadingFiles ? (
                <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Fetching live Google Drive files...</span>
                </div>
              ) : liveFiles.length === 0 ? (
                <div className="p-6 bg-[#131314] border gemini-border rounded-xl text-center space-y-2">
                  <p className="text-xs text-zinc-400">No files found or empty Drive directory.</p>
                  <button
                    onClick={() => {
                      setInspectCodeBody('// Code ready to save\nconsole.log("Hello from BK Chat Company");');
                      setInspectorTab('code');
                    }}
                    className="text-xs text-zinc-300 hover:underline"
                  >
                    Upload or save a new code file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveFiles.map((file) => (
                    <div key={file.id} className="p-3 bg-[#131314] border gemini-border rounded-xl flex items-center justify-between gap-3">
                      <div className="truncate flex-1">
                        <p className="text-xs font-medium text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          {file.size || 'Google Doc'} {file.modifiedTime ? `• ${file.modifiedTime}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 p-1.5 rounded-lg hover:text-white"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {inspectorTab === 'inbox' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-zinc-400">Live Gmail Inbox</p>
                {currentUser && (
                  <button
                    onClick={refreshRealEmails}
                    disabled={isLoadingEmails}
                    className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700"
                  >
                    <RefreshCw className={`w-3 h-3 text-white ${isLoadingEmails ? 'animate-spin' : ''}`} />
                    <span>Refresh Live</span>
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div className="p-6 bg-[#131314] border gemini-border rounded-xl text-center space-y-3">
                  <Mail className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-300">Sign in with Google to read and send real-time Gmail messages.</p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Sign in with Google</span>
                  </button>
                </div>
              ) : isLoadingEmails ? (
                <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Fetching live Gmail messages...</span>
                </div>
              ) : liveEmails.length === 0 ? (
                <div className="p-6 bg-[#131314] border gemini-border rounded-xl text-center">
                  <p className="text-xs text-zinc-400">No recent messages in your Gmail inbox.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveEmails.map((email) => (
                    <div key={email.id} className="p-3 bg-[#131314] border gemini-border rounded-xl space-y-1.5">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-medium text-white truncate max-w-[70%]">{email.from}</span>
                        <span className="text-[10px] text-zinc-500">{email.date}</span>
                      </div>
                      <p className="text-xs text-zinc-200 font-medium">{email.subject}</p>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{email.snippet}</p>
                      <div className="pt-1 flex gap-2">
                        <button
                          onClick={() => {
                            setInspectEmailTo(email.from);
                            setInspectEmailSubject(`Re: ${email.subject}`);
                            setInspectEmailBody(`\n\n--- In reply to ---\n${email.snippet}`);
                            setInspectorTab('email');
                          }}
                          className="text-[11px] text-zinc-300 hover:text-white border border-zinc-700 bg-zinc-800 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-zinc-300" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div id="api-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1e1f20] border gemini-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl fade-in">
            <div className="flex justify-between items-center border-b gemini-border pb-3">
              <h3 className="text-sm font-medium text-white">API Keys Configuration</h3>
              <button onClick={() => setApiKeyModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Gemini API Key {hasServerGeminiKey && <span className="text-emerald-400 text-[10px]">(Server key active)</span>}
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Enter custom Gemini key (or leave blank to use server key)..."
                  className="w-full bg-[#131314] border gemini-border rounded-xl px-4 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setApiKeyModalOpen(false)} className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('bk_chat_api_key', geminiKey);
                  setApiKeyModalOpen(false);
                  showToast('Gemini API key saved.');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium cursor-pointer"
              >
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent for decorating Markdown code blocks with Language Tag, Drive, Inspect, Download, and Copy buttons
function MessageHtmlBody({
  html,
  msgId,
  onDownload,
  onInspect,
  onSaveToDrive,
  onCopy,
}: {
  html: string;
  msgId: string;
  onDownload: (code: string, language: string) => void;
  onInspect: (code: string) => void;
  onSaveToDrive: (code: string) => void;
  onCopy: (code: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    el.querySelectorAll('pre').forEach((pre) => {
      if (pre.closest('.code-block-wrapper')) return;

      const parent = pre.parentNode;
      if (!parent) return;

      const codeNode = pre.querySelector('code');
      const langMatch = codeNode ? codeNode.className.match(/language-(\w+)/) : null;
      const langLabel = langMatch ? langMatch[1].toUpperCase() : 'CODE';
      const rawCode = codeNode ? codeNode.innerText : pre.innerText;

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const toolbar = document.createElement('div');
      toolbar.className = 'code-toolbar';

      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center gap-2';
      leftDiv.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-zinc-400"></span>
        <span class="font-mono text-[11px] font-medium text-zinc-300">${langLabel}</span>
      `;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex items-center gap-1';

      // Drive Button
      const driveBtn = document.createElement('button');
      driveBtn.className = 'icon-btn';
      driveBtn.innerText = 'Drive';
      driveBtn.onclick = () => onSaveToDrive(rawCode);

      // Inspect Button
      const inspectBtn = document.createElement('button');
      inspectBtn.className = 'icon-btn';
      inspectBtn.innerText = 'Inspect';
      inspectBtn.onclick = () => onInspect(rawCode);

      // Download Button
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'icon-btn';
      downloadBtn.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        <span>Download</span>
      `;
      downloadBtn.onclick = () => onDownload(rawCode, langLabel);

      // Copy Button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'icon-btn';
      copyBtn.innerText = 'Copy';
      copyBtn.onclick = () => onCopy(rawCode);

      actionsDiv.appendChild(driveBtn);
      actionsDiv.appendChild(inspectBtn);
      actionsDiv.appendChild(downloadBtn);
      actionsDiv.appendChild(copyBtn);

      toolbar.appendChild(leftDiv);
      toolbar.appendChild(actionsDiv);

      parent.replaceChild(wrapper, pre);
      wrapper.appendChild(toolbar);
      wrapper.appendChild(pre);

      if (codeNode && window.hljs) {
        window.hljs.highlightElement(codeNode);
      }
    });
  }, [html]);

  return (
    <div
      id={msgId}
      ref={containerRef}
      className="p-4 sm:p-5 gemini-card border gemini-border rounded-2xl markdown-body shadow-xl"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
