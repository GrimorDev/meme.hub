
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ArrowLeft, Send, Flag, Download, MoreHorizontal, Lock, Edit3, X, Reply } from 'lucide-react';
import { MemePost, User, Comment } from '../types';
import { db } from '../services/db';
import UserHoverCard from './UserHoverCard';

interface MemeDetailProps {
  meme: MemePost;
  onBack: () => void;
  user: User | null;
  onAuthRequired: () => void;
  onUserClick: (username: string) => void;
  onTagSelect: (tag: string) => void;
}

const MemeDetail: React.FC<MemeDetailProps> = ({ meme: initialMeme, onBack, user, onAuthRequired, onUserClick, onTagSelect }) => {
  const [meme, setMeme] = useState(initialMeme);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string, author: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const isLikedByMe = user ? meme.likedBy?.includes(user.id) : false;
  const isOwner = user?.username === meme.author;

  useEffect(() => {
    refreshData();
  }, [initialMeme.id]);

  const refreshData = async () => {
    const [updatedPost, fetchedComments] = await Promise.all([
      db.getPost(initialMeme.id),
      db.getComments(initialMeme.id),
    ]);
    if (updatedPost) setMeme(updatedPost);
    setComments(fetchedComments);
  };

  const handleEdit = async (newCaption: string) => {
      await db.updatePost(meme.id, { caption: newCaption });
      setShowEditModal(false);
      refreshData();
  };

  const handleLike = () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const isNowLiked = !isLikedByMe;
    const newLikesCount = isNowLiked ? meme.likes + 1 : meme.likes - 1;
    const newLikedBy = isNowLiked
        ? [...(meme.likedBy || []), user.id]
        : (meme.likedBy || []).filter(id => id !== user.id);

    setMeme(prev => ({
        ...prev,
        likes: newLikesCount,
        likedBy: newLikedBy
    }));

    db.toggleLike(meme.id, user.id).catch(() => {
      setMeme(prev => ({ ...prev, likes: meme.likes, likedBy: meme.likedBy }));
    });
  };

  const handleCommentLike = (commentId: string) => {
    if (!user) {
        onAuthRequired();
        return;
    }

    setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        const liked = c.likedBy?.includes(user.id) || false;
        const newLikes = liked ? c.likes - 1 : c.likes + 1;
        const newLikedBy = liked
            ? (c.likedBy || []).filter(id => id !== user.id)
            : [...(c.likedBy || []), user.id];
        return { ...c, likes: newLikes, likedBy: newLikedBy };
    }));

    db.toggleCommentLike(commentId, user.id);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onAuthRequired();
      return;
    }
    const text = newComment.trim();
    if (text) {
      setNewComment('');
      setReplyingTo(null);
      setMeme(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));

      try {
        const saved = await db.addComment({
          postId: meme.id,
          author: user.username,
          text,
          parentId: replyingTo?.id || null,
        });
        setComments(prev => [...prev, saved]);
      } catch {
        setMeme(prev => ({ ...prev, commentsCount: prev.commentsCount - 1 }));
      }
    }
  };

  const initiateReply = (commentId: string, author: string) => {
      setReplyingTo({ id: commentId, author });
  };

  // Group comments for display
  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const [recentLikers, setRecentLikers] = useState<User[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!meme.likedBy || meme.likedBy.length === 0) {
      setRecentLikers([]);
      return;
    }
    const top3 = meme.likedBy.slice(-3);
    Promise.all(top3.map(id => db.getUserById(id))).then(users => {
      setRecentLikers(users.filter(Boolean) as User[]);
    });
  }, [meme.likedBy]);

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?meme=${meme.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link do mema skopiowany!');
    }).catch(() => {
      prompt('Skopiuj link:', url);
    });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(meme.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = meme.url.split('.').pop()?.split('?')[0] || 'jpg';
      a.download = `meme-${meme.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(meme.url, '_blank');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 w-full mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
            <button 
                onClick={onBack}
                className="group flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 px-6 py-3 rounded-2xl border border-zinc-800 transition-all font-bold text-sm tracking-tight"
            >
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                Powrót
            </button>

            {isOwner && (
                <button 
                    onClick={() => setShowEditModal(true)}
                    className="group flex items-center gap-3 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 px-6 py-3 rounded-2xl border border-purple-500/20 transition-all font-bold text-sm tracking-tight"
                >
                    <Edit3 size={16} />
                    Edytuj
                </button>
            )}
        </div>
        
        <UserHoverCard username={meme.author} onUserClick={onUserClick}>
            <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => onUserClick(meme.author)}
            >
            <div className="text-right hidden sm:block">
                {meme.authorRole === 'admin' ? (
                  <p className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">@{meme.author}</p>
                ) : (
                  <p className="font-bold text-zinc-100 group-hover:text-purple-500 transition-colors">@{meme.author}</p>
                )}
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{meme.timeAgo}</p>
            </div>
            <div className={`w-12 h-12 rounded-[1.25rem] bg-gradient-to-br ${meme.avatarColor} shadow-xl flex items-center justify-center font-black text-lg text-white group-hover:scale-105 transition-transform overflow-hidden`}>
                {meme.avatarUrl
                  ? <img src={meme.avatarUrl} alt={meme.author} className="w-full h-full object-cover" />
                  : meme.author[0]}
            </div>
            </div>
        </UserHoverCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Big Image */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          <div className="relative bg-zinc-950 rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl group">
             <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 to-transparent pointer-events-none" />
             <img 
               src={meme.url} 
               alt={meme.caption} 
               className="w-full object-contain max-h-[700px] xl:max-h-[850px] mx-auto"
             />
             
             {/* Action Overlay Mobile Only */}
             <div className="lg:hidden absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg mb-4">
                  {meme.caption}
                </h1>
             </div>
          </div>
          
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800">
             <div className="flex items-center gap-3">
               <button 
                 onClick={handleLike}
                 className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all font-black text-sm border-2 ${
                   isLikedByMe 
                     ? 'bg-pink-500 border-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] scale-105' 
                     : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                 }`}
               >
                 <Heart size={20} className={isLikedByMe ? 'fill-white animate-pulse' : ''} />
                 {isLikedByMe ? 'UWIELBIASZ TO!' : 'MOCNE!'}
               </button>
               
               {meme.likes > 0 && (
                <div className="flex -space-x-2">
                    {recentLikers.map(liker => (
                        <div key={liker.id} className="w-10 h-10 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden relative">
                            {liker.avatarUrl ? (
                                <img src={liker.avatarUrl} alt={liker.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${liker.avatarColor} flex items-center justify-center text-[10px] font-black text-white`}>
                                    {liker.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="h-10 px-3 bg-zinc-800 rounded-full border-4 border-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500">
                    +{meme.likes}
                    </div>
                </div>
               )}
             </div>

             <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all font-bold text-xs text-zinc-300"
                >
                  <Share2 size={20} />
                  <span className="hidden xl:inline">Udostępnij</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all font-bold text-xs text-zinc-300"
                >
                  <Download size={20} />
                  <span className="hidden xl:inline">Zapisz</span>
                </button>
                {!isOwner && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-zinc-800 hover:bg-red-900/30 hover:border-red-900/50 hover:text-red-500 border border-zinc-700 transition-all font-bold text-xs text-zinc-300"
                  >
                    <Flag size={20} />
                  </button>
                )}
             </div>
          </div>
        </div>

        {/* Right: Sidebar / Comments */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
           {/* Info Box */}
           <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 shadow-xl space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-tight">
                  {meme.caption}
                </h1>
                <div className="flex flex-wrap gap-2 pt-2">
                  {meme.tags?.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => onTagSelect(tag)}
                      className="text-[10px] font-bold uppercase tracking-widest text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
           </div>

           {/* Comments Section */}
           <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-xl flex flex-col h-[600px] xl:h-[750px]">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                 <h3 className="font-black uppercase tracking-widest text-xs text-zinc-500">
                   Komentarze ({meme.commentsCount})
                 </h3>
                 <button className="text-xs font-bold text-zinc-600 hover:text-white transition-colors">Najnowsze</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {rootComments.map(comment => {
                  const replies = getReplies(comment.id);
                  return (
                    <div key={comment.id} className="space-y-4">
                        <CommentCard
                            comment={comment}
                            user={user}
                            onUserClick={onUserClick}
                            onLike={() => handleCommentLike(comment.id)}
                            onReply={() => initiateReply(comment.id, comment.author)}
                        />
                        {replies.length > 0 && (
                            <div className="pl-6 space-y-4 border-l-2 border-zinc-800 ml-4">
                                {replies.map(reply => (
                                    <CommentCard
                                        key={reply.id}
                                        comment={reply}
                                        user={user}
                                        onUserClick={onUserClick}
                                        onLike={() => handleCommentLike(reply.id)}
                                        onReply={() => initiateReply(comment.id, reply.author)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                  );
                })}
                {comments.length === 0 && (
                    <div className="py-8 text-center text-zinc-600 italic">
                        Brak komentarzy. Bądź pierwszy!
                    </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                {replyingTo && (
                    <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-800/30 px-3 py-1 rounded-lg">
                        <span>Odpowiadasz użytkownikowi <span className="font-bold text-purple-400">@{replyingTo.author}</span></span>
                        <button onClick={() => setReplyingTo(null)} className="hover:text-white"><X size={12} /></button>
                    </div>
                )}
                <form onSubmit={handleCommentSubmit} className="relative">
                  <input 
                    type="text" 
                    disabled={!user}
                    placeholder={user ? (replyingTo ? `Odpowiedz...` : "Skomentuj tego krosa...") : "Zaloguj się, aby komentować"}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-5 pr-14 py-4 text-sm focus:border-purple-500 outline-none transition-all font-medium ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    autoFocus={!!replyingTo}
                  />
                  {!user ? (
                    <button 
                      type="button"
                      onClick={onAuthRequired}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                    >
                      <Lock size={18} />
                    </button>
                  ) : (
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white hover:bg-purple-500 transition-all active:scale-90 shadow-lg shadow-purple-600/20">
                      <Send size={18} />
                    </button>
                  )}
                </form>
              </div>
           </div>
        </div>
      </div>

      {showEditModal && (
          <EditMemeModal
            currentCaption={meme.caption}
            onClose={() => setShowEditModal(false)}
            onSave={handleEdit}
          />
      )}

      {showReportModal && (
          <ReportModal postId={meme.id} onClose={() => setShowReportModal(false)} />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const CommentCard: React.FC<{
    comment: Comment & { authorAvatarColor?: string; authorAvatarUrl?: string };
    user: User | null;
    onUserClick: (username: string) => void;
    onLike: () => void;
    onReply: () => void;
}> = ({ comment, user, onUserClick, onLike, onReply }) => {
    const isLiked = user && comment.likedBy?.includes(user.id);

    return (
        <div className="flex gap-4 group">
            <UserHoverCard username={comment.author} onUserClick={onUserClick} disabled={true}>
                <div
                    onClick={() => onUserClick(comment.author)}
                    className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0 border border-zinc-700 overflow-hidden cursor-pointer hover:border-zinc-500 transition-colors"
                >
                    {comment.authorAvatarUrl ? (
                        <img src={comment.authorAvatarUrl} alt={comment.author} className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${comment.authorAvatarColor || 'from-gray-700 to-gray-600'} flex items-center justify-center text-white font-black uppercase text-sm`}>
                            {comment.author[0]}
                        </div>
                    )}
                </div>
            </UserHoverCard>
            <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                    <UserHoverCard username={comment.author} onUserClick={onUserClick} disabled={true}>
                        <p 
                            onClick={() => onUserClick(comment.author)}
                            className="text-xs font-black text-white hover:text-purple-500 cursor-pointer transition-colors"
                        >
                            @{comment.author} <span className="ml-2 font-medium text-zinc-600 tracking-normal hover:text-zinc-600 cursor-default">• {comment.timeAgo}</span>
                        </p>
                    </UserHoverCard>
                    <button className="text-zinc-700 group-hover:text-zinc-500 transition-colors"><MoreHorizontal size={14} /></button>
                </div>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">{comment.text}</p>
                <div className="flex items-center gap-4 pt-1">
                    <button 
                        onClick={onLike}
                        className={`flex items-center gap-1.5 text-[10px] font-black transition-colors ${isLiked ? 'text-pink-500' : 'text-zinc-600 hover:text-pink-500'}`}
                    >
                        <Heart size={12} fill={isLiked ? "currentColor" : "none"} /> {comment.likes}
                    </button>
                    <button 
                        onClick={onReply}
                        className="flex items-center gap-1 text-[10px] font-black text-zinc-600 hover:text-white transition-colors uppercase"
                    >
                        <Reply size={10} /> Odpowiedz
                    </button>
                </div>
            </div>
        </div>
    );
};

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

const ReportModal: React.FC<{ postId: string; onClose: () => void }> = ({ postId, onClose }) => {
  const [reason, setReason] = useState('Spam lub reklama');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    try {
      await db.submitReport(postId, reason);
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
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h3 className="text-xl font-black text-white">Zgłoszenie wysłane!</h3>
          <p className="text-zinc-500 mt-2">Dzięki za dbanie o czystość Hubu.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2"><Flag size={18} /> Zgłoś naruszenie</h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full"><X size={16} /></button>
        </div>
        <div className="space-y-3 mb-6">
          {['Spam lub reklama', 'Treści obraźliwe', 'Nagość lub przemoc', 'Informacje nieprawdziwe', 'Inne'].map(r => (
            <label key={r} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${reason === r ? 'bg-purple-600/20 border-purple-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-purple-500 w-4 h-4" />
              <span className="text-sm font-bold text-zinc-300">{r}</span>
            </label>
          ))}
        </div>
        <button onClick={handleSubmit} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest transition-all">
          Wyślij Zgłoszenie
        </button>
      </div>
    </div>
  );
};

export default MemeDetail;
