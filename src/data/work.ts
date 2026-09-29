export const workCategories = {
  stats: 'تحليل إحصائي',
  questionnaire: 'استبانات',
  editing: 'تنسيق وتحرير',
  translation: 'ترجمة',
  decks: 'عروض',
  cv: 'سير ذاتية',
  tech: 'تقنية',
} as const;
export type WorkCategory = keyof typeof workCategories;
