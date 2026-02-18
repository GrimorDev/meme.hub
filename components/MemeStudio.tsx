
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Download, 
  Sparkles, 
  RefreshCw, 
  Type as TypeIcon, 
  Search, 
  Loader2, 
  Plus, 
  Trash2, 
  Move,
  ChevronDown,
  Save,
  Eraser,
  Type,
  Maximize2,
  X,
  Upload,
  Bold,
  Check
} from 'lucide-react';
import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { MemeTextBox, User } from '../types';

interface ImgflipMeme {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count: number;
}

const FONT_FAMILIES = [
  { name: 'Impact (Klasyk)', value: 'Impact, sans-serif' },
  { name: 'Anton (Modern)', value: 'Anton, sans-serif' },
  { name: 'Arial (Standard)', value: 'Arial, sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Bangers (Komiks)', value: 'Bangers, cursive' },
  { name: 'Montserrat (Elegant)', value: 'Montserrat, sans-serif' },
  { name: 'Comic Sans (Cringe)', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { name: 'Roboto Black', value: 'Roboto, sans-serif' },
  { name: 'Pacifico (Retro)', value: 'Pacifico, cursive' },
];

const SNAP_THRESHOLD = 3; 
const DRAFT_STORAGE_KEY = 'meme_hub_draft_v1';
const LINE_HEIGHT_RATIO = 1.1;

const DEFAULT_BOXES: MemeTextBox[] = [
  { id: '1', text: 'GÓRNY TEKST', x: 50, y: 15, fontSize: 8, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1.5, width: 90, fontFamily: 'Impact, sans-serif', isBold: true },
  { id: '2', text: 'DOLNY TEKST', x: 50, y: 85, fontSize: 8, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1.5, width: 90, fontFamily: 'Impact, sans-serif', isBold: true }
];

interface Props {
  user: User | null;
}

const MemeStudio: React.FC<Props> = ({ user }) => {
  const [templates, setTemplates] = useState<ImgflipMeme[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ImgflipMeme | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [snapGuides, setSnapGuides] = useState<{ x?: number, y?: number }>({});
  
  const [textBoxes, setTextBoxes] = useState<MemeTextBox[]>(DEFAULT_BOXES);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>('1');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'font' or 'width'
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ val: 0, mouse: 0 });
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (previewRef.current) {
        setPreviewSize({
          width: previewRef.current.clientWidth,
          height: previewRef.current.clientHeight
        });
      }
    };
    const observer = new ResizeObserver(updateSize);
    if (previewRef.current) observer.observe(previewRef.current);
    updateSize();
    return () => observer.disconnect();
  }, [selectedTemplate]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('https://api.imgflip.com/get_memes');
        const data = await response.json();
        if (data.success) {
          setTemplates(data.data.memes);
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            try {
              const parsed = JSON.parse(savedDraft);
              if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate);
              if (parsed.textBoxes) setTextBoxes(parsed.textBoxes);
            } catch (e) {
              setSelectedTemplate(data.data.memes[0]);
            }
          } else {
            setSelectedTemplate(data.data.memes[0]);
          }
        }
      } catch (err) { console.error(err); } finally { setIsLoadingTemplates(false); }
    };
    fetchTemplates();
  }, []);

  // Auto-save logic kept as backup, but we add manual trigger below
  useEffect(() => {
    if (!isLoadingTemplates && selectedTemplate) {
      const draft = { selectedTemplate, textBoxes };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [selectedTemplate, textBoxes, isLoadingTemplates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [templates, searchTerm]);

  const addTextBox = () => {
    const newBox: MemeTextBox = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'NOWY TEKST',
      x: 50, y: 50, fontSize: 6, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1.5, width: 80, fontFamily: 'Impact, sans-serif', isBold: true
    };
    setTextBoxes([...textBoxes, newBox]);
    setSelectedBoxId(newBox.id);
  };

  const removeTextBox = (id: string) => {
    if (textBoxes.length <= 1) return;
    const newBoxes = textBoxes.filter(b => b.id !== id);
    setTextBoxes(newBoxes);
    if (selectedBoxId === id) setSelectedBoxId(newBoxes[0]?.id || null);
  };

  const updateBox = (id: string, updates: Partial<MemeTextBox>) => {
    setTextBoxes(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, box: MemeTextBox) => {
    if (editingId) return; // Disable drag while editing text
    e.stopPropagation();
    setSelectedBoxId(box.id);
    setIsDragging(true);
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const mousePercX = ((clientX - rect.left) / rect.width) * 100;
    const mousePercY = ((clientY - rect.top) / rect.height) * 100;
    dragOffset.current = { x: mousePercX - box.x, y: mousePercY - box.y };
  };

  const handleResizeStart = (e: React.MouseEvent, type: 'font' | 'width', box: MemeTextBox) => {
    e.stopPropagation();
    setIsResizing(type);
    resizeStart.current = { 
        val: type === 'font' ? box.fontSize : box.width, 
        mouse: type === 'font' ? e.clientY : e.clientX 
    };
  };

  const handleGlobalMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!selectedBoxId || !previewRef.current) return;
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(() => {
      if (!previewRef.current || !selectedBoxId) return;
      const rect = previewRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      if (isDragging) {
        const mousePercX = ((clientX - rect.left) / rect.width) * 100;
        const mousePercY = ((clientY - rect.top) / rect.height) * 100;
        
        let newX = mousePercX - dragOffset.current.x;
        let newY = mousePercY - dragOffset.current.y;
        const guides: { x?: number, y?: number } = {};

        textBoxes.forEach(box => {
          if (box.id === selectedBoxId) return;
          if (Math.abs(newX - box.x) < SNAP_THRESHOLD) { newX = box.x; guides.x = box.x; }
          if (Math.abs(newY - box.y) < SNAP_THRESHOLD) { newY = box.y; guides.y = box.y; }
        });

        if (Math.abs(newX - 50) < SNAP_THRESHOLD) { newX = 50; guides.x = 50; }
        if (Math.abs(newY - 50) < SNAP_THRESHOLD) { newY = 50; guides.y = 50; }

        setSnapGuides(guides);
        updateBox(selectedBoxId, { 
          x: Math.max(0, Math.min(100, newX)), 
          y: Math.max(0, Math.min(100, newY)) 
        });
      } else if (isResizing) {
        const box = textBoxes.find(b => b.id === selectedBoxId);
        if (!box) return;

        if (isResizing === 'font') {
          const deltaY = clientY - resizeStart.current.mouse;
          const newVal = Math.max(1, Math.min(25, resizeStart.current.val - (deltaY / rect.height) * 100));
          updateBox(selectedBoxId, { fontSize: newVal });
        } else if (isResizing === 'width') {
          const deltaX = clientX - resizeStart.current.mouse;
          const newVal = Math.max(10, Math.min(100, resizeStart.current.val + (deltaX / rect.width) * 200));
          updateBox(selectedBoxId, { width: newVal });
        }
      }
    });
  };

  const handleGlobalEnd = () => {
    setIsDragging(false);
    setIsResizing(null);
    setSnapGuides({});
  };

  const handleSaveDraft = () => {
    if (!selectedTemplate) return;
    const draft = { selectedTemplate, textBoxes };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  const drawWrappedText = (
    ctx: CanvasRenderingContext2D, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    lineHeight: number,
    outlineWidth: number,
    outlineColor: string,
    fillColor: string,
    isBold: boolean
  ) => {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);

    lines.forEach((line) => {
      if (outlineWidth > 0) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, x, startY);
      }
      ctx.fillStyle = fillColor;
      ctx.fillText(line, x, startY);
      startY += lineHeight;
    });
  };

  const downloadMeme = async () => {
    if (!selectedTemplate) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedTemplate.url;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      textBoxes.forEach(box => {
        const realFontSize = (box.fontSize / 100) * canvas.height;
        const fontName = box.fontFamily.split(',')[0].replace(/"/g, '');
        const fontWeight = box.isBold ? 'bold' : 'normal';
        
        ctx.font = `${fontWeight} ${realFontSize}px ${fontName}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const x = (box.x / 100) * canvas.width;
        const y = (box.y / 100) * canvas.height;
        const maxWidth = (box.width / 100) * canvas.width;
        const lineHeight = realFontSize * LINE_HEIGHT_RATIO;
        const outlinePhysWidth = (box.outlineWidth / 100) * canvas.height;

        drawWrappedText(ctx, box.text, x, y, maxWidth, lineHeight, outlinePhysWidth, box.outlineColor, box.color, box.isBold);
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `meme-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { 
      console.error(err);
      alert("Błąd pobierania."); 
    } finally { setIsDownloading(false); }
  };

  const generateAICaptions = async () => {
    if (!selectedTemplate) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Śmieszne napisy do mema "${selectedTemplate.name}". Góra i dół. Po polsku.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: 'application/json',
          responseSchema: {
            type: GenAIType.OBJECT,
            properties: { top: { type: GenAIType.STRING }, bottom: { type: GenAIType.STRING } },
            required: ["top", "bottom"],
          },
        },
      });
      const data = JSON.parse(response.text || '{}');
      const newBoxes = [...textBoxes];
      if (newBoxes[0]) newBoxes[0].text = (data.top || '').toUpperCase();
      if (newBoxes[1]) newBoxes[1].text = (data.bottom || '').toUpperCase();
      setTextBoxes(newBoxes);
    } catch (err) { console.error(err); } finally { setIsGenerating(false); }
  };

  const currentBox = textBoxes.find(b => b.id === selectedBoxId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Montserrat:wght@400;700;900&family=Pacifico&family=Roboto:wght@400;700;900&display=swap" rel="stylesheet" />
      
      {/* Sidebar: Baza */}
      <div className="lg:col-span-3 space-y-4 bg-zinc-900/40 p-5 rounded-[2rem] border border-zinc-800 h-[800px] flex flex-col shadow-2xl">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-purple-500">Baza Memów</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input type="text" placeholder="Szukaj..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-sm focus:border-purple-500 outline-none transition-all" />
        </div>
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {isLoadingTemplates ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div> : (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {filteredTemplates.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t)} className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${selectedTemplate?.id === t.id ? 'border-purple-500 shadow-xl' : 'border-transparent hover:border-zinc-700'}`}>
                  <img src={t.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={t.name} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edytor Centralny */}
      <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24 flex flex-col items-center">
        <div 
          ref={previewRef}
          onMouseMove={handleGlobalMove} onMouseUp={handleGlobalEnd} onMouseLeave={handleGlobalEnd}
          onTouchMove={handleGlobalMove} onTouchEnd={handleGlobalEnd}
          className="relative bg-zinc-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800/50 cursor-crosshair group/canvas w-full max-w-[600px] flex items-center justify-center select-none"
          style={{ 
            aspectRatio: selectedTemplate ? `${selectedTemplate.width}/${selectedTemplate.height}` : '1/1'
          }}
        >
          {selectedTemplate && (
            <>
              <img src={selectedTemplate.url} className={`absolute inset-0 w-full h-full object-cover select-none transition-opacity duration-500 opacity-100`} alt="" draggable={false} />
              
              {snapGuides.x !== undefined && (
                <div className="absolute top-0 bottom-0 border-l border-purple-500 border-dashed z-50 pointer-events-none" style={{ left: `${snapGuides.x}%` }} />
              )}
              {snapGuides.y !== undefined && (
                <div className="absolute left-0 right-0 border-t border-purple-500 border-dashed z-50 pointer-events-none" style={{ top: `${snapGuides.y}%` }} />
              )}

              {textBoxes.map((box) => (
                <div
                  key={box.id} 
                  onMouseDown={(e) => handleDragStart(e, box)} 
                  onTouchStart={(e) => handleDragStart(e, box)}
                  onDoubleClick={() => setEditingId(box.id)}
                  className={`absolute z-20 cursor-move px-2 py-1 select-none flex items-center justify-center ${selectedBoxId === box.id ? 'ring-2 ring-purple-500 bg-black/20' : 'hover:bg-white/5'}`}
                  style={{ 
                    left: `${box.x}%`, 
                    top: `${box.y}%`, 
                    transform: 'translate(-50%, -50%)', 
                    width: `${box.width}%`,
                    minHeight: '2em',
                    transition: (isDragging || isResizing) && selectedBoxId === box.id ? 'none' : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                >
                  {editingId === box.id ? (
                    <textarea
                        autoFocus
                        value={box.text}
                        onBlur={() => setEditingId(null)}
                        onChange={(e) => updateBox(box.id, { text: e.target.value.toUpperCase() })}
                        className="bg-zinc-900/90 text-white font-black text-center w-full h-full border-none outline-none resize-none p-0 overflow-hidden leading-tight"
                        style={{ 
                            fontSize: `${(box.fontSize / 100) * previewSize.height}px`, 
                            fontFamily: box.fontFamily,
                            fontWeight: box.isBold ? 'bold' : 'normal'
                        }}
                    />
                  ) : (
                    <h3 
                        style={{ 
                        fontSize: `${(box.fontSize / 100) * previewSize.height}px`, 
                        color: box.color,
                        fontFamily: box.fontFamily,
                        fontWeight: box.isBold ? 'bold' : 'normal',
                        lineHeight: LINE_HEIGHT_RATIO,
                        textAlign: 'center',
                        wordBreak: 'break-word',
                        WebkitTextStroke: box.outlineWidth > 0 ? `${((box.outlineWidth / 100) * previewSize.height)}px ${box.outlineColor}` : 'none',
                        paintOrder: 'stroke fill',
                        textShadow: box.outlineWidth > 0 ? `0 0 2px ${box.outlineColor}` : 'none'
                        }}
                        className="m-0 p-0 pointer-events-none w-full"
                    >
                        {box.text || 'KLIKNIJ 2X'}
                    </h3>
                  )}

                  {/* Handles for selected box */}
                  {selectedBoxId === box.id && !editingId && (
                    <>
                        {/* Top handle: resize font */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'font', box)}
                            className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-purple-600 border-2 border-white rounded-full cursor-ns-resize flex items-center justify-center shadow-lg"
                        >
                            <Maximize2 size={12} className="text-white rotate-45" />
                        </div>
                        {/* Right handle: resize width */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'width', box)}
                            className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-purple-600 border-2 border-white rounded-full cursor-ew-resize flex items-center justify-center shadow-lg"
                        >
                            <Maximize2 size={12} className="text-white" />
                        </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        
        {/* Przycisk Akcji */}
        <div className="flex gap-4 w-full max-w-[600px]">
          <button onClick={generateAICaptions} disabled={isGenerating || !selectedTemplate} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-4 rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl">
            <Sparkles size={24} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'MIESZAM...' : 'AI MAGICZNE NAPISY'}
          </button>
          <div className="flex gap-2">
            <button 
                onClick={handleSaveDraft}
                disabled={!selectedTemplate}
                className={`px-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-2xl flex items-center gap-2 font-bold transition-all active:scale-95 ${isDraftSaved ? 'text-green-500 border-green-500/50' : ''}`}
                title="Zapisz szkic"
            >
                {isDraftSaved ? <Check size={20} /> : <Save size={20} />}
            </button>
            <button onClick={downloadMeme} disabled={isDownloading || !selectedTemplate} className="px-10 bg-zinc-900 border border-zinc-800 text-white rounded-2xl flex items-center gap-3 font-bold active:scale-95 transition-all">
                {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                {isDownloading ? 'RENDER...' : 'ZAPISZ'}
            </button>
          </div>
        </div>
      </div>

      {/* Kontrolki Typograficzne */}
      <div className="lg:col-span-3 space-y-6 bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800 shadow-2xl h-fit max-h-[800px] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pola Tekstowe</h3>
          <button onClick={addTextBox} className="p-2 bg-purple-600 rounded-xl text-white hover:bg-purple-500 shadow-lg active:scale-90 transition-all"><Plus size={18} /></button>
        </div>
        <div className="space-y-2">
          {textBoxes.map((box, idx) => (
            <div key={box.id} className="relative group">
              <button onClick={() => setSelectedBoxId(box.id)} className={`w-full p-4 pr-10 rounded-2xl border text-left flex items-center gap-3 transition-all ${selectedBoxId === box.id ? 'bg-purple-600/20 border-purple-500' : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${selectedBoxId === box.id ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {idx + 1}
                </div>
                <span className="text-xs font-bold truncate tracking-tight">{box.text || 'Brak treści'}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeTextBox(box.id); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {currentBox && (
          <div className="space-y-6 pt-6 border-t border-zinc-800/50 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2"><TypeIcon size={12} /> Treść</label>
              <textarea value={currentBox.text} onChange={(e) => updateBox(currentBox.id, { text: e.target.value.toUpperCase() })} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-purple-500 outline-none font-bold h-24 shadow-inner" placeholder="Wpisz tekst..." />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Krój Pisma</label>
              <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select value={currentBox.fontFamily} onChange={(e) => updateBox(currentBox.id, { fontFamily: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm font-bold appearance-none outline-none focus:border-purple-500 transition-all">
                      {FONT_FAMILIES.map(f => <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                  </div>
                  <button 
                    onClick={() => updateBox(currentBox.id, { isBold: !currentBox.isBold })}
                    className={`w-12 rounded-xl flex items-center justify-center border transition-all ${currentBox.isBold ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    title="Pogrubienie"
                  >
                    <Bold size={18} strokeWidth={3} />
                  </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-end"><label className="text-[10px] font-black uppercase text-zinc-500">Rozmiar</label></div>
                <div className="flex gap-2 items-center">
                    <input type="range" min="1" max="25" step="0.1" value={currentBox.fontSize} onChange={(e) => updateBox(currentBox.id, { fontSize: parseFloat(e.target.value) })} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-purple-500" />
                    <input type="number" min="1" max="25" step="0.1" value={currentBox.fontSize} onChange={(e) => updateBox(currentBox.id, { fontSize: parseFloat(e.target.value) })} className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-center py-1 focus:border-purple-500 outline-none text-zinc-300" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end"><label className="text-[10px] font-black uppercase text-zinc-500">Szerokość %</label></div>
                <div className="flex gap-2 items-center">
                    <input type="range" min="10" max="100" value={currentBox.width} onChange={(e) => updateBox(currentBox.id, { width: parseInt(e.target.value) })} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-purple-500" />
                    <input type="number" min="10" max="100" value={currentBox.width} onChange={(e) => updateBox(currentBox.id, { width: parseInt(e.target.value) })} className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-center py-1 focus:border-purple-500 outline-none text-zinc-300" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end"><label className="text-[10px] font-black uppercase text-zinc-500">Obrys</label></div>
              <div className="flex gap-2 items-center">
                  <input type="range" min="0" max="5" step="0.1" value={currentBox.outlineWidth} onChange={(e) => updateBox(currentBox.id, { outlineWidth: parseFloat(e.target.value) })} className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-purple-500" />
                  <input type="number" min="0" max="5" step="0.1" value={currentBox.outlineWidth} onChange={(e) => updateBox(currentBox.id, { outlineWidth: parseFloat(e.target.value) })} className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-center py-1 focus:border-purple-500 outline-none text-zinc-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Kolor Tekstu</label>
                <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <input type="color" value={currentBox.color} onChange={(e) => updateBox(currentBox.id, { color: e.target.value })} className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0 p-0" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{currentBox.color}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-500">Kolor Obrysu</label>
                <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <input type="color" value={currentBox.outlineColor} onChange={(e) => updateBox(currentBox.id, { outlineColor: e.target.value })} className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0 p-0" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{currentBox.outlineColor}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
};

export default MemeStudio;
