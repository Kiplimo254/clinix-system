import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clinicApi } from '../api/client';
import { Activity, Building2, Phone, MapPin, User, Mail, Lock, CheckCircle } from 'lucide-react';
import './Auth.css';

const INITIAL = {
  clinic_name: '', location: '', clinic_phone: '',
  first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '',
};

export default function ClinicSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await clinicApi.signup({
        clinic_name: form.clinic_name,
        location: form.location,
        clinic_phone: form.clinic_phone,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      // Store tokens and redirect
      localStorage.setItem('access_token', data.tokens.access);
      localStorage.setItem('refresh_token', data.tokens.refresh);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === 'object') {
        setError(Object.values(data).flat().join(' '));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-glow" />
        <div className="auth-card slide-up" style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--clr-primary-400)', margin: '0 auto var(--space-4)', width: 64, height: 64, background: 'rgba(33,154,128,.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={36} />
          </div>
          <h2>Clinic Created!</h2>
          <p style={{ marginTop: 8 }}>Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card wide slide-up">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Activity size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="auth-brand-name">Clinix</h1>
            <p className="auth-brand-sub">Register your clinic</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error"><span>{error}</span></div>}

          <div className="auth-section-title">
            <Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />
            Clinic Information
          </div>
          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Clinic / Hospital Name</label>
              <input name="clinic_name" className="form-control" placeholder="Sunrise Medical Centre" value={form.clinic_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Address</label>
              <input name="location" className="form-control" placeholder="Nairobi, Kenya" value={form.location} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Clinic Phone</label>
              <input name="clinic_phone" className="form-control" placeholder="+254 7XX XXX XXX" value={form.clinic_phone} onChange={handleChange} required />
            </div>
          </div>

          <div className="auth-section-title" style={{ marginTop: 8 }}>
            <User size={14} style={{ display: 'inline', marginRight: 6 }} />
            Admin / Owner Account
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input name="first_name" className="form-control" placeholder="Jane" value={form.first_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input name="last_name" className="form-control" placeholder="Mwangi" value={form.last_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-control" placeholder="admin@clinic.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Personal Phone</label>
              <input name="phone" className="form-control" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-control" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input name="confirm_password" type="password" className="form-control" placeholder="Repeat password" value={form.confirm_password} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? <><div className="spinner" /> Creating clinic…</> : 'Create Clinic & Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign in →</Link></p>
        </div>
      </div>
    </div>
  );
}
