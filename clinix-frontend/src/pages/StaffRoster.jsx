import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { shiftApi, staffApi } from '../api/client';

export default function StaffRoster() {
  const { isAdmin, user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For new shift
  const [form, setForm] = useState({ staff_id: '', shift_date: '', start_time: '08:00', end_time: '17:00' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, staffRes] = await Promise.all([
        shiftApi.list(),
        isAdmin ? staffApi.list() : Promise.resolve({ data: [] })
      ]);
      setShifts(shiftsRes.data.results || shiftsRes.data);
      if (isAdmin) setStaffList(staffRes.data.results || staffRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSubmitting(true);
    try {
      await shiftApi.create({
        staff: form.staff_id,
        shift_date: form.shift_date,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      setForm({ ...form, shift_date: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to create shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await shiftApi.checkIn(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await shiftApi.checkOut(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2>Staff Roster</h2>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-header"><span className="card-title">Schedule New Shift</span></div>
          <form onSubmit={handleCreateShift} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label className="form-label">Staff Member</label>
              <select className="form-control" value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} required>
                <option value="">Select Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} - {s.role}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={form.shift_date} onChange={e => setForm({...form, shift_date: e.target.value})} required />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
              <label className="form-label">Start Time</label>
              <input type="time" className="form-control" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
              <label className="form-label">End Time</label>
              <input type="time" className="form-control" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>Add Shift</button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>Loading roster...</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Scheduled Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No shifts scheduled.</td></tr>
                ) : shifts.map(shift => (
                  <tr key={shift.id}>
                    <td>{shift.shift_date}</td>
                    <td>{shift.staff_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{shift.role}</td>
                    <td>{shift.start_time} - {shift.end_time}</td>
                    <td>
                      <span className={`badge ${shift.status === 'checked_in' ? 'badge-success' : shift.status === 'completed' ? 'badge-neutral' : 'badge-warning'}`}>
                        {shift.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {/* Let staff check themselves in/out if it's their shift */}
                      {shift.staff === user?.staff_id && shift.status === 'scheduled' && (
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleCheckIn(shift.id)}>
                          Check In
                        </button>
                      )}
                      {shift.staff === user?.staff_id && shift.status === 'checked_in' && (
                        <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleCheckOut(shift.id)}>
                          Check Out
                        </button>
                      )}
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
