import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Lock, Mail, Zap, Sparkles, ShieldCheck,
  RefreshCw, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle,
} from 'lucide-react';
import { User as UserType } from '../types';
import { db } from '../services/db';

type AuthStep =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'forgot-email'
  | 'forgot-code'
  | 'forgot-newpass';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserType) => void;
}

// ── Wymagania hasła ────────────────────────────────────────────
const pwChecks = [
  { label: 'Min. 8 znaków',       test: (p: string) => p.length >= 8 },
  { label: 'Duża litera (A-Z)',    test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Cyfra (0-9)',          test: (p: string) => /[0-9]/.test(p) },
  { label: 'Znak specjalny (!@#)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ── Cooldown hook ─────────────────────────────────────────────
function useCooldown(seconds: number) {
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  return { cooldown, start };
}

// ─────────────────────────────────────────────────────────────
const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [step, setStep]               = useState<AuthStep>('login');
  const [username, setUsername]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]             = useState('');
  const [info, setInfo]               = useState('');
  const [isLoading, setIsLoading]     = useState(false);

  const verifyCooldown  = useCooldown(60);
  const resetCooldown   = useCooldown(60);

  // Reset do ekranu logowania przy każdym zamknięciu modalu
  useEffect(() => {
    if (!isOpen) resetAll();
  }, [isOpen]);

  if (!isOpen) return null;

  const goTo = (s: AuthStep) => { setStep(s); setError(''); setInfo(''); };
  const resetAll = () => {
    setStep('login'); setUsername(''); setEmail(''); setPassword('');
    setCode(''); setNewPassword(''); setConfirmPassword('');
    setPendingEmail(''); setError(''); setInfo('');
  };

  const pwAllGood = pwChecks.every(c => c.test(newPassword || password));

  // ── Logowanie ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const user = await db.login(username, password);
      onLogin(user);
      onClose();
    } catch (err: any) {
      if (err.data?.needsVerification) {
        setPendingEmail(err.data.email || email);
        goTo('verify-email');
      } else {
        setError(err.message || 'Błąd logowania');
      }
    } finally { setIsLoading(false); }
  };

  // ── Rejestracja ───────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pwAllGood) { setError('Hasło nie spełnia wymagań bezpieczeństwa'); return; }
    setIsLoading(true);
    try {
      await db.register({ username, email, password });
      setPendingEmail(email);
      goTo('verify-email');
      verifyCooldown.start();
    } catch (err: any) {
      setError(err.message || 'Błąd rejestracji');
    } finally { setIsLoading(false); }
  };

  // ── Weryfikacja emaila ────────────────────────────────────
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      const user = await db.verifyEmail(pendingEmail, code);
      onLogin(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Błąd weryfikacji');
    } finally { setIsLoading(false); }
  };

  const handleResendVerification = async () => {
    if (verifyCooldown.cooldown > 0) return;
    setError(''); setInfo('');
    try {
      await db.resendVerification(pendingEmail);
      setInfo('Kod wysłany ponownie! Sprawdź skrzynkę.');
      verifyCooldown.start();
    } catch (err: any) {
      setError(err.message || 'Błąd wysyłki');
    }
  };

  // ── Zapomniane hasło ──────────────────────────────────────
  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      await db.forgotPassword(pendingEmail || email);
      setPendingEmail(pendingEmail || email);
      goTo('forgot-code');
      resetCooldown.start();
      setInfo('Kod wysłany! Sprawdź skrzynkę email.');
    } catch (err: any) {
      setError(err.message || 'Błąd');
    } finally { setIsLoading(false); }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
      await db.verifyResetCode(pendingEmail, code);
      goTo('forgot-newpass');
    } catch (err: any) {
      setError(err.message || 'Nieprawidłowy kod');
    } finally { setIsLoading(false); }
  };

  const handleResendReset = async () => {
    if (resetCooldown.cooldown > 0) return;
    setError(''); setInfo('');
    try {
      await db.forgotPassword(pendingEmail);
      setInfo('Nowy kod wysłany!');
      resetCooldown.start();
    } catch (err: any) { setError(err.message || 'Błąd'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pwAllGood) { setError('Hasło nie spełnia wymagań bezpieczeństwa'); return; }
    if (newPassword !== confirmPassword) { setError('Hasła nie są identyczne'); return; }
    setIsLoading(true);
    try {
      const user = await db.resetPassword(pendingEmail, code, newPassword);
      onLogin(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Błąd resetowania hasła');
    } finally { setIsLoading(false); }
  };

  // ── Wskaźnik siły hasła ───────────────────────────────────
  const PasswordStrength = ({ value }: { value: string }) => (
    value.length === 0 ? null : (
      <div className="mt-2 space-y-1">
        {pwChecks.map(c => {
          const ok = c.test(value);
          return (
            <div key={c.label} className="flex items-center gap-2">
              {ok
                ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                : <XCircle      size={12} className="text-red-500 shrink-0" />
              }
              <span className={`text-[10px] font-semibold ${ok ? 'text-green-500' : 'text-red-500'}`}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>
    )
  );

  // ── Pole kodu weryfikacyjnego ─────────────────────────────
  const CodeInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="relative">
      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
      <input
        type="text"
        required
        placeholder="np. AbC-dE-fGh"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-purple-500 outline-none transition-all font-mono font-bold tracking-[0.15em] text-center text-base"
        maxLength={10}
        autoComplete="one-time-code"
        spellCheck={false}
      />
    </div>
  );

  // ── Renderowanie kroku ────────────────────────────────────

  // Logowanie
  if (step === 'login') return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <BrandIcon />
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Witaj Ponownie!</h2>
        <p className="text-zinc-500 text-sm font-medium">Zaloguj się, aby tworzyć i oceniać memy.</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-4">
        <InputField icon={<User size={18} />} type="text" placeholder="Nazwa użytkownika" value={username} onChange={setUsername} />
        <PasswordField placeholder="Hasło" value={password} show={showPassword} toggle={() => setShowPassword(v => !v)} onChange={setPassword} />
        <ErrorMsg msg={error} />
        <SubmitBtn loading={isLoading} label="Zaloguj Mnie" />
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={() => { setPendingEmail(''); goTo('forgot-email'); }}
          className="text-xs text-zinc-500 hover:text-purple-400 transition-colors font-medium"
        >
          Nie pamiętasz hasła?
        </button>
      </div>
      <Divider>
        Nie masz jeszcze konta?{' '}
        <button onClick={() => goTo('register')} className="ml-1 text-purple-500 hover:text-purple-400 font-black">Zarejestruj się</button>
      </Divider>
    </Modal>
  );

  // Rejestracja
  if (step === 'register') return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center space-y-2 mb-6">
        <BrandIcon />
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Dołącz do Hubu</h2>
        <p className="text-zinc-500 text-sm font-medium">Załóż konto i zapanuj nad mocą.</p>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="relative w-20 h-20 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 animate-[spin_4s_linear_infinite]"></div>
            {username
              ? <span className="relative z-10 text-3xl font-black text-white uppercase">{username[0]}</span>
              : <User className="relative z-10 text-zinc-600 animate-bounce" size={28} />
            }
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <InputField icon={<Mail size={18} />}  type="email"    placeholder="Adres Email"         value={email}    onChange={setEmail} />
        <InputField icon={<User size={18} />}  type="text"     placeholder="Nazwa użytkownika"   value={username} onChange={setUsername} />
        <div>
          <PasswordField placeholder="Hasło" value={password} show={showPassword} toggle={() => setShowPassword(v => !v)} onChange={setPassword} />
          <PasswordStrength value={password} />
        </div>
        <ErrorMsg msg={error} />
        <SubmitBtn loading={isLoading} label="Stwórz Konto" />
      </form>
      <Divider>
        Masz już konto?{' '}
        <button onClick={() => goTo('login')} className="ml-1 text-purple-500 hover:text-purple-400 font-black">Zaloguj się</button>
      </Divider>
    </Modal>
  );

  // Weryfikacja emaila
  if (step === 'verify-email') return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center space-y-2 mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl flex items-center justify-center mb-2 text-3xl shadow-lg">
          📬
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sprawdź skrzynkę</h2>
        <p className="text-zinc-400 text-sm">
          Wysłaliśmy kod na <span className="text-purple-400 font-bold">{pendingEmail}</span>
        </p>
        <p className="text-zinc-600 text-xs">Sprawdź folder spam jeśli nie widzisz emaila</p>
      </div>
      <form onSubmit={handleVerifyEmail} className="space-y-4">
        <CodeInput value={code} onChange={setCode} />
        <ErrorMsg msg={error} />
        {info && <p className="text-green-500 text-xs font-bold text-center">{info}</p>}
        <SubmitBtn loading={isLoading} label="Potwierdź konto" icon={<ShieldCheck size={18} />} />
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={handleResendVerification}
          disabled={verifyCooldown.cooldown > 0}
          className="flex items-center gap-2 mx-auto text-xs text-zinc-500 hover:text-purple-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <RefreshCw size={12} />
          {verifyCooldown.cooldown > 0
            ? `Wyślij ponownie za ${verifyCooldown.cooldown}s`
            : 'Wyślij kod ponownie'
          }
        </button>
      </div>
      <Divider>
        <button onClick={() => goTo('login')} className="flex items-center gap-1 mx-auto text-xs text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Wróć do logowania
        </button>
      </Divider>
    </Modal>
  );

  // Zapomniane hasło — wpisz email
  if (step === 'forgot-email') return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center space-y-2 mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-orange-600 to-red-500 rounded-2xl flex items-center justify-center mb-2 text-3xl shadow-lg">
          🔑
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Reset hasła</h2>
        <p className="text-zinc-400 text-sm">Wpisz adres email — wyślemy Ci kod</p>
      </div>
      <form onSubmit={handleForgotEmail} className="space-y-4">
        <InputField
          icon={<Mail size={18} />}
          type="email"
          placeholder="Adres Email"
          value={pendingEmail}
          onChange={setPendingEmail}
        />
        <ErrorMsg msg={error} />
        <SubmitBtn loading={isLoading} label="Wyślij kod" />
      </form>
      <Divider>
        <button onClick={() => goTo('login')} className="flex items-center gap-1 mx-auto text-xs text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Wróć do logowania
        </button>
      </Divider>
    </Modal>
  );

  // Zapomniane hasło — wpisz kod
  if (step === 'forgot-code') return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center space-y-2 mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-orange-600 to-red-500 rounded-2xl flex items-center justify-center mb-2 text-3xl shadow-lg">
          📬
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Wpisz kod</h2>
        <p className="text-zinc-400 text-sm">
          Wysłaliśmy kod na <span className="text-orange-400 font-bold">{pendingEmail}</span>
        </p>
      </div>
      <form onSubmit={handleVerifyResetCode} className="space-y-4">
        <CodeInput value={code} onChange={setCode} />
        <ErrorMsg msg={error} />
        {info && <p className="text-green-500 text-xs font-bold text-center">{info}</p>}
        <SubmitBtn loading={isLoading} label="Zweryfikuj kod" icon={<ShieldCheck size={18} />} />
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={handleResendReset}
          disabled={resetCooldown.cooldown > 0}
          className="flex items-center gap-2 mx-auto text-xs text-zinc-500 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <RefreshCw size={12} />
          {resetCooldown.cooldown > 0
            ? `Wyślij ponownie za ${resetCooldown.cooldown}s`
            : 'Wyślij kod ponownie'
          }
        </button>
      </div>
      <Divider>
        <button onClick={() => goTo('forgot-email')} className="flex items-center gap-1 mx-auto text-xs text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Wpisz inny email
        </button>
      </Divider>
    </Modal>
  );

  // Zapomniane hasło — nowe hasło
  if (step === 'forgot-newpass') return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center space-y-2 mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-green-600 to-teal-500 rounded-2xl flex items-center justify-center mb-2 text-3xl shadow-lg">
          🔒
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter">Nowe hasło</h2>
        <p className="text-zinc-400 text-sm">Ustaw nowe, silne hasło do konta</p>
      </div>
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <PasswordField
            placeholder="Nowe hasło"
            value={newPassword}
            show={showNewPassword}
            toggle={() => setShowNewPassword(v => !v)}
            onChange={setNewPassword}
          />
          <PasswordStrength value={newPassword} />
        </div>
        <PasswordField
          placeholder="Powtórz nowe hasło"
          value={confirmPassword}
          show={showNewPassword}
          toggle={() => setShowNewPassword(v => !v)}
          onChange={setConfirmPassword}
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-red-500 text-xs font-bold">Hasła nie są identyczne</p>
        )}
        <ErrorMsg msg={error} />
        <SubmitBtn loading={isLoading} label="Zmień hasło" icon={<ShieldCheck size={18} />} />
      </form>
    </Modal>
  );

  return null;
};

