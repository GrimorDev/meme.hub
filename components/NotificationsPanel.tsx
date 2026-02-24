
import React, { useEffect, useState } from 'react';
import { X, Bell, MessageCircle, CornerDownRight, Star, Check, Loader2 } from 'lucide-react';
import { AppNotification } from '../types';
import { db } from '../services/db';

interface NotificationsPanelProps {
  onClose: () => void;
  onNavigate: (link: string) => void;
  onUnreadChange: (count: number) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'przed chwilą';
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} godz. temu`;
  return `${Math.floor(h / 24)} dni temu`;
}

const typeIcon = (type: AppNotification['type']) => {
  if (type === 'comment')  return <MessageCircle size={15} className="text-blue-400" />;
  if (type === 'reply')    return <CornerDownRight size={15} className="text-purple-400" />;
  if (type === 'featured') return <Star size={15} className="text-yellow-400" />;
  if (type === 'message')  return <MessageCircle size={15} className="text-green-400" />;
  return <Bell size={15} className="text-zinc-400" />;
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose, onNavigate, onUnreadChange }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getNotifications().then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const handleMarkAll = async () => {
    await db.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadChange(0);
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.read) {
      await db.markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      const unread = notifications.filter(x => x.id !== n.id && !x.read).length;
      onUnreadChange(unread);
    }
    if (n.link) {
      onClose();
      onNavigate(n.link);
    }
  };

  return (
    <div className="fixed top-20 right-4 w-96 bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl z-[60] animate-in fade-in slide-in-from-top-4 duration-300 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-800 shrink-0">
        <div>
          <h3 className="font-black italic uppercase tracking-widest text-white text-base">Powiadomienia</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            {notifications.filter(n => !n.read).length} nieprzeczytanych
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <Check size={11} /> Wszystkie
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-white transition-all"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-purple-500 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Bell size={36} className="mb-3 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest">Brak powiadomień</p>
          </div>
        ) : (
          <ul className="p-3 space-y-1">
            {notifications.map(n => (
              <li
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                  n.read
                    ? 'hover:bg-zinc-800/50'
                    : 'bg-zinc-800/70 hover:bg-zinc-700/70 border border-zinc-700/50'
                }`}
              >
                {/* Ikona typu */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  n.read ? 'bg-zinc-800' : 'bg-zinc-700'
                }`}>
                  {typeIcon(n.type)}
                </div>

                {/* Treść */}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-black leading-snug ${n.read ? 'text-zinc-400' : 'text-white'}`}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-zinc-700 mt-1 font-bold">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Kropka unread */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
