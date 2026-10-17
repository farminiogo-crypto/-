// تقرير الشيفت بمقاس طابعة حرارية 80مم — قابل للطباعة عند قفل الشيفت
import { printReceipt } from '../print.js';

export default function ShiftReceipt({ shift, onClose }) {
  const fmt = (n) => Number(n || 0).toFixed(2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-body" id="receipt-print">
          <div className="receipt-logo">☕</div>
          <h3>كافيه كابانا</h3>
          <p className="receipt-no">📋 تقرير الشيفت</p>
          <p className="receipt-meta">الشيفت: {shift.name}</p>
          <p className="receipt-meta">الكاشير: {shift.user_name}</p>
          <p className="receipt-meta">فتح: {(shift.opened_at || '').replace('T', ' ')}</p>
          <p className="receipt-meta">قفل: {(shift.closed_at || '').replace('T', ' ')}</p>

          <div className="receipt-sep" />
          <div className="rc-row"><span>رصيد بداية الدرج</span><span>{fmt(shift.opening_cash)} ج</span></div>
          <div className="rc-row"><span>عدد الفواتير</span><span>{shift.sales_count}</span></div>
          <div className="rc-row"><span>مبيعات كاش</span><span>+{fmt(shift.sales_total)} ج</span></div>
          <div className="rc-row"><span>مصروفات</span><span>−{fmt(shift.expenses_total)} ج</span></div>

          <div className="receipt-sep" />
          <div className="rc-row total"><span>المتوقع في الدرج</span><span>{fmt(shift.expected_cash)} ج</span></div>
          <div className="rc-row"><span>المعدود فعلياً</span><span>{fmt(shift.closing_cash)} ج</span></div>
          <div className="rc-row"><span>الفرق</span><span>{fmt(shift.difference)} ج</span></div>

          {shift.open_tables > 0 && (
            <p className="receipt-meta">⚠️ ترابيزات مفتوحة محمولة للشيفت الجاي: {shift.open_tables}</p>
          )}
          {shift.notes ? <p className="receipt-meta">ملاحظات: {shift.notes}</p> : null}
          <p className="receipt-thanks">— نهاية التقرير —</p>
        </div>

        <div className="receipt-actions">
          <button className="btn-primary" onClick={printReceipt}>🖨️ طباعة تقرير الشيفت</button>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
