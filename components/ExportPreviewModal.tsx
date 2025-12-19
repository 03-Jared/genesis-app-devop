import React, { useState, useRef, useEffect } from 'react';
import { WordData, AiWordAnalysis, LetterDefinition, SavedCard } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP } from '../constants';
import { ArrowDownTrayIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI } from "@google/genai";

interface ExportPreviewModalProps {
  selectedWord: WordData & { aiDefinition?: AiWordAnalysis };
  bookName: string;
  chapter: number;
  onClose: () => void;
  journalNote: string;
  onSaveCard?: (card: SavedCard) => void;
}

const PRESETS = [
    { type: 'solid', val: '#1a1a2e', title: 'Classic Dark' },
    { type: 'solid', val: '#0f2027', title: 'Deep Teal' },
    { type: 'solid', val: '#2c003e', title: 'Royal Purple' },
    { type: 'solid', val: '#000000', title: 'Pure Black' },
    { type: 'grad', val: 'linear-gradient(160deg, #1a1a2e 0%, #121225 100%)', title: 'Default Gradient' },
    { type: 'grad', val: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)', title: 'Ocean Calm' },
    { type: 'grad', val: 'linear-gradient(to top right, #3a1c71, #d76d77, #ffaf7b)', title: 'Sunset Glow' },
    { type: 'grad', val: 'linear-gradient(to bottom, #000000, #434343)', title: 'Monochrome' },
];

