import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { workCategories } from './data/work';

const qa = z.object({ q: z.string(), a: z.string() });
const step = z.object({ title: z.string(), text: z.string() });

const services = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    short: z.string(), // السطر التعريفي
    promise: z.string(), // وعد الهيرو
    icon: z.string(),
    order: z.number(),
    featured: z.boolean().default(false),
    seoTitle: z.string(),
    seoDescription: z.string(),
    audience: z.array(z.string()),
    deliverables: z.array(z.string()),
    steps: z.array(step),
    faq: z.array(qa),
    related: z.array(z.string()).default([]), // slugs من المعرض
    keyword: z.string(), // الكلمة التي تحملها رسالة واتساب الخاصة بالخدمة
    relatedServices: z.array(z.string()).default([]), // خدمات مرتبطة تظهر كبطاقات في صفحة الخدمة
    // أنواع فرعية داخل الخدمة (مثل أنواع الترجمة)، لكل نوع زر واتساب بكلمته
    variants: z
      .array(z.object({ title: z.string(), text: z.string(), keyword: z.string(), icon: z.string(), work: z.string().optional() }))
      .default([]),
  }),
});

const fields = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/fields' }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    icon: z.string(),
    order: z.number(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    topics: z.array(z.string()),
    typical: z.array(z.string()), // أعمال شائعة في المجال
    services: z.array(z.string()), // slugs من الخدمات
    tests: z.array(z.object({ name: z.string(), use: z.string() })).default([]), // اختبارات إحصائية شائعة
    mistakes: z.array(z.string()).default([]), // أخطاء شائعة نراها
    exampleTitles: z.array(z.string()).default([]), // عناوين افتراضية للتوضيح
    faq: z.array(qa).default([]),
  }),
});

export { workCategories };

const portfolio = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    level: z.string(), // المرحلة
    field: z.string(), // المجال
    categories: z.array(z.enum(Object.keys(workCategories) as [keyof typeof workCategories, ...(keyof typeof workCategories)[]])),
    // مجسم توضيحي يُستخدم فقط حين لا توجد صور حقيقية
    mock: z.enum(['doc', 'stats', 'deck', 'bilingual', 'cv', 'questionnaire', 'app']).default('doc'),
    mockVariant: z.enum(['figure', 'tracked', 'checklist', 'light', 'timeline']).optional(),
    mockTitle: z.string().optional(),
    summary: z.string(), // سطران للبطاقة
    challenge: z.string().optional(),
    done: z.array(z.string()), // ما نُفذ (٣ إلى ٥ جمل)
    received: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    services: z.array(z.string()).default([]),
    // صور حقيقية من العمل في public/work/<slug>/ ؛ الأولى غلاف البطاقة. لكل صورة نسخة مصغرة -sm للبطاقات
    images: z
      .array(z.object({ src: z.string(), alt: z.string(), width: z.number(), height: z.number(), position: z.string().optional() }))
      .default([]),
    published: z.boolean().default(false),
    consent: z.boolean().default(false), // موافقة صاحب العمل الكتابية مسجلة
    featured: z.boolean().default(false),
    order: z.number(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    seoTitle: z.string(),
    category: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    readingMinutes: z.number(),
    services: z.array(z.string()).default([]),
  }),
});

export const collections = { services, fields, portfolio, blog };
