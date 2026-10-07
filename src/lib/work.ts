import type { CollectionEntry } from 'astro:content';
import { site } from '@/config/site';

// يظهر العمل إذا كان منشورًا، وإذا اشترطت الإعدادات موافقة مكتوبة فلا بد أن تكون مسجلة (consent: true)
export const isPublic = (w: CollectionEntry<'portfolio'>) =>
  w.data.published && (!site.portfolioRequiresConsent || w.data.consent);

type WorkImage = CollectionEntry<'portfolio'>['data']['images'][number];
// النسخة المصغرة للبطاقات (‎-sm.webp بعرض أقصاه 720px)، ولّدتها عملية تجهيز الصور
export const thumb = (img: WorkImage) => {
  const w = Math.min(720, img.width);
  return { src: img.src.replace(/\.webp$/, '-sm.webp'), width: w, height: Math.round((img.height * w) / img.width) };
};
