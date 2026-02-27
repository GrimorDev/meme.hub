
import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, PenTool, Flame, Settings, LogOut, LogIn, Plus, Shield, Bell, MessageSquare } from 'lucide-react';
import { AppView, MemePost, User } from './types';
import MemeFeed from './components/MemeFeed';
import MemeStudio from './components/MemeStudio';
import RoastStation from './components/RoastStation';
import MemeDetail from './components/MemeDetail';
import UserProfile from './components/UserProfile';
import AdminPanel from './components/AdminPanel';
import DownloadsPage from './components/DownloadsPage';
import NotificationsPanel from './components/NotificationsPanel';
import MessagesView from './components/MessagesView';
import AuthModal from './components/AuthModal';
import UploadMemeModal from './components/UploadMemeModal';
import SettingsPage from './components/SettingsPage';
import SearchBar from './components/SearchBar';
import { db } from './services/db';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('FEED');
  const [selectedMeme, setSelectedMeme] = useState<MemePost | null>(null);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [selectedMessageUserId, setSelectedMessageUserId] = useState<string | null>(null);
  const prevUnreadNotifRef = useRef(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [feedRefreshTrigger, setFeedRefreshTrigger] = useState(0);

  useEffect(() => {
    db.getCurrentUser().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  // ── URL ROUTING ──────────────────────────────────────────────
  const applyURL = async (path: string, search: string) => {
    const params = new URLSearchParams(search);
    if (path.startsWith('/meme/')) {
      const meme = await db.getPost(path.slice(6));
      if (meme) { setSelectedMeme(meme); setView('DETAIL'); }
      else { setView('FEED'); window.history.replaceState({}, '', '/'); }
    } else if (path.startsWith('/profil/')) {
      setSelectedProfileUsername(path.slice(8));
      setView('PROFILE');
    } else if (path === '/studio') {
      setView('STUDIO');
    } else if (path === '/roast') {
      setView('ROAST');
    } else if (path === '/admin') {
      setView('ADMIN');
    } else if (path === '/downloads') {
      setView('DOWNLOADS');
    } else if (path === '/settings') {
      setView('SETTINGS');
    } else if (path === '/messages' || path.startsWith('/messages/')) {
      const uid = path.startsWith('/messages/') ? path.slice(10) : null;
      setSelectedMessageUserId(uid);
      setView('MESSAGES');
    } else {
      const tag = params.get('tag');
      const q = params.get('q');
      if (tag) setActiveTag(tag);
      if (q) setSearchQuery(q);
      setView('FEED');
    }
  };

  useEffect(() => {
    applyURL(window.location.pathname, window.location.search);
    const onPop = () => {
      setSelectedMeme(null);
      setSelectedProfileUsername(null);
      setActiveTag(null);
      setSearchQuery('');
      applyURL(window.location.pathname, window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Polling powiadomień co 15 s ──────────────────────────────
  useEffect(() => {
    if (!user) { setUnreadNotifications(0); setUnreadMessages(0); return; }
    const poll = async () => {
      const [nc, mc] = await Promise.all([
        db.getNotificationUnreadCount(),
        db.getMessageUnreadCount(),
      ]);
      if (nc > prevUnreadNotifRef.current) {
        if ('Notification' in window && (window.Notification as typeof Notification).permission === 'granted') {
          const notifs = await db.getNotifications();
          const newest = notifs.find(n => !n.read);
          if (newest) {
            new (window.Notification as typeof Notification)('Memster — ' + newest.title, {
              body: newest.body,
              icon: '/memster.png',
            });
          }
        }
      }
      prevUnreadNotifRef.current = nc;
      setUnreadNotifications(nc);
      setUnreadMessages(mc);
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsAuthModalOpen(false);
    // Poproś o uprawnienia do powiadomień po zalogowaniu
    if ('Notification' in window && (window.Notification as typeof Notification).permission === 'default') {
      (window.Notification as typeof Notification).requestPermission();
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    if (view === 'STUDIO' || view === 'SETTINGS') setView('FEED');
  };

  const handleNavigateToSettings = () => {
    setView('SETTINGS');
    window.history.pushState({}, '', '/settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMemeSelect = (meme: MemePost) => {
    setSelectedMeme(meme);
    setView('DETAIL');
    window.history.pushState({}, '', `/meme/${meme.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToFeed = () => {
    setView('FEED');
    setSelectedMeme(null);
    setFeedRefreshTrigger(prev => prev + 1);
    window.history.pushState({}, '', '/');
  };

  const handleUserSelect = (username: string) => {
    setSelectedProfileUsername(username);
    setView('PROFILE');
    window.history.pushState({}, '', `/profil/${username}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagSelect = (tag: string) => {
    setActiveTag(tag);
    setSearchQuery('');
    setView('FEED');
    setSelectedMeme(null);
    setSelectedProfileUsername(null);
    window.history.pushState({}, '', `/?tag=${encodeURIComponent(tag)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setActiveTag(null);
    setView('FEED');
    setSelectedMeme(null);
    setSelectedProfileUsername(null);
    window.history.pushState({}, '', `/?q=${encodeURIComponent(query)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromProfile = () => {
    setView('FEED');
    setSelectedProfileUsername(null);
    window.history.pushState({}, '', '/');
  };

  const handleUploadSuccess = () => {
    setFeedRefreshTrigger(prev => prev + 1);
    setView('FEED');
    window.history.pushState({}, '', '/');
  };

  const handleNavigateToDownloads = () => {
    setView('DOWNLOADS');
    window.history.pushState({}, '', '/downloads');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDownloads = () => {
    setView('FEED');
    window.history.pushState({}, '', '/');
  };

  const handleNavigateToMessages = (userId?: string) => {
    setSelectedMessageUserId(userId ?? null);
    setView('MESSAGES');
    window.history.pushState({}, '', userId ? `/messages/${userId}` : '/messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const protectedAction = (action: () => void) => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      action();
    }
  };

  // Theme variable based on setting
  const accentClass = user?.settings?.accentColor === 'green' ? 'emerald' : 
                      user?.settings?.accentColor === 'orange' ? 'orange' : 
                      user?.settings?.accentColor === 'blue' ? 'blue' : 'purple';

  return (
    <div className={`min-h-screen bg-[#0a0a0c] text-zinc-100 selection:bg-${accentClass}-500/30 selection:text-white`}>
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 shrink-0">
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => { setView('FEED'); setSelectedMeme(null); setActiveTag(null); setSearchQuery(''); window.history.pushState({}, '', '/'); }}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(147,51,234,0.3)] group-hover:scale-110 transition-transform shrink-0">
                <img src="/memster.png" alt="Memster" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic hidden lg:block">MEMSTER</span>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-zinc-800">
              <NavButton active={(view === 'FEED' || view === 'DETAIL') && !activeTag && !searchQuery} onClick={() => { setView('FEED'); setSelectedMeme(null); setActiveTag(null); setSearchQuery(''); window.history.pushState({}, '', '/'); }} icon={<LayoutGrid size={18} />} label="Feed" />
              <NavButton active={view === 'STUDIO'} onClick={() => protectedAction(() => { setView('STUDIO'); window.history.pushState({}, '', '/studio'); })} icon={<PenTool size={18} />} label="Studio" />
              <NavButton active={view === 'ROAST'} onClick={() => { setView('ROAST'); window.history.pushState({}, '', '/roast'); }} icon={<Flame size={18} />} label="Roast AI" />
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <button
                  onClick={() => { setView('ADMIN'); window.history.pushState({}, '', '/admin'); }}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 font-bold text-sm tracking-tight ${
                    view === 'ADMIN'
                      ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg'
                      : 'text-red-500 hover:text-white hover:bg-red-600/20'
                  }`}
                >
                  <Shield size={18} />
                  <span className="hidden lg:inline">Panel</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex justify-center max-w-xl mx-auto hidden sm:flex">
            <SearchBar 
              onMemeSelect={handleMemeSelect} 
              onUserSelect={handleUserSelect} 
              onTagSelect={handleTagSelect}
              onSearchSubmit={handleSearchSubmit}
            />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {user && (
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className={`hidden sm:flex items-center gap-2 bg-gradient-to-r from-${accentClass}-600 to-${accentClass}-500 hover:from-${accentClass}-500 hover:to-${accentClass}-400 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-${accentClass}-600/20 uppercase tracking-widest`}
              >
                <Plus size={16} /> Dodaj Mema
              </button>
            )}

            {user && (
              <button
                onClick={() => { setShowNotificationsPanel(p => !p); }}
                className={`relative p-2 transition-all rounded-xl border ${showNotificationsPanel ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'text-zinc-400 hover:text-white border-transparent'}`}
              >
                <Bell size={22} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button
                onClick={() => { handleNavigateToMessages(); setShowNotificationsPanel(false); }}
                className={`relative p-2 transition-all rounded-xl border ${view === 'MESSAGES' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'text-zinc-400 hover:text-white border-transparent'}`}
              >
                <MessageSquare size={22} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button
                onClick={() => { setShowNotificationsPanel(false); handleNavigateToSettings(); }}
                className={`p-2 transition-all rounded-xl border ${view === 'SETTINGS' ? `bg-${accentClass}-500/10 border-${accentClass}-500/50 text-${accentClass}-500` : 'text-zinc-400 hover:text-white border-transparent'}`}
              >
                <Settings size={22} />
              </button>
            )}
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col items-end">
                  {user.role === 'admin' || user.role === 'moderator' ? (
                    <span
                      onClick={() => handleUserSelect(user.username)}
                      className={`text-xs font-black uppercase bg-gradient-to-r ${user.role === 'admin' ? 'from-purple-500 to-pink-500' : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent cursor-pointer`}
                    >
                      @{user.username}
                    </span>
                  ) : (
                    <span
                      onClick={() => handleUserSelect(user.username)}
                      className={`text-xs font-black uppercase text-${accentClass}-500 cursor-pointer hover:text-${accentClass}-400`}
                    >
                      @{user.username}
                    </span>
                  )}
                   <button onClick={handleLogout} className="text-[10px] text-zinc-500 hover:text-white transition-colors uppercase font-bold flex items-center gap-1">
                     Wyloguj <LogOut size={10} />
                   </button>
                </div>
                <div 
                    onClick={() => handleUserSelect(user.username)}
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${user.avatarColor} border border-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer shadow-lg hover:scale-105 transition-transform`}
                >
                  {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                      <span className="text-white font-black">{user.username[0].toUpperCase()}</span>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className={`flex items-center gap-2 bg-${accentClass}-600 hover:bg-${accentClass}-500 text-white px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-${accentClass}-600/20`}
              >
                <LogIn size={18} /> Zaloguj
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Panel powiadomień */}
      {showNotificationsPanel && user && (
        <NotificationsPanel
          onClose={() => setShowNotificationsPanel(false)}
          onNavigate={(link) => {
            setShowNotificationsPanel(false);
            // Przetwórz link jak URL routing
            const url = new URL(link, window.location.origin);
            applyURL(url.pathname, url.search);
            window.history.pushState({}, '', link);
          }}
          onUnreadChange={setUnreadNotifications}
        />
      )}

      {/* Mobilny dolny pasek nawigacji */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-zinc-800 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          <MobileNavBtn
            active={(view === 'FEED' || view === 'DETAIL')}
            onClick={() => { setView('FEED'); setSelectedMeme(null); setActiveTag(null); setSearchQuery(''); window.history.pushState({}, '', '/'); }}
            icon={<LayoutGrid size={22} />}
            label="Feed"
          />
          <MobileNavBtn
            active={view === 'STUDIO'}
            onClick={() => protectedAction(() => { setView('STUDIO'); window.history.pushState({}, '', '/studio'); })}
            icon={<PenTool size={22} />}
            label="Studio"
          />
          <MobileNavBtn
            active={view === 'ROAST'}
            onClick={() => { setView('ROAST'); window.history.pushState({}, '', '/roast'); }}
            icon={<Flame size={22} />}
            label="Roast AI"
          />
          {user && (
            <MobileNavBtn
              active={false}
              onClick={() => setIsUploadModalOpen(true)}
              icon={<Plus size={22} />}
              label="Dodaj"
              accent
            />
          )}
          {(user?.role === 'admin' || user?.role === 'moderator') && (
            <MobileNavBtn
              active={view === 'ADMIN'}
              onClick={() => { setView('ADMIN'); window.history.pushState({}, '', '/admin'); }}
              icon={<Shield size={22} />}
              label={user.role === 'moderator' ? 'Mod' : 'Admin'}
              danger
            />
          )}
          {user && (
            <MobileNavBtn
              active={view === 'MESSAGES'}
              onClick={() => handleNavigateToMessages()}
              icon={
                <div className="relative">
                  <MessageSquare size={22} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 bg-blue-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
              }
              label="DM"
            />
          )}
          {!user && (
            <MobileNavBtn
              active={false}
              onClick={() => setIsAuthModalOpen(true)}
              icon={<LogIn size={22} />}
              label="Zaloguj"
            />
          )}
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 pt-24 pb-24 md:pb-20">
        {view === 'FEED' && (
          <MemeFeed
            onMemeSelect={handleMemeSelect}
            user={user}
            onAuthRequired={() => setIsAuthModalOpen(true)}
            onUserClick={handleUserSelect}
            activeTag={activeTag}
            searchQuery={searchQuery}
            onClearFilters={() => { setActiveTag(null); setSearchQuery(''); window.history.pushState({}, '', '/'); }}
            onTagSelect={handleTagSelect}
            hideLikeCounts={user?.settings?.hideLikeCounts ?? false}
            onNavigateToDownloads={handleNavigateToDownloads}
          />
        )}
        {view === 'DOWNLOADS' && (
          <DownloadsPage onBack={handleBackFromDownloads} />
        )}
        {view === 'MESSAGES' && user && (
          <MessagesView
            currentUser={user}
            initialUserId={selectedMessageUserId}
            onUserClick={handleUserSelect}
            onMessageCountChange={setUnreadMessages}
          />
        )}
        {view === 'STUDIO' && <MemeStudio user={user} />}
        {view === 'ROAST' && <RoastStation />}
        {view === 'DETAIL' && selectedMeme && (
          <MemeDetail 
            meme={selectedMeme} 
            onBack={handleBackToFeed} 
            user={user}
            onAuthRequired={() => setIsAuthModalOpen(true)}
            onUserClick={handleUserSelect}
            onTagSelect={handleTagSelect}
          />
        )}
        {view === 'PROFILE' && selectedProfileUsername && (
          <UserProfile
            username={selectedProfileUsername}
            onBack={handleBackFromProfile}
            onMemeSelect={handleMemeSelect}
            currentUser={user}
            onUserUpdate={handleUserUpdate}
            onStartDm={(userId) => handleNavigateToMessages(userId)}
          />
        )}
        {view === 'ADMIN' && (user?.role === 'admin' || user?.role === 'moderator') && (
          <AdminPanel currentUserRole={user.role} />
        )}
        {view === 'SETTINGS' && user && (
          <SettingsPage
            user={user}
            accentClass={accentClass}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
            onBack={() => { setView('FEED'); window.history.pushState({}, '', '/'); }}
          />
        )}
      </main>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLogin={handleLogin} 
      />

      <UploadMemeModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSwitchToStudio={() => { setIsUploadModalOpen(false); setView('STUDIO'); window.history.pushState({}, '', '/studio'); }}
        onUploadSuccess={handleUploadSuccess}
        user={user}
      />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const MobileNavBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accent?: boolean; danger?: boolean }> = ({ active, onClick, icon, label, accent, danger }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
      danger
        ? active ? 'text-red-400' : 'text-red-600 hover:text-red-400'
        : accent
        ? 'text-purple-400 hover:text-purple-300'
        : active
        ? 'text-purple-400'
        : 'text-zinc-600 hover:text-zinc-400'
    }`}
  >
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-300 font-bold text-sm tracking-tight ${
      active 
        ? 'bg-zinc-800 text-white shadow-lg' 
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
    }`}
  >
    {icon}
    <span className="hidden lg:inline">{label}</span>
  </button>
);

export default App;
