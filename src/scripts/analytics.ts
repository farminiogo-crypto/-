// يُحمَّل فقط عند ضبط معرّفات القياس (انظر Analytics.astro)
import { track } from '@/scripts/track';

type Cfg = { ga4: string | null; plausible: string | null; metaPixel: string | null; snapPixel: string | null; tiktokPixel: string | null };

export function initAnalytics(cfg: Cfg) {
  const w = window as any;
  const load = (src: string, attrs: Record<string, string> = {}) => {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    document.head.appendChild(s);
  };

  // طوابير فورية: الأحداث قبل تحميل الأدوات لا تضيع
  if (cfg.ga4) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', cfg.ga4);
  }
  if (cfg.plausible) {
    w.plausible = w.plausible || function () { (w.plausible.q = w.plausible.q || []).push(arguments); };
  }
  if (cfg.metaPixel) {
    const f: any = (w.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); });
    if (!w._fbq) w._fbq = f;
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
    w.fbq('init', cfg.metaPixel);
    w.fbq('track', 'PageView');
  }
  if (cfg.snapPixel) {
    const s: any = (w.snaptr = function () { s.handleRequest ? s.handleRequest.apply(s, arguments) : s.queue.push(arguments); });
    s.queue = [];
    w.snaptr('init', cfg.snapPixel, {});
    w.snaptr('track', 'PAGE_VIEW');
  }
  if (cfg.tiktokPixel) {
    const t: any = (w.ttq = w.ttq || []);
    ['page', 'track', 'identify'].forEach((m) => { t[m] = (...args: unknown[]) => t.push([m, ...args]); });
    t.page();
  }

  let loaded = false;
  const boot = () => {
    if (loaded) return;
    loaded = true;
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((e) => removeEventListener(e, boot));
    if (cfg.ga4) load(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4)}`);
    if (cfg.plausible) load('https://plausible.io/js/script.js', { 'data-domain': cfg.plausible });
    if (cfg.metaPixel) load('https://connect.facebook.net/en_US/fbevents.js');
    if (cfg.snapPixel) load('https://sc-static.net/scevent.min.js');
    if (cfg.tiktokPixel) load(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(cfg.tiktokPixel)}&lib=ttq`);
  };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((e) => addEventListener(e, boot, { once: true, passive: true }));

  // كل رابط واتساب في الموقع: الحدث ومكانه في الصفحة
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href*="api.whatsapp.com"], a[href*="wa.me"]');
    if (!link) return;
    const where =
      link.dataset.waLoc ||
      (link.closest('[data-wa-fab]') && 'fab') ||
      (link.closest('.site-header, .mobile-menu') && 'header') ||
      (link.closest('.site-footer') && 'footer') ||
      (link.closest('.fcta') && 'final_cta') ||
      (link.closest('.hero, .page-hero') && 'hero') ||
      'content';
    track('whatsapp_click', { location: where, page: location.pathname });
  });
}
