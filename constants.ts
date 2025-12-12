import { LetterMap } from './types';

export const DEFAULT_HEBREW_MAP: LetterMap = {
  'א': { char: 'א', name: 'Aleph', pictograph: 'Ox', meaning: 'Strength, Leader', emoji: '🐮' },
  'ב': { char: 'ב', name: 'Bet', pictograph: 'House, Tent', meaning: 'Family, In', emoji: '⛺' },
  'ג': { char: 'ג', name: 'Gimel', pictograph: 'Camel, Foot', meaning: 'Walk, Gather', emoji: '🐫' },
  'ד': { char: 'ד', name: 'Dalet', pictograph: 'Door, Path', meaning: 'Move, Hang', emoji: '🚪' },
  'ה': { char: 'ה', name: 'Hei', pictograph: 'Window, Behold', meaning: 'Reveal, Breath', emoji: '🧘' },
  'ו': { char: 'ו', name: 'Vav', pictograph: 'Nail, Hook', meaning: 'Add, Secure', emoji: '🪝' },
  'ז': { char: 'ז', name: 'Zayin', pictograph: 'Weapon, Cut', meaning: 'Food, Cut', emoji: '⚔️' },
  'ח': { char: 'ח', name: 'Chet', pictograph: 'Fence, Wall', meaning: 'Separate, Protect', emoji: '🚧' },
  'ט': { char: 'ט', name: 'Tet', pictograph: 'Basket, Snake', meaning: 'Surround, Twist', emoji: '🧺' },
  'י': { char: 'י', name: 'Yod', pictograph: 'Hand, Arm', meaning: 'Work, Throw', emoji: '💪' },
  'כ': { char: 'כ', name: 'Kaf', pictograph: 'Palm, Open', meaning: 'Bend, Allow', emoji: '✋' },
  'ל': { char: 'ל', name: 'Lamed', pictograph: 'Staff, Shepherd', meaning: 'Teach, Yoke', emoji: '🦯' },
  'מ': { char: 'מ', name: 'Mem', pictograph: 'Water, Chaos', meaning: 'Massive, Unknown', emoji: '🌊' },
  'נ': { char: 'נ', name: 'Nun', pictograph: 'Seed, Life', meaning: 'Continue, Heir', emoji: '🌱' },
  'ס': { char: 'ס', name: 'Samekh', pictograph: 'Prop, Support', meaning: 'Turn, Slow', emoji: '🪵' },
  'ע': { char: 'ע', name: 'Ayin', pictograph: 'Eye, See', meaning: 'Watch, Know', emoji: '👁️' },
  'פ': { char: 'פ', name: 'Pe', pictograph: 'Mouth, Speak', meaning: 'Blow, Scatter', emoji: '👄' },
  'צ': { char: 'צ', name: 'Tsade', pictograph: 'Fishhook, Hunt', meaning: 'Side, Trail', emoji: '🎣' },
  'ק': { char: 'ק', name: 'Qof', pictograph: 'Sun, Horizon', meaning: 'Circle, Time', emoji: '🌅' },
  'ר': { char: 'ר', name: 'Resh', pictograph: 'Head, Person', meaning: 'First, Top', emoji: '👤' },
  'ש': { char: 'ש', name: 'Shin', pictograph: 'Tooth, Consume', meaning: 'Sharp, Press', emoji: '🦷' },
  'ת': { char: 'ת', name: 'Tav', pictograph: 'Mark, Sign', meaning: 'Signal, Monument', emoji: '✝️' },
};

// Map final forms (Sofit) to their root letters
export const SOFIT_MAP: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ'
};

export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Samuel", "Kings", "Isaiah", "Jeremiah", "Ezekiel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Psalms", "Proverbs", "Job", "Song of Songs", "Ruth", "Lamentations", "Ecclesiastes",
  "Esther", "Daniel", "Ezra", "Nehemiah", "Chronicles"
];