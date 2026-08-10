import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { appointmentApi, patientApi, staffApi } from '../api/client';
import { CalendarDays, ArrowLeft, Clock, Search, UserCheck } from 'lucide-react';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefillPatientId = searchParams.get('patient') || '';
  const prefillDoctor    = searchParams.get('doctor')  || '';
  const prefillDate      = searchParams.get('date')    || format(new Date(), 'yyyy-MM-dd');
  const prefillTime      = searchParams.get('time')    || '09:00';

  const [patientSearch, setPatientSearch]   = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({
    doctorId: prefillDoctor,
    date:     prefillDate,
    time:     prefillTime,
    reason:   '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  /* ── Data fetching ─────────────────────────────────── */

  // If arriving from ?patient=X, load that patient directly
  const { data: prefillPatient } = useQuery({
    queryKey: ['patient', prefillPatientId],
    queryFn: () => patientApi.get(prefillPatientId).then(r => r.data),
    enabled: !!prefillPatientId && !selectedPatient,
  });

  // Handle prefill injection cleanly without onSuccess (removed in RQ v5)
  useEffect(() => {
    if (prefillPatient && !selectedPatient) {
      setSelectedPatient(prefillPatient);
    }
  }, [prefillPatient, selectedPatient]);

  // Live patient search
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: () => patientApi.search(patientSearch).then(r => r.data.results || r.data),
    enabled: patientSearch.length > 1 && !selectedPatient,
  });

  // Doctors
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => staffApi.list({ role: 'doctor' }).then(r => r.data.results || r.data),
  });

  /* ── Submit ────────────────────────────────────────── */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient && !prefillPatientId) {
      setError('Please select a patient first.');
      return;
    }
    setLoading(true);
    setError('');

    const scheduledTime = new Date(`${form.date}T${form.time}:00`).toISOString();
    const patientId = selectedPatient?.id || prefillPatientId;

    try {
      await appointmentApi.create({
        patient:          patientId,
        doctor:           form.doctorId,
        scheduled_time:   scheduledTime,
        duration_minutes: 30,
        reason:           form.reason,
      });
      navigate('/appointments');
    } catch (err) {
      const detail =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Failed to book appointment. Double check the time slot.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const displayPatient = selectedPatient || (prefillPatientId ? prefillPatient : null);

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <button
        className="btn btn-ghost"
        style={{ marginBottom: 'var(--space-4)', paddingLeft: 0 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Book New Appointment</span>
          <CalendarDays size={20} style={{ color: 'var(--clr-primary-500)' }} />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* ── Patient ─────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">Patient</label>

            {displayPatient ? (
              /* Selected patient chip */
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(33,154,128,.08)', border: '1.5px solid var(--clr-primary-500)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: '.85rem' }}>
                    {displayPatient.full_name?.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{displayPatient.full_name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>
                      {displayPatient.patient_id || `PAT-${String(displayPatient.id).padStart(5,'0')}`} · {displayPatient.phone}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}
                >
                  Change
                </button>
              </div>
            ) : (
              /* Search input */
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--clr-text-muted)', pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search patient by name or phone…"
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                    autoFocus
                  />
                </div>

                {/* Search results dropdown */}
                {patientSearch.length > 1 && (
                  <div style={{
                    border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-md)',
                    marginTop: 4, maxHeight: 220, overflowY: 'auto',
                    background: 'var(--clr-surface-1)',
                  }}>
                    {searching ? (
                      <div style={{ padding: 16, textAlign: 'center' }}>
                        <div className="spinner" style={{ color: 'var(--clr-primary-500)' }} />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ padding: 16, color: 'var(--clr-text-muted)', fontSize: '.85rem', textAlign: 'center' }}>
                        No patients found. <a
                          style={{ color: 'var(--clr-primary-400)', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate('/patients/new')}
                        >Register new patient →</a>
                      </div>
                    ) : (
                      searchResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setPatientSearch(''); }}
                          style={{
                            padding: '12px 16px', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: 10,
                            borderBottom: '1px solid var(--clr-border)',
                            transition: 'background .1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: '.8rem', flexShrink: 0 }}>
                            {p.full_name?.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{p.full_name}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>
                              {p.patient_id || `PAT-${String(p.id).padStart(5,'0')}`} · {p.phone}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Doctor ──────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">Doctor</label>
            {loadingDoctors ? (
              <div className="form-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ color: 'var(--clr-primary-500)', width: 16, height: 16 }} />
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '.85rem' }}>Loading doctors…</span>
              </div>
            ) : (
              <select
                className="form-control"
                value={form.doctorId}
                onChange={e => setForm({ ...form, doctorId: e.target.value })}
                required
              >
                <option value="">— Select Doctor —</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name} {d.specialty ? `(${d.specialty})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* ── Date & Time ─────────────────────────────── */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={form.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-control"
                value={form.time}
                step="1800"
                onChange={e => setForm({ ...form, time: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> 30-minute slot
              </span>
            </div>
          </div>

          {/* ── Reason ──────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label">Reason for Visit <span style={{ color: 'var(--clr-text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="form-control"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Follow-up, Consultation, Review"
            />
          </div>

          {/* ── Actions ─────────────────────────────────── */}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (!selectedPatient && !prefillPatientId)}
            >
              {loading ? 'Booking…' : 'Confirm Appointment'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
