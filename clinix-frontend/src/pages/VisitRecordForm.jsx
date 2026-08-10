import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi, visitApi, paymentApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save, ArrowLeft, CheckCircle2, Activity, ClipboardEdit, Stethoscope, Hash, User, Phone, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import './VisitRecordForm.css';
import PaymentModal from '../components/PaymentModal';

const PRIORITY_OPTIONS = [
  { value: 'routine',   label: '🟢 Routine',   style: { color: '#4ade80' } },
  { value: 'urgent',    label: '🟡 Urgent',    style: { color: '#fbbf24' } },
  { value: 'emergency', label: '🔴 Emergency', style: { color: '#f87171' } },
];

export default function VisitRecordForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDoctor, isNurse, isReceptionist, isAdmin } = useAuth();

  const [vitals, setVitals] = useState({ bp: '', temp: '', weight: '', height: '', pulse: '', spo2: '' });
  const [triageNotes, setTriageNotes] = useState('');
  const [triagePriority, setTriagePriority] = useState('routine');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const [existingRecordId, setExistingRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // 1. Get Appointment info
  const { data: appointment, isLoading: loadingAppt } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentApi.get(appointmentId).then(r => r.data),
  });

  // 2. See if VisitRecord already exists
  useEffect(() => {
    async function checkExisting() {
      try {
        const { data } = await visitApi.list({ appointment: appointmentId });
        const list = data.results || data;
        const record = list.find(r => r.appointment === Number(appointmentId));
        if (record) {
          setExistingRecordId(record.id);
          setVitals(record.vitals || {});
          setTriageNotes(record.triage_notes || '');
          setTriagePriority(record.triage_priority || 'routine');
          setDiagnosis(record.diagnosis || '');
          setPrescription(record.prescription || '');
          setNotes(record.notes || '');
          setFollowUpDate(record.follow_up_date || '');
        }
      } catch (e) { /* Not found */ }
    }
    checkExisting();
  }, [appointmentId]);

  // 3. Auto-move to with_doctor when doctor opens it
  useEffect(() => {
    if (appointment?.status === 'with_nurse' && isDoctor) {
      appointmentApi.sendToDoctor(appointmentId).catch(() => {});
    }
  }, [appointment, appointmentId, isDoctor]);

  const handleVitalsChange = (e) => {
    setVitals({ ...vitals, [e.target.name]: e.target.value });
  };

  const handleSave = async (complete = false) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        appointment: appointmentId,
        vitals,
        triage_priority: triagePriority,
        triage_notes: triageNotes,
        notes,
        follow_up_date: followUpDate || null,
      };

      if (isDoctor) {
        payload.diagnosis = diagnosis;
        payload.prescription = prescription;
      }

      if (existingRecordId) {
        await visitApi.update(existingRecordId, payload);
      } else {
        const { data } = await visitApi.create(payload);
        setExistingRecordId(data.id);
      }

      if (complete) {
        await appointmentApi.update(appointmentId, { status: 'completed' });
        queryClient.invalidateQueries(['queue']);
        queryClient.invalidateQueries(['dashboard-today']);
        // Show payment modal for receptionist/admin before leaving
        if (isReceptionist || isAdmin) {
          setShowPaymentModal(true);
        } else {
          navigate('/visit-records');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingAppt) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!appointment) return <div className="empty-state">Appointment not found.</div>;

  const patient = appointment.patient_detail;
  const canEditClinical = isDoctor;
  const canEditTriage = isNurse || isDoctor;

  return (
    <div className="fade-in visit-form-layout">
      {/* Sidebar: Patient Info */}
      <div className="visit-sidebar">
        <button className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 'var(--space-6)' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <div className="avatar avatar-lg" style={{ margin: '0 auto var(--space-3)' }}>
              {patient.full_name.substring(0, 2).toUpperCase()}
            </div>
            <h3 style={{ margin: 0, lineHeight: 1.2 }}>{patient.full_name}</h3>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '.8rem',
              background: 'rgba(33,154,128,.1)', color: 'var(--clr-primary-400)',
              padding: '2px 8px', borderRadius: 'var(--radius-full)', marginTop: 4, display: 'inline-block'
            }}>
              {patient.patient_id || `PAT-${String(patient.id).padStart(5, '0')}`}
            </span>
          </div>

          <div className="divider" style={{ margin: 'var(--space-4) 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.85rem' }}>
              <Phone size={14} color="var(--clr-text-muted)" /> {patient.phone}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.85rem' }}>
              <User size={14} color="var(--clr-text-muted)" /> {patient.age || '?'} yrs / <span style={{ textTransform: 'capitalize' }}>{patient.gender || '?'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.85rem' }}>
              <Hash size={14} color="var(--clr-text-muted)" /> {patient.national_id || 'No ID'}
            </div>
          </div>

          <div className="divider" style={{ margin: 'var(--space-4) 0' }} />

          {/* Appointment status */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)', marginBottom: 4 }}>Status</div>
            <span className={`badge badge-${appointment.status}`}>{appointment.status.replace(/_/g, ' ')}</span>
          </div>

          {/* Triage Priority */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)', marginBottom: 6 }}>Triage Priority</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRIORITY_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`btn btn-sm ${triagePriority === o.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={triagePriority === o.value ? {} : o.style}
                  onClick={() => canEditTriage && setTriagePriority(o.value)}
                  disabled={!canEditTriage}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-secondary btn-block btn-sm"
            onClick={() => navigate(`/patients/${patient.id}`)}
          >
            View Full History
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="visit-main">
        <div className="toolbar" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1>Visit Record</h1>
            <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
              {format(new Date(appointment.scheduled_time), 'EEEE, d MMM yyyy')} · {format(new Date(appointment.scheduled_time), 'HH:mm')}
              {appointment.is_walk_in && <span className="badge badge-checked_in" style={{ marginLeft: 8 }}>Walk-In</span>}
            </p>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
              <Save size={16} /> Save Draft
            </button>
            {(isDoctor || isNurse) && (
              <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
                <CheckCircle2 size={16} /> Complete Visit
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

        <div className="visit-sections">

          {/* Vitals */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Activity size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />
                Vitals
              </span>
            </div>
            <div className="vitals-inputs">
              {[
                { name: 'bp', label: 'BP (mmHg)', placeholder: '120/80' },
                { name: 'temp', label: 'Temp (°C)', placeholder: '36.5' },
                { name: 'weight', label: 'Weight (kg)', placeholder: '70' },
                { name: 'height', label: 'Height (cm)', placeholder: '170' },
                { name: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
                { name: 'spo2', label: 'SpO2 (%)', placeholder: '98' },
              ].map(v => (
                <div key={v.name} className="form-group">
                  <label className="form-label">{v.label}</label>
                  <input
                    name={v.name}
                    className="form-control"
                    placeholder={v.placeholder}
                    value={vitals[v.name] || ''}
                    onChange={handleVitalsChange}
                    disabled={!canEditTriage}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Triage Notes (Nurse) */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <ClipboardEdit size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />
                Triage / Presenting Complaint
              </span>
              {!canEditTriage && <span className="badge badge-no_show">Nurse/Doctor Only</span>}
            </div>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Patient complains of..."
              value={triageNotes}
              onChange={e => setTriageNotes(e.target.value)}
              disabled={!canEditTriage}
            />
          </div>

          {/* Clinical Notes (Doctor Only) */}
          <div className={`card ${!canEditClinical ? 'disabled-section' : ''}`}>
            <div className="card-header">
              <span className="card-title">
                <Stethoscope size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />
                Clinical Notes
              </span>
              {!canEditClinical && <span className="badge badge-no_show">Doctor Only</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">Diagnosis</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Final diagnosis..."
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                disabled={!canEditClinical}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prescription / Treatment Plan</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Medications, dosages, frequency..."
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                disabled={!canEditClinical}
              />
            </div>

            {/* Follow-up Date — Doctor only */}
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">
                <Calendar size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                Follow-up Date (optional)
              </label>
              <input
                type="date"
                className="form-control"
                style={{ maxWidth: 220 }}
                value={followUpDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setFollowUpDate(e.target.value)}
                disabled={!canEditClinical}
              />
              {followUpDate && (
                <p style={{ fontSize: '.8rem', color: 'var(--clr-primary-400)', marginTop: 4 }}>
                  ✓ A follow-up appointment will be auto-created when you save.
                </p>
              )}
            </div>
          </div>

          {/* General Notes */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Additional Notes</span>
            </div>
            <textarea
              className="form-control"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* Payment modal after completing visit */}
      {showPaymentModal && existingRecordId && (
        <PaymentModal
          visitId={existingRecordId}
          patientName={patient.full_name}
          onClose={() => {
            setShowPaymentModal(false);
            navigate('/visit-records');
          }}
        />
      )}
    </div>
  );
}
