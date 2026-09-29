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
    mock: z.enum(['doc', 'stats', 'deck', 'bilingual', 'cv', 'questionnaire', 'app']),
    mockVariant: z.enum(['figure', 'tracked', 'checklist', 'light', 'timeline']).optional(),
    mockTitle: z.string().optional(), // عنوان عام للمجسم (ليس من ملف العميل)
    summary: z.string(), // ما نفذناه باختصار
    challenge: z.string(),
    done: z.array(z.string()),
    received: z.array(z.string()),
    tools: z.array(z.string()),
    services: z.array(z.string()).default([]),
    image: z.string().nullable().default(null),
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
