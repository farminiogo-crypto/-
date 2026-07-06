// إيصال بمقاس طابعة حرارية 80مم — قابل للطباعة مباشرة
export default function Receipt({ order, onClose }) {
  const fmt = (n) => Number(n || 0).toFixed(2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-body" id="receipt-print">
          <div className="receipt-logo">☕</div>
          <h3>كافيه كابانا</h3>
          <p className="receipt-no">فاتورة: {order.order_no}</p>
          <p className="receipt-meta">
            {order.table_name}
            {order.customer_name ? ` • ${order.customer_name}` : ''} • {order.cashier_name}
          </p>
          <p className="receipt-meta">{(order.paid_at || '').replace('T', ' ')}</p>
          <div className="receipt-sep" />
          <table className="receipt-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th className="c">الكمية</th>
                <th className="l">السعر</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.name}</td>
                  <td className="c">{it.qty}</td>
                  <td className="l">{fmt(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="receipt-sep" />
          <div className="rc-row total">
            <span>الإجمالي</span>
            <span>{fmt(order.total)} ج</span>
          </div>
          <div className="rc-row">
            <span>طريقة الدفع</span>
            <span>كاش 💵</span>
          </div>
          <p className="receipt-thanks">شكراً لزيارتكم 🌟</p>
        </div>

        <div className="receipt-actions">
          <button className="btn-primary" onClick={() => window.print()}>🖨️ طباعة الإيصال</button>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