// ── Małe pomocnicze komponenty ────────────────────────────────
const Modal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-full z-10">
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

const BrandIcon = () => (
  <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mb-2">
    <Zap className="text-white fill-white" size={32} />
  </div>
);

const InputField = ({
  icon, type, placeholder, value, onChange,
}: {
  icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (v: string) => void;
}) => (
  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</span>
    <input
      type={type}
      required
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-purple-500 outline-none transition-all font-medium"
    />
  </div>
);

const PasswordField = ({
  placeholder, value, show, toggle, onChange,
}: {
  placeholder: string; value: string; show: boolean; toggle: () => void; onChange: (v: string) => void;
}) => (
  <div className="relative">
    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
    <input
      type={show ? 'text' : 'password'}
      required
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-12 py-4 text-sm focus:border-purple-500 outline-none transition-all font-medium"
    />
    <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
);

const ErrorMsg = ({ msg }: { msg: string }) =>
  msg ? <p className="text-red-500 text-xs font-bold text-center">{msg}</p> : null;

const SubmitBtn = ({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-purple-600/20 text-sm uppercase tracking-widest mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {icon || <Sparkles size={18} />}
    {loading ? 'Ładuję...' : label}
  </button>
);

const Divider = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
    <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">{children}</p>
  </div>
);

export default AuthModal;
