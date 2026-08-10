import { useState } from 'react';
import { diagnosisAccessApi } from '../api/client';
import { ShieldAlert, Key } from 'lucide-react';

export default function DiagnosisAccessModal({ patientId, patientName, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Reason, 2: PIN/Approval
  const [reason, setReason] = useState('');
  const [requestId, setRequestId] = useState(null);
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await diagnosisAccessApi.request({
        patient: patientId,
        reason,
      });
      setRequestId(data.id);
      setStep(2);
    } catch (err) {
      setError('Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await diagnosisAccessApi.approve(requestId, {
        password,
        expiry_minutes: 15,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Approval failed. Incorrect PIN/Password?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} color="var(--clr-accent-500)" />
            Request Record Access
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequest}>
            <p style={{ marginBottom: 16 }}>
              You are requesting temporary access to the full clinical record (including diagnosis and prescriptions) for <strong>{patientName}</strong>.
            </p>
            <div className="form-group">
              <label className="form-label">Reason for access</label>
              <input 
                className="form-control" 
                placeholder="e.g. Doctor requested printout" 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                required 
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleApprove}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ margin: '0 auto 16px', width: 48, height: 48, background: 'var(--clr-surface-2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={24} color="var(--clr-text-secondary)" />
              </div>
              <h3>Doctor Approval Required</h3>
              <p style={{ fontSize: '.9rem', marginTop: 8 }}>
                Please hand the device to the on-duty doctor or admin to approve this request with their password. Access will be granted for 15 minutes.
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Doctor's Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Enter password..." 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Approving...' : 'Approve Access'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
