import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi, diagnosisAccessApi } from '../api/client';
import { format } from 'date-fns';
import { UserPlus, Mail, Phone, Users, FileLock2, ShieldAlert } from 'lucide-react';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'audit'
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.list().then(r => r.data),
  });

  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => diagnosisAccessApi.list().then(r => r.data.results || r.data),
    enabled: activeTab === 'audit',
  });

  const toggleStaffMutation = useMutation({
    mutationFn: ({ id, is_active }) => staffApi.update(id, { is_active: !is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => diagnosisAccessApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-logs']);
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to revoke access.');
    }
  });

  return (
    <div className="fade-in">
      <div className="toolbar" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1>Administration</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Manage clinic settings, staff accounts, and monitor security audits.
          </p>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--clr-border)', width: '100%', paddingBottom: 0 }}>
          <button 
            className={`btn btn-ghost ${activeTab === 'staff' ? 'active-tab' : ''}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'staff' ? '2px solid var(--clr-primary-500)' : '2px solid transparent', padding: '12px 24px' }}
            onClick={() => setActiveTab('staff')}
          >
            <Users size={16} style={{ marginRight: 8 }}/> Staff Directory
          </button>
          <button 
            className={`btn btn-ghost ${activeTab === 'audit' ? 'active-tab' : ''}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'audit' ? '2px solid var(--clr-primary-500)' : '2px solid transparent', padding: '12px 24px' }}
            onClick={() => setActiveTab('audit')}
          >
            <FileLock2 size={16} style={{ marginRight: 8 }}/> Access Audit Logs
          </button>
        </div>
      </div>

      {activeTab === 'staff' && (
        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">Staff Directory</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={16} /> Invite Staff
            </button>
          </div>

          {loadingStaff ? (
            <div className="empty-state"><div className="spinner" style={{ color: 'var(--clr-primary-500)' }} /></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.8rem', background: 'var(--clr-surface-2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--clr-primary-400)', fontWeight: 700 }}>
                          {s.staff_id || `STF-${String(s.id).padStart(5,'0')}`}
                        </span>
                      </td>
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
                      <td>
                        <button 
                          className="btn btn-ghost btn-sm"
                          style={{ color: s.is_active ? 'var(--clr-error)' : 'var(--clr-primary-500)' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to ${s.is_active ? 'deactivate' : 'activate'} this staff member?`)) {
                              toggleStaffMutation.mutate({ id: s.id, is_active: s.is_active });
                            }
                          }}
                          disabled={toggleStaffMutation.isPending}
                        >
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">Diagnosis Access Audit Logs</span>
          </div>

          {loadingAudit ? (
            <div className="empty-state"><div className="spinner" style={{ color: 'var(--clr-primary-500)' }} /></div>
          ) : auditLogs.length === 0 ? (
            <div className="empty-state">
              <ShieldAlert size={48} color="var(--clr-text-muted)" style={{ marginBottom: 16 }} />
              <p>No diagnosis access requests have been made yet.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Requested At</th>
                    <th>Patient</th>
                    <th>Requested By</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Approved By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '.85rem', color: 'var(--clr-text-secondary)' }}>
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.patient_name}</td>
                      <td>
                        <div style={{ fontSize: '.9rem' }}>{log.requested_by_name}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '.85rem', color: 'var(--clr-text-secondary)' }}>
                          {log.reason || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${log.status}`}>
                          {log.status}
                        </span>
                        {log.is_active && (
                          <div style={{ fontSize: '.7rem', color: 'var(--clr-primary-500)', marginTop: 4 }}>
                            Active until {format(new Date(log.expires_at), 'HH:mm')}
                          </div>
                        )}
                      </td>
                      <td>
                        {log.approved_by_name ? (
                          <div style={{ fontSize: '.85rem' }}>
                            {log.approved_by_name}
                            <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>
                              {format(new Date(log.approved_at), 'HH:mm')}
                            </div>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {log.is_active ? (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ color: 'var(--clr-error)' }}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to revoke this access immediately?')) {
                                revokeMutation.mutate(log.id);
                              }
                            }}
                            disabled={revokeMutation.isPending}
                          >
                            Revoke
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
