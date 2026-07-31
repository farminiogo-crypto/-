/* =========================================================
   map.js — الخريطة التكتيكية
   رسم كامل على Canvas: تضاريس مولّدة ببذرة ثابتة، شبكة
   إحداثيات، مسح رادار دوّار، نقاط تزوّد، ومسار متحرك.
   لا شبكة، لا GPS، لا مكتبات — كل الإحداثيات وهمية.
   ========================================================= */
(function (global) {
  'use strict';

  /* مولّد عشوائي ذو بذرة ثابتة — يضمن ثبات الخريطة والمسافات */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const TAU = Math.PI * 2;
  const REDUCED = global.matchMedia
    ? global.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  function TacticalMap(canvas, hotspotHost, pois, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.host = hotspotHost;
    this.pois = pois;
    this.opts = opts || {};
    this.onSelect = this.opts.onSelect || function () {};

    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.sweep = 0;          // زاوية المسح الحالية (راديان)
    this.t0 = null;
    this.raf = null;
    this.running = false;
    this.activeId = null;
    this.dash = 0;
    this.terrain = null;

    this._buildTerrain();
    this._buildHotspots();

    this._onResize = this._onResize.bind(this);
    this._frame = this._frame.bind(this);

    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(canvas.parentElement || canvas);
    } else {
      global.addEventListener('resize', this._onResize);
    }
    global.addEventListener('orientationchange', this._onResize);

    this.layout();
  }

  /* ── التضاريس: تُولَّد مرة واحدة ببذرة ثابتة ───────────── */
  TacticalMap.prototype._buildTerrain = function () {
    const rnd = mulberry32(this.opts.seed || 20260731);
    const blocks = [];
    const contours = [];
    const roads = [];

    // كتل مبانٍ متفرقة (إحداثيات معيارية -1..1)
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU;
      const r = 0.12 + rnd() * 0.82;
      blocks.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        w: 0.035 + rnd() * 0.1,
        h: 0.035 + rnd() * 0.09,
        rot: (rnd() - 0.5) * 0.7,
        a: 0.05 + rnd() * 0.14
      });
    }

    // خطوط كنتورية (تضاريس)
    for (let i = 0; i < 5; i++) {
      const cx = (rnd() - 0.5) * 1.3;
      const cy = (rnd() - 0.5) * 1.3;
      const base = 0.14 + rnd() * 0.2;
      const rot = rnd() * TAU;
      for (let k = 0; k < 3; k++) {
        contours.push({ x: cx, y: cy, rx: base * (1 + k * 0.42), ry: base * (0.62 + k * 0.3), rot: rot });
      }
    }

    // طرق: خطوط ممتدة عبر القطاع
    for (let i = 0; i < 4; i++) {
      const a = rnd() * TAU;
      const off = (rnd() - 0.5) * 0.9;
      roads.push({
        x1: Math.cos(a) * -1.5 + Math.cos(a + Math.PI / 2) * off,
        y1: Math.sin(a) * -1.5 + Math.sin(a + Math.PI / 2) * off,
        x2: Math.cos(a) * 1.5 + Math.cos(a + Math.PI / 2) * off,
        y2: Math.sin(a) * 1.5 + Math.sin(a + Math.PI / 2) * off,
        w: 1 + rnd() * 1.6
      });
    }

    this.terrain = { blocks: blocks, contours: contours, roads: roads };
  };

  /* ── أزرار شفافة فوق النقاط (وصول بلوحة المفاتيح) ──────── */
  TacticalMap.prototype._buildHotspots = function () {
    const self = this;
    this.host.innerHTML = '';
    this.pois.forEach(function (p) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.poi = p.id;
      b.setAttribute('aria-label', p.name + ' — ' + p.code);
      b.addEventListener('click', function () { self.onSelect(p.id); });
      self.host.appendChild(b);
      p._el = b;
    });
  };

  TacticalMap.prototype._onResize = function () {
    this.layout();
    if (!this.running) this._draw(0);
  };

  TacticalMap.prototype.layout = function () {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._placeHotspots();
  };

  /* تحويل الإحداثي المعياري إلى بكسل CSS */
  TacticalMap.prototype.toPx = function (nx, ny) {
    const cx = this.w / 2;
    const cy = this.h / 2;
    const R = Math.min(this.w, this.h) / 2;
    return { x: cx + nx * R, y: cy + ny * R };
  };

  TacticalMap.prototype._placeHotspots = function () {
    const self = this;
    this.pois.forEach(function (p) {
      if (!p._el) return;
      const pt = self.toPx(p.x, p.y);
      p._el.style.left = pt.x + 'px';
      p._el.style.top = pt.y + 'px';
    });
  };

  TacticalMap.prototype.select = function (id) {
    this.activeId = id;
    if (!this.running) this._draw(performance.now());
  };

  TacticalMap.prototype.start = function () {
    if (this.running) return;
    this.layout();
    if (REDUCED.matches) { this.sweep = -Math.PI / 3; this._draw(0); return; }
    this.running = true;
    this.t0 = null;
    this.raf = requestAnimationFrame(this._frame);
  };

  TacticalMap.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  TacticalMap.prototype._frame = function (ts) {
    if (!this.running) return;
    if (this.t0 === null) this.t0 = ts;
    const dt = Math.min(ts - (this._last || ts), 50);
    this._last = ts;

    this.sweep = (this.sweep + (dt / 1000) * (TAU / 4.2)) % TAU;
    this.dash = (this.dash + dt * 0.03) % 16;

    this._draw(ts - this.t0);
    this.raf = requestAnimationFrame(this._frame);
  };

  /* ── الرسم ─────────────────────────────────────────────── */
  TacticalMap.prototype._draw = function (elapsed) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    if (!w || !h) return;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2;

    ctx.clearRect(0, 0, w, h);

    // خلفية
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
    bg.addColorStop(0, '#07141400');
    bg.addColorStop(0.55, 'rgba(0,40,32,.28)');
    bg.addColorStop(1, '#020506');
    ctx.fillStyle = '#03080a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    this._drawTerrain(ctx, cx, cy, R);
    this._drawGrid(ctx, w, h, cx, cy, R);
    this._drawRings(ctx, cx, cy, R);
    if (!REDUCED.matches) this._drawSweep(ctx, cx, cy, R);
    this._drawRoute(ctx, cx, cy, R, elapsed);
    this._drawPois(ctx, R, elapsed);
    this._drawSelf(ctx, cx, cy, elapsed);
  };

  TacticalMap.prototype._drawTerrain = function (ctx, cx, cy, R) {
    const t = this.terrain;
    ctx.save();
    ctx.translate(cx, cy);

    // طرق
    ctx.strokeStyle = 'rgba(0,255,178,.09)';
    ctx.lineCap = 'round';
    t.roads.forEach(function (r) {
      ctx.lineWidth = r.w;
      ctx.beginPath();
      ctx.moveTo(r.x1 * R, r.y1 * R);
      ctx.lineTo(r.x2 * R, r.y2 * R);
      ctx.stroke();
    });

    // كنتور
    ctx.strokeStyle = 'rgba(0,255,178,.075)';
    ctx.lineWidth = 1;
    t.contours.forEach(function (c) {
      ctx.beginPath();
      ctx.ellipse(c.x * R, c.y * R, c.rx * R, c.ry * R, c.rot, 0, TAU);
      ctx.stroke();
    });

    // مبانٍ
    t.blocks.forEach(function (b) {
      ctx.save();
      ctx.translate(b.x * R, b.y * R);
      ctx.rotate(b.rot);
      ctx.fillStyle = 'rgba(0,255,178,' + b.a.toFixed(3) + ')';
      ctx.fillRect(-b.w * R / 2, -b.h * R / 2, b.w * R, b.h * R);
      ctx.strokeStyle = 'rgba(0,255,178,.12)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-b.w * R / 2, -b.h * R / 2, b.w * R, b.h * R);
      ctx.restore();
    });

    ctx.restore();
  };

  TacticalMap.prototype._drawGrid = function (ctx, w, h, cx, cy, R) {
    const step = R / 4;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,178,.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = cx % step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = cy % step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    // محورا المركز
    ctx.strokeStyle = 'rgba(0,255,178,.2)';
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();
    ctx.restore();
  };

  TacticalMap.prototype._drawRings = function (ctx, cx, cy, R) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,178,.22)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 0.98].forEach(function (f) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * f, 0, TAU);
      ctx.stroke();
    });
    // علامات الاتجاه
    ctx.fillStyle = 'rgba(0,255,178,.5)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const marks = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]];
    marks.forEach(function (m) {
      ctx.fillText(m[0], cx + m[1] * R * 0.9, cy + m[2] * R * 0.9);
    });
    ctx.restore();
  };

  TacticalMap.prototype._drawSweep = function (ctx, cx, cy, R) {
    const a = this.sweep;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (typeof ctx.createConicGradient === 'function') {
      const g = ctx.createConicGradient(a, cx, cy);
      g.addColorStop(0.00, 'rgba(0,255,178,.30)');
      g.addColorStop(0.05, 'rgba(0,255,178,.13)');
      g.addColorStop(0.22, 'rgba(0,255,178,.02)');
      g.addColorStop(0.30, 'rgba(0,255,178,0)');
      g.addColorStop(1.00, 'rgba(0,255,178,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fill();
    } else {
      // بديل: شرائح متدرجة الشفافية
      const slices = 26;
      const span = Math.PI / 2.4;
      for (let i = 0; i < slices; i++) {
        const f = i / slices;
        ctx.fillStyle = 'rgba(0,255,178,' + (0.16 * (1 - f) * (1 - f)).toFixed(4) + ')';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a - span * f, a - span * (f + 1 / slices));
        ctx.closePath();
        ctx.fill();
      }
    }

    // الشعاع الأمامي
    ctx.strokeStyle = 'rgba(0,255,178,.85)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(0,255,178,.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
    ctx.restore();
  };

  TacticalMap.prototype._drawRoute = function (ctx, cx, cy, R, elapsed) {
    if (!this.activeId) return;
    const p = this.pois.filter(function (q) { return q.id === this.activeId; }, this)[0];
    if (!p) return;
    const pt = this.toPx(p.x, p.y);

    ctx.save();
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = -this.dash;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  };

  TacticalMap.prototype._drawPois = function (ctx, R, elapsed) {
    const self = this;
    const sweep = this.sweep;

    this.pois.forEach(function (p) {
      const pt = self.toPx(p.x, p.y);
      const isActive = p.id === self.activeId;

      // توهّج إضافي عند مرور شعاع الرادار على النقطة
      let ang = Math.atan2(p.y, p.x);
      if (ang < 0) ang += TAU;
      let d = sweep - ang;
      while (d < 0) d += TAU;
      const freshness = REDUCED.matches ? 0.5 : Math.max(0, 1 - d / (TAU * 0.55));
      const glow = 0.35 + freshness * 0.65;

      const pulse = REDUCED.matches ? 0 : (elapsed % 1600) / 1600;
      const rr = 13 + pulse * 20;

      ctx.save();
      // هالة نابضة
      ctx.globalAlpha = (1 - pulse) * 0.5 * glow;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, rr, 0, TAU);
      ctx.stroke();

      // القرص
      ctx.globalAlpha = glow;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = isActive ? 20 : 12;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isActive ? 6.5 : 5, 0, TAU);
      ctx.fill();

      // الإطار الخارجي
      ctx.globalAlpha = glow * 0.9;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = isActive ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isActive ? 13 : 10, 0, TAU);
      ctx.stroke();

      // معيّن التحديد
      if (isActive) {
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const s = 19;
        ctx.moveTo(pt.x, pt.y - s); ctx.lineTo(pt.x + s, pt.y);
        ctx.lineTo(pt.x, pt.y + s); ctx.lineTo(pt.x - s, pt.y);
        ctx.closePath();
        ctx.stroke();
      }

      // الرمز
      ctx.globalAlpha = glow;
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.color;
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(p.code, pt.x, pt.y + (isActive ? 22 : 14));
      ctx.restore();
    });
  };

  TacticalMap.prototype._drawSelf = function (ctx, cx, cy, elapsed) {
    const pulse = REDUCED.matches ? 0.4 : (elapsed % 2200) / 2200;
    ctx.save();

    // حلقة ping متوسعة
    if (!REDUCED.matches) {
      ctx.globalAlpha = (1 - pulse) * 0.45;
      ctx.strokeStyle = '#35e8ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + pulse * 46, 0, TAU);
      ctx.stroke();
    }

    // مثلث الاتجاه
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#35e8ff';
    ctx.shadowColor = '#35e8ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx + 6.5, cy + 7);
    ctx.lineTo(cx, cy + 3.5);
    ctx.lineTo(cx - 6.5, cy + 7);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#35e8ff';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('YOU', cx, cy + 12);
    ctx.restore();
  };

  TacticalMap.prototype.destroy = function () {
    this.stop();
    if (this._ro) this._ro.disconnect();
    global.removeEventListener('resize', this._onResize);
    global.removeEventListener('orientationchange', this._onResize);
  };

  global.TacticalMap = TacticalMap;
  global.mulberry32 = mulberry32;
})(window);
