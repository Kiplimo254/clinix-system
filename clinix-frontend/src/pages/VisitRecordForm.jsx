import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi, visitApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Save, ArrowLeft, CheckCircle2, Activity, ClipboardEdit, Stethoscope, Hash, User, Phone } from 'lucide-react';
import './VisitRecordForm.css';

export default function VisitRecordForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDoctor, isNurse } = useAuth();
  
  const [vitals, setVitals] = useState({ bp: '', temp: '', weight: '', height: '', pulse: '', spo2: '' });
  const [triageNotes, setTriageNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  
  const [existingRecordId, setExistingRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        // The backend isn't set up to filter VisitRecord by appointment exact ID directly via query param
        // in standard viewset, but let's assume it finds it or we filter manually. 
        // For standard DRF router, we'd probably have a custom endpoint or filter.
        // As a fallback, since VisitRecord has a 1-to-1 with Appointment, let's fetch all and find it.
        const record = data.results ? data.results.find(r => r.appointment === Number(appointmentId)) : data.find(r => r.appointment === Number(appointmentId));
        
        if (record) {
          setExistingRecordId(record.id);
          setVitals(record.vitals || {});
          setTriageNotes(record.triage_notes || '');
          setDiagnosis(record.diagnosis || '');
          setPrescription(record.prescription || '');
          setNotes(record.notes || '');
        }
      } catch (e) {
        // Not found, that's fine
      }
    }
    checkExisting();
  }, [appointmentId]);

  // Mark as in-progress when opened if it was checked_in
  useEffect(() => {
    if (appointment?.status === 'checked_in') {
      appointmentApi.update(appointmentId, { status: 'in_progress' });
    }
  }, [appointment, appointmentId]);

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
        triage_notes: triageNotes,
        notes,
      };
      
      // Only include diagnosis/prescription if doctor (backend will reject otherwise)
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
        navigate('/visit-records');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingAppt) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!appointment) return <div className="empty-state">Appointment not found.</div>;

  const patient = appointment.patient_detail;

  return (
    <div className="fade-in visit-form-layout">
      {/* Sidebar: Patient Info summary */}
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
            <span style={{ fontSize: '.8rem', color: 'var(--clr-text-muted)' }}>ID: {patient.id}</span>
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
              Recording notes for appointment at {format(new Date(appointment.scheduled_time), 'HH:mm')}
            </p>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
              <Save size={16} /> Save Draft
            </button>
            <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
              <CheckCircle2 size={16} /> Complete Visit
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

        <div className="visit-sections">
          
          {/* Vitals */}
          <div className="card">
            <div className="card-header"><span className="card-title"><Activity size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }}/> Vitals</span></div>
            <div className="vitals-inputs">
              <div className="form-group">
                <label className="form-label">BP (mmHg)</label>
                <input name="bp" className="form-control" placeholder="120/80" value={vitals.bp || ''} onChange={handleVitalsChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Temp (°C)</label>
                <input name="temp" className="form-control" placeholder="36.5" value={vitals.temp || ''} onChange={handleVitalsChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input name="weight" className="form-control" placeholder="70" value={vitals.weight || ''} onChange={handleVitalsChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Pulse (bpm)</label>
                <input name="pulse" className="form-control" placeholder="72" value={vitals.pulse || ''} onChange={handleVitalsChange} />
              </div>
              <div className="form-group">
                <label className="form-label">SpO2 (%)</label>
                <input name="spo2" className="form-control" placeholder="98" value={vitals.spo2 || ''} onChange={handleVitalsChange} />
              </div>
            </div>
          </div>

          {/* Triage (Nurse) */}
          <div className="card">
            <div className="card-header"><span className="card-title"><ClipboardEdit size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }}/> Triage / Presenting Complaint</span></div>
            <textarea 
              className="form-control" 
              rows={3} 
              placeholder="Patient complains of..."
              value={triageNotes}
              onChange={e => setTriageNotes(e.target.value)}
            />
          </div>

          {/* Clinical (Doctor Only) */}
          <div className={`card ${!isDoctor ? 'disabled-section' : ''}`}>
            <div className="card-header">
              <span className="card-title"><Stethoscope size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }}/> Clinical Notes</span>
              {!isDoctor && <span className="badge badge-no_show">Doctor Only</span>}
            </div>
            
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">Diagnosis</label>
              <textarea 
                className="form-control" 
                rows={3} 
                placeholder="Final diagnosis..."
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                disabled={!isDoctor}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Prescription / Treatment Plan</label>
              <textarea 
                className="form-control" 
                rows={3} 
                placeholder="Medications, dosages, frequency..."
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                disabled={!isDoctor}
              />
            </div>
          </div>
          
          <div className="card">
            <div className="card-header"><span className="card-title">Additional Notes</span></div>
            <textarea 
              className="form-control" 
              rows={2} 
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
