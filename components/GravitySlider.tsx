
import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: number;
  onChange: (v: number | ((prev: number) => number)) => void;
}

const GravitySlider: React.FC<Props> = ({ value, onChange }) => {
  const [isHolding, setIsHolding] = useState(false);
  const friction = 0.8; // Per tick decay
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHolding && value > 0) {
        onChange(prev => Math.max(0, prev - friction));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isHolding, value, onChange]);

  const handleMouseDown = () => setIsHolding(true);
  const handleMouseUp = () => setIsHolding(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="relative w-full h-32 flex items-center group">
        <input 
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={value}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
        <div className="absolute top-0 right-0 text-[10px] text-zinc-500 font-mono flex items-center gap-1">
          <span className="animate-bounce">↓</span> GRAVITY ACTIVE
        </div>
      </div>
      <p className="text-zinc-500 text-xs text-center">
        Don't let go. It's slippery.
      </p>
    </div>
  );
};

export default GravitySlider;
