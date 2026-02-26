import React, { useState, useRef } from 'react';
import {
  User as UserIcon, Shield, Palette, Bell, LayoutGrid, Trash2,
  Lock, Eye, EyeOff, CheckCircle2, XCircle, Camera, Save,
  ChevronRight, LogOut, ArrowLeft,
} from 'lucide-react';
import { User, UserSettings } from '../types';
import { db } from '../services/db';

interface SettingsPageProps {
  user: User;
  accentClass: string;
  onUserUpdate: (u: User) => void;
  onLogout: () => void;
  onBack: () => void;
}

type Section = 'account' | 'security' | 'appearance' | 'notifications' | 'feed' | 'danger';

// ── Wymagania hasła (kopie z AuthModal) ───────────────────────
const pwChecks = [
  { label: 'Min. 8 znaków',       test: (p: string) => p.length >= 8 },
  { label: 'Duża litera (A-Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Cyfra (0-9)',          test: (p: string) => /[0-9]/.test(p) },
  { label: 'Znak specjalny (!@#)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'account',       label: 'Konto',           icon: <UserIcon size={16} /> },
  { id: 'security',      label: 'Bezpieczeństwo',  icon: <Shield size={16} /> },
  { id: 'appearance',    label: 'Wygląd',          icon: <Palette size={16} /> },
  { id: 'notifications', label: 'Powiadomienia',   icon: <Bell size={16} /> },
  { id: 'feed',          label: 'Feed',            icon: <LayoutGrid size={16} /> },
  { id: 'danger',        label: 'Usuń konto',      icon: <Trash2 size={16} /> },
];

// ── Helpers ───────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6">{children}</h3>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 ${className}`}>{children}</div>
);

