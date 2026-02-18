
import React, { useState } from 'react';
import { Flame, Ghost, Upload, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const RoastStation: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [roast, setRoast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setRoast(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fix: contents must use the { parts: [...] } structure for multi-modal requests
  const getRoast = async () => {
    if (!image) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            },
            { text: "Oceń tego mema i brutalnie go 'roastuj' w języku polskim. Bądź sarkastyczny, złośliwy, ale śmieszny. Maksimum 50 słów." }
          ]
        }
      });

      // Use response.text getter directly
      setRoast(response.text || "Nawet AI nie wie, co to ma być za cringe...");
    } catch (err) {
      setRoast("Nawet AI nie wie, co to ma być za cringe...");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-full border border-orange-500/20 mb-2">
          <Flame size={48} className="text-orange-500 animate-pulse" />
        </div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter">AI ROAST STATION</h1>
        <p className="text-zinc-500 text-lg font-medium">Wrzuć mema, a AI zmiesza go z błotem.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="space-y-4">
          <div 
            className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all overflow-hidden relative ${
              image ? 'border-orange-500 bg-black' : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            {image ? (
              <img src={image} className="w-full h-full object-contain" alt="Upload" />
            ) : (
              <>
                <div className="p-6 rounded-2xl bg-zinc-800 text-zinc-500">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm">Kliknij, aby wrzucić mema</p>
                  <p className="text-xs text-zinc-600">JPG, PNG lub GIF</p>
                </div>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          
          <button 
            onClick={getRoast}
            disabled={!image || isLoading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-orange-600/20"
          >
            {isLoading ? <Ghost className="animate-bounce" /> : <Flame />}
            {isLoading ? 'ANALIZUJĘ CRINGE...' : 'SPAL TEGO MEMA'}
          </button>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-orange-500 group-hover:rotate-12 transition-transform">
            <Flame size={120} />
          </div>
          
          <div className="relative space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">Wynik Analizy</h3>
            
            {roast ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-2xl font-black italic leading-tight text-white">
                  "{roast}"
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-red-900/30 text-red-500 text-[10px] font-bold rounded-full border border-red-500/20 uppercase">Poziom Cringe: Krytyczny</span>
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold rounded-full uppercase">Estetyka: Zerowa</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-8">
                <div className="h-4 bg-zinc-800 rounded-full w-3/4 animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded-full w-full animate-pulse delay-75" />
                <div className="h-4 bg-zinc-800 rounded-full w-1/2 animate-pulse delay-150" />
                <p className="text-zinc-600 text-sm font-medium italic mt-8">Czekam na paliwo...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoastStation;
