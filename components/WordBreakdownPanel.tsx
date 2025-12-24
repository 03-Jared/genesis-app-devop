
import React from 'react';
import { WordData, LetterDefinition, AiWordAnalysis } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP } from '../constants';
import { SwatchIcon, CpuChipIcon, ArrowRightIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface WordBreakdownPanelProps {
  selectedWord: (WordData & { aiDefinition?: AiWordAnalysis }) | null;
  journalNote: string;
  onNoteChange: (val: string) => void;
  bookName?: string;
  chapter?: number;
  verseScanStatus?: 'idle' | 'scanning' | 'complete' | 'error';
  onTriggerExport: () => void;
  onOpenDictionary?: (char?: string) => void;
}

const WordBreakdownPanel: React.FC<WordBreakdownPanelProps> = ({ 
  selectedWord, 
  journalNote, 
  onNoteChange,
  bookName,
  chapter,
  verseScanStatus = 'idle',
  onTriggerExport,
  onOpenDictionary
}) => {
  const getCleanHebrew = (text: string): string => text.replace(/[^\u05D0-\u05EA]/g, "");
  const getLetterBreakdown = (cleanWord: string): LetterDefinition[] => {
    return cleanWord.split('').map(char => {
      const root = SOFIT_MAP[char] || char;
      return DEFAULT_HEBREW_MAP[root];
    }).filter(Boolean);
  };
  
  const hasData = selectedWord && selectedWord.aiDefinition;
  let definition = "Select a word...";
  let morphology = "--";
  let root = "--";
  
  if (selectedWord) {
      if (hasData) {
          definition = selectedWord.aiDefinition?.definition || "";
          root = selectedWord.aiDefinition?.root || "";
          morphology = selectedWord.aiDefinition?.morphology || "Root analysis complete";
      } else {
          if (verseScanStatus === 'scanning') {
              definition = "Analyzing context...";
              morphology = "Neural uplink active...";
          } else if (verseScanStatus === 'complete') {
              definition = "Word not found in AI map.";
              morphology = "Try rescanning verse.";
          } else {
              definition = "Scan verse to unlock.";
              morphology = "Awaiting manual scan.";
          }
      }
  }

  const strictCleanText = selectedWord ? getCleanHebrew(selectedWord.text) : '';
  const breakdown = selectedWord ? getLetterBreakdown(strictCleanText) : [];

  return (
    <div className="flex flex-col animate-fadeIn relative pb-8">
      <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest mb-4 text-center">Morphological Analysis</div>

      <div className="decoder-card mb-6 p-6 rounded-2xl glass-panel border border-[var(--color-accent-primary)]/30 relative overflow-hidden group h-auto">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-secondary)] blur-[80px] opacity-10 pointer-events-none"></div>
         <div className="decoder-header flex flex-col gap-4 relative z-10">
             <div className="flex justify-between items-start w-full">
               <span className="verse-badge text-[10px] uppercase tracking-widest bg-[var(--color-accent-primary)]/20 px-3 py-1 rounded text-[var(--color-accent-secondary)] border border-[var(--color-accent-primary)]/40">
                  {selectedWord ? `${bookName} ${chapter}:${selectedWord.verseIndex + 1}` : "--"}
               </span>
               {hasData && (
                 <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)]/20 px-2 py-0.5 rounded border border-[var(--color-accent-secondary)]/30">
                    <CpuChipIcon className="w-3 h-3" />
                    <span>Gemini v3.0</span>
                 </div>
               )}
               {!hasData && selectedWord && verseScanStatus === 'scanning' && (
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-accent-secondary)] animate-pulse">
                         Scanning...
                    </span>
               )}
             </div>

             <div className="flex flex-col md:flex-row md:flex-wrap md:items-baseline gap-2 md:gap-6 mt-2">
                <span className="hebrew-text text-5xl md:text-6xl text-[var(--color-accent-secondary)] drop-shadow-[0_0_15px_var(--color-accent-secondary)] leading-tight max-w-full break-words">
                    {selectedWord ? selectedWord.text : "--"}
                </span>
                {selectedWord && (
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[200px]">
                     <span className="text-xs uppercase tracking-widest text-white/50">{morphology}</span>
                     <div className="flex items-baseline gap-3">
                        <span className="divider text-[#a0a8c0] font-light hidden md:inline select-none">//</span>
                        <span className={`english-text text-lg md:text-xl font-normal leading-relaxed break-words ${!hasData ? 'text-[var(--color-accent-secondary)] opacity-80 animate-pulse' : 'text-white/90'}`}>
                            {definition}
                        </span>
                     </div>
                     {hasData && (
                        <span className="text-xs text-[var(--color-accent-secondary)] mt-1">Root: {root}</span>
                     )}
                  </div>
                )}
             </div>
         </div>
      </div>

      {selectedWord && (
        <>
            <div className="mb-8 w-full bg-[#090a20]/20 rounded-2xl border border-[var(--color-accent-primary)]/10 p-6 backdrop-blur-sm">
                
                {/* Pictographic Sequence Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--color-accent-primary)]/20 px-2">
                   <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest">
                       Pictographic Sequence
                   </div>
                   {/* Button removed here, moved to panel header */}
                </div>
                
                {/* Pictographic Tiles */}
                <div className="flex flex-row items-start justify-start gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {breakdown.map((l, i) => (
                      <React.Fragment key={i}>
                          <div className="flex flex-col items-center gap-3 shrink-0 group min-w-[90px] relative">
                               <div className="w-20 h-20 flex items-center justify-center bg-[#090a20] border border-[var(--color-accent-primary)]/30 rounded-xl relative shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:border-[var(--color-accent-secondary)] group-hover:shadow-[0_0_15px_var(--color-accent-primary)] transition-all duration-300">
                                    <div className="absolute inset-0 bg-[var(--color-accent-primary)]/5 rounded-xl"></div>
                                    <span className="text-4xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transform group-hover:scale-110 transition-transform duration-300 z-10">{l.emoji}</span>
                                    
                                    {/* Specific 'i' icon for this letter */}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onOpenDictionary && onOpenDictionary(l.char); }}
                                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-[var(--color-accent-secondary)] border border-white/20 hover:border-white text-white/70 hover:text-white flex items-center justify-center transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100"
                                      title={`See meaning of ${l.name}`}
                                    >
                                      <InformationCircleIcon className="w-3.5 h-3.5" />
                                    </button>
                               </div>
                               <div className="text-center flex flex-col gap-1">
                                  <div className="text-[10px] md:text-[11px] font-bold text-white uppercase tracking-wider font-mono whitespace-nowrap">
                                      <span className="text-[var(--color-accent-secondary)]">{l.char}</span> - {l.name.toUpperCase()}
                                  </div>
                                  <div className="text-[8px] md:text-[9px] text-[#a0a8c0] uppercase tracking-widest opacity-80 tech-font px-2 bg-white/5 rounded py-0.5 whitespace-nowrap">
                                      {l.pictograph}
                                  </div>
                               </div>
                          </div>
                          {i < breakdown.length - 1 && (
                               <div className="h-20 flex items-center justify-center">
                                  <ArrowRightIcon className="w-4 h-4 text-[var(--color-accent-primary)]/50 shrink-0" />
                               </div>
                          )}
                      </React.Fragment>
                  ))}
                </div>
            </div>

            {selectedWord.aiDefinition?.reflection && (
               <div className="mb-8 w-full">
                  <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest mb-3 ml-2 border-l-2 border-[var(--color-accent-secondary)] pl-3">
                      Spiritual Insight
                  </div>
                  <div className="reflection-card w-full">
                      <span className="absolute top-2 right-4 text-xl opacity-20">✨</span>
                      <p className="reflection-text text-sm md:text-base leading-relaxed">
                        {selectedWord.aiDefinition.reflection}
                      </p>
                  </div>
               </div>
            )}

            <div className="mb-4">
                <label className="text-[10px] uppercase tracking-widest text-[#a0a8c0] font-bold mb-2 block ml-2">Research Notes</label>
                <textarea 
                    value={journalNote}
                    onChange={(e) => onNoteChange(e.target.value)}
                    className="w-full bg-[#090a20]/40 border border-white/10 rounded-lg p-3 text-sm text-[#a0a8c0] focus:border-[var(--color-accent-secondary)] outline-none resize-none h-24"
                    placeholder="Capture your spiritual insights..."
                />
            </div>
        </>
      )}

      <div className="flex flex-col gap-3 mt-auto">
        <button 
          onClick={onTriggerExport}
          disabled={!selectedWord}
          className="w-full electric-gradient text-white py-5 rounded-2xl text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
        >
          <SwatchIcon className="w-5 h-5" />
          Design Card
        </button>
      </div>
    </div>
  );
};

export default WordBreakdownPanel;
