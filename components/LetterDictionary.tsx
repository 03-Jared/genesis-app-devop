
import React, { useEffect, useState } from 'react';
import { LETTER_DETAILS, LETTER_AUDIO_MAP } from '../constants';
import { ArrowLeftIcon, SpeakerWaveIcon, LockClosedIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { GoogleGenAI, Modality } from "@google/genai";

interface LetterDictionaryProps {
  onClose: () => void;
  targetChar?: string | null;
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

const LetterDictionary: React.FC<LetterDictionaryProps> = ({ onClose, targetChar, voiceGender, enableTTS, isGuest = false }) => {
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);

  // Initialize Global Cache if missing
  if (!window.AUDIO_CACHE) {
      window.AUDIO_CACHE = {};
  }

  // --- TURBO AUDIO: Fetch & Play Logic ---
  const getAndPlayAudio = async (text: string, forcePlay: boolean) => {
      // STRICT GUEST CHECK
      if (isGuest) return;

      if (!text || !enableTTS) return;
      
      const cacheKey = `${text}_${voiceGender}`;

      // 1. CHECK CACHE
      if (window.AUDIO_CACHE[cacheKey]) {
          if (forcePlay) {
              console.log("⚡ Dictionary Turbo: Playing from Cache");
              playFromBase64(window.AUDIO_CACHE[cacheKey], text);
          }
          return;
      }

      if (!process.env.API_KEY) {
          if (forcePlay) alert("API Key missing. Cannot generate audio.");
          return;
      }

      // 2. FETCH (Silent Background or Active)
      try {
          if (forcePlay) setPlayingLetter(text); // Using text as ID temporarily

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
                  await playFromBase64(base64Audio, text);
              }
          }
      } catch (error) {
          console.error("TTS Error:", error);
      } finally {
          if (forcePlay) setPlayingLetter(null);
      }
  };

  const playFromBase64 = async (base64: string, id: string) => {
      try {
        setPlayingLetter(id);
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
            setPlayingLetter(null);
            outputAudioContext.close();
        };
        
        source.start();
      } catch (e) {
          console.error("Audio Decode Error", e);
          setPlayingLetter(null);
      }
  };

  // --- BATCH PRE-LOADER ---
  useEffect(() => {
    if (!enableTTS || isGuest) return;
    
    // Secretly download audio for all 22 letters instantly
    console.log("🚀 Starting Dictionary Turbo Pre-load...");
    LETTER_DETAILS.forEach(letter => {
        const audioTerm = LETTER_AUDIO_MAP[letter.char] || letter.name;
        getAndPlayAudio(audioTerm, false); // Fetch silently
    });
  }, [voiceGender, enableTTS, isGuest]); // Re-fetch if gender or enable state changes

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    if (targetChar) {
        setTimeout(() => {
            const el = document.getElementById(`dict-letter-${targetChar}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.style.borderColor = 'var(--color-accent-secondary)';
                el.style.boxShadow = '0 0 30px var(--color-accent-secondary)';
                setTimeout(() => {
                    el.style.borderColor = '';
                    el.style.boxShadow = '';
                }, 2000);
            }
        }, 300);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [targetChar]);

  const scrollToTop = () => {
      const el = document.getElementById('dict-container');
      if(el) el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="dict-container" className="fixed inset-0 z-[5000] bg-[#0a0a14] overflow-y-auto flex flex-col animate-fadeIn">
      
      {/* Sticky Header with Higher Z-Index */}
      <div className="sticky top-0 bg-[#0a0a14]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex justify-between items-center z-[100] shadow-lg">
        <h2 className="cinzel-font text-xl md:text-2xl text-white tracking-widest font-bold">
          Hebrew Pictograph Dictionary
        </h2>
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-full text-white/70 hover:text-white hover:border-white hover:bg-white/5 transition-all text-sm uppercase tracking-wider tech-font"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to App
        </button>
      </div>

      {/* List Wrapper */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8 relative z-0">
        {LETTER_DETAILS.map((letter, index) => {
          const audioTerm = LETTER_AUDIO_MAP[letter.char] || letter.name;
          const isPlaying = playingLetter === audioTerm;
          
          // GUEST RESTRICTION LOGIC:
          // Aleph (0) is free. Bet (1) and higher are restricted.
          const isRestricted = isGuest && index >= 1;

          return (
            <div 
              key={letter.char} 
              id={`dict-letter-${letter.char}`}
              className="bg-[#121225] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:shadow-[0_0_30px_rgba(0,210,255,0.05)] transition-all duration-500 relative"
            >
              
              {/* RESTRICTED OVERLAY - Z-Index 10 is lower than Header (100) */}
              {isRestricted && (
                  <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[6px] flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-2xl">
                      <div className="bg-black/80 p-6 rounded-full border border-[var(--color-accent-primary)] shadow-[0_0_30px_var(--color-accent-primary)] mb-4">
                          <LockClosedIcon className="w-10 h-10 text-[var(--color-accent-secondary)]" />
                      </div>
                      <h3 className="cinzel-font text-2xl text-white tracking-widest mb-2">Restricted Access</h3>
                      <p className="text-[#a0a8c0] tech-font text-xs uppercase tracking-widest">Login to unlock full archive</p>
                  </div>
              )}

              {/* Card Header (Blurred if restricted) */}
              <div className={`bg-[#1a1a2e] p-6 flex items-center gap-6 border-b-2 border-[var(--color-accent-secondary)] transition-all duration-300 ${isRestricted ? 'blur-sm opacity-50' : ''}`}>
                <div className="w-[70px] h-[70px] bg-[#0a0a14] border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {letter.emoji}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start w-full">
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-2xl md:text-3xl text-white font-bold font-serif">
                                  <span className="text-[var(--color-accent-secondary)] mr-3 hebrew-font font-bold">
                                      {letter.char}
                                  </span>
                                  {letter.name}
                              </h3>
                              
                              {/* Small Audio Button - HIDDEN FOR GUESTS */}
                              {enableTTS && !isGuest && (
                                <button 
                                    onClick={() => getAndPlayAudio(audioTerm, true)}
                                    disabled={isPlaying}
                                    className={`
                                      w-7 h-7 flex items-center justify-center rounded-full border transition-all ml-3
                                      ${isPlaying 
                                          ? 'bg-[var(--color-accent-secondary)] border-[var(--color-accent-secondary)] text-black animate-pulse' 
                                          : 'bg-white/5 border-white/20 text-white/50 hover:bg-[var(--color-accent-secondary)] hover:text-black hover:scale-110 hover:border-transparent'
                                      }
                                    `}
                                    title={`Listen to ${letter.name}`}
                                >
                                    <SpeakerWaveIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                          </div>
                          {letter.pronunciation && (
                              <span className="inline-block px-2 py-1 bg-[#0a0a14] border border-white/20 rounded text-[var(--color-accent-secondary)] text-xs font-mono tracking-wide mb-2">
                                  {enableTTS && !isGuest && "🔊"} {letter.pronunciation}
                              </span>
                          )}
                      </div>
                  </div>
                  <p className="text-[#a0a8c0] italic text-sm md:text-base font-light">
                    {letter.summary}
                  </p>
                </div>
              </div>

              {/* Card Body (Blurred if restricted) */}
              <div 
                className={`p-8 text-[#d0d0e0] leading-loose text-base md:text-lg font-light space-y-4 transition-all duration-300 ${isRestricted ? 'blur-sm opacity-50' : ''}`}
                dangerouslySetInnerHTML={{ __html: letter.fullDetails }}
              />
            </div>
          );
        })}
        
        <div className="flex justify-center pb-12 pt-6">
            <button 
                onClick={scrollToTop}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--color-accent-secondary)] transition-all group"
            >
                <span className="text-xs uppercase tracking-widest text-white/60 group-hover:text-white">Back to Top</span>
                <ArrowUpIcon className="w-4 h-4 text-[var(--color-accent-secondary)] group-hover:-translate-y-1 transition-transform" />
            </button>
        </div>

        <div className="text-center pb-10 text-white/20 tech-font uppercase tracking-widest text-xs">
          End of Database
        </div>
      </div>
    </div>
  );
};

export default LetterDictionary;
