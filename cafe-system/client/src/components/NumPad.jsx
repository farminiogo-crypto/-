import { useState } from 'react';

// لوحة أرقام باللمس — تُستخدم بدل حقل الإدخال العادي لإدخال المبالغ والكميات
// من غير كيبورد، عشان شاشة التاتش. القيمة نصية (string) وتتبعت عبر onChange.
export default function NumPad({ value, onChange, placeholder = '0', allowDecimal = true, unit = 'ج' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  function start() {
    setDraft(value ? String(value) : '');
    setOpen(true);
  }

  function press(k) {
    setDraft((d) => {
      if (k === '.') {
        if (!allowDecimal || d.includes('.')) return d;
        return d === '' ? '0.' : d + '.';
      }
      if (d === '0') return k; // امنع الأصفار البادئة (05 → 5)
      // حد أقصى منطقي للأرقام
      if (d.replace('.', '').length >= 8) return d;
      return d + k;
    });
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowDecimal ? '.' : '', '0', '⌫'];

  return (
    <>
      <button
        type="button"
        className={'numpad-field' + (value ? '' : ' placeholder')}
        onClick={start}
      >
        <span>{value ? String(value) : placeholder}</span>
        {unit && <em className="numpad-unit">{unit}</em>}
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
    </>
  );
}
