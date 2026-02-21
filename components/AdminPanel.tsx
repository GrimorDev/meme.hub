import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Ban, Flag, Users, Image, AlertTriangle, Check, X, RefreshCw, UserCheck, UserX, Sparkles } from 'lucide-react';
import { db } from '../services/db';
import { AdminUser, AdminReport, AdminUserReport, MemePost } from '../types';

type Tab = 'reports' | 'user-reports' | 'posts' | 'users';

const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [userReports, setUserReports] = useState<AdminUserReport[]>([]);
  const [posts, setPosts] = useState<(MemePost & { reportCount: number })[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ label: string; onConfirm: () => void } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'reports') setReports(await db.adminGetReports());
      else if (tab === 'user-reports') setUserReports(await db.adminGetUserReports());
      else if (tab === 'posts') setPosts(await db.adminGetPosts());
      else if (tab === 'users') setUsers(await db.adminGetUsers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [tab]);

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
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    confirm(
      `${newRole === 'admin' ? 'Nadać' : 'Odebrać'} rolę admina użytkownikowi @${username}?`,
      async () => {
        const result = await db.adminSetRole(id, newRole as 'user' | 'admin');
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role: result.role } : u));
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
          <p className="text-zinc-500 font-medium mt-1">Zarządzaj treścią i użytkownikami Meme.Hub</p>
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
                      ) : (
                        <span className="font-black text-white">@{u.username}</span>
                      )}
                      {u.role === 'admin' && (
                        <span className="text-[10px] font-black bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={9} fill="currentColor" /> ADMIN
                        </span>
                      )}
                      {u.banned && (
                        <span className="text-[10px] font-black bg-red-900/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">ZBANOWANY</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{u.email} · {u._count.posts} postów</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {/* Zmień rolę */}
                    <button
                      onClick={() => handleSetRole(u.id, u.username, u.role)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border ${
                        u.role === 'admin'
                          ? 'bg-purple-900/20 hover:bg-zinc-700 text-purple-400 hover:text-white border-purple-900/30 hover:border-zinc-600'
                          : 'bg-zinc-800/50 hover:bg-purple-700 text-zinc-400 hover:text-white border-zinc-700 hover:border-purple-600'
                      }`}
                      title={u.role === 'admin' ? 'Odbierz rolę admina' : 'Nadaj rolę admina'}
                    >
                      {u.role === 'admin' ? <UserX size={12} /> : <UserCheck size={12} />}
                      {u.role === 'admin' ? 'Odbierz admina' : 'Nadaj admina'}
                    </button>
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
        </>
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
