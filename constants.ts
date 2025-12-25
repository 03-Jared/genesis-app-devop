

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

// HELPER: Accurate Pronunciation Map for the 22 Letters
export const LETTER_AUDIO_MAP: Record<string, string> = {
    'א': 'אָלֶף', // Aleph
    'ב': 'בֵּית', // Bet
    'ג': 'גִּימֶל', // Gimel
    'ד': 'דָּלֶת', // Dalet
    'ה': 'הֵא',   // Hey
    'ו': 'וָו',   // Vav
    'ז': 'זַיִן', // Zayin
    'ח': 'חֵית', // Chet
    'ט': 'טֵית', // Tet
    'י': 'יוֹד', // Yod
    'כ': 'כַּף',  // Kaf
    'ל': 'לָמֶד', // Lamed
    'מ': 'מֵם',   // Mem
    'נ': 'נוּן',  // Nun
    'ס': 'סָמֶךְ', // Samekh
    'ע': 'עַיִן', // Ayin
    'פ': 'פֵּא',  // Pey
    'צ': 'צַדִי', // Tsade
    'ק': 'קוֹף', // Qof
    'ר': 'רֵישׁ', // Resh
    'ש': 'שִׁין', // Shin
    'ת': 'תָּו'   // Tav
};

export const GEMATRIA_VALUES: Record<string, number> = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
  'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100,
  'ר': 200, 'ש': 300, 'ת': 400,
  'ך': 500, 'ם': 600, 'ן': 700, 'ף': 800, 'ץ': 900 // Using extended values for final forms
};

export const BIBLE_DATA: Record<string, number> = {
  "Genesis": 50,
  "Exodus": 40,
  "Leviticus": 27,
  "Numbers": 36,
  "Deuteronomy": 34,
  "Joshua": 24,
  "Judges": 21,
  "Ruth": 4,
  "I Samuel": 31,
  "II Samuel": 24,
  "I Kings": 22,
  "II Kings": 25,
  "I Chronicles": 29,
  "II Chronicles": 36,
  "Ezra": 10,
  "Nehemiah": 13,
  "Esther": 10,
  "Job": 42,
  "Psalms": 150,
  "Proverbs": 31,
  "Ecclesiastes": 12,
  "Song of Songs": 8,
  "Isaiah": 66,
  "Jeremiah": 52,
  "Lamentations": 5,
  "Ezekiel": 48,
  "Daniel": 12,
  "Hosea": 14,
  "Joel": 3,
  "Amos": 9,
  "Obadiah": 1,
  "Jonah": 4,
  "Micah": 7,
  "Nahum": 3,
  "Habakkuk": 3,
  "Zephaniah": 3,
  "Haggai": 2,
  "Zechariah": 14,
  "Malachi": 4
};

export const BIBLE_BOOKS = Object.keys(BIBLE_DATA);

