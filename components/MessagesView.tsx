
import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { User, Conversation, DirectMessage } from '../types';
import { db } from '../services/db';

interface MessagesViewProps {
  currentUser: User;
  initialUserId?: string | null;
  onUserClick: (username: string) => void;
  onMessageCountChange?: (count: number) => void;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'teraz';
  if (m < 60) return `${m} min`;
  if (diff < 86400000) return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

const Avatar: React.FC<{ username: string; avatarColor: string; avatarUrl?: string; size?: number }> = ({ username, avatarColor, avatarUrl, size = 9 }) => (
  <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden shrink-0`}>
    {avatarUrl
      ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
      : <span className="text-white font-black text-xs">{username[0].toUpperCase()}</span>}
  </div>
);

const MessagesView: React.FC<MessagesViewProps> = ({ currentUser, initialUserId, onUserClick, onMessageCountChange }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId ?? null);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string; avatarColor: string; avatarUrl?: string } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showThread, setShowThread] = useState(!!initialUserId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Załaduj rozmowy
  useEffect(() => {
    db.getConversations().then(data => {
      setConversations(data);
      setLoadingConvs(false);

      // Jeśli initialUserId nie ma rozmowy, utwórz placeholder
      if (initialUserId && !data.find(c => c.userId === initialUserId)) {
        db.getUserById(initialUserId).then(u => {
          if (u) setSelectedUser({ userId: u.id, username: u.username, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl });
        });
      }
    });
  }, []);

  // Załaduj wiadomości gdy zmieni się selected
  useEffect(() => {
    if (!selectedUserId) return;

    // Znajdź partnera w rozmowach
    const conv = conversations.find(c => c.userId === selectedUserId);
    if (conv) {
      setSelectedUser({ userId: conv.userId, username: conv.username, avatarColor: conv.avatarColor, avatarUrl: conv.avatarUrl });
    }

    setLoadingMsgs(true);
    db.getMessages(selectedUserId).then(data => {
      setMessages(data);
      setLoadingMsgs(false);
    });

    // Oznacz jako przeczytane + aktualizuj badge
    db.markMessagesRead(selectedUserId).then(() => {
      setConversations(prev => prev.map(c => c.userId === selectedUserId ? { ...c, unreadCount: 0 } : c));
      db.getMessageUnreadCount().then(n => onMessageCountChange?.(n));
    });

    // Polling wątku co 5 s
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const fresh = await db.getMessages(selectedUserId);
      setMessages(fresh);
      await db.markMessagesRead(selectedUserId);
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedUserId]);

  // Auto-scroll do dołu
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = (conv: Conversation) => {
    setSelectedUserId(conv.userId);
    setSelectedUser({ userId: conv.userId, username: conv.username, avatarColor: conv.avatarColor, avatarUrl: conv.avatarUrl });
    setShowThread(true);
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedUserId || sending) return;
    setSending(true);
    try {
      const msg = await db.sendMessage(selectedUserId, text.trim());
      setMessages(prev => [...prev, msg]);
      setText('');

      // Aktualizuj listę rozmów
      setConversations(prev => {
        const exists = prev.find(c => c.userId === selectedUserId);
        if (exists) {
          return prev.map(c => c.userId === selectedUserId
            ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt }
            : c
          );
        } else if (selectedUser) {
          return [{ ...selectedUser, lastMessage: msg.text, lastMessageAt: msg.createdAt, unreadCount: 0 }, ...prev];
        }
        return prev;
      });
    } catch {}
    setSending(false);
  };

  // ── Lewy panel: lista rozmów ──────────────────────────────────
  const ConversationsList = (
    <div className={`${showThread ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0 border-r border-zinc-800 min-h-0`}>
      <div className="px-5 pt-6 pb-4 border-b border-zinc-800 shrink-0">
        <h2 className="text-lg font-black uppercase tracking-tight text-white">Wiadomości</h2>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
          {conversations.reduce((s, c) => s + c.unreadCount, 0)} nieprzeczytanych
        </p>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1">
        {loadingConvs ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="text-purple-500 animate-spin" /></div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600 px-4">
            <MessageSquare size={36} className="mb-3 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest text-center">Brak wiadomości</p>
            <p className="text-[11px] text-zinc-700 text-center mt-1">Wejdź na profil użytkownika i kliknij "Wyślij wiadomość"</p>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {conversations.map(conv => (
              <li
                key={conv.userId}
                onClick={() => openConversation(conv)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                  selectedUserId === conv.userId
                    ? 'bg-purple-600/20 border border-purple-500/30'
                    : 'hover:bg-zinc-800/60'
                }`}
              >
                <div className="relative">
                  <Avatar username={conv.username} avatarColor={conv.avatarColor} avatarUrl={conv.avatarUrl} size={10} />
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className={`text-sm font-black truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-zinc-300'}`}>
                      {conv.username}
                    </p>
                    <span className="text-[10px] text-zinc-600 shrink-0">{timeLabel(conv.lastMessageAt)}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-zinc-300 font-bold' : 'text-zinc-500'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // ── Prawy panel: wątek wiadomości ─────────────────────────────
  const ThreadPanel = (
    <div className={`${showThread ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-h-0 min-w-0`}>
      {!selectedUserId ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-full text-zinc-700">
          <MessageSquare size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">Wybierz rozmowę</p>
        </div>
      ) : (
        <>
          {/* Nagłówek wątku */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 shrink-0">
            <button
              onClick={() => setShowThread(false)}
              className="md:hidden p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            {selectedUser && (
              <>
                <Avatar username={selectedUser.username} avatarColor={selectedUser.avatarColor} avatarUrl={selectedUser.avatarUrl} size={9} />
                <button
                  onClick={() => onUserClick(selectedUser.username)}
                  className="text-sm font-black text-white hover:text-purple-300 transition-colors"
                >
                  {selectedUser.username}
                </button>
              </>
            )}
          </div>

          {/* Wiadomości */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
            {loadingMsgs ? (
              <div className="flex justify-center py-10"><Loader2 size={22} className="text-purple-500 animate-spin" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-700">
                <p className="text-xs font-bold uppercase tracking-widest">Brak wiadomości</p>
                <p className="text-[11px] text-zinc-700 mt-1">Napisz pierwszą wiadomość!</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && selectedUser && (
                      <Avatar username={msg.senderUsername} avatarColor={msg.senderAvatarColor} avatarUrl={msg.senderAvatarUrl} size={7} />
                    )}
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-purple-200/70' : 'text-zinc-500'}`}>
                        {timeLabel(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Pole tekstowe */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-800 shrink-0">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Napisz wiadomość..."
              className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      {ConversationsList}
      {ThreadPanel}
    </div>
  );
};

export default MessagesView;
