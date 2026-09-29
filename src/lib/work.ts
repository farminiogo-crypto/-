import type { CollectionEntry } from 'astro:content';
import { site } from '@/config/site';

// يظهر العمل إذا كان منشورًا، وإذا اشترطت الإعدادات موافقة مكتوبة فلا بد أن تكون مسجلة (consent: true)
export const isPublic = (w: CollectionEntry<'portfolio'>) =>
  w.data.published && (!site.portfolioRequiresConsent || w.data.consent);
