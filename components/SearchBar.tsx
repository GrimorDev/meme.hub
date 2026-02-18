
import React, { useState, useEffect, useRef } from 'react';
import { Search, User as UserIcon, Hash, Image as ImageIcon, X, TrendingUp } from 'lucide-react';
import { db } from '../services/db';
import { MemePost, User } from '../types';

interface SearchBarProps {
  onMemeSelect: (meme: MemePost) => void;
  onUserSelect: (username: string) => void;
  onTagSelect: (tag: string) => void;
  onSearchSubmit: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onMemeSelect, onUserSelect, onTagSelect, onSearchSubmit }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ posts: MemePost[], users: User[], tags: string[] }>({ posts: [], users: [], tags: [] });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      db.search(query).then((searchResults) => {
        setResults(searchResults);
        setIsOpen(true);
      });
    } else {
      setResults({ posts: [], users: [], tags: [] });
      setIsOpen(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearchSubmit(query.trim());
      setIsOpen(false);
    }
  };

  const handleSelectMeme = (meme: MemePost) => {
    onMemeSelect(meme);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectUser = (username: string) => {
    onUserSelect(username);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectTag = (tag: string) => {
    onTagSelect(tag);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md group">
      <div className={`flex items-center gap-3 bg-zinc-900/50 border rounded-2xl px-4 py-2.5 transition-all duration-300 ${isOpen ? 'border-purple-500 bg-zinc-900 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'border-zinc-800 hover:border-zinc-700'}`}>
        <Search size={18} className={isOpen ? 'text-purple-500' : 'text-zinc-500'} />
        <input
          type="text"
          placeholder="Szukaj memów, tagów, userów..."
          value={query}
          onKeyDown={handleKeyDown}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="bg-transparent border-none outline-none text-sm w-full font-medium placeholder:text-zinc-600"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (results.posts.length > 0 || results.users.length > 0 || results.tags.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-2">
            
            {/* Tags Section */}
            {results.tags.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 px-1 flex items-center gap-2">
                  <Hash size={12} /> Kategorie
                </p>
                <div className="flex flex-wrap gap-2">
                  {results.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleSelectTag(tag)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-purple-600/20 hover:text-purple-400 border border-zinc-700 rounded-xl text-xs font-bold transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Users Section */}
            {results.users.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 px-1 flex items-center gap-2">
                  <UserIcon size={12} /> Użytkownicy
                </p>
                <div className="space-y-1">
                  {results.users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.username)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-xl transition-all text-left group/user"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center text-xs font-black text-white`}>
                        {user.username[0]}
                      </div>
                      <span className="text-sm font-bold text-zinc-200 group-hover/user:text-white">@{user.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Memes Section */}
            {results.posts.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2 px-1 flex items-center gap-2">
                  <ImageIcon size={12} /> Memy
                </p>
                <div className="space-y-1">
                  {results.posts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => handleSelectMeme(post)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-xl transition-all text-left group/meme"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                        <img src={post.url} alt="" className="w-full h-full object-cover opacity-80 group-hover/meme:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-zinc-200 truncate group-hover/meme:text-white">{post.caption}</span>
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">przez {post.author}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="bg-zinc-950/50 p-3 border-t border-zinc-800/50 flex items-center justify-center">
            <p className="text-[10px] font-bold text-zinc-600 flex items-center gap-2 italic">
              <TrendingUp size={10} /> Znajdź najgorętsze treści w Hubie
            </p>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SearchBar;
