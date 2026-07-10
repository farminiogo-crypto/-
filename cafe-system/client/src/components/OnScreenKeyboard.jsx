import { useEffect, useRef, useState } from 'react';

// كيبورد على الشاشة — يظهر تلقائياً عند التركيز على أي خانة إدخال،
// حروف للنصوص وأرقام للخانات الرقمية. يشتغل بالماوس واللمس.
// مخصص لماكينة الكافيه (شاشة كبيرة)؛ على الموبايل بيسيب الكيبورد الأصلي يظهر.

// يكتب القيمة في الخانة بطريقة تخلّي React يحس بالتغيير (onChange يشتغل)
function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// يحدد نوع الكيبورد المناسب للخانة: أرقام / نص / لا شيء
function fieldMode(el) {
  if (!el) return null;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return null;
  if (el.readOnly || el.disabled) return null;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  const skip = ['checkbox', 'radio', 'range', 'color', 'file', 'date', 'month', 'week', 'time', 'datetime-local', 'submit', 'button', 'reset', 'image'];
  if (skip.includes(type)) return null;
  const im = (el.inputMode || el.getAttribute('inputmode') || '').toLowerCase();
  if (type === 'number' || im === 'numeric' || im === 'decimal' || el.dataset.kb === 'num') return 'num';
  return 'text';
}

// نفس ترتيب كيبورد التلفون/الكمبيوتر العربي بالظبط (يُعرض من الشمال لليمين
// بواسطة direction:ltr في الـ CSS عشان يطابق التلفون تماماً)
const AR = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
  ['أ', 'إ', 'آ', 'ذ', 'ـ'],
];
const EN = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const NUM = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
];

export default function OnScreenKeyboard() {
  const [mode, setMode] = useState(null); // null | 'text' | 'num'
  const [lang, setLang] = useState('ar'); // ar | en (لوضع النص)
  const [enabled, setEnabled] = useState(typeof window !== 'undefined' && window.innerWidth >= 820);
  const targetRef = useRef(null);

  // نفعّل الكيبورد على الشاشات الكبيرة فقط (ماكينة الكافيه) — الموبايل له كيبورده
  useEffect(() => {
    const onResize = () => setEnabled(window.innerWidth >= 820);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!enabled) { setMode(null); return; }
    const onFocusIn = (e) => {
      const el = e.target;
      if (el.closest && el.closest('.osk')) return; // الضغط على الكيبورد نفسه
      const m = fieldMode(el);
      if (m) {
        targetRef.current = el;
        setMode(m);
        setTimeout(() => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {} }, 50);
      } else {
        targetRef.current = null;
        setMode(null);
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [enabled]);

  function focusBack() {
    const el = targetRef.current;
    if (el) requestAnimationFrame(() => { try { el.focus(); } catch {} });
  }

  function type(ch) {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    setNativeValue(el, el.value.slice(0, start) + ch + el.value.slice(end));
    const pos = start + ch.length;
    requestAnimationFrame(() => { try { el.setSelectionRange(pos, pos); el.focus(); } catch {} });
  }
  function backspace() {
    const el = targetRef.current;
    if (!el) return;
    let start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (start === end && start > 0) start--;
    setNativeValue(el, el.value.slice(0, start) + el.value.slice(end));
    requestAnimationFrame(() => { try { el.setSelectionRange(start, start); el.focus(); } catch {} });
  }
  function enter() {
    const el = targetRef.current;
    if (!el) return;
    // يشغّل معالجات Enter (زي الانتقال لخانة الرصيد، حفظ الملاحظة...) أولاً.
    // لو المعالج منع الإرسال (preventDefault) — زي حقل اسم الكاشير اللي بينقل
    // للرصيد بدل ما يفتح الشيفت — ما نعملش submit عشان ما نكررش السلوك.
    const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
    const notPrevented = el.dispatchEvent(ev);
    if (notPrevented && el.tagName === 'INPUT' && el.form && typeof el.form.requestSubmit === 'function') {
      try { el.form.requestSubmit(); } catch {}
      setMode(null);
    }
    // لو الحدث نقل التركيز لخانة تانية، focusin هيظهر لها الكيبورد المناسب تلقائياً
  }

  if (!enabled || !mode) return null;

  const letters = mode === 'num' ? NUM : lang === 'en' ? EN : AR;

  return (
    // onMouseDown preventDefault على كل الحاوية = التركيز يفضل على الخانة، الكيبورد ما يقفلش
    <div className={'osk ' + (mode === 'num' ? 'osk-num' : '')} onMouseDown={(e) => e.preventDefault()}>
      <div className="osk-bar">
        <span className="osk-hint">{mode === 'num' ? '🔢 أرقام' : '⌨️ اكتب'}</span>
        <button type="button" className="osk-close" onClick={() => { setMode(null); if (targetRef.current) targetRef.current.blur(); }}>
          إخفاء ⌄
        </button>
      </div>

      {letters.map((row, r) => (
        <div className="osk-row" key={r}>
          {row.map((k) =>
            k === '⌫' ? (
              <button type="button" key="bk" className="osk-key osk-back" onClick={backspace}>⌫</button>
            ) : (
              <button type="button" key={k} className="osk-key" onClick={() => type(k)}>{k}</button>
            )
          )}
        </div>
      ))}

      <div className="osk-row osk-ctrl">
        {mode === 'text' && (
          <>
            <button type="button" className="osk-key osk-fn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <button type="button" className="osk-key osk-space" onClick={() => type(' ')}>مسافة</button>
            <button type="button" className="osk-key osk-back" onClick={backspace}>⌫</button>
          </>
        )}
        <button type="button" className="osk-key osk-enter" onClick={enter}>تم ↵</button>
      </div>
    </div>
  );
}
