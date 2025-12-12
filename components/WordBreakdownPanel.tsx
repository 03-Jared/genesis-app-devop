import React, { useRef } from 'react';
import { WordData, LetterDefinition } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP } from '../constants';
import { SparklesIcon, BookOpenIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface WordBreakdownPanelProps {
  selectedWord: WordData | null;
  journalNote: string;
  onNoteChange: (val: string) => void;
  bookName?: string;
  chapter?: number;
}

const WordBreakdownPanel: React.FC<WordBreakdownPanelProps> = ({ 
  selectedWord, 
  journalNote, 
  onNoteChange,
  bookName,
  chapter
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  
  if (!selectedWord) return (
    <div className="flex flex-col items-center justify-center h-full text-[#a0a8c0] opacity-60">
      <SparklesIcon className="w-16 h-16 mb-4 stroke-1 text-[var(--color-accent-primary)]" />
      <p className="tech-font text-xs uppercase tracking-widest">Awaiting Word Selection</p>
    </div>
  );

  const getLetterBreakdown = (cleanWord: string): LetterDefinition[] => {
    return cleanWord.split('').map(char => {
      const root = SOFIT_MAP[char] || char;
      return DEFAULT_HEBREW_MAP[root];
    }).filter(Boolean);
  };

  const breakdown = getLetterBreakdown(selectedWord.cleanText);

  const handleExport = async () => {
    if (exportRef.current && window.html2canvas) {
      try {
        exportRef.current.style.display = 'flex';
        const canvas = await window.html2canvas(exportRef.current, {
          backgroundColor: '#090a20',
          scale: 2,
        });
        exportRef.current.style.display = 'none';

        const link = document.createElement('a');
        link.download = `rhema-card-${selectedWord.cleanText}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (err) {
        console.error("Export failed", err);
      }
    } else {
      alert("Export module loading... try again in a second.");
    }
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn relative">
      {/* Header Word */}
      <div className="mb-6 text-center border-b border-[var(--color-accent-primary)]/20 pb-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-accent-primary)] blur-[50px] opacity-20 pointer-events-none"></div>
          <h2 className="hebrew-text text-6xl mb-3 text-white drop-shadow-[0_0_25px_var(--color-accent-secondary)] relative z-10">
            {selectedWord.cleanText}
          </h2>
          <div className="text-[10px] text-[#a0a8c0] tech-font uppercase tracking-widest flex items-center justify-center gap-3 relative z-10">
            <span>{bookName} {chapter}:{selectedWord.verseIndex + 1}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--color-accent-secondary)]"></span>
            <span>Ovia Decode</span>
          </div>
      </div>

      {/* Breakdown Grid (Tarot Style) */}
      <div className="flex-grow overflow-y-auto pr-1 mb-4 scrollbar-thin">
        <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest mb-4 text-center">Pictographic Sequence</div>
        
        <div className="grid grid-cols-2 gap-3 pb-4">
          {breakdown.map((l, i) => (
            <div 
              key={i} 
              className="
                flex flex-col items-center justify-center 
                bg-[#090a20]/40 border border-[var(--color-accent-primary)]/20 rounded-2xl p-4 aspect-[4/5]
                hover:bg-[var(--color-accent-primary)]/10 hover:border-[var(--color-accent-secondary)]/50 hover:-translate-y-1 hover:shadow-[0_0_20px_var(--color-accent-primary)]
                transition-all duration-300
                group relative overflow-hidden
              "
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a20] to-transparent pointer-events-none"></div>
              
              <span className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_10px_var(--color-accent-secondary)] z-10 grayscale group-hover:grayscale-0">
                {l.emoji}
              </span>
              
              <div className="relative z-10 text-center w-full">
                <div className="flex flex-col items-center justify-center gap-1 mb-2">
                  <span className="hebrew-text text-2xl text-[#a0a8c0] group-hover:text-white transition-colors">{l.char}</span>
                  <span className="text-[var(--color-accent-secondary)] font-bold text-[10px] uppercase tracking-widest">{l.name}</span>
                </div>
                
                <div className="text-[9px] text-[#a0a8c0] uppercase tracking-widest mb-1">{l.pictograph}</div>
                <div className="text-[10px] text-white font-sans text-center leading-tight opacity-0 group-hover:opacity-100 transition-opacity absolute w-full top-full group-hover:-translate-y-full bg-[#090a20]/90 backdrop-blur-md p-2 rounded border border-[var(--color-accent-secondary)]/30">
                  {l.meaning}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rhema Journal */}
      <div className="mb-4">
        <label className="text-[10px] text-[var(--color-accent-secondary)] uppercase tracking-widest mb-2 flex items-center gap-2 ml-1">
          <BookOpenIcon className="w-3 h-3" />
          Revelations
        </label>
        <textarea 
          value={journalNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Write what the Spirit is showing you..."
          className="w-full h-24 bg-[#090a20]/50 border border-[var(--color-accent-primary)]/20 rounded-2xl p-4 text-sm text-[#a0a8c0] focus:border-[var(--color-accent-secondary)]/50 focus:bg-[#090a20]/80 outline-none resize-none transition-all placeholder:text-[var(--color-accent-primary)]/40 font-sans"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {/* Export Button */}
        <button 
          onClick={handleExport}
          className="w-full electric-gradient text-white py-4 rounded-full text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 shadow-[0_0_20px_var(--color-accent-primary)] hover:shadow-[0_0_30px_var(--color-accent-secondary)] transform transition-all active:scale-95"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export Card
        </button>
      </div>

      {/* Hidden Export Card (For html2canvas) */}
      <div 
        ref={exportRef}
        id="export-card"
        className="hidden absolute top-0 left-0 w-[400px] h-[700px] bg-[#090a20] flex-col p-10 items-center text-center border-[2px] border-[var(--color-accent-primary)] z-[-1000]"
        style={{ backgroundImage: 'radial-gradient(ellipse at bottom, #090a20 0%, #000000 100%)' }}
      >
        <div className="mt-4 text-[var(--color-accent-secondary)] cinzel-font text-2xl tracking-[0.4em] uppercase mb-16 border-b border-[var(--color-accent-primary)]/30 pb-4">Genesis Suite</div>
        
        <div className="hebrew-text text-[9rem] text-white drop-shadow-[0_0_40px_var(--color-accent-secondary)] mb-6">
          {selectedWord.cleanText}
        </div>
        
        <div className="text-[#a0a8c0] tech-font uppercase tracking-[0.2em] text-sm mb-16">
          {bookName} {chapter} <span className="text-[var(--color-accent-secondary)] mx-2">///</span> VS {selectedWord.verseIndex + 1}
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-16 px-4">
           {breakdown.map((l, i) => (
             <div key={i} className="flex flex-col items-center bg-[var(--color-accent-primary)]/10 p-4 rounded-xl border border-[var(--color-accent-secondary)]/30 aspect-square w-20 justify-center">
                <span className="text-3xl mb-2 drop-shadow-lg">{l.emoji}</span>
                <span className="text-[8px] uppercase text-[var(--color-accent-secondary)] tracking-widest">{l.pictograph}</span>
             </div>
           ))}
        </div>

        {journalNote && (
          <div className="bg-[var(--color-accent-primary)]/10 p-6 rounded-xl border border-[var(--color-accent-primary)]/30 w-full text-left relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent-secondary)]"></div>
             <p className="text-[#a0a8c0] font-sans leading-relaxed text-lg relative z-10">
               "{journalNote}"
             </p>
          </div>
        )}

        <div className="mt-auto text-[var(--color-accent-secondary)] text-[10px] uppercase tracking-[0.3em] font-semibold">
          Decoded via Ovia AI
        </div>
      </div>
    </div>
  );
};

export default WordBreakdownPanel;