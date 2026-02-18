
import React, { useState, useRef, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const RunnerSlider: React.FC<Props> = ({ value, onChange }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const knobX = (value / 100) * rect.width;
    const knobY = rect.height / 2;

    const dx = mouseX - knobX;
    const dy = mouseY - knobY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 80) {
      // Run away!
      const angle = Math.atan2(dy, dx);
      const moveX = Math.cos(angle + Math.PI) * 15;
      
      const newValue = Math.max(0, Math.min(100, value + moveX));
      onChange(newValue);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full h-24 flex items-center relative cursor-none"
    >
      {/* Visual Track */}
      <div className="absolute inset-x-0 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-red-600 transition-all duration-300 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>

      {/* The Knob */}
      <div 
        className="absolute w-8 h-8 bg-zinc-100 rounded-full border-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center -ml-4 cursor-none"
        style={{ left: `${value}%` }}
      >
        <div className="w-1 h-3 bg-red-500 rounded-full" />
      </div>

      {/* Fake Cursor to taunt them */}
      <div 
        className="pointer-events-none absolute text-red-500 font-bold text-xs"
        style={{ left: `${value}%`, top: '10%' }}
      >
        CATCH ME
      </div>
    </div>
  );
};

export default RunnerSlider;
