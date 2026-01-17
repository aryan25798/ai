'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math'; // ✅ ADDED: For parsing math
import rehypeKatex from 'rehype-katex'; // ✅ ADDED: For rendering math
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css'; // ✅ ADDED: Math CSS

import { 
  Copy, Check, Terminal, Cpu, Sparkles, Plus, MessageSquare, Trash2, LogIn, LogOut, Menu, X, User as UserIcon, 
  Image as ImageIcon, Mic, Volume2, StopCircle, VolumeX, Camera, ScanText, Maximize2, Minimize2, ArrowLeft, Shield
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs, writeBatch, getDoc, setDoc, updateDoc 
} from 'firebase/firestore';
import Login from '@/components/Login';
import CameraModal from '@/components/CameraModal';

// --- TYPES ---
type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
  provider?: 'groq' | 'google';
  createdAt?: any;
};

type Session = {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
};

// --- UTILS ---
const sanitizeInput = (str: string) => str.replace(/[<>]/g, '');

// --- COMPONENTS ---

// 1. Code Block with Copy Feature
const CodeBlock = ({ language, code }: { language: string, code: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden bg-[#1e1f20] border border-[#2c2d2e] shadow-lg w-full group">
      <div className="flex justify-between items-center bg-[#262729] px-4 py-2 border-b border-[#2c2d2e] select-none">
        <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400 font-mono">{language || 'text'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md">
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto w-full">
        <SyntaxHighlighter 
          language={language?.toLowerCase() || 'text'} 
          style={vscDarkPlus} 
          PreTag="div" 
          showLineNumbers={true} 
          wrapLines={true} 
          customStyle={{ margin: 0, padding: '1rem', background: '#1e1f20', fontSize: '13px', lineHeight: '1.6' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// 2. Markdown Renderer (Industry Grade & Responsive)
const MarkdownRenderer = ({ 
  content, 
  msgId, 
  isSpeaking, 
  onToggleSpeak 
}: { 
  content: string, 
  msgId: string, 
  isSpeaking: boolean, 
  onToggleSpeak: (text: string, id: string) => void 
}) => {
  return (
    <div className="relative group max-w-full">
      <button 
        onClick={() => onToggleSpeak(content, msgId)}
        className={`absolute top-0 right-0 p-2 rounded-lg transition-all duration-200 z-10
          ${isSpeaking 
            ? 'bg-red-500/10 text-red-400 opacity-100 ring-1 ring-red-500/50' 
            : 'text-gray-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100 mobile-visible'
          }`}
        title={isSpeaking ? "Stop Reading" : "Read Aloud"}
        aria-label={isSpeaking ? "Stop Reading" : "Read Aloud"}
      >
        {isSpeaking ? <StopCircle size={16} className="animate-pulse" /> : <Volume2 size={16} />}
      </button>

      <div className="pr-8">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]} // ✅ ADDED remarkMath
          rehypePlugins={[rehypeKatex]} // ✅ ADDED rehypeKatex
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? 
                <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} /> : 
                <code className="bg-[#2c2d2e] text-orange-200 px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-white/5 break-words whitespace-pre-wrap" {...props}>{children}</code>;
            },
            p({ children }) { return <p className="mb-4 text-[15px] leading-7 text-gray-200">{children}</p>; },
            ul({ children }) { return <ul className="list-disc pl-5 mb-4 space-y-2 text-gray-300 text-[15px] marker:text-gray-500">{children}</ul>; },
            ol({ children }) { return <ol className="list-decimal pl-5 mb-4 space-y-2 text-gray-300 text-[15px] marker:text-gray-500">{children}</ol>; },
            h1({ children }) { return <h1 className="text-xl md:text-2xl font-bold mb-4 text-white pb-2 border-b border-gray-700/50">{children}</h1>; },
            h2({ children }) { return <h2 className="text-lg md:text-xl font-bold mb-3 text-white mt-6">{children}</h2>; },
            h3({ children }) { return <h3 className="text-base md:text-lg font-bold mb-2 text-white mt-4">{children}</h3>; },
            a({ children, href }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-400 transition-all">{children}</a>; },
            blockquote({ children }) { return <blockquote className="border-l-4 border-blue-500/30 pl-4 py-1 my-4 bg-blue-500/5 rounded-r-lg italic text-gray-400">{children}</blockquote>; },
            table({ children }) { return <div className="overflow-x-auto my-4 rounded-lg border border-gray-700/50"><table className="min-w-full text-left text-sm text-gray-300">{children}</table></div>; },
            th({ children }) { return <th className="bg-[#262729] p-3 font-semibold text-white border-b border-gray-700">{children}</th>; },
            td({ children }) { return <td className="p-3 border-b border-gray-700/50">{children}</td>; },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Focus Mode State
  const [focusedProvider, setFocusedProvider] = useState<'groq' | 'google' | null>(null);

  // User Role State (For Admin Portal Access)
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);

  // Media & Tools
  const [image, setImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const [cameraMode, setCameraMode] = useState<'capture' | 'scan' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null); 

  // Data
  const [groqMessages, setGroqMessages] = useState<Message[]>([]);
  const [googleMessages, setGoogleMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const groqEndRef = useRef<HTMLDivElement>(null);
  const googleEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. AUTH & INIT
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setSidebarOpen(window.innerWidth >= 1024);
    }

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        
        // --- ✅ CRITICAL FIX: ENSURE USER DATABASE ENTRY EXISTS ---
        const userRef = doc(db, 'users', currentUser.uid);
        
        try {
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName || 'User',
                    photoURL: currentUser.photoURL,
                    role: 'user', // Default Role
                    status: 'approved', // Default Status
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
            } else {
                // Update last login timestamp
                await updateDoc(userRef, { lastLogin: serverTimestamp() });
            }
        } catch (err) {
            console.error("Error creating/updating user profile:", err);
        }

        // --- REAL-TIME SECURITY CHECK & ROLE SYNC ---
        const unsubUser = onSnapshot(userRef, (docSnap) => {
             const data = docSnap.data();
             if (data) {
                 // Kick user if status is revoked (unless admin)
                 if ((data.status === 'banned' || data.status === 'pending') && data.role !== 'admin') {
                     alert("Access Revoked: Your account is pending approval or has been banned.");
                     signOut(auth);
                     window.location.reload();
                     return;
                 }
                 // Store Role
                 setUserRole(data.role);
             }
        });

        setUser(currentUser);
        setAuthLoading(false);
        
        // Load Session if exists
        const savedSessionId = localStorage.getItem('turboLastSession');
        if (savedSessionId) setCurrentSessionId(savedSessionId);

        // Load History List
        const q = query(collection(db, 'sessions'), where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        const unsubSessions = onSnapshot(q, (snapshot) => {
          setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
        });

        // Cleanup listeners
        return () => {
            unsubUser();
            unsubSessions();
        };

      } else {
        setSessions([]); setGroqMessages([]); setGoogleMessages([]);
        localStorage.removeItem('turboLastSession');
        setUser(null);
        setAuthLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. LOAD CHAT
  useEffect(() => {
    if (currentSessionId && user) {
      setGroqMessages([]); setGoogleMessages([]); 
      const qGroq = query(collection(db, 'chats'), where('sessionId', '==', currentSessionId), where('provider', '==', 'groq'), orderBy('createdAt', 'asc'));
      const unsubGroq = onSnapshot(qGroq, (snapshot) => setGroqMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))));
      const qGoogle = query(collection(db, 'chats'), where('sessionId', '==', currentSessionId), where('provider', '==', 'google'), orderBy('createdAt', 'asc'));
      const unsubGoogle = onSnapshot(qGoogle, (snapshot) => setGoogleMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))));
      return () => { unsubGroq(); unsubGoogle(); };
    } else {
      setGroqMessages([]); setGoogleMessages([]);
    }
  }, [currentSessionId, user]);

  useEffect(() => { 
      if (!focusedProvider || focusedProvider === 'groq') groqEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [groqMessages, focusedProvider]);
  
  useEffect(() => { 
      if (!focusedProvider || focusedProvider === 'google') googleEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [googleMessages, focusedProvider]);

  // --- ACTIONS ---
  const handleLogout = async () => { await signOut(auth); startNewChat(); };
  
  const startNewChat = () => {
    setCurrentSessionId(null);
    localStorage.removeItem('turboLastSession');
    setGroqMessages([]); setGoogleMessages([]);
    setImage(null);
    stopSpeaking();
    setFocusedProvider(null);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const selectSession = (sessId: string) => {
    setCurrentSessionId(sessId);
    localStorage.setItem('turboLastSession', sessId);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const deleteSession = async (e: React.MouseEvent, sessId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    
    if (currentSessionId === sessId) startNewChat();

    try {
      await deleteDoc(doc(db, 'sessions', sessId));
      const q = query(collection(db, 'chats'), where('sessionId', '==', sessId));
      const snapshot = await getDocs(q);
      const BATCH_SIZE = 450;
      let batch = writeBatch(db);
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db); 
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete chat history.");
    }
  };

  // --- MEDIA ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; } 
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input requires Chrome/Edge.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.start();
  };

  const toggleSpeak = (text: string, msgId: string) => {
    if (isSpeaking && speakingMessageId === msgId) {
        stopSpeaking();
        return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingMessageId(msgId);
    };
    utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
    };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => { 
      window.speechSynthesis.cancel(); 
      setIsSpeaking(false); 
      setSpeakingMessageId(null);
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const streamAnswer = async (provider: 'groq' | 'google', currentHistory: Message[], sessId: string, signal: AbortSignal, imgData: string | null) => {
    try {
      const apiHistory = currentHistory.map(({ role, content }) => ({ role, content }));
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages: apiHistory, 
            provider, 
            image: imgData,
            userId: user?.uid // ✅ ADDED USER ID FOR SECURITY CHECK
        }),
        signal: signal
      });
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = '';
      const tempId = 'temp_' + Date.now();
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        fullResponse += chunkValue;
        const updateState = provider === 'groq' ? setGroqMessages : setGoogleMessages;
        updateState(prev => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          if (lastMsg && lastMsg.id === tempId) lastMsg.content = fullResponse;
          else newHistory.push({ id: tempId, role: 'assistant', content: fullResponse, provider });
          return newHistory;
        });
      }
      await addDoc(collection(db, 'chats'), { sessionId: sessId, role: 'assistant', content: fullResponse, provider, createdAt: serverTimestamp() });
    } catch (err: any) { if (err.name !== 'AbortError') console.error(err); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = sanitizeInput(input); 
    if ((!cleanInput.trim() && !image) || !user) return;
    
    if (loading) stopGenerating();
    stopSpeaking(); 
    setLoading(true);
    setInput('');
    setImage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        title: cleanInput.substring(0, 30) + (cleanInput.length > 30 ? '...' : '') || "Image Query",
        createdAt: serverTimestamp()
      });
      activeSessionId = docRef.id;
      setCurrentSessionId(activeSessionId);
      localStorage.setItem('turboLastSession', activeSessionId);
    }

    const tempId = 'temp_user_' + Date.now();
    const userMsg: Message = { id: tempId, role: 'user', content: cleanInput, image: image, provider: 'google' };

    // Update Local State based on active mode
    if (!focusedProvider || focusedProvider === 'google') setGoogleMessages(prev => [...prev, userMsg]);
    if (!focusedProvider || focusedProvider === 'groq') setGroqMessages(prev => [...prev, { ...userMsg, provider: 'groq' }]);

    const promises = [];

    // Log user message to DB
    promises.push(addDoc(collection(db, 'chats'), { sessionId: activeSessionId, role: 'user', content: cleanInput, image: image, provider: 'google', createdAt: serverTimestamp() }));
    if (!focusedProvider) {
        promises.push(addDoc(collection(db, 'chats'), { sessionId: activeSessionId, role: 'user', content: cleanInput, provider: 'groq', createdAt: serverTimestamp() }));
    }

    // --- ✅ STRICT PROVIDER LOGIC START ---
    // If Image: ONLY Gemini (Google)
    // If Text Only: Both (or Focused)
    
    // 1. Google (Gemini) - Always runs if focused OR dual mode OR image present
    if (image || !focusedProvider || focusedProvider === 'google') {
        promises.push(streamAnswer('google', [...googleMessages, userMsg], activeSessionId!, controller.signal, image));
    }

    // 2. Groq (Llama) - Runs ONLY if NO image AND (focused OR dual mode)
    if (!image && (!focusedProvider || focusedProvider === 'groq')) {
        promises.push(streamAnswer('groq', [...groqMessages, { ...userMsg, provider: 'groq' }], activeSessionId!, controller.signal, null));
    } else if (image && focusedProvider === 'groq') {
       // If user was focused on Groq but sent an image, we quietly switch to Gemini above
       // and update the focus state to avoid confusion
       setFocusedProvider('google');
    }
    // --- ✅ STRICT PROVIDER LOGIC END ---

    await Promise.all(promises);
    setLoading(false);
    abortControllerRef.current = null;
  };

  if (authLoading) return <div className="flex h-[100dvh] items-center justify-center bg-[#131314] text-white"><Cpu size={48} className="text-purple-500 animate-pulse" /></div>;
  if (!user) return <Login />;

  return (
    <div className="flex h-[100dvh] bg-[#131314] text-gray-100 font-sans overflow-hidden selection:bg-purple-500/30 selection:text-white">
      
      {/* CAMERA MODAL */}
      {cameraMode && (
        <CameraModal 
          mode={cameraMode}
          onClose={() => setCameraMode(null)}
          onCapture={(imgSrc) => { setImage(imgSrc); setCameraMode(null); }}
          onScan={(text) => { setInput(text); setCameraMode(null); }}
        />
      )}

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-[#1e1f20] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
          lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-none'} 
          overflow-hidden whitespace-nowrap
        `}
      >
        <div className="p-4 flex flex-col gap-4 min-w-[280px]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-2 text-gray-400 hover:bg-[#333537] hover:text-white rounded-full transition-colors active:scale-95"
              title="Close Menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-bold text-gray-200 px-2 lg:block hidden tracking-wide">TurboLearn</span>
          </div>

          {/* NEW: Admin Portal Button (Only visible if role is 'admin') */}
          {userRole === 'admin' && (
             <button 
               onClick={() => window.location.href='/admin'} 
               className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-red-900/20 text-red-400 border border-red-500/20 hover:bg-red-900/30 transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-900/10 mb-1"
             >
               <Shield size={14} /> Admin Portal
             </button>
          )}

          <button onClick={startNewChat} className="flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#1a1b1c] to-[#202123] hover:from-[#333537] hover:to-[#383a3c] transition-all text-sm font-medium text-gray-200 shadow-md border border-white/5 active:scale-95">
            <Plus size={18} className="text-gray-400" /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 min-w-[280px]">
          <div className="text-[10px] font-bold text-gray-500 mb-2 px-3 mt-2 uppercase tracking-widest">History</div>
          <div className="space-y-1">
            {sessions.map((sess) => (
              <div key={sess.id} onClick={() => selectSession(sess.id)}
                className={`group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer text-sm transition-all border border-transparent ${currentSessionId === sess.id ? 'bg-[#004a77]/30 text-blue-100 border-blue-500/20 shadow-sm' : 'text-gray-400 hover:bg-[#282a2c] hover:text-gray-200'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className="flex-none opacity-70" />
                  <span className="truncate w-40">{sess.title}</span>
                </div>
                <button 
                    onClick={(e) => deleteSession(e, sess.id)} 
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:text-red-400 p-1.5 transition-opacity"
                    title="Delete Chat"
                >
                    <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-white/5 bg-[#171819] min-w-[280px]">
          <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#2c2d2e] rounded-xl cursor-pointer transition-colors group" onClick={handleLogout}>
              {user.photoURL ? <img src={user.photoURL} className="w-8 h-8 rounded-full border border-gray-600 group-hover:border-gray-400 transition-colors" /> : <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center"><UserIcon size={16} /></div>}
              <div className="text-sm font-medium truncate flex-1 text-gray-200">{user.displayName}</div>
              <LogOut size={16} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-[100dvh] relative bg-[#131314] w-full min-w-0">
        
        {/* HEADER (Floating) */}
        <div className="flex-none h-16 flex items-center px-4 z-20 absolute top-0 w-full bg-transparent pointer-events-none">
          {/* Header content only visible when standard view, otherwise hidden to not obstruct focus mode */}
          <div className={`flex items-center w-full pointer-events-auto ${focusedProvider ? 'hidden' : ''}`}>
            <button 
              onClick={() => setSidebarOpen(true)} 
              className={`p-2 text-gray-400 hover:bg-[#2c2d2e]/80 hover:text-white rounded-full transition-colors mr-3 active:scale-95 backdrop-blur-sm ${sidebarOpen ? 'lg:hidden opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <Menu size={24} />
            </button>

            {!currentSessionId && groqMessages.length === 0 && <span className="text-base md:text-lg font-medium text-gray-500 mx-auto pointer-events-none tracking-tight opacity-50">TurboLearn AI</span>}
            
            {isSpeaking && (
              <button onClick={stopSpeaking} className="ml-auto flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 backdrop-blur-md text-red-400 px-4 py-1.5 rounded-full shadow-lg transition-all animate-pulse text-xs font-bold z-50">
                <VolumeX size={14} /> <span className="hidden md:inline">Stop Reading</span>
              </button>
            )}
          </div>
        </div>

        {/* CHAT SCROLL AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 pb-0 pt-16">
          <div className={`mx-auto h-full pb-40 transition-all duration-300 ${focusedProvider ? 'max-w-5xl' : (sidebarOpen ? 'max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6' : 'max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6')}`}>
            
            {/* GROQ CARD */}
            {(!focusedProvider || focusedProvider === 'groq') && (
              <div className={`flex flex-col rounded-2xl bg-[#1e1f20] border border-[#2c2d2e] shadow-xl relative overflow-hidden transition-all duration-300
                ${focusedProvider === 'groq' ? 'h-full border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.1)]' : 'min-h-[40vh] lg:min-h-0'}
              `}>
                <div className="flex items-center justify-between px-5 py-3 bg-[#1e1f20]/90 backdrop-blur-sm border-b border-[#2c2d2e] sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    {focusedProvider === 'groq' && <button onClick={() => setFocusedProvider(null)}><ArrowLeft size={18} className="text-gray-400 hover:text-white mr-2" /></button>}
                    <Cpu size={16} className="text-orange-400" />
                    <span className="font-semibold text-gray-200 text-xs md:text-sm tracking-wide">Llama 3.3 (Reasoning)</span>
                  </div>
                  <button 
                    onClick={() => setFocusedProvider(focusedProvider === 'groq' ? null : 'groq')}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title={focusedProvider === 'groq' ? "Minimize" : "Focus Mode"}
                  >
                    {focusedProvider === 'groq' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
                <div className="flex-1 p-4 md:p-5 overflow-y-auto custom-scrollbar">
                  {!currentSessionId && groqMessages.length === 0 && <div className="h-40 md:h-full flex flex-col gap-2 items-center justify-center text-gray-700 opacity-40"><Cpu size={48} /><span className="text-xs font-medium">Ready</span></div>}
                  {groqMessages.map((m, i) => (
                    <div key={i} className={`mb-6 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[95%] md:max-w-[90%] ${m.role === 'user' ? 'bg-[#2c2d2e] px-4 py-3 rounded-2xl rounded-tr-none' : ''}`}>
                        <div className="prose prose-invert max-w-none text-gray-100 text-sm leading-relaxed break-words">
                            {m.role === 'user' ? <p>{m.content}</p> : <MarkdownRenderer content={m.content} msgId={m.id || `groq-${i}`} isSpeaking={speakingMessageId === (m.id || `groq-${i}`)} onToggleSpeak={toggleSpeak} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={groqEndRef} />
                </div>
              </div>
            )}

            {/* GEMINI CARD */}
            {(!focusedProvider || focusedProvider === 'google') && (
              <div className={`flex flex-col rounded-2xl bg-[#1e1f20] border border-[#2c2d2e] shadow-xl overflow-hidden transition-all duration-300
                ${focusedProvider === 'google' ? 'h-full border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.1)]' : 'min-h-[40vh] lg:min-h-0'}
              `}>
                <div className="flex items-center justify-between px-5 py-3 bg-[#1e1f20]/90 backdrop-blur-sm border-b border-[#2c2d2e] sticky top-0 z-10">
                  <div className="flex items-center gap-2">
                    {focusedProvider === 'google' && <button onClick={() => setFocusedProvider(null)}><ArrowLeft size={18} className="text-gray-400 hover:text-white mr-2" /></button>}
                    <Sparkles size={16} className="text-blue-400" />
                    <span className="font-semibold text-gray-200 text-xs md:text-sm tracking-wide">Gemini 2.5 (Vision)</span>
                  </div>
                  <button 
                    onClick={() => setFocusedProvider(focusedProvider === 'google' ? null : 'google')}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title={focusedProvider === 'google' ? "Minimize" : "Focus Mode"}
                  >
                    {focusedProvider === 'google' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
                <div className="flex-1 p-4 md:p-5 overflow-y-auto custom-scrollbar">
                  {!currentSessionId && googleMessages.length === 0 && <div className="h-40 md:h-full flex flex-col gap-2 items-center justify-center text-gray-700 opacity-40"><Sparkles size={48} /><span className="text-xs font-medium">Ready</span></div>}
                  {googleMessages.map((m, i) => (
                    <div key={i} className={`mb-6 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[95%] md:max-w-[90%] ${m.role === 'user' ? 'bg-[#2c2d2e] px-4 py-3 rounded-2xl rounded-tr-none' : ''}`}>
                         {m.image && (<div className="mb-3"><img src={m.image} alt="Upload" className="max-h-48 rounded-lg border border-[#3c3d3e] object-contain bg-black/50" /></div>)}
                         <div className="prose prose-invert max-w-none text-gray-100 text-sm leading-relaxed break-words">
                           {m.role === 'user' ? <p>{m.content}</p> : <MarkdownRenderer content={m.content} msgId={m.id || `google-${i}`} isSpeaking={speakingMessageId === (m.id || `google-${i}`)} onToggleSpeak={toggleSpeak} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={googleEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INPUT AREA (Fixed Bottom with Glassmorphism) */}
        <div className="flex-none p-3 md:p-6 bg-gradient-to-t from-[#131314] via-[#131314] to-transparent pb-[calc(env(safe-area-inset-bottom)+12px)] absolute bottom-0 w-full z-20">
          <div className={`mx-auto relative transition-all duration-300 ${focusedProvider ? 'max-w-3xl' : (sidebarOpen ? 'max-w-4xl' : 'max-w-5xl')}`}>
            
            {/* Image Preview */}
            {image && (
              <div className="absolute -top-16 left-0 bg-[#1e1f20]/90 backdrop-blur-md p-2 rounded-xl border border-[#2c2d2e] flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-2 z-10">
                <img src={image} alt="Preview" className="h-10 w-10 object-cover rounded-lg" />
                <span className="text-xs text-gray-400 font-medium">Image attached</span>
                <button onClick={() => setImage(null)} className="p-1 hover:text-red-400 text-gray-400 transition-colors"><X size={14}/></button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : focusedProvider ? `Talk to ${focusedProvider === 'groq' ? 'Llama' : 'Gemini'}...` : "Ask anything or scan..."}
                className={`w-full bg-[#1e1f20]/80 backdrop-blur-xl text-gray-100 placeholder-gray-500 rounded-full py-4 pl-36 pr-28 
                  focus:outline-none focus:bg-[#1e1f20] focus:ring-1 focus:ring-white/10 focus:shadow-[0_0_20px_rgba(0,0,0,0.5)] 
                  transition-all text-[15px] border border-[#2c2d2e] shadow-xl
                  ${isListening ? 'border-red-500/50 bg-red-900/10' : ''}`}
                style={{ fontSize: '16px' }} 
              />
              
              {/* LEFT ACTIONS (Media) */}
              <div className="absolute left-2 top-2 bottom-2 flex items-center gap-1 bg-[#2c2d2e]/50 rounded-full px-1 backdrop-blur-sm border border-white/5">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-white/10" title="Upload Image"><ImageIcon size={18} /></button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <div className="w-[1px] h-4 bg-white/10"></div>
                <button type="button" onClick={() => setCameraMode('capture')} className="p-2 text-gray-400 hover:text-blue-400 rounded-full transition-colors hover:bg-white/10" title="Take Photo"><Camera size={18} /></button>
                <button type="button" onClick={() => setCameraMode('scan')} className="p-2 text-gray-400 hover:text-green-400 rounded-full transition-colors hover:bg-white/10" title="Scan Text (Lens)"><ScanText size={18} /></button>
              </div>

              {/* RIGHT ACTIONS (Voice/Send) */}
              <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                <button type="button" onClick={toggleVoiceInput} className={`p-2.5 rounded-full transition-all active:scale-90 ${isListening ? 'text-white bg-red-500 animate-pulse shadow-lg shadow-red-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                  <Mic size={20} />
                </button>
                <button 
                  type={loading ? 'button' : 'submit'} 
                  onClick={loading ? stopGenerating : undefined} 
                  className={`p-2.5 rounded-full transition-all active:scale-90 shadow-lg ${loading ? 'bg-white text-black' : 'bg-[#2c2d2e] text-white hover:bg-[#3c3d3e] disabled:opacity-50 disabled:bg-transparent disabled:shadow-none'}`} 
                  disabled={(!input.trim() && !image) && !loading}
                >
                  {loading ? <StopCircle size={20} fill="currentColor" /> : <Terminal size={20} />}
                </button>
              </div>
            </form>
            <p className="text-center text-[10px] text-gray-600 mt-3 hidden md:block font-medium tracking-wide">
                {focusedProvider ? `Private Chat with ${focusedProvider === 'groq' ? 'Llama' : 'Gemini'}` : 'TurboLearn AI • Gemini 2.5 Flash • Llama 3.3'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}