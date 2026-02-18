
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Grid, Heart, MessageCircle, Calendar, Trophy, ImageOff, Edit3, User as UserIcon } from 'lucide-react';
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

        {isOwnProfile && (
            <button 
                onClick={() => setIsEditModalOpen(true)}
                className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 transition-all font-bold text-xs text-white"
            >
                <Edit3 size={16} />
                Edytuj Profil
            </button>
        )}

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
                <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 drop-shadow-xl">
                    @{profileUser.username}
                    {stats.totalLikes > 1000 && <Trophy className="text-yellow-500" fill="currentColor" size={32} />}
                </h1>
                
                {profileUser.description && (
                    <p className="text-zinc-300 text-sm font-medium max-w-xl leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
                        {profileUser.description}
                    </p>
                )}

                <p className="text-zinc-500 font-bold text-xs flex items-center gap-2 uppercase tracking-wide">
                    <Calendar size={14} /> Dołączył(a) w 2024
                </p>
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
