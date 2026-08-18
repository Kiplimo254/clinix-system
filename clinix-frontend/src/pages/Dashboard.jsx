import { useQuery } from '@tanstack/react-query';
import { dashboardApi, appointmentApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CalendarDays, CheckCircle2, XCircle, Clock,
  UserCheck, Plus, ClipboardList, Activity
} from 'lucide-react';
import './Dashboard.css';

const STATUS_LABELS = {
  booked: 'Booked', checked_in: 'Checked In', with_nurse: 'With Nurse',
  with_doctor: 'With Doctor', completed: 'Completed',
  no_show: 'No Show', cancelled: 'Cancelled',
};

/**
 * Role-specific workspace titles and subtitles per the spec.
 */
const WORKSPACE = {
  nurse:        { title: 'Nursing Station',       sub: 'Today\'s queue, patients and clinical tasks' },
  doctor:       { title: 'Clinical Workspace',    sub: 'Today\'s consultations and patient records' },
  receptionist: { title: 'Patient Registration',  sub: 'Appointments, arrivals and patient registration' },
  admin:        { title: 'Administration',         sub: 'Staff, reports and system overview' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? 'receptionist';
  const ws = WORKSPACE[role] ?? WORKSPACE.receptionist;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: () => dashboardApi.today().then(r => r.data),
    refetchInterval: 60_000,
  });

  const summary  = data?.summary ?? {};
  const upcoming = data?.upcoming_appointments ?? [];
  const doctors  = data?.doctors_on_duty ?? [];

  const today = format(new Date(), 'EEEE, d MMMM yyyy');

  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>{ws.title}</h1>
            <p>{ws.sub} &nbsp;·&nbsp; {today}</p>
          </div>
          {(role === 'receptionist' || role === 'admin') && (
            <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
              <Plus size={15} /> Book Appointment
            </button>
          )}
          {role === 'doctor' && (
            <button className="btn btn-primary" onClick={() => navigate('/visit-records')}>
              <ClipboardList size={15} /> My Consultations
            </button>
          )}
          {role === 'nurse' && (
            <button className="btn btn-primary" onClick={() => navigate('/appointments')}>
              <Activity size={15} /> View Queue
            </button>
          )}
        </div>
      </div>

      {/* Summary strip — compact key figures */}
      <div className="summary-strip">
        <div className="summary-stat">
          <span className="summary-num">{summary.total ?? 0}</span>
          <span className="summary-lbl">Total Today</span>
        </div>
        <div className="summary-stat">
          <span className="summary-num" style={{ color: 'var(--clr-primary-600)' }}>
            {(summary.checked_in ?? 0) + (summary.with_nurse ?? 0) + (summary.with_doctor ?? 0)}
          </span>
          <span className="summary-lbl">In Clinic</span>
        </div>
        <div className="summary-stat">
          <span className="summary-num" style={{ color: '#15803d' }}>{summary.completed ?? 0}</span>
          <span className="summary-lbl">Completed</span>
        </div>
        <div className="summary-stat">
          <span className="summary-num" style={{ color: '#dc2626' }}>{summary.no_show ?? 0}</span>
          <span className="summary-lbl">No Show</span>
        </div>
        <div className="summary-stat">
          <span className="summary-num" style={{ color: '#64748b' }}>{summary.cancelled ?? 0}</span>
          <span className="summary-lbl">Cancelled</span>
        </div>
      </div>

      {/* Main layout */}
      <div className="dashboard-body">
        {/* Patient queue table — dominant */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Today's Patient Activity</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/appointments')}>
              View all
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 2rem' }}>
              <Clock size={32} />
              <h3>No upcoming appointments</h3>
              <p>No active patients in the queue right now.</p>
              {(role === 'receptionist' || role === 'admin') && (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => navigate('/appointments/book')}
                >
                  <Plus size={15} /> Book Appointment
                </button>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((appt) => (
                  <tr
                    key={appt.id}
                    className="clickable-row"
                    onClick={() => navigate('/appointments')}
                  >
                    <td className="time-cell">
                      {format(new Date(appt.scheduled_time), 'HH:mm')}
                    </td>
                    <td>
                      <div className="cell-primary">{appt.patient_name}</div>
                      {appt.patient_phone && (
                        <div className="cell-secondary">{appt.patient_phone}</div>
                      )}
                    </td>
                    <td>Dr. {appt.doctor_name}</td>
                    <td className="cell-secondary">{appt.reason || '—'}</td>
                    <td>
                      <span className={`badge badge-${appt.status}`}>
                        {STATUS_LABELS[appt.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="dashboard-aside">
          {/* Status breakdown */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Status Breakdown</span>
            </div>
            <table className="table compact-table">
              <tbody>
                {[
                  { key: 'booked',       label: 'Booked' },
                  { key: 'checked_in',   label: 'Checked In' },
                  { key: 'with_nurse',   label: 'With Nurse' },
                  { key: 'with_doctor',  label: 'With Doctor' },
                  { key: 'completed',    label: 'Completed' },
                  { key: 'no_show',      label: 'No Show' },
                  { key: 'cancelled',    label: 'Cancelled' },
                ].map(({ key, label }) => (
                  <tr key={key}>
                    <td>
                      <span className={`badge badge-${key}`}>{label}</span>
                    </td>
                    <td className="text-right count-cell">{summary[key] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Doctors on duty */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Doctors on Duty</span>
              <span className="panel-count">{doctors.length}</span>
            </div>
            {doctors.length === 0 ? (
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                None scheduled today.
              </p>
            ) : (
              <div className="duty-list">
                {doctors.map((doc) => (
                  <div key={doc.id} className="duty-row">
                    <div className="avatar">{initials(doc.full_name)}</div>
                    <div>
                      <div className="cell-primary">{doc.full_name}</div>
                      <div className="cell-secondary">{doc.specialty || 'General Practice'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
