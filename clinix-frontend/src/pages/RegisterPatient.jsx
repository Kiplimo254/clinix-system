import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../api/client';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function RegisterPatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    dob: '', gender: '', national_id: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Clean up empty strings for optional fields like dob
    const payload = { ...form };
    if (!payload.dob) delete payload.dob;

    try {
      const { data } = await patientApi.create(payload);
      navigate(`/patients/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register patient. Please check the fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button 
        className="btn btn-ghost" 
        style={{ marginBottom: 'var(--space-4)', paddingLeft: 0 }}
        onClick={() => navigate('/patients')}
      >
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Register New Patient</span>
          <UserPlus size={20} style={{ color: 'var(--clr-primary-500)' }} />
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          
          <div>
            <h4 style={{ fontSize: '.85rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-3)' }}>Personal Information</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input name="first_name" className="form-control" value={form.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input name="last_name" className="form-control" value={form.last_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" name="dob" className="form-control" value={form.dob} onChange={handleChange} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select name="gender" className="form-control" value={form.gender} onChange={handleChange}>
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">National ID</label>
                <input name="national_id" className="form-control" value={form.national_id} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '.85rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-3)' }}>Contact Details</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input name="phone" className="form-control" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Physical Address</label>
                <input name="address" className="form-control" value={form.address} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '.85rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)', marginBottom: 'var(--space-3)' }}>Emergency Contact</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input name="emergency_contact_name" className="form-control" value={form.emergency_contact_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input name="emergency_contact_phone" className="form-control" placeholder="+254 7XX XXX XXX" value={form.emergency_contact_phone} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/patients')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