export const BIBLE_VERSE_COUNTS: Record<string, number[]> = {
  "Genesis": [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
  "Exodus": [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 37, 30, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
  "Leviticus": [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
  "Numbers": [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13],
  "Deuteronomy": [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12],
  "Joshua": [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33],
  "Judges": [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25],
  "Ruth": [22, 23, 18, 22],
  "I Samuel": [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13],
  "II Samuel": [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25],
  "I Kings": [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53],
  "II Kings": [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 18, 21, 26, 20, 37, 20, 30],
  "I Chronicles": [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30],
  "II Chronicles": [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23],
  "Ezra": [11, 70, 13, 24, 17, 22, 28, 36, 15, 44],
  "Nehemiah": [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31],
  "Esther": [22, 23, 15, 17, 14, 14, 10, 17, 32, 3],
  "Job": [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17],
  "Psalms": [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6],
  "Proverbs": [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31],
  "Ecclesiastes": [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14],
  "Song of Songs": [17, 17, 11, 16, 16, 13, 13, 14],
  "Isaiah": [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24],
  "Jeremiah": [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34],
  "Lamentations": [22, 22, 66, 22, 22],
  "Ezekiel": [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35],
  "Daniel": [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13],
  "Hosea": [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9],
  "Joel": [20, 32, 21],
  "Amos": [15, 16, 15, 13, 27, 14, 17, 14, 15],
  "Obadiah": [21],
  "Jonah": [17, 10, 10, 11],
  "Micah": [16, 13, 12, 13, 15, 16, 20],
  "Nahum": [15, 13, 19],
  "Habakkuk": [17, 20, 19],
  "Zephaniah": [18, 15, 20],
  "Haggai": [15, 23],
  "Zechariah": [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21],
  "Malachi": [14, 17, 18, 6]
};

// ============================================
// HEBREW LETTER DICTIONARY DATABASE
// ============================================
export const LETTER_DETAILS = [
  {
      char: 'א',
      name: 'Aleph',
      emoji: '🐮',
      pronunciation: "Ah-lef (Sounds like 'Olive')",
      summary: 'Ox Head: Strength, Leader, First',
      fullDetails: `
          <p>Aleph is the first letter of the Aleph-Bet. In its ancient pictographic form, it represents an <b>ox head</b>.</p>
          <p>Because the ox was the strongest animal in agrarian society, Aleph represents <b>strength, power, and leadership</b>. As the first letter, it often symbolizes God the Father, the ultimate source of strength and origin of all things.</p>
          <p>Numerically, it represents the number 1, symbolizing unity and primacy.</p>
      `
  },
  {
      char: 'ב',
      name: 'Bet',
      emoji: '⛺',
      pronunciation: "Bet (Sounds like 'Bed' with a T)",
      summary: 'Tent Floorplan: House, In, Inside',
      fullDetails: `
          <p>Bet is the picture of a nomadic tent floorplan. It represents the concept of a <b>house, dwelling, or household</b>.</p>
          <p>It is also the preposition "in" or "inside." Spiritually, it speaks to the idea of being inside the covenant or dwelling in God's presence.</p>
          <p>The very first word of the Bible, Bereshit (In the beginning), starts with Bet.</p>
      `
  },
  {
      char: 'ג',
      name: 'Gimel',
      emoji: '🐫',
      pronunciation: "Gi-mel (Hard G like 'Give')",
      summary: 'Camel: To Lift Up, Pride, Benefit',
      fullDetails: `
          <p>Gimel is represented by the <b>camel</b>, or specifically the camel's neck/head. The camel was a beast of burden that lifted up and carried goods.</p>
          <p>It signifies <b>lifting up, pride, or rendering a benefit</b>. It is related to the word <i>gemul</i>, meaning recompense or reward.</p>
          <p>Gimel walks (or runs) towards Dalet (the poor), symbolizing the rich running to give to the poor.</p>
      `
  },
  {
      char: 'ד',
      name: 'Dalet',
      emoji: '🚪',
      pronunciation: "Dah-let (Sounds like 'Doll' + 'et')",
      summary: 'Door: Path, Enter, Move',
      fullDetails: `
          <p>Dalet pictographically represents a <b>tent door</b>. It signifies the entrance, movement, or a pathway.</p>
          <p>It implies a decision to enter or exit. In a spiritual sense, it represents the <b>doorway to the heart</b> or the gate to revelation.</p>
          <p>It is also associated with humility, as a poor person (dal) hangs their head at the door.</p>
      `
  },
  {
      char: 'ה',
      name: 'Hei',
      emoji: '🧘',
      pronunciation: "Hay (Sounds like 'Hey')",
      summary: 'Man with Arms Raised: Behold, Reveal, Breath',
      fullDetails: `
          <p>Hei shows a person with arms raised, often shouting "Hey!" or "Behold!". It represents <b>revelation, breath, and divine spirit</b>.</p>
          <p>It is the sound of breathing (Hh), symbolizing the Spirit (Ruach) of God. When added to a word, it often imparts divine essence or makes it feminine.</p>
          <p>It appears twice in the Divine Name (YHVH), emphasizing God as the source of breath and life.</p>
      `
  },
  {
      char: 'ו',
      name: 'Vav',
      emoji: '🪝',
      pronunciation: "Vahv (Rhymes with 'Love' or 'Glove')",
      summary: 'Tent Peg: Add, Secure, Hook',
      fullDetails: `
          <p>Vav is a <b>tent peg or nail</b> used to secure the tent. Its function is to join things together.</p>
          <p>In Hebrew grammar, Vav is the conjunction "and". It connects heaven and earth, man and God. It represents <b>connection, security, and continuity</b>.</p>
          <p>It is the sixth letter, often associated with man (created on the 6th day).</p>
      `
  },
  {
      char: 'ז',
      name: 'Zayin',
      emoji: '⚔️',
      pronunciation: "Zah-yin (Rhymes with 'Lion')",
      summary: 'Mattock/Weapon: Cut, Food, Nourish',
      fullDetails: `
          <p>Zayin resembles a <b>mattock or agricultural weapon</b>. It implies cutting, harvesting, or defending.</p>
          <p>It is related to the word <i>zan</i>, meaning to feed or sustain. While it looks like a weapon, its root meaning is often about <b>sustenance and food</b> derived from the harvest.</p>
          <p>It symbolizes the sword of the spirit or the tool used to divide truth from lies.</p>
      `
  },
  {
      char: 'ח',
      name: 'Chet',
      emoji: '🚧',
      pronunciation: "Khet (Guttural 'CH' like Bach)",
      summary: 'Tent Wall: Separate, Protect, Life',
      fullDetails: `
          <p>Chet is the picture of a <b>tent wall</b> or fence. It signifies separation, protection, and a private enclosure.</p>
          <p>It is the first letter of <i>Chaim</i> (Life). It suggests that life requires boundaries and protection. It also represents a <b>sanctuary or inner room</b>.</p>
          <p>It separates the inside from the outside, the holy from the profane.</p>
      `
  },
  {
      char: 'ט',
      name: 'Tet',
      emoji: '🧺',
      pronunciation: "Tet (Rhymes with 'Set')",
      summary: 'Basket/Snake: Surround, Contain, Twist',
      fullDetails: `
          <p>Tet represents a <b>basket</b> or a coiling snake. It signifies surrounding, containing, or twisting.</p>
          <p>It can represent a womb (container of life) or a trap. It is associated with potential—either for good (tov) or hidden danger.</p>
          <p>It is the least used letter in the Bible but carries the meaning of <b>hidden goodness</b> stored up.</p>
      `
  },
  {
      char: 'י',
      name: 'Yod',
      emoji: '💪',
      pronunciation: "Yod (Rhymes with 'Road' or 'Code')",
      summary: 'Arm and Hand: Work, Throw, Worship',
      fullDetails: `
          <p>Yod is the <b>closed hand or arm</b>. It represents work, throwing, creating, and deed.</p>
          <p>It is the smallest letter but contains the power of creation. It signifies a finished work or a deed done.</p>
          <p>As the number 10, it represents divine order and the completed hand of God.</p>
      `
  },
  {
      char: 'כ',
      name: 'Kaf',
      emoji: '✋',
      pronunciation: "Kaf (Sounds like 'Cough')",
      summary: 'Open Palm: Bend, Open, Allow',
      fullDetails: `
          <p>Kaf is the <b>open palm</b> or the hollow of the hand. It represents bending, taming, or allowing.</p>
          <p>It signifies covering, as one covers their eyes or covers an object. It is the root of <i>kipur</i> (atonement/covering).</p>
          <p>It implies molding or shaping, as a potter shapes clay with the palm.</p>
      `
  },
  {
      char: 'ל',
      name: 'Lamed',
      emoji: '🦯',
      pronunciation: "Lah-med (Rhymes with 'Bed')",
      summary: 'Shepherd Staff: Teach, Yoke, Authority',
      fullDetails: `
          <p>Lamed is a <b>shepherd's staff</b>. It represents authority, teaching, urging, and direction.</p>
          <p>It is the tallest letter, reaching towards heaven. It signifies <b>learning and instruction</b>. To learn (lamad) is to be goaded in the right direction.</p>
          <p>It represents the King of kings, the ultimate Shepherd.</p>
      `
  },
  {
      char: 'מ',
      name: 'Mem',
      emoji: '🌊',
      pronunciation: "Mem (Rhymes with 'Them')",
      summary: 'Water: Chaos, Mighty, Unknown',
      fullDetails: `
          <p>Mem is the picture of <b>waves of water</b>. It represents massive liquid, chaos, or the unknown deep.</p>
          <p>It signifies <b>chaos from which life emerges</b>. It is the womb, the ocean, and the massive stream of time.</p>
          <p>It is the central letter of the Aleph-Bet, representing the flow of history.</p>
      `
  },
  {
      char: 'נ',
      name: 'Nun',
      emoji: '🌱',
      pronunciation: "Noon (Sounds like 'Noon')",
      summary: 'Seed/Sprout: Life, Heir, Continue',
      fullDetails: `
          <p>Nun represents a <b>seed or fish</b> darting through water. It signifies life, activity, and continuation.</p>
          <p>It represents the <b>heir</b> who continues the family line. It implies perpetuity and eternal life.</p>
          <p>In Aramaic, Nun means fish. It is the life that emerges from the Mem (water).</p>
      `
  },
  {
      char: 'ס',
      name: 'Samekh',
      emoji: '🪵',
      pronunciation: "Sah-mekh (Guttural 'KH' at end)",
      summary: 'Prop/Support: Turn, Protect, Grab',
      fullDetails: `
          <p>Samekh is a <b>prop or pillar</b> used for support. It also resembles a thorn that grabs hold.</p>
          <p>It represents <b>support, protection, and turning</b>. It is a circle representing an endless cycle or a shield.</p>
          <p>It supports the fallen (somekh noflim).</p>
      `
  },
  {
      char: 'ע',
      name: 'Ayin',
      emoji: '👁️',
      pronunciation: "Ah-yin (Sounds like 'Eye-in')",
      summary: 'Eye: Watch, Know, Experience',
      fullDetails: `
          <p>Ayin is the <b>eye</b>. It signifies seeing, watching, knowing, and experiencing.</p>
          <p>To see in Hebrew often means to understand or to experience personally. It represents <b>insight and perspective</b>.</p>
          <p>It acts as a fountain or spring (also ayin) that reflects what is above.</p>
      `
  },
  {
      char: 'פ',
      name: 'Pe',
      emoji: '👄',
      pronunciation: "Pay (Sounds like 'Pay')",
      summary: 'Mouth: Speak, Blow, Edge',
      fullDetails: `
          <p>Pe is the <b>mouth</b>. It represents speaking, blowing, and opening.</p>
          <p>It signifies the <b>power of speech</b> and communication. It can represent a sword (two-edged sword is literally "two-mouthed").</p>
          <p>It follows Ayin (eye), suggesting that we must see before we speak.</p>
      `
  },
  {
      char: 'צ',
      name: 'Tsade',
      emoji: '🎣',
      pronunciation: "Tsah-deh (Sounds like 'Pizza-day')",
      summary: 'Fishhook/Man on Side: Hunt, Desire, Trail',
      fullDetails: `
          <p>Tsade represents a <b>fishhook</b> or a man lying on his side. It signifies hunting, chasing, or desiring.</p>
          <p>It is the root of <i>tzadik</i> (righteous one). The righteous one hunts for God or is a "fisher of men".</p>
          <p>It implies a path or a trail being followed.</p>
      `
  },
  {
      char: 'ק',
      name: 'Qof',
      emoji: '🌅',
      pronunciation: "Kof (Sounds like 'Cough' but deeper)",
      summary: 'Sun on Horizon/Needle Eye: Circle, Time, Behind',
      fullDetails: `
          <p>Qof represents the <b>sun on the horizon</b> or the back of the head. It signifies a circle, revolution of time, or what is behind.</p>
          <p>It represents <b>holiness</b> (kadosh) in the sense of separation. It implies coming full circle.</p>
          <p>It can mean "to follow" or "to come after".</p>
      `
  },
  {
      char: 'ר',
      name: 'Resh',
      emoji: '👤',
      pronunciation: "Resh (Rhymes with 'Mesh')",
      summary: 'Head of Man: First, Top, Beginning',
      fullDetails: `
          <p>Resh is the <b>head of a person</b>. It represents the head, the top, the first, or the beginning.</p>
          <p>It implies <b>authority and priority</b>. Whatever is at the "resh" is the most important.</p>
          <p>It is the root of <i>rosh</i> (head) and <i>reshit</i> (beginning).</p>
      `
  },
  {
      char: 'ש',
      name: 'Shin',
      emoji: '🦷',
      pronunciation: "Sheen (Sounds like 'Sheen')",
      summary: 'Teeth: Consume, Destroy, Sharp',
      fullDetails: `
          <p>Shin represents <b>two front teeth</b>. It signifies consuming, destroying, sharp, or pressing.</p>
          <p>It represents <b>fire and digestion</b>. It destroys to transform. It is the letter of <i>Shaddai</i> (God Almighty) and <i>Shalom</i> (Peace/Wholeness).</p>
          <p>It implies dividing or analyzing.</p>
      `
  },
  {
      char: 'ת',
      name: 'Tav',
      emoji: '✝️',
      pronunciation: "Tahv (Rhymes with 'Halve')",
      summary: 'Crossed Sticks: Mark, Sign, Covenant',
      fullDetails: `
          <p>Tav is the picture of <b>crossed sticks</b>. It represents a mark, a sign, a signal, or a monument.</p>
          <p>It signifies a <b>covenant or seal</b>. It is the final letter, representing the seal of truth (Emet).</p>
          <p>In ancient times, it was the mark of ownership or agreement.</p>
      `
  }
];