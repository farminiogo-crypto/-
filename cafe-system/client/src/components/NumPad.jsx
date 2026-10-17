import { useState, forwardRef } from 'react';

// حقل إدخال أرقام يشتغل بالكيبورد **و** باللمس:
// - تقدر تكتب بالكيبورد عادي (أرقام + علامة عشرية).
// - أو تضغط زر 🔢 فتفتح لوحة أرقام كبيرة للمس.
// القيمة نصية (string) وتتبعت عبر onChange. onEnter يتنفّذ عند ضغط Enter في الحقل.
const NumPad = forwardRef(function NumPad(
  { value, onChange, placeholder = '0', allowDecimal = true, unit = 'ج', onEnter },
  ref
) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  // يقبل أرقام وعلامة عشرية واحدة فقط
  function sanitize(v) {
    v = String(v).replace(/[^\d.]/g, '');
    if (!allowDecimal) v = v.replace(/\./g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    return v;
  }

  function press(k) {
    setDraft((d) => {
      if (k === '.') {
        if (!allowDecimal || d.includes('.')) return d;
        return d === '' ? '0.' : d + '.';
      }
      if (d === '0') return k; // امنع الأصفار البادئة
      if (d.replace('.', '').length >= 9) return d;
      return d + k;
    });
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowDecimal ? '.' : '', '0', '⌫'];

  return (
    <div className="numpad-wrap">
      <input
        ref={ref}
        className="numpad-input"
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(sanitize(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      <button
        type="button"
        className="numpad-open"
        title="لوحة أرقام"
        onClick={() => {
          setDraft(value ? String(value) : '');
          setOpen(true);
        }}
      >
        🔢
      </button>

      {open && (
        <div className="numpad-overlay" onClick={() => setOpen(false)}>
          <div className="numpad" onClick={(e) => e.stopPropagation()}>
            <div className="numpad-display">
              {draft || '0'} {unit && <span>{unit}</span>}
            </div>
            <div className="numpad-keys">
              {keys.map((k, i) =>
                k === '' ? (
                  <span key={i} className="np-blank" />
                ) : k === '⌫' ? (
                  <button key={i} type="button" className="np-key np-back" onClick={() => setDraft((d) => d.slice(0, -1))}>
                    ⌫
                  </button>
                ) : (
                  <button key={i} type="button" className="np-key" onClick={() => press(k)}>
                    {k}
                  </button>
                )
              )}
            </div>
            <div className="numpad-actions">
              <button type="button" className="np-clear" onClick={() => setDraft('')}>
                مسح
              </button>
              <button type="button" className="np-done" onClick={() => { onChange(draft); setOpen(false); }}>
                تم ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default NumPad;
