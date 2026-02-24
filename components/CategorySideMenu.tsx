
import React, { useState, useEffect } from 'react';
import {
  X, ChevronDown, ChevronRight, Pin, PinOff,
  Flame, Star, Sparkles, Monitor, Download,
  Laugh, Film, Gamepad2, Landmark, Trophy, Zap, PawPrint, Cpu, BookOpen, Briefcase, Heart, Shuffle,
} from 'lucide-react';
import { MEME_CATEGORIES } from '../types';

const PINNED_KEY = 'pinned_categories';

// Sprawdź czy aplikacja działa jako Electron desktop
const isDesktopApp = () => navigator.userAgent.includes('MemsterDesktop');

function getPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); }
  catch { return []; }
}
function savePinned(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

// Ikony dla kategorii głównych
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  humor:       <Laugh size={16} />,
  filmy:       <Film size={16} />,
  gry:         <Gamepad2 size={16} />,
  polityka:    <Landmark size={16} />,
  sport:       <Trophy size={16} />,
  wypadki:     <Zap size={16} />,
  zwierzeta:   <PawPrint size={16} />,
  technologia: <Cpu size={16} />,
  szkola:      <BookOpen size={16} />,
  praca:       <Briefcase size={16} />,
  relacje:     <Heart size={16} />,
  random:      <Shuffle size={16} />,
};

interface CategorySideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTag: string | null;
  activeTab: 'HOT' | 'TOP' | 'NOWE';
  onTabChange: (tab: 'HOT' | 'TOP' | 'NOWE') => void;
  onTagSelect: (tag: string) => void;
  onClearFilters: () => void;
  onNavigateToDownloads?: () => void;
}

