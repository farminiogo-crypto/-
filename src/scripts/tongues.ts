// «برج اللغات»: كلمات أكاديمية بعدة لغات تطفو ثم تنجذب إلى طبقات البرج وتذوب فيه أثناء بنائه.
// المشهد نحو 2.4 ثانية: الطبقات ترتفع واحدة تلو الأخرى، وكل مجموعة كلمات تصل إلى طبقتها لحظة ارتفاعها.
// الحروف محصورة في منطقة البرج (Canvas داخل عمود الرسم)، وتتوقف خارج الشاشة وعند إخفاء التبويب،
// ولا يعمل شيء من هذا مع تقليل الحركة.

const WORDS: { t: string; latin: boolean }[] = [
  { t: 'بحث', latin: false }, { t: 'منهج', latin: false }, { t: 'فرضية', latin: false }, { t: 'عينة', latin: false },
  { t: 'ثبات', latin: false }, { t: 'دلالة', latin: false }, { t: 'مراجع', latin: false }, { t: 'مناقشة', latin: false },
  { t: 'استبانة', latin: false }, { t: 'تحليل', latin: false }, { t: 'تحقیق', latin: false }, { t: 'مقالہ', latin: false },
  { t: 'Research', latin: true }, { t: 'Method', latin: true }, { t: 'Data', latin: true }, { t: 'Analysis', latin: true },
  { t: 'Thesis', latin: true }, { t: 'Recherche', latin: true }, { t: 'Méthode', latin: true }, { t: 'Hypothèse', latin: true },
  { t: 'Forschung', latin: true }, { t: 'Methode', latin: true }, { t: 'Araştırma', latin: true }, { t: 'Veri', latin: true },
  { t: 'Yöntem', latin: true }, { t: 'α', latin: true }, { t: 'p < .01', latin: true }, { t: 'r = .68', latin: true },
];

// توقيت بناء الطبقات يطابق CSS في Ziggurat.astro (zig--deferred.is-go)
const TIER_START = 200;
const TIER_STEP = 240;
const ARRIVE = 520; // مدة وصول الكلمة إلى طبقتها
const SCENE_END = 2500;

type State = 'drift' | 'attract' | 'gone' | 'ambient';
interface P {
  x: number; y: number; vx: number; vy: number;
  sx: number; sy: number; tx: number; ty: number;
  word: string; latin: boolean; size: number;
  alpha: number; maxAlpha: number; brick: boolean;
  leave: number; state: State; life: number; period: number;
}

const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));

