import React, { useRef, useState, useEffect } from 'react';
import { WordData, LetterDefinition, SefariaLexiconEntry } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP, CORE_DICTIONARY } from '../constants';
import { ArrowDownTrayIcon, GlobeAltIcon, BoltIcon, BookOpenIcon, GlobeAmericasIcon } from '@heroicons/react/24/outline';

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
  const [definition, setDefinition] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [source, setSource] = useState<'cache' | 'api' | 'wiki' | null>(null);

  // 1. Utility: Remove Nikud (Vowel Points)
  const removeNikud = (text: string): string => {
    return text.replace(/[\u0591-\u05C7]/g, '');
  };

  const getLetterBreakdown = (cleanWord: string): LetterDefinition[] => {
    return cleanWord.split('').map(char => {
      const root = SOFIT_MAP[char] || char;
      return DEFAULT_HEBREW_MAP[root];
    }).filter(Boolean);
  };

  // 2. Logic: Advanced Morphology Stripper
  const PREFIXES = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש'];
  const SUFFIXES = ['ים', 'ות', 'ה', 'ו'];

  const generateMorphologicalVariants = (word: string): string[] => {
    const variants = new Set<string>();
    
    // 1. Raw Word
    variants.add(word);
    
    // 2. Recursive Prefix Stripping
    let current = word;
    for(let i=0; i<3; i++) { // Max 3 prefix layers
        const prefix = PREFIXES.find(p => current.startsWith(p));
        if (prefix && current.length > prefix.length + 1) { // Ensure root remains
            current = current.slice(prefix.length);
            variants.add(current);
        } else {
            break;
        }
    }

    // 3. Suffix Stripping (Applied to all Base variants found so far)
    const bases = Array.from(variants);
    bases.forEach(base => {
        SUFFIXES.forEach(suffix => {
            if (base.endsWith(suffix) && base.length > suffix.length + 1) {
                variants.add(base.slice(0, -suffix.length));
            }
        });
    });

    // Return as array, prioritizing original then shortest (root)
    return Array.from(variants);
  };

  // 3. The Multi-Source Engine (Waterfall)
  useEffect(() => {
    if (!selectedWord) {
      setDefinition('Waiting for selection...');
      setSource(null);
      return;
    }

    const fetchMultiSourceDefinition = async () => {
      setIsScanning(true);
      setDefinition('Analyzing Morphology...');
      setSource(null);

      const originalCleanWord = removeNikud(selectedWord.text);
      const variants = generateMorphologicalVariants(originalCleanWord);
      
      let foundDef = '';

      // --- TIER 1: HEAVY LOCAL CACHE (Instant) ---
      for (const v of variants) {
          if (CORE_DICTIONARY[v]) {
              setDefinition(CORE_DICTIONARY[v]);
              setSource('cache');
              setIsScanning(false);
              return; // Exit completely
          }
      }

      // --- TIER 2: SEFARIA API (Scroll) ---
      try {
        setDefinition('Accessing Sefaria Archives...');
        
        // Optimize: Don't check every variant against API, just the original and the most "root-like" (shortest)
        // to avoid rate limits or slow UI. But for Sefaria, a few calls are okay.
        // Let's try up to 3 variants: Original, Shortest, and maybe one in between.
        // Sorting variants by length might help prioritize roots.
        const sortedVariants = [...variants].sort((a, b) => a.length - b.length); 
        // We actually want to try Original first (most specific), then Shortest (root).
        const searchOrder = [originalCleanWord, ...sortedVariants.filter(v => v !== originalCleanWord)];

        for (const apiWord of searchOrder.slice(0, 4)) { // Limit to 4 checks
             if (apiWord.length < 2) continue;

             const response = await fetch(`https://www.sefaria.org/api/words/${encodeURIComponent(apiWord)}`);
             if (response.ok) {
                 const data: SefariaLexiconEntry[] = await response.json();
                 if (Array.isArray(data) && data.length > 0) {
                     // Check Content (BDB)
                     for (const entry of data) {
                        if (entry.content && entry.content.text) {
                            foundDef = entry.content.text;
                            break;
                        }
                     }
                     // Check Defs (Standard)
                     if (!foundDef) {
                        for (const entry of data) {
                            if (entry.defs && entry.defs.length > 0 && entry.defs[0].text) {
                                foundDef = entry.defs[0].text;
                                break;
                            }
                        }
                     }
                 }
             }
             if (foundDef) break;
        }

        if (foundDef) {
            foundDef = foundDef.replace(/<[^>]*>?/gm, ''); // Clean HTML
            setDefinition(foundDef);
            setSource('api');
            setIsScanning(false);
            return;
        }

      } catch (err) {
        console.warn("Sefaria lookup failed, trying backup...");
      }

      // --- TIER 3: WIKTIONARY API (Web) ---
      try {
        setDefinition('Consulting Global Wiki Grid...');
        
        // Wiktionary usually indexes the base lemma.
        // We should check the sorted variants (shortest first usually = lemma).
        const wikiVariants = [...variants].sort((a, b) => a.length - b.length);
        
        for (const wikiWord of wikiVariants.slice(0, 3)) {
             if (wikiWord.length < 2) continue;

             // Note: Wikimedia REST API supports CORS generally.
             const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(wikiWord)}`);
             
             if (response.ok) {
                 const data = await response.json();
                 // Structure: { "he": [ { "definitions": [ { "definition": "..." } ] } ] }
                 if (data.he && Array.isArray(data.he) && data.he.length > 0) {
                     const firstEntry = data.he[0];
                     if (firstEntry.definitions && firstEntry.definitions.length > 0) {
                         foundDef = firstEntry.definitions[0].definition;
                         break;
                     }
                 }
             }
             if (foundDef) break;
        }

        if (foundDef) {
            foundDef = foundDef.replace(/<[^>]*>?/gm, ''); // Clean HTML
            setDefinition(foundDef);
            setSource('wiki');
        } else {
            setDefinition('Root structure unclear. Analyze context.');
            setSource(null);
        }

      } catch (err) {
        console.error("Wiktionary lookup failed", err);
        setDefinition('Connection interruption. Unable to retrieve definition.');
        setSource(null);
      } finally {
        setIsScanning(false);
      }

    };

    fetchMultiSourceDefinition();

  }, [selectedWord]);
  
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
        link.download = `rhema-card-${selectedWord ? selectedWord.cleanText : 'export'}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (err) {
        console.error("Export failed", err);
      }
    } else {
      alert("Export module loading... try again in a second.");
    }
  };

  // Derived State
  const breakdown = selectedWord ? getLetterBreakdown(selectedWord.cleanText) : [];

  return (
    <div className="flex flex-col animate-fadeIn relative pb-8">
      
      {/* --- DECODER CARD (Top) --- */}
      <div className="decoder-card mb-6 p-6 rounded-2xl glass-panel border border-[var(--color-accent-primary)]/30 relative overflow-hidden group h-auto">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-secondary)] blur-[80px] opacity-10 pointer-events-none"></div>
         
         <div className="decoder-header flex flex-col gap-4 border-white/10 relative z-10">
             <div className="flex justify-between items-start w-full">
               <span id="decoder-ref" className="ref-badge text-[10px] uppercase tracking-widest bg-[var(--color-accent-primary)]/20 px-3 py-1 rounded text-[var(--color-accent-secondary)] border border-[var(--color-accent-primary)]/40">
                  {selectedWord ? `${bookName} ${chapter}:${selectedWord.verseIndex + 1}` : "--"}
               </span>
               
               <div className="flex items-center gap-3">
                   {source === 'cache' && (
                     <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30">
                        <BoltIcon className="w-3 h-3" />
                        <span>Instant</span>
                     </div>
                   )}
                   {source === 'api' && (
                     <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[var(--color-accent-secondary)] bg-[var(--color-accent-primary)]/20 px-2 py-0.5 rounded border border-[var(--color-accent-secondary)]/30">
                        <BookOpenIcon className="w-3 h-3" />
                        <span>Archive</span>
                     </div>
                   )}
                   {source === 'wiki' && (
                     <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-pink-400 bg-pink-900/20 px-2 py-0.5 rounded border border-pink-500/30">
                        <GlobeAmericasIcon className="w-3 h-3" />
                        <span>Web Grid</span>
                     </div>
                   )}

                   {isScanning && (
                    <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-accent-secondary)] animate-pulse">
                        <GlobeAltIcon className="w-3 h-3 animate-spin" /> Uplink
                    </span>
                   )}
               </div>
             </div>

             <h2 id="decoder-word-container" className="flex flex-col md:flex-row md:flex-wrap md:items-baseline gap-2 md:gap-6 mt-2">
                <span id="decoder-hebrew" className="hebrew-text text-5xl md:text-6xl text-[var(--color-accent-secondary)] drop-shadow-[0_0_15px_var(--color-accent-secondary)] leading-tight max-w-full break-words">
                    {selectedWord ? selectedWord.text : "--"}
                </span>
                
                {selectedWord && (
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[200px]">
                    <div className="flex items-baseline gap-3">
                        <span className="divider text-[#a0a8c0] font-light hidden md:inline select-none">//</span>
                        <span id="decoder-english" className={`english-text text-lg md:text-xl font-normal leading-relaxed break-words ${isScanning ? 'text-[var(--color-accent-secondary)] opacity-80' : 'text-white/90'}`}>
                        {definition}
                        </span>
                    </div>
                  </div>
                )}
             </h2>

             {!selectedWord && (
                <p className="text-[10px] text-[#a0a8c0] tech-font uppercase tracking-widest mt-2 animate-pulse">Awaiting Neural Link...</p>
             )}
         </div>
      </div>

      {selectedWord && (
        <>
            {/* Breakdown Grid (Pictographic Sequence) */}
            <div className="mb-8">
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
              {selectedWord ? selectedWord.cleanText : ''}
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