import en from './en';
import type { TranslationKeys } from './en';

// Arabic localization is intentionally disabled until the translated source can
// be repaired and reviewed. Keep the fallback explicit so broken Arabic copy is
// not shipped accidentally.
const ar: TranslationKeys = en;

export default ar;
