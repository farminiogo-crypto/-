// «برج اللغات»: كلمات أكاديمية بعدة لغات تطفو ثم تنجذب إلى طبقات البرج وتذوب فيه.
// Canvas 2D خفيف، يتوقف خارج الشاشة وعند إخفاء التبويب، ولا يعمل مع تقليل الحركة.

const WORDS: { t: string; latin: boolean }[] = [
  { t: 'بحث', latin: false }, { t: 'منهج', latin: false }, { t: 'فرضية', latin: false }, { t: 'عينة', latin: false },
  { t: 'ثبات', latin: false }, { t: 'دلالة', latin: false }, { t: 'مراجع', latin: false }, { t: 'مناقشة', latin: false },
  { t: 'استبانة', latin: false }, { t: 'تحليل', latin: false }, { t: 'تحقیق', latin: false }, { t: 'مقالہ', latin: false },
  { t: 'Research', latin: true }, { t: 'Method', latin: true }, { t: 'Data', latin: true }, { t: 'Analysis', latin: true },
  { t: 'Thesis', latin: true }, { t: 'Recherche', latin: true }, { t: 'Méthode', latin: true }, { t: 'Hypothèse', latin: true },
  { t: 'Forschung', latin: true }, { t: 'Methode', latin: true }, { t: 'Araştırma', latin: true }, { t: 'Veri', latin: true },
  { t: 'Yöntem', latin: true }, { t: 'α', latin: true }, { t: 'p < .01', latin: true }, { t: 'r = .68', latin: true },
];

interface P {
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;
  word: string; latin: boolean; size: number;
  alpha: number; maxAlpha: number; brick: boolean;
  delay: number; state: 'drift' | 'attract' | 'gone' | 'ambient';
  life: number;
}

export function initTongues() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-tongues]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const art = document.querySelector<HTMLElement>('[data-hero-art]');
  const tilt = document.querySelector<HTMLElement>('[data-tilt]');
  if (!canvas || !hero || !art) return;
  if (document.documentElement.classList.contains('rm')) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const COUNT = mobile ? 34 : 72;
  const AMBIENT = mobile ? 5 : 10;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  let targets: { x: number; y: number }[] = [];
  const resize = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // أهداف الانجذاب: مراكز الأسطح العلوية لطبقات البرج
    const hr = hero.getBoundingClientRect();
    targets = [...art.querySelectorAll<SVGPolygonElement>('.zt__top')].map((poly) => {
      const b = poly.getBoundingClientRect();
      return { x: b.left - hr.left + b.width / 2, y: b.top - hr.top + b.height / 2 };
    });
    if (!targets.length) {
      const b = art.getBoundingClientRect();
      targets = [{ x: b.left - hr.left + b.width / 2, y: b.top - hr.top + b.height / 2 }];
    }
  };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const make = (ambient = false): P => {
    const w = pick(WORDS);
    const t = pick(targets);
    return {
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.25, 0.25), vy: rand(-0.35, 0.05),
      tx: t.x + rand(-40, 40), ty: t.y + rand(-8, 8),
      word: w.t, latin: w.latin,
      size: ambient ? rand(12, 16) : rand(13, mobile ? 20 : 26),
      alpha: 0, maxAlpha: ambient ? rand(0.15, 0.32) : rand(0.35, 0.8),
      brick: Math.random() < 0.18,
      delay: ambient ? 0 : rand(900, 1500),
      state: ambient ? 'ambient' : 'drift',
      life: 0,
    };
  };

  let particles: P[] = [];
  let start = 0;
  let last = 0;
  let running = false;
  let raf = 0;
  let mx = 0, my = 0, rx = 0, ry = 0;

  const step = (now: number) => {
    if (!start) { start = now; last = now; }
    const dt = Math.min(48, now - last);
    last = now;
    const t = now - start;
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.life += dt;
      if (p.state === 'drift') {
        p.alpha = Math.min(p.maxAlpha, p.alpha + dt / 600);
        p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
        if (t > p.delay) p.state = 'attract';
      } else if (p.state === 'attract') {
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy);
        const k = Math.min(1, dt / 260);
        p.x += dx * k * 0.55; p.y += dy * k * 0.55;
        // تذوب في البرج كلما اقتربت
        if (dist < 70) { p.alpha *= 0.86; p.size *= 0.975; }
        if (p.alpha < 0.02) p.state = 'gone';
      } else if (p.state === 'ambient') {
        // بعد اكتمال البناء: حروف قليلة تتطاير ببطء حول البرج
        const period = 9000;
        const ph = (p.life % period) / period;
        p.alpha = p.maxAlpha * Math.sin(ph * Math.PI);
        p.x += p.vx * dt * 0.03; p.y += (p.vy - 0.12) * dt * 0.03;
        if (p.life > period) Object.assign(p, make(true), { life: 0 });
      }
      if (p.state === 'gone' || p.alpha <= 0.01) continue;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.brick ? '#C4595B' : '#F4EFE4';
      ctx.font = p.latin ? `400 ${p.size}px Lora, Georgia, serif` : `700 ${p.size}px Amiri, serif`;
      ctx.direction = p.latin ? 'ltr' : 'rtl';
      ctx.fillText(p.word, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // بعد انتهاء الانجذاب: ندخل وضع التنفس
    if (t > 3200 && !particles.some((p) => p.state === 'ambient')) {
      particles = particles.filter((p) => p.state !== 'gone');
      for (let i = 0; i < AMBIENT; i++) {
        const p = make(true);
        p.life = Math.random() * 9000;
        particles.push(p);
      }
    }

    // إمالة خفيفة للبرج مع حركة الماوس (3–6 درجات)
    if (tilt && fine) {
      rx += (my * -5 - rx) * 0.06;
      ry += (mx * 6 - ry) * 0.06;
      tilt.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      tilt.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    }

    if (running) raf = requestAnimationFrame(step);
  };

  const play = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(step); } };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  const boot = () => {
    resize();
    particles = Array.from({ length: COUNT }, () => make());
    let visible = true;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) play(); else pause();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden || !visible ? pause() : play()));
    window.addEventListener('resize', () => { resize(); }, { passive: true });
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
