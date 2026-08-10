import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { appointmentApi, visitApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Stethoscope, Search } from 'lucide-react';

export default function VisitRecords() {
  const navigate = useNavigate();
  const { isDoctor, isNurse } = useAuth();
  
  // To keep it simple, we list today's checked-in / in-progress appointments 
  // as the queue for doctors/nurses to pick up.
  
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['queue', filterDate],
    queryFn: () => appointmentApi.list({ date: filterDate }).then(r => r.data.results || r.data),
  });

  // Filter to only those needing clinical attention
  const activeQueue = appointments.filter(a => 
    a.status === 'checked_in' || a.status === 'in_progress'
  );

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

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><div className="spinner" style={{ color: 'var(--clr-primary-500)' }} /></div>
        ) : activeQueue.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <ClipboardList size={48} />
            <h3>Queue is empty</h3>
            <p>No checked-in patients at the moment.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Wait Time</th>
                  <th>Patient</th>
                  <th>Doctor Assigned</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeQueue.map(a => {
                  const checkInTime = a.checked_in_at ? new Date(a.checked_in_at) : new Date();
                  const waitMins = Math.floor((new Date() - checkInTime) / 60000);
                  
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: waitMins > 30 ? 'var(--clr-danger-500)' : 'var(--clr-text-primary)' }}>
                          {waitMins} min
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--clr-text-muted)' }}>
                          Since {format(checkInTime, 'HH:mm')}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{a.patient_name}</td>
                      <td>Dr. {a.doctor_name}</td>
                      <td>
                        <span className={`badge badge-${a.status}`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/visit-records/${a.id}`)}
                        >
                          <Stethoscope size={14} /> Open Record
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
