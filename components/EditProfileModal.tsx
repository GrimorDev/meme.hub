
import React, { useState, useRef } from 'react';
import { X, Upload, Save, Image as ImageIcon, User as UserIcon, Type } from 'lucide-react';
import { User } from '../types';
import { db } from '../services/db';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdate: (updatedUser: User) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUser, onUpdate }) => {
  const [description, setDescription] = useState(currentUser.description || '');
  const [banner, setBanner] = useState(currentUser.bannerUrl || '');
  const [avatar, setAvatar] = useState(currentUser.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await db.uploadFile(file);
        setter(url);
      } catch {
        // fallback to base64 preview if upload fails
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await db.updateUser(currentUser.id, {
        description,
        bannerUrl: banner,
        avatarUrl: avatar,
      });
      if (updated) {
        onUpdate(updated);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-full z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 pb-4">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Edytuj Profil</h2>
            <p className="text-zinc-500 text-sm font-medium">Dostosuj swój wygląd w Meme Hub.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar">
            {/* Banner Section */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                    <ImageIcon size={12} /> Banner Profilowy
                </label>
                <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative group cursor-pointer"
                >
                    {banner ? (
                        <img src={banner} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="Banner" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <ImageIcon size={32} />
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="text-white" size={24} />
                    </div>
                    <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setBanner)} />
                </div>
            </div>

            {/* Avatar Section */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                    <UserIcon size={12} /> Zdjęcie Profilowe
                </label>
                <div className="flex items-center gap-4">
                    <div 
                        onClick={() => avatarInputRef.current?.click()}
                        className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden relative group cursor-pointer shrink-0"
                    >
                        {avatar ? (
                            <img src={avatar} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center text-white font-black text-2xl`}>
                                {currentUser.username[0]}
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="text-white" size={20} />
                        </div>
                        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setAvatar)} />
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Kliknij, aby zmienić awatar. Jeśli nie wybierzesz zdjęcia, użyjemy Twojego domyślnego koloru i inicjału.
                    </p>
                </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                    <Type size={12} /> O Sobie (Bio)
                </label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Napisz coś o sobie..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none transition-all font-medium h-32 resize-none"
                    maxLength={200}
                />
                <div className="text-right text-[10px] text-zinc-600">
                    {description.length}/200
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-purple-600/20 text-sm uppercase tracking-widest mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
                <Save size={18} /> {isSaving ? 'Zapisuję...' : 'Zapisz Zmiany'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
