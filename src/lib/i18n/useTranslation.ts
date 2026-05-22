// ============================================
// MoneyTrack — i18n Hook
// ============================================

import { useCallback } from 'react';
import { useAppStore } from '../data/store';
import en from './en';
import ar from './ar';
import type { TranslationKeys } from './en';
import type { Language } from '../data/types';

const translations: Record<Language, TranslationKeys> = { en, ar };

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`
      : never
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === 'string' ? current : path;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key]?.toString() ?? `{{${key}}}`;
  });
}

export function useTranslation() {
  const language = useAppStore((s) => s.settings.language);
  const dict = translations[language];

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const value = getNestedValue(dict as unknown as Record<string, unknown>, key);
      return interpolate(value, params);
    },
    [dict]
  );

  return {
    t,
    language,
    isRTL: language === 'ar',
    dir: language === 'ar' ? 'rtl' as const : 'ltr' as const,
  };
}

export type { TranslationKey };
