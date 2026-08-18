import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '../api/client';

export default function PrintReceipt() {
  const { invoiceId } = useParams();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-print', invoiceId],
    queryFn: () => invoiceApi.get(invoiceId).then(r => r.data),
  });

  useEffect(() => {
    if (invoice) {
      document.title = `Receipt — INV-${String(invoice.id).padStart(5, '0')} — ${invoice.patient_name}`;
    }
  }, [invoice]);

  if (isLoading) return <div style={{ padding: 40 }}>Loading receipt...</div>;
  if (!invoice) return <div style={{ padding: 40 }}>Invoice not found.</div>;

  const printDate = new Date().toLocaleString();

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Georgia', serif; font-size: 12pt; color: #000; background: #fff; }
        .no-print { display: none; }
        @media screen {
          .no-print { display: block; }
          body { padding: 20px; background: #f5f5f5; }
          .receipt-paper { background: #fff; max-width: 680px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
        }
        @media print {
          body { padding: 0; background: #fff; }
          .receipt-paper { padding: 20px; box-shadow: none; }
          .no-print { display: none !important; }
        }
        .divider { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
        .divider-bold { border: none; border-top: 2px solid #000; margin: 14px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10pt; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #000; padding: 6px 4px; text-align: left; }
        td { padding: 6px 4px; font-size: 11pt; border-bottom: 1px solid #eee; }
        .right { text-align: right; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .total-row td { font-weight: bold; font-size: 12pt; border-bottom: 2px solid #000; border-top: 1px solid #000; }
        .paid-stamp { border: 3px solid #22c55e; color: #22c55e; display: inline-block; padding: 4px 16px; font-size: 18pt; font-weight: bold; letter-spacing: .1em; transform: rotate(-8deg); margin-top: 12px; }
        .unpaid-stamp { border: 3px solid #ef4444; color: #ef4444; display: inline-block; padding: 4px 16px; font-size: 18pt; font-weight: bold; letter-spacing: .1em; transform: rotate(-8deg); margin-top: 12px; }
      `}</style>

      <div className="receipt-paper">
        {/* Print button */}
        <div className="no-print" style={{ textAlign: 'right', marginBottom: 16 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '13pt' }}
          >
            🖨 Print Receipt
          </button>
        </div>

        {/* Clinic header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', fontSize: '18pt', letterSpacing: '.05em' }}>CLINIX HEALTHCARE</div>
          <div style={{ fontSize: '10pt', color: '#444' }}>Medical Receipt</div>
        </div>

        <hr className="divider-bold" />

        {/* Receipt meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', fontSize: '10.5pt', marginBottom: 16 }}>
          <div><span style={{ color: '#666' }}>Receipt No.:</span> <strong>INV-{String(invoice.id).padStart(5, '0')}</strong></div>
          <div><span style={{ color: '#666' }}>Date Printed:</span> {printDate}</div>
          <div><span style={{ color: '#666' }}>Patient:</span> <strong>{invoice.patient_name}</strong></div>
          <div><span style={{ color: '#666' }}>Visit Ref.:</span> VIS-{String(invoice.visit).padStart(5, '0')}</div>
        </div>

        <hr className="divider" />

        {/* Line items */}
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th className="right">Unit Price</th>
              <th className="right">Amount (KES)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr><td colSpan={4} style={{ color: '#888', fontStyle: 'italic' }}>No itemized charges.</td></tr>
            ) : (
              invoice.items.map(item => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="center">{item.quantity}</td>
                  <td className="right">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="right bold">{Number(item.total_price).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} className="right">TOTAL</td>
              <td className="right">KES {Number(invoice.total_amount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <>
            <hr className="divider" />
            <div style={{ fontWeight: 'bold', fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Payments</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="right">Paid (KES)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.paid_at).toLocaleString()}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td>{p.reference || '—'}</td>
                    <td className="right bold">{Number(p.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Balance summary */}
        <hr className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11pt' }}>Total Charged: <strong>KES {Number(invoice.total_amount).toFixed(2)}</strong></div>
            <div style={{ fontSize: '11pt' }}>Amount Paid: <strong>KES {Number(invoice.amount_paid).toFixed(2)}</strong></div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: 6 }}>Balance Due: KES {Number(invoice.balance).toFixed(2)}</div>
          </div>
          <div className="center">
            {invoice.status === 'paid'
              ? <div className="paid-stamp">PAID</div>
              : <div className="unpaid-stamp">{invoice.status === 'partially_paid' ? 'PARTIAL' : 'UNPAID'}</div>
            }
          </div>
        </div>

        <hr className="divider" />
        <div style={{ textAlign: 'center', fontSize: '9pt', color: '#888', marginTop: 16 }}>
          Thank you for choosing Clinix Healthcare. This is a computer-generated receipt.
        </div>
      </div>
    </>
  );
}
