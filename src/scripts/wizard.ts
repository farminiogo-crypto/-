// معالج الطلب: أربع خطوات، مسودة محفوظة محليًا، ورسالة واتساب منسقة في النهاية. لا أسعار.
import { wa } from '@/config/site';
const KEY = 'babel-request-draft';

type Draft = { step: number; stage: string; services: string[]; major: string; date: string; desc: string; size: string; name: string; phone: string };

const store = {
  get(): Partial<Draft> | null {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  },
  set(d: Partial<Draft>) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch {}
  },
};

export function initWizard() {
  const root = document.querySelector<HTMLElement>('[data-wz]');
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>('[data-wz-form]')!;
  const steps = [...root.querySelectorAll<HTMLFieldSetElement>('[data-wz-step]')];
  const tiers = [...root.querySelectorAll<SVGRectElement>('[data-wz-tier]')];
  const labels = [...root.querySelectorAll<HTMLElement>('[data-wz-label]')];
  const prev = root.querySelector<HTMLButtonElement>('[data-wz-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-wz-next]')!;
  const live = root.querySelector<HTMLElement>('[data-wz-live]')!;
  const done = root.querySelector<HTMLElement>('[data-wz-done]')!;
  const reopen = root.querySelector<HTMLAnchorElement>('[data-wz-reopen]')!;
  root.querySelector('[data-wz-nojs]')?.remove();
  form.removeAttribute('target');

  const el = <T extends HTMLElement>(name: string) => form.elements.namedItem(name) as unknown as T;
  const date = el<HTMLInputElement>('date');
  const today = new Date();
  date.min = today.toISOString().slice(0, 10);

  let step = 0;
  const names = ['المرحلة', 'الخدمة', 'التفاصيل', 'التواصل'];

  const read = (): Draft => ({
    step,
    stage: (form.querySelector<HTMLInputElement>('input[name="stage"]:checked')?.value) || '',
    services: [...form.querySelectorAll<HTMLInputElement>('input[name="service"]:checked')].map((i) => i.value),
    major: el<HTMLInputElement>('major').value.trim(),
    date: date.value,
    desc: el<HTMLTextAreaElement>('desc').value.trim(),
    size: el<HTMLInputElement>('size').value.trim(),
    name: el<HTMLInputElement>('name').value.trim(),
    phone: el<HTMLInputElement>('phone').value.trim(),
  });

  const write = (d: Partial<Draft>) => {
    if (d.stage) form.querySelectorAll<HTMLInputElement>('input[name="stage"]').forEach((i) => (i.checked = i.value === d.stage));
    if (d.services) form.querySelectorAll<HTMLInputElement>('input[name="service"]').forEach((i) => (i.checked = d.services!.includes(i.value)));
    (['major', 'date', 'desc', 'size', 'name', 'phone'] as const).forEach((k) => {
      if (d[k]) (el<HTMLInputElement>(k)).value = d[k] as string;
    });
  };

  const show = (i: number, focus = true) => {
    step = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => s.classList.toggle('is-current', k === step));
    tiers.forEach((t, k) => { t.classList.toggle('is-done', k < step); t.classList.toggle('is-active', k === step); });
    labels.forEach((l, k) => { l.classList.toggle('is-done', k < step); l.classList.toggle('is-active', k === step); });
    prev.hidden = step === 0;
    root.toggleAttribute('data-last', step === steps.length - 1);
    live.textContent = `الخطوة ${step + 1} من ${steps.length}: ${names[step]}`;
    if (focus) steps[step].querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
    const top = root.getBoundingClientRect().top + window.scrollY - 110;
    if (focus && Math.abs(window.scrollY - top) > 200) window.scrollTo({ top, behavior: 'smooth' });
    store.set(read());
  };

  // تحقق لطيف بالعربية
  const setErr = (key: string, on: boolean) => {
    const e = root.querySelector<HTMLElement>(`[data-wz-err="${key}"]`);
    if (e) e.hidden = !on;
    const input = form.elements.namedItem(key) as HTMLInputElement | null;
    if (input && 'setAttribute' in input) input.setAttribute('aria-invalid', String(on));
  };
  const validate = (i: number): boolean => {
    const d = read();
    const checks: Record<number, [string, boolean][]> = {
      0: [['stage', !!d.stage]],
      1: [['service', d.services.length > 0]],
      2: [['major', d.major.length >= 2], ['date', !d.date || d.date >= date.min], ['desc', d.desc.length >= 10]],
      3: [['name', d.name.length >= 2], ['phone', /^(\+?9665\d{8}|05\d{8}|\+?\d{9,15})$/.test(d.phone.replace(/[\s-]/g, ''))]],
    };
    let ok = true;
    let firstBad: string | null = null;
    for (const [k, valid] of checks[i]) {
      setErr(k, !valid);
      if (!valid) { ok = false; firstBad ??= k; }
    }
    if (firstBad) {
      const target = form.querySelector<HTMLElement>(`[name="${firstBad}"]`);
      target?.focus();
      live.textContent = root.querySelector<HTMLElement>(`[data-wz-err="${firstBad}"]`)?.textContent || '';
    }
    return ok;
  };

  next.addEventListener('click', () => { if (validate(step)) show(step + 1); });
  prev.addEventListener('click', () => show(step - 1));
  // اختيار المرحلة ينقل تلقائيًا للخطوة التالية
  form.querySelectorAll<HTMLInputElement>('input[name="stage"]').forEach((i) =>
    i.addEventListener('change', () => { setErr('stage', false); window.setTimeout(() => show(1), 220); }),
  );
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name && t.getAttribute('aria-invalid') === 'true') setErr(t.name, false);
    if (t.name === 'service') setErr('service', false);
    store.set(read());
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && step < steps.length - 1) {
      e.preventDefault();
      next.click();
    }
  });

  const fmtDate = (v: string) => {
    if (!v) return 'مرن';
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(v + 'T12:00:00'));
    } catch { return v; }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      if (!validate(i)) { show(i, false); validate(i); return; }
    }
    const d = read();
    const titles = [...form.querySelectorAll<HTMLInputElement>('input[name="service"]:checked')].map((i) => i.dataset.title);
    const lines = [
      'مرحبًا بابل أكاديمي 👋',
      `أرغب في: ${titles.join('، ')}`,
      `المرحلة: ${d.stage} — التخصص: ${d.major}`,
      `الموعد المطلوب: ${fmtDate(d.date)}`,
      `التفاصيل: ${d.desc}`,
      ...(d.size ? [`الحجم التقريبي: ${d.size}`] : []),
      `الاسم: ${d.name}`,
      `الجوال: ${d.phone}`,
    ];
    const url = wa(lines.join('\n'));
    reopen.href = url;
    window.open(url, '_blank', 'noopener');
    store.clear();
    form.hidden = true;
    root.querySelector<HTMLElement>('.wz__progress')!.hidden = true;
    done.hidden = false;
    done.focus();
  });

  root.querySelector('[data-wz-reset]')?.addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    root.querySelector<HTMLElement>('.wz__progress')!.hidden = false;
    done.hidden = true;
    show(0);
  });

  // البدء: من الرابط (?service=a,b&stage=...) أو من المسودة المحفوظة
  const params = new URL(location.href).searchParams;
  const fromUrl: Partial<Draft> = {};
  const svc = params.getAll('service').flatMap((s) => s.split(',')).filter(Boolean);
  if (svc.length) fromUrl.services = svc;
  if (params.get('stage')) fromUrl.stage = params.get('stage')!;
  const draft = store.get();
  const initial = { ...(draft || {}), ...fromUrl };
  write(initial);
  let start = 0;
  if (fromUrl.stage || fromUrl.services) start = fromUrl.stage && fromUrl.services ? 2 : fromUrl.stage ? 1 : 0;
  else if (draft && typeof draft.step === 'number') start = draft.step;
  show(start, false);
  if (draft && !fromUrl.services && !fromUrl.stage && (draft.stage || draft.desc)) {
    live.textContent = 'استرجعنا مسودة طلبك السابقة.';
  }
}
