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
  ChevronUpIcon,
  CursorArrowRaysIcon,
  BookmarkIcon,
  TrashIcon,
  ArrowRightCircleIcon,
  InformationCircleIcon,
  SpeakerWaveIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  DocumentTextIcon,
  LanguageIcon,
  SparklesIcon,
  StopIcon,
  PaperClipIcon,
  SignalIcon,
  Square3Stack3DIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  CubeTransparentIcon,
  LockClosedIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

type PanelId = 'nav' | 'reader' | 'decoder';

const THEMES = {
  cyan: { primary: '#3b00ff', secondary: '#00d2ff', name: 'Protocol Cyan' },
  gold: { primary: '#5b3a00', secondary: '#FFD700', name: 'Royal Gold' },
  green: { primary: '#064e3b', secondary: '#00ff00', name: 'Matrix Green' },
  purple: { primary: '#4c1d95', secondary: '#d946ef', name: 'Royal Purple' },
  rose: { primary: '#be185d', secondary: '#ffe4e6', name: 'Mystic Rose' }
};

// Explicit order for settings menu: Cyan, Purple, Rose (Free) | Green, Gold (Locked)
const THEME_ORDER = ['cyan', 'purple', 'rose', 'green', 'gold'];

window.VERSE_DATA = {};
window.IS_SCANNING = false;
window.AUDIO_CACHE = {}; // Initialize Turbo Cache

