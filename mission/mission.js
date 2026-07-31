/* =========================================================
   mission.js — محرك التجربة
   المراحل، الصوت (Web Audio)، الاهتزاز، العد التنازلي،
   تأثير فك التشفير، وبيانات نقاط التزوّد.
   كل البيانات وهمية ومولّدة داخل المتصفح.
   ========================================================= */
(function () {
  'use strict';

  const $  = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;

  /* ── مؤقتات قابلة للإلغاء دفعة واحدة ───────────────────── */
  let timers = [];
  function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ═══════════════ الصوت ═══════════════════════════════════
     كل الأصوات مولّدة برمجياً — لا ملفات صوتية إطلاقاً.
     AudioContext لا يُنشأ إلا بعد أول لمسة من المستخدم.      */
  const Audio = (function () {
    let ctx = null, master = null, drone = null;
    let muted = false;
    try { muted = localStorage.getItem('mission.muted') === '1'; } catch (e) {}

    function ensure() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
      return ctx;
    }

    function tone(o) {
      if (!ensure() || muted) return;
      const t = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f0, t);
      if (o.f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(o.f1, 1), t + o.dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + Math.min(0.03, o.dur * 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + o.dur + 0.05);
    }

    return {
      unlock: function () { ensure(); },
      get muted() { return muted; },
      setMuted: function (v) {
        muted = !!v;
        try { localStorage.setItem('mission.muted', muted ? '1' : '0'); } catch (e) {}
        if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
        if (muted) Audio.stopDrone();
      },
      click:  function () { tone({ f0: 1500, f1: 700, dur: 0.05, type: 'square', vol: 0.07 }); },
      beep:   function (f) { tone({ f0: f || 880, dur: 0.09, type: 'square', vol: 0.1 }); },
      ok:     function () { tone({ f0: 660, dur: 0.08, type: 'triangle', vol: 0.13 });
                            tone({ f0: 990, dur: 0.12, type: 'triangle', vol: 0.11, delay: 0.07 }); },
      siren:  function (rounds) {
        const n = rounds || 3;
        for (let i = 0; i < n; i++) {
          tone({ f0: 420, f1: 760, dur: 0.42, type: 'sawtooth', vol: 0.16, delay: i * 0.86 });
          tone({ f0: 760, f1: 420, dur: 0.42, type: 'sawtooth', vol: 0.16, delay: i * 0.86 + 0.43 });
        }
      },
      deny: function () {
        tone({ f0: 220, f1: 55, dur: 0.9, type: 'sawtooth', vol: 0.22 });
        tone({ f0: 110, f1: 40, dur: 1.1, type: 'square', vol: 0.14, delay: 0.05 });
      },
      whoosh: function () { tone({ f0: 180, f1: 1200, dur: 0.28, type: 'triangle', vol: 0.1 }); },
      startDrone: function () {
        if (!ensure() || muted || drone) return;
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 55;
        osc2.type = 'sine'; osc2.frequency.value = 58.5;
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.035, ctx.currentTime, 1.2);
        osc.connect(g); osc2.connect(g); g.connect(master);
        osc.start(); osc2.start();
        drone = { osc: osc, osc2: osc2, g: g };
      },
      stopDrone: function () {
        if (!drone) return;
        const d = drone; drone = null;
        try {
          d.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
          d.osc.stop(ctx.currentTime + 1.2);
          d.osc2.stop(ctx.currentTime + 1.2);
        } catch (e) {}
      }
    };
  })();

  /* ── الاهتزاز (غير مدعوم على iOS — يتدهور بسلاسة) ──────── */
  const canVibrate = 'vibrate' in navigator;
  function buzz(pattern) {
    if (!canVibrate || REDUCED) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }

  /* ── ومضة الشاشة عند الانتقالات ────────────────────────── */
  const fxFlash = $('#fxFlash');
  function flash() {
    if (REDUCED) return;
    fxFlash.classList.add('on');
    setTimeout(function () { fxFlash.classList.remove('on'); }, 90);
  }

  /* ── تأثير فك التشفير للنصوص ───────────────────────────── */
  const SCRAMBLE = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي٠١٢٣٤٥٦٧٨٩#%&@*';
  function decrypt(el, delay) {
    const target = el.dataset.decrypt || el.textContent;
    if (REDUCED) { el.textContent = target; return; }
    const chars = Array.from(target);
    el.textContent = '';
    let revealed = 0;
    let raf = null;
    const startAt = performance.now() + (delay || 0);

    function step(now) {
      if (now < startAt) { raf = requestAnimationFrame(step); return; }
      const elapsed = now - startAt;
      revealed = Math.floor(elapsed / 34);
      let out = '';
      for (let i = 0; i < chars.length; i++) {
        if (i < revealed || chars[i] === ' ') out += chars[i];
        else out += SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
      }
      el.textContent = out;
      if (revealed < chars.length) raf = requestAnimationFrame(step);
      else el.textContent = target;
    }
    raf = requestAnimationFrame(step);
    return function () { if (raf) cancelAnimationFrame(raf); el.textContent = target; };
  }

  /* ═══════════════ نقاط التزوّد ═══════════════════════════ */
  const SCALE_M = 1600;               // متر لكل نصف قطر معياري
  const POIS = [
    {
      id: 'vx', code: 'VX-09', color: '#ffb020',
      x: 0.42, y: -0.46,
      name: 'نقطة التحرك — المركبة',
      sub: 'أقرب مركبة انطلاق جاهزة',
      status: 'المحرك يعمل · جاهزة',
      detail: 'مدرعة تحرك خفيفة متمركزة خلف الساتر الترابي. تنطلق القافلة فور اكتمال الطاقم.',
      tags: ['مدرعة خفيفة', '٦ مقاعد', 'وقود ممتلئ', 'سائق بانتظارك'],
      icon: '<svg viewBox="0 0 24 24"><path d="M3 15v-3.2c0-.4.1-.7.3-1l2.2-3.3A2 2 0 0 1 7.2 6h8.3a2 2 0 0 1 1.6.8l2.6 3.4c.2.2.3.5.3.8V15h-2.1a2.9 2.9 0 0 0-5.8 0h-2.2a2.9 2.9 0 0 0-5.8 0H3zm4.9-6.6L6.4 11h4V8.4H7.9zm4.6 0V11h5l-2-2.6h-3z"/><circle cx="6.9" cy="16.3" r="1.9"/><circle cx="17.1" cy="16.3" r="1.9"/></svg>'
    },
    {
      id: 'ar', code: 'AR-14', color: '#00ffb2',
      x: -0.52, y: 0.28,
      name: 'نقطة التزود بالأدوات',
      sub: 'مستودع العتاد الميداني',
      status: 'مفتوح · أمين العهدة موجود',
      detail: 'حاوية عتاد مموّهة عند حافة الوادي. استلم تجهيزتك الكاملة وسجّل خروجها بالرمز.',
      tags: ['درع واقٍ', 'أدوات اقتحام', 'حبال ومشابك', 'حقيبة إسعاف'],
      icon: '<svg viewBox="0 0 24 24"><path d="M9 3h6a1 1 0 0 1 1 1v2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3V4a1 1 0 0 1 1-1zm1 3h4V5h-4v1zm2 4.5a1 1 0 0 0-1 1V13H9.5a1 1 0 0 0 0 2H11v1.5a1 1 0 0 0 2 0V15h1.5a1 1 0 0 0 0-2H13v-1.5a1 1 0 0 0-1-1z"/></svg>'
    },
    {
      id: 'sg', code: 'SG-03', color: '#35e8ff',
      x: 0.18, y: 0.62,
      name: 'نقطة التزود بالأجهزة',
      sub: 'وحدة الاتصالات والإلكترونيات',
      status: 'قيد التجهيز — ٣ دقائق',
      detail: 'شاحنة الاتصالات متوقفة تحت الجسر. استلم جهازك المشفّر وتأكد من مزامنة التردد.',
      tags: ['جهاز اتصال مشفّر', 'نظارة ليلية', 'جهاز تشويش', 'طائرة استطلاع'],
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2a1 1 0 0 1 1 1v9.3a3 3 0 1 1-2 0V3a1 1 0 0 1 1-1z"/><path d="M6.2 4.8a1 1 0 0 1 0 1.4 8 8 0 0 0 0 11.6 1 1 0 1 1-1.4 1.4 10 10 0 0 1 0-14.4 1 1 0 0 1 1.4 0zm11.6 0a1 1 0 0 1 1.4 0 10 10 0 0 1 0 14.4 1 1 0 0 1-1.4-1.4 8 8 0 0 0 0-11.6 1 1 0 0 1 0-1.4z" opacity=".65"/></svg>'
    }
  ];

  // مسافات ووقت وصول محسوبة من الإحداثيات — ثابتة عبر الجلسة
  POIS.forEach(function (p) {
    const m = Math.round(Math.hypot(p.x, p.y) * SCALE_M);
    p.meters = m;
    p.distText = m >= 1000 ? (m / 1000).toFixed(1) + ' كم' : m + ' م';
    p.eta = Math.max(2, Math.round(m / 150));
    p.visited = false;
  });

  /* ═══════════════ العد التنازلي ══════════════════════════ */
  const TOTAL_MS = 4 * 60000 + 30000;      // 04:30
  const cdEls = [$('#countdown'), $('#countdownMap')];
  let cdStart = null, cdRaf = null, cdLastBeep = -1;

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function cdTick() {
    const left = TOTAL_MS - (performance.now() - cdStart);
    const txt = fmt(left);
    const secs = Math.ceil(left / 1000);

    cdEls.forEach(function (el) {
      if (!el) return;
      el.textContent = txt;
      el.classList.toggle('warn', left <= 120000 && left > 60000);
      el.classList.toggle('crit', left <= 60000);
    });

    // نبضة كل ثانية في آخر ١٥ ثانية، وكل ٥ ثوانٍ في آخر دقيقة
    if (secs !== cdLastBeep) {
      cdLastBeep = secs;
      if (secs <= 15 && secs > 0) { Audio.beep(1200); buzz(35); }
      else if (secs <= 60 && secs % 5 === 0) { Audio.beep(900); }
    }

    if (left <= 0) { stopCountdown(); go('timeout'); return; }
    cdRaf = requestAnimationFrame(cdTick);
  }

  function startCountdown() {
    if (cdStart !== null) return;
    cdStart = performance.now();
    cdLastBeep = -1;
    cdRaf = requestAnimationFrame(cdTick);
  }
  function stopCountdown() {
    if (cdRaf) cancelAnimationFrame(cdRaf);
    cdRaf = null; cdStart = null;
    cdEls.forEach(function (el) { if (el) el.classList.remove('warn', 'crit'); });
  }

  /* ═══════════════ الخريطة ════════════════════════════════ */
  let tmap = null;
  let visited = 0;
  let joinUnlocked = false;

  function buildPoiList() {
    const host = $('#poiList');
    host.innerHTML = '';
    POIS.forEach(function (p) {
      const el = document.createElement('div');
      el.className = 'poi';
      el.dataset.poi = p.id;
      el.style.setProperty('--poi-color', p.color);
      // <bdi> يعزل الرموز اللاتينية كي لا تختل مع النص العربي
      el.innerHTML =
        '<button type="button" class="poi-head" aria-expanded="false">' +
          '<span class="poi-ico">' + p.icon + '</span>' +
          '<span class="poi-txt">' +
            '<span class="poi-name">' + p.name + '</span>' +
            '<span class="poi-sub"><bdi>' + p.code + '</bdi> · ' + p.sub + '</span>' +
          '</span>' +
          '<span class="poi-dist"><b><bdi>' + p.distText + '</bdi></b>' +
            '<small><bdi>' + p.eta + ' د</bdi></small></span>' +
        '</button>' +
        '<div class="poi-detail">' +
          '<span class="poi-status">' + p.status + '</span>' +
          '<p>' + p.detail + '</p>' +
          '<ul>' + p.tags.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        '</div>';
      const head = el.querySelector('.poi-head');
      head.addEventListener('click', function () { selectPoi(p.id); });
      host.appendChild(el);
      p._row = el;
      p._head = head;
    });
  }

  function selectPoi(id) {
    const p = POIS.filter(function (q) { return q.id === id; })[0];
    if (!p) return;

    const isOpen = p._row.classList.contains('active');
    POIS.forEach(function (q) {
      q._row.classList.remove('active');
      q._head.setAttribute('aria-expanded', 'false');
    });

    if (isOpen) {
      tmap && tmap.select(null);
      Audio.click();
      return;
    }

    p._row.classList.add('active');
    p._head.setAttribute('aria-expanded', 'true');
    tmap && tmap.select(id);
    Audio.beep(1040);
    buzz(25);

    if (!p.visited) {
      p.visited = true;
      p._row.classList.add('visited');
      visited++;
      updateVisits();
    }
    p._row.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
  }

  function updateVisits() {
    $('#visitCount').textContent = visited + ' / ' + POIS.length;
    $('#visitBar').style.width = (visited / POIS.length * 100) + '%';
    if (visited >= POIS.length) unlockJoin('اكتمل التفقّد — أنت جاهز للانضمام');
    else $('#mapHint').textContent = 'تفقّد النقاط الثلاث قبل طلب الانضمام (' + visited + '/3)';
  }

  function unlockJoin(msg) {
    if (joinUnlocked) return;
    joinUnlocked = true;
    $('#btnJoin').classList.remove('locked');
    $('#mapHint').textContent = msg;
    Audio.ok();
    buzz([40, 60, 40]);
  }

  /* ═══════════════ محرك المراحل ═══════════════════════════ */
  let stage = 'boot';
  let interacted = false;      // لا نُركّز الأزرار قبل أول تفاعل من المستخدم

  function go(name) {
    clearTimers();
    stage = name;
    flash();
    Audio.whoosh();
    body.dataset.stage = name;
    if (tmap) (name === 'map' ? tmap.start() : tmap.stop());
    const runner = STAGES[name];
    if (runner) runner();
    const first = $('.stage[data-for="' + name + '"] .btn');
    if (interacted && first && name !== 'map') {
      later(function () { first.focus({ preventScroll: true }); }, 400);
    }
  }

  document.addEventListener('pointerdown', function () { interacted = true; }, { once: true });
  document.addEventListener('keydown', function () { interacted = true; }, { once: true });

  const STAGES = {
    /* 1 ── الإنذار الوارد */
    alert: function () {
      const t0 = Date.now();
      const el = $('#ringTimer');
      (function tickRing() {
        if (stage !== 'alert') return;
        const s = Math.floor((Date.now() - t0) / 1000);
        el.textContent = 'يرنّ منذ ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
        later(tickRing, 500);
      })();
    },

    /* 2 ── المصادقة */
    auth: function () {
      Audio.startDrone();
      const items = $$('#authList li');
      const bar = $('#authBar');
      items.forEach(function (li) { li.dataset.ok = 'pending'; });
      bar.style.width = '0%';

      items.forEach(function (li, i) {
        later(function () {
          li.dataset.ok = 'run';
          Audio.click();
        }, 250 + i * 780);
        later(function () {
          li.dataset.ok = 'done';
          bar.style.width = ((i + 1) / items.length * 100) + '%';
          Audio.beep(760 + i * 110);
          buzz(20);
        }, 250 + i * 780 + 560);
      });

      later(function () { go('briefing'); }, 250 + items.length * 780 + 620);
    },

    /* 3 ── موجز المهمة */
    briefing: function () {
      $$('[data-decrypt]').forEach(function (el, i) { decrypt(el, i * 130); });
      later(function () { Audio.beep(660); }, 200);
      startCountdown();
    },

    /* 4 ── الخريطة */
    map: function () {
      startCountdown();
      if (!tmap) {
        tmap = new TacticalMap($('#tacticalMap'), $('#hotspots'), POIS, { onSelect: selectPoi });
        buildPoiList();
      }
      tmap.start();
      updateVisits();
      if (!joinUnlocked) {
        $('#btnJoin').classList.add('locked');
        $('#mapHint').textContent = 'تفقّد النقاط الثلاث قبل طلب الانضمام (' + visited + '/3)';
        // شبكة أمان: لا نترك أحداً عالقاً
        later(function () { unlockJoin('نافذة الانضمام مفتوحة'); }, 20000);
      }
    },

    /* 5 ── التحقق من التصريح */
    verify: function () {
      stopCountdown();
      const items = $$('#verifyList li');
      const bar = $('#verifyBar');
      const spin = $('#verifySpin');
      items.forEach(function (li) { li.dataset.ok = 'pending'; });
      bar.style.width = '0%';
      bar.classList.remove('fail');
      spin.classList.remove('fail');

      const outcomes = ['done', 'done', 'fail'];
      outcomes.forEach(function (res, i) {
        later(function () { items[i].dataset.ok = 'run'; Audio.click(); }, 200 + i * 900);
        later(function () {
          items[i].dataset.ok = res;
          bar.style.width = ((i + 1) / items.length * 100) + '%';
          if (res === 'done') { Audio.beep(820 + i * 120); buzz(20); }
          else {
            bar.classList.add('fail');
            spin.classList.add('fail');
            Audio.deny();
            buzz([120, 70, 120, 70, 260]);
          }
        }, 200 + i * 900 + 620);
      });

      later(function () { go('denied'); }, 200 + outcomes.length * 900 + 900);
    },

    /* 6 ── غير متاح بالخدمة */
    denied: function () {
      stopCountdown();
      Audio.stopDrone();
      Audio.deny();
      buzz([200, 90, 200]);
      $('#refNo').textContent = 'DN-' + String(Math.floor(Math.random() * 90000) + 10000) + '-VII';
    },

    timeout: function () {
      stopCountdown();
      Audio.stopDrone();
      Audio.deny();
      buzz([300, 100, 300]);
    }
  };

  /* ═══════════════ الشريط العلوي ══════════════════════════ */
  (function chrome() {
    const clock = $('#topClock');
    const bars = $$('#sigBars i');
    const battText = $('#battText');
    const battFill = $('.batt b');
    let batt = 87;

    setInterval(function () {
      const d = new Date();
      clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map(function (n) { return String(n).padStart(2, '0'); }).join(':');
    }, 1000);

    setInterval(function () {
      const n = 2 + Math.floor(Math.random() * 3);
      bars.forEach(function (b, i) { b.classList.toggle('on', i < n); });
    }, 1400);

    setInterval(function () {
      batt = Math.max(41, batt - 1);
      battText.textContent = batt + '%';
      battFill.style.width = batt + '%';
    }, 25000);
  })();

  /* ═══════════════ الربط ══════════════════════════════════ */
  const muteBtn = $('#muteBtn');
  muteBtn.setAttribute('aria-pressed', String(Audio.muted));
  muteBtn.addEventListener('click', function () {
    Audio.setMuted(!Audio.muted);
    muteBtn.setAttribute('aria-pressed', String(Audio.muted));
    muteBtn.setAttribute('aria-label', Audio.muted ? 'تشغيل الصوت' : 'كتم الصوت');
    if (!Audio.muted) { Audio.unlock(); Audio.beep(900); if (stage !== 'alert') Audio.startDrone(); }
  });

  $('#btnAccept').addEventListener('click', function () {
    Audio.unlock();            // أول لمسة: تفعيل سياق الصوت
    Audio.siren(2);
    buzz([250, 90, 250, 90, 420]);
    go('auth');
  });

  $('#btnOpenMap').addEventListener('click', function () { Audio.click(); go('map'); });

  $('#btnJoin').addEventListener('click', function () {
    if (!joinUnlocked) return;
    Audio.click();
    go('verify');
  });

  $('#btnUnavailable').addEventListener('click', function () {
    Audio.click();
    $('#deniedReason').innerHTML = 'سحبتَ طلبك. حالتك في السجل: <b>غير متاح بالخدمة</b>.';
    go('denied');
  });

  function restart() {
    stopCountdown();
    joinUnlocked = false;
    visited = 0;
    POIS.forEach(function (p) {
      p.visited = false;
      if (p._row) p._row.classList.remove('visited', 'active');
    });
    if (tmap) tmap.select(null);
    $('#deniedReason').innerHTML = 'حالتك في السجل: <b>خارج الخدمة</b>. لا يمكن ضمّك إلى هذه العملية.';
    Audio.click();
    go('alert');
  }
  $('#btnRestart').addEventListener('click', restart);
  $('#btnRestart2').addEventListener('click', restart);

  // توفير البطارية: أوقف الرسم عند إخفاء التبويب
  document.addEventListener('visibilitychange', function () {
    if (!tmap) return;
    if (document.hidden) tmap.stop();
    else if (stage === 'map') tmap.start();
  });

  /* ── قدرة تشخيص: ?stage=map للقفز مباشرة إلى أي مرحلة ──── */
  const wanted = new URLSearchParams(location.search).get('stage');
  const valid = ['alert', 'auth', 'briefing', 'map', 'verify', 'denied', 'timeout'];

  if (wanted && valid.indexOf(wanted) !== -1) {
    if (wanted === 'map' || wanted === 'verify') {
      // هيّئ الخريطة أولاً كي تظهر الحالة كاملة في اللقطة
      tmap = new TacticalMap($('#tacticalMap'), $('#hotspots'), POIS, { onSelect: selectPoi });
      buildPoiList();
      POIS.forEach(function (p) { p.visited = true; p._row.classList.add('visited'); });
      visited = POIS.length;
      POIS[0]._row.classList.add('active');
      tmap.select(POIS[0].id);
    }
    go(wanted);
    if (wanted === 'map') unlockJoin('اكتمل التفقّد — أنت جاهز للانضمام');
  } else {
    go('alert');
  }
})();
