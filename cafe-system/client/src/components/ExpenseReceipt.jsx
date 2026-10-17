// إيصال مصروفات بمقاس طابعة حرارية 80مم — يستخدم نفس أنماط الطباعة (#receipt-print)
import { printReceipt } from '../print.js';

export default function ExpenseReceipt({ expense, onClose }) {
  const fmt = (n) => Number(n || 0).toFixed(2);
  // expense: إما مصروف واحد {description, amount, user_name, created_at}
  // أو ملخص {items:[...], total, count}
  const isSummary = Array.isArray(expense.items);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-body" id="receipt-print">
          <div className="receipt-logo">☕</div>
          <h3>كافيه كابانا</h3>
          <p className="receipt-no">{isSummary ? 'إيصال مصروفات الشيفت' : 'إيصال مصروف'}</p>
          <p className="receipt-meta">{new Date().toLocaleString('ar-EG')}</p>
          <div className="receipt-sep" />

          {isSummary ? (
            <>
              <table className="receipt-table">
                <tbody>
                  {expense.items.map((e, i) => (
                    <tr key={i}>
                      <td>{e.description}</td>
                      <td className="l">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="receipt-sep" />
              <div className="rc-row total">
                <span>إجمالي المصروفات ({expense.items.length})</span>
                <span>{fmt(expense.total)} ج</span>
              </div>
            </>
          ) : (
            <>
              <div className="rc-row">
                <span>البيان</span>
                <span>{expense.description}</span>
              </div>
              <div className="rc-row">
                <span>بواسطة</span>
                <span>{expense.user_name || '—'}</span>
              </div>
              <div className="receipt-sep" />
              <div className="rc-row total">
                <span>المبلغ</span>
                <span>{fmt(expense.amount)} ج</span>
              </div>
            </>
          )}

          <p className="receipt-thanks">إيصال صرف من الدرج</p>
        </div>

        <div className="receipt-actions">
          <button className="btn-primary" onClick={printReceipt}>🖨️ طباعة الإيصال</button>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
