// يعزل المقاطع اللاتينية داخل الفقرات العربية بعنصر <bdi dir="ltr"> حتى لا تنقلب الأقواس وترتيب الكلمات،
// مثل (Author, 2020, p. 45) أو APA 7 داخل جملة عربية. لا يلمس الشيفرة ولا كتل المراجع الإنجليزية.
const LATIN_RUN = /\(?[A-Za-z][A-Za-z0-9.,&:;'’/+\-–\s]*[A-Za-z0-9.)]\)?|\(?[A-Za-z]\)?/g;
const ARABIC = /[؀-ۿ]/;
const SKIP = new Set(['code', 'pre', 'bdi', 'script', 'style', 'svg']);

function walk(node, skip) {
  if (!node.children) return;
  const isSkip = skip || SKIP.has(node.tagName) || (node.properties && (node.properties.dir === 'ltr' || String(node.properties.className || '').includes('ref')));
  const out = [];
  for (const child of node.children) {
    if (child.type === 'text' && !isSkip && ARABIC.test(child.value) && /[A-Za-z]/.test(child.value)) {
      let last = 0;
      const v = child.value;
      for (const m of v.matchAll(LATIN_RUN)) {
        if (m.index > last) out.push({ type: 'text', value: v.slice(last, m.index) });
        out.push({ type: 'element', tagName: 'bdi', properties: { dir: 'ltr' }, children: [{ type: 'text', value: m[0] }] });
        last = m.index + m[0].length;
      }
      if (last < v.length) out.push({ type: 'text', value: v.slice(last) });
    } else {
      if (child.type === 'element') walk(child, isSkip);
      out.push(child);
    }
  }
  node.children = out;
}

export default function rehypeBidi() {
  return (tree) => walk(tree, false);
}
