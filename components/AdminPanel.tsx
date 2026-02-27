import React, { useState, useEffect, useRef } from 'react';
import { Shield, Trash2, Ban, Flag, Users, Image, AlertTriangle, Check, X, RefreshCw, UserCheck, UserX, Sparkles, Settings, Save, BarChart2, Clock, MessageSquare, Search } from 'lucide-react';
import { db } from '../services/db';
import { AdminUser, AdminReport, AdminUserReport, MemePost, AdminStats, DirectMessage } from '../types';

type Tab = 'reports' | 'user-reports' | 'posts' | 'users' | 'settings' | 'stats' | 'chat';

const AdminPanel: React.FC<{ currentUserRole?: string }> = ({ currentUserRole = 'admin' }) => {
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [userReports, setUserReports] = useState<AdminUserReport[]>([]);
  const [posts, setPosts] = useState<(MemePost & { reportCount: number })[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ label: string; onConfirm: () => void } | null>(null);
  const [topConfig, setTopConfig] = useState<{ topMetric: string; topPeriod: number }>({ topMetric: 'likes', topPeriod: 7 });
  const [topConfigSaving, setTopConfigSaving] = useState(false);
  const [topConfigSaved, setTopConfigSaved] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [banHistory, setBanHistory] = useState<{ id: string; action: string; reason: string | null; createdAt: string; adminUsername: string }[]>([]);
  const [banHistoryUser, setBanHistoryUser] = useState<{ id: string; username: string } | null>(null);
  // Chat search (tylko admin)
  const [chatUser1, setChatUser1] = useState('');
  const [chatUser2, setChatUser2] = useState('');
  const [chatResult, setChatResult] = useState<{
    user1: { id: string; username: string; avatarColor: string; avatarUrl?: string };
    user2: { id: string; username: string; avatarColor: string; avatarUrl?: string };
    messages: DirectMessage[];
  } | null>(null);
  const [chatSearching, setChatSearching] = useState(false);
  const [chatError, setChatError] = useState('');

  const isAdmin = currentUserRole === 'admin';

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'reports') setReports(await db.adminGetReports());
      else if (tab === 'user-reports') setUserReports(await db.adminGetUserReports());
      else if (tab === 'posts') setPosts(await db.adminGetPosts());
      else if (tab === 'users') setUsers(await db.adminGetUsers());
      else if (tab === 'settings') setTopConfig(await db.getTopConfig());
      else if (tab === 'stats') setStats(await db.adminGetStats());
      else if (tab === 'chat') { /* ładowanie przy wyszukaniu */ }
    } finally {
      setLoading(false);
    }
  };

  const handleChatSearch = async () => {
    if (!chatUser1.trim() || !chatUser2.trim()) { setChatError('Podaj obu użytkowników'); return; }
    setChatSearching(true); setChatError(''); setChatResult(null);
    try {
      const result = await db.adminChatSearch(chatUser1.trim(), chatUser2.trim());
      setChatResult(result);
    } catch (err: any) {
      setChatError(err.message || 'Nie znaleziono użytkowników');
    } finally {
      setChatSearching(false);
    }
  };

  useEffect(() => { loadData(); }, [tab]);

  const handleSaveTopConfig = async () => {
    setTopConfigSaving(true);
    try {
      await db.setTopConfig(topConfig);
      setTopConfigSaved(true);
      setTimeout(() => setTopConfigSaved(false), 2500);
    } finally {
      setTopConfigSaving(false);
    }
  };

  const confirm = (label: string, action: () => void) =>
    setConfirmAction({ label, onConfirm: action });

  const handleDeletePost = (id: string, caption: string) =>
    confirm(`Usunąć post "${caption}"?`, async () => {
      await db.adminDeletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setReports(prev => prev.filter(r => r.post.id !== id));
      setConfirmAction(null);
    });

  const handleDismissReport = (id: string) =>
    confirm('Odrzucić zgłoszenie posta?', async () => {
      await db.adminDeleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      setConfirmAction(null);
    });

  const handleDismissUserReport = (id: string) =>
    confirm('Odrzucić zgłoszenie profilu?', async () => {
      await db.adminDeleteUserReport(id);
      setUserReports(prev => prev.filter(r => r.id !== id));
      setConfirmAction(null);
    });

  const handleBanUser = (id: string, username: string, banned: boolean) =>
    confirm(`${banned ? 'Odbanować' : 'Zbanować'} użytkownika @${username}?`, async () => {
      const result = await db.adminBanUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: result.banned } : u));
      // aktualizuj też w user-reports
      setUserReports(prev => prev.map(r =>
        r.targetUser.id === id ? { ...r, targetUser: { ...r.targetUser, banned: result.banned } } : r
      ));
      setConfirmAction(null);
    });

  const handleSetRole = (id: string, username: string, currentRole: string) => {
    // Cycle: user → moderator → admin → user
    const nextRole = currentRole === 'admin' ? 'user' : currentRole === 'moderator' ? 'admin' : 'moderator';
    const roleLabel: Record<string, string> = { user: 'Użytkownik', moderator: 'Moderator', admin: 'Admin' };
    confirm(
      `Zmienić rolę @${username} na ${roleLabel[nextRole]}?`,
      async () => {
        const result = await db.adminSetRole(id, nextRole as 'user' | 'moderator' | 'admin');
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role: result.role as any } : u));
        setUserReports(prev => prev.map(r =>
          r.targetUser.id === id ? { ...r, targetUser: { ...r.targetUser, role: result.role } } : r
        ));
        setConfirmAction(null);
      }
    );
  };

  const handleFeaturePost = async (id: string, currentFeatured: boolean) => {
    const result = await db.adminFeaturePost(id);
    setPosts(prev => prev.map(p => p.id === id ? { ...p, featured: result.featured } : p));
  };

  const handleShowBanHistory = async (userId: string, username: string) => {
    setBanHistoryUser({ id: userId, username });
    try {
      const history = await db.adminGetBanHistory(userId);
      setBanHistory(history);
    } catch {
      setBanHistory([]);
    }
  };

  const TabBtn: React.FC<{ t: Tab; icon: React.ReactNode; label: string; count?: number }> = ({ t, icon, label, count }) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
        tab === t ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {icon} {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${tab === t ? 'bg-white/20' : 'bg-red-600 text-white'}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30">
              <Shield size={24} className="text-white" fill="white" />
            </div>
            Panel Admina
          </h1>
          <p className="text-zinc-500 font-medium mt-1">Zarządzaj treścią i użytkownikami Memster</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white font-bold text-sm transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Odśwież
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 flex-wrap">
        <TabBtn t="reports" icon={<Flag size={16} />} label="Zgłoszenia postów" count={reports.length} />
        <TabBtn t="user-reports" icon={<Users size={16} />} label="Zgłoszenia profili" count={userReports.length} />
        <TabBtn t="posts" icon={<Image size={16} />} label="Memy" />
        <TabBtn t="users" icon={<Users size={16} />} label="Użytkownicy" />
        {isAdmin && <TabBtn t="settings" icon={<Settings size={16} />} label="Ustawienia TOP" />}
        {isAdmin && <TabBtn t="stats" icon={<BarChart2 size={16} />} label="Statystyki" />}
        {isAdmin && <TabBtn t="chat" icon={<MessageSquare size={16} />} label="Czat" />}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* REPORTS TAB — zgłoszenia postów */}
          {tab === 'reports' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 bg-zinc-900/30 rounded-3xl border border-zinc-800">
                  <Check size={40} className="mx-auto mb-3 text-green-500" />
                  <p className="font-bold">Brak nowych zgłoszeń!</p>
                </div>
              ) : reports.map(report => (
                <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex gap-6 items-start hover:border-red-900/40 transition-all">
                  <img src={report.post.url} alt={report.post.caption} className="w-24 h-24 object-cover rounded-2xl border border-zinc-700 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="font-black text-white truncate">{report.post.caption}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs bg-red-900/30 text-red-400 border border-red-900/30 px-3 py-1 rounded-full font-bold">
                        <Flag size={10} className="inline mr-1" />{report.reason}
                      </span>
                      <span className="text-xs text-zinc-500">Zgłoszone przez <span className="text-zinc-300 font-bold">@{report.reporter}</span></span>
                      <span className="text-xs text-zinc-600">Post: @{report.post.author}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDeletePost(report.post.id, report.post.caption)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-red-600/20"
                    >
                      <Trash2 size={14} /> Usuń post
                    </button>
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs transition-all"
                    >
                      <X size={14} /> Odrzuć
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* USER-REPORTS TAB — zgłoszenia profili */}
          {tab === 'user-reports' && (
            <div className="space-y-4">
              {userReports.length === 0 ? (
                <div className="py-16 text-center text-zinc-600 bg-zinc-900/30 rounded-3xl border border-zinc-800">
                  <Check size={40} className="mx-auto mb-3 text-green-500" />
                  <p className="font-bold">Brak zgłoszeń profili!</p>
                </div>
              ) : userReports.map(report => (
                <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex gap-6 items-center hover:border-red-900/40 transition-all">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${report.targetUser.avatarColor} overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-2xl`}>
                    {report.targetUser.avatarUrl
                      ? <img src={report.targetUser.avatarUrl} alt={report.targetUser.username} className="w-full h-full object-cover" />
                      : report.targetUser.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-white">@{report.targetUser.username}</span>
                      {report.targetUser.role === 'admin' && (
                        <span className="text-[10px] font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full">ADMIN</span>
                      )}
                      {report.targetUser.banned && (
                        <span className="text-[10px] font-black bg-red-900/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">ZBANOWANY</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs bg-red-900/30 text-red-400 border border-red-900/30 px-3 py-1 rounded-full font-bold">
                        <Flag size={10} className="inline mr-1" />{report.reason}
                      </span>
                      <span className="text-xs text-zinc-500">Zgłoszone przez <span className="text-zinc-300 font-bold">@{report.reporter}</span></span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {report.targetUser.role !== 'admin' && (
                      <button
                        onClick={() => handleBanUser(report.targetUser.id, report.targetUser.username, report.targetUser.banned)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                          report.targetUser.banned
                            ? 'bg-green-900/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-900/30'
                            : 'bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/30'
                        }`}
                      >
                        <Ban size={12} /> {report.targetUser.banned ? 'Odbanuj' : 'Zbanuj'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissUserReport(report.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs transition-all"
                    >
                      <X size={12} /> Odrzuć
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* POSTS TAB */}
          {tab === 'posts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {posts.map(post => (
                <div key={post.id} className={`bg-zinc-900 border rounded-3xl overflow-hidden transition-all group ${post.featured ? 'border-green-700/50 hover:border-green-600/60' : 'border-amber-700/40 hover:border-amber-600/50'}`}>
                  <div className="relative aspect-video">
                    <img src={post.url} alt={post.caption} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {post.featured ? (
                        <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-full">
                          <Check size={9} /> NA FEEDZIE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded-full">
                          <Sparkles size={9} /> KOLEJKA
                        </span>
                      )}
                    </div>
                    {post.reportCount > 0 && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full">
                        <Flag size={10} /> {post.reportCount}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="font-bold text-sm text-white truncate">{post.caption}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500 truncate">@{post.author} · {post.likes} lajków</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleFeaturePost(post.id, !!post.featured)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                            post.featured
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700'
                              : 'bg-green-900/20 hover:bg-green-600 text-green-400 hover:text-white border-green-900/30 hover:border-green-600'
                          }`}
                        >
                          <Sparkles size={11} /> {post.featured ? 'Cofnij' : 'Promuj'}
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id, post.caption)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl font-bold text-xs transition-all border border-red-900/30 hover:border-red-600"
                        >
                          <Trash2 size={11} /> Usuń
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* USERS TAB */}
          {tab === 'users' && (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${u.banned ? 'bg-red-900/10 border-red-900/30' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${u.avatarColor} overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-xl`}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {u.role === 'admin' ? (
                        <span className="font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">@{u.username}</span>
                      ) : u.role === 'moderator' ? (
                        <span className="font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">@{u.username}</span>
                      ) : (
                        <span className="font-black text-white">@{u.username}</span>
                      )}
                      {u.role === 'admin' && (
                        <span className="text-[10px] font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={9} fill="currentColor" /> ADMIN
                        </span>
                      )}
                      {u.role === 'moderator' && (
                        <span className="text-[10px] font-black bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={9} /> MOD
                        </span>
                      )}
                      {u.banned && (
                        <span className="text-[10px] font-black bg-red-900/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">ZBANOWANY</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{u.email} · {u._count.posts} postów</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {/* Historia banów */}
                    <button
                      onClick={() => handleShowBanHistory(u.id, u.username)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700"
                      title="Historia banów"
                    >
                      <Clock size={12} /> Historia
                    </button>
                    {/* Zmień rolę — tylko admin może to robić */}
                    {isAdmin && (
                      <button
                        onClick={() => handleSetRole(u.id, u.username, u.role)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border ${
                          u.role === 'admin'
                            ? 'bg-purple-900/20 hover:bg-zinc-700 text-purple-400 hover:text-white border-purple-900/30 hover:border-zinc-600'
                            : u.role === 'moderator'
                            ? 'bg-blue-900/20 hover:bg-purple-700 text-blue-400 hover:text-white border-blue-900/30 hover:border-purple-600'
                            : 'bg-zinc-800/50 hover:bg-blue-700 text-zinc-400 hover:text-white border-zinc-700 hover:border-blue-600'
                        }`}
                        title={`Zmień rolę @${u.username}`}
                      >
                        {u.role === 'admin' ? <UserX size={12} /> : <UserCheck size={12} />}
                        {u.role === 'admin' ? '→ user' : u.role === 'moderator' ? '→ admin' : '→ mod'}
                      </button>
                    )}
                    {/* Ban */}
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleBanUser(u.id, u.username, u.banned)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                          u.banned
                            ? 'bg-green-900/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-900/30 hover:border-green-600'
                            : 'bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/30 hover:border-red-600'
                        }`}
                      >
                        <Ban size={14} /> {u.banned ? 'Odbanuj' : 'Zbanuj'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STATS TAB — statystyki platformy (tylko admin) */}
          {tab === 'stats' && isAdmin && (
            <div className="space-y-8">
              {!stats ? (
                <div className="py-16 text-center text-zinc-600 bg-zinc-900/30 rounded-3xl border border-zinc-800">
                  <p className="font-bold">Brak danych statystycznych</p>
                </div>
              ) : (
                <>
                  {/* Kafelki statystyk */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[
                      { label: 'Użytkownicy', value: stats.totalUsers, sub: `+${stats.newUsers7d} / 7d`, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                      { label: 'Nowi (30d)', value: stats.newUsers30d, sub: `+${stats.newUsers7d} / 7d`, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                      { label: 'Posty', value: stats.totalPosts, sub: `+${stats.newPosts7d} / 7d`, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                      { label: 'Lajki', value: stats.totalLikes, sub: 'łącznie', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
                      { label: 'W kolejce', value: stats.pendingPosts, sub: 'oczekuje', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                      { label: 'Zbanowani', value: stats.bannedUsers, sub: 'użytkowników', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    ].map(({ label, value, sub, color, bg }) => (
                      <div key={label} className={`flex flex-col gap-2 p-5 rounded-2xl border ${bg}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
                        <span className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</span>
                        <span className="text-[10px] text-zinc-600 font-medium">{sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Komentarze */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2 p-5 rounded-2xl border bg-zinc-900 border-zinc-800">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Komentarze łącznie</span>
                      <span className="text-3xl font-black text-green-400">{stats.totalComments.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-600 font-medium">+{stats.newComments7d} / 7d</span>
                    </div>
                    <div className="flex flex-col gap-2 p-5 rounded-2xl border bg-zinc-900 border-zinc-800">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nowe posty dziś</span>
                      <span className="text-3xl font-black text-orange-400">{stats.newPosts1d.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-600 font-medium">ostatnie 24h</span>
                    </div>
                    <div className="flex flex-col gap-2 p-5 rounded-2xl border bg-zinc-900 border-zinc-800">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Aktywność (7d)</span>
                      <span className="text-3xl font-black text-violet-400">{(stats.newUsers7d + stats.newPosts7d + stats.newComments7d).toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-600 font-medium">rejestracje + posty + komentarze</span>
                    </div>
                  </div>

                  {/* Wykresy rejestracji i postów */}
                  {stats.registrationsChart && stats.registrationsChart.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Rejestracje (ostatnie dni)</h3>
                        <div className="flex items-end gap-1 h-24">
                          {stats.registrationsChart.map((d) => {
                            const max = Math.max(...stats.registrationsChart.map(x => x.count), 1);
                            const pct = (d.count / max) * 100;
                            return (
                              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                                <div className="w-full bg-blue-500/70 rounded-t" style={{ height: `${Math.max(pct, 4)}%` }} />
                                <span className="text-[8px] text-zinc-600 rotate-45 origin-left">{d.day.slice(5)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Nowe posty (ostatnie dni)</h3>
                        <div className="flex items-end gap-1 h-24">
                          {stats.postsChart.map((d) => {
                            const max = Math.max(...stats.postsChart.map(x => x.count), 1);
                            const pct = (d.count / max) * 100;
                            return (
                              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                                <div className="w-full bg-purple-500/70 rounded-t" style={{ height: `${Math.max(pct, 4)}%` }} />
                                <span className="text-[8px] text-zinc-600 rotate-45 origin-left">{d.day.slice(5)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* CHAT TAB — wyszukiwanie czatu (tylko admin) */}
          {tab === 'chat' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <MessageSquare size={16} /> Wyszukaj rozmowę między użytkownikami
                </h3>
                <div className="flex gap-3 flex-wrap">
                  <input
                    value={chatUser1}
                    onChange={e => setChatUser1(e.target.value)}
                    placeholder="Użytkownik 1"
                    className="flex-1 min-w-[140px] bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-500 transition-colors"
                  />
                  <input
                    value={chatUser2}
                    onChange={e => setChatUser2(e.target.value)}
                    placeholder="Użytkownik 2"
                    onKeyDown={e => { if (e.key === 'Enter') handleChatSearch(); }}
                    className="flex-1 min-w-[140px] bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-500 transition-colors"
                  />
                  <button
                    onClick={handleChatSearch}
                    disabled={chatSearching}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all"
                  >
                    <Search size={16} /> {chatSearching ? 'Szukam...' : 'Szukaj'}
                  </button>
                </div>
                {chatError && <p className="text-red-400 text-sm font-bold">{chatError}</p>}
              </div>

              {chatResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-bold text-zinc-400">
                    <span className="text-white">@{chatResult.user1.username}</span>
                    <span>↔</span>
                    <span className="text-white">@{chatResult.user2.username}</span>
                    <span className="text-zinc-600">({chatResult.messages.length} wiadomości)</span>
                  </div>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    {chatResult.messages.length === 0 ? (
                      <div className="py-10 text-center text-zinc-600">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-sm">Brak wiadomości między tymi użytkownikami</p>
                      </div>
                    ) : chatResult.messages.map(msg => {
                      const isFrom1 = msg.senderId === chatResult.user1.id;
                      const sender  = isFrom1 ? chatResult.user1 : chatResult.user2;
                      return (
                        <div key={msg.id} className={`flex gap-3 ${isFrom1 ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${sender.avatarColor} overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-xs`}>
                            {sender.avatarUrl ? <img src={sender.avatarUrl} alt={sender.username} className="w-full h-full object-cover" /> : sender.username[0].toUpperCase()}
                          </div>
                          <div className={`max-w-[75%] space-y-1 ${isFrom1 ? '' : 'items-end flex flex-col'}`}>
                            <div className={`px-3 py-2 rounded-2xl text-sm ${isFrom1 ? 'bg-zinc-700 text-white rounded-bl-sm' : 'bg-blue-600/30 text-blue-100 rounded-br-sm'}`}>
                              {msg.text && <p className="break-words">{msg.text}</p>}
                              {msg.imageUrl && <img src={msg.imageUrl} alt="Zdjęcie" className="mt-1 max-w-[200px] rounded-lg" />}
                            </div>
                            <p className="text-[9px] text-zinc-600">{new Date(msg.createdAt).toLocaleString('pl-PL')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB — ustawienia zakładki TOP */}
          {tab === 'settings' && isAdmin && (
            <div className="max-w-xl space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">

                {/* Metryka */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Metryka rankingu TOP</h3>
                  <div className="space-y-3">
                    {([
                      { value: 'likes', label: 'Polubienia', desc: 'Ranking oparty wyłącznie na liczbie lajków' },
                      { value: 'comments', label: 'Komentarze', desc: 'Ranking oparty na aktywności dyskusji' },
                      { value: 'combined', label: 'Kombinacja', desc: '2 × polubienia + komentarze — balans między lajkami a dyskusją' },
                    ] as const).map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                          topConfig.topMetric === value
                            ? 'bg-red-600/10 border-red-500/50 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="topMetric"
                          value={value}
                          checked={topConfig.topMetric === value}
                          onChange={() => setTopConfig(prev => ({ ...prev, topMetric: value }))}
                          className="mt-0.5 accent-red-500 w-4 h-4 shrink-0"
                        />
                        <div>
                          <p className="font-black text-sm">{label}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Przedział czasu */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Przedział czasu</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 7, label: 'Ostatnie 7 dni' },
                      { value: 14, label: 'Ostatnie 14 dni' },
                      { value: 30, label: 'Ostatnie 30 dni' },
                      { value: 90, label: 'Ostatnie 90 dni' },
                      { value: 0, label: 'Wszystkie czasy' },
                    ] as const).map(({ value, label }) => (
                      <label
                        key={value}
                        className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                          topConfig.topPeriod === value
                            ? 'bg-red-600/10 border-red-500/50 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="topPeriod"
                          value={value}
                          checked={topConfig.topPeriod === value}
                          onChange={() => setTopConfig(prev => ({ ...prev, topPeriod: value }))}
                          className="accent-red-500 w-4 h-4 shrink-0"
                        />
                        <span className="font-bold text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveTopConfig}
                  disabled={topConfigSaving}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${
                    topConfigSaved
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                  } disabled:opacity-60`}
                >
                  {topConfigSaved ? <><Check size={16} /> Zapisano!</> : topConfigSaving ? 'Zapisywanie...' : <><Save size={16} /> Zapisz ustawienia</>}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ban History Modal */}
      {banHistoryUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setBanHistoryUser(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2">
                <Clock size={18} /> Historia banów — @{banHistoryUser.username}
              </h3>
              <button onClick={() => setBanHistoryUser(null)} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {banHistory.length === 0 ? (
                <div className="py-10 text-center text-zinc-600">
                  <Check size={32} className="mx-auto mb-2 text-green-500" />
                  <p className="font-bold text-sm">Brak historii banów dla tego użytkownika</p>
                </div>
              ) : banHistory.map((entry) => (
                <div key={entry.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${entry.action === 'ban' ? 'bg-red-900/10 border-red-900/30' : 'bg-green-900/10 border-green-900/30'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${entry.action === 'ban' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    <Ban size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black uppercase ${entry.action === 'ban' ? 'text-red-400' : 'text-green-400'}`}>
                        {entry.action === 'ban' ? 'Zbanowany' : 'Odbanowany'}
                      </span>
                      <span className="text-[10px] text-zinc-500">przez @{entry.adminUsername}</span>
                    </div>
                    {entry.reason && <p className="text-xs text-zinc-400 mt-1">{entry.reason}</p>}
                    <p className="text-[10px] text-zinc-600 mt-1">{new Date(entry.createdAt).toLocaleString('pl-PL')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black uppercase italic text-white">Potwierdź akcję</h3>
              <p className="text-zinc-400 text-sm">{confirmAction.label}</p>
              <div className="flex gap-3 w-full pt-2">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">
                  Anuluj
                </button>
                <button onClick={confirmAction.onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">
                  Potwierdź
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
