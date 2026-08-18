import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi, paymentApi } from '../api/client';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Plus, Printer, CreditCard, Smartphone,
  Banknote, Shield, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

const METHODS = [
  { value: 'cash',      label: 'Cash',      icon: Banknote },
  { value: 'mpesa',     label: 'M-Pesa',    icon: Smartphone },
  { value: 'card',      label: 'Card',      icon: CreditCard },
  { value: 'insurance', label: 'Insurance', icon: Shield },
];

const STATUS_CONFIG = {
  unpaid:         { label: 'Unpaid',   color: '#ef4444' },
  partially_paid: { label: 'Partial',  color: '#f59e0b' },
  paid:           { label: 'Paid',     color: '#22c55e' },
};

const QUICK_CHARGES = [
  { description: 'Consultation Fee', unit_price: '500' },
  { description: 'Nursing Fee',      unit_price: '300' },
  { description: 'Lab Tests',        unit_price: '1000' },
  { description: 'Dressing / Procedure', unit_price: '400' },
];

export default function Billing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ description: '', quantity: 1, unit_price: '' });
  const [paymentData, setPaymentData] = useState({ method: 'cash', amount: '', reference: '' });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => invoiceApi.list(statusFilter ? { status: statusFilter } : {}).then(r => r.data.results || r.data),
  });

  const { data: selectedInvoice, isLoading: loadingDetail } = useQuery({
    queryKey: ['invoice', selectedInvoiceId],
    queryFn: () => invoiceApi.get(selectedInvoiceId).then(r => r.data),
    enabled: !!selectedInvoiceId,
    refetchInterval: 5000,
  });

  const addChargeMutation = useMutation({
    mutationFn: (data) => invoiceApi.addCharge(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice', selectedInvoiceId]);
      queryClient.invalidateQueries(['invoices']);
      setNewCharge({ description: '', quantity: 1, unit_price: '' });
      setShowAddCharge(false);
    },
    onError: (err) => alert(err.response?.data?.detail || 'Failed to add charge'),
  });

  const paymentMutation = useMutation({
    mutationFn: (data) => paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice', selectedInvoiceId]);
      queryClient.invalidateQueries(['invoices']);
      setPaymentData({ method: 'cash', amount: '', reference: '' });
      setShowPayment(false);
    },
    onError: (err) => alert(err.response?.data?.detail || 'Payment failed'),
  });

  const handleAddCharge = (e) => {
    e.preventDefault();
    addChargeMutation.mutate({ invoice: selectedInvoiceId, ...newCharge });
  };

  const handlePayment = (e) => {
    e.preventDefault();
    paymentMutation.mutate({ invoice: selectedInvoiceId, ...paymentData });
  };

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-5)', height: '100%', minHeight: 0 }}>

      {/* ── Left: Invoice queue ── */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-header">
          <span className="panel-title"><Receipt size={16} /> Billing Queue</span>
          <select
            className="form-control form-control-sm"
            style={{ width: 'auto', minWidth: 110 }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedInvoiceId(null); }}
          >
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}><div className="spinner" /></div>
          ) : invoices.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>No invoices found.</div>
          ) : (
            <table className="data-table" style={{ margin: 0, borderTop: 'none' }}>
              <tbody>
                {invoices.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status] || {};
                  const isSelected = selectedInvoiceId === inv.id;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => { setSelectedInvoiceId(inv.id); setShowAddCharge(false); setShowPayment(false); }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(0,120,100,.07)' : undefined,
                        borderLeft: isSelected ? '3px solid var(--clr-primary-500)' : '3px solid transparent',
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{inv.patient_name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          INV-{String(inv.id).padStart(5, '0')}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>
                          KES {Number(inv.total_amount).toLocaleString()}
                        </div>
                        <span style={{
                          fontSize: '.7rem', fontWeight: 700, color: cfg.color,
                          background: `${cfg.color}1a`, padding: '1px 7px', borderRadius: 4, letterSpacing: '.04em'
                        }}>{cfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: Invoice detail ── */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedInvoiceId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-muted)' }}>
            <Receipt size={48} style={{ opacity: .25, marginBottom: 16 }} />
            <p style={{ margin: 0 }}>Select an invoice to view details</p>
          </div>
        ) : loadingDetail ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}><div className="spinner" /></div>
        ) : selectedInvoice ? (
          <>
            {/* Header */}
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <div>
                <span className="panel-title">
                  INV-{String(selectedInvoice.id).padStart(5, '0')} — {selectedInvoice.patient_name}
                </span>
                <span style={{ display: 'block', fontSize: '.78rem', color: 'var(--clr-text-muted)', marginTop: 2 }}>
                  Visit Record #{selectedInvoice.visit}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => window.open(`/billing/${selectedInvoice.id}/receipt`, '_blank')}
                >
                  <Printer size={14} /> Receipt
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => window.open(`/billing/${selectedInvoice.visit}/prescription`, '_blank')}
                >
                  <Printer size={14} /> Prescription
                </button>
                {selectedInvoice.status !== 'paid' && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddCharge(v => !v); setShowPayment(false); }}>
                      <Plus size={14} /> Add Charge
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowPayment(v => !v); setShowAddCharge(false); }}>
                      <CreditCard size={14} /> Record Payment
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Summary bar */}
            <div style={{
              display: 'flex', gap: 32, padding: '10px 16px',
              background: 'var(--clr-surface-2)', borderBottom: '1px solid var(--clr-border)',
              flexShrink: 0, alignItems: 'center'
            }}>
              {[
                { label: 'Total Charged', value: Number(selectedInvoice.total_amount).toLocaleString() },
                { label: 'Amount Paid',   value: Number(selectedInvoice.amount_paid).toLocaleString(),  color: '#22c55e' },
                { label: 'Balance Due',   value: Number(selectedInvoice.balance).toLocaleString(),      color: selectedInvoice.balance > 0 ? '#ef4444' : '#22c55e' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '.68rem', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--clr-text-muted)' }}>{item.label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: item.color }}>KES {item.value}</div>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem' }}>
                {selectedInvoice.status === 'paid'
                  ? <><CheckCircle2 size={16} color="#22c55e" /><span style={{ color: '#22c55e', fontWeight: 600 }}>Fully Settled</span></>
                  : selectedInvoice.status === 'partially_paid'
                  ? <><AlertCircle size={16} color="#f59e0b" /><span style={{ color: '#f59e0b', fontWeight: 600 }}>Partially Paid</span></>
                  : <><Clock size={16} color="#ef4444" /><span style={{ color: '#ef4444', fontWeight: 600 }}>Awaiting Payment</span></>
                }
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: 'var(--space-5)' }}>

              {/* Charges table */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--clr-text-muted)', fontWeight: 700, marginBottom: 8 }}>
                  Line Items / Charges
                </div>
                {selectedInvoice.items.length === 0 ? (
                  <p style={{ color: 'var(--clr-text-muted)', fontSize: '.875rem', margin: 0 }}>No charges recorded yet. Use "Add Charge" to begin billing.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>KES {Number(item.unit_price).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>KES {Number(item.total_price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add Charge form */}
              {showAddCharge && (
                <div className="card" style={{ marginBottom: 'var(--space-5)', border: '1px solid var(--clr-border)' }}>
                  <div className="card-header"><span className="card-title">Add Charge</span></div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>Quick add:</span>
                    {QUICK_CHARGES.map(p => (
                      <button
                        key={p.description} type="button" className="btn btn-ghost btn-sm"
                        style={{ marginLeft: 6, fontSize: '.75rem' }}
                        onClick={() => setNewCharge({ description: p.description, quantity: 1, unit_price: p.unit_price })}
                      >
                        {p.description}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleAddCharge} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 130px auto', gap: 8, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '.75rem' }}>Description</label>
                      <input className="form-control form-control-sm" placeholder="e.g. Consultation Fee"
                        value={newCharge.description}
                        onChange={e => setNewCharge({ ...newCharge, description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '.75rem' }}>Qty</label>
                      <input type="number" min="1" className="form-control form-control-sm"
                        value={newCharge.quantity}
                        onChange={e => setNewCharge({ ...newCharge, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '.75rem' }}>Unit Price (KES)</label>
                      <input type="number" min="0" step="0.01" className="form-control form-control-sm"
                        placeholder="0.00" value={newCharge.unit_price}
                        onChange={e => setNewCharge({ ...newCharge, unit_price: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={addChargeMutation.isPending}>
                      {addChargeMutation.isPending ? '...' : 'Add'}
                    </button>
                  </form>
                </div>
              )}

              {/* Payments received */}
              {selectedInvoice.payments.length > 0 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--clr-text-muted)', fontWeight: 700, marginBottom: 8 }}>
                    Payments Received
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontSize: '.8rem', fontFamily: 'var(--font-mono)' }}>{new Date(p.paid_at).toLocaleString()}</td>
                          <td style={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</td>
                          <td style={{ color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '.8rem' }}>{p.reference || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
                            KES {Number(p.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Record Payment form */}
              {showPayment && selectedInvoice.status !== 'paid' && (
                <div className="card" style={{ border: '1px solid var(--clr-border)' }}>
                  <div className="card-header"><span className="card-title">Record Payment</span></div>
                  <form onSubmit={handlePayment}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 'var(--space-4)' }}>
                      {METHODS.map(({ value, label, icon: Icon }) => (
                        <button key={value} type="button"
                          onClick={() => setPaymentData({ ...paymentData, method: value })}
                          style={{
                            padding: '10px 6px', borderRadius: 'var(--radius-md)',
                            border: `2px solid ${paymentData.method === value ? 'var(--clr-primary-500)' : 'var(--clr-border)'}`,
                            background: paymentData.method === value ? 'rgba(0,120,100,.07)' : 'transparent',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            color: paymentData.method === value ? 'var(--clr-primary-500)' : 'var(--clr-text-secondary)',
                          }}
                        >
                          <Icon size={18} />
                          <span style={{ fontSize: '.72rem', fontWeight: 700 }}>{label}</span>
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '.75rem' }}>Amount (KES)</label>
                        <input type="number" min="0.01" step="0.01" className="form-control"
                          placeholder="0.00" value={paymentData.amount}
                          onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                          required style={{ fontWeight: 700, fontSize: '1.1rem' }}
                        />
                        {selectedInvoice.balance > 0 && (
                          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 4, fontSize: '.72rem' }}
                            onClick={() => setPaymentData({ ...paymentData, amount: String(selectedInvoice.balance) })}
                          >
                            Fill balance: KES {Number(selectedInvoice.balance).toLocaleString()}
                          </button>
                        )}
                      </div>
                      {(paymentData.method === 'mpesa' || paymentData.method === 'insurance') && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '.75rem' }}>Reference No.</label>
                          <input type="text" className="form-control"
                            placeholder={paymentData.method === 'mpesa' ? 'e.g. QG7XKZW5TR' : 'e.g. CL-2026-001234'}
                            value={paymentData.reference}
                            onChange={e => setPaymentData({ ...paymentData, reference: e.target.value })}
                          />
                        </div>
                      )}
                      <button type="submit" className="btn btn-primary"
                        disabled={!paymentData.amount || paymentMutation.isPending}
                        style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
                      >
                        {paymentMutation.isPending ? 'Recording...' : 'Confirm Payment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
