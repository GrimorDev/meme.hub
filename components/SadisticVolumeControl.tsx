
import React, { useState } from 'react';
import { Volume2, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { SliderMode } from '../types';
import RunnerSlider from './RunnerSlider';
import GravitySlider from './GravitySlider';
import MathSlider from './MathSlider';
import VoiceSlider from './VoiceSlider';
import DiceSlider from './DiceSlider';
import ShakeSlider from './ShakeSlider';
import TormentorAI from './TormentorAI';

const MODES: { id: SliderMode; name: string; desc: string }[] = [
  { id: 'SIMPLE', name: 'Klasyczny', desc: 'Nudny, zwykły suwak. Dla słabych.' },
  { id: 'RUNNER', name: 'Uciekinier', desc: 'Nie daj mu uciec. Musisz być szybki.' },
  { id: 'GRAVITY', name: 'Grawitacja', desc: 'Wszystko co idzie w górę, musi spaść.' },
  { id: 'MATH', name: 'Matematyk', desc: 'Udowodnij, że zasługujesz na głośność.' },
  { id: 'VOICE', name: 'Krzycz!', desc: 'Głośność zależy od Twojej rozpaczy.' },
  { id: 'DICE', name: 'Hazard', desc: 'Wszystko albo nic. Zaryzykuj słuch.' },
  { id: 'SHAKE', name: 'Trzęsienie', desc: 'Spróbuj trafić w cel podczas katastrofy.' },
];

const SadisticVolumeControl: React.FC = () => {
  const [modeIdx, setModeIdx] = useState(0);
  const [volume, setVolume] = useState(50);
  
  const currentMode = MODES[modeIdx];

  const nextMode = () => setModeIdx((prev) => (prev + 1) % MODES.length);
  const prevMode = () => setModeIdx((prev) => (prev - 1 + MODES.length) % MODES.length);

  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-xl text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <Volume2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase italic tracking-wider text-white">Poziom Cierpienia</h4>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{Math.round(volume)}% Głośności</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button onClick={prevMode} className="p-1 hover:text-white text-zinc-600 transition-colors"><ChevronLeft size={16} /></button>
          <span className="text-[10px] font-black uppercase px-2 text-zinc-300 min-w-[80px] text-center">{currentMode.name}</span>
          <button onClick={nextMode} className="p-1 hover:text-white text-zinc-600 transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
        <div className="flex items-start gap-2 mb-4">
          <Info size={12} className="text-zinc-600 mt-0.5" />
          <p className="text-[10px] text-zinc-500 font-medium italic">{currentMode.desc}</p>
        </div>

        <div className="min-h-[100px] flex items-center justify-center">
          {currentMode.id === 'SIMPLE' && (
            <input 
              type="range" value={volume} onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
          )}
          {currentMode.id === 'RUNNER' && <RunnerSlider value={volume} onChange={setVolume} />}
          {currentMode.id === 'GRAVITY' && <GravitySlider value={volume} onChange={setVolume} />}
          {currentMode.id === 'MATH' && <MathSlider value={volume} onChange={setVolume} />}
          {currentMode.id === 'VOICE' && <VoiceSlider value={volume} onChange={setVolume} />}
          {currentMode.id === 'DICE' && <DiceSlider value={volume} onChange={setVolume} />}
          {currentMode.id === 'SHAKE' && <ShakeSlider value={volume} onChange={setVolume} />}
        </div>
      </div>

      <TormentorAI volume={volume} mode={currentMode.id} />
    </div>
  );
};

export default SadisticVolumeControl;
