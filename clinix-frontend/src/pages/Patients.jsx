import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { patientApi } from '../api/client';
import { Search, Plus } from 'lucide-react';

export default function Patients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Patients</h1>
            <p>Search and manage patient records</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/patients/new')}>
            <Plus size={15} /> Register Patient
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Patient Registry</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, phone or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="page-loader"><div className="spinner" /><span>Searching…</span></div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <h3>No patients found</h3>
            <p>
              {search
                ? `No records matching "${search}". Try a different name, phone or ID.`
                : 'No patients registered yet.'}
            </p>
            {!search && (
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/patients/new')}>
                <Plus size={15} /> Register First Patient
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Age / Sex</th>
                <th>National ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className="clickable-row"
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td>
                    <code className="patient-id">
                      {p.patient_id || `PAT-${String(p.id).padStart(5, '0')}`}
                    </code>
                  </td>
                  <td className="cell-primary">{p.full_name}</td>
                  <td>{p.phone}</td>
                  <td>
                    {p.age != null ? `${p.age} yrs` : '—'}
                    {p.gender ? ` · ${p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}` : ''}
                  </td>
                  <td>{p.national_id || '—'}</td>
                  <td className="text-right">
                    <Link
                      to={`/patients/${p.id}`}
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
