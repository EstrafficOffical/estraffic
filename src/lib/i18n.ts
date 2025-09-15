export const locales = ['ru', 'uk', 'en'] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'ru';

/**
 * Как формировать URL:
 * - 'always' => /ru/..., /uk/..., /en/...
 * - 'as-needed' => без префикса для defaultLocale
 */
export const localePrefix = 'always' as const;
