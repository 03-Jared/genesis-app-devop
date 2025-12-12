export interface LetterDefinition {
  char: string;
  name: string;
  pictograph: string;
  meaning: string;
  emoji: string;
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