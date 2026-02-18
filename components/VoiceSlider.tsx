
import React, { useState, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const VoiceSlider: React.FC<Props> = ({ value, onChange }) => {
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const update = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, (avg / 128) * 100);
        
        setMicLevel(normalized);
        if (normalized > 30) {
           onChange(normalized);
        }
        
        animationFrameRef.current = requestAnimationFrame(update);
      };
      
      update();
    } catch (err) {
      console.error("Mic access denied", err);
    }
  };

  useEffect(() => {
    startMic();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 text-zinc-500">
        <Mic className={micLevel > 50 ? 'text-red-500 animate-ping' : ''} />
        <span className="font-mono text-sm uppercase">SCREAM TO SET VOLUME</span>
      </div>
      
      <div className="w-full h-8 bg-zinc-800 rounded-full overflow-hidden relative">
        <div 
          className="h-full bg-red-600 transition-all duration-75"
          style={{ width: `${micLevel}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black mix-blend-overlay">
          LOUDNESS: {Math.round(micLevel)}
        </div>
      </div>

      <div className="w-full h-1 bg-zinc-900 rounded">
        <div className="h-full bg-white transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

export default VoiceSlider;
