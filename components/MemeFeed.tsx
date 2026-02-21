
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, TrendingUp, Clock, Flame, Star, Twitter, Facebook, Link as LinkIcon, X, Trash2, Edit3, Flag, AlertTriangle, Check, Hash, Search, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { MemePost, User, MEME_CATEGORIES } from '../types';
import { db } from '../services/db';
import UserHoverCard from './UserHoverCard';

interface MemeFeedProps {
  onMemeSelect: (meme: MemePost) => void;
  user: User | null;
  onAuthRequired: () => void;
  onUserClick: (username: string) => void;
  activeTag?: string | null;
  searchQuery?: string;
  onClearFilters?: () => void;
  onTagSelect: (tag: string) => void;
  hideLikeCounts?: boolean;
}

const MemeFeed: React.FC<MemeFeedProps> = ({
  onMemeSelect,
  user,
  onAuthRequired,
  onUserClick,
  activeTag,
  searchQuery,
  onClearFilters,
  onTagSelect,
  hideLikeCounts = false,
}) => {
  const [activeTab, setActiveTab] = useState<'HOT' | 'FRESH' | 'TOP' | 'NOWE'>('HOT');
  const [posts, setPosts] = useState<MemePost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [activeTab, activeTag, searchQuery]);

  useEffect(() => {
    (async () => {
      const result = await db.getPosts(activeTab, activeTag, searchQuery, page);
      setPosts(result.posts);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    })();
  }, [activeTab, refreshTrigger, activeTag, searchQuery, page]);

  const handlePostChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const title = activeTag ? `Kategoria: ${activeTag}` : searchQuery ? `Wyniki dla: ${searchQuery}` : 'Centrala Mocy';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            {searchQuery ? <Search className="text-purple-500" size={32} /> : <TrendingUp className="text-purple-500" size={32} />}
            {title}
          </h2>
          <p className="text-zinc-500 font-medium text-lg">
            {activeTag ? `Przeglądasz memy oznaczone tagiem #${activeTag}.` : searchQuery ? `Przeszukiwanie bazy dla Twojego zapytania.` : 'Najświeższy humor prosto z Internetu.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {(activeTag || searchQuery) && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm border border-zinc-700 transition-all"
            >
              <X size={16} /> Wyczyść filtry
            </button>
          )}
          <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 self-start md:self-auto">
            <TabButton active={activeTab === 'HOT'} onClick={() => setActiveTab('HOT')} icon={<Flame size={16} />} label="Hot" />
            <TabButton active={activeTab === 'FRESH'} onClick={() => setActiveTab('FRESH')} icon={<Clock size={16} />} label="Fresh" />
            <TabButton active={activeTab === 'TOP'} onClick={() => setActiveTab('TOP')} icon={<Star size={16} />} label="Top" />
            <TabButton active={activeTab === 'NOWE'} onClick={() => setActiveTab('NOWE')} icon={<Sparkles size={16} />} label="Nowe" />
          </div>
        </div>
      </div>

      {/* Pasek kategorii */}
      {!searchQuery && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onTagSelect && onClearFilters?.()}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
              !activeTag ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
            }`}
          >
            Wszystkie
          </button>
          {MEME_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => onTagSelect(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                activeTag === cat.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* NOWE tab info banner */}
      {activeTab === 'NOWE' && (
        <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-xs font-bold">Kolejka nowych zgłoszeń — posty czekają na zatwierdzenie przez administratora.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {posts.map((meme) => (
          <MemeCard
            key={meme.id}
            meme={meme}
            onClick={() => onMemeSelect(meme)}
            user={user}
            onAuthRequired={onAuthRequired}
            onUserClick={onUserClick}
            onPostChange={handlePostChange}
            onTagSelect={onTagSelect}
            hideLikeCounts={hideLikeCounts}
          />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="py-20 text-center space-y-4 bg-zinc-900/20 rounded-[3rem] border border-zinc-800/50">
           <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
              <Hash size={40} />
           </div>
           <p className="text-zinc-500 font-medium italic">Nie znaleźliśmy żadnych memów spełniających kryteria...</p>
           <button onClick={onClearFilters} className="text-purple-500 font-black uppercase text-xs tracking-widest hover:text-purple-400">Wróć do wszystkich</button>
        </div>
      )}

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl border border-zinc-700 transition-all"
          >
            <ChevronLeft size={16} /> Poprzednia
          </button>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm font-bold">Strona</span>
            <span className="px-3 py-1.5 bg-purple-600 text-white font-black text-sm rounded-xl min-w-[2.5rem] text-center">{page}</span>
            <span className="text-zinc-400 text-sm font-bold">z {totalPages}</span>
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl border border-zinc-700 transition-all"
          >
            Następna <ChevronRight size={16} />
          </button>
        </div>
      )}
      {totalPages > 1 && (
        <p className="text-center text-zinc-600 text-xs font-medium">{total} memów łącznie</p>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm uppercase tracking-wider ${
      active
        ? 'bg-zinc-800 text-white shadow-lg'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MemeCard: React.FC<{
    meme: MemePost;
    onClick: () => void;
    user: User | null;
    onAuthRequired: () => void;
    onUserClick: (username: string) => void;
    onPostChange: () => void;
    onTagSelect: (tag: string) => void;
    hideLikeCounts?: boolean;
}> = ({ meme, onClick, user, onAuthRequired, onUserClick, onPostChange, onTagSelect, hideLikeCounts = false }) => {
  const [isLiked, setIsLiked] = useState(user ? meme.likedBy?.includes(user.id) : false);
  const [likesCount, setLikesCount] = useState(meme.likes);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    setIsLiked(user ? meme.likedBy?.includes(user.id) : false);
    setLikesCount(meme.likes);
  }, [meme, user]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onAuthRequired();
      return;
    }
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    db.toggleLike(meme.id, user.id).catch(() => {
      setIsLiked(isLiked);
      setLikesCount(meme.likes);
    });
  };

  const handleShare = (platform: 'twitter' | 'facebook' | 'reddit' | 'copy', e: React.MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(meme.caption);
    const memeUrl = encodeURIComponent(meme.url);

    let shareUrl = '';
    switch (platform) {
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${memeUrl}`; break;
      case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${memeUrl}`; break;
      case 'reddit': shareUrl = `https://www.reddit.com/submit?url=${memeUrl}&title=${text}`; break;
      case 'copy':
        navigator.clipboard.writeText(meme.url);
        alert('Link do obrazka skopiowany!');
        setShowShareOptions(false);
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareOptions(false);
  };

  const handleDelete = async () => {
    await db.deletePost(meme.id);
    setShowDeleteModal(false);
    onPostChange();
  };

  const handleEdit = async (newCaption: string) => {
    await db.updatePost(meme.id, { caption: newCaption });
    setShowEditModal(false);
    onPostChange();
  };

  const isOwner = user?.username === meme.author;

  return (
    <>
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] group hover:border-purple-500/40 hover:bg-zinc-900/60 transition-all duration-500 flex flex-col shadow-xl cursor-pointer relative" onClick={onClick}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserHoverCard username={meme.author} onUserClick={onUserClick}>
                <div
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${meme.avatarColor} shadow-inner flex items-center justify-center font-black text-white uppercase hover:scale-105 transition-transform cursor-pointer overflow-hidden`}
                  onClick={(e) => { e.stopPropagation(); onUserClick(meme.author); }}
                >
                  {meme.avatarUrl
                    ? <img src={meme.avatarUrl} alt={meme.author} className="w-full h-full object-cover" />
                    : meme.author[0]}
                </div>
            </UserHoverCard>
            <div className="flex flex-col">
              <UserHoverCard username={meme.author} onUserClick={onUserClick}>
                  {meme.authorRole === 'admin' ? (
                    <span
                      className="font-bold text-sm tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onUserClick(meme.author); }}
                    >
                      @{meme.author}
                    </span>
                  ) : (
                    <span
                      className="font-bold text-sm tracking-tight text-zinc-100 hover:text-purple-400 transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onUserClick(meme.author); }}
                    >
                      @{meme.author}
                    </span>
                  )}
              </UserHoverCard>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{meme.timeAgo}</span>
            </div>
          </div>

          <div className="relative">
            <button
              className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
              onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
            >
              <MoreHorizontal size={18} />
            </button>

            {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    {isOwner ? (
                        <>
                            <button
                                onClick={() => { setShowDropdown(false); setShowEditModal(true); }}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
                            >
                                <Edit3 size={14} /> Edytuj
                            </button>
                            <button
                                onClick={() => { setShowDropdown(false); setShowDeleteModal(true); }}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={14} /> Usuń mema
                            </button>
                        </>
                    ) : (
                        <button
                             onClick={() => { setShowDropdown(false); setShowReportModal(true); }}
                             className="w-full text-left px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-red-500 flex items-center gap-2 transition-colors"
                        >
                            <Flag size={14} /> Zgłoś
                        </button>
                    )}
                </div>
            )}
          </div>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden bg-black flex items-center justify-center mx-3 rounded-2xl group/image">
          <img
            src={meme.url}
            alt={meme.caption}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover/image:opacity-100 transition-opacity" />
          <div className="absolute inset-x-0 bottom-0 p-6 transform translate-y-2 group-hover/image:translate-y-0 transition-transform duration-500">
            <p className="text-lg text-white font-black leading-tight drop-shadow-2xl italic uppercase tracking-tighter">
              {meme.caption}
            </p>
            {meme.tags && meme.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {meme.tags.map(t => (
                  <span
                    key={t}
                    onClick={(e) => { e.stopPropagation(); onTagSelect(t); }}
                    className="text-[9px] font-bold uppercase tracking-wider bg-purple-600/40 hover:bg-purple-500/80 text-white px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 mt-auto flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-bold text-sm border ${
                isLiked
                  ? 'bg-pink-500/10 border-pink-500/50 text-pink-500'
                  : 'bg-zinc-800/50 border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Heart size={18} className={isLiked ? 'fill-pink-500 animate-bounce' : ''} />
              {!hideLikeCounts && <span>{likesCount}</span>}
            </button>

            <button className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all font-bold text-sm" onClick={(e) => e.stopPropagation()}>
              <MessageCircle size={18} />
              <span>{meme.commentsCount}</span>
            </button>
          </div>

          <div className="relative">
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${showShareOptions ? 'bg-purple-600 text-white' : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-purple-600'}`}
              onClick={(e) => { e.stopPropagation(); setShowShareOptions(!showShareOptions); }}
            >
              {showShareOptions ? <X size={18} /> : <Share2 size={18} />}
            </button>

            {showShareOptions && (
              <div className="absolute bottom-full right-0 mb-3 flex flex-row gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-30" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => handleShare('twitter', e)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all shadow-lg"><Twitter size={18} fill="currentColor" /></button>
                <button onClick={(e) => handleShare('facebook', e)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all shadow-lg"><Facebook size={18} fill="currentColor" /></button>
                <button onClick={(e) => handleShare('reddit', e)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500] hover:text-white transition-all shadow-lg font-black text-xs">R</button>
                <button onClick={(e) => handleShare('copy', e)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all shadow-lg"><LinkIcon size={18} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
           <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black uppercase italic text-white">Czy na pewno?</h3>
                  <p className="text-zinc-500 text-sm">Tej operacji nie można cofnąć. Twój mem przepadnie w czeluściach internetu na zawsze.</p>
                  <div className="flex gap-3 w-full pt-2">
                      <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Anuluj</button>
                      <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">Usuń</button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {showEditModal && (
          <EditMemeModal
            currentCaption={meme.caption}
            onClose={() => setShowEditModal(false)}
            onSave={handleEdit}
          />
      )}

      {showReportModal && (
          <ReportMemeModal
            postId={meme.id}
            onClose={() => setShowReportModal(false)}
          />
      )}
    </>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm uppercase tracking-wider ${
      active
        ? 'bg-zinc-800 text-white shadow-lg'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const EditMemeModal: React.FC<{ currentCaption: string; onClose: () => void; onSave: (val: string) => void }> = ({ currentCaption, onClose, onSave }) => {
    const [caption, setCaption] = useState(currentCaption);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2"><Edit3 size={18} /> Edytuj Mema</h3>
                    <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full"><X size={16} /></button>
                </div>
                <div className="space-y-4">
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-bold h-32 focus:border-purple-500 outline-none resize-none"
                        placeholder="Nowy opis..."
                    />
                    <button onClick={() => onSave(caption)} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all">
                        Zapisz Zmiany
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportMemeModal: React.FC<{ postId: string; onClose: () => void }> = ({ postId, onClose }) => {
    const [reason, setReason] = useState('Spam lub reklama');
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        try {
            await db.submitReport(postId, reason);
        } catch {
            // ignore duplicate / error
        }
        setSent(true);
        setTimeout(onClose, 2000);
    };

    if (sent) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2"><Flag size={18} /> Zgłoś naruszenie</h3>
                    <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full"><X size={16} /></button>
                </div>
                <div className="space-y-3 mb-6">
                    {['Spam lub reklama', 'Treści obraźliwe', 'Nagość lub przemoc', 'Informacje nieprawdziwe', 'Inne'].map((r) => (
                        <label key={r} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${reason === r ? 'bg-purple-600/20 border-purple-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-purple-500 w-4 h-4" />
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

export default MemeFeed;
