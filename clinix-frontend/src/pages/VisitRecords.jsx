import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { appointmentApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Stethoscope, Activity, UserCheck, AlertTriangle, Clock } from 'lucide-react';

const PRIORITY_COLORS = {
  routine:   { bg: 'rgba(34,197,94,.1)',  color: '#4ade80',  label: 'Routine'   },
  urgent:    { bg: 'rgba(245,158,11,.1)', color: '#fbbf24',  label: 'Urgent'    },
  emergency: { bg: 'rgba(239,68,68,.1)',  color: '#f87171',  label: 'Emergency' },
};

export default function VisitRecords() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDoctor, isNurse, isReceptionist, isAdmin, user } = useAuth();

  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['queue', filterDate],
    queryFn: () => appointmentApi.list({ date: filterDate }).then(r => r.data.results || r.data),
    refetchInterval: 30_000,
  });

  const triageMutation = useMutation({
    mutationFn: (id) => appointmentApi.startTriage(id),
    onSuccess: () => queryClient.invalidateQueries(['queue']),
  });

  const sendDoctorMutation = useMutation({
    mutationFn: (id) => appointmentApi.sendToDoctor(id),
    onSuccess: () => queryClient.invalidateQueries(['queue']),
  });

  // Segment queue by status
  const waiting    = appointments.filter(a => a.status === 'checked_in');
  const withNurse  = appointments.filter(a => a.status === 'with_nurse');
  const withDoctor = appointments.filter(a => a.status === 'with_doctor');
  const done       = appointments.filter(a => ['completed','no_show','cancelled'].includes(a.status));

  // Doctor only sees with_doctor; nurses see checked_in + with_nurse; receptionist/admin sees all
  const showAll = isReceptionist || isAdmin;

  const WaitBadge = ({ checkedInAt }) => {
    if (!checkedInAt) return null;
    const mins = differenceInMinutes(new Date(), new Date(checkedInAt));
    const color = mins > 60 ? '#f87171' : mins > 30 ? '#fbbf24' : '#4ade80';
    return (
      <span style={{ fontVariantNumeric: 'tabular-nums', color, fontWeight: 700, fontSize: '.85rem' }}>
        <Clock size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: '-1px' }} />
        {mins} min
      </span>
    );
  };

  const QueueSection = ({ title, items, color, actions }) => (
    items.length === 0 ? null : (
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block'
          }} />
          <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{title}</span>
          <span style={{
            background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-full)',
            padding: '1px 8px', fontSize: '.75rem', color: 'var(--clr-text-muted)'
          }}>{items.length}</span>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Wait</th>
                <th>Reason</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.patient_name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>{a.patient_phone}</div>
                  </td>
                  <td>Dr. {a.doctor_name}</td>
                  <td><WaitBadge checkedInAt={a.checked_in_at} /></td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.85rem', color: 'var(--clr-text-muted)' }}>
                    {a.reason || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {actions(a)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  );

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /><span>Loading queue…</span></div>;

  return (
    <div className="fade-in">
      <div className="toolbar">
        <div>
          <h1>Clinical Queue</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Patients waiting for triage or consultation
          </p>
        </div>
        <div className="toolbar-right">
          <input
            type="date"
            className="form-control"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {[
          { label: 'Waiting', count: waiting.length, color: '#a78bfa', icon: Clock },
          { label: 'With Nurse', count: withNurse.length, color: '#fbbf24', icon: Activity },
          { label: 'With Doctor', count: withDoctor.length, color: '#fb923c', icon: Stethoscope },
          { label: 'Completed', count: done.length, color: '#4ade80', icon: UserCheck },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="card" style={{ flex: 1, minWidth: 100, padding: 'var(--space-4)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon size={20} style={{ color }} />
            <div>
              <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Nurse/Receptionist section: Waiting for triage */}
      {(isNurse || showAll) && (
        <QueueSection
          title="Waiting for Triage"
          items={waiting}
          color="#a78bfa"
          actions={a => (
            <>
              {isNurse && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => triageMutation.mutate(a.id)}
                  disabled={triageMutation.isPending}
                >
                  <Activity size={13} /> Start Triage
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/visit-records/${a.id}`)}>
                Open
              </button>
            </>
          )}
        />
      )}

      {/* Nurse section: With nurse, ready to send to doctor */}
      {(isNurse || showAll) && (
        <QueueSection
          title="With Nurse — Triaging"
          items={withNurse}
          color="#fbbf24"
          actions={a => (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => sendDoctorMutation.mutate(a.id)}
                disabled={sendDoctorMutation.isPending}
              >
                <Stethoscope size={13} /> Send to Doctor
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/visit-records/${a.id}`)}>
                Record
              </button>
            </>
          )}
        />
      )}

      {/* Doctor section */}
      {(isDoctor || showAll) && (
        <QueueSection
          title="With Doctor — Consultation"
          items={withDoctor}
          color="#fb923c"
          actions={a => (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/visit-records/${a.id}`)}
            >
              <ClipboardList size={13} /> Open Record
            </button>
          )}
        />
      )}

      {/* Empty state */}
      {waiting.length === 0 && withNurse.length === 0 && withDoctor.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: '4rem' }}>
            <ClipboardList size={48} />
            <h3>Queue is clear</h3>
            <p>No patients waiting on {format(new Date(filterDate + 'T12:00:00'), 'MMMM d, yyyy')}.</p>
          </div>
        </div>
      )}

      {/* Completed today — collapsible summary */}
      {done.length > 0 && (showAll || isDoctor || isNurse) && (
        <QueueSection
          title={`Completed Today (${done.length})`}
          items={done}
          color="#4ade80"
          actions={a => (
            <span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span>
          )}
        />
      )}
    </div>
  );
}