const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ selectedWord, bookName, chapter, onClose, journalNote, onSaveCard }) => {
  const [toggles, setToggles] = useState({
    verse: true,
    hebrew: true,
    morph: true,
    picto: true,
    personal: true,
    guided: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [background, setBackground] = useState("linear-gradient(160deg, #101228 0%, #080815 100%)");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  
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

  const handleSaveToCodex = () => {
    if (onSaveCard && !hasSaved) {
        const newCard: SavedCard = {
            id: crypto.randomUUID(),
            book: bookName,
            chapter: chapter,
            verse: selectedWord.verseIndex,
            wordText: selectedWord.text,
            wordData: selectedWord,
            note: journalNote,
            timestamp: Date.now()
        };
        onSaveCard(newCard);
        setHasSaved(true);
        setTimeout(() => setHasSaved(false), 2000); // Reset for visual feedback if needed
    }
  };

  const handlePresetClick = (val: string) => {
    setBackground(val);
  };

  const handleAiBackground = async () => {
    if (!process.env.API_KEY) {
        alert("API Key missing");
        return;
    }
    setIsAiLoading(true);
    setAiFeedback("Consulting Neural Network...");
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Abstract, spiritual background texture. Theme: Biblical Hebrew concept of '${selectedWord.text}' meaning '${analysis?.definition || 'spirituality'}'. Context: ${bookName} ${chapter}. Mood: Mystical, ancient, glowing, deep dark colors to support white text, cosmic, nebula. Style: High quality digital art, ethereal, abstract, no text.`;
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '3:4' // Portrait for card
            }
        });

        const base64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64) {
            setBackground(`url(data:image/jpeg;base64,${base64})`);
            setAiFeedback("Background Materialized");
            setTimeout(() => setAiFeedback(""), 3000);
        } else {
            setAiFeedback("Generation failed.");
        }
    } catch (e) {
        console.error("AI BG Gen failed", e);
        setAiFeedback("Neural Link Error");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="designer-overlay">
      <div className="designer-container animate-fadeIn">
        
        {/* Left: Controls */}
        <div className="designer-controls">
          <div className="mb-6 text-center md:text-left">
            <h3 className="cinzel-font text-white text-lg tracking-widest mb-1">Card Studio</h3>
            <p className="text-[10px] text-white/40 tech-font uppercase tracking-widest">Configuration Engine</p>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 scrollbar-hide">
            <div className="mb-6">
              <h4 className="text-[10px] text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest mb-4">Core Elements</h4>
              <ul className="text-[11px] text-white/50 space-y-2 tech-font mb-4">
                <li>• GENESIS SUITE BRANDING</li>
              </ul>
              <div className="space-y-3">
                 {[
                    { id: 'verse', label: 'Verse Reference' },
                    { id: 'hebrew', label: 'Hebrew Word' },
                    { id: 'morph', label: 'Morphology & Meaning' },
                    { id: 'picto', label: 'Pictographic Flow' },
                    { id: 'personal', label: 'Personal Reflection' },
                    { id: 'guided', label: 'Spiritual Insight' }
                  ].map(t => (
                    <label key={t.id} className="slick-toggle mb-2">
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

            <div className="section-divider-horizontal"></div>

            <div className="mb-6">
                <h4 className="text-[10px] text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest mb-4">Background Style</h4>
                
                <span className="control-sublabel">Presets</span>
                <div className="bg-swatch-grid">
                    {PRESETS.map((preset, idx) => (
                        <button 
                            key={idx}
                            className={`bg-swatch ${background === preset.val ? 'active-swatch' : ''}`}
                            style={{ background: preset.val }}
                            onClick={() => handlePresetClick(preset.val)}
                            title={preset.title}
                        />
                    ))}
                </div>

                <span className="control-sublabel mt-4">AI Themes</span>
                <button 
                    onClick={handleAiBackground}
                    disabled={isAiLoading}
                    className="ai-gen-btn"
                >
                    {isAiLoading ? <span className="animate-spin">⏳</span> : <span>✨</span>}
                    {isAiLoading ? 'Dreaming...' : 'Generate Theme'}
                </button>
                {aiFeedback && <p className="text-[9px] text-center text-white/50 animate-pulse">{aiFeedback}</p>}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-4 border-t border-white/5">
            <div className="grid grid-cols-2 gap-3">
                <button 
                onClick={handleSaveToCodex}
                disabled={hasSaved}
                className={`py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider border ${hasSaved ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                >
                <BookmarkIcon className="w-5 h-5" />
                {hasSaved ? 'Saved' : 'Save'}
                </button>
                <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="electric-gradient py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 text-xs font-bold uppercase tracking-wider text-white"
                >
                <ArrowDownTrayIcon className="w-5 h-5" />
                {isGenerating ? '...' : 'Download'}
                </button>
            </div>
            <button onClick={onClose} className="text-[10px] text-white/30 hover:text-white uppercase tracking-widest py-2 transition-colors">
              Cancel & Exit
            </button>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="designer-preview-area" ref={scrollContainerRef}>
          <div 
             ref={previewRef} 
             className="preview-card-wrap relative shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
             style={{ 
                 background: background,
                 backgroundSize: 'cover', 
                 backgroundPosition: 'center',
                 transition: 'background 0.5s ease'
             }}
          >
             <div className="absolute inset-0 bg-black/10 pointer-events-none rounded-[32px]"></div>
             
             <div className="absolute top-6 left-8 text-[9px] tech-font text-[var(--color-accent-secondary)] tracking-[0.3em] opacity-50 uppercase relative z-10">
                Genesis Reveal // Neural Export
             </div>

             {toggles.verse && (
                <div className="flex justify-center mb-6 pt-4 relative z-10">
                  <span className="verse-badge backdrop-blur-sm">{bookName.toUpperCase()} {chapter}:{selectedWord.verseIndex + 1}</span>
                </div>
             )}

             {toggles.hebrew && (
                <h1 className="hebrew-focus-word text-white relative z-10" style={{ fontSize: '4rem' }}>
                  {selectedWord.text}
                </h1>
             )}

             {toggles.morph && (
                <div className="mb-6 relative z-10">
                  <p className="text-[#888] tech-font text-[10px] uppercase tracking-widest mb-1">Analysis</p>
                  <p className="text-white/80 text-sm mb-1">{analysis?.morphology || "Morphology Data"}</p>
                  <p className="text-white text-lg italic">"{analysis?.definition || "Translation"}"</p>
                  <div className="section-divider"></div>
                </div>
             )}

             {toggles.picto && (
                <div className="mb-6 relative z-10">
                  <h3 className="section-title">Pictographic Flow</h3>
                  <div className="flex flex-row flex-wrap justify-center items-start gap-3">
                    {breakdown.map((l, i) => (
                      <React.Fragment key={i}>
                        <div className="picto-tile-wrapper">
                          <div className="picto-tile active-tile backdrop-blur-md bg-black/40" style={{ width: '65px', height: '65px' }}>
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
                <div className="mb-6 relative z-10">
                   <div className="section-divider"></div>
                   <h3 className="section-title">Personal Reflection</h3>
                   <div className="p-4 bg-black/40 backdrop-blur-md rounded-xl text-left border border-white/5">
                      <p className="text-white/80 text-xs italic leading-relaxed">
                        {journalNote}
                      </p>
                   </div>
                </div>
             )}

             {toggles.guided && (
                <div className="relative z-10">
                   <div className="section-divider"></div>
                   <h3 className="section-title">Spiritual Insight</h3>
                   <div className="reflection-card text-left bg-black/40 backdrop-blur-md border-l-2 border-[var(--color-accent-secondary)] rounded-r-lg p-5">
                      <span className="absolute top-2 right-4 text-xl opacity-20">✨</span>
                      <p className="reflection-text text-white/90 leading-relaxed text-sm italic">
                        {analysis?.reflection || "Awaiting neural analysis for deeper spiritual context..."}
                      </p>
                   </div>
                </div>
             )}

             <div className="mt-12 text-[9px] tech-font text-white/20 uppercase tracking-[0.5em] relative z-10">
                Decoded via Gemini v3.0
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExportPreviewModal;