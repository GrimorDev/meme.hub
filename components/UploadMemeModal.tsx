
import React, { useState, useRef } from 'react';
import { X, Upload, Send, PenTool, Image as ImageIcon, Loader2 } from 'lucide-react';
import { db } from '../services/db';
import { User, MEME_CATEGORIES } from '../types';

interface UploadMemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToStudio: () => void;
  onUploadSuccess: () => void;
  user: User | null;
}

const UploadMemeModal: React.FC<UploadMemeModalProps> = ({ isOpen, onClose, onSwitchToStudio, onUploadSuccess, user }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !user) return;
    setIsPublishing(true);
    setError('');

    try {
      const url = await db.uploadFile(imageFile);
      const tags = selectedCategories.length > 0 ? selectedCategories : ['random'];
      await db.createPost({
        url,
        caption: caption || 'Bez podpisu',
        author: user.username,
        avatarColor: user.avatarColor,
        tags,
        timeAgo: 'Teraz',
      });

      setImagePreview(null);
      setImageFile(null);
      setCaption('');
      setSelectedCategories([]);
      onClose();
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Błąd podczas publikacji');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-full z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 pb-4">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Dodaj Nową Moc</h2>
          <p className="text-zinc-500 text-sm font-medium">Wgraj gotowy obrazek lub stwórz go od podstaw w studiu.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Lewa kolumna — upload */}
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all overflow-hidden relative cursor-pointer ${
                  imagePreview ? 'border-green-500 bg-black' : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                ) : (
                  <>
                    <div className="p-6 rounded-3xl bg-zinc-900 text-zinc-600">
                      <Upload size={40} />
                    </div>
                    <div className="text-center px-4">
                      <p className="font-black uppercase text-xs tracking-widest text-zinc-400">Kliknij, aby wgrać</p>
                      <p className="text-[10px] text-zinc-600 mt-1 uppercase">JPG, PNG, GIF</p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <button
                onClick={onSwitchToStudio}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 border border-zinc-700"
              >
                <PenTool size={18} />
                PRZEJDŹ DO STUDIA
              </button>
            </div>

            {/* Prawa kolumna — opis + kategorie */}
            <form onSubmit={handlePublish} className="flex flex-col gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Opis / Tytuł</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Wpisz coś śmiesznego..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm focus:border-green-500 outline-none transition-all font-bold h-24 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Kategoria</label>
                <div className="flex flex-wrap gap-2">
                  {MEME_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {selectedCategories.length === 0 && (
                  <p className="text-[10px] text-zinc-600 font-medium">Brak = trafi do "Random"</p>
                )}
              </div>

              <div className="space-y-4 pt-2 mt-auto">
                <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <ImageIcon size={16} />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium leading-tight">
                    Twoja moc pojawi się w zakładce "FRESH" i będzie dostępna dla wszystkich obywateli Hubu.
                  </p>
                </div>

                {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={!imageFile || isPublishing}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-green-600/20 text-sm uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPublishing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {isPublishing ? 'PUBLIKUJĘ...' : 'WYLĄDUJ NA FEEDZIE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UploadMemeModal;
