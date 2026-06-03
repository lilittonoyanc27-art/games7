export interface VocabularyItem {
  id: string;
  es: string; // Spanish word
  hy: string; // Armenian word
  transliteration_hy: string; // Pronunciation in Armenian alphabet / phonetic hint
  transliteration_ru?: string; // Pronunciation in Russian phonetics (optional)
  category: string; // Category of the word
  emoji: string; // Visual representation
  explanation_hy: string; // Explanation of usage or context in Armenian
  explanation_ru?: string; // Explanation in Russian (optional)
}

export type ActiveGameType = 'dictionary' | 'word-match' | 'word-builder' | 'quiz' | 'audio-quiz';

export interface MatchCard {
  id: string; // Unique UI ID
  vocabId: string; // ID of vocabulary item
  text: string;
  lang: 'es' | 'hy';
  isMatched: boolean;
  isSelected: boolean;
}
