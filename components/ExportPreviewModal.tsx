import React, { useState, useRef, useEffect } from 'react';
import { WordData, AiWordAnalysis, LetterDefinition } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP } from '../constants';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ExportPreviewModalProps {
  selectedWord: WordData & { aiDefinition?: AiWordAnalysis };
  bookName: string;
  chapter: number;
  onClose: () => void;
  journalNote: string;
}

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ selectedWord, bookName, chapter, onClose, journalNote }) => {
  const [toggles, setToggles] = useState({
    verse: true,
    hebrew: true,
    morph: true,
    picto: true,
    personal: true,
    guided: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force scroll to top when modal opens
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  const analysis = selectedWord.aiDefinition;
  
  const getCleanHebrew = (text: string) => text.replace(/[^\u05D0-\u05EA]/g, "");
  
  const breakdown: LetterDefinition[] = getCleanHebrew(selectedWord.text).split('').map(char => {
    const root = SOFIT_MAP[char] || char;
    return DEFAULT_HEBREW_MAP[root];
  }).filter(Boolean);

  const handleDownload = async () => {
    if (!previewRef.current || !window.html2canvas) return;
    setIsGenerating(true);
    try {
      const canvas = await window.html2canvas(previewRef.current, {
        backgroundColor: '#090a18',
        scale: 3,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `rhema-card-${getCleanHebrew(selectedWord.text)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="designer-overlay">
      <div className="designer-container animate-fadeIn">
        
        {/* Left: Controls */}
        <div className="designer-controls">
          <div className="mb-8 text-center md:text-left">
            <h3 className="cinzel-font text-white text-lg tracking-widest mb-1">Card Studio</h3>
            <p className="text-[10px] text-white/40 tech-font uppercase tracking-widest">Configuration Engine</p>
          </div>

          <div className="flex-grow space-y-8 overflow-y-auto pr-2 scrollbar-hide">
            <div>
              <h4 className="text-[10px] text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest mb-4">Core Elements</h4>
              <ul className="text-[11px] text-white/50 space-y-2 tech-font">
                <li>• GENESIS SUITE BRANDING</li>
                <li>• PRIMARY NEURAL COLORSET</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest mb-6">Optional Modules</h4>
              
              {[
                { id: 'verse', label: 'Verse Reference' },
                { id: 'hebrew', label: 'Hebrew Word' },
                { id: 'morph', label: 'Morphology & Meaning' },
                { id: 'picto', label: 'Pictographic Flow' },
                { id: 'personal', label: 'Personal Reflection' },
                { id: 'guided', label: 'Spiritual Insight' }
              ].map(t => (
                <label key={t.id} className="slick-toggle">
                  <input 
                    type="checkbox" 
                    checked={toggles[t.id as keyof typeof toggles]} 
                    onChange={() => setToggles(prev => ({...prev, [t.id]: !prev[t.id as keyof typeof toggles]}))} 
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label tech-font">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button 
              onClick={handleDownload}
              disabled={isGenerating}
              className="electric-gradient py-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              {isGenerating ? 'Generating PNG...' : 'Download Card'}
            </button>
            <button onClick={onClose} className="text-[10px] text-white/30 hover:text-white uppercase tracking-widest py-2 transition-colors">
              Cancel & Exit
            </button>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="designer-preview-area" ref={scrollContainerRef}>
          <div ref={previewRef} className="preview-card-wrap relative shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
             <div className="absolute top-6 left-8 text-[9px] tech-font text-[var(--color-accent-secondary)] tracking-[0.3em] opacity-50 uppercase">
                Genesis Reveal // Neural Export
             </div>

             {toggles.verse && (
                <div className="flex justify-center mb-6 pt-4">
                  <span className="verse-badge">{bookName.toUpperCase()} {chapter}:{selectedWord.verseIndex + 1}</span>
                </div>
             )}

             {toggles.hebrew && (
                <h1 className="hebrew-focus-word text-white" style={{ fontSize: '4rem' }}>
                  {selectedWord.text}
                </h1>
             )}

             {toggles.morph && (
                <div className="mb-6">
                  <p className="text-[#888] tech-font text-[10px] uppercase tracking-widest mb-1">Analysis</p>
                  <p className="text-white/80 text-sm mb-1">{analysis?.morphology || "Morphology Data"}</p>
                  <p className="text-white text-lg italic">"{analysis?.definition || "Translation"}"</p>
                  <div className="section-divider"></div>
                </div>
             )}

             {toggles.picto && (
                <div className="mb-6">
                  <h3 className="section-title">Pictographic Flow</h3>
                  <div className="flex flex-row flex-wrap justify-center items-start gap-3">
                    {breakdown.map((l, i) => (
                      <React.Fragment key={i}>
                        <div className="picto-tile-wrapper">
                          <div className="picto-tile active-tile" style={{ width: '65px', height: '65px' }}>
                            <span className="text-2xl">{l.emoji}</span>
                          </div>
                          <div className="picto-info">
                            <span className="picto-letter text-sm">{l.char}</span>
                            <span className="picto-meaning" style={{ fontSize: '0.5rem' }}>{l.pictograph}</span>
                          </div>
                        </div>
                        {i < breakdown.length - 1 && (
                          <span className="picto-arrow" style={{ height: '65px', fontSize: '0.8rem' }}>→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
             )}

             {toggles.personal && journalNote && (
                <div className="mb-6">
                   <div className="section-divider"></div>
                   <h3 className="section-title">Personal Reflection</h3>
                   <div className="p-4 bg-white/5 rounded-xl text-left border border-white/5">
                      <p className="text-white/80 text-xs italic leading-relaxed">
                        {journalNote}
                      </p>
                   </div>
                </div>
             )}

             {toggles.guided && (
                <div>
                   <div className="section-divider"></div>
                   <h3 className="section-title">Spiritual Insight</h3>
                   <div className="reflection-card text-left bg-white/5 border-l-2 border-[var(--color-accent-secondary)] rounded-r-lg p-5">
                      <span className="absolute top-2 right-4 text-xl opacity-20">✨</span>
                      <p className="reflection-text text-white/90 leading-relaxed text-sm italic">
                        {analysis?.reflection || "Awaiting neural analysis for deeper spiritual context..."}
                      </p>
                   </div>
                </div>
             )}

             <div className="mt-12 text-[9px] tech-font text-white/20 uppercase tracking-[0.5em]">
                Decoded via Gemini v3.0
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExportPreviewModal;