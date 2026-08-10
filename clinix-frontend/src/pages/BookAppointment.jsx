import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, addMinutes } from 'date-fns';
import { appointmentApi, patientApi, staffApi } from '../api/client';
import { CalendarDays, ArrowLeft, Clock } from 'lucide-react';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillPatientId = searchParams.get('patient');

  const [form, setForm] = useState({
    patientId: prefillPatientId || '',
    doctorId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch data
  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientApi.list().then(r => r.data.results || r.data)
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => staffApi.list({ role: 'doctor' }).then(r => r.data)
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Combine date and time to ISO
    const scheduledTime = new Date(`${form.date}T${form.time}:00`).toISOString();

    try {
      await appointmentApi.create({
        patient: form.patientId,
        doctor: form.doctorId,
        scheduled_time: scheduledTime,
        duration_minutes: 30, // Default 30 min slot
        reason: form.reason,
      });
      navigate('/appointments');
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Failed to book appointment. Double check the time slot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
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

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Patient</label>
            <select 
              className="form-control" 
              value={form.patientId} 
              onChange={e => setForm({...form, patientId: e.target.value})}
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.phone})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Doctor</label>
            <select 
              className="form-control" 
              value={form.doctorId} 
              onChange={e => setForm({...form, doctorId: e.target.value})}
              required
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.specialty || 'General'})</option>
              ))}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={form.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm({...form, date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input 
                type="time" 
                className="form-control" 
                value={form.time}
                step="1800" // 30 min increments
                onChange={e => setForm({...form, time: e.target.value})}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}><Clock size={12} style={{ display: 'inline', marginRight: 4}}/>30 minute slot</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Visit (Optional)</label>
            <input 
              className="form-control" 
              value={form.reason}
              onChange={e => setForm({...form, reason: e.target.value})}
              placeholder="e.g. Follow-up, Consultation"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
