
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  Sparkles,
  Type as TypeIcon,
  Search,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Save,
  Maximize2,
  X,
  Upload,
  Bold,
  Check,
  Globe,
  Lock,
  User as UserIcon,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { MemeTextBox, User, CommunityTemplate } from '../types';
import { db } from '../services/db';

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

type SidebarTab = 'imgflip' | 'community' | 'mine';

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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('imgflip');
  const [communityTemplates, setCommunityTemplates] = useState<CommunityTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<CommunityTemplate[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePublic, setNewTemplatePublic] = useState(false);
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [newTemplatePreview, setNewTemplatePreview] = useState<string | null>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);
  
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

  const filteredCommunity = useMemo(() =>
    communityTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [communityTemplates, searchTerm]
  );
  const filteredMine = useMemo(() =>
    myTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [myTemplates, searchTerm]
  );

  const loadCommunityTemplates = async () => {
    if (!user) return;
    setIsLoadingCommunity(true);
    try {
      const pub = await db.getTemplates('public');
      setCommunityTemplates(pub);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  const loadMyTemplates = async () => {
    if (!user) return;
    setIsLoadingCommunity(true);
    try {
      const mine = await db.getTemplates('mine');
      setMyTemplates(mine);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  useEffect(() => {
    if (sidebarTab === 'community') loadCommunityTemplates();
    else if (sidebarTab === 'mine') loadMyTemplates();
  }, [sidebarTab, user]);

  const selectCommunityTemplate = (t: CommunityTemplate) => {
    setSelectedTemplate({ id: t.id, name: t.name, url: t.url, width: 800, height: 600, box_count: 2 });
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewTemplateFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewTemplatePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplateFile || !newTemplateName.trim() || !user) return;
    setIsUploadingTemplate(true);
    try {
      const url = await db.uploadFile(newTemplateFile);
      const created = await db.addTemplate(newTemplateName.trim(), url, newTemplatePublic);
      if (newTemplatePublic) {
        setCommunityTemplates(prev => [created, ...prev]);
      }
      setMyTemplates(prev => [created, ...prev]);
      setShowAddTemplate(false);
      setNewTemplateName('');
      setNewTemplateFile(null);
      setNewTemplatePreview(null);
      setNewTemplatePublic(false);
      if (sidebarTab === 'imgflip') setSidebarTab('mine');
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await db.deleteTemplate(id);
      setMyTemplates(prev => prev.filter(t => t.id !== id));
      setCommunityTemplates(prev => prev.filter(t => t.id !== id));
    } catch { /* ignore */ }
  };

  const handleTogglePublic = async (id: string) => {
    try {
      const result = await db.toggleTemplatePublic(id);
      setMyTemplates(prev => prev.map(t => t.id === id ? { ...t, isPublic: result.isPublic } : t));
      if (!result.isPublic) {
        setCommunityTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch { /* ignore */ }
  };

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
      <div className="lg:col-span-3 space-y-3 bg-zinc-900/40 p-4 rounded-[2rem] border border-zinc-800 h-[800px] flex flex-col shadow-2xl">
        {/* Zakładki */}
        <div className="flex bg-zinc-950/60 p-1 rounded-2xl gap-1">
          {([['imgflip', '🌐', 'Imgflip'], ['community', '👥', 'Community'], ['mine', '🗂️', 'Moje']] as const).map(([tab, emoji, label]) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${sidebarTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* Szukaj */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input type="text" placeholder="Szukaj szablonu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-purple-500 outline-none transition-all" />
        </div>

        {/* Przycisk dodaj szablon (Community/Moje) */}
        {(sidebarTab === 'community' || sidebarTab === 'mine') && user && (
          <button
            onClick={() => setShowAddTemplate(true)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 font-bold text-xs transition-all"
          >
            <Plus size={14} /> Dodaj szablon
          </button>
        )}

        {/* Lista szablonów */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {/* IMGFLIP */}
          {sidebarTab === 'imgflip' && (
            isLoadingTemplates
              ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
              : <div className="grid grid-cols-2 gap-2 pb-4">
                  {filteredTemplates.map(t => (
                    <button key={t.id} onClick={() => setSelectedTemplate(t)} className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedTemplate?.id === t.id ? 'border-purple-500 shadow-xl' : 'border-transparent hover:border-zinc-700'}`}>
                      <img src={t.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={t.name} />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] font-bold text-white truncate">{t.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
          )}

          {/* COMMUNITY */}
          {sidebarTab === 'community' && (
            isLoadingCommunity
              ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
              : filteredCommunity.length === 0
                ? <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <Globe size={32} />
                    <p className="text-xs font-bold text-center">Brak szablonów community.<br/>Bądź pierwszy!</p>
                  </div>
                : <div className="grid grid-cols-2 gap-2 pb-4">
                    {filteredCommunity.map(t => (
                      <button key={t.id} onClick={() => selectCommunityTemplate(t)} className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedTemplate?.id === t.id ? 'border-purple-500 shadow-xl' : 'border-transparent hover:border-zinc-700'}`}>
                        <img src={t.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={t.name} />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[9px] font-bold text-white truncate">{t.name}</p>
                          <p className="text-[8px] text-zinc-400">@{t.uploader.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
          )}

          {/* MOJE */}
          {sidebarTab === 'mine' && (
            !user
              ? <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-bold">Zaloguj się</div>
              : isLoadingCommunity
                ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
                : filteredMine.length === 0
                  ? <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                      <ImageIcon size={32} />
                      <p className="text-xs font-bold text-center">Nie masz jeszcze<br/>własnych szablonów.</p>
                    </div>
                  : <div className="space-y-2 pb-4">
                      {filteredMine.map(t => (
                        <div key={t.id} className={`group relative flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${selectedTemplate?.id === t.id ? 'border-purple-500 bg-purple-600/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'}`}
                          onClick={() => selectCommunityTemplate(t)}>
                          <img src={t.url} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-zinc-700" alt={t.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{t.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {t.isPublic
                                ? <span className="text-[9px] text-green-500 font-bold flex items-center gap-0.5"><Globe size={8} /> Publiczny</span>
                                : <span className="text-[9px] text-zinc-600 font-bold flex items-center gap-0.5"><Lock size={8} /> Prywatny</span>
                              }
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTogglePublic(t.id); }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                              title={t.isPublic ? 'Ustaw prywatny' : 'Udostępnij publicznie'}
                            >
                              {t.isPublic ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 transition-colors"
                              title="Usuń"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
          )}
        </div>
      </div>

      {/* Modal: dodaj szablon */}
      {showAddTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2"><Plus size={18} /> Dodaj szablon</h3>
              <button onClick={() => { setShowAddTemplate(false); setNewTemplateFile(null); setNewTemplatePreview(null); }} className="p-1 text-zinc-500 hover:text-white bg-zinc-800 rounded-full"><X size={16} /></button>
            </div>

            <div
              onClick={() => templateFileRef.current?.click()}
              className={`aspect-video rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${newTemplatePreview ? 'border-purple-500' : 'border-zinc-700 hover:border-zinc-600'}`}
            >
              {newTemplatePreview
                ? <img src={newTemplatePreview} className="w-full h-full object-contain" alt="preview" />
                : <div className="flex flex-col items-center gap-2 text-zinc-600">
                    <Upload size={28} />
                    <span className="text-[10px] font-bold uppercase">Kliknij by wgrać</span>
                  </div>
              }
              <input ref={templateFileRef} type="file" accept="image/*" onChange={handleTemplateFileChange} className="hidden" />
            </div>

            <input
              type="text"
              placeholder="Nazwa szablonu..."
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-purple-500 outline-none transition-all"
            />

            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setNewTemplatePublic(!newTemplatePublic)}
                className={`w-10 h-6 rounded-full transition-all relative ${newTemplatePublic ? 'bg-purple-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${newTemplatePublic ? 'left-5' : 'left-1'}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Udostępnij publicznie</p>
                <p className="text-[10px] text-zinc-500">Widoczny dla wszystkich w zakładce Community</p>
              </div>
            </label>

            <button
              onClick={handleAddTemplate}
              disabled={!newTemplateFile || !newTemplateName.trim() || isUploadingTemplate}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl uppercase text-sm tracking-wider transition-all"
            >
              {isUploadingTemplate ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Dodaj Szablon'}
            </button>
          </div>
        </div>
      )}

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
