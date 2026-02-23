
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Pin, PinOff } from 'lucide-react';
import { MEME_CATEGORIES } from '../types';

const PINNED_KEY = 'pinned_categories';

function getPinned(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
  } catch {
    return [];
  }
}

function setPinned(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

interface CategorySideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTag: string | null;
  onTagSelect: (tag: string) => void;
  onClearFilters: () => void;
}

const CategorySideMenu: React.FC<CategorySideMenuProps> = ({
  isOpen,
  onClose,
  activeTag,
  onTagSelect,
  onClearFilters,
}) => {
  const [pinned, setPinnedState] = useState<string[]>(getPinned);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && activeTag) {
      // Automatycznie rozwiń kategorię zawierającą aktywny tag
      const parent = MEME_CATEGORIES.find(
        (c) => c.id === activeTag || c.subcategories.some((s) => s.id === activeTag)
      );
      if (parent && !expanded.includes(parent.id)) {
        setExpanded((prev) => [...prev, parent.id]);
      }
    }
  }, [isOpen, activeTag]);

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
    setPinnedState(next);
    setPinned(next);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSelect = (tag: string) => {
    onTagSelect(tag);
    onClose();
  };

  const handleAll = () => {
    onClearFilters();
    onClose();
  };

  // Zbierz piny: zarówno główne kategorie jak i podkategorie
  const allItems = [
    ...MEME_CATEGORIES.map((c) => ({ id: c.id, label: c.label, emoji: c.emoji })),
    ...MEME_CATEGORIES.flatMap((c) =>
      c.subcategories.map((s) => ({ id: s.id, label: s.label, emoji: c.emoji }))
    ),
  ];
  const pinnedItems = allItems.filter((i) => pinned.includes(i.id));

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="font-black text-white uppercase tracking-widest text-sm">Kategorie</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollowalna treść */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1 px-3">
          {/* Wszystkie */}
          <button
            onClick={handleAll}
            className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              !activeTag
                ? 'bg-purple-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            Wszystkie
          </button>

          {/* Ulubione */}
          {pinnedItems.length > 0 && (
            <div className="pt-3">
              <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                Ulubione
              </p>
              {pinnedItems.map((item) => (
                <div key={`pin-${item.id}`} className="flex items-center gap-1">
                  <button
                    onClick={() => handleSelect(item.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                      activeTag === item.id
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{item.emoji}</span>
                    {item.label}
                  </button>
                  <button
                    onClick={(e) => togglePin(item.id, e)}
                    className="w-7 h-7 flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-zinc-800 rounded-lg transition-all shrink-0"
                    title="Odepnij"
                  >
                    <PinOff size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Wszystkie kategorie */}
          <div className="pt-3">
            <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600">
              Wszystkie kategorie
            </p>
            {MEME_CATEGORIES.map((cat) => {
              const isExpanded = expanded.includes(cat.id);
              const isPinned = pinned.includes(cat.id);
              const isActive = activeTag === cat.id;
              const hasActiveChild = cat.subcategories.some((s) => s.id === activeTag);

              return (
                <div key={cat.id}>
                  {/* Główna kategoria */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSelect(cat.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : hasActiveChild
                          ? 'text-purple-300 bg-purple-900/20'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="flex-1">{cat.label}</span>
                    </button>
                    <button
                      onClick={(e) => togglePin(cat.id, e)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0 ${
                        isPinned
                          ? 'text-purple-400 hover:text-purple-300 hover:bg-zinc-800'
                          : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                      }`}
                      title={isPinned ? 'Odepnij' : 'Przypnij'}
                    >
                      {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </button>
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded-lg transition-all shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>

                  {/* Podkategorie */}
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-2">
                      {cat.subcategories.map((sub) => {
                        const isSubPinned = pinned.includes(sub.id);
                        const isSubActive = activeTag === sub.id;
                        return (
                          <div key={sub.id} className="flex items-center gap-1">
                            <button
                              onClick={() => handleSelect(sub.id)}
                              className={`flex-1 text-left px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                                isSubActive
                                  ? 'bg-purple-600 text-white'
                                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                              }`}
                            >
                              {sub.label}
                            </button>
                            <button
                              onClick={(e) => togglePin(sub.id, e)}
                              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all shrink-0 ${
                                isSubPinned
                                  ? 'text-purple-400 hover:text-purple-300 hover:bg-zinc-800'
                                  : 'text-zinc-700 hover:text-zinc-500 hover:bg-zinc-800'
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
        </div>
      </div>
    </>
  );
};

export default CategorySideMenu;
