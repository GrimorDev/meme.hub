
import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const MathSlider: React.FC<Props> = ({ value, onChange }) => {
  const [targetValue, setTargetValue] = useState(value);
  const [problem, setProblem] = useState<{ q: string; a: number }>({ q: '2 + 2', a: 4 });
  const [answer, setAnswer] = useState('');
  const [showModal, setShowModal] = useState(false);

  const generateProblem = () => {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 20) + 5;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let res = 0;
    if (op === '+') res = a + b;
    if (op === '-') res = a - b;
    if (op === '*') res = a * b;
    return { q: `${a} ${op} ${b}`, a: res };
  };

  const initiateChange = (newVal: number) => {
    setTargetValue(newVal);
    setProblem(generateProblem());
    setAnswer('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answer) === problem.a) {
      onChange(targetValue);
      setShowModal(false);
    } else {
      setAnswer('');
      setProblem(generateProblem()); // Punish with new problem
    }
  };

  return (
    <div className="w-full relative">
      <input 
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => initiateChange(Number(e.target.value))}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
      />

      {showModal && (
        <div className="absolute inset-0 bg-zinc-950 z-20 flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/50 shadow-2xl p-4">
          <div className="text-red-500 font-bold text-lg animate-pulse">VERIFICATION REQUIRED</div>
          <div className="text-zinc-400 font-mono text-xl">{problem.q} = ?</div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              autoFocus
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 w-24 text-center text-white outline-none focus:border-red-500"
            />
            <button className="bg-red-600 hover:bg-red-500 text-white p-2 rounded">
              <Check size={18} />
            </button>
          </form>
          <button onClick={() => setShowModal(false)} className="text-zinc-600 text-[10px] hover:text-zinc-400 uppercase tracking-widest">
            Cancel & Lose Progress
          </button>
        </div>
      )}
    </div>
  );
};

export default MathSlider;