export function initTongues() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-tongues]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const art = document.querySelector<HTMLElement>('[data-hero-art]');
  const tilt = document.querySelector<HTMLElement>('[data-tilt]');
  const zig = art?.querySelector<SVGElement>('.zig--deferred');
  const go = () => zig?.classList.add('is-go');
  if (!canvas || !hero || !art) { go(); return; }
  if (document.documentElement.classList.contains('rm')) { go(); return; }

  const ctx = canvas.getContext('2d');
  if (!ctx) { go(); return; }
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const COUNT = mobile ? 30 : 64;
  const AMBIENT = mobile ? 4 : 7;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  let tiers: { x: number; y: number; w: number }[] = [];
  const measure = () => {
    const cr = canvas.getBoundingClientRect();
    W = cr.width; H = cr.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // مراكز الأسطح العلوية للطبقات (بالترتيب من القاعدة للقمة) بإحداثيات الـCanvas
    tiers = [...art.querySelectorAll<SVGPolygonElement>('.zt__top')].map((poly) => {
      const b = poly.getBoundingClientRect();
      return { x: b.left - cr.left + b.width / 2, y: b.top - cr.top + b.height / 2, w: b.width };
    });
    if (!tiers.length) tiers = [{ x: W / 2, y: H / 2, w: W / 3 }];
  };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const make = (i: number): P => {
    const w = pick(WORDS);
    const tierIdx = i % tiers.length;
    const t = tiers[tierIdx];
    // الوصول إلى الطبقة لحظة ارتفاعها
    const leave = TIER_START + tierIdx * TIER_STEP + rand(-120, 220);
    // الكلمات اللاتينية تُرسم نحو اليمين (اتجاه النص)، فتبدأ أبعد عن الحافة المقابلة لعمود النص
    const x = w.latin ? rand(W * 0.04, W * 0.7) : rand(W * 0.12, W * 0.9), y = rand(H * 0.04, H * 0.9);
    return {
      x, y, sx: x, sy: y, vx: rand(-0.22, 0.22), vy: rand(-0.3, 0.05),
      tx: t.x + rand(-t.w * 0.3, t.w * 0.3), ty: t.y + rand(-6, 6),
      word: w.t, latin: w.latin,
      size: rand(12, mobile ? 18 : 24),
      alpha: 0, maxAlpha: rand(0.35, 0.75), brick: Math.random() < 0.18,
      leave: Math.max(80, leave), state: 'drift', life: 0, period: 0,
    };
  };

  const makeAmbient = (): P => {
    const w = pick(WORDS);
    const x = w.latin ? rand(W * 0.08, W * 0.66) : rand(W * 0.14, W * 0.86), y = rand(H * 0.15, H * 0.85);
    return {
      x, y, sx: x, sy: y, vx: rand(-0.12, 0.12), vy: rand(-0.14, -0.04), tx: 0, ty: 0,
      word: w.t, latin: w.latin, size: rand(12, 16),
      alpha: 0, maxAlpha: rand(0.14, 0.3), brick: Math.random() < 0.25,
      leave: 0, state: 'ambient', life: rand(0, 4000), period: rand(9000, 13000),
    };
  };

  let particles: P[] = [];
  let start = 0, last = 0, raf = 0;
  let running = false, ambientOn = false;
  let mx = 0, my = 0, rx = 0, ry = 0;

  const draw = (p: P) => {
    if (p.alpha <= 0.01) return;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.brick ? '#C4595B' : '#F4EFE4';
    ctx.font = p.latin ? `400 ${p.size}px Lora, Georgia, serif` : `700 ${p.size}px Amiri, serif`;
    ctx.direction = p.latin ? 'ltr' : 'rtl';
    ctx.fillText(p.word, p.x, p.y);
  };

  const step = (now: number) => {
    if (!start) { start = now; last = now; }
    const dt = Math.min(48, now - last);
    last = now;
    const t = now - start;
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.life += dt;
      if (p.state === 'drift') {
        p.alpha = Math.min(p.maxAlpha, p.alpha + dt / 380);
        p.x += p.vx * dt * 0.05; p.y += p.vy * dt * 0.05;
        if (t >= p.leave) { p.state = 'attract'; p.sx = p.x; p.sy = p.y; p.life = 0; }
      } else if (p.state === 'attract') {
        const k = easeOutExpo(Math.min(1, p.life / ARRIVE));
        p.x = p.sx + (p.tx - p.sx) * k;
        p.y = p.sy + (p.ty - p.sy) * k;
        // تذوب في الطبقة عند الوصول
        if (k > 0.7) { p.alpha *= 0.82; p.size *= 0.97; }
        if (p.alpha < 0.02) p.state = 'gone';
      } else if (p.state === 'ambient') {
        const ph = (p.life % p.period) / p.period;
        p.alpha = p.maxAlpha * Math.sin(ph * Math.PI);
        p.x += p.vx * dt * 0.02; p.y += p.vy * dt * 0.02;
        if (p.life > p.period) Object.assign(p, makeAmbient(), { life: 0 });
      }
      if (p.state !== 'gone') draw(p);
    }
    ctx.globalAlpha = 1;

    // بعد اكتمال البناء: حياة هادئة — كلمات قليلة تطفو ببطء شديد حول البرج
    if (!ambientOn && t > SCENE_END) {
      ambientOn = true;
      particles = particles.filter((p) => p.state !== 'gone');
      for (let i = 0; i < AMBIENT; i++) particles.push(makeAmbient());
    }

    // ميل خفيف مع حركة الماوس (±4°) على الديسكتوب فقط
    if (tilt && fine) {
      rx += (my * -8 - rx) * 0.06;
      ry += (mx * 8 - ry) * 0.06;
      tilt.style.setProperty('--rx', `${Math.max(-4, Math.min(4, rx)).toFixed(2)}deg`);
      tilt.style.setProperty('--ry', `${Math.max(-4, Math.min(4, ry)).toFixed(2)}deg`);
    }

    if (running) raf = requestAnimationFrame(step);
  };

  const play = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(step); } };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  const boot = () => {
    // نقيس مواضع الطبقات في حالتها النهائية قبل بدء حركة الارتفاع
    measure();
    particles = Array.from({ length: COUNT }, (_, i) => make(i));
    go();
    let visible = true;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) play(); else pause();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden || !visible ? pause() : play()));
    window.addEventListener('resize', measure, { passive: true });
    if (fine) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
      });
      hero.addEventListener('pointerleave', () => { mx = 0; my = 0; });
    }
    play();
  };

  // ننتظر خط Amiri حتى تُرسم الكلمات العربية بشكل صحيح، دون تأخير أكثر من 600ms
  const fontReady = document.fonts ? Promise.race([document.fonts.load('700 20px Amiri'), new Promise((r) => setTimeout(r, 600))]) : Promise.resolve();
  fontReady.then(() => requestAnimationFrame(boot));
}
