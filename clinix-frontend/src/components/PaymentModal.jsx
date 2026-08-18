import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentApi, invoiceApi } from '../api/client';
import { X, CreditCard, Smartphone, Banknote, Shield } from 'lucide-react';

const METHODS = [
  { value: 'cash',      label: 'Cash',       icon: Banknote },
  { value: 'mpesa',     label: 'M-Pesa',     icon: Smartphone },
  { value: 'card',      label: 'Card',        icon: CreditCard },
  { value: 'insurance', label: 'Insurance',   icon: Shield },
];

export default function PaymentModal({ visitId, patientName, onClose }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // Fetch the invoice for this visit
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-for-visit', visitId],
    queryFn: () => invoiceApi.list({ visit: visitId }).then(r => r.data.results || r.data),
    enabled: !!visitId,
  });
  const invoice = invoices[0]; // each visit has exactly one invoice

  const mutation = useMutation({
    mutationFn: (data) => paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['invoices']);
      onClose();
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Payment recording failed');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!invoice) return;
    mutation.mutate({
      invoice: invoice.id,
      amount,
      method,
      reference,
    });
  };


  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <h3>Record Payment</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--clr-text-muted)', margin: 0 }}>
              Visit completed for {patientName}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* Method selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 'var(--space-5)' }}>
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMethod(value)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${method === value ? 'var(--clr-primary-500)' : 'var(--clr-border)'}`,
                  background: method === value ? 'rgba(33,154,128,.08)' : 'var(--clr-surface-1)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  color: method === value ? 'var(--clr-primary-400)' : 'var(--clr-text-secondary)',
                  transition: 'all .15s',
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Amount (KES)</label>
            <input
              type="number"
              className="form-control"
              placeholder="0.00"
              value={amount}
              min="0"
              step="0.01"
              onChange={e => setAmount(e.target.value)}
              required
              style={{ fontSize: '1.3rem', fontWeight: 700 }}
            />
          </div>

          {(method === 'mpesa' || method === 'insurance') && (
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">
                {method === 'mpesa' ? 'M-Pesa Transaction Code' : 'Insurance Reference / Claim No.'}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={method === 'mpesa' ? 'e.g. QG7XKZW5TR' : 'e.g. CL-2026-001234'}
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Skip for now
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!amount || mutation.isPending}
            >
              {mutation.isPending ? 'Recording...' : `Record KES ${amount || '0'} Payment`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
