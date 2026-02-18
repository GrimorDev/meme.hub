
import React, { useState, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const ShakeSlider: React.FC<Props> = ({ value, onChange }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset({
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full p-12 overflow-visible">
      <div 
        className="transition-transform duration-75"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <input 
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-4 bg-zinc-800 rounded-lg appearance-none cursor-crosshair accent-red-600"
        />
        <div className="text-center mt-4 text-red-500 font-black animate-pulse text-xs">
          STAY STILL! STAY STILL!
        </div>
      </div>
    </div>
  );
};

export default ShakeSlider;
