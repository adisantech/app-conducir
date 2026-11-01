export type MemoriceCardType = 'term' | 'definition' | 'sign' | 'category';

export interface MemoriceCard {
  id: string;
  pairId: string;
  content: string;
  imageUrl?: string;
  subtext?: string;
  type: MemoriceCardType;
  isFlipped: boolean;
  isMatched: boolean;
}

export type MemoriceDifficulty = 'easy' | 'medium' | 'hard';
export type MemoriceCategory = 'glosario' | 'senales';

export interface QuizQuestion {
  id: string;
  chapter: number;
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface PuzzleWord {
  word: string;
  display: string;
  clue: string;
}

export interface WordScrambleGame {
  word: string;
  display: string;
  clue: string;
  scrambled: string;
}
