
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Heart, Grid, Shield } from 'lucide-react';
import { User } from '../types';
import { db } from '../services/db';

interface UserHoverCardProps {
  username: string;
  children: React.ReactNode;
  onUserClick: (username: string) => void;
  className?: string;
  disabled?: boolean;
}

const UserHoverCard: React.FC<UserHoverCardProps> = ({ username, children, onUserClick, className = '', disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [stats, setStats] = useState({ postCount: 0, totalLikes: 0 });
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isVisible && !disabled) {
      Promise.all([db.getUser(username), db.getUserStats(username)]).then(
        ([user, userStats]) => {
          const displayUser = user || {
            id: 'unknown',
            username,
            avatarColor: 'from-gray-700 to-gray-900',
            email: '',
          };
          setUserData(displayUser);
          setStats(userStats);
        },
      );
    }
  }, [isVisible, username, disabled]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsVisible(true), 400); // 400ms delay before showing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setIsVisible(false), 300); // 300ms grace period
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Element */}
      {children}

      {/* Hover Card */}
      {isVisible && userData && !disabled && (
        <div 
            className="absolute z-[999] left-1/2 -translate-x-1/2 top-full mt-3 w-72 bg-[#0a0a0c] border border-zinc-800 rounded-3xl shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Prevent click bubbling to parent card
        >
            {/* Banner Area */}
            <div className="h-20 bg-zinc-900 relative">
                {userData.bannerUrl ? (
                    <img src={userData.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" />
                ) : (
                    <>
                        <div className={`absolute inset-0 bg-gradient-to-r ${userData.avatarColor} opacity-30`} />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    </>
                )}
            </div>

            {/* Content Area */}
            <div className="px-5 pb-5 -mt-10 relative">
                {/* Avatar */}
                <div className="flex justify-between items-end">
                    <div className="w-20 h-20 rounded-2xl bg-[#0a0a0c] p-1 shadow-xl">
                        {userData.avatarUrl ? (
                            <img src={userData.avatarUrl} className="w-full h-full object-cover rounded-xl" alt={username} />
                        ) : (
                            <div className={`w-full h-full rounded-xl bg-gradient-to-br ${userData.avatarColor} flex items-center justify-center text-3xl font-black text-white`}>
                                {username[0]}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onUserClick(username);
                        }}
                        className="bg-zinc-100 hover:bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                        Profil
                    </button>
                </div>

                {/* User Info */}
                <div className="mt-3 space-y-1">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-2 flex-wrap">
                        {userData.role === 'admin' ? (
                          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                            @{username}
                          </span>
                        ) : (
                          <span className="text-white">@{username}</span>
                        )}
                        {userData.role === 'admin' && (
                          <Shield size={14} className="text-pink-500 shrink-0" fill="currentColor" />
                        )}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                        <Calendar size={12} /> Dołączył(a) {new Date((userData as any).createdAt || Date.now()).getFullYear()}
                    </p>
                </div>

                {/* Bio snippet */}
                {userData.description && (
                     <p className="mt-3 text-xs text-zinc-400 line-clamp-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                        {userData.description}
                     </p>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-3">
                        <div className="p-1.5 bg-zinc-800 rounded-lg text-purple-500">
                            <Grid size={14} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">{stats.postCount}</p>
                            <p className="text-[9px] uppercase font-bold text-zinc-600">Posty</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-3">
                        <div className="p-1.5 bg-zinc-800 rounded-lg text-pink-500">
                            <Heart size={14} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">{stats.totalLikes}</p>
                            <p className="text-[9px] uppercase font-bold text-zinc-600">Lajki</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserHoverCard;
