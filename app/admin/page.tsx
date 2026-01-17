'use client';

import { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, CheckCircle, Trash2, Search, LogOut, 
  LayoutDashboard, Ban, Eye, X, Shield, Clock, ImageIcon, AlertTriangle 
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Login from '@/components/Login';

// --- TYPES ---
type UserData = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'banned';
  lastLogin: any;
  createdAt: any;
};

type ChatSession = {
    id: string;
    title: string;
    createdAt: any;
};

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    image?: string | null; // ✅ Image Support
    createdAt: any;
};

export default function AdminPortal() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Admin Data
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'chats'>('users');

  // Chat Inspector State
  const [selectedUserForChat, setSelectedUserForChat] = useState<UserData | null>(null);
  const [userSessions, setUserSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);

  // 1. AUTH CHECK
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        onSnapshot(docRef, (docSnap) => {
             const data = docSnap.data();
             if (data && data.role === 'admin') {
                 setUser(currentUser);
                 setIsAdmin(true);
             } else {
                 router.push('/');
             }
             setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // 2. FETCH ALL USERS (Corrected)
  useEffect(() => {
    if (!isAdmin) return;
    
    // We fetch ALL users without 'orderBy' first to avoid missing index errors
    const q = collection(db, 'users');
    
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(d => d.data() as UserData);
      
      // Sort manually (Newest First)
      fetchedUsers.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA; 
      });

      setUsers(fetchedUsers);
    }, (error) => {
        console.error("🔥 Admin Fetch Error:", error);
        alert("Error fetching users. Check Console for details.");
    });

    return () => unsub();
  }, [isAdmin]);

  // 3. ACTIONS
  const updateUserStatus = async (uid: string, status: 'approved' | 'banned' | 'pending') => {
    try {
        await updateDoc(doc(db, 'users', uid), { status });
    } catch (e) {
        alert("Failed to update status. Are you sure you are Admin?");
    }
  };

  const deleteUser = async (uid: string) => {
    if(!confirm("⚠️ Permanently delete this user?")) return;
    try {
        await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
        alert("Failed to delete user.");
    }
  };

  // 4. FETCH SESSIONS
  const loadUserSessions = async (targetUser: UserData) => {
      setSelectedUserForChat(targetUser);
      setActiveSessionId(null);
      setChatLogs([]);
      
      try {
        // Query sessions for this specific user
        const q = query(collection(db, 'sessions'), where('userId', '==', targetUser.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setUserSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession)));
        setActiveTab('chats');
      } catch (e) {
          console.error(e);
          // Fallback if index is missing
          const q2 = query(collection(db, 'sessions'), where('userId', '==', targetUser.uid));
          const snap2 = await getDocs(q2);
          setUserSessions(snap2.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession)));
          setActiveTab('chats');
      }
  };

  // 5. FETCH CHAT LOGS
  const loadChatLogs = async (sessionId: string) => {
      setActiveSessionId(sessionId);
      try {
        const q = query(collection(db, 'chats'), where('sessionId', '==', sessionId), orderBy('createdAt', 'asc'));
        const snap = await getDocs(q);
        setChatLogs(snap.docs.map(d => d.data() as ChatMessage));
      } catch (e) {
          console.error("Chat Load Error", e);
      }
  };

  if (loading) return <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center font-mono">Loading Portal...</div>;
  if (!user || !isAdmin) return <Login />;

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-gray-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-[#0c0c0e] flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-white/5">
            <h1 className="text-lg font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
               <Shield size={18} className="text-red-500" /> ADMIN PORTAL
            </h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest pl-1">Authorized Personnel Only</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => { setActiveTab('users'); setSelectedUserForChat(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-400 hover:bg-white/5'}`}
            >
                <Users size={18} /> User Management
            </button>
            <button 
                onClick={() => setActiveTab('chats')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'chats' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-white/5'}`}
            >
                <MessageSquare size={18} /> Chat Inspector
            </button>
        </nav>

        <div className="p-4 border-t border-white/5">
            <button onClick={() => router.push('/')} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <LayoutDashboard size={14} /> Return to App
            </button>
            <button onClick={() => signOut(auth)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 mt-2 transition-colors">
                <LogOut size={14} /> Secure Logout
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden flex flex-col bg-[#050505]">
        
        {/* TOP BAR */}
        <header className="h-16 border-b border-white/10 bg-[#09090b]/90 backdrop-blur-md flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${activeTab === 'users' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse`}></div>
                <h2 className="font-semibold text-sm tracking-wide text-gray-200 uppercase">
                    {activeTab === 'users' ? 'Database Overview' : 'Forensic Inspector'}
                </h2>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Search users by name or email..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-[#18181b] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 transition-all w-72"
                />
            </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* 1. USER MANAGEMENT TAB */}
            {activeTab === 'users' && (
                <div className="bg-[#0c0c0e] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-widest text-gray-500">
                                <th className="p-4 pl-6">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4 text-right pr-6">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 text-sm">
                                        No users found. (Check Firestore Rules)
                                    </td>
                                </tr>
                            )}
                            {filteredUsers.map((u) => (
                                <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            {u.photoURL ? (
                                                <img src={u.photoURL} className="w-9 h-9 rounded-md border border-white/10" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-gray-400 font-bold border border-white/10">
                                                    {u.email?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-white text-sm group-hover:text-red-400 transition-colors">{u.displayName || 'No Name'}</div>
                                                <div className="text-[11px] text-gray-500 font-mono">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-400 font-mono">
                                        {u.role === 'admin' ? <span className="text-red-400 font-bold">ADMIN</span> : 'Student'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                            u.status === 'approved' ? 'bg-green-900/20 text-green-400 border-green-500/20' :
                                            u.status === 'banned' ? 'bg-red-900/20 text-red-400 border-red-500/20' :
                                            'bg-yellow-900/20 text-yellow-400 border-yellow-500/20 animate-pulse'
                                        }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => loadUserSessions(u)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors" title="View Chat History"><Eye size={16} /></button>
                                            
                                            {u.status !== 'approved' && (
                                                <button onClick={() => updateUserStatus(u.uid, 'approved')} className="p-2 text-green-400 hover:bg-green-500/10 rounded-md transition-colors" title="Approve"><CheckCircle size={16} /></button>
                                            )}
                                            
                                            {u.status !== 'banned' && u.role !== 'admin' && (
                                                <button onClick={() => updateUserStatus(u.uid, 'banned')} className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-md transition-colors" title="Ban User"><Ban size={16} /></button>
                                            )}
                                            
                                            {u.role !== 'admin' && (
                                                <button onClick={() => deleteUser(u.uid)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Delete"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 2. CHAT INSPECTOR TAB */}
            {activeTab === 'chats' && (
                <div className="flex h-full gap-6">
                    {/* Session List */}
                    <div className="w-80 bg-[#0c0c0e] rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-xl">
                        <div className="p-4 border-b border-white/5 bg-white/[0.02] font-medium text-xs text-gray-400 uppercase tracking-widest flex justify-between items-center">
                            <span>{selectedUserForChat ? selectedUserForChat.displayName : 'Select User'}</span>
                            {selectedUserForChat && <button onClick={() => setSelectedUserForChat(null)} className="text-gray-500 hover:text-white"><X size={14}/></button>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {!selectedUserForChat && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                                    <Users size={32} className="mb-2" />
                                    <p className="text-xs">Go to User Database<br/>click Eye icon.</p>
                                </div>
                            )}
                            {userSessions.length === 0 && selectedUserForChat && (
                                <div className="text-center p-6 text-xs text-gray-500">No chat history found.</div>
                            )}
                            {userSessions.map(sess => (
                                <div 
                                    key={sess.id} 
                                    onClick={() => loadChatLogs(sess.id)}
                                    className={`p-3 rounded-lg cursor-pointer text-sm transition-all border ${activeSessionId === sess.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5'}`}
                                >
                                    <div className="font-medium truncate">{sess.title}</div>
                                    <div className="text-[10px] opacity-50 mt-1 font-mono">{sess.createdAt?.toDate ? new Date(sess.createdAt.toDate()).toLocaleDateString() : ''}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chat Logs with Image Support */}
                    <div className="flex-1 bg-[#0c0c0e] rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-xl">
                        <div className="p-4 border-b border-white/5 bg-white/[0.02] font-medium text-xs text-gray-400 uppercase tracking-widest">
                             Transcript View
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[#050505]">
                            {!activeSessionId && <div className="flex h-full items-center justify-center text-gray-600 text-xs uppercase tracking-widest">Select a session to inspect</div>}
                            
                            {chatLogs.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`text-[9px] mb-2 uppercase font-bold tracking-widest px-1 ${msg.role === 'user' ? 'text-gray-500' : 'text-blue-500'}`}>
                                        {msg.role}
                                    </div>
                                    
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#1e1f20] text-gray-200 rounded-tr-sm' : 'bg-blue-900/10 text-blue-100 border border-blue-500/20 rounded-tl-sm'}`}>
                                        {/* ✅ IMAGE RENDERER */}
                                        {msg.image && (
                                            <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black relative group">
                                                <img src={msg.image} alt="User Upload" className="max-w-full h-auto max-h-60 object-contain mx-auto" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a href={msg.image} target="_blank" rel="noopener noreferrer" className="text-xs text-white underline">Open Original</a>
                                                </div>
                                                <div className="bg-[#111] py-1 px-2 text-[9px] text-gray-500 flex items-center gap-1 justify-center border-t border-white/5">
                                                    <ImageIcon size={10} /> Image Attachment
                                                </div>
                                            </div>
                                        )}
                                        {/* Text Content */}
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}