import React, { useState, useEffect } from 'react';
import { LetterDefinition } from '../types';
import { PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface LetterCardProps {
  data: LetterDefinition;
  index: number;
  onSave: (char: string, newDef: Partial<LetterDefinition>) => void;
}

const LetterCard: React.FC<LetterCardProps> = ({ data, index, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    pictograph: data.pictograph,
    meaning: data.meaning,
    emoji: data.emoji,
  });

  useEffect(() => {
    setEditValues({
      pictograph: data.pictograph,
      meaning: data.meaning,
      emoji: data.emoji,
    });
  }, [data]);

  const handleSave = () => {
    onSave(data.char, editValues);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      pictograph: data.pictograph,
      meaning: data.meaning,
      emoji: data.emoji,
    });
    setIsEditing(false);
  };

  return (
    <div 
      className="
        relative group 
        bg-white/[0.03] backdrop-blur-md 
        border border-white/10 rounded-xl 
        p-6 flex flex-col items-center text-center 
        shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]
        transition-all duration-500 ease-out 
        hover:-translate-y-2 hover:rotate-1 hover:shadow-2xl hover:shadow-amber-900/10 hover:border-white/20 hover:bg-white/[0.05]
        opacity-0 animate-fade-in
      "
      style={{ 
        animationDelay: `${index * 100}ms` 
      }}
    >
      
      <div className="relative w-full z-10 flex flex-col items-center h-full justify-between gap-4">
        
        {/* Header: Name (Tech Font) */}
        <div className="w-full flex justify-between items-center border-b border-white/5 pb-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-medium tech-font">
            {data.name}
          </span>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-white/10 hover:text-amber-400 transition-colors"
            >
              <PencilSquareIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Hebrew Letter */}
        <div className="relative">
           <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700"></div>
           <h2 className="hebrew-font text-6xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
            {data.char}
          </h2>
        </div>

        {isEditing ? (
          <div className="w-full space-y-3 animate-fade-in w-full">
            <div className="grid grid-cols-4 gap-2">
                 <input 
                  type="text" 
                  value={editValues.emoji}
                  onChange={(e) => setEditValues({...editValues, emoji: e.target.value})}
                  className="col-span-1 bg-black/40 border border-white/10 rounded px-1 py-1 text-center text-lg focus:border-amber-500/50 outline-none text-white transition-colors"
                />
                 <input 
                  type="text" 
                  value={editValues.pictograph}
                  onChange={(e) => setEditValues({...editValues, pictograph: e.target.value})}
                  className="col-span-3 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs focus:border-amber-500/50 outline-none text-white transition-colors tech-font uppercase tracking-wide"
                />
            </div>
           
            <textarea 
              value={editValues.meaning}
              onChange={(e) => setEditValues({...editValues, meaning: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-xs focus:border-amber-500/50 outline-none text-white/80 transition-colors resize-none h-16 tech-font"
            />
            
            <div className="flex gap-2 justify-center pt-1">
              <button onClick={handleSave} className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1 rounded text-[10px] uppercase tracking-wider transition-colors border border-amber-500/20">
                <CheckIcon className="w-3 h-3" /> Save
              </button>
              <button onClick={handleCancel} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/40 px-3 py-1 rounded text-[10px] uppercase tracking-wider transition-colors border border-white/5">
                <XMarkIcon className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            
            <div className="flex items-center gap-3">
               <span className="text-2xl filter drop-shadow-md">{data.emoji}</span>
               <span className="h-4 w-[1px] bg-white/10"></span>
               <h3 className="text-xs font-semibold text-amber-200/80 tech-font uppercase tracking-widest">
                {data.pictograph}
              </h3>
            </div>

            <p className="text-xs text-white/50 font-light leading-relaxed px-1 tech-font tracking-wide border-t border-white/5 pt-3 w-full">
              {data.meaning}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LetterCard;