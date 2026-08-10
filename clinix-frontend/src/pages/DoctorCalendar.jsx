import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addDays } from 'date-fns';
import { appointmentApi, staffApi } from '../api/client';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Calendar.css';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM – 6 PM

const STATUS_COLOR = {
  booked:      { bg: 'rgba(59,130,246,.18)',  border: '#3b82f6', text: '#93c5fd' },
  checked_in:  { bg: 'rgba(139,92,246,.18)',  border: '#8b5cf6', text: '#c4b5fd' },
  with_nurse:  { bg: 'rgba(245,158,11,.18)',  border: '#f59e0b', text: '#fcd34d' },
  with_doctor: { bg: 'rgba(249,115,22,.18)',  border: '#f97316', text: '#fdba74' },
  completed:   { bg: 'rgba(34,197,94,.15)',   border: '#22c55e', text: '#86efac' },
  no_show:     { bg: 'rgba(239,68,68,.12)',   border: '#ef4444', text: '#fca5a5' },
  cancelled:   { bg: 'rgba(107,114,128,.12)', border: '#6b7280', text: '#9ca3af' },
};

const STATUS_LABELS = {
  booked: 'Booked', checked_in: 'Checked In', with_nurse: 'With Nurse',
  with_doctor: 'W/ Doctor', completed: 'Done', no_show: 'No Show', cancelled: 'Cancelled',
};

export default function DoctorCalendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isReceptionist, isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => staffApi.list({ role: 'doctor' }).then(r => r.data.results || r.data),
  });

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(startDate, i)); // Mon–Sat

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['calendar', selectedDoctorId, format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!selectedDoctorId) return [];
      const promises = weekDays.map(day =>
        appointmentApi.list({ doctor: selectedDoctorId, date: format(day, 'yyyy-MM-dd') })
          .then(r => r.data.results || r.data)
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: !!selectedDoctorId,
  });

  const getSlotAppt = (day, hour, minute) =>
    appointments.find(a => {
      const d = new Date(a.scheduled_time);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate() &&
        d.getHours() === hour &&
        d.getMinutes() === minute
      );
    });

  const handleSlotClick = (day, hour, minute, existingAppt) => {
    if (existingAppt) {
      // Navigate to visit record if active, or just show appointment info
      if (['checked_in', 'with_nurse', 'with_doctor'].includes(existingAppt.status)) {
        navigate(`/visit-records/${existingAppt.id}`);
      }
      return;
    }
    // Only receptionist/admin can book from calendar
    if (!isReceptionist && !isAdmin) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const timeStr = `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`;
    navigate(`/appointments/book?date=${dateStr}&time=${timeStr}&doctor=${selectedDoctorId}`);
  };

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday    = () => setCurrentDate(new Date());

  return (
    <div className="fade-in calendar-page">
      <div className="toolbar">
        <div>
          <h1>Calendar</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Doctor schedule &amp; availability
          </p>
        </div>
        <div className="toolbar-right">
          <select
            className="form-control"
            value={selectedDoctorId}
            onChange={e => setSelectedDoctorId(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="">Select a Doctor</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>Dr. {d.full_name}</option>
            ))}
          </select>
          {(isReceptionist || isAdmin) && selectedDoctorId && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/appointments/book?doctor=${selectedDoctorId}`)}
            >
              <Plus size={16} /> Book
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="calendar-header">
          <div className="calendar-nav">
            <button className="btn btn-secondary btn-sm" onClick={handleToday}>Today</button>
            <button className="btn btn-ghost btn-sm" onClick={handlePrevWeek}><ChevronLeft size={18} /></button>
            <button className="btn btn-ghost btn-sm" onClick={handleNextWeek}><ChevronRight size={18} /></button>
            <span className="calendar-month">{format(startDate, 'MMMM yyyy')}</span>
          </div>
          {selectedDoctorId && (
            <span style={{ fontSize: '.85rem', color: 'var(--clr-text-muted)', marginLeft: 'auto', paddingRight: 16 }}>
              {(isReceptionist || isAdmin) ? 'Click an empty slot to book' : 'Click an active appointment to open record'}
            </span>
          )}
        </div>

        {!selectedDoctorId ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <CalendarDays size={48} />
            <h3>Select a doctor to view their schedule</h3>
          </div>
        ) : (
          <div className="calendar-grid">
            {/* Time column */}
            <div className="calendar-col header-col">
              <div className="calendar-cell header-cell time-label">Time</div>
              {HOURS.map(hour => (
                <div key={hour} className="calendar-cell time-label">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const isPast  = day < new Date(new Date().toDateString());
              return (
                <div key={day.toISOString()} className={`calendar-col ${isToday ? 'is-today' : ''}`}>
                  <div className="calendar-cell header-cell">
                    <div className="day-name">{format(day, 'EEE')}</div>
                    <div className={`day-number ${isToday ? 'active' : ''}`}>{format(day, 'd')}</div>
                  </div>

                  {HOURS.map(hour => {
                    const topSlot = getSlotAppt(day, hour, 0);
                    const botSlot = getSlotAppt(day, hour, 30);

                    const renderSlot = (appt, minute) => {
                      const colors = appt ? STATUS_COLOR[appt.status] || STATUS_COLOR.booked : null;
                      const isClickable = appt
                        ? ['checked_in', 'with_nurse', 'with_doctor'].includes(appt.status)
                        : (isReceptionist || isAdmin) && !isPast;

                      return (
                        <div
                          className={`slot ${appt ? 'booked' : ''}`}
                          style={appt ? {
                            background: colors.bg,
                            borderLeft: `3px solid ${colors.border}`,
                            cursor: isClickable ? 'pointer' : 'default',
                          } : {
                            cursor: isClickable ? 'pointer' : 'default',
                          }}
                          onClick={() => handleSlotClick(day, hour, minute, appt)}
                          title={appt ? `${appt.patient_name} — ${STATUS_LABELS[appt.status]}` : (isClickable ? 'Click to book' : '')}
                        >
                          {appt ? (
                            <div className="slot-content">
                              <span className="slot-patient" style={{ color: colors.text }}>
                                {appt.patient_name}
                              </span>
                              <span className="slot-status" style={{ color: colors.border }}>
                                {STATUS_LABELS[appt.status]}
                              </span>
                            </div>
                          ) : (
                            <span className="slot-empty">
                              {isClickable ? <Plus size={10} style={{ opacity: .4 }} /> : ''}
                            </span>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div key={hour} className="calendar-cell slot-container">
                        {renderSlot(topSlot, 0)}
                        {renderSlot(botSlot, 30)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
