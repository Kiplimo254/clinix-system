import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { appointmentApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Plus, CalendarDays, CheckCircle, UserPlus, Activity, Stethoscope, ClipboardList } from 'lucide-react';
import WalkInModal from '../components/WalkInModal';

const STATUS_LABELS = {
  booked: 'Booked', checked_in: 'Checked In', with_nurse: 'With Nurse',
  with_doctor: 'With Doctor', completed: 'Completed', no_show: 'No Show', cancelled: 'Cancelled',
};

export default function Appointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isReceptionist, isAdmin, isNurse, isDoctor } = useAuth();

  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', filterDate],
    queryFn: () => appointmentApi.list({ date: filterDate }).then(r => r.data.results || r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries(['appointments']);
    queryClient.invalidateQueries(['dashboard-today']);
    queryClient.invalidateQueries(['queue']);
  };

  const checkInMut = useMutation({ mutationFn: (id) => appointmentApi.checkIn(id),      onSuccess: invalidate });
  const triageMut  = useMutation({ mutationFn: (id) => appointmentApi.startTriage(id),  onSuccess: invalidate });
  const doctorMut  = useMutation({ mutationFn: (id) => appointmentApi.sendToDoctor(id), onSuccess: invalidate });
  const noShowMut  = useMutation({ mutationFn: (id) => appointmentApi.markNoShow(id),   onSuccess: invalidate });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Appointments</h1>
            <p>Manage bookings and patient arrivals</p>
          </div>
          <div className="toolbar-right">
            <input
              type="date"
              className="form-control"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            {(isReceptionist || isAdmin) && (
              <button className="btn btn-secondary" onClick={() => setShowWalkInModal(true)}>
                <UserPlus size={15} /> Walk-In
              </button>
            )}
            <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
              <Plus size={15} /> Book
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        {isLoading ? (
          <div className="empty-state"><div className="spinner" style={{ color: 'var(--clr-primary-500)' }} /></div>
        ) : appointments.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <CalendarDays size={48} />
            <h3>No appointments found</h3>
            <p>No bookings on {format(new Date(filterDate + 'T12:00:00'), 'MMMM d, yyyy')}.</p>
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
                    <td className="time-cell">
                      {format(new Date(a.scheduled_time), 'HH:mm')}
                      {a.is_walk_in && (
                        <span style={{ fontSize: '.7rem', color: 'var(--clr-text-muted)', display: 'block', fontVariantNumeric: 'normal' }}>Walk-In</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-primary">{a.patient_name}</div>
                      <div className="cell-secondary">{a.patient_phone}</div>
                    </td>
                    <td>Dr. {a.doctor_name}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Receptionist/Admin: Check In booked patients */}
                        {a.status === 'booked' && (isReceptionist || isAdmin) && (
                          <button className="btn btn-secondary btn-sm" onClick={() => checkInMut.mutate(a.id)} disabled={checkInMut.isPending}>
                            <CheckCircle size={13} /> Check In
                          </button>
                        )}
                        {/* Nurse: Start triage on checked-in */}
                        {a.status === 'checked_in' && isNurse && (
                          <button className="btn btn-secondary btn-sm" onClick={() => triageMut.mutate(a.id)} disabled={triageMut.isPending}>
                            <Activity size={13} /> Start Triage
                          </button>
                        )}
                        {/* Nurse: Send to doctor after triage */}
                        {a.status === 'with_nurse' && isNurse && (
                          <button className="btn btn-secondary btn-sm" onClick={() => doctorMut.mutate(a.id)} disabled={doctorMut.isPending}>
                            <Stethoscope size={13} /> To Doctor
                          </button>
                        )}
                        {/* Doctor/Nurse: Open visit record */}
                        {['checked_in', 'with_nurse', 'with_doctor'].includes(a.status) && (isDoctor || isNurse) && (
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/visit-records/${a.id}`)}>
                            <ClipboardList size={13} /> Record
                          </button>
                        )}
                        {/* Receptionist/Admin: No show */}
                        {['booked', 'checked_in'].includes(a.status) && (isReceptionist || isAdmin) && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--clr-danger-500)' }} onClick={() => noShowMut.mutate(a.id)} disabled={noShowMut.isPending}>
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

      {showWalkInModal && (
        <WalkInModal onClose={() => setShowWalkInModal(false)} />
      )}
    </div>
  );
}
