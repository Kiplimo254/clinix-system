import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Activity, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import './Auth.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [form, setForm] = useState({ new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const { data } = await authApi.confirmPasswordReset({ email, token, new_password: form.new_password });
      setMessage(data.detail);
      setStatus('done');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Invalid or expired link. Please request a new one.');
      setStatus('error');
    }
  };

  if (!token || !email) {
    return (
      <div className="auth-page">
        <div className="auth-card slide-up" style={{ textAlign: 'center' }}>
          <h2>Invalid Reset Link</h2>
          <p style={{ color: 'var(--clr-text-secondary)', margin: '1rem 0' }}>
            This link is missing required parameters. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card slide-up">
        <div className="auth-brand">
          <div className="auth-brand-icon"><Activity size={28} strokeWidth={2.5} /></div>
          <div>
            <h1 className="auth-brand-name">Clinix</h1>
            <p className="auth-brand-sub">Set New Password</p>
          </div>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={56} color="var(--clr-primary-400)" style={{ margin: '0 auto 1rem' }} />
            <h3>Password Reset!</h3>
            <p style={{ color: 'var(--clr-text-secondary)', marginTop: '0.5rem' }}>{message}</p>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Redirecting to login…
            </p>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <h2>Set new password</h2>
              <p style={{ wordBreak: 'break-all' }}>for <strong>{email}</strong></p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {status === 'error' && <div className="alert alert-error"><span>{message}</span></div>}

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Min. 8 characters"
                    value={form.new_password}
                    onChange={e => setForm({ ...form, new_password: e.target.value })}
                    required minLength={8}
                  />
                  <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={status === 'loading'}>
                {status === 'loading' ? <><div className="spinner" /> Resetting…</> : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
