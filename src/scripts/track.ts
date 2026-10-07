// أحداث القياس. لا تفعل شيئًا ما لم تُضبط معرّفات الأدوات في site.analytics
// (أدوات القياس تُحمَّل في Analytics.astro بعد أول تفاعل فقط، والأحداث قبلها تنتظر في طابور كل أداة).

type Params = Record<string, string | number>;
type W = Window & {
  gtag?: (...a: unknown[]) => void;
  plausible?: (name: string, opts?: { props: Params }) => void;
  fbq?: (...a: unknown[]) => void;
  ttq?: { track: (...a: unknown[]) => void };
  snaptr?: (...a: unknown[]) => void;
};

// أحداث تعد «تواصلًا» في منصات الإعلان
const CONTACT = new Set(['whatsapp_click', 'wizard_submit']);

export function track(name: string, params: Params = {}) {
  const w = window as W;
  try {
    w.gtag?.('event', name, params);
    w.plausible?.(name, { props: params });
    if (CONTACT.has(name)) {
      w.fbq?.('track', 'Contact', params);
      w.ttq?.track('Contact', params);
      w.snaptr?.('track', 'CUSTOM_EVENT_1', { description: name });
    } else {
      w.fbq?.('trackCustom', name, params);
    }
  } catch {
    /* القياس لا يكسر الموقع أبدًا */
  }
}
