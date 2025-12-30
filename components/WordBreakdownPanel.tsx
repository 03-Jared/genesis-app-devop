
import React, { useState, useEffect } from 'react';
import { WordData, LetterDefinition, AiWordAnalysis } from '../types';
import { DEFAULT_HEBREW_MAP, SOFIT_MAP } from '../constants';
import { SwatchIcon, CpuChipIcon, ArrowRightIcon, InformationCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, Modality } from "@google/genai";

interface WordBreakdownPanelProps {
  selectedWord: (WordData & { aiDefinition?: AiWordAnalysis }) | null;
  journalNote: string;
  onNoteChange: (val: string) => void;
  bookName?: string;
  chapter?: number;
  verseScanStatus?: 'idle' | 'scanning' | 'complete' | 'error';
  onTriggerExport: () => void;
  onOpenDictionary?: (char?: string) => void;
  voiceGender: 'male' | 'female';
  enableTTS: boolean;
  isGuest?: boolean;
}

// --- Audio Helper Functions ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const WordBreakdownPanel: React.FC<WordBreakdownPanelProps> = ({ 
  selectedWord, 
  journalNote, 
  onNoteChange,
  bookName,
  chapter,
  verseScanStatus = 'idle',
  onTriggerExport,
  onOpenDictionary,
  voiceGender,
  enableTTS,
  isGuest = false
}) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Initialize Audio Cache if not exists
  if (!window.AUDIO_CACHE) {
      window.AUDIO_CACHE = {};
  }

  // --- TURBO AUDIO: Fetch & Play Logic ---
  const getAndPlayAudio = async (text: string, forcePlay: boolean) => {
      // STRICT GUEST CHECK: Disable audio completely for guests
      if (isGuest) return;

      if (!text || !enableTTS) return;

      const cacheKey = `${text}_${voiceGender}`;

      // 1. CHECK CACHE
      if (window.AUDIO_CACHE[cacheKey]) {
          if (forcePlay) {
              console.log("⚡ Turbo Mode: Playing from Cache");
              playFromBase64(window.AUDIO_CACHE[cacheKey]);
          }
          return;
      }

      if (!process.env.API_KEY) {
          if (forcePlay) alert("API Key missing. Cannot generate audio.");
          return;
      }

      // 2. FETCH (If not cached)
      try {
          if (forcePlay) setIsAudioPlaying(true);
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const voiceName = voiceGender === 'male' ? 'Puck' : 'Kore';

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: text }] }],
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                      voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: voiceName },
                      },
                  },
              },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

          if (base64Audio) {
              // 3. CACHE IT
              window.AUDIO_CACHE[cacheKey] = base64Audio;
              
              // 4. PLAY IT (If forced)
              if (forcePlay) {
                  await playFromBase64(base64Audio);
              }
          }
      } catch (error) {
          console.error("TTS Error:", error);
      } finally {
          if (forcePlay) setIsAudioPlaying(false);
      }
  };

  const playFromBase64 = async (base64: string) => {
      try {
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const outputNode = outputAudioContext.createGain();
        
        const pcmBytes = decodeBase64(base64);
        const audioBuffer = await decodeAudioData(
            pcmBytes,
            outputAudioContext,
            24000,
            1
        );
        
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputNode);
        outputNode.connect(outputAudioContext.destination);
        
        source.onended = () => {
            setIsAudioPlaying(false);
            outputAudioContext.close();
        };
        
        setIsAudioPlaying(true);
        source.start();
      } catch (e) {
          console.error("Audio Decode Error", e);
          setIsAudioPlaying(false);
      }
  };

  // --- EFFECT: Pre-fetch Audio on Word Change ---
  useEffect(() => {
      if (selectedWord?.cleanText && enableTTS && !isGuest) {
          // Silent fetch (background caching)
          getAndPlayAudio(selectedWord.cleanText, false);
      }
  }, [selectedWord?.cleanText, voiceGender, enableTTS, isGuest]);


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
  let transliteration = "";
  
  if (selectedWord) {
      if (hasData) {
          definition = selectedWord.aiDefinition?.definition || "";
          root = selectedWord.aiDefinition?.root || "";
          morphology = selectedWord.aiDefinition?.morphology || "Root analysis complete";
          transliteration = selectedWord.aiDefinition?.transliteration || "";
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
    <div className="flex flex-col animate-fadeIn relative pb-24">
      <div className="text-[10px] tech-font text-[var(--color-accent-secondary)] uppercase tracking-widest mb-4 text-center">Morphological Analysis</div>

      <div className="decoder-card mb-6 p-6 rounded-2xl glass-panel border border-[var(--color-accent-primary)]/30 relative overflow-hidden group h-auto">
         <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-secondary)] blur-[80px] opacity-10 pointer-events-none"></div>
         <div className="decoder-header flex flex-col gap-4 relative z-10">
             <div className="flex justify-between items-start w-full">
               <span className="verse-badge text-[10px] uppercase tracking-widest bg-[var(--color-accent-primary)]/20 px-3 py-1 rounded text-[var(--color-accent-secondary)] border border-[var(--color-accent-primary)]/40">
                  {selectedWord ? `${bookName} ${chapter}:${selectedWord.verseIndex + 1}` : "--"}
               </span>
               {hasData && !isGuest && (
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
                <div className="flex flex-col items-center gap-1 relative">
                    <div className="flex items-center gap-4 relative">
                        <span className="hebrew-text text-5xl md:text-6xl text-[var(--color-accent-secondary)] drop-shadow-[0_0_15px_var(--color-accent-secondary)] leading-tight max-w-full break-words">
                            {selectedWord ? selectedWord.text : "--"}
                        </span>
                        
                        {/* Audio Button - Floating Right (HIDDEN FOR GUESTS) */}
                        {selectedWord && enableTTS && !isGuest && (
                            <button 
                                onClick={() => getAndPlayAudio(selectedWord.cleanText, true)}
                                disabled={isAudioPlaying}
                                className={`absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border transition-all flex items-center justify-center group ${isAudioPlaying ? 'bg-[var(--color-accent-secondary)] border-[var(--color-accent-secondary)] animate-pulse' : 'bg-white/5 border-white/20 hover:border-[var(--color-accent-secondary)] hover:bg-[var(--color-accent-secondary)]/20 hover:shadow-[0_0_15px_var(--color-accent-secondary)] text-white hover:text-white'}`}
                                title="Listen to Hebrew Pronunciation"
                            >
                                <SpeakerWaveIcon className={`w-5 h-5 ${isAudioPlaying ? 'text-[#050714]' : 'group-hover:scale-110 transition-transform'}`} />
                            </button>
                        )}
                    </div>
                    
                    {/* Transliteration Styling */}
                    {transliteration && (
                         <div className="mt-3 flex items-center justify-center">
                            <span className="px-3 py-1 bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30 rounded-full text-[10px] md:text-xs text-[var(--color-accent-secondary)] tech-font uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(0,210,255,0.1)]">
                                {transliteration}
                            </span>
                        </div>
                    )}
                </div>
                
                {selectedWord && (
                  <div className="flex flex-col items-start gap-2 flex-1 min-w-[200px] mt-4 md:mt-0">
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
                </div>
                
                {/* Pictographic Tiles */}
                <div className="flex flex-row items-start justify-start gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {breakdown.map((l, i) => {
                      // GUEST RESTRICTION LOGIC:
                      // Aleph ('א') is fully visible.
                      // All other letters: Image dimmed/blurred, Meaning text blurred, Button disabled.
                      const isAleph = l.char === 'א';
                      const isRestricted = isGuest && !isAleph;

                      return (
                      <React.Fragment key={i}>
                          <div className="flex flex-col items-center gap-3 shrink-0 group min-w-[90px] relative">
                               <div className="w-20 h-20 flex items-center justify-center bg-[#090a20] border border-[var(--color-accent-primary)]/30 rounded-xl relative shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:border-[var(--color-accent-secondary)] group-hover:shadow-[0_0_15px_var(--color-accent-primary)] transition-all duration-300">
                                    <div className="absolute inset-0 bg-[var(--color-accent-primary)]/5 rounded-xl"></div>
                                    <span className={`text-4xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transform group-hover:scale-110 transition-transform duration-300 z-10 ${isRestricted ? 'opacity-25 blur-sm brightness-[0.2] grayscale' : ''}`}>
                                        {l.emoji}
                                    </span>
                                    
                                    {/* Specific 'i' icon for this letter */}
                                    <button 
                                      onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (isRestricted) return; // Prevent click for guests on non-Aleph
                                          onOpenDictionary && onOpenDictionary(l.char); 
                                      }}
                                      className={`absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-[var(--color-accent-secondary)] border border-white/20 hover:border-white text-white/70 hover:text-white flex items-center justify-center transition-all duration-300 z-20 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100 ${isRestricted ? 'cursor-not-allowed hover:bg-black/60 hover:border-white/20 hover:text-white/70' : ''}`}
                                      title={isRestricted ? "Login to unlock meaning" : `See meaning of ${l.name}`}
                                    >
                                      <InformationCircleIcon className="w-3.5 h-3.5" />
                                    </button>
                               </div>
                               <div className="text-center flex flex-col gap-1">
                                  <div className="text-[10px] md:text-[11px] font-bold text-white uppercase tracking-wider font-mono whitespace-nowrap">
                                      <span className="text-[var(--color-accent-secondary)]">{l.char}</span> - {l.name.toUpperCase()}
                                  </div>
                                  <div className={`text-[8px] md:text-[9px] text-[#a0a8c0] uppercase tracking-widest opacity-80 tech-font px-2 bg-white/5 rounded py-0.5 whitespace-nowrap ${isRestricted ? 'blur-sm select-none' : ''}`}>
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
                  )})}
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
                    readOnly={isGuest}
                    className={`w-full bg-[#090a20]/40 border border-white/10 rounded-lg p-3 text-sm text-[#a0a8c0] focus:border-[var(--color-accent-secondary)] outline-none resize-none h-24 ${isGuest ? 'opacity-50 cursor-default select-none' : ''}`}
                    placeholder="Capture your spiritual insights..."
                />
            </div>
        </>
      )}

      {/* EXPORT BUTTON - Visible for Everyone, Disabled for Guests */}
      <div className="flex flex-col gap-3 mt-auto">
          <button 
            onClick={onTriggerExport}
            disabled={!selectedWord || isGuest}
            className={`w-full electric-gradient text-white py-5 rounded-2xl text-xs uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${isGuest ? 'grayscale opacity-40 hover:none' : ''}`}
            title={isGuest ? "Login required to access Design Studio" : "Create Export Card"}
          >
            <SwatchIcon className="w-5 h-5" />
            Design Card {isGuest && '(Locked)'}
          </button>
      </div>
    </div>
  );
};

export default WordBreakdownPanel;
