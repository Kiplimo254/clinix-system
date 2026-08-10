import { useQuery } from '@tanstack/react-query';
import { dashboardApi, appointmentApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  CalendarDays, Users, CheckCircle2, XCircle,
  Clock, Activity, TrendingUp, UserCheck
} from 'lucide-react';
import './Dashboard.css';

const STATUS_LABELS = {
  booked: 'Booked', checked_in: 'Checked In', in_progress: 'In Progress',
  completed: 'Completed', no_show: 'No Show', cancelled: 'Cancelled',
};

export default function Dashboard() {
  const { user, clinicName } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-today'],
    queryFn: () => dashboardApi.today().then(r => r.data),
    refetchInterval: 60_000, // auto-refresh every minute
  });

  const summary = data?.summary ?? {};
  const upcoming = data?.upcoming_appointments ?? [];
  const doctors = data?.doctors_on_duty ?? [];

  const stats = [
    { label: 'Total Today',   value: summary.total    ?? 0, icon: CalendarDays,  accent: 'var(--clr-primary-500)',  bg: 'rgba(33,154,128,.12)' },
    { label: 'Checked In',    value: summary.checked_in ?? 0, icon: UserCheck,   accent: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
    { label: 'Completed',     value: summary.completed  ?? 0, icon: CheckCircle2, accent: '#22c55e', bg: 'rgba(34,197,94,.12)' },
    { label: 'No Shows',      value: summary.no_show    ?? 0, icon: XCircle,      accent: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  ];

  if (isLoading) {
    return <div className="page-loader"><div className="spinner spinner-lg" /><span>Loading dashboard…</span></div>;
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Good {getGreeting()}, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p>{clinicName} · {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="dashboard-badge">
          <Activity size={16} />
          <span>Live</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, accent, bg }) => (
          <div key={label} className="stat-card" style={{ '--stat-accent': accent, '--stat-accent-bg': bg }}>
            <div className="stat-icon"><Icon size={22} /></div>
            <div className="stat-body">
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Upcoming appointments */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Appointments</span>
            <span className="badge badge-booked">{upcoming.length} next</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <Clock size={32} />
              <p style={{ marginTop: 8 }}>No more appointments today</p>
            </div>
          ) : (
            <div className="appt-list">
              {upcoming.map((appt) => (
                <div key={appt.id} className="appt-row">
                  <div className="appt-time">
                    {format(new Date(appt.scheduled_time), 'HH:mm')}
                  </div>
                  <div className="appt-info">
                    <div className="appt-patient">{appt.patient_name}</div>
                    <div className="appt-doctor">Dr. {appt.doctor_name}</div>
                  </div>
                  <span className={`badge badge-${appt.status}`}>
                    {STATUS_LABELS[appt.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Status breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Today's Breakdown</span>
            </div>
            <div className="breakdown-list">
              {Object.entries(summary).map(([key, val]) => (
                <div key={key} className="breakdown-row">
                  <span className={`badge badge-${key}`}>{STATUS_LABELS[key] ?? key}</span>
                  <span className="breakdown-count">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Doctors on duty */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Doctors on Duty</span>
              <span className="badge badge-doctor">{doctors.length}</span>
            </div>
            {doctors.length === 0 ? (
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '.875rem' }}>None scheduled today</p>
            ) : (
              <div className="doctor-list">
                {doctors.map((doc) => (
                  <div key={doc.id} className="doctor-row">
                    <div className="avatar">{initials(doc.full_name)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{doc.full_name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>{doc.specialty || 'General'}</div>
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
