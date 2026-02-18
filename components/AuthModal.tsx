
import React, { useState } from 'react';
import { X, User, Lock, Mail, Zap, Sparkles } from 'lucide-react';
import { User as UserType } from '../types';
import { db } from '../services/db';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserType) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        if (isLogin) {
            const user = await db.login(username, password);
            onLogin(user);
            onClose();
        } else {
            const newUser = await db.register({
                username,
                email,
                password,
            });
            onLogin(newUser);
            onClose();
        }
    } catch (err: any) {
        setError(err.message || 'Wystąpił błąd');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mb-2">
            <Zap className="text-white fill-white" size={32} />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            {isLogin ? 'Witaj Ponownie!' : 'Dołącz do Hubu'}
          </h2>
          <p className="text-zinc-500 text-sm font-medium">
            {isLogin ? 'Zaloguj się, aby tworzyć i oceniać memy.' : 'Załóż konto i zapanuj nad mocą.'}
          </p>
        </div>

        {!isLogin && (
            <div className="flex justify-center mb-8">
                <div className="relative group cursor-default">
                    {/* Pulsing Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-40 animate-pulse group-hover:opacity-60 transition-opacity"></div>
                    
                    {/* Avatar Circle */}
                    <div className="relative w-24 h-24 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl">
                        {/* Rotating Background Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 animate-[spin_4s_linear_infinite]"></div>
                        
                        {username ? (
                            <span className="relative z-10 text-4xl font-black text-white uppercase drop-shadow-lg animate-in zoom-in duration-300">
                                {username[0]}
                            </span>
                        ) : (
                            <User className="relative z-10 text-zinc-600 animate-bounce" size={32} />
                        )}
                    </div>
                    
                    {/* Small Status Indicator */}
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email" 
                required
                placeholder="Adres Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-purple-500 outline-none transition-all font-medium"
              />
            </div>
          )}
          
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              required
              placeholder="Nazwa użytkownika"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-purple-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="password" 
              required
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-purple-500 outline-none transition-all font-medium"
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-purple-600/20 text-sm uppercase tracking-widest mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Sparkles size={18} />
            {isLoading ? 'Ładuję...' : isLogin ? 'Zaloguj Mnie' : 'Stwórz Konto'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">
            {isLogin ? 'Nie masz jeszcze konta?' : 'Masz już konto?'}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="ml-2 text-purple-500 hover:text-purple-400 transition-colors font-black"
            >
              {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