const Toggle = ({ active, onToggle }: { active?: boolean; onToggle: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onToggle(!active)}
    className={`relative w-12 h-6 rounded-full transition-all ${active ? 'bg-purple-600' : 'bg-zinc-700'}`}
  >
    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'translate-x-6' : 'translate-x-0'}`} />
  </button>
);

const SettingRow = ({ label, description, active, onToggle }: {
  label: string; description?: string; active?: boolean; onToggle: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-bold text-white">{label}</p>
      {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
    </div>
    <Toggle active={active} onToggle={onToggle} />
  </div>
);

const StatusMsg = ({ ok, err }: { ok?: string; err?: string }) => (
  <>
    {ok  && <p className="text-green-500 text-xs font-bold text-center mt-2">{ok}</p>}
    {err && <p className="text-red-500  text-xs font-bold text-center mt-2">{err}</p>}
  </>
);

// ─────────────────────────────────────────────────────────────
const SettingsPage: React.FC<SettingsPageProps> = ({ user, accentClass, onUserUpdate, onLogout, onBack }) => {
  const [section, setSection] = useState<Section>('account');
  const [mobileNav, setMobileNav] = useState(false);

  // Konto
  const [username, setUsername]   = useState(user.username);
  const [usernameOk, setUsernameOk] = useState('');
  const [usernameErr, setUsernameErr] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const avatarInputRef  = useRef<HTMLInputElement>(null);
  const bannerInputRef  = useRef<HTMLInputElement>(null);

  // Bezpieczeństwo
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [pwOk, setPwOk]             = useState('');
  const [pwErr, setPwErr]           = useState('');
  const [savingPw, setSavingPw]     = useState(false);

  // Usunięcie konta
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteErr, setDeleteErr]         = useState('');
  const [deleting, setDeleting]           = useState(false);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...user.settings!, [key]: value };
    db.updateUser(user.id, { settings: newSettings }).then(u => { if (u) onUserUpdate(u); });
  };

  // ── Zmiana avatara ────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await db.uploadFile(file);
      const updated = await db.updateUser(user.id, { avatarUrl: url });
      if (updated) onUserUpdate(updated);
    } catch { /* ignoruj */ }
  };

  // ── Zmiana bannera ────────────────────────────────────────
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await db.uploadFile(file);
      const updated = await db.updateUser(user.id, { bannerUrl: url });
      if (updated) onUserUpdate(updated);
    } catch { /* ignoruj */ }
  };

  // ── Zmiana username ───────────────────────────────────────
  const handleSaveUsername = async () => {
    setUsernameOk(''); setUsernameErr('');
    const val = username.trim();
    if (val.length < 3) { setUsernameErr('Min. 3 znaki'); return; }
    if (val.length > 20) { setUsernameErr('Maks. 20 znaków'); return; }
    if (!/^[A-Za-z0-9_-]+$/.test(val)) { setUsernameErr('Tylko litery, cyfry, _ i -'); return; }
    setSavingUsername(true);
    try {
      const updated = await db.updateUser(user.id, { username: val });
      if (updated) { onUserUpdate(updated); setUsernameOk('Nazwa użytkownika zmieniona!'); }
    } catch (err: any) {
      setUsernameErr(err.message || 'Błąd');
    } finally { setSavingUsername(false); }
  };

  // ── Zmiana hasła ─────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwOk(''); setPwErr('');
    if (!pwChecks.every(c => c.test(newPw))) { setPwErr('Hasło nie spełnia wymagań'); return; }
    if (newPw !== confirmPw) { setPwErr('Hasła nie są identyczne'); return; }
    setSavingPw(true);
    try {
      await db.changePassword(currentPw, newPw);
      setPwOk('Hasło zmienione pomyślnie!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setPwErr(err.message || 'Błąd');
    } finally { setSavingPw(false); }
  };

  // ── Usunięcie konta ───────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteErr('');
    if (deleteConfirm !== user.username) {
      setDeleteErr('Wpisz dokładnie swoją nazwę użytkownika'); return;
    }
    setDeleting(true);
    try {
      await db.deleteAccount();
      onLogout();
    } catch (err: any) {
      setDeleteErr(err.message || 'Błąd');
      setDeleting(false);
    }
  };

  // ── Aktywna sekcja ────────────────────────────────────────
  const goSection = (s: Section) => { setSection(s); setMobileNav(false); };

  const renderSection = () => {
    switch (section) {

      // ── Konto ─────────────────────────────────────────────
      case 'account': return (
        <div className="space-y-6">
          <SectionTitle>Konto</SectionTitle>

          {/* Banner */}
          <Card className="p-0 overflow-hidden">
            <div
              className="relative h-32 bg-gradient-to-r from-purple-900/40 to-zinc-900 cursor-pointer group"
              style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              onClick={() => bannerInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full">
                  <Camera size={14} /> Zmień baner
                </span>
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </div>

            {/* Avatar nad banerem */}
            <div className="px-6 pb-6">
              <div className="relative -mt-10 mb-4 w-20 h-20 inline-block">
                <div
                  className={`w-20 h-20 rounded-2xl border-4 border-zinc-900 overflow-hidden cursor-pointer group bg-gradient-to-tr ${user.avatarUrl ? '' : user.avatarColor}`}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                    : <span className="w-full h-full flex items-center justify-center text-3xl font-black text-white uppercase">{user.username[0]}</span>
                  }
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 rounded-2xl transition-all flex items-center justify-center">
                    <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <p className="text-xs text-zinc-500 mb-4">Kliknij na avatar lub baner, aby zmienić zdjęcie</p>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Nazwa użytkownika</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    maxLength={20}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    disabled={savingUsername || username.trim() === user.username}
                    className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <Save size={14} />
                    {savingUsername ? '...' : 'Zapisz'}
                  </button>
                </div>
                <StatusMsg ok={usernameOk} err={usernameErr} />
              </div>
            </div>
          </Card>

          {/* Data dołączenia */}
          <Card>
            <SettingRow
              label="Pokaż datę dołączenia"
              description="Wyświetlaj datę rejestracji na swoim profilu"
              active={user.settings?.showJoinDate}
              onToggle={v => updateSetting('showJoinDate', v)}
            />
          </Card>
        </div>
      );

      // ── Bezpieczeństwo ────────────────────────────────────
      case 'security': return (
        <div className="space-y-6">
          <SectionTitle>Bezpieczeństwo</SectionTitle>
          <Card>
            <p className="text-xs text-zinc-500 mb-5">Zmiana hasła wymaga podania obecnego hasła.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Obecne hasło */}
              <PwField label="Obecne hasło" value={currentPw} onChange={setCurrentPw} show={showPw} onToggleShow={() => setShowPw(v => !v)} />
              {/* Nowe hasło */}
              <div>
                <PwField label="Nowe hasło" value={newPw} onChange={setNewPw} show={showPw} onToggleShow={() => setShowPw(v => !v)} />
                {newPw.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {pwChecks.map(c => {
                      const ok = c.test(newPw);
                      return (
                        <div key={c.label} className="flex items-center gap-2">
                          {ok ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                          <span className={`text-[10px] font-semibold ${ok ? 'text-green-500' : 'text-red-500'}`}>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Powtórz */}
              <PwField label="Powtórz nowe hasło" value={confirmPw} onChange={setConfirmPw} show={showPw} onToggleShow={() => setShowPw(v => !v)} />
              {confirmPw && newPw !== confirmPw && (
                <p className="text-red-500 text-xs font-bold">Hasła nie są identyczne</p>
              )}
              <StatusMsg ok={pwOk} err={pwErr} />
              <button
                type="submit"
                disabled={savingPw || !currentPw || !newPw || !confirmPw}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Lock size={14} />
                {savingPw ? 'Zapisuję...' : 'Zmień hasło'}
              </button>
            </form>
          </Card>
        </div>
      );

      // ── Wygląd ────────────────────────────────────────────
      case 'appearance': return (
        <div className="space-y-6">
          <SectionTitle>Wygląd</SectionTitle>
          <Card className="space-y-5">
            <div>
              <p className="text-sm font-bold text-white mb-3">Kolor akcentu</p>
              <div className="flex gap-3">
                {(['purple', 'green', 'orange', 'blue'] as const).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateSetting('accentColor', color)}
                    className={`w-11 h-11 rounded-xl border-2 transition-all ${user.settings?.accentColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color === 'purple' ? '#9333ea' : color === 'green' ? '#10b981' : color === 'orange' ? '#f97316' : '#3b82f6' }}
                  />
                ))}
              </div>
            </div>
            <hr className="border-zinc-800" />
            <SettingRow
              label="Ukryj licznik lajków"
              description="Nie pokazuj liczby polubień na postach"
              active={user.settings?.hideLikeCounts}
              onToggle={v => updateSetting('hideLikeCounts', v)}
            />
          </Card>
        </div>
      );

      // ── Powiadomienia ─────────────────────────────────────
      case 'notifications': return (
        <div className="space-y-6">
          <SectionTitle>Powiadomienia</SectionTitle>
          <Card>
            <SettingRow
              label="Powiadomienia push"
              description="Komentarze, odpowiedzi i wyróżnienia memów"
              active={user.settings?.enableNotifications}
              onToggle={v => updateSetting('enableNotifications', v)}
            />
          </Card>
        </div>
      );

      // ── Feed ──────────────────────────────────────────────
      case 'feed': return (
        <div className="space-y-6">
          <SectionTitle>Preferencje Feedu</SectionTitle>
          <Card>
            <p className="text-sm font-bold text-white mb-4">Domyślne sortowanie</p>
            <div className="grid grid-cols-3 gap-2">
              {(['HOT', 'NOWE', 'TOP'] as const).map(sort => (
                <button
                  key={sort}
                  type="button"
                  onClick={() => updateSetting('defaultSort', sort)}
                  className={`py-3 rounded-xl text-xs font-black border transition-all ${
                    user.settings?.defaultSort === sort
                      ? `bg-${accentClass}-600 border-${accentClass}-500 text-white`
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </Card>
        </div>
      );

      // ── Niebezpieczna strefa ──────────────────────────────
      case 'danger': return (
        <div className="space-y-6">
          <SectionTitle>Usuń konto</SectionTitle>
          <Card className="border-red-900/30">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-900/20 rounded-xl text-red-500 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Trwałe usunięcie konta</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tej operacji nie można cofnąć. Wszystkie Twoje memy, komentarze i wiadomości
                  zostaną trwale usunięte.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                Wpisz <span className="text-white">{user.username}</span>, aby potwierdzić
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={user.username}
                className="w-full bg-zinc-950 border border-red-900/40 rounded-xl px-4 py-3 text-sm font-medium focus:border-red-500 outline-none transition-all"
              />
              {deleteErr && <p className="text-red-500 text-xs font-bold">{deleteErr}</p>}
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== user.username}
                className="w-full py-3.5 bg-red-900/20 hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-red-500 border border-red-900/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {deleting ? 'Usuwam...' : 'Usuń konto na zawsze'}
              </button>
            </div>
          </Card>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Nagłówek */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">Ustawienia</h1>
            <p className="text-xs text-zinc-500 font-medium">@{user.username}</p>
          </div>
        </div>

        <div className="flex gap-6">

          {/* ── Sidebar (desktop) ───────────────────────────── */}
          <aside className="hidden md:block w-56 shrink-0">
            <nav className="space-y-1 sticky top-8">
              {navItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                    section === item.id
                      ? `bg-${accentClass}-600/15 text-${accentClass}-400 border border-${accentClass}-600/30`
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60'
                  } ${item.id === 'danger' ? '!text-red-500 hover:!bg-red-900/10 mt-4' : ''}`}
                >
                  {item.icon}
                  {item.label}
                  {section === item.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}

              <hr className="border-zinc-800 my-3" />
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-red-400 hover:bg-red-900/10 transition-all"
              >
                <LogOut size={16} /> Wyloguj się
              </button>
            </nav>
          </aside>

          {/* ── Mobile nav tabs ─────────────────────────────── */}
          <div className="md:hidden w-full mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {navItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goSection(item.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    section === item.id
                      ? `bg-${accentClass}-600 text-white`
                      : 'bg-zinc-800 text-zinc-400'
                  } ${item.id === 'danger' ? '!bg-red-900/20 !text-red-400' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Treść sekcji ────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {renderSection()}
          </main>

        </div>
      </div>
    </div>
  );
};

// ── Pomocniczy komponent pola hasła ───────────────────────────
const PwField = ({ label, value, onChange, show, onToggleShow }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void;
}) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:border-purple-500 outline-none transition-all"
      />
      <button type="button" onClick={onToggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);

export default SettingsPage;
