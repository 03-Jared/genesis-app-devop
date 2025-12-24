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

const MOODS = [
  { value: "Mystical", label: "Mystical & Glowing" },
  { value: "Dramatic", label: "Dramatic & Intense" },
  { value: "Peaceful", label: "Peaceful & Calm" },
  { value: "Ancient", label: "Ancient & Historical" },
  { value: "Dark", label: "Dark & Mysterious" }
];

const ELEMENTS = [
  { value: "Golden Particles", label: "Golden Dust" },
  { value: "Blue Water", label: "Deep Ocean Water" },
  { value: "Cracked Stone", label: "Ancient Stone Tablet" },
  { value: "Nebula Clouds", label: "Cosmic Nebula" },
  { value: "Olive Wood", label: "Olive Tree Wood" },
  { value: "Fire", label: "Burning Fire" },
  { value: "Parchment", label: "Aged Parchment" }
];

const STYLES = [
  { value: "3D Render", label: "3D Realistic" },
  { value: "Oil Painting", label: "Oil Painting" },
  { value: "Digital Art", label: "Digital Art" },
  { value: "Cinematic", label: "Cinematic Photography" }
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
  
  // Custom Color State
  const [textColor, setTextColor] = useState('#ffffff');
  const [arrowColor, setArrowColor] = useState('rgba(255, 255, 255, 0.1)');
  const [glowColor, setGlowColor] = useState('#bd00ff');
  const [showGlow, setShowGlow] = useState(true);

  const [customSettings, setCustomSettings] = useState({
      mood: 'Mystical',
      element: 'Golden Particles',
      style: '3D Render'
  });
  
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

  const generateCustomBackground = async () => {
    if (!process.env.API_KEY) {
        alert("API Key missing");
        return;
    }
    setIsAiLoading(true);
    setAiFeedback("Consulting Neural Network...");
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        // Master Prompt
        const masterPrompt = `
        A high-quality background texture for a spiritual app.
        Subject: ${customSettings.mood} ${customSettings.element}.
        Style: ${customSettings.style}.
        Details: Deep rich colors, cinematic lighting, 8k resolution, highly realistic texture.
        Composition: Darker exposure around the edges (vignette), center area clear for text overlay.
        No text, no letters, just texture and atmosphere.
        `;
        
        console.log("Generating with prompt:", masterPrompt);

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: masterPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '3:4' 
            }
        });

        const base64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64) {
            setBackground(`url(data:image/jpeg;base64,${base64})`);
            setAiFeedback("Background Materialized");
            setTimeout(() => setAiFeedback(""), 3000);
        } else {
            throw new Error("No image returned");
        }
    } catch (e: any) {
        console.error("AI BG Gen failed", e);
        
        // --- FALLBACK LOGIC ---
        // If image generation fails (e.g. 429 quota), use Text-to-CSS generation
        setAiFeedback("Image quota limits. Switching to CSS generation...");
        
        try {
            const cssPrompt = `
                Generate a CSS background property string (e.g., 'linear-gradient(...)') that captures this mood:
                Mood: ${customSettings.mood}
                Element: ${customSettings.element}
                Style: ${customSettings.style}
                
                Constraints:
                1. Must be dark enough for white text visibility.
                2. Use rich, deep colors.
                3. Return ONLY the CSS value string. Do not include 'background: ' or ';'.
            `;

            const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: cssPrompt
            });

            let cssValue = fallbackResponse.text?.trim();
            if (cssValue) {
                // Cleanup markdown if present
                cssValue = cssValue.replace(/^`+|`+$/g, '').replace(/^css/i, '').trim();
                if (cssValue.endsWith(';')) cssValue = cssValue.slice(0, -1);
                
                setBackground(cssValue);
                setAiFeedback("Theme Generated (CSS Fallback)");
                setTimeout(() => setAiFeedback(""), 3000);
            } else {
                throw new Error("No CSS generated");
            }
        } catch (fallbackError) {
             console.error("Fallback failed", fallbackError);
             setAiFeedback("System Overload. Applying Preset.");
             // Ultimate hardcoded fallback
             const map: Record<string, string> = {
                 "Mystical": "linear-gradient(to top right, #3a1c71, #d76d77, #ffaf7b)",
                 "Dramatic": "linear-gradient(to bottom, #000000, #434343)",
                 "Peaceful": "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
                 "Ancient": "linear-gradient(135deg, #3E2D23 0%, #1A120B 100%)",
                 "Dark": "linear-gradient(160deg, #1a1a2e 0%, #000000 100%)"
             };
             setBackground(map[customSettings.mood] || PRESETS[0].val);
             setTimeout(() => setAiFeedback(""), 3000);
        }
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
            
            {/* Visual Palette Section */}
            <div className="mb-6">
                <h4 className="text-[10px] text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest mb-4">Visual Palette</h4>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/60 tech-font">Text Color</span>
                        <div className="relative overflow-hidden w-8 h-8 rounded-full border border-white/20">
                            <input 
                                type="color" 
                                value={textColor} 
                                onChange={e => setTextColor(e.target.value)} 
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer" 
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/60 tech-font">Flow Arrows</span>
                        <div className="relative overflow-hidden w-8 h-8 rounded-full border border-white/20">
                             <input 
                                type="color" 
                                value={arrowColor} 
                                onChange={e => setArrowColor(e.target.value)} 
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer" 
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <label className="flex items-center cursor-pointer">
                               <div className="relative">
                                   <input type="checkbox" className="sr-only" checked={showGlow} onChange={e => setShowGlow(e.target.checked)} />
                                   <div className={`block w-8 h-5 rounded-full transition-colors ${showGlow ? 'bg-[var(--color-accent-secondary)]' : 'bg-white/10'}`}></div>
                                   <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showGlow ? 'transform translate-x-3' : ''}`}></div>
                               </div>
                           </label>
                           <span className="text-[11px] text-white/60 tech-font">Tile Glow</span>
                        </div>
                        
                        {showGlow && (
                            <div className="relative overflow-hidden w-8 h-8 rounded-full border border-white/20 animate-fadeIn">
                                <input 
                                    type="color" 
                                    value={glowColor} 
                                    onChange={e => setGlowColor(e.target.value)} 
                                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer" 
                                />
                            </div>
                        )}
                    </div>
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

                <span className="control-sublabel mt-4">Custom AI Theme</span>
                <div className="ai-prompt-builder">
                    <select 
                        className="slick-select"
                        value={customSettings.mood} 
                        onChange={(e) => setCustomSettings({...customSettings, mood: e.target.value})}
                    >
                        {MOODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>

                    <select 
                        className="slick-select"
                        value={customSettings.element} 
                        onChange={(e) => setCustomSettings({...customSettings, element: e.target.value})}
                    >
                        {ELEMENTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>

                    <select 
                        className="slick-select"
                        value={customSettings.style} 
                        onChange={(e) => setCustomSettings({...customSettings, style: e.target.value})}
                    >
                        {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    <button 
                        onClick={generateCustomBackground}
                        disabled={isAiLoading}
                        className="ai-gen-btn mt-2"
                    >
                        {isAiLoading ? <span className="animate-spin">⏳</span> : <span>✨</span>}
                        {isAiLoading ? 'Dreaming...' : 'Generate Theme'}
                    </button>
                    {aiFeedback && <p className="text-[9px] text-center text-white/50 animate-pulse mt-2">{aiFeedback}</p>}
                </div>
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
                 transition: 'background 0.5s ease',
                 color: textColor
             }}
          >
             <div className="absolute inset-0 bg-black/10 pointer-events-none rounded-[32px]"></div>
             
             {/* Layout Fix: Moved header to relative positioning to prevent overlap */}
             <div className="w-full flex justify-between items-start mb-2 relative z-10 px-2 pt-2">
                 <div className="text-[9px] tech-font text-[var(--color-accent-secondary)] tracking-[0.3em] opacity-50 uppercase">
                    Genesis Reveal // Neural Export
                 </div>
             </div>

             {toggles.verse && (
                <div className="flex justify-center mb-6 mt-2 relative z-10">
                  <span className="verse-badge backdrop-blur-sm" style={{ color: textColor === '#ffffff' ? 'var(--color-accent-secondary)' : textColor, borderColor: textColor === '#ffffff' ? 'var(--color-accent-secondary)' : textColor }}>
                    {bookName.toUpperCase()} {chapter}:{selectedWord.verseIndex + 1}
                  </span>
                </div>
             )}

             {toggles.hebrew && (
                <h1 className="hebrew-focus-word relative z-10" style={{ fontSize: '4rem', color: textColor }}>
                  {selectedWord.text}
                </h1>
             )}

             {toggles.morph && (
                <div className="mb-6 relative z-10">
                  <p className="tech-font text-[10px] uppercase tracking-widest mb-1 opacity-60">Analysis</p>
                  <p className="text-sm mb-1 opacity-80">{analysis?.morphology || "Morphology Data"}</p>
                  <p className="text-lg italic" style={{ color: textColor }}>"{analysis?.definition || "Translation"}"</p>
                  <div className="section-divider"></div>
                </div>
             )}

             {toggles.picto && (
                <div className="mb-6 relative z-10">
                  <h3 className="section-title" style={{ color: textColor, opacity: 0.5 }}>Pictographic Flow</h3>
                  <div className="flex flex-row flex-wrap justify-center items-start gap-3">
                    {breakdown.map((l, i) => (
                      <React.Fragment key={i}>
                        <div className="picto-tile-wrapper">
                          <div 
                            className="picto-tile backdrop-blur-md bg-black/40" 
                            style={{ 
                                width: '65px', 
                                height: '65px',
                                borderColor: showGlow ? glowColor : 'rgba(255,255,255,0.1)',
                                boxShadow: showGlow ? `0 0 20px ${glowColor}66` : 'none',
                                color: textColor
                            }}
                          >
                            <span className="text-2xl">{l.emoji}</span>
                          </div>
                          <div className="picto-info">
                            <span className="picto-letter text-sm" style={{ color: textColor }}>{l.char}</span>
                            <span className="picto-meaning" style={{ fontSize: '0.5rem', opacity: 0.7 }}>{l.pictograph}</span>
                          </div>
                        </div>
                        {i < breakdown.length - 1 && (
                          <span 
                            className="picto-arrow flex items-center justify-center" 
                            style={{ height: '65px', fontSize: '0.8rem', color: arrowColor }}
                          >
                              →
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
             )}

             {toggles.personal && journalNote && (
                <div className="mb-6 relative z-10">
                   <div className="section-divider"></div>
                   <h3 className="section-title" style={{ color: textColor, opacity: 0.5 }}>Personal Reflection</h3>
                   <div className="p-4 bg-black/40 backdrop-blur-md rounded-xl text-left border border-white/5">
                      <p className="text-xs italic leading-relaxed" style={{ color: textColor, opacity: 0.9 }}>
                        {journalNote}
                      </p>
                   </div>
                </div>
             )}

             {toggles.guided && (
                <div className="relative z-10">
                   <div className="section-divider"></div>
                   <h3 className="section-title" style={{ color: textColor, opacity: 0.5 }}>Spiritual Insight</h3>
                   <div className="reflection-card text-left bg-black/40 backdrop-blur-md border-l-2 rounded-r-lg p-5" style={{ borderColor: 'var(--color-accent-secondary)' }}>
                      <span className="absolute top-2 right-4 text-xl opacity-20">✨</span>
                      <p className="reflection-text leading-relaxed text-sm italic" style={{ color: textColor, opacity: 0.9 }}>
                        {analysis?.reflection || "Awaiting neural analysis for deeper spiritual context..."}
                      </p>
                   </div>
                </div>
             )}

             <div className="mt-12 text-[9px] tech-font uppercase tracking-[0.5em] relative z-10 opacity-30">
                Decoded via Gemini v3.0
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExportPreviewModal;