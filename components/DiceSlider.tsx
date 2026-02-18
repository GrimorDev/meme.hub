
import React, { useState } from 'react';
import { Dices } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const DiceSlider: React.FC<Props> = ({ value, onChange }) => {
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    setRolling(true);
    setTimeout(() => {
      const chance = Math.random();
      if (chance > 0.9) {
        // Jackpot!
        onChange(Math.floor(Math.random() * 100));
      } else {
        // Typical luck
        onChange(0);
      }
      setRolling(false);
    }, 600);
  };

  return (
    <div className="w-full flex flex-col items-center gap-8">
      <div className={`p-8 bg-zinc-800 rounded-2xl border-2 border-zinc-700 shadow-xl transition-all ${rolling ? 'scale-110 rotate-12' : ''}`}>
        <Dices size={64} className={rolling ? 'text-red-500 animate-bounce' : 'text-zinc-500'} />
      </div>
      
      <button 
        disabled={rolling}
        onClick={roll}
        className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-black uppercase tracking-widest rounded-xl shadow-lg transition-transform active:scale-95"
      >
        {rolling ? 'Gambling with your hearing...' : 'Roll for Volume'}
      </button>

      <p className="text-zinc-600 text-[10px] uppercase font-mono">
        1 in 10 chance to change volume. 9 in 10 chance to Mute.
      </p>
    </div>
  );
};

export default DiceSlider;