// --- ROBUST MARKDOWN PARSER (FIXED) ---
function parseMarkdown(text: string) {
    if (!text) return "";
    let html = text;

    // 1. Headers (### Heading)
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h3>$1</h3>');

    // 2. Lists (Prioritize lists over italics to fix 'orphaned asterisk')
    // Bullet points: "* item" or "- item" at start of line
    html = html.replace(/^\s*[\-\*]\s+(.*$)/gm, '<div class="md-list-item"><span class="bullet">•</span><span class="content">$1</span></div>');
    
    // Numbered lists: "1. item"
    html = html.replace(/^\s*(\d+\.)\s+(.*$)/gm, '<div class="md-list-item"><span class="bullet">$1</span><span class="content">$2</span></div>');

    // 3. Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 4. Italic (*text*) 
    // Now that lists are handled, we can safely replace remaining * wrappers
    html = html.replace(/\*([^\s*].*?)\*/g, '<em>$1</em>');

    // 5. Line Breaks & Cleanup
    // Remove newlines immediately after block elements to prevent double gaps
    html = html.replace(/(\<\/h3\>|\<\/div\>)\n/g, '$1'); 
    
    // Convert remaining newlines to breaks
    html = html.replace(/\n/g, '<br />');

    return html;
}

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
  
  // Access Control
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Separated states to fix scrolling race condition
  const [isLoginVisible, setIsLoginVisible] = useState(false); // Controls section visibility/expansion
  const [isScrollLocked, setIsScrollLocked] = useState(false); // Controls page scroll lock
  
  const loginSectionRef = useRef<HTMLElement>(null);

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

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  // Added contextLabel to chatMessages type
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user'|'ai', text: string, parts?: any[], contextLabel?: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  
  // Context Management
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [activeContext, setActiveContext] = useState<{type: 'verse'|'word'|'picto', content: string, label: string} | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState({
    theme: 'cyan' as keyof typeof THEMES,
    glowFactor: 100, 
    glassOpacity: 60, 
    showHologram: true,
    voiceGender: 'female' as 'male' | 'female',
    enableTTS: true,
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
    const storedVoice = localStorage.getItem('genesis_voice_gender');
    const storedTTS = localStorage.getItem('genesis_enable_tts');

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
    if (storedVoice === 'male' || storedVoice === 'female') {
        setSettings(prev => ({...prev, voiceGender: storedVoice as 'male' | 'female'}));
    }
    if (storedTTS !== null) {
        setSettings(prev => ({...prev, enableTTS: storedTTS === 'true'}));
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
      localStorage.setItem('genesis_voice_gender', settings.voiceGender);
      localStorage.setItem('genesis_enable_tts', String(settings.enableTTS));
  }, [settings.voiceGender, settings.enableTTS]);

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

  // Scroll Chat to bottom
  useEffect(() => {
      if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatMessages, isChatOpen, isChatMaximized, activeContext]); // Scroll when context changes too

  // Chat Initial Greeting
  useEffect(() => {
    if (isChatOpen && chatMessages.length === 0) {
        const greeting = `Shalom, ${username || 'My Friend'}. I am Rabbi AI. I can answer questions about the Bible, Hebrew, or just listen if you need to talk. How can I help?`;
        setChatMessages([{
            role: 'ai', 
            text: greeting
        }]);
    }
  }, [isChatOpen, username]);

  const handleInitialize = () => {
    if (!username.trim()) return;
    localStorage.setItem('genesis_username', username);
    localStorage.setItem('genesis_theme', settings.theme);
    // Guest Mode Init
    setIsAdmin(false);
    setShowLanding(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername.toLowerCase() === 'wabaki' && loginPassword === '12345') {
        setUsername('WABAKI');
        localStorage.setItem('genesis_username', 'WABAKI');
        setIsAdmin(true);
        setShowLanding(false);
        setIsLoginVisible(false);
        setIsScrollLocked(false);
    } else {
        alert("Authentication Failed. Invalid Credentials.");
    }
  };

  const unlockLoginScroll = () => {
      setIsLoginVisible(false);
  };

  const triggerLoginLock = () => {
      setIsLoginVisible(true);
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

  // --- LANDING PAGE SMOOTH SCROLL ENGINE ---
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const scanVerse = async (verseIndex: number, hebrewText: string, englishText: string) => {
    if (window.IS_SCANNING) return; 

    // GUEST LOCK: Completely disable for guests
    if (!isAdmin) {
        return;
    }

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
      "transliteration": "Phonetic reading in English (e.g. 'Bereshit')",
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

  // --- CHAT LOGIC ---
  const handleChatSubmit = async () => {
    // SECURITY CHECK: If guest, do not allow sending
    if (!isAdmin) return;

    if ((!chatInput.trim() && !activeContext) || !process.env.API_KEY) return;
    
    const userText = chatInput.trim();
    
    // Construct the displayed message
    let displayMessage = userText;
    let systemContextInjection = "";
    
    // CAPTURE CONTEXT LABEL FOR HISTORY
    const contextLabel = activeContext ? activeContext.label : undefined;

    // 1. Process Attached Context
    if (activeContext) {
        // We prepend the context logic for the AI
        systemContextInjection = `[USER CONTEXT ATTACHMENT: ${activeContext.content}]\n\n`;
        // We clear the context after sending
        setActiveContext(null);
    } else {
        // General Context (Fallback)
        systemContextInjection = `[General User Context: Reading ${activeRef.book} ${activeRef.chapter}]\n\n`;
    }

    const fullPrompt = systemContextInjection + userText;

    // Add User Message to History & UI
    // Attach the contextLabel to the message object so we can render it in the chat history
    const newHistory = [...chatMessages, { role: 'user' as const, text: userText, contextLabel: contextLabel }];
    setChatMessages(newHistory);
    setChatInput('');
    setIsChatThinking(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Prepare History for API (map to SDK format)
        // We inject the context into the *latest* message content
        const apiContents = newHistory.map((msg, index) => {
            let content = msg.text;
            if (index === newHistory.length - 1) {
                content = fullPrompt; // Inject context into the very last message sent
            }
            return {
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: content }]
            };
        });

        const systemPrompt = `
        Role: You are "Rabbi AI," a wise, compassionate, and deeply empathetic Old Testament study companion. You possess the soul of an ancient sage and the clarity of a modern scholar.

        Persona Guidelines:
        1. **Connection First**: Do not just answer like a machine. Use "I" and "We". Build a relationship. If the user expresses emotion, validate it first. Ask follow-up questions to understand their heart before offering solutions.
        2. **Deep Hebrew Wisdom**: You specialize in the Paleo-Hebrew pictographs and deep etymology. If the user asks about a word, break it down by its letters (pictographs) and spiritual significance. If they ask about "pictures", they mean the paleo-hebrew letter meanings.
        3. **Navigation (Generous Suggestions)**: 
           - When suggesting scriptures, **provide 3-5 distinct verse references** if relevant. Do not limit yourself to just one.
           - Offer a variety of perspectives (e.g., a Law verse, a Prophet verse, a Psalm).
           - Format: [NAVIGATE: Book Chapter:Verse | Short Context]
        4. **Formatting**: 
           - Verse Links: [NAVIGATE: Book Chapter:Verse | Short Context]
           - You can provide multiple references if they are distinct and helpful.
        5. **Context Awareness**: PAY CLOSE ATTENTION to any [USER CONTEXT ATTACHMENT] provided. This is exactly what the user is looking at. Answer questions specifically about that word or verse.
        6. **Summarization**: If the user indicates they are done or asks for a summary, provide a beautiful, concise recap of the spiritual gems discovered in the conversation.

        Tone: Warm, patience, profound, not preachy.
        `;

        const response = await ai.models.generateContent({
             model: 'gemini-3-pro-preview',
             contents: apiContents,
             config: {
                 systemInstruction: systemPrompt
             }
        });

        const text = response.text || "";
        
        // Process response for navigation tags
        const parts = [];
        const linkRegex = /\[NAVIGATE:\s*(.*?)\s*\|\s*(.*?)\]/g;
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            // Text before match
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
            }
            // The Button
            parts.push({ type: 'button', ref: match[1].trim(), desc: match[2].trim() });
            lastIndex = linkRegex.lastIndex;
        }
        // Remaining text
        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.substring(lastIndex) });
        }

        setChatMessages(prev => [...prev, { role: 'ai', text: text, parts: parts }]);

    } catch (error) {
        setChatMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting to the archives. Please try again." }]);
    } finally {
        setIsChatThinking(false);
    }
  };

  const handleContextSelect = (type: 'verse'|'word'|'picto'|'summary') => {
      // GUEST LOCK: If not admin, do nothing when clicking items
      if (!isAdmin) return;

      setContextMenuOpen(false);
      
      let content = "";
      let label = "";

      if (type === 'verse') {
          // Construct current verse text
          const verseIndex = activeRef.verse ? activeRef.verse - 1 : 0;
          const hebrew = Array.isArray(scriptureData?.he) ? scriptureData?.he[verseIndex] : scriptureData?.he;
          const english = Array.isArray(scriptureData?.text) ? scriptureData?.text[verseIndex] : scriptureData?.text;
          const cleanHebrew = typeof hebrew === 'string' ? hebrew.replace(/<[^>]*>?/gm, '') : '';
          const cleanEnglish = typeof english === 'string' ? english.replace(/<[^>]*>?/gm, '') : '';
          
          content = `I am reading ${activeRef.book} ${activeRef.chapter}:${activeRef.verse || '1'}. Hebrew: "${cleanHebrew}". English: "${cleanEnglish}". Please explain this verse.`;
          label = `Verse: ${activeRef.book} ${activeRef.chapter}:${activeRef.verse || '1'}`;
          setActiveContext({ type: 'verse', content, label });
      } 
      else if (type === 'word' && selectedWord) {
          content = `I am studying the Hebrew word "${selectedWord.text}" (Clean: ${selectedWord.cleanText}). Definition: ${selectedWord.aiDefinition?.definition || 'Unknown'}. Root: ${selectedWord.aiDefinition?.root || 'Unknown'}. What is the deeper spiritual meaning of this word?`;
          label = `Word: ${selectedWord.text}`;
          setActiveContext({ type: 'word', content, label });
      }
      else if (type === 'picto' && selectedWord) {
          content = `Analyze the Paleo-Hebrew pictographs for the word "${selectedWord.cleanText}". Break it down letter by letter and explain the story the pictures tell.`;
          label = `Pictographs: ${selectedWord.text}`;
          setActiveContext({ type: 'picto', content, label });
      }
      else if (type === 'summary') {
          // Immediate send for summary
          setChatInput("Can you please summarize our study session and the key insights we discussed?");
          handleChatSubmit(); // Auto submit
      }
  };

  const handleNavigate = (ref: string) => {
    // Expected formats: "Genesis 1:1", "1 Samuel 2:3", "Psalms 23"
    // Heuristic: Last space separates Book from Chapter:Verse
    const lastSpaceIndex = ref.lastIndexOf(' ');
    if (lastSpaceIndex === -1) return;

    const bookPart = ref.substring(0, lastSpaceIndex);
    const numPart = ref.substring(lastSpaceIndex + 1);

    // Normalize Book Name (basic check against BIBLE_BOOKS)
    // Sefaria API expects "I Samuel" for "1 Samuel". 
    // Let's do a quick mapping or just try best effort.
    let targetBook = BIBLE_BOOKS.find(b => b.toLowerCase() === bookPart.toLowerCase()) || bookPart;
    
    // Handle "1 Samuel" -> "I Samuel" conversion if needed for Sefaria
    if (targetBook.startsWith('1 ')) targetBook = targetBook.replace('1 ', 'I ');
    if (targetBook.startsWith('2 ')) targetBook = targetBook.replace('2 ', 'II ');
    if (targetBook === "Psalm" || targetBook === "Psalms") targetBook = "Psalms";

    const [chapterStr, verseStr] = numPart.split(':');
    const chapter = parseInt(chapterStr);
    const verse = verseStr ? verseStr : "";

    setSelectedBook(targetBook);
    if (!isNaN(chapter)) {
        setSelectedChapter(chapter);
        if (verse) setSelectedVerse(verse);
        else setSelectedVerse('');
        
        fetchScripture(targetBook, chapter);
    }
  };

  const handleChapterNav = (direction: 'next' | 'prev') => {
    const currentBookIndex = BIBLE_BOOKS.indexOf(selectedBook);
    const maxCh = BIBLE_DATA[selectedBook] || 50;
    
    if (direction === 'next') {
        if (selectedChapter < maxCh) {
            // Next Chapter in Same Book
            const next = selectedChapter + 1;
            setSelectedChapter(next);
            fetchScripture(selectedBook, next);
        } else if (currentBookIndex < BIBLE_BOOKS.length - 1) {
            // Next Book, Chapter 1
            const nextBook = BIBLE_BOOKS[currentBookIndex + 1];
            setSelectedBook(nextBook);
            setSelectedChapter(1);
            fetchScripture(nextBook, 1);
        }
    } else {
        if (selectedChapter > 1) {
            // Prev Chapter in Same Book
            const prev = selectedChapter - 1;
            setSelectedChapter(prev);
            fetchScripture(selectedBook, prev);
        } else if (currentBookIndex > 0) {
            // Prev Book, Last Chapter
            const prevBook = BIBLE_BOOKS[currentBookIndex - 1];
            const prevBookMaxCh = BIBLE_DATA[prevBook];
            setSelectedBook(prevBook);
            setSelectedChapter(prevBookMaxCh);
            fetchScripture(prevBook, prevBookMaxCh);
        }
    }
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

      // GUEST RESTRICTION: Only Genesis Chapter 1, Verses 1-4 allowed for hover
      const isGenesis1 = activeRef.book === 'Genesis' && activeRef.chapter === 1;
      const isFirstFour = verseIndex < 4; // 0, 1, 2, 3 (Verses 1-4)
      
      if (!isAdmin && (!isGenesis1 || !isFirstFour)) {
          return;
      }

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
             // GUEST RESTRICTION IN HOVER POPUP:
             // Only Aleph ('א') is visible. Others are blurred.
             const isAleph = char === 'א';
             const isRestricted = !isAdmin && !isAleph;
             const blurStyle = isRestricted ? 'filter: blur(4px); opacity: 0.3;' : '';

             sequenceHtml += `<div class="popup-card"><span class="popup-img" style="${blurStyle}">${data.emoji}</span><span class="popup-letter">${char}</span></div>`;
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

  // Logic variables for Next/Prev Buttons
  const currentBookIndex = BIBLE_BOOKS.indexOf(selectedBook);
  const prevBookName = currentBookIndex > 0 ? BIBLE_BOOKS[currentBookIndex - 1] : null;
  const nextBookName = currentBookIndex < BIBLE_BOOKS.length - 1 ? BIBLE_BOOKS[currentBookIndex + 1] : null;
  
  // Show Prev if: Chapter > 1 OR (Chapter == 1 AND Not Genesis)
  const showPrevButton = selectedChapter > 1 || (selectedChapter === 1 && prevBookName);
  
  // Show Next if: Chapter < Max OR (Chapter == Max AND Not Malachi)
  const showNextButton = selectedChapter < maxChapters || (selectedChapter === maxChapters && nextBookName);

  if (showLanding) {
    return (
      <div className={`landing-mode`}>
        
        {/* Navigation - Top Right */}
        <nav className="landing-nav">
            <a onClick={() => scrollToSection('about')} className="landing-link cursor-pointer">ABOUT</a>
            <a onClick={() => scrollToSection('features')} className="landing-link cursor-pointer">FEATURES</a>
            <a onClick={() => scrollToSection('pricing')} className="landing-link cursor-pointer">PRICING</a>
            <a onClick={() => scrollToSection('contact')} className="landing-link cursor-pointer">CONTACT</a>
            <button onClick={triggerLoginLock} className="login-btn no-underline">LOGIN</button>
        </nav>

        {/* Particles Container (Fixed to Viewport) */}
        <div className="particle" style={{ left: '10%', top: '20%', animationDuration: '25s' }}></div>
        <div className="particle" style={{ left: '30%', top: '50%', animationDuration: '18s' }}></div>
        <div className="particle" style={{ left: '70%', top: '30%', animationDuration: '22s' }}></div>
        <div className="particle" style={{ left: '80%', top: '80%', animationDuration: '30s' }}></div>
        <div className="light-streak"></div>

        {/* --- SECTION 1: HERO (Original Landing) --- */}
        <section id="home" className="landing-section">
            <div className="flex flex-col items-center z-10 w-full max-w-4xl px-4 text-center justify-center">
                
                <h1 className="landing-title text-5xl md:text-7xl">GENESIS</h1>
                <p className="landing-subtitle text-[10px] md:text-xs">STUDY SUITE /// V3.0</p>
                
                <div className="landing-inputs justify-center">
                    <input 
                        type="text" 
                        placeholder="ENTER AGENT NAME" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value.toUpperCase())} 
                        className="landing-input text-center max-w-xs" 
                    />
                    {/* Theme Selector Removed as per request */}
                </div>

                {/* 3D Cross */}
                {settings.showHologram && (
                    <div className="scene-3d">
                        <div className="cross-group">
                            <div className="face face-composite front"></div>
                            <div className="face face-composite back"></div>
                            <div className="side side-v-top"></div>
                            <div className="side side-v-bottom"></div>
                            <div className="side side-v-left-top"></div>
                            <div className="side side-v-left-bottom"></div>
                            <div className="side side-v-right-top"></div>
                            <div className="side side-v-right-bottom"></div>
                            <div className="side side-h-end-left"></div>
                            <div className="side side-h-end-right"></div>
                            <div className="side side-h-top-left"></div>
                            <div className="side side-h-bottom-left"></div>
                            <div className="side side-h-top-right"></div>
                            <div className="side side-h-bottom-right"></div>
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleInitialize} 
                    disabled={!username.trim()} 
                    className="mt-8 reactor-button px-10 py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    INITIALIZE SYSTEM (GUEST)
                </button>
            </div>
            
             {/* Footer - Only visible on the first screen if nice, but we might want it at bottom */}
            <div className="absolute bottom-10 right-10 hidden md:flex flex-col items-end gap-3 z-20">
                <span className="copyright">© 2024 Genesis Study, Inc.</span>
            </div>
        </section>

        {/* --- SECTION 2: ABOUT (UPDATED TEXT) --- */}
        <section id="about" className="landing-section bg-black/40 backdrop-blur-sm border-t border-white/5">
             <div className="max-w-3xl text-center space-y-8">
                 <h2 className="cinzel-font text-3xl md:text-5xl text-white tracking-widest mb-6">Our Mission</h2>
                 <p className="text-lg md:text-xl text-[#a0a8c0] font-light leading-relaxed font-serif">
                    The Genesis Suite is a sanctuary for clarity. We exist to bridge the distance between ancient Hebrew wisdom and modern understanding.
                 </p>
                 <p className="text-lg md:text-xl text-[#a0a8c0] font-light leading-relaxed font-serif">
                    By uniting the original manuscripts with elegant technology, we offer a distraction-free space where the text can speak for itself—undisturbed, precise, and profoundly clear.
                 </p>
                 <div className="pt-10">
                     <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[var(--color-accent-secondary)] to-transparent mx-auto"></div>
                 </div>
             </div>
        </section>

        {/* --- SECTION 3: FEATURES (Glass Cards Slider) --- */}
        <section id="features" className="landing-section border-t border-white/5 bg-black/20">
             <h2 className="cinzel-font text-3xl md:text-4xl text-white tracking-widest mb-16 text-center">System Capabilities</h2>
             
             <div className="w-full max-w-6xl px-4 overflow-x-auto pb-12 pt-4 flex gap-6 snap-x scrollbar-hide">
                 {/* ... Features content ... */}
                 {/* Feature 1: Linguistic Analysis (FIXED: Cyan colors) */}
                 <div className="gloss-card min-w-[300px] md:min-w-[350px] snap-center flex flex-col gap-4">
                     <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
                         <CpuChipIcon className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-white tech-font uppercase tracking-wider">Linguistic Analysis</h3>
                     <p className="text-sm text-[#a0a8c0] leading-relaxed">
                         Instant, in-depth analysis of Hebrew morphology, roots, and definitions powered by generative AI.
                     </p>
                 </div>

                 {/* Feature 2: Paleo-Hebrew (FIXED: Violet/Purple colors) */}
                 <div className="gloss-card min-w-[300px] md:min-w-[350px] snap-center flex flex-col gap-4">
                     <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/30 text-violet-400">
                         <LightBulbIcon className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-white tech-font uppercase tracking-wider">Paleo-Hebrew Visualization</h3>
                     <p className="text-sm text-[#a0a8c0] leading-relaxed">
                         A visual breakdown of ancient letter meanings, revealing the concrete imagery behind abstract concepts.
                     </p>
                 </div>

                 {/* Feature 3: AI Companion */}
                 <div className="gloss-card min-w-[300px] md:min-w-[350px] snap-center flex flex-col gap-4">
                     <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30 text-purple-400">
                         <ChatBubbleLeftRightIcon className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-white tech-font uppercase tracking-wider">Intelligent Companion</h3>
                     <p className="text-sm text-[#a0a8c0] leading-relaxed">
                         An empathetic, context-aware AI assistant capable of answering complex theological inquiries with precision.
                     </p>
                 </div>

                 {/* Feature 4: Personal Archives */}
                 <div className="gloss-card min-w-[300px] md:min-w-[350px] snap-center flex flex-col gap-4">
                     <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                         <ShieldCheckIcon className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-white tech-font uppercase tracking-wider">Personal Archives</h3>
                     <p className="text-sm text-[#a0a8c0] leading-relaxed">
                         Securely save your insights and build a personal library of revelations within a digital vault.
                     </p>
                 </div>

                 {/* Feature 5: Voice Synthesis */}
                 <div className="gloss-card min-w-[300px] md:min-w-[350px] snap-center flex flex-col gap-4">
                     <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/30 text-orange-400">
                         <SpeakerWaveIcon className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-white tech-font uppercase tracking-wider">Voice Synthesis</h3>
                     <p className="text-sm text-[#a0a8c0] leading-relaxed">
                         High-fidelity text-to-speech capabilities for accurate Hebrew pronunciation and immersive listening.
                     </p>
                 </div>

                 {/* Feature 6: Export Studio */}
                 <div className="gloss-card min-w-[300px] md:min-w-[350px] snap-center flex flex-col gap-4">
                     <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/30 text-pink-400">
                         <SwatchIcon className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-white tech-font uppercase tracking-wider">Export Studio</h3>
                     <p className="text-sm text-[#a0a8c0] leading-relaxed">
                         Create, customize, and export elegant visual cards to share your favorite verses and spiritual insights.
                     </p>
                 </div>
             </div>
        </section>

        {/* --- SECTION 4: PRICING (New) --- */}
        <section id="pricing" className="landing-section border-t border-white/5 bg-black/40 backdrop-blur-sm">
             <div className="flex flex-col items-center mb-16 text-center px-4">
                 <p className="text-xs tech-font text-[var(--color-accent-secondary)] uppercase tracking-[0.3em] mb-4">Mission Packages</p>
                 <h2 className="cinzel-font text-3xl md:text-5xl text-white tracking-widest mb-6">Choose Your Path</h2>
                 <p className="text-lg md:text-xl text-[#a0a8c0] font-light leading-relaxed font-serif max-w-2xl">
                    From standard scrolls to infinite wisdom, select the perfect tier that matches your thirst for knowledge.
                 </p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl px-4">
                 {/* Tier 1: The Scroll */}
                 <div className="pricing-card">
                     <h3 className="text-2xl font-bold text-white mb-2">The Scroll</h3>
                     <p className="text-sm text-[#a0a8c0] mb-6">For casual visitors starting their journey.</p>
                     <div className="text-4xl font-bold text-white mb-8">$0 <span className="text-sm font-normal text-[#a0a8c0]">/ month</span></div>
                     
                     <div className="space-y-4 mb-8 flex-grow">
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300">Basic Hebrew Decoding</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300">Standard Pictograph View</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300">Dictionary Access</span>
                         </div>
                         <div className="flex items-start gap-3 opacity-50">
                             <XCircleIcon className="w-5 h-5 pricing-x" />
                             <span className="text-sm text-gray-500">No Rabbi AI Chatbot</span>
                         </div>
                         <div className="flex items-start gap-3 opacity-50">
                             <XCircleIcon className="w-5 h-5 pricing-x" />
                             <span className="text-sm text-gray-500">Standard Voice Only</span>
                         </div>
                     </div>
                     
                     <button 
                        onClick={handleInitialize}
                        disabled={!username.trim()} 
                        className="w-full py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         Access Guest Mode
                     </button>
                 </div>

                 {/* Tier 2: The Temple (Most Popular) */}
                 <div className="pricing-card pricing-popular transform scale-105 z-10">
                     <div className="popular-badge">Most Popular</div>
                     <h3 className="text-2xl font-bold text-white mb-2">The Temple</h3>
                     <p className="text-sm text-[#a0a8c0] mb-6">For serious students seeking deeper revelation.</p>
                     <div className="text-4xl font-bold text-white mb-8">$15 <span className="text-sm font-normal text-[#a0a8c0]">/ month</span></div>
                     
                     <div className="space-y-4 mb-8 flex-grow">
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300"><strong>Rabbi AI Chatbot</strong> (15/day)</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300"><strong>Neural Voice</strong> (50 verses/day)</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300"><strong>Card Studio</strong> (5 exports/day)</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300">Full Morphology Analysis</span>
                         </div>
                     </div>
                     
                     <button 
                        onClick={triggerLoginLock}
                        className="w-full py-3 rounded-lg bg-[var(--color-accent-secondary)] text-black font-bold hover:brightness-110 transition-colors text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,210,255,0.3)]"
                     >
                         Join The Temple
                     </button>
                 </div>

                 {/* Tier 3: The Heavens */}
                 <div className="pricing-card">
                     <h3 className="text-2xl font-bold text-white mb-2">The Heavens</h3>
                     <p className="text-sm text-[#a0a8c0] mb-6">Unlimited access for true power users.</p>
                     <div className="text-4xl font-bold text-white mb-8">$30 <span className="text-sm font-normal text-[#a0a8c0]">/ month</span></div>
                     
                     <div className="space-y-4 mb-8 flex-grow">
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300"><strong>Unlimited</strong> Rabbi AI Chat</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300"><strong>Unlimited</strong> Neural Voice</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300"><strong>Unlimited</strong> 4K Exports</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300">Beta Access (Video Gen)</span>
                         </div>
                         <div className="flex items-start gap-3">
                             <CheckCircleIcon className="w-5 h-5 pricing-check" />
                             <span className="text-sm text-gray-300">Priority Support</span>
                         </div>
                     </div>
                     
                     <button 
                        onClick={triggerLoginLock}
                        className="w-full py-3 rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
                     >
                         Ascend Higher
                     </button>
                 </div>
             </div>
        </section>

        {/* --- SECTION 5: CONTACT --- */}
        <section id="contact" className="landing-section border-t border-white/5 bg-black/60 backdrop-blur-md">
             <div className="max-w-2xl w-full flex flex-col items-center">
                 <h2 className="cinzel-font text-3xl md:text-4xl text-white tracking-widest mb-4">Direct Contact</h2>
                 <p className="text-xs tech-font uppercase tracking-[0.3em] text-[var(--color-accent-secondary)] mb-12">Submit Priority Request</p>
                 
                 <form className="w-full space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <input type="text" placeholder="FULL NAME" className="luxury-input" />
                         <input type="email" placeholder="OFFICIAL EMAIL" className="luxury-input" />
                     </div>
                     <textarea placeholder="NATURE OF INQUIRY" className="luxury-input resize-none h-32"></textarea>
                     
                     <div className="flex justify-center pt-8">
                         <button type="button" className="electric-gradient px-12 py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase text-white hover:scale-105 transition-transform flex items-center gap-3">
                             <EnvelopeIcon className="w-4 h-4" />
                             Transmit
                         </button>
                     </div>
                 </form>
             </div>
        </section>

        {/* --- SECTION 6: LOGIN OVERLAY (REPLACED) --- */}
        {isLoginVisible && (
        <div className="fixed inset-0 z-[200] bg-[#000000]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
             <div className="max-w-md w-full bg-[#0a0a14] border border-white/10 p-10 rounded-3xl shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-accent-secondary)] to-transparent"></div>
                 
                 <button onClick={unlockLoginScroll} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors" title="Close Login">
                     <XMarkIcon className="w-6 h-6" />
                 </button>

                 <div className="text-center mb-10">
                     <h2 className="cinzel-font text-2xl text-white tracking-widest mb-2">Admin Login</h2>
                     <p className="text-[10px] tech-font uppercase tracking-widest text-white/40">Secure Access Terminal</p>
                 </div>
                 
                 <form onSubmit={handleLogin} className="space-y-6">
                     <div className="space-y-2">
                         <label className="text-[9px] uppercase tracking-widest text-[var(--color-accent-secondary)] font-bold">Admin Identity (Username)</label>
                         <div className="relative">
                             <input 
                                type="text" 
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--color-accent-secondary)] outline-none pl-10 transition-colors"
                                placeholder="ENTER USERNAME"
                             />
                             <CubeTransparentIcon className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                         </div>
                     </div>
                     
                     <div className="space-y-2">
                         <label className="text-[9px] uppercase tracking-widest text-[var(--color-accent-secondary)] font-bold">Passkey</label>
                         <div className="relative">
                             <input 
                                type="password" 
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[var(--color-accent-secondary)] outline-none pl-10 transition-colors"
                             />
                             <ShieldCheckIcon className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                         </div>
                     </div>

                     <button type="submit" className="w-full mt-4 electric-gradient py-4 rounded-lg text-xs font-bold tracking-[0.2em] uppercase text-white hover:brightness-110 transition-all">
                         Authenticate
                     </button>
                 </form>

                 <div className="mt-8 text-center flex flex-col gap-2">
                     <a href="#" className="text-[9px] tech-font uppercase tracking-widest text-white/30 hover:text-white transition-colors">Recover Access Credentials</a>
                     <button onClick={unlockLoginScroll} className="text-[9px] tech-font uppercase tracking-widest text-red-400 hover:text-white transition-colors mt-2">Cancel / Close</button>
                 </div>
             </div>
        </div>
        )}
        
        {/* Back to Top Button */}
        {!isScrollLocked && (
            <button 
                onClick={() => scrollToSection('home')}
                className="fixed bottom-8 left-8 z-50 bg-white/5 border border-white/10 p-3 rounded-full hover:bg-white/10 hover:border-[var(--color-accent-secondary)] transition-all group backdrop-blur-md"
                title="Return to Top"
            >
                <ChevronUpIcon className="w-5 h-5 text-white/50 group-hover:text-[var(--color-accent-secondary)]" />
            </button>
        )}

        {/* Persistent Footer */}
        <footer className="landing-footer">
            <div className="social-icons">
                <svg className="social-icon" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <svg className="social-icon" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                <svg className="social-icon" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.073-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span className="copyright">© 2022 Genesis Study, Inc.</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full cosmic-bg text-[#a0a8c0] overflow-hidden flex flex-col p-0 md:p-6 gap-0 md:gap-6 relative">
      <div id="hover-popup"></div>
      
      {/* DICTIONARY OVERLAY */}
      {isDictionaryOpen && (
        <LetterDictionary 
            onClose={() => setIsDictionaryOpen(false)} 
            targetChar={dictionaryTargetChar} 
            voiceGender={settings.voiceGender} 
            enableTTS={settings.enableTTS}
            isGuest={!isAdmin} // Pass guest status
        />
      )}

      {/* --- AI CHAT WIDGET (VISIBLE FOR EVERYONE) --- */}
      <button 
        id="aiChatTrigger" 
        className="chat-trigger-btn" 
        onClick={() => setIsChatOpen(!isChatOpen)}
        title="Open Rabbi AI Chat"
      >
        <ChatBubbleLeftRightIcon className="w-8 h-8" />
      </button>

      {/* ... Chat Window ... */}
      {isChatOpen && (
        <div 
            id="aiChatWindow" 
            className="chat-window-container flex flex-col"
            style={isChatMaximized ? { width: '100vw', height: '100dvh', bottom: 0, right: 0, borderRadius: 0 } : {}}
        >
            <div className="chat-header">
                <div className="chat-title">
                    <span className={`chat-status ${!isAdmin ? 'bg-red-500 shadow-red-500' : ''}`}></span>
                    Rabbi AI {!isAdmin && '(Locked)'}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsChatMaximized(!isChatMaximized)} className="close-chat-btn" title="Toggle Maximize">
                        {isChatMaximized ? <ArrowsPointingInIcon className="w-5 h-5" /> : <ArrowsPointingOutIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsChatOpen(false)} className="close-chat-btn"><XMarkIcon className="w-6 h-6" /></button>
                </div>
            </div>

            <div id="chatMessages" className="chat-messages-area custom-scrollbar">
                {chatMessages.map((msg, i) => (
                    <div key={i} className={msg.role === 'ai' ? 'ai-message' : 'user-message'}>
                        {msg.role === 'user' && msg.contextLabel && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                                <span className="text-[10px] uppercase tracking-widest text-white/70 flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded">
                                    <PaperClipIcon className="w-3 h-3" /> 
                                    Attached: {msg.contextLabel}
                                </span>
                            </div>
                        )}
                        {msg.parts ? (
                            msg.parts.map((part, pIdx) => {
                                if (part.type === 'text') return <div key={pIdx} className="markdown-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(part.content) }} />;
                                if (part.type === 'button') return <button key={pIdx} className="chat-suggestion-chip" onClick={() => handleNavigate(part.ref)}><strong>{part.ref}</strong> {part.desc}</button>;
                                return null;
                            })
                        ) : (
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
                        )}
                    </div>
                ))}
                {isChatThinking && <div className="ai-message opacity-50 animate-pulse">Thinking...</div>}
                <div ref={chatEndRef} />
            </div>

            {activeContext && (
                <div className="context-preview-area">
                    <div className="context-chip">
                        <span className="font-bold uppercase tracking-wider text-[9px]">{activeContext.label}</span>
                        <XMarkIcon className="w-3 h-3 context-chip-close" onClick={() => setActiveContext(null)} />
                    </div>
                </div>
            )}

            <div className="chat-input-area">
                {/* ... Chat Input ... */}
                {contextMenuOpen && (
                    <div className="context-menu">
                        <div className="text-[9px] uppercase tracking-widest text-white/30 px-4 py-2 border-b border-white/5 bg-black/20">Attach Context</div>
                        <div className={`context-menu-item ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => handleContextSelect('verse')}><BookOpenIcon className="w-4 h-4" /><span>Current Verse { !isAdmin && <LockClosedIcon className="w-3 h-3 inline ml-2" />}</span></div>
                        <div className={`context-menu-item ${!selectedWord || !isAdmin ? 'disabled' : ''} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => selectedWord && handleContextSelect('word')}><LanguageIcon className="w-4 h-4" /><span>Selected Word { !isAdmin && <LockClosedIcon className="w-3 h-3 inline ml-2" />}</span></div>
                        <div className={`context-menu-item ${!selectedWord || !isAdmin ? 'disabled' : ''} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => selectedWord && handleContextSelect('picto')}><SparklesIcon className="w-4 h-4" /><span>Pictographs { !isAdmin && <LockClosedIcon className="w-3 h-3 inline ml-2" />}</span></div>
                        <div className={`context-menu-item ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => handleContextSelect('summary')}><DocumentTextIcon className="w-4 h-4" /><span>Summary { !isAdmin && <LockClosedIcon className="w-3 h-3 inline ml-2" />}</span></div>
                    </div>
                )}
                <button onClick={() => setContextMenuOpen(!contextMenuOpen)} className={`chat-context-btn ${contextMenuOpen ? 'bg-white/10 text-white border-white' : ''}`}><PlusIcon className="w-5 h-5" /></button>
                <input type="text" placeholder={isAdmin ? "Ask a question..." : "Login required to access Rabbi AI"} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()} disabled={isChatThinking || !isAdmin} />
                <button onClick={handleChatSubmit} disabled={isChatThinking || (!chatInput.trim() && !activeContext) || !isAdmin}><PaperAirplaneIcon className="w-5 h-5" /></button>
            </div>
        </div>
      )}

      {/* Main Content */}
      <header className="hidden md:flex justify-between items-center py-2 px-4 border-b border-[var(--color-accent-primary)]/20 bg-[var(--color-accent-primary)]/5 rounded-2xl mb-2 backdrop-blur-sm"><h1 className="cinzel-font text-xl text-white font-bold tracking-widest cyan-glow">GENESIS <span className="text-[var(--color-accent-secondary)] mx-2">//</span> {username}</h1><div className="flex items-center gap-4">{Object.values(scanStatuses).some(s => s === 'scanning') && (<div className="flex items-center gap-2 text-[10px] tech-font uppercase tracking-widest text-[var(--color-accent-secondary)]"><span className="w-2 h-2 bg-[var(--color-accent-secondary)] rounded-full animate-ping"></span>Gemini Uplink Active</div>)}<div className="text-[10px] tech-font uppercase tracking-widest text-[#a0a8c0]/60">System Online</div></div></header>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 relative max-w-[1920px] mx-auto w-full h-full">
        <section className={getPanelClass('nav')}><div className="panel-header"><h2 className="cinzel-font text-[var(--color-accent-secondary)] tracking-widest text-xs font-bold flex items-center gap-2"><Bars3Icon className="w-4 h-4" /> Codex</h2><div className="window-controls"><button onClick={() => setIsSettingsOpen(true)} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors"><Cog6ToothIcon className="w-4 h-4" /></button><button onClick={() => toggleMaximize('nav')} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors">{maximizedPanel === 'nav' ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}</button></div></div>
        
        {/* Nav Panel Content... */}
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

        <section className={getPanelClass('reader')}><div className="panel-header"><h2 className="cinzel-font text-[var(--color-accent-secondary)] tracking-widest text-xs font-bold flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> Scripture</h2><div className="window-controls"><div className="flex items-center gap-1 border-r border-[var(--color-accent-primary)]/20 pr-2 mr-2"><button onClick={() => handleChapterNav('prev')} disabled={!showPrevButton} className="p-1 text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] disabled:opacity-30 disabled:hover:text-[#a0a8c0] transition-colors"><ChevronLeftIcon className="w-4 h-4" /></button><span className="text-[10px] font-mono text-[var(--color-accent-secondary)] w-6 text-center">{selectedChapter}</span><button onClick={() => handleChapterNav('next')} disabled={!showNextButton} className="p-1 text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] disabled:opacity-30 disabled:hover:text-[#a0a8c0] transition-colors"><ChevronRightIcon className="w-4 h-4" /></button></div><button onClick={toggleReaderMode} className={`transition-colors p-1 ${isReaderMode ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0] hover:text-white'}`} title={isReaderMode ? "Reader Mode Active" : "Interlinear Mode"}><BookOpenIcon className="w-4 h-4 md:w-5 md:h-5" /></button><div className="w-[1px] h-4 bg-[var(--color-accent-primary)]/20 mx-1"></div><button onClick={cycleFontSize} className="font-serif font-bold text-xs md:text-sm text-[#a0a8c0] hover:text-white transition-colors flex items-end leading-none" title="Toggle Font Size">T<span className="text-[0.8em]">t</span></button><div className="w-[1px] h-4 bg-[var(--color-accent-primary)]/20 mx-1"></div><button onClick={toggleHover} className={`transition-colors p-1 ${isHoverEnabled ? 'text-[var(--color-accent-secondary)]' : 'text-[#a0a8c0] hover:text-white'}`} title={isHoverEnabled ? "Disable Hover Decoder" : "Enable Hover Decoder"}><CursorArrowRaysIcon className="w-4 h-4 md:w-5 md:h-5" /></button><div className="w-[1px] h-4 bg-[var(--color-accent-primary)]/20 mx-1"></div><button onClick={() => toggleMaximize('reader')} className="text-[#a0a8c0] hover:text-[var(--color-accent-secondary)] transition-colors">{maximizedPanel === 'reader' ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}</button></div></div>
        
        <div className="reader-content flex-1 overflow-y-auto p-4 md:p-12 relative scroll-smooth">
            {loading && (<div className="h-full flex flex-col items-center justify-center gap-6"><div className="w-16 h-16 border-2 border-[var(--color-accent-secondary)] border-t-transparent rounded-full animate-spin"></div><span className="tech-font text-xs uppercase tracking-[0.3em] text-[var(--color-accent-secondary)] animate-pulse">Receiving Transmission...</span></div>)}
            {!scriptureData && !loading && (<div className="h-full flex flex-col items-center justify-center text-[#a0a8c0] opacity-50"><BookOpenIcon className="w-20 h-20 mb-6 stroke-1 text-[var(--color-accent-primary)]" /><p className="tech-font text-sm uppercase tracking-[0.2em]">Select text to begin</p></div>)}
            {scriptureData && !loading && (
                <div className="max-w-4xl mx-auto space-y-16 animate-fadeIn pb-32">
                    <div className="text-center"><h2 className="text-2xl md:text-6xl font-normal text-white mb-4 cinzel-font tracking-widest cyan-glow">{activeRef.book} <span className="text-white ml-3">{activeRef.chapter}{activeRef.verse ? `:${activeRef.verse}` : ''}</span></h2><div className="h-[1px] w-32 md:w-48 bg-gradient-to-r from-transparent via-[var(--color-accent-secondary)] to-transparent mx-auto opacity-70"></div></div>
                    <div id="readerContent" className={`space-y-6 md:space-y-8 ${isReaderMode ? 'mode-reader' : ''}`}>
                        {hebrewVerses.map((verse, idx) => (<div key={idx} className="verse-block group relative p-4 md:p-8 border border-white/0 hover:border-[var(--color-accent-secondary)]/20 hover:bg-[var(--color-accent-primary)]/5 transition-all duration-500 rounded-2xl"><div className="flex gap-3 md:gap-4 items-start"><div className="flex-shrink-0 pt-1.5 md:pt-2 flex items-center"><button id={`btn-${idx}`} className={`ai-scan-btn ${scanStatuses[idx] === 'scanning' ? 'scanning-pulse' : ''} ${scanStatuses[idx] === 'complete' ? 'scan-success' : ''}`} onClick={() => scanVerse(idx, verse, englishVerses[idx]?.replace(/<[^>]*>?/gm, ''))} title={isAdmin ? "Analyze Verse with Gemini AI" : "Neural Link Offline // Login Required"} disabled={!isAdmin || scanStatuses[idx] === 'scanning' || window.IS_SCANNING}>{!isAdmin ? <LockClosedIcon className="w-4 h-4 text-white/30" /> : scanStatuses[idx] === 'scanning' ? '⏳' : scanStatuses[idx] === 'complete' ? '✅' : scanStatuses[idx] === 'error' ? '⚠️' : '⚡'}</button><span className={`${verseNumSizeClass} text-[var(--color-accent-secondary)] font-mono select-none px-2 py-1 rounded-md bg-[var(--color-accent-primary)]/10 h-fit`}>{activeRef.verse ? activeRef.verse : idx + 1}</span></div><div className="flex-grow"><p className={`english-line text-[#a0a8c0] font-light font-sans leading-loose mb-6 group-hover:text-white transition-colors ${englishSizeClass} ${isReaderMode ? '' : 'italic'}`}>{renderEnglishVerse(englishVerses[idx]?.replace(/<[^>]*>?/gm, ''), idx)}</p><div className="hebrew-line text-right border-t border-[var(--color-accent-primary)]/20 pt-4" dir="rtl">{renderHebrewVerse(verse, activeRef.verse ? activeRef.verse - 1 : idx)}</div></div></div></div>))}
                    </div>
                    
                    {/* SMART FOOTER NAVIGATION */}
                    <div className="pt-12 border-t border-[var(--color-accent-primary)]/20 flex justify-between items-center pb-8 gap-4">
                        {/* Prev Button */}
                        <div className="flex-1 flex justify-start">
                            {showPrevButton && (
                                <button 
                                    onClick={() => handleChapterNav('prev')} 
                                    className="group flex items-center gap-4 px-6 py-4 rounded-full bg-[var(--color-accent-primary)]/10 hover:bg-[var(--color-accent-primary)]/20 border border-[var(--color-accent-primary)]/30 hover:border-[var(--color-accent-secondary)] transition-all duration-300"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 text-[var(--color-accent-secondary)] group-hover:-translate-x-1 transition-transform" />
                                    <div className="flex flex-col items-start">
                                        <span className="tech-font text-[10px] uppercase tracking-[0.2em] text-white/60">Previous</span>
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">
                                            {selectedChapter > 1 ? "Previous Chapter" : `Return to ${prevBookName}`}
                                        </span>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Next Button */}
                        <div className="flex-1 flex justify-end">
                            {showNextButton && (
                                <button 
                                    onClick={() => handleChapterNav('next')} 
                                    className="group flex items-center gap-4 px-6 py-4 rounded-full bg-[var(--color-accent-primary)]/10 hover:bg-[var(--color-accent-primary)]/20 border border-[var(--color-accent-primary)]/30 hover:border-[var(--color-accent-secondary)] transition-all duration-300"
                                >
                                    <div className="flex flex-col items-end">
                                        <span className="tech-font text-[10px] uppercase tracking-[0.2em] text-white/60">Next</span>
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">
                                            {selectedChapter < maxChapters ? "Next Chapter" : `Begin ${nextBookName}`}
                                        </span>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-[var(--color-accent-secondary)] group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </section>

        <section className={getPanelClass('decoder')}>
          {/* ... Decoder Panel Content ... */}
          <div className="panel-header">
            <h2 className="cinzel-font text-[var(--color-accent-secondary)] tracking-widest text-xs font-bold flex items-center gap-2">
              <MagnifyingGlassIcon className="w-4 h-4" /> 
              {isAdmin ? "Rhema Scope" : "Word Definition"}
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
                  {maximizedPanel === 'decoder' ? <ArrowsPointingInIcon className="w-4 h-4" /> : <ArrowsPointingOutIcon className="w-4 h-4" />}</button>
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
              voiceGender={settings.voiceGender}
              enableTTS={settings.enableTTS}
              isGuest={!isAdmin} // Pass Guest Prop
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

      {/* Settings Modal (Simplified) */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ease-in-out flex items-end md:items-center justify-center ${isSettingsOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)}></div>
        
        {/* SETTINGS MODAL CONTAINER */}
        <div className={`
            bg-[#050714] border-t md:border border-[var(--color-accent-secondary)] shadow-[0_-10px_40px_rgba(0,0,0,0.9)] 
            flex flex-col 
            transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]
            absolute bottom-0 left-0 right-0 h-[85dvh] rounded-t-[2.5rem] 
            ${isSettingsOpen ? 'translate-y-0' : 'translate-y-full'}
            md:relative md:inset-auto md:transform-none md:w-[90vw] md:max-w-6xl md:h-[80vh] md:rounded-3xl
        `}>
             <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 sticky top-0 bg-[#050714] z-20 rounded-t-[2.5rem] md:rounded-t-3xl">
                <div className="flex items-center gap-3"><Cog6ToothIcon className="w-6 h-6 text-[var(--color-accent-secondary)] animate-spin-slow" /><h2 className="cinzel-font text-xl text-white tracking-widest">Configuration</h2></div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-3 bg-white/5 hover:bg-[var(--color-accent-primary)]/20 rounded-full text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-grow overflow-y-auto px-6 py-8 md:p-10 pb-32 md:pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  {/* PRISM CORE SECTION */}
                  <div className="flex flex-col gap-6">
                      <div className="glass-panel p-8 rounded-3xl relative bg-white/5 h-full">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-accent-secondary)]"></div>
                        <h3 className="flex items-center gap-2 text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest text-xs mb-6"><SwatchIcon className="w-4 h-4" /> Prism Core</h3>
                        <div className="overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                {THEME_ORDER.map((key) => {
                                  const theme = THEMES[key as keyof typeof THEMES];
                                  const isLocked = !isAdmin && (key === 'green' || key === 'gold');
                                  
                                  return (
                                    <button 
                                        key={key} 
                                        onClick={() => !isLocked && setSettings(s => ({...s, theme: key as any}))} 
                                        className={`relative h-24 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 ${settings.theme === key ? 'border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'border-transparent opacity-50 hover:opacity-100'} ${isLocked ? 'grayscale opacity-30 cursor-not-allowed pointer-events-none' : ''}`} 
                                        style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}
                                    >
                                        <span className="relative z-10 font-bold text-white text-xs uppercase tracking-wider">{theme.name.split(' ')[1]}</span>
                                        {settings.theme === key && <div className="absolute inset-0 bg-white/10"></div>}
                                        {isLocked && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl"><LockClosedIcon className="w-6 h-6 text-white/50" /></div>}
                                    </button>
                                  );
                                })}
                            </div>
                        </div>
                      </div>
                  </div>
                  
                  {/* ADVANCED SETTINGS (LOCKED FOR GUESTS VISUALLY) */}
                  <div className="flex flex-col gap-6 relative h-full">
                      {/* Visual Lock Overlay for Guests */}
                      {!isAdmin && (
                          <div className="absolute inset-0 z-50 bg-gray-900/10 backdrop-blur-[1px] rounded-3xl border border-white/5 flex items-center justify-center pointer-events-none">
                              {/* No text/icon needed, just the glass effect as requested */}
                          </div>
                      )}

                      {/* --- Voice Synthesis Settings --- */}
                      <div className={`glass-panel p-8 rounded-3xl relative bg-white/5 flex-1 flex flex-col ${!isAdmin ? 'opacity-50' : ''}`}>
                          <h3 className="flex items-center gap-2 text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest text-xs mb-6"><SpeakerWaveIcon className="w-4 h-4" /> Voice Synthesis</h3>
                          <div className="flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                  <span className="text-sm text-white/70">Enable TTS</span>
                                  <button 
                                      onClick={() => isAdmin && setSettings(s => ({...s, enableTTS: !s.enableTTS}))}
                                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableTTS ? 'bg-[var(--color-accent-secondary)]' : 'bg-white/10'}`}
                                  >
                                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.enableTTS ? 'left-7' : 'left-1'}`}></div>
                                  </button>
                              </div>
                              <div className="flex items-center justify-between">
                                  <span className="text-sm text-white/70">Voice Gender</span>
                                  <div className="flex bg-black/40 rounded-lg p-1">
                                      <button 
                                          onClick={() => isAdmin && setSettings(s => ({...s, voiceGender: 'male'}))}
                                          className={`px-4 py-2 rounded-md text-xs uppercase tracking-wider transition-colors ${settings.voiceGender === 'male' ? 'bg-white/10 text-white' : 'text-white/40'}`}
                                      >
                                          Male
                                      </button>
                                      <button 
                                          onClick={() => isAdmin && setSettings(s => ({...s, voiceGender: 'female'}))}
                                          className={`px-4 py-2 rounded-md text-xs uppercase tracking-wider transition-colors ${settings.voiceGender === 'female' ? 'bg-white/10 text-white' : 'text-white/40'}`}
                                      >
                                          Female
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* --- System Performance --- */}
                      <div className={`glass-panel p-8 rounded-3xl relative bg-white/5 flex-1 flex flex-col ${!isAdmin ? 'opacity-50' : ''}`}>
                          <h3 className="flex items-center gap-2 text-[var(--color-accent-secondary)] font-bold uppercase tracking-widest text-xs mb-6"><CpuChipIcon className="w-4 h-4" /> System Core</h3>
                          <div className="flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                  <span className="text-sm text-white/70">Holographic Projection</span>
                                  <button 
                                      onClick={() => isAdmin && setSettings(s => ({...s, showHologram: !s.showHologram}))}
                                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.showHologram ? 'bg-[var(--color-accent-secondary)]' : 'bg-white/10'}`}
                                  >
                                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.showHologram ? 'left-7' : 'left-1'}`}></div>
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
            </div>
        </div>
      </div>
      
      {isExportModalOpen && selectedWord && isAdmin && (
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