import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientApi, visitApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  User, Phone, Mail, MapPin, CalendarDays, Hash, FileText,
  Activity, ClipboardList, ShieldAlert, ArrowLeft
} from 'lucide-react';
import DiagnosisAccessModal from '../components/DiagnosisAccessModal';
import './PatientDetail.css';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDoctor, isAdmin } = useAuth();
  
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(isDoctor || isAdmin);

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientApi.get(id).then(r => r.data),
  });

  const { data: visits = [], isLoading: loadingVisits } = useQuery({
    queryKey: ['patient-visits', id],
    queryFn: () => visitApi.history(id).then(r => r.data),
  });

  if (loadingPatient) return <div className="page-loader"><div className="spinner spinner-lg" /></div>;
  if (!patient) return <div className="empty-state">Patient not found.</div>;

  return (
    <div className="fade-in">
      <button 
        className="btn btn-ghost" 
        style={{ marginBottom: 'var(--space-4)', paddingLeft: 0 }}
        onClick={() => navigate('/patients')}
      >
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <div className="patient-header">
        <div className="avatar avatar-lg">{patient.full_name.substring(0, 2).toUpperCase()}</div>
        <div className="patient-header-info">
          <h1>{patient.full_name}</h1>
          <div className="patient-meta">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', background: 'rgba(33,154,128,.12)', color: 'var(--clr-primary-400)', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid rgba(33,154,128,.25)' }}>
              {patient.patient_id || `PAT-${String(patient.id).padStart(5,'0')}`}
            </span>
            <span>Registered: {format(new Date(patient.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className="patient-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/appointments/book?patient=${patient.id}`)}>
            <CalendarDays size={16} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="patient-grid">
        {/* Left Col: Demographics */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Demographics</span>
            <button className="btn btn-ghost btn-sm">Edit</button>
          </div>
          
          <div className="info-list">
            <div className="info-item">
              <Phone size={16} className="info-icon" />
              <div className="info-content">
                <label>Phone</label>
                <span>{patient.phone}</span>
              </div>
            </div>
            {patient.email && (
              <div className="info-item">
                <Mail size={16} className="info-icon" />
                <div className="info-content">
                  <label>Email</label>
                  <span>{patient.email}</span>
                </div>
              </div>
            )}
            <div className="info-item">
              <CalendarDays size={16} className="info-icon" />
              <div className="info-content">
                <label>Date of Birth / Age</label>
                <span>{patient.dob ? format(new Date(patient.dob), 'MMM d, yyyy') : '—'} ({patient.age || '—'} yrs)</span>
              </div>
            </div>
            <div className="info-item">
              <User size={16} className="info-icon" />
              <div className="info-content">
                <label>Gender</label>
                <span style={{ textTransform: 'capitalize' }}>{patient.gender || '—'}</span>
              </div>
            </div>
            <div className="info-item">
              <Hash size={16} className="info-icon" />
              <div className="info-content">
                <label>National ID</label>
                <span>{patient.national_id || '—'}</span>
              </div>
            </div>
            {patient.address && (
              <div className="info-item">
                <MapPin size={16} className="info-icon" />
                <div className="info-content">
                  <label>Address</label>
                  <span>{patient.address}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Visit History */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Visit History</span>
            {!hasFullAccess && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setAccessModalOpen(true)}
              >
                <ShieldAlert size={14} /> Request Full Access
              </button>
            )}
          </div>

          {loadingVisits ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ color: 'var(--clr-primary-500)', margin: '0 auto' }} /></div>
          ) : visits.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <ClipboardList size={32} />
              <p style={{ marginTop: 8 }}>No visits recorded yet.</p>
            </div>
          ) : (
            <div className="timeline">
              {visits.map((v) => (
                <div key={v.id} className="timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong>{format(new Date(v.created_at), 'MMM d, yyyy - HH:mm')}</strong>
                      <span className="timeline-doctor">Dr. {v.created_by_name}</span>
                    </div>
                    
                    <div className="visit-summary">
                      {v.vitals && Object.keys(v.vitals).length > 0 && (
                        <div className="visit-section">
                          <label><Activity size={12} /> Vitals</label>
                          <div className="vitals-grid">
                            {v.vitals.bp && <div><small>BP:</small> {v.vitals.bp}</div>}
                            {v.vitals.temp && <div><small>Temp:</small> {v.vitals.temp}°C</div>}
                            {v.vitals.weight && <div><small>Wt:</small> {v.vitals.weight}kg</div>}
                            {v.vitals.pulse && <div><small>HR:</small> {v.vitals.pulse}</div>}
                          </div>
                        </div>
                      )}

                      {v.triage_notes && (
                        <div className="visit-section">
                          <label>Triage</label>
                          <p>{v.triage_notes}</p>
                        </div>
                      )}

                      {(v.diagnosis || v.prescription) ? (
                        hasFullAccess ? (
                          <div className="clinical-notes">
                            {v.diagnosis && (
                              <div className="visit-section">
                                <label>Diagnosis</label>
                                <p>{v.diagnosis}</p>
                              </div>
                            )}
                            {v.prescription && (
                              <div className="visit-section">
                                <label>Prescription</label>
                                <p>{v.prescription}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="clinical-notes hidden">
                            <ShieldAlert size={16} />
                            <span>Clinical notes hidden. Request access to view.</span>
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {accessModalOpen && (
        <DiagnosisAccessModal
          patientId={patient.id}
          patientName={patient.full_name}
          onClose={() => setAccessModalOpen(false)}
          onSuccess={() => {
            setAccessModalOpen(false);
            setHasFullAccess(true);
          }}
        />
      )}
    </div>
  );
}
