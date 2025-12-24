
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BIBLE_BOOKS, BIBLE_DATA, BIBLE_VERSE_COUNTS, DEFAULT_HEBREW_MAP, SOFIT_MAP } from './constants';
import { SefariaResponse, WordData, AiChapterData, AiWordAnalysis, SavedCard } from './types';
import WordBreakdownPanel from './components/WordBreakdownPanel';
import ExportPreviewModal from './components/ExportPreviewModal';
import LetterDictionary from './components/LetterDictionary'; // Import the new component
import { 
  BookOpenIcon, 
  MagnifyingGlassIcon, 
  ClockIcon, 
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Bars3Icon,
  Cog6ToothIcon,
  XMarkIcon,
  SwatchIcon,
  AdjustmentsHorizontalIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CursorArrowRaysIcon,
  BookmarkIcon,
  TrashIcon,
  ArrowRightCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

type PanelId = 'nav' | 'reader' | 'decoder';

const THEMES = {
  cyan: { primary: '#3b00ff', secondary: '#00d2ff', name: 'Protocol Cyan' },
  gold: { primary: '#5b3a00', secondary: '#FFD700', name: 'Royal Gold' },
  green: { primary: '#064e3b', secondary: '#00ff00', name: 'Matrix Green' },
  purple: { primary: '#4c1d95', secondary: '#d946ef', name: 'Royal Purple' },
  rose: { primary: '#be185d', secondary: '#ffe4e6', name: 'Mystic Rose' }
};

window.VERSE_DATA = {};
window.IS_SCANNING = false;

const App: React.FC = () => {
  const [selectedBook, setSelectedBook] = useState('Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState('');
  
  const [activeRef, setActiveRef] = useState({ 
    book: 'Genesis', 
    chapter: 1, 
    verse: null as number | null 
  });

  const [loading, setLoading] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [username, setUsername] = useState('');

  const [scriptureData, setScriptureData] = useState<SefariaResponse | null>(null);
  const [history, setHistory] = useState<WordData[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  
  const [aiData, setAiData] = useState<AiChapterData>({});
  const [scanStatuses, setScanStatuses] = useState<Record<number, 'idle' | 'scanning' | 'complete' | 'error'>>({});
  
  const [hoveredHebrewWord, setHoveredHebrewWord] = useState<string | null>(null);
  const [hoveredVerseIndex, setHoveredVerseIndex] = useState<number | null>(null);

  const [selectedWord, setSelectedWord] = useState<(WordData & { aiDefinition?: AiWordAnalysis }) | null>(null);
  const [journalNote, setJournalNote] = useState('');
  
  const [maximizedPanel, setMaximizedPanel] = useState<PanelId | null>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<PanelId>('reader');

  const [isReaderMode, setIsReaderMode] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(0); 
  const [isHoverEnabled, setIsHoverEnabled] = useState(true);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false); 
  const [dictionaryTargetChar, setDictionaryTargetChar] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    theme: 'cyan' as keyof typeof THEMES,
    glowFactor: 100, 
    glassOpacity: 60, 
    showHologram: true,
  });

  const isTouchDevice = () => {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  };

  const isMobileSize = () => {
    return window.innerWidth < 768;
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('genesis_username');
    const storedTheme = localStorage.getItem('genesis_theme');
    const storedReaderMode = localStorage.getItem('genesis_reader_mode');
    const storedFontSize = localStorage.getItem('genesis_font_size');
    const storedHover = localStorage.getItem('genesis_hover_enabled');
    const storedCards = localStorage.getItem('genesis_saved_cards');

    if (storedUser) setUsername(storedUser);
    if (storedTheme && THEMES[storedTheme as keyof typeof THEMES]) {
        setSettings(prev => ({...prev, theme: storedTheme as any}));
    }
    if (storedReaderMode) setIsReaderMode(storedReaderMode === 'true');
    if (storedFontSize) setFontSizeLevel(parseInt(storedFontSize));
    if (storedHover !== null) setIsHoverEnabled(storedHover === 'true');
    if (storedCards) {
      try {
        setSavedCards(JSON.parse(storedCards));
      } catch (e) { console.error("Failed to load cards", e); }
    }

    fetchScripture();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES[settings.theme];
    root.style.setProperty('--color-accent-primary', theme.primary);
    root.style.setProperty('--color-accent-secondary', theme.secondary);
    root.style.setProperty('--glass-bg', `rgba(10, 14, 41, ${settings.glassOpacity / 100})`);
    root.style.setProperty('--glow-factor', (settings.glowFactor / 100).toString());
  }, [settings]);

  useEffect(() => {
    const maxChapters = BIBLE_DATA[selectedBook] || 50;
    if (selectedChapter > maxChapters) {
      setSelectedChapter(1);
    }
    setSelectedVerse(''); 
  }, [selectedBook, selectedChapter]);

  // Save cards to local storage whenever they update
  useEffect(() => {
    localStorage.setItem('genesis_saved_cards', JSON.stringify(savedCards));
  }, [savedCards]);

  const handleInitialize = () => {
    if (!username.trim()) return;
    localStorage.setItem('genesis_username', username);
    localStorage.setItem('genesis_theme', settings.theme);
    setShowLanding(false);
  };

  const toggleReaderMode = () => {
    const newVal = !isReaderMode;
    setIsReaderMode(newVal);
    localStorage.setItem('genesis_reader_mode', String(newVal));
  };

  const cycleFontSize = () => {
    const newLevel = (fontSizeLevel + 1) % 3;
    setFontSizeLevel(newLevel);
    localStorage.setItem('genesis_font_size', String(newLevel));
  };

  const toggleHover = () => {
      const newVal = !isHoverEnabled;
      setIsHoverEnabled(newVal);
      localStorage.setItem('genesis_hover_enabled', String(newVal));
  };

  const handleSaveCard = (cardData: SavedCard) => {
      setSavedCards(prev => [cardData, ...prev]);
  };

  const handleDeleteCard = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Delete this saved design card?")) {
        setSavedCards(prev => prev.filter(c => c.id !== id));
      }
  };

  const handleRestoreCard = (card: SavedCard) => {
      setSelectedBook(card.book);
      setSelectedChapter(card.chapter);
      setActiveRef({ book: card.book, chapter: card.chapter, verse: card.verse });
      setSelectedWord(card.wordData);
      setJournalNote(card.note);
      setIsExportModalOpen(true);
  };

  const handleOpenDictionary = (char?: string) => {
      setDictionaryTargetChar(char || null);
      setIsDictionaryOpen(true);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const scanVerse = async (verseIndex: number, hebrewText: string, englishText: string) => {
    if (window.IS_SCANNING) return; 

    if (!process.env.API_KEY) {
        alert("System Error: Neural Link Disconnected (API Key Missing).");
        return;
    }

    window.IS_SCANNING = true;
    setScanStatuses(prev => ({ ...prev, [verseIndex]: 'scanning' }));
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const promptText = `
    Analyze the following Hebrew verse: "${hebrewText}"
    Context (English Translation): "${englishText}"
    
    Task: Map every Hebrew word in the verse to its meaning and provide deep spiritual analysis.
    
    IMPORTANT: You MUST return a JSON object where EACH KEY is a Hebrew word EXACTLY as it appears in the verse string provided.
    
    JSON format for each entry:
    {
      "definition": "Detailed translation/meaning",
      "root": "Hebrew root characters",
      "english_match": "The specific word from the context string that translates this word",
      "morphology": "Grammar details (e.g. Noun, Masculine, Singular)",
      "reflection": "A 1-2 sentence deep spiritual insight based on the word and its pictographic components"
    }
    `;

    try {
        let attempts = 0;
        const maxAttempts = 3;
        let rawText = "";

        while (attempts < maxAttempts) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview', 
                    contents: promptText,
                    config: { responseMimeType: 'application/json' }
                });
                rawText = response.text || "";
                break; 
            } catch (error: any) {
                attempts++;
                if (attempts < maxAttempts) {
                    await wait(2000 * attempts);
                    continue;
                }
                throw error;
            }
        }
        
        rawText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
        const verseData = JSON.parse(rawText);
        window.VERSE_DATA = { ...window.VERSE_DATA, ...verseData };
        setAiData(prev => ({ ...prev, ...verseData }));
        setScanStatuses(prev => ({ ...prev, [verseIndex]: 'complete' }));
        
        if (selectedWord && selectedWord.verseIndex === verseIndex) {
            const updatedAnalysis = verseData[selectedWord.text];
            if (updatedAnalysis) {
                setSelectedWord({ ...selectedWord, aiDefinition: updatedAnalysis });
            }
        }

    } catch (error: any) {
        setScanStatuses(prev => ({ ...prev, [verseIndex]: 'error' }));
    } finally {
        window.IS_SCANNING = false;
    }
  };

  const fetchScripture = async (overrideBook?: string, overrideChapter?: number) => {
    setLoading(true);
    setScriptureData(null); 
    setAiData({});
    setScanStatuses({});
    window.VERSE_DATA = {};
    window.IS_SCANNING = false;
    
    const currentBook = overrideBook || selectedBook;
    const currentChapter = overrideChapter || selectedChapter;
    const currentVerse = selectedVerse ? parseInt(selectedVerse) : null;

    try {
      const versePart = currentVerse ? `.${currentVerse}` : '';
      const response = await fetch(`https://www.sefaria.org/api/texts/${currentBook}.${currentChapter}${versePart}?context=0&version=King%20James%20Version`);
      const data = await response.json();
      setScriptureData(data);
      setActiveRef({ book: currentBook, chapter: currentChapter, verse: currentVerse });
    } catch (error) {
      console.error("Failed to fetch scripture", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterNav = (direction: 'next' | 'prev') => {
    const max = BIBLE_DATA[selectedBook] || 50;
    let next = selectedChapter;
    if (direction === 'next') { if (next >= max) return; next++; }
    else { if (next <= 1) return; next--; }
    setSelectedChapter(next);
    fetchScripture(selectedBook, next);
  };

  const handleWordClick = (word: string, verseIndex: number) => {
    const aiWordData = aiData[word];
    const cleanForHistory = word.replace(/[^\u05D0-\u05EA]/g, "");
    const newWordData: WordData & { aiDefinition?: any } = { text: word, cleanText: cleanForHistory, verseIndex, aiDefinition: aiWordData };
    
    setSelectedWord(newWordData);
    setActiveMobilePanel('decoder');
    setHistory(prev => (prev.length > 0 && prev[0].text === word) ? prev : [newWordData, ...prev].slice(0, 10));

    const savedNote = localStorage.getItem(`rhema_notes_${cleanForHistory}`);
    setJournalNote(savedNote || '');
  };

  const handleNoteChange = (val: string) => {
    setJournalNote(val);
    if (selectedWord) localStorage.setItem(`rhema_notes_${selectedWord.cleanText}`, val);
  };

  const toggleMaximize = (panel: PanelId) => {
    setMaximizedPanel(maximizedPanel === panel ? null : panel);
  };

  const handleWordHover = (e: React.MouseEvent, word: string, verseIndex: number) => {
      if (!isHoverEnabled || isTouchDevice() || isMobileSize()) return;

      setHoveredHebrewWord(word);
      setHoveredVerseIndex(verseIndex);

      const popup = document.getElementById("hover-popup");
      if (!popup) return;

      const cleanLetters = word.replace(/[^\u05D0-\u05EA]/g, "").split("");
      if (cleanLetters.length === 0) return;

      let sequenceHtml = `<div class="popup-sequence">`;
      cleanLetters.forEach((char, index) => {
          const rootChar = SOFIT_MAP[char] || char;
          const data = DEFAULT_HEBREW_MAP[rootChar];
          if (data) {
             sequenceHtml += `<div class="popup-card"><span class="popup-img">${data.emoji}</span><span class="popup-letter">${char}</span></div>`;
             if (index < cleanLetters.length - 1) sequenceHtml += `<span class="popup-arrow">→</span>`;
          }
      });
      sequenceHtml += `</div>`;
      
      const aiEntry = aiData[word];
      if (aiEntry) {
         sequenceHtml += `<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; text-align: center;"><strong style="color: #fff; font-size: 0.9rem; display: block; margin-bottom: 2px;">${aiEntry.english_match || "Analysis"}</strong><span style="color: #a0a8c0; font-size: 0.75rem; font-family: 'Space Grotesk', sans-serif;">${aiEntry.definition}</span></div>`;
      }

      popup.innerHTML = sequenceHtml;
      popup.style.left = `${e.clientX + 15}px`;
      popup.style.top = `${e.clientY + 15}px`;
      popup.style.display = "block";
      
      requestAnimationFrame(() => {
        popup.style.opacity = "1";
        popup.style.transform = "translateY(0px)";
      });
  };

  const handleWordLeave = () => {
      setHoveredHebrewWord(null);
      setHoveredVerseIndex(null);

      const popup = document.getElementById("hover-popup");
      if (!popup) return;
      popup.style.opacity = "0";
      popup.style.transform = "translateY(-10px)";
      setTimeout(() => { if (popup.style.opacity === "0") popup.style.display = "none"; }, 200);
  }

  const renderHebrewVerse = (text: string, verseIndex: number) => {
    if (!text) return null;
    const words = text.split(' ');
    const sizeClass = fontSizeLevel === 0 ? 'text-2xl md:text-3xl' : fontSizeLevel === 1 ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl';
    
    return (
      <div className="flex flex-col gap-2">
        <div className={`flex flex-wrap flex-row-reverse gap-2 leading-loose hebrew-text py-2 ${sizeClass}`}>
          {words.map((word, idx) => {
              const raw = word.replace(/<[^>]*>?/gm, '');
              if (!raw) return null;
              const isHovered = hoveredHebrewWord === raw && hoveredVerseIndex === verseIndex;
              const hasAiData = !!aiData[raw];
              return (
                <span key={idx} onMouseEnter={(e) => handleWordHover(e, raw, verseIndex)} onMouseLeave={handleWordLeave} onClick={() => handleWordClick(raw, verseIndex)} className={`cursor-pointer transition-all duration-300 rounded px-1.5 py-0.5 relative hover:scale-110 hover:drop-shadow-[0_0_15px_var(--color-accent-secondary)] ${selectedWord?.text === raw ? 'text-[var(--color-accent-secondary)] font-bold drop-shadow-[0_0_20px_var(--color-accent-primary)]' : 'text-slate-100'} ${hasAiData ? 'decoration-[var(--color-accent-secondary)]/30 underline decoration-1 underline-offset-4' : ''} ${isHovered ? 'text-[var(--color-accent-secondary)]' : ''}`}>{raw}</span>
              );
          })}
        </div>
      </div>
    );
  };

  const renderEnglishVerse = (text: string, verseIndex: number) => {
      if (hoveredVerseIndex === verseIndex && hoveredHebrewWord && aiData[hoveredHebrewWord]) {
          const aiEntry = aiData[hoveredHebrewWord];
          if (aiEntry && aiEntry.english_match) {
              const matchPhrase = aiEntry.english_match;
              const parts = text.split(new RegExp(`(${matchPhrase})`, 'gi'));
              return (
                  <span>{parts.map((part, i) => part.toLowerCase() === matchPhrase.toLowerCase() ? (<span key={i} className="bg-[var(--color-accent-secondary)]/20 text-[var(--color-accent-secondary)] px-1 rounded shadow-[0_0_15px_var(--color-accent-secondary)] font-bold transition-all duration-300">{part}</span>) : (<span key={i}>{part}</span>)) }</span>
              );
          }
      }
      return <span>{text}</span>;
  };

  const getPanelClass = (id: PanelId) => {
    const isMobileHidden = activeMobilePanel !== id ? 'hidden md:flex' : 'flex';
    const baseClasses = "panel flex flex-col glass-panel rounded-none md:rounded-3xl overflow-hidden transition-all duration-500 h-full md:h-auto border-x-0 md:border-x";
    if (maximizedPanel) return maximizedPanel === id ? 'panel fullscreen bg-[#090a20] flex flex-col' : 'hidden';
    let gridClass = id === 'nav' ? 'md:col-span-3 lg:col-span-2' : id === 'reader' ? 'md:col-span-6 lg:col-span-7' : 'md:col-span-3 lg:col-span-3';
    return `${isMobileHidden} ${gridClass} ${baseClasses}`;
  };

  const hebrewVerses = scriptureData ? (Array.isArray(scriptureData.he) ? scriptureData.he : [scriptureData.he]) : [];
  const englishVerses = scriptureData ? (Array.isArray(scriptureData.text) ? scriptureData.text : [scriptureData.text]) : [];
  const maxChapters = BIBLE_DATA[selectedBook] || 50;
  const englishSizeClass = fontSizeLevel === 0 ? 'text-sm md:text-lg' : fontSizeLevel === 1 ? 'text-base md:text-xl' : 'text-lg md:text-2xl';
  const verseNumSizeClass = fontSizeLevel === 0 ? 'text-[10px]' : fontSizeLevel === 1 ? 'text-xs' : 'text-sm';
  const availableVerseCount = BIBLE_VERSE_COUNTS[selectedBook]?.[selectedChapter - 1] || 176;
  
  const filteredCards = savedCards.filter(card => card.book === selectedBook);

  if (showLanding) {
    return (
      <div className="landing-mode p-4">
        {settings.showHologram && (
          <div className="scene-3d mb-8 md:mb-12 relative z-10">
            <div className="cross-group">
                <div className="face face-composite front"></div><div className="face face-composite back"></div><div className="side side-v-top"></div><div className="side side-v-bottom"></div><div className="side side-v-left-top"></div><div className="side side-v-left-bottom"></div><div className="side side-v-right-top"></div><div className="side side-v-right-bottom"></div><div className="side side-h-end-left"></div><div className="side side-h-end-right"></div><div className="side side-h-top-left"></div><div className="side side-h-bottom-left"></div><div className="side side-h-top-right"></div><div className="side side-h-bottom-right"></div>
            </div>
          </div>
        )}
        <div className="text-center z-10 space-y-4 mb-8"><h1 className="cinzel-font text-4xl md:text-7xl text-white font-bold tracking-widest cyan-glow">GENESIS</h1><p className="tech-font text-[#a0a8c0] text-xs md:text-sm tracking-[0.5em] uppercase opacity-80">Study Suite <span className="text-[var(--color-accent-secondary)] mx-2">///</span> V3.0</p></div>
        <div className="w-full max-w-sm z-20 flex flex-col gap-5 animate-fadeIn">
            <input type="text" placeholder="ENTER YOUR CODENAME" value={username} onChange={(e) => setUsername(e.target.value.toUpperCase())} className="glass-pill w-full px-6 py-4 text-center text-sm md:text-base tracking-[0.2em] font-bold bg-[#090a20]/20 border border-[var(--color-accent-primary)]/50 focus:border-[var(--color-accent-secondary)] text-[var(--color-accent-secondary)] placeholder:text-white/40 outline-none transition-all focus:shadow-[0_0_20px_var(--color-accent-primary)]" />
            <div className="relative"><select value={settings.theme} onChange={(e) => setSettings(s => ({...s, theme: e.target.value as any}))} className="glass-pill w-full px-6 py-4 text-center text-xs md:text-sm tracking-[0.2em] appearance-none bg-[#090a20]/20 border border-[var(--color-accent-primary)]/50 cursor-pointer text-white/80 hover:text-white transition-colors outline-none focus:border-[var(--color-accent-secondary)] uppercase"><option value="cyan">Protocol Cyan</option><option value="gold">Royal Gold</option><option value="green">Matrix Green</option><option value="purple">Royal Purple</option><option value="rose">Mystic Rose</option></select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-accent-secondary)]"><ChevronDownIcon className="w-4 h-4" /></div></div>
            <button onClick={handleInitialize} disabled={!username.trim()} className="mt-4 reactor-button w-full px-6 py-4 rounded-full text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">Initialize System</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full cosmic-bg text-[#a0a8c0] overflow-hidden flex flex-col p-0 md:p-6 gap-0 md:gap-6 relative">
      <div id="hover-popup"></div>
      
      {/* DICTIONARY OVERLAY */}
      {isDictionaryOpen && (
        <LetterDictionary onClose={() => setIsDictionaryOpen(false)} targetChar={dictionaryTargetChar} />
      )}

      <header className="hidden md:flex justify-between items-center py-2 px-4 border-b border-[var(--color-accent-primary)]/20 bg-[var(--color-accent-primary)]/5 rounded-2xl mb-2 backdrop-blur-sm"><h1 className="cinzel-font text-xl text-white font-bold tracking-widest cyan-glow">GENESIS <span className="text-[var(--color-accent-secondary)] mx-2">//</span> {username}</h1><div className="flex items-center gap-4">{Object.values(scanStatuses).some(s => s === 'scanning') && (<div className="flex items-center gap-2 text-[10px] tech-font uppercase tracking-widest text-[var(--color-accent-secondary)]"><span className="w-2 h-2 bg-[var(--color-accent-secondary)] rounded-full animate-ping"></span>Gemini Uplink Active</div>)}<div className="text-[10px] tech-font uppercase tracking-widest text-[#a0a8c0]/60">System Online</div></div></header>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 relative max-w-[1920px] mx-auto w-full h-full">
        <section className={getPanelClass('nav')}><div className="panel-header"><h2 className="cinzel-font text-[var(--color-accent-secondary)] tracking-widest text-xs font-bold flex items-center gap-2"><Bars3Icon className="w-4 h-4" /> Codex</h2><div className="window-controls"><button onClick={() => setIsSettingsOpen(true)} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors"><Cog6ToothIcon className="w-4 h-4" /></button><button onClick={() => toggleMaximize('nav')} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors">{maximizedPanel === 'nav' ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}</button></div></div>
        
        <div className="sidebar-content p-4 md:p-6 flex-grow overflow-y-auto space-y-6 pb-24 md:pb-6">
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase text-[var(--color-accent-secondary)] tracking-wider font-semibold ml-2">Book</label>
                    <div className="relative">
                        <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} className="w-full appearance-none glass-pill px-5 py-3 text-sm cursor-pointer border-[#333] hover:border-[var(--color-accent-secondary)] focus:border-[var(--color-accent-secondary)]">
                            {BIBLE_BOOKS.map(b => <option key={b} value={b} className="bg-[#090a20] text-slate-200">{b}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-accent-secondary)]"><ChevronDownIcon className="w-4 h-4" /></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase text-[var(--color-accent-secondary)] tracking-wider font-semibold ml-2">Chapter</label>
                        <div className="relative">
                            <select value={selectedChapter} onChange={(e) => setSelectedChapter(parseInt(e.target.value))} className="w-full appearance-none glass-pill px-5 py-3 text-sm cursor-pointer text-center">
                                {Array.from({length: maxChapters}, (_, i) => i + 1).map(num => (<option key={num} value={num} className="bg-[#090a20] text-slate-200">{num}</option>))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-accent-secondary)]"><ChevronDownIcon className="w-3 h-3" /></div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase text-[var(--color-accent-secondary)] tracking-wider font-semibold ml-2">Verse</label>
                        <div className="relative">
                            <select value={selectedVerse} onChange={(e) => setSelectedVerse(e.target.value)} className="w-full appearance-none glass-pill px-5 py-3 text-sm cursor-pointer text-center">
                                <option value="" className="bg-[#090a20] text-slate-200">All</option>
                                {Array.from({length: availableVerseCount}, (_, i) => i + 1).map(num => (<option key={num} value={num} className="bg-[#090a20] text-slate-200">{num}</option>))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--color-accent-secondary)]"><ChevronDownIcon className="w-3 h-3" /></div>
                        </div>
                    </div>
                </div>
                <button onClick={() => fetchScripture()} disabled={loading} className="w-full electric-gradient py-3 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 mt-4 shadow-lg shadow-[var(--color-accent-primary)]/20 hover:shadow-[var(--color-accent-secondary)]/40 transition-shadow">
                    {loading ? <span className="animate-spin">⟳</span> : <MagnifyingGlassIcon className="w-4 h-4" />}
                    Load Scripture
                </button>
            </div>

            <div className="pt-6 border-t border-[var(--color-accent-primary)]/20 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                    <BookmarkIcon className="w-4 h-4 text-[var(--color-accent-secondary)]" />
                    <span className="text-xs uppercase tracking-widest font-bold text-white/70">Neural Archives: {selectedBook}</span>
                </div>

                {filteredCards.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <ClockIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">No saved cards for {selectedBook}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCards.map((card) => (
                            <div 
                                key={card.id} 
                                onClick={() => handleRestoreCard(card)}
                                className="group relative archive-item p-3 rounded-lg bg-[#050714] border border-white/5 hover:border-[var(--color-accent-secondary)] cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,210,255,0.1)] hover:-translate-y-1"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-[var(--color-accent-primary)]/10 flex items-center justify-center border border-[var(--color-accent-primary)]/20 text-[var(--color-accent-secondary)] font-bold text-xs">
                                           {card.chapter}:{card.verse + 1}
                                        </div>
                                        <div>
                                            <div className="hebrew-font text-lg text-white leading-none mb-1">{card.wordText}</div>
                                            <div className="text-[9px] text-white/40 tech-font uppercase tracking-wider">{new Date(card.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteCard(e, card.id)}
                                        className="text-white/20 hover:text-red-400 p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                {card.note && (
                                    <div className="mt-2 text-[10px] text-white/50 truncate border-t border-white/5 pt-2 italic">
                                        "{card.note}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </section>

        <section className={getPanelClass('reader')}><div className="panel-header"><h2 className="cinzel-font text-[var(--color-accent-secondary)] tracking-widest text-xs font-bold flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> Scripture</h2><div className="window-controls"><div className="flex items-center gap-1 border-r border-[var(--color-accent-primary)]/20 pr-2 mr-2"><button onClick={() => handleChapterNav('prev')} disabled={selectedChapter <= 1} className="p-1 text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] disabled:opacity-30 disabled:hover:text-[#a0a8c0] transition-colors"><ChevronLeftIcon className="w-4 h-4" /></button><span className="text-[10px] font-mono text-[var(--color-accent-secondary)] w-6 text-center">{selectedChapter}</span><button onClick={() => handleChapterNav('next')} disabled={selectedChapter >= maxChapters} className="p-1 text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] disabled:opacity-30 disabled:hover:text-[#a0a8c0] transition-colors"><ChevronRightIcon className="w-4 h-4" /></button></div><button onClick={toggleReaderMode} className={`transition-colors p-1 ${isReaderMode ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0] hover:text-white'}`} title={isReaderMode ? "Reader Mode Active" : "Interlinear Mode"}><BookOpenIcon className="w-4 h-4 md:w-5 md:h-5" /></button><div className="w-[1px] h-4 bg-[var(--color-accent-primary)]/20 mx-1"></div><button onClick={cycleFontSize} className="font-serif font-bold text-xs md:text-sm text-[#a0a8c0] hover:text-white transition-colors flex items-end leading-none" title="Toggle Font Size">T<span className="text-[0.8em]">t</span></button><div className="w-[1px] h-4 bg-[var(--color-accent-primary)]/20 mx-1"></div><button onClick={toggleHover} className={`transition-colors p-1 ${isHoverEnabled ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0] hover:text-white'}`} title={isHoverEnabled ? "Disable Hover Decoder" : "Enable Hover Decoder"}><CursorArrowRaysIcon className="w-4 h-4 md:w-5 md:h-5" /></button><div className="w-[1px] h-4 bg-[var(--color-accent-primary)]/20 mx-1"></div><button onClick={() => toggleMaximize('reader')} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors">{maximizedPanel === 'reader' ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}</button></div></div><div className="reader-content flex-1 overflow-y-auto p-4 md:p-12 relative scroll-smooth">{loading && (<div className="h-full flex flex-col items-center justify-center gap-6"><div className="w-16 h-16 border-2 border-[var(--color-accent-secondary)] border-t-transparent rounded-full animate-spin"></div><span className="tech-font text-xs uppercase tracking-[0.3em] text-[var(--color-accent-secondary)] animate-pulse">Receiving Transmission...</span></div>)}{!scriptureData && !loading && (<div className="h-full flex flex-col items-center justify-center text-[#a0a8c0] opacity-50"><BookOpenIcon className="w-20 h-20 mb-6 stroke-1 text-[var(--color-accent-primary)]" /><p className="tech-font text-sm uppercase tracking-[0.2em]">Select text to begin</p></div>)}{scriptureData && !loading && (<div className="max-w-4xl mx-auto space-y-16 animate-fadeIn pb-32"><div className="text-center"><h2 className="text-2xl md:text-6xl font-normal text-white mb-4 cinzel-font tracking-widest cyan-glow">{activeRef.book} <span className="text-white ml-3">{activeRef.chapter}{activeRef.verse ? `:${activeRef.verse}` : ''}</span></h2><div className="h-[1px] w-32 md:w-48 bg-gradient-to-r from-transparent via-[var(--color-accent-secondary)] to-transparent mx-auto opacity-70"></div></div><div id="readerContent" className={`space-y-6 md:space-y-8 ${isReaderMode ? 'mode-reader' : ''}`}>{hebrewVerses.map((verse, idx) => (<div key={idx} className="verse-block group relative p-4 md:p-8 border border-white/0 hover:border-[var(--color-accent-secondary)]/20 hover:bg-[var(--color-accent-primary)]/5 transition-all duration-500 rounded-2xl"><div className="flex gap-3 md:gap-4 items-start"><div className="flex-shrink-0 pt-1.5 md:pt-2 flex items-center"><button id={`btn-${idx}`} className={`ai-scan-btn ${scanStatuses[idx] === 'scanning' ? 'scanning-pulse' : ''} ${scanStatuses[idx] === 'complete' ? 'scan-success' : ''}`} onClick={() => scanVerse(idx, verse, englishVerses[idx]?.replace(/<[^>]*>?/gm, ''))} title="Analyze Verse with Gemini AI" disabled={scanStatuses[idx] === 'scanning' || window.IS_SCANNING}>{scanStatuses[idx] === 'scanning' ? '⏳' : scanStatuses[idx] === 'complete' ? '✅' : scanStatuses[idx] === 'error' ? '⚠️' : '⚡'}</button><span className={`${verseNumSizeClass} text-[var(--color-accent-secondary)] font-mono select-none px-2 py-1 rounded-md bg-[var(--color-accent-primary)]/10 h-fit`}>{activeRef.verse ? activeRef.verse : idx + 1}</span></div><div className="flex-grow"><p className={`english-line text-[#a0a8c0] font-light font-sans leading-loose mb-6 group-hover:text-white transition-colors ${englishSizeClass} ${isReaderMode ? '' : 'italic'}`}>{renderEnglishVerse(englishVerses[idx]?.replace(/<[^>]*>?/gm, ''), idx)}</p><div className="hebrew-line text-right border-t border-[var(--color-accent-primary)]/20 pt-4" dir="rtl">{renderHebrewVerse(verse, activeRef.verse ? activeRef.verse - 1 : idx)}</div></div></div></div>))}</div><div className="pt-12 border-t border-[var(--color-accent-primary)]/20 flex justify-center pb-8">{selectedChapter < maxChapters && (<button onClick={() => handleChapterNav('next')} className="group flex items-center gap-4 px-8 py-4 rounded-full bg-[var(--color-accent-primary)]/10 hover:bg-[var(--color-accent-primary)]/20 border border-[var(--color-accent-primary)]/30 hover:border-[var(--color-accent-secondary)] transition-all duration-300"><span className="tech-font text-xs uppercase tracking-[0.3em] text-white">Next Chapter</span><ChevronRightIcon className="w-5 h-5 text-[var(--color-accent-secondary)] group-hover:translate-x-1 transition-transform" /></button>)}</div></div>)}</div></section>

        <section className={getPanelClass('decoder')}>
          {/* UPDATED HEADER with Letter Bank Button */}
          <div className="panel-header">
            <h2 className="cinzel-font text-[var(--color-accent-secondary)] tracking-widest text-xs font-bold flex items-center gap-2">
              <MagnifyingGlassIcon className="w-4 h-4" /> Rhema Scope
            </h2>
            
            <div className="flex items-center gap-2">
              {/* NEW TOP BUTTON: Letter Bank */}
              <button 
                onClick={() => handleOpenDictionary()} 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors group"
                title="Open Letter Dictionary"
              >
                <InformationCircleIcon className="w-3.5 h-3.5 text-[var(--color-accent-secondary)]" />
                <span className="text-[10px] uppercase tracking-wider text-white/70 group-hover:text-white">Letter Bank</span>
              </button>

              <div className="window-controls">
                <button onClick={() => toggleMaximize('decoder')} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors">
                  {maximizedPanel === 'decoder' ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="decoder-content p-4 md:p-6 flex-grow overflow-y-auto flex flex-col pb-6">
            <WordBreakdownPanel 
              selectedWord={selectedWord} 
              journalNote={journalNote} 
              onNoteChange={handleNoteChange} 
              bookName={activeRef.book} 
              chapter={activeRef.chapter} 
              verseScanStatus={selectedWord ? scanStatuses[selectedWord.verseIndex] : 'idle'} 
              onTriggerExport={() => setIsExportModalOpen(true)} 
              onOpenDictionary={handleOpenDictionary} 
            />
          </div>
        </section>
      </div>

      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 glass-panel rounded-full flex justify-around items-center z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl bg-[#090a20]/90">
        <button onClick={() => setActiveMobilePanel('nav')} className={`flex flex-col items-center gap-1 transition-colors ${activeMobilePanel === 'nav' ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0]'}`}><Bars3Icon className="w-6 h-6" /></button>
        <button onClick={() => setActiveMobilePanel('reader')} className={`flex flex-col items-center gap-1 transition-colors ${activeMobilePanel === 'reader' ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0]'}`}><BookOpenIcon className="w-6 h-6" /></button>
        <button onClick={() => setActiveMobilePanel('decoder')} className={`flex flex-col items-center gap-1 transition-colors ${activeMobilePanel === 'decoder' ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0]'}`}><MagnifyingGlassIcon className="w-6 h-6" /></button>
        <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center gap-1 transition-colors text-[#a0a8c0] active:text-[var(--color-accent-secondary)]"><Cog6ToothIcon className="w-6 h-6" /></button>
      </nav>

      <div className={`fixed inset-0 z-[100] transition-all duration-500 ease-in-out ${isSettingsOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute bottom-0 left-0 right-0 h-[85dvh] md:h-[60dvh] bg-[#050714] border-t border-[var(--color-accent-secondary)] shadow-[0_-10px_40px_rgba(0,0,0,0.9)] transform transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.3,1)] flex flex-col rounded-t-[2.5rem] md:rounded-t-none ${isSettingsOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 sticky top-0 bg-[#050714] z-20 rounded-t-[2.5rem] md:rounded-t-none">
                <div className="flex items-center gap-3"><Cog6ToothIcon className="w-6 h-6 text-[var(--color-accent-secondary)] animate-spin-slow" /><h2 className="cinzel-font text-xl text-white tracking-widest">Configuration</h2></div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-3 bg-white/5 hover:bg-[var(--color-accent-primary)]/20 rounded-full text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex-grow overflow-y-auto px-6 py-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 pb-32 md:pb-10">
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group border-white/5 bg-white/5">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-accent-secondary)]"></div>
                   <h3 className="flex items-center gap-2 text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest text-xs mb-8"><SwatchIcon className="w-4 h-4" /> Prism Core</h3>
                   <div className="grid grid-cols-2 gap-4">
                      {Object.entries(THEMES).map(([key, theme]) => (
                        <button key={key} onClick={() => setSettings(s => ({...s, theme: key as any}))} className={`relative h-24 md:h-20 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 ${settings.theme === key ? 'border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}>
                           <span className="relative z-10 font-bold text-white text-xs uppercase tracking-wider">{theme.name.split(' ')[1]}</span>
                           {settings.theme === key && <div className="absolute inset-0 bg-white/10"></div>}
                        </button>
                      ))}
                   </div>
                </div>
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border-white/5 bg-white/5">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-accent-secondary)]"></div>
                   <h3 className="flex items-center gap-2 text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest text-xs mb-10"><AdjustmentsHorizontalIcon className="w-4 h-4" /> Visual FX</h3>
                   <div className="space-y-12">
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs text-[#a0a8c0] uppercase tracking-widest"><span>Glow</span><span className="text-[var(--color-accent-secondary)]">{settings.glowFactor}%</span></div>
                        <input type="range" min="0" max="200" value={settings.glowFactor} onChange={(e) => setSettings(s => ({...s, glowFactor: parseInt(e.target.value)}))} className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-secondary)]" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs text-[#a0a8c0] uppercase tracking-widest"><span>Opacity</span><span className="text-[var(--color-accent-secondary)]">{settings.glassOpacity}%</span></div>
                        <input type="range" min="20" max="95" value={settings.glassOpacity} onChange={(e) => setSettings(s => ({...s, glassOpacity: parseInt(e.target.value)}))} className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-secondary)]" />
                      </div>
                   </div>
                </div>
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border-white/5 bg-white/5">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-accent-secondary)]"></div>
                   <h3 className="flex items-center gap-2 text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest text-xs mb-8"><CpuChipIcon className="w-4 h-4" /> Hardware</h3>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-black/30 rounded-2xl border border-white/5">
                         <span className="text-xs text-[#a0a8c0] uppercase tracking-widest">Hologram Projector</span>
                         <button onClick={() => setSettings(s => ({...s, showHologram: !s.showHologram}))} className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${settings.showHologram ? 'bg-[var(--color-accent-secondary)]' : 'bg-white/10'}`}><div className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 ${settings.showHologram ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                      </div>
                   </div>
                </div>
            </div>
            <div className="p-8 border-t border-white/5 text-center mt-auto md:mt-0 bg-[#050714]"><button onClick={() => setIsSettingsOpen(false)} className="md:hidden w-full electric-gradient py-5 rounded-full text-sm font-bold tracking-widest uppercase mb-4">Close Configurator</button><span className="text-[10px] text-white/20 uppercase tracking-[0.6em]">System Architecture v3.0</span></div>
        </div>
      </div>
      
      {isExportModalOpen && selectedWord && (
        <ExportPreviewModal 
            selectedWord={selectedWord} 
            bookName={activeRef.book} 
            chapter={activeRef.chapter} 
            journalNote={journalNote} 
            onClose={() => setIsExportModalOpen(false)} 
            onSaveCard={handleSaveCard}
        />
      )}
    </div>
  );
};

export default App;
