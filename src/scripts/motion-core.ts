// نظام الحركة المشترك: Lenis للتمرير الناعم، وGSAP لدخول الأقسام، ولمسات المؤشر والأزرار المغناطيسية.
// قاعدة عربية حرجة: لا نقسم النص العربي إلى حروف أبدًا — كلمات وأسطر فقط.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

export const reducedMotion = () => document.documentElement.classList.contains('rm');
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

let lenis: Lenis | null = null;
let started = false;

export function getLenis() {
  return lenis;
}

export function initMotion() {
  if (started) return;
  started = true;
  const root = document.documentElement;

  if (reducedMotion()) {
    // الحالة النهائية مباشرة مع تلاشٍ بسيط للصفحة
    root.classList.add('motion-ready');
    return;
  }

  // التمرير الناعم
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
  root.classList.add('has-lenis');
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  // روابط المرساة داخل الصفحة تمر عبر Lenis
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || !lenis) return;
    const id = a.getAttribute('href')!;
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target as HTMLElement, { offset: -90, duration: 1.2 });
    history.pushState(null, '', id);
  });

  initReveals();
  root.classList.add('motion-ready');
  initMagnetic();
  initCursor();

  // إعادة الحساب بعد تحميل الخطوط لأن ارتفاع الأسطر العربية يتغير
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function initReveals() {
  const trigger = (el: Element) => ({ trigger: el, start: 'top 86%', once: true });

  // العناوين: سطرًا سطرًا من الأسفل (clip عبر mask)
  gsap.utils.toArray<HTMLElement>('[data-reveal="heading"]').forEach((el) => {
    gsap.set(el, { opacity: 1 });
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: trigger(el),
        });
      },
    });
  });

  // الفقرات والعناصر المفردة: تلاشٍ وانزلاق 24px
  gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', delay: Number(el.dataset.delay || 0), scrollTrigger: trigger(el) },
    );
  });

  // المجموعات: العناصر بتتابع 70ms
  gsap.utils.toArray<HTMLElement>('[data-reveal="stagger"]').forEach((el) => {
    const items = el.children;
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(
      items,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, scrollTrigger: trigger(el) },
    );
  });

  // الصور والمجسمات: انكشاف من الأسفل
  gsap.utils.toArray<HTMLElement>('[data-reveal="rise"]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 48, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: trigger(el) },
    );
  });
}

// أزرار مغناطيسية خفيفة للـCTA الرئيسية فقط
function initMagnetic() {
  if (!finePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo(((e.clientX - r.left) / r.width - 0.5) * 12);
      yTo(((e.clientY - r.top) / r.height - 0.5) * 10);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

// مؤشر مخصص خفيف على الديسكتوب فقط
function initCursor() {
  if (!finePointer()) return;
  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = '<span class="cursor__label"></span>';
  document.body.appendChild(dot);
  document.documentElement.classList.add('has-cursor');
  const label = dot.querySelector<HTMLElement>('.cursor__label')!;
  const xTo = gsap.quickTo(dot, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(dot, 'y', { duration: 0.35, ease: 'power3.out' });
  let shown = false;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) { gsap.set(dot, { x: e.clientX, y: e.clientY }); dot.classList.add('is-on'); shown = true; }
    xTo(e.clientX);
    yTo(e.clientY);
    const t = e.target as HTMLElement;
    const open = t.closest<HTMLElement>('[data-cursor]');
    const interactive = t.closest('a, button, [role="slider"], summary, label, input, select, textarea');
    dot.classList.toggle('is-open', Boolean(open));
    dot.classList.toggle('is-link', !open && Boolean(interactive));
    label.textContent = open ? open.dataset.cursor || 'افتح' : '';
  }, { passive: true });
  document.addEventListener('pointerleave', () => { dot.classList.remove('is-on'); shown = false; });
}
