
export enum Language {
  ENGLISH = 'english',
  OSHIKWANYAMA = 'oshikwanyama',
  OSHIDONGA = 'oshidonga'
}

export enum UserRole {
  ADMIN = 'admin',
  AUTHORIZED = 'authorized',
  GUEST = 'guest'
}

export interface DictionaryEntry {
  id?: number;
  oshikwanyama_word: string;
  english_word: string;
  omaludi_oitja: string; // Categories/Plurals
  word_types: string; // Noun, Verb, etc.
  oshitya_metumbulo: string; // Word in context (Oshikwanyama)
  word_in_phrase_sentence: string; // Word in context (English)
  is_verified?: boolean;
  created_at?: string;
  // Dialect Differentiation Fields
  detected_dialect?: string;
  dialect_correction_note?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  last_active?: string;
}
