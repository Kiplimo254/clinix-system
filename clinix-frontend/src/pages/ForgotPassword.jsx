import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Activity, Mail, ArrowLeft } from 'lucide-react';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const { data } = await authApi.requestPasswordReset(email);
      setMessage(data.detail);
      setStatus('sent');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to send reset link. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div className="auth-card slide-up">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Activity size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="auth-brand-name">Clinix</h1>
            <p className="auth-brand-sub">Password Recovery</p>
          </div>
        </div>

        <div className="auth-header">
          <h2>Forgot your password?</h2>
          <p>Enter your email and we'll send a reset link.</p>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <p style={{ color: 'var(--clr-text-secondary)', lineHeight: 1.7 }}>{message}</p>
            {import.meta.env.DEV && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                (Dev mode: check server logs for the reset link)
              </p>
            )}
            <Link to="/login" className="btn btn-ghost" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {status === 'error' && (
              <div className="alert alert-error"><span>{message}</span></div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)', pointerEvents: 'none' }} />
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={status === 'loading'}>
              {status === 'loading' ? <><div className="spinner" /> Sending…</> : 'Send Reset Link'}
            </button>

            <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
              <Link to="/login" className="auth-link">
                <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
