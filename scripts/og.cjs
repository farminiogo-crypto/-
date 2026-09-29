// يولّد صور المشاركة (1200×630) وأصول الشعار مرة واحدة. شغّل الموقع أولًا (npm run build && npx astro preview --port 4321)
// ثم: node scripts/og.cjs   (يحتاج Playwright)
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const ROOT = path.join(__dirname, '..');
const BASE = process.env.BASE || 'http://localhost:4321';
const fm = (file) => {
  const src = fs.readFileSync(file, 'utf8').split('---')[1];
  const get = (k) => { const m = src.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')); return m ? m[1].replace(/^"|"$/g, '').trim() : ''; };
  return { title: get('title'), short: get('short') || get('description') || get('summary'), category: get('category'), level: get('level'), field: get('field') };
};

const items = [{ out: 'default', eyebrow: 'بابل أكاديمي', title: 'من الفكرة إلى المناقشة… نصعد معك درجةً درجة.', sub: 'نرافقك من الفكرة إلى المناقشة — بدقة، وسرية، وفي الموعد.' }];
for (const f of fs.readdirSync(path.join(ROOT, 'src/content/services'))) {
  const d = fm(path.join(ROOT, 'src/content/services', f));
  items.push({ out: `services-${f.replace('.md', '')}`, eyebrow: 'خدمة من بابل أكاديمي', title: d.title, sub: d.short });
}
for (const f of fs.readdirSync(path.join(ROOT, 'src/content/fields'))) {
  const d = fm(path.join(ROOT, 'src/content/fields', f));
  items.push({ out: `fields-${f.replace('.md', '')}`, eyebrow: 'مجال أكاديمي · بابل أكاديمي', title: d.title, sub: d.short });
}
for (const f of fs.readdirSync(path.join(ROOT, 'src/content/portfolio'))) {
  const d = fm(path.join(ROOT, 'src/content/portfolio', f));
  items.push({ out: `work-${f.replace('.md', '')}`, eyebrow: `من أعمالنا · ${d.level} · ${d.field}`, title: d.title, sub: d.short });
}
for (const f of fs.readdirSync(path.join(ROOT, 'src/content/blog'))) {
  const d = fm(path.join(ROOT, 'src/content/blog', f));
  items.push({ out: `blog-${f.replace('.md', '')}`, eyebrow: `المدونة · ${d.category}`, title: d.title, sub: d.short });
}

const html = (zig, it) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:Amiri;font-weight:700;src:url(${BASE}/fonts/amiri-700.woff2) format('woff2')}
@font-face{font-family:Plex;font-weight:400;src:url(${BASE}/fonts/plex-400.woff2) format('woff2')}
@font-face{font-family:Plex;font-weight:600;src:url(${BASE}/fonts/plex-600.woff2) format('woff2')}

@font-face{font-family:Lora;src:url(${BASE}/fonts/lora-400.woff2) format('woff2')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:Plex,sans-serif;color:#F4EFE4;
background:radial-gradient(ellipse 70% 80% at 18% 60%,rgba(61,40,96,.95),transparent 70%),linear-gradient(160deg,#1A0F2B,#2C1A45);display:grid;grid-template-columns:1fr 430px;align-items:center;padding:64px 72px;gap:40px;position:relative}
body:after{content:'';position:absolute;left:0;right:0;bottom:0;height:10px;background:#A63D40}
.t{display:grid;gap:22px}
.brand{display:flex;align-items:center;gap:14px;font-family:Amiri;font-weight:700;font-size:34px}
.brand small{display:block;font-family:Lora;font-size:15px;letter-spacing:.08em;opacity:.7;direction:ltr;text-align:right}
.e{font-size:24px;font-weight:600;color:#C4595B}
h1{font-family:Amiri;font-weight:700;font-size:${it.title.length > 60 ? 46 : it.title.length > 38 ? 54 : 64}px;line-height:1.35}
p{font-size:25px;line-height:1.7;color:rgba(244,239,228,.78);max-width:640px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.z svg{width:100%;height:auto;overflow:visible}
.z .zt__top{fill:rgba(244,239,228,.2);stroke:rgba(244,239,228,.5)}.z .zt__left{fill:rgba(244,239,228,.1);stroke:rgba(244,239,228,.3)}
.z .zt__right{fill:rgba(26,15,43,.55);stroke:rgba(244,239,228,.22)}.z .zt__stair{fill:rgba(166,61,64,.75)}
.z .zt__steps{stroke:rgba(244,239,228,.4);fill:none}.z .zig__line{fill:none;stroke:#C4595B;stroke-width:4;filter:drop-shadow(0 0 6px rgba(196,89,91,.9))}
.z .zig__shadow{fill:rgba(10,5,20,.5);filter:blur(18px)}.z .zt__num,.z .zig__run{display:none}
.z polygon{stroke-width:1.2}
</style></head><body><div class="t">
<div class="brand">${LOGO}<span>بابل أكاديمي<small>Babel Academic</small></span></div>
<div class="e">${it.eyebrow}</div><h1>${it.title}</h1>${it.sub ? `<p>${it.sub}</p>` : ''}</div>
<div class="z">${zig}</div></body></html>`;

const LOGO = `<svg width="54" height="54" viewBox="0 0 40 40"><g fill="#F4EFE4"><rect x="2" y="30" width="36" height="7" rx="1"/><rect x="7" y="22.5" width="26" height="7" rx="1"/><rect x="11.5" y="15" width="17" height="7" rx="1"/><rect x="15.5" y="7.5" width="9" height="7" rx="1"/></g><rect x="18" y="7.5" width="4" height="29.5" fill="#A63D40"/></svg>`;

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const zig = await page.$eval('.zig--hero', (el) => { const c = el.cloneNode(true); c.removeAttribute('class'); c.querySelectorAll('.zt').forEach((g) => g.removeAttribute('style')); return c.outerHTML; });
  const outDir = path.join(ROOT, 'public/og');
  fs.mkdirSync(outDir, { recursive: true });
  for (const it of items) {
    await page.setContent(html(zig, it), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, `${it.out}.png`) });
    console.log('og', it.out);
  }
  // أصول الشعار
  const brandDir = path.join(ROOT, 'public/brand');
  const mark = (bg, size, pad) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg}">${LOGO.replace('width="54" height="54"', `width="${size - pad * 2}" height="${size - pad * 2}"`)}</body></html>`;
  for (const [file, size, pad] of [['apple-touch-icon.png', 180, 26], ['logo.png', 512, 70], ['icon-192.png', 192, 28], ['icon-512.png', 512, 70]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(mark('#2C1A45', size, pad));
    await page.screenshot({ path: path.join(brandDir, file) });
    console.log('brand', file);
  }
  fs.writeFileSync(path.join(brandDir, 'logo.svg'), LOGO.replace('width="54" height="54" ', 'xmlns="http://www.w3.org/2000/svg" ').replace('fill="#F4EFE4"', 'fill="#2C1A45"'));
  await b.close();
})();
