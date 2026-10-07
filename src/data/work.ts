// تصنيفات فلتر المعرض (حسب نوع الخدمة)
export const workCategories = {
  stats: 'تحليل',
  translation: 'ترجمة',
  editing: 'تدقيق',
  decks: 'عروض',
  tech: 'برمجة',
  career: 'مهني',
} as const;
export type WorkCategory = keyof typeof workCategories;

// الوسم الثابت على كل عمل في المعرض
export const workBadge = { strong: 'نموذج تطبيقي', rest: 'البيانات توضيحية والبيانات الشخصية محجوبة' };
