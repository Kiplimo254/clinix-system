import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { appointmentApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Plus, CalendarDays, CheckCircle, Clock } from 'lucide-react';

export default function Appointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isReceptionist, isAdmin } = useAuth();
  
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', filterDate],
    queryFn: () => appointmentApi.list({ date: filterDate }).then(r => r.data.results || r.data),
  });

  const handleCheckIn = async (id) => {
    try {
      await appointmentApi.checkIn(id);
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['dashboard-today']);
    } catch (e) {
      alert('Failed to check in.');
    }
  };

  const handleNoShow = async (id) => {
    try {
      await appointmentApi.markNoShow(id);
      queryClient.invalidateQueries(['appointments']);
    } catch (e) {
      alert('Failed to mark no-show.');
    }
  };

  return (
    <div className="fade-in">
      <div className="toolbar">
        <div>
          <h1>Appointments</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Manage bookings and patient arrivals
          </p>
        </div>
        <div className="toolbar-right">
          <input 
            type="date" 
            className="form-control" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
            <Plus size={18} /> Book Appointment
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><div className="spinner" style={{ color: 'var(--clr-primary-500)' }} /></div>
        ) : appointments.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <CalendarDays size={48} />
            <h3>No appointments found</h3>
            <p>No bookings on {format(new Date(filterDate), 'MMMM d, yyyy')}.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {format(new Date(a.scheduled_time), 'HH:mm')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.patient_name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--clr-text-muted)' }}>{a.patient_phone}</div>
                    </td>
                    <td>Dr. {a.doctor_name}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {a.status === 'booked' && (isReceptionist || isAdmin) && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCheckIn(a.id)}
                            title="Check In"
                          >
                            <CheckCircle size={14} /> Check In
                          </button>
                        )}
                        {(a.status === 'booked' || a.status === 'checked_in') && (
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleNoShow(a.id)}
                            style={{ color: 'var(--clr-danger-500)' }}
                            title="Mark No-Show"
                          >
                            No Show
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
