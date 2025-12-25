
export interface LetterDefinition {
  char: string;
  name: string;
  pictograph: string;
  meaning: string;
  emoji: string;
  pronunciation?: string; // New field for static dictionary
}

export type LetterMap = Record<string, LetterDefinition>;

export interface ProcessedLetter extends LetterDefinition {
  originalChar: string;
  id: string;
}

export interface SefariaResponse {
  he: string[] | string;
  text: string[] | string;
  book: string;
  chapter: number;
}

export interface WordData {
  text: string;
  cleanText: string;
  verseIndex: number;
}

export interface SefariaLexiconEntry {
  headword?: string;
  content?: {
    text?: string;
  };
  defs?: Array<{
    text?: string;
  }>;
}

export interface AiWordAnalysis {
  definition: string;
  english_match: string;
  root: string;
  transliteration?: string; // New field for AI analysis
  morphology?: string;
  reflection?: string;
}

export interface AiVerseData {
  [exactWord: string]: AiWordAnalysis;
}

// Flat structure as per new "Clean Logic" requirements
export type AiChapterData = Record<string, AiWordAnalysis>;

export interface SavedCard {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  wordText: string;
  wordData: WordData & { aiDefinition?: AiWordAnalysis };
  note: string;
  timestamp: number;
}

// Global augmentation
declare global {
  interface Window {
    VERSE_DATA: AiChapterData;
    IS_SCANNING: boolean;
    html2canvas: any;
    AUDIO_CACHE: Record<string, string>; // Global cache for TTS Base64 strings
  }
}
