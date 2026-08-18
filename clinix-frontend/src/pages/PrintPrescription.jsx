import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { visitApi } from '../api/client';

export default function PrintPrescription() {
  const { visitId } = useParams();

  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit-print', visitId],
    queryFn: () => visitApi.get(visitId).then(r => r.data),
  });

  useEffect(() => {
    if (visit) {
      const appt = visit.appointment_detail;
      document.title = `Prescription — ${appt?.patient_detail?.full_name || 'Patient'}`;
    }
  }, [visit]);

  if (isLoading) return <div style={{ padding: 40 }}>Loading prescription...</div>;
  if (!visit) return <div style={{ padding: 40 }}>Visit record not found.</div>;

  const appt = visit.appointment_detail;
  const patient = appt?.patient_detail || {};
  const doctor = appt?.doctor_detail || {};
  const printDate = new Date().toLocaleString();

  // Parse prescription lines (newline-separated)
  const prescriptionLines = (visit.prescription || '').split('\n').filter(l => l.trim());

  // Vitals
  const v = visit.vitals || {};
  const hasVitals = v.bp || v.temp || v.weight || v.pulse || v.spo2;

  const OUTCOME_LABELS = {
    pending: 'Pending follow-up',
    discharged: 'Discharged',
    admitted: 'Admitted',
    referred: 'Referred',
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Georgia', serif; font-size: 11pt; color: #000; background: #fff; }
        .no-print { display: none; }
        @media screen {
          .no-print { display: block; }
          body { padding: 20px; background: #f0f4f8; }
          .rx-paper { background: #fff; max-width: 700px; margin: 0 auto; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
        }
        @media print {
          body { padding: 0; background: #fff; }
          .rx-paper { padding: 24px; box-shadow: none; }
          .no-print { display: none !important; }
        }
        .divider { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
        .divider-bold { border: none; border-top: 2px solid #000; margin: 14px 0; }
        .rx-symbol { font-size: 28pt; font-weight: bold; color: #1d4ed8; margin: 0 6px 0 0; line-height: 1; }
        .med-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px dashed #ccc; }
        .med-num { font-weight: bold; min-width: 20px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 10.5pt; }
        .meta-label { color: #666; }
        .vitals-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center; }
        .vital-box { border: 1px solid #ccc; padding: 6px 4px; border-radius: 4px; }
        .vital-val { font-size: 12pt; font-weight: bold; }
        .vital-lbl { font-size: 8pt; color: #555; text-transform: uppercase; }
        .signature-line { border-bottom: 1px solid #000; width: 200px; margin-top: 32px; }
      `}</style>

      <div className="rx-paper">
        {/* Print button */}
        <div className="no-print" style={{ textAlign: 'right', marginBottom: 16 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '13pt' }}
          >
            🖨 Print Prescription
          </button>
        </div>

        {/* Header: Clinic + Doctor */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16pt', letterSpacing: '.04em' }}>CLINIX HEALTHCARE</div>
            <div style={{ fontSize: '9pt', color: '#555', marginTop: 2 }}>Medical Prescription</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9.5pt' }}>
            <div style={{ fontWeight: 'bold' }}>Dr. {doctor.full_name || '—'}</div>
            {doctor.specialisation && <div style={{ color: '#555' }}>{doctor.specialisation}</div>}
            <div style={{ color: '#555' }}>{printDate}</div>
          </div>
        </div>

        <hr className="divider-bold" />

        {/* Patient info */}
        <div className="meta-grid" style={{ marginBottom: 14 }}>
          <div><span className="meta-label">Patient: </span><strong>{patient.full_name || '—'}</strong></div>
          <div><span className="meta-label">Visit Ref.: </span>VIS-{String(visitId).padStart(5, '0')}</div>
          <div><span className="meta-label">Age / Sex: </span>{patient.age || '?'} yrs / {patient.gender || '?'}</div>
          <div><span className="meta-label">Date: </span>{appt?.scheduled_time ? new Date(appt.scheduled_time).toLocaleDateString() : '—'}</div>
          {patient.national_id && <div><span className="meta-label">ID: </span>{patient.national_id}</div>}
          {patient.phone && <div><span className="meta-label">Phone: </span>{patient.phone}</div>}
        </div>

        {/* Vitals */}
        {hasVitals && (
          <>
            <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Vitals</div>
            <div className="vitals-grid" style={{ marginBottom: 14 }}>
              {[
                { label: 'BP', value: v.bp },
                { label: 'Temp (°C)', value: v.temp },
                { label: 'Weight (kg)', value: v.weight },
                { label: 'Pulse (bpm)', value: v.pulse },
                { label: 'SpO2 (%)', value: v.spo2 },
              ].filter(item => item.value).map(item => (
                <div key={item.label} className="vital-box">
                  <div className="vital-val">{item.value}</div>
                  <div className="vital-lbl">{item.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Diagnosis */}
        {visit.diagnosis && (
          <>
            <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Diagnosis</div>
            <div style={{ background: '#f8f8f8', border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px', fontSize: '10.5pt', marginBottom: 14, whiteSpace: 'pre-line' }}>
              {visit.diagnosis}
            </div>
          </>
        )}

        <hr className="divider" />

        {/* Prescription — big Rx symbol */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span className="rx-symbol">℞</span>
          <span style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '.08em' }}>Prescription</span>
        </div>

        {prescriptionLines.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>No prescriptions recorded.</p>
        ) : (
          <div>
            {prescriptionLines.map((line, i) => (
              <div key={i} className="med-row">
                <span className="med-num">{i + 1}.</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {visit.notes && (
          <>
            <hr className="divider" />
            <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Notes / Instructions</div>
            <div style={{ fontSize: '10.5pt', whiteSpace: 'pre-line' }}>{visit.notes}</div>
          </>
        )}

        {/* Outcome */}
        {visit.outcome && visit.outcome !== 'pending' && (
          <>
            <hr className="divider" />
            <div style={{ fontSize: '10pt' }}>
              <strong>Disposition: </strong>{OUTCOME_LABELS[visit.outcome] || visit.outcome}
              {visit.admission_ward && <> — <em>Ward: {visit.admission_ward}</em></>}
              {visit.referral_hospital && <> — <em>Referred to: {visit.referral_hospital}</em></>}
            </div>
          </>
        )}

        {/* Follow-up */}
        {visit.follow_up_date && (
          <div style={{ marginTop: 8, fontSize: '10pt' }}>
            <strong>Follow-up Date: </strong>{new Date(visit.follow_up_date).toLocaleDateString()}
          </div>
        )}

        {/* Signature */}
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="signature-line" />
            <div style={{ fontSize: '9pt', marginTop: 4 }}>Dr. {doctor.full_name || '—'} — Signature & Stamp</div>
          </div>
        </div>

        <hr className="divider" />
        <div style={{ textAlign: 'center', fontSize: '8.5pt', color: '#888' }}>
          This prescription is valid for 30 days from the date of issue. Computer-generated document.
        </div>
      </div>
    </>
  );
}
