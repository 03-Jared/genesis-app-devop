
import React, { useEffect } from 'react';
import { LETTER_DETAILS } from '../constants';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface LetterDictionaryProps {
  onClose: () => void;
  targetChar?: string | null;
}

const LetterDictionary: React.FC<LetterDictionaryProps> = ({ onClose, targetChar }) => {
  
  useEffect(() => {
    // Lock body scroll when dictionary is open
    document.body.style.overflow = 'hidden';
    
    // Auto-scroll to specific letter if targetChar is provided
    if (targetChar) {
        setTimeout(() => {
            const el = document.getElementById(`dict-letter-${targetChar}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a temporary highlight effect
                el.style.borderColor = 'var(--color-accent-secondary)';
                el.style.boxShadow = '0 0 30px var(--color-accent-secondary)';
                setTimeout(() => {
                    el.style.borderColor = '';
                    el.style.boxShadow = '';
                }, 2000);
            }
        }, 300); // Slight delay to ensure render
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [targetChar]);

  return (
    <div className="fixed inset-0 z-[5000] bg-[#0a0a14] overflow-y-auto flex flex-col animate-fadeIn">
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-[#0a0a14]/95 backdrop-blur-md px-6 py-4 border-b border-white/10 flex justify-between items-center z-10 shadow-lg">
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
      <div className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        {LETTER_DETAILS.map((letter, index) => (
          <div 
            key={letter.char} 
            id={`dict-letter-${letter.char}`}
            className="bg-[#121225] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:shadow-[0_0_30px_rgba(0,210,255,0.05)] transition-all duration-500"
          >
            {/* Card Header */}
            <div className="bg-[#1a1a2e] p-6 flex items-center gap-6 border-b-2 border-[var(--color-accent-secondary)]">
              <div className="w-[70px] h-[70px] bg-[#0a0a14] border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {letter.emoji}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start w-full">
                    <div>
                        <h3 className="text-2xl md:text-3xl text-white font-bold mb-1 font-serif">
                        <span className="text-[var(--color-accent-secondary)] mr-3 hebrew-font font-bold">
                            {letter.char}
                        </span>
                        {letter.name}
                        </h3>
                        {letter.pronunciation && (
                            <span className="inline-block px-2 py-1 bg-[#0a0a14] border border-white/20 rounded text-[var(--color-accent-secondary)] text-xs font-mono tracking-wide mb-2">
                                🔊 {letter.pronunciation}
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-[#a0a8c0] italic text-sm md:text-base font-light">
                  {letter.summary}
                </p>
              </div>
            </div>

            {/* Card Body */}
            <div 
              className="p-8 text-[#d0d0e0] leading-loose text-base md:text-lg font-light space-y-4"
              dangerouslySetInnerHTML={{ __html: letter.fullDetails }}
            />
          </div>
        ))}
        
        <div className="text-center py-10 text-white/20 tech-font uppercase tracking-widest text-xs">
          End of Database
        </div>
      </div>
    </div>
  );
};

export default LetterDictionary;