const CategorySideMenu: React.FC<CategorySideMenuProps> = ({
  isOpen, onClose, activeTag, activeTab, onTabChange, onTagSelect, onClearFilters, onNavigateToDownloads,
}) => {
  const [pinned, setPinnedState] = useState<string[]>(getPinned);
  const [expanded, setExpanded] = useState<string[]>([]);

  // Auto-rozwiń kategorię aktywnego tagu
  useEffect(() => {
    if (isOpen && activeTag) {
      const parent = MEME_CATEGORIES.find(
        c => c.id === activeTag || c.subcategories.some(s => s.id === activeTag)
      );
      if (parent && !expanded.includes(parent.id)) {
        setExpanded(prev => [...prev, parent.id]);
      }
    }
  }, [isOpen, activeTag]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id];
    setPinnedState(next);
    savePinned(next);
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const handleTabChange = (tab: 'HOT' | 'TOP' | 'NOWE') => {
    onTabChange(tab);
    onClose();
  };

  const handleTagSelect = (tag: string) => {
    onTagSelect(tag);
    onClose();
  };

  const handleAll = () => {
    onClearFilters();
    onClose();
  };

  // Zbierz wszystkie elementy z pinów
  const allItems = [
    ...MEME_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: CATEGORY_ICONS[c.id] })),
    ...MEME_CATEGORIES.flatMap(c => c.subcategories.map(s => ({ id: s.id, label: s.label, icon: CATEGORY_ICONS[c.id] }))),
  ];
  const pinnedItems = allItems.filter(i => pinned.includes(i.id));

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Nagłówek */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <span className="font-black text-white uppercase tracking-widest text-sm">Menu</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollowalna treść */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">

          {/* ── NAWIGACJA ── */}
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Nawigacja
          </p>
          <NavBtn
            icon={<Flame size={15} />}
            label="Główna"
            active={activeTab === 'HOT' && !activeTag}
            onClick={() => { handleTabChange('HOT'); onClearFilters(); }}
          />
          <NavBtn
            icon={<Star size={15} />}
            label="Top"
            active={activeTab === 'TOP' && !activeTag}
            onClick={() => { handleTabChange('TOP'); onClearFilters(); }}
          />
          <NavBtn
            icon={<Sparkles size={15} />}
            label="Nowości"
            active={activeTab === 'NOWE' && !activeTag}
            onClick={() => { handleTabChange('NOWE'); onClearFilters(); }}
          />

          {/* ── ULUBIONE ── */}
          {pinnedItems.length > 0 && (
            <>
              <div className="pt-4">
                <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  Ulubione
                </p>
              </div>
              {pinnedItems.map(item => (
                <div key={`pin-${item.id}`} className="flex items-center gap-1">
                  <button
                    onClick={() => handleTagSelect(item.id)}
                    className={`flex-1 text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 ${
                      activeTag === item.id
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                    }`}
                  >
                    <span className={activeTag === item.id ? 'text-white' : 'text-zinc-500'}>{item.icon}</span>
                    {item.label}
                  </button>
                  <button
                    onClick={e => togglePin(item.id, e)}
                    className="w-7 h-7 flex items-center justify-center text-purple-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all shrink-0"
                    title="Odepnij"
                  >
                    <PinOff size={13} />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── KATEGORIE ── */}
          <div className="pt-4">
            <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              Kategorie
            </p>
          </div>

          {/* Wszystkie */}
          <button
            onClick={handleAll}
            className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 ${
              !activeTag ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
            }`}
          >
            <span className={!activeTag ? 'text-white' : 'text-zinc-500'}>
              <Shuffle size={15} />
            </span>
            Wszystkie
          </button>

          {MEME_CATEGORIES.map(cat => {
            const isExpanded = expanded.includes(cat.id);
            const isPinned = pinned.includes(cat.id);
            const isActive = activeTag === cat.id;
            const hasActiveChild = cat.subcategories.some(s => s.id === activeTag);
            const icon = CATEGORY_ICONS[cat.id];

            return (
              <div key={cat.id}>
                {/* Główna kategoria */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleTagSelect(cat.id)}
                    className={`flex-1 text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : hasActiveChild
                        ? 'text-purple-300 bg-purple-900/20'
                        : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : hasActiveChild ? 'text-purple-400' : 'text-zinc-500'}>
                      {icon}
                    </span>
                    <span className="flex-1">{cat.label}</span>
                  </button>
                  <button
                    onClick={e => togglePin(cat.id, e)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0 ${
                      isPinned ? 'text-purple-400 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-700 hover:text-zinc-400 hover:bg-zinc-800'
                    }`}
                    title={isPinned ? 'Odepnij' : 'Przypnij'}
                  >
                    {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {/* Podkategorie */}
                {isExpanded && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-zinc-800/80 pl-2">
                    {cat.subcategories.map(sub => {
                      const isSubPinned = pinned.includes(sub.id);
                      const isSubActive = activeTag === sub.id;
                      return (
                        <div key={sub.id} className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleTagSelect(sub.id)}
                            className={`flex-1 text-left px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                              isSubActive ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'
                            }`}
                          >
                            {sub.label}
                          </button>
                          <button
                            onClick={e => togglePin(sub.id, e)}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all shrink-0 ${
                              isSubPinned ? 'text-purple-400 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-700 hover:text-zinc-500 hover:bg-zinc-800'
                            }`}
                            title={isSubPinned ? 'Odepnij' : 'Przypnij'}
                          >
                            {isSubPinned ? <PinOff size={11} /> : <Pin size={11} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── POBIERZ APLIKACJĘ — ukryte gdy działa jako desktop ── */}
        {!isDesktopApp() && (
          <div className="shrink-0 px-3 py-3 border-t border-zinc-800/80">
            <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              Aplikacja desktopowa
            </p>
            <button
              onClick={() => {
                onClose();
                if (onNavigateToDownloads) {
                  onNavigateToDownloads();
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/40 hover:bg-blue-950/20 transition-all group cursor-pointer text-left"
            >
              <div className="w-9 h-9 bg-blue-600/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600/30 transition-colors">
                <Monitor size={18} className="text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors leading-tight">Pobierz na Windows</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Wersja desktopowa (.exe)</p>
              </div>
              <Download size={14} className="text-zinc-600 group-hover:text-blue-400 shrink-0 transition-colors" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const NavBtn: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2.5 ${
      active ? 'bg-purple-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
    }`}
  >
    <span className={active ? 'text-white' : 'text-zinc-500'}>{icon}</span>
    {label}
  </button>
);

export default CategorySideMenu;
