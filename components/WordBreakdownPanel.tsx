import React, { useRef } from 'react';
import { WordData, LetterDefinition, AiWordAnalysis } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP } from '../constants';
import { ArrowDownTrayIcon, CpuChipIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

declare global {
  interface Window {
    html2canvas: any;
  }
}

interface WordBreakdownPanelProps {
  selectedWord: (WordData & { aiDefinition?: AiWordAnalysis }) | null;
  journalNote: string;
  onNoteChange: (val: string) => void;
  bookName?: string;
  chapter?: number;
  verseScanStatus?: 'idle' | 'scanning' | 'complete' | 'error';
}

const WordBreakdownPanel: React.FC<WordBreakdownPanelProps> = ({ 
  selectedWord, 
  journalNote, 
  onNoteChange,
  bookName,
  chapter,
  verseScanStatus = 'idle'
}) => {
  const exportRef = useRef<HTMLDivElement>(null);

  // Utility: Strict Cleaner (Consonants Only - Aleph to Tav) for history/display only
  const getCleanHebrew = (text: string): string => {
    return text.replace(/[^\u05D0-\u05EA]/g, "");
  };

  const getLetterBreakdown = (cleanWord: string): LetterDefinition[] => {
    return cleanWord.split('').map(char => {
      const root = SOFIT_MAP[char] || char;
      return DEFAULT_HEBREW_MAP[root];
    }).filter(Boolean);
  };
  
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
        link.download = `rhema-card-${selectedWord ? getCleanHebrew(selectedWord.text) : 'export'}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (err) {
        console.error("Export failed", err);
      }
    } else {
      alert("Export module loading... try again in a second.");
    }
  };

  // Logic: Direct Display of Passed Data
  const hasData = selectedWord && selectedWord.aiDefinition;
  
  let definition = "Select a word...";
  let root = "--";
  let morphology = "--";
  
  if (selectedWord) {
      if (hasData) {
          definition = selectedWord.aiDefinition?.definition || "";
          root = selectedWord.aiDefinition?.root || "";
          morphology = selectedWord.aiDefinition?.morphology || "Root analysis complete";
      } else {
          // No Data available for this word. Check scan status.
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
      
      {/* Title Header */}
      <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest mb-4 text-center">Morphological Analysis</div>

      {/* --- DECODER CARD (Top) --- */}
      <div className="decoder-card mb-6 p-6 rounded-2xl glass-panel border border-[var(--color-accent-primary)]/30 relative overflow-hidden group h-auto">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-secondary)] blur-[80px] opacity-10 pointer-events-none"></div>
         
         <div className="decoder-header flex flex-col gap-4 border-white/10 relative z-10">
             <div className="flex justify-between items-start w-full">
               <span id="decoder-ref" className="ref-badge text-[10px] uppercase tracking-widest bg-[var(--color-accent-primary)]/20 px-3 py-1 rounded text-[var(--color-accent-secondary)] border border-[var(--color-accent-primary)]/40">
                  {selectedWord ? `${bookName} ${chapter}:${selectedWord.verseIndex + 1}` : "--"}
               </span>
               
               <div className="flex items-center gap-3">
                   {hasData && (
                     <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)]/20 px-2 py-0.5 rounded border border-[var(--color-accent-secondary)]/30">
                        <CpuChipIcon className="w-3 h-3" />
                        <span>Gemini Flash</span>
                     </div>
                   )}
                   
                   {!hasData && selectedWord && verseScanStatus === 'scanning' && (
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-accent-secondary)] animate-pulse">
                         Scanning...
                    </span>
                   )}
               </div>
             </div>

             <div id="decoder-word-container" className="flex flex-col md:flex-row md:flex-wrap md:items-baseline gap-2 md:gap-6 mt-2">
                <span id="decoder-hebrew" className="hebrew-text text-5xl md:text-6xl text-[var(--color-accent-secondary)] drop-shadow-[0_0_15px_var(--color-accent-secondary)] leading-tight max-w-full break-words">
                    {selectedWord ? selectedWord.text : "--"}
                </span>
                
                {selectedWord && (
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[200px]">
                     <span className="text-xs uppercase tracking-widest text-white/50">{morphology}</span>
                    <div className="flex items-baseline gap-3">
                        <span className="divider text-[#a0a8c0] font-light hidden md:inline select-none">//</span>
                        <span id="decoder-english" className={`english-text text-lg md:text-xl font-normal leading-relaxed break-words ${!hasData ? 'text-[var(--color-accent-secondary)] opacity-80 animate-pulse' : 'text-white/90'}`}>
                        {definition}
                        </span>
                    </div>
                     {hasData && (
                        <span className="text-xs text-[var(--color-accent-secondary)] mt-1">Root: {root}</span>
                     )}
                  </div>
                )}
             </div>

             {!selectedWord && (
                <p className="text-[10px] text-[#a0a8c0] tech-font uppercase tracking-widest mt-2 animate-pulse">Awaiting Neural Link...</p>
             )}
         </div>
      </div>

      {selectedWord && (
        <>
            {/* Breakdown Horizontal Sequence */}
            <div className="mb-8 w-full bg-[#090a20]/20 rounded-2xl border border-[var(--color-accent-primary)]/10 p-6 backdrop-blur-sm">
                <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest mb-6 text-center border-b border-[var(--color-accent-primary)]/20 pb-4 w-1/2 mx-auto">
                    Pictographic Sequence
                </div>
                
                <div className="flex flex-row items-start justify-start md:justify-center gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {breakdown.map((l, i) => (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center gap-3 shrink-0 group min-w-[90px]">
                             {/* Image Container */}
                             <div className="w-20 h-20 flex items-center justify-center bg-[#090a20] border border-[var(--color-accent-primary)]/30 rounded-xl relative shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:border-[var(--color-accent-secondary)] group-hover:shadow-[0_0_15px_var(--color-accent-primary)] transition-all duration-300">
                                  <div className="absolute inset-0 bg-[var(--color-accent-primary)]/5 rounded-xl"></div>
                                  <span className="text-4xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transform group-hover:scale-110 transition-transform duration-300 z-10">{l.emoji}</span>
                             </div>
                             
                             {/* Labels Below */}
                             <div className="text-center flex flex-col gap-1">
                                <div className="text-[10px] md:text-[11px] font-bold text-white uppercase tracking-wider font-mono whitespace-nowrap">
                                    <span className="text-[var(--color-accent-secondary)]">{l.char}</span> - {l.name.toUpperCase()}
                                </div>
                                <div className="text-[8px] md:text-[9px] text-[#a0a8c0] uppercase tracking-widest opacity-80 tech-font px-2 bg-white/5 rounded py-0.5 whitespace-nowrap">
                                    {l.pictograph}
                                </div>
                             </div>
                        </div>

                        {/* Arrow */}
                        {i < breakdown.length - 1 && (
                             <div className="h-20 flex items-center justify-center">
                                <ArrowRightIcon className="w-4 h-4 text-[var(--color-accent-primary)]/50 shrink-0" />
                             </div>
                        )}
                    </React.Fragment>
                ))}
                </div>
            </div>

            {/* Simple Notes Input */}
            <div className="mb-4">
                <label className="text-[10px] uppercase tracking-widest text-[#a0a8c0] font-bold mb-2 block">Research Notes</label>
                <textarea 
                    value={journalNote}
                    onChange={(e) => onNoteChange(e.target.value)}
                    className="w-full bg-[#090a20]/40 border border-white/10 rounded-lg p-3 text-sm text-[#a0a8c0] focus:border-[var(--color-accent-secondary)] outline-none resize-none h-24"
                    placeholder="Enter observations..."
                />
            </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-auto">
        {/* Export Button */}
        <button 
          onClick={handleExport}
          disabled={!selectedWord}
          className="w-full electric-gradient text-white py-4 rounded-full text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 shadow-[0_0_20px_var(--color-accent-primary)] hover:shadow-[0_0_30px_var(--color-accent-secondary)] transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export Card
        </button>
      </div>

      {/* Hidden Export Card (For html2canvas) */}
      <div 
        ref={exportRef}
        id="export-card"
        className="hidden rhema-preview-card absolute top-0 left-0 w-[400px] h-[700px] bg-[#090a20] flex-col border-[2px] border-[var(--color-accent-primary)] z-[-1000]"
        style={{ backgroundImage: 'radial-gradient(ellipse at bottom, #090a20 0%, #000000 100%)' }}
      >
        <div className="english-content p-10 items-center text-center">
            <div className="mt-4 text-[var(--color-accent-secondary)] cinzel-font text-2xl tracking-[0.4em] uppercase mb-16 border-b border-[var(--color-accent-primary)]/30 pb-4 w-full">Genesis Suite</div>
            
            <div className="hebrew-text text-[9rem] text-white drop-shadow-[0_0_40px_var(--color-accent-secondary)] mb-6">
              {selectedWord ? strictCleanText : ''}
            </div>
            
            <div className="text-[#a0a8c0] tech-font uppercase tracking-[0.2em] text-sm mb-16">
              {bookName} {chapter} <span className="text-[var(--color-accent-secondary)] mx-2">///</span> VS {selectedWord ? selectedWord.verseIndex + 1 : ''}
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
    </div>
  );
};

export default WordBreakdownPanel;