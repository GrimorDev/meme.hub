
import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, PenTool, Flame, Zap, User as UserIcon, Settings, LogOut, LogIn, Plus, X, Shield, Palette, Eye, Bell as BellIcon, ChevronRight } from 'lucide-react';
import { AppView, MemePost, User, UserSettings } from './types';
import MemeFeed from './components/MemeFeed';
import MemeStudio from './components/MemeStudio';
import RoastStation from './components/RoastStation';
import MemeDetail from './components/MemeDetail';
import UserProfile from './components/UserProfile';
import AuthModal from './components/AuthModal';
import UploadMemeModal from './components/UploadMemeModal';
import SearchBar from './components/SearchBar';
import { db } from './services/db';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('FEED');
  const [selectedMeme, setSelectedMeme] = useState<MemePost | null>(null);
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
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

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    setShowSettingsPanel(false);
    if (view === 'STUDIO') setView('FEED');
  };

  const handleMemeSelect = (meme: MemePost) => {
    setSelectedMeme(meme);
    setView('DETAIL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToFeed = () => {
    setView('FEED');
    setSelectedMeme(null);
    setFeedRefreshTrigger(prev => prev + 1);
  };

  const handleUserSelect = (username: string) => {
    setSelectedProfileUsername(username);
    setView('PROFILE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagSelect = (tag: string) => {
    setActiveTag(tag);
    setSearchQuery('');
    setView('FEED');
    setSelectedMeme(null);
    setSelectedProfileUsername(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setActiveTag(null);
    setView('FEED');
    setSelectedMeme(null);
    setSelectedProfileUsername(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromProfile = () => {
    setView('FEED'); 
    setSelectedProfileUsername(null);
  };

  const handleUploadSuccess = () => {
    setFeedRefreshTrigger(prev => prev + 1);
    setView('FEED');
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!user) return;
    const newSettings = { ...user.settings!, [key]: value };
    db.updateUser(user.id, { settings: newSettings }).then((updatedUser) => {
      if (updatedUser) handleUserUpdate(updatedUser);
    });
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
              onClick={() => { setView('FEED'); setSelectedMeme(null); setActiveTag(null); setSearchQuery(''); }}
            >
              <div className={`w-10 h-10 bg-gradient-to-tr from-${accentClass}-600 to-pink-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)] group-hover:scale-110 transition-transform`}>
                <Zap className="text-white fill-white" size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic hidden lg:block">MEME.HUB</span>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-zinc-800">
              <NavButton active={(view === 'FEED' || view === 'DETAIL') && !activeTag && !searchQuery} onClick={() => { setView('FEED'); setSelectedMeme(null); setActiveTag(null); setSearchQuery(''); }} icon={<LayoutGrid size={18} />} label="Feed" />
              <NavButton active={view === 'STUDIO'} onClick={() => protectedAction(() => setView('STUDIO'))} icon={<PenTool size={18} />} label="Studio" />
              <NavButton active={view === 'ROAST'} onClick={() => setView('ROAST')} icon={<Flame size={18} />} label="Roast AI" />
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
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className={`p-2 transition-all rounded-xl border ${showSettingsPanel ? `bg-${accentClass}-500/10 border-${accentClass}-500/50 text-${accentClass}-500` : 'text-zinc-400 hover:text-white border-transparent'}`}
              >
                <Settings size={22} />
              </button>
            )}
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col items-end">
                   <span 
                        onClick={() => handleUserSelect(user.username)}
                        className={`text-xs font-black uppercase text-${accentClass}-500 cursor-pointer hover:text-${accentClass}-400`}
                    >
                        @{user.username}
                   </span>
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

      {/* Modern User Settings Panel */}
      {showSettingsPanel && user && (
        <div className="fixed top-20 right-4 w-96 bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl z-[60] animate-in fade-in slide-in-from-top-4 duration-300 max-h-[85vh] overflow-y-auto custom-scrollbar">
           <div className="space-y-8">
              <div className="flex justify-between items-center mb-2">
                <div>
                    <h3 className="font-black italic uppercase tracking-widest text-white text-lg">Ustawienia</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Witaj, {user.username}</p>
                </div>
                <button onClick={() => setShowSettingsPanel(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all"><X size={16} /></button>
              </div>

              {/* Account Section */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                    <Shield size={12} /> Konto i Bezpieczeństwo
                 </h4>
                 <div className="space-y-2">
                    <SettingItem label="Profil Prywatny" description="Tylko zalogowani widzą Twoją aktywność" active={user.settings?.privateProfile} onToggle={(v) => updateSetting('privateProfile', v)} />
                    <button className="w-full flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all text-left">
                        <span className="text-sm font-bold text-zinc-300">Zmień Hasło</span>
                        <ChevronRight size={14} className="text-zinc-600" />
                    </button>
                 </div>
              </div>

              {/* Visual Section */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                    <Palette size={12} /> Wygląd Interfejsu
                 </h4>
                 <div className="space-y-3">
                    <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800">
                        <p className="text-xs font-bold text-zinc-400 mb-3">Kolor Akcentu</p>
                        <div className="flex gap-3">
                            {(['purple', 'green', 'orange', 'blue'] as const).map(color => (
                                <button 
                                    key={color}
                                    onClick={() => updateSetting('accentColor', color)}
                                    className={`w-10 h-10 rounded-xl border-2 transition-all ${user.settings?.accentColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color === 'purple' ? '#9333ea' : color === 'green' ? '#10b981' : color === 'orange' ? '#f97316' : '#3b82f6' }}
                                />
                            ))}
                        </div>
                    </div>
                    <SettingItem label="Ukryj Licznik Lajków" description="Nie pokazuj liczby polubień na profilu" active={user.settings?.hideLikeCounts} onToggle={(v) => updateSetting('hideLikeCounts', v)} />
                 </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                    <BellIcon size={12} /> Powiadomienia
                 </h4>
                 <div className="space-y-2">
                    <SettingItem label="Powiadomienia Push" description="Reakcje i komentarze pod postami" active={user.settings?.enableNotifications} onToggle={(v) => updateSetting('enableNotifications', v)} />
                 </div>
              </div>

              {/* Feed Preferences */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                    <LayoutGrid size={12} /> Preferencje Feedu
                 </h4>
                 <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800 space-y-3">
                    <p className="text-xs font-bold text-zinc-400">Domyślne Sortowanie</p>
                    <div className="grid grid-cols-3 gap-2">
                        {(['HOT', 'FRESH', 'TOP'] as const).map(sort => (
                            <button 
                                key={sort}
                                onClick={() => updateSetting('defaultSort', sort)}
                                className={`py-2 rounded-lg text-[10px] font-black border transition-all ${user.settings?.defaultSort === sort ? `bg-${accentClass}-600 border-${accentClass}-500 text-white` : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
                            >
                                {sort}
                            </button>
                        ))}
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <button 
                    onClick={handleLogout}
                    className="w-full py-4 bg-red-900/10 hover:bg-red-900/20 text-red-500 rounded-2xl border border-red-900/20 font-black uppercase tracking-widest text-[10px] transition-all"
                >
                    Wyloguj się
                </button>
                <p className="text-[8px] text-zinc-600 mt-4 text-center italic">Wszystkie ustawienia są zapisywane w Twoim profilu Meme.Hub</p>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 pt-24 pb-20">
        {view === 'FEED' && (
          <MemeFeed 
            onMemeSelect={handleMemeSelect} 
            user={user} 
            onAuthRequired={() => setIsAuthModalOpen(true)}
            onUserClick={handleUserSelect}
            activeTag={activeTag}
            searchQuery={searchQuery}
            onClearFilters={() => { setActiveTag(null); setSearchQuery(''); }}
            onTagSelect={handleTagSelect}
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
        onSwitchToStudio={() => { setIsUploadModalOpen(false); setView('STUDIO'); }}
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

const SettingItem: React.FC<{ label: string; description: string; active?: boolean; onToggle: (v: boolean) => void }> = ({ label, description, active, onToggle }) => (
    <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
        <div className="space-y-0.5">
            <p className="text-sm font-bold text-zinc-100">{label}</p>
            <p className="text-[10px] text-zinc-500 font-medium">{description}</p>
        </div>
        <button 
            onClick={() => onToggle(!active)}
            className={`w-12 h-6 rounded-full transition-all relative ${active ? 'bg-purple-600' : 'bg-zinc-800'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
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
