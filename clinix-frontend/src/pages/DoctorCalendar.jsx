import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays } from 'date-fns';
import { appointmentApi, staffApi } from '../api/client';
import { CalendarDays, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import './Calendar.css';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

export default function DoctorCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => staffApi.list({ role: 'doctor' }).then(r => r.data),
  });

  // Calculate the week
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(startDate, i)); // Mon-Sat

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['calendar', selectedDoctorId, format(startDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!selectedDoctorId) return [];
      // Fetch for each day (could be optimized with a date range param on the backend)
      const promises = weekDays.map(day => 
        appointmentApi.list({ doctor: selectedDoctorId, date: format(day, 'yyyy-MM-dd') }).then(r => r.data)
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: !!selectedDoctorId,
  });

  const getSlotAppt = (day, hour, minute) => {
    return appointments.find(a => {
      const d = new Date(a.scheduled_time);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate() &&
        d.getHours() === hour &&
        d.getMinutes() === minute
      );
    });
  };

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="fade-in calendar-page">
      <div className="toolbar">
        <div>
          <h1>Calendar</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Doctor schedule & availability
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
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="calendar-header">
          <div className="calendar-nav">
            <button className="btn btn-secondary btn-sm" onClick={handleToday}>Today</button>
            <button className="btn btn-ghost btn-sm" onClick={handlePrevWeek}><ChevronLeft size={18} /></button>
            <button className="btn btn-ghost btn-sm" onClick={handleNextWeek}><ChevronRight size={18} /></button>
            <span className="calendar-month">
              {format(startDate, 'MMMM yyyy')}
            </span>
          </div>
        </div>

        {!selectedDoctorId ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <CalendarDays size={48} />
            <h3>Select a doctor to view their schedule</h3>
          </div>
        ) : (
          <div className="calendar-grid">
            {/* Header Row (Days) */}
            <div className="calendar-col header-col">
              <div className="calendar-cell header-cell time-label">Time</div>
              {HOURS.map(hour => (
                <div key={hour} className="calendar-cell time-label">
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map(day => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div key={day.toISOString()} className={`calendar-col ${isToday ? 'is-today' : ''}`}>
                  <div className="calendar-cell header-cell">
                    <div className="day-name">{format(day, 'EEE')}</div>
                    <div className={`day-number ${isToday ? 'active' : ''}`}>{format(day, 'd')}</div>
                  </div>
                  
                  {HOURS.map(hour => {
                    const topSlot = getSlotAppt(day, hour, 0);
                    const botSlot = getSlotAppt(day, hour, 30);
                    
                    return (
                      <div key={hour} className="calendar-cell slot-container">
                        <div className={`slot ${topSlot ? 'booked' : ''} status-${topSlot?.status}`}>
                          {topSlot ? (
                            <div className="slot-content">
                              <span className="slot-patient">{topSlot.patient_name}</span>
                              <span className="slot-status">{topSlot.status.replace('_', ' ')}</span>
                            </div>
                          ) : (
                            <span className="slot-empty">Available</span>
                          )}
                        </div>
                        <div className={`slot bottom-half ${botSlot ? 'booked' : ''} status-${botSlot?.status}`}>
                           {botSlot ? (
                            <div className="slot-content">
                              <span className="slot-patient">{botSlot.patient_name}</span>
                              <span className="slot-status">{botSlot.status.replace('_', ' ')}</span>
                            </div>
                          ) : (
                            <span className="slot-empty">Available</span>
                          )}
                        </div>
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
