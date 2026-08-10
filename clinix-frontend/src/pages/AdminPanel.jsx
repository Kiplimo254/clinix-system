import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../api/client';
import { ShieldCheck, UserPlus, Mail, Phone, Hash } from 'lucide-react';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.list().then(r => r.data),
  });

  return (
    <div className="fade-in">
      <div className="toolbar">
        <div>
          <h1>Administration</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Manage clinic settings and staff accounts
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Staff Directory</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
            <UserPlus size={16} /> Invite Staff
          </button>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" style={{ color: 'var(--clr-primary-500)' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar">{s.full_name.substring(0, 2).toUpperCase()}</div>
                        <div>
                          <div>{s.full_name}</div>
                          {s.specialty && <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>{s.specialty}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${s.role}`}>{s.role}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} color="var(--clr-text-muted)"/> {s.email}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="var(--clr-text-muted)"/> {s.phone}</span>
                      </div>
                    </td>
                    <td>
                      {s.is_active ? 
                        <span style={{ color: 'var(--clr-primary-400)', fontWeight: 600, fontSize: '.85rem' }}>Active</span> : 
                        <span style={{ color: 'var(--clr-text-muted)', fontSize: '.85rem' }}>Inactive</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInviteModal && (
        <InviteModal 
          onClose={() => setShowInviteModal(false)} 
          onSuccess={() => {
            setShowInviteModal(false);
            queryClient.invalidateQueries(['staff']);
          }} 
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: 'doctor', specialty: '', password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await staffApi.invite(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.email?.[0] || 'Failed to invite staff.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Invite Staff Member</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-control" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-control" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
            {form.role === 'doctor' && (
              <div className="form-group">
                <label className="form-label">Specialty (Optional)</label>
                <input className="form-control" placeholder="e.g. Pediatrics" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input type="password" className="form-control" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={8} />
          </div>

          <div className="form-actions" style={{ marginTop: 'var(--space-6)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
