
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SliderMode } from '../types';

interface Props {
  volume: number;
  mode: SliderMode;
}

const TormentorAI: React.FC<Props> = ({ volume, mode }) => {
  const [comment, setComment] = useState("Greetings, victim. Shall we adjust your suffering?");
  const [isThinking, setIsThinking] = useState(false);
  const lastVolume = useRef(volume);

  const generateComment = async () => {
    if (Math.random() > 0.3) return; // Don't comment on every single change

    setIsThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are a sadistic, sarcastic, and rude AI judge for a volume slider app.
      The user is currently using the '${mode}' mode. 
      Their volume is at ${Math.round(volume)}%. 
      They just changed it from ${Math.round(lastVolume.current)}%.
      
      Give a very short (max 10 words) sadistic or mocking comment in Polish. 
      Example: "I tak nie usłyszysz swojej porażki." or "Więcej krzyku, mniej efektu."
      Be creative and mean.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setComment(response.text?.trim() || "Cierp w milczeniu.");
    } catch (err) {
      setComment("Twoje starania są... żałosne.");
    } finally {
      setIsThinking(false);
      lastVolume.current = volume;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Math.abs(volume - lastVolume.current) > 5) {
        generateComment();
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded bg-red-900/30 flex items-center justify-center border border-red-500/50 shrink-0">
        <div className={`w-4 h-4 bg-red-500 rounded-full ${isThinking ? 'animate-ping' : ''}`} />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">AI Tormentor</p>
        <p className="text-zinc-300 text-sm font-medium italic">
          "{comment}"
        </p>
      </div>
    </div>
  );
};

export default TormentorAI;
