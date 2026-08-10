import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { patientApi } from '../api/client';
import { Search, Plus, UserCircle, Phone, CalendarDays } from 'lucide-react';

export default function Patients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', debouncedSearch],
    queryFn: () => patientApi.list({ search: debouncedSearch }).then((r) => r.data.results || r.data),
  });

  return (
    <div className="fade-in">
      <div className="toolbar">
        <div>
          <h1>Patients</h1>
          <p style={{ color: 'var(--clr-text-secondary)', marginTop: '4px' }}>
            Manage patient records and histories
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/patients/new')}
        >
          <Plus size={18} /> Register Patient
        </button>
      </div>

      <div className="card">
        <div className="toolbar-left" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <div className="spinner" style={{ color: 'var(--clr-primary-500)' }} />
          </div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <UserCircle size={48} />
            <h3>No patients found</h3>
            <p>Try adjusting your search or register a new patient.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Phone</th>
                  <th>Age / Sex</th>
                  <th>National ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.8rem', background: 'var(--clr-surface-2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--clr-primary-400)', fontWeight: 700, letterSpacing: '.03em' }}>
                        {p.patient_id || `PAT-${String(p.id).padStart(5,'0')}`}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} style={{ color: 'var(--clr-text-muted)' }} />
                        {p.phone}
                      </div>
                    </td>
                    <td>
                      {p.age != null ? `${p.age} yrs` : '—'} /{' '}
                      <span style={{ textTransform: 'capitalize' }}>
                        {p.gender || '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {p.national_id || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/patients/${p.id}`} className="btn btn-secondary btn-sm">
                        View Profile
                      </Link>
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
