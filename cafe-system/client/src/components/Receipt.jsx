// إيصال قابل للطباعة يظهر بعد الدفع
const LABELS = { cash: 'كاش', card: 'فيزا', wallet: 'محفظة' };

export default function Receipt({ order, onClose }) {
  const fmt = (n) => Number(n).toFixed(2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-body" id="receipt-print">
          <div className="receipt-logo">☕</div>
          <h3>كافيه</h3>
          <p className="receipt-no">رقم الطلب: {order.order_no}</p>
          <p className="receipt-meta">
            الكاشير: {order.cashier_name} • {LABELS[order.payment_method]}
          </p>
          <hr />
          <table className="receipt-table">
            <tbody>
              {order.items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.name}</td>
                  <td className="c">×{it.qty}</td>
                  <td className="l">{fmt(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <div className="rc-row">
            <span>المجموع</span>
            <span>{fmt(order.subtotal)} ج</span>
          </div>
          {order.discount > 0 && (
            <div className="rc-row">
              <span>خصم</span>
              <span>-{fmt(order.discount)} ج</span>
            </div>
          )}
          <div className="rc-row">
            <span>ضريبة</span>
            <span>{fmt(order.tax)} ج</span>
          </div>
          <div className="rc-row total">
            <span>الإجمالي</span>
            <span>{fmt(order.total)} ج</span>
          </div>
          <p className="receipt-thanks">شكراً لزيارتكم 🌟</p>
        </div>

        <div className="receipt-actions">
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
          <button className="btn-ghost" onClick={onClose}>
            طلب جديد
          </button>
        </div>
      </div>
    </div>
  );
}
