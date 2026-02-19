
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Grid, Heart, MessageCircle, Calendar, Trophy, ImageOff, Edit3, Shield, Flag, Check, X } from 'lucide-react';
import { MemePost, User } from '../types';
import { db } from '../services/db';
import EditProfileModal from './EditProfileModal';

interface UserProfileProps {
  username: string;
  onBack: () => void;
  onMemeSelect: (meme: MemePost) => void;
  currentUser: User | null;
  onUserUpdate: (updatedUser: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ username, onBack, onMemeSelect, currentUser, onUserUpdate }) => {
  const [profileUser, setProfileUser] = useState<User | undefined>(undefined);
  const [posts, setPosts] = useState<MemePost[]>([]);
  const [stats, setStats] = useState({ postCount: 0, totalLikes: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const loadData = async () => {
    const [user, userPosts, userStats] = await Promise.all([
      db.getUser(username),
      db.getUserPosts(username),
      db.getUserStats(username),
    ]);
    const displayUser = user || {
      id: 'unknown',
      username,
      avatarColor: 'from-gray-700 to-gray-900',
      email: '',
    };
    setProfileUser(displayUser);
    setPosts(userPosts);
    setStats(userStats);
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [username]);

  const handleProfileUpdate = (updatedUser: User) => {
    setProfileUser(updatedUser);
    if (currentUser && currentUser.id === updatedUser.id) {
        onUserUpdate(updatedUser);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!profileUser) return <div>User not found</div>;

  const isOwnProfile = currentUser?.username === profileUser.username;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-8">
      {/* Header */}
      <div className="relative group">
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/50 hover:bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 transition-all font-bold text-xs text-white"
        >
          <ArrowLeft size={16} />
          Powrót
        </button>

        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {isOwnProfile ? (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 transition-all font-bold text-xs text-white"
            >
              <Edit3 size={16} />
              Edytuj Profil
            </button>
          ) : currentUser && (
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 bg-black/50 hover:bg-red-900/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 hover:border-red-500/30 transition-all font-bold text-xs text-zinc-400 hover:text-red-400"
            >
              <Flag size={14} />
              Zgłoś profil
            </button>
          )}
        </div>

        {/* Banner */}
        <div className="w-full h-64 bg-zinc-900 rounded-[2.5rem] overflow-hidden relative border border-zinc-800">
            {profileUser.bannerUrl ? (
                <img src={profileUser.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
                <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${profileUser.avatarColor} opacity-20`} />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-90" />
        </div>

        {/* User Info Content */}
        <div className="px-8 -mt-24 flex flex-col md:flex-row items-end md:items-end gap-6 relative z-10">
            {/* Avatar */}
            <div className={`w-40 h-40 rounded-[2.5rem] p-1 shadow-2xl ring-8 ring-[#0a0a0c] bg-[#0a0a0c] overflow-hidden`}>
                 {profileUser.avatarUrl ? (
                     <img src={profileUser.avatarUrl} alt={profileUser.username} className="w-full h-full object-cover rounded-[2.2rem]" />
                 ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${profileUser.avatarColor} rounded-[2.2rem] flex items-center justify-center text-6xl font-black text-white uppercase`}>
                        {profileUser.username[0]}
                    </div>
                 )}
            </div>
            
            <div className="flex-1 pb-4 space-y-2">
                <h1 className="text-5xl font-black italic uppercase tracking-tighter flex items-center gap-3 drop-shadow-xl">
                    {profileUser.role === 'admin' ? (
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                        @{profileUser.username}
                      </span>
                    ) : (
                      <span className="text-white">@{profileUser.username}</span>
                    )}
                    {profileUser.role === 'admin' && (
                      <span className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-purple-600/30">
                        <Shield size={12} fill="currentColor" /> Admin
                      </span>
                    )}
                    {stats.totalLikes > 1000 && <Trophy className="text-yellow-500" fill="currentColor" size={32} />}
                </h1>
                
                {profileUser.description && (
                    <p className="text-zinc-300 text-sm font-medium max-w-xl leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
                        {profileUser.description}
                    </p>
                )}

                {(profileUser.settings?.showJoinDate !== false) && (
                  <p className="text-zinc-500 font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
                      <Calendar size={14} /> Dołączył(a) {new Date((profileUser as any).createdAt || Date.now()).getFullYear()}
                  </p>
                )}
            </div>

            <div className="flex gap-4 pb-4 w-full md:w-auto">
                <StatCard label="Posty" value={stats.postCount} icon={<Grid size={16} />} />
                <StatCard label="Lajki" value={stats.totalLikes} icon={<Heart size={16} />} />
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <Grid size={18} className="text-purple-500" />
            <h3 className="font-black uppercase tracking-widest text-sm text-zinc-300">Opublikowane Memy</h3>
        </div>

        {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {posts.map(post => (
                    <div 
                        key={post.id} 
                        onClick={() => onMemeSelect(post)}
                        className="group relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden cursor-pointer border border-zinc-800 hover:border-purple-500/50 transition-all"
                    >
                        <img src={post.url} alt={post.caption} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center">
                            <p className="font-black text-white text-sm line-clamp-2">{post.caption}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="flex items-center gap-1 text-xs font-bold text-pink-500"><Heart size={12} fill="currentColor" /> {post.likes}</span>
                                <span className="flex items-center gap-1 text-xs font-bold text-zinc-300"><MessageCircle size={12} /> {post.commentsCount}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-600 gap-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                    <ImageOff size={24} />
                </div>
                <p className="font-medium">Ten użytkownik nie dodał jeszcze żadnych memów.</p>
            </div>
        )}
      </div>

      {isOwnProfile && profileUser && (
        <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            currentUser={profileUser}
            onUpdate={handleProfileUpdate}
        />
      )}

      {showReportModal && profileUser && (
        <ReportProfileModal
          targetUserId={profileUser.id}
          username={profileUser.username}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

const ReportProfileModal: React.FC<{ targetUserId: string; username: string; onClose: () => void }> = ({ targetUserId, username, onClose }) => {
  const [reason, setReason] = useState('Spam lub reklama');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    try {
      await db.submitUserReport(targetUserId, reason);
    } catch {
      // ignore duplicate
    }
    setSent(true);
    setTimeout(onClose, 2000);
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} />
          </div>
          <h3 className="text-xl font-black text-white">Zgłoszenie wysłane!</h3>
          <p className="text-zinc-500 mt-2">Dzięki za dbanie o czystość Hubu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2">
            <Flag size={18} /> Zgłoś profil @{username}
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full"><X size={16} /></button>
        </div>
        <div className="space-y-3 mb-6">
          {['Spam lub reklama', 'Obraźliwe zachowanie', 'Podszywanie się', 'Treści niedozwolone', 'Inne'].map((r) => (
            <label key={r} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${reason === r ? 'bg-purple-600/20 border-purple-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <input type="radio" name="profileReason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-purple-500 w-4 h-4" />
              <span className="text-sm font-bold text-zinc-300">{r}</span>
            </label>
          ))}
        </div>
        <button onClick={handleSubmit} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all">
          Wyślij Zgłoszenie
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex-1 md:flex-none bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 min-w-[120px]">
        <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
            {icon}
        </div>
        <div>
            <p className="text-xl font-black text-white leading-none">{value}</p>
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{label}</p>
        </div>
    </div>
);

export default UserProfile;
