import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi, staffApi, appointmentApi } from '../api/client';
import { X } from 'lucide-react';

export default function WalkInModal({ onClose }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [reason, setReason] = useState('Walk-in visit');

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients', searchTerm],
    queryFn: () => patientApi.search(searchTerm).then(r => r.data.results || r.data),
    enabled: searchTerm.length > 1,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['staff', 'doctors'],
    queryFn: () => staffApi.list({ role: 'doctor' }).then(r => r.data.results || r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => appointmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['dashboard-today']);
      onClose();
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'Failed to create walk-in appointment');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor) return;
    
    mutation.mutate({
      patient: selectedPatient.id,
      doctor: selectedDoctor,
      is_walk_in: true,
      reason,
      scheduled_time: new Date().toISOString(), // Server will override or ignore
      duration_minutes: 30
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Register Walk-In Patient</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        
        <form className="modal-body form-group" onSubmit={handleSubmit}>
          {!selectedPatient ? (
            <>
              <label>Search Patient</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name or phone..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              {isLoadingPatients && <div className="spinner" style={{ color: 'var(--clr-primary-500)' }} />}
              {!isLoadingPatients && patients.length > 0 && (
                <div style={{ border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-md)', maxHeight: 200, overflowY: 'auto' }}>
                  {patients.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPatient(p)}
                      style={{ padding: '12px', borderBottom: '1px solid var(--clr-border)', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600 }}>{p.full_name}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--clr-text-muted)' }}>
                        {p.patient_id || `PAT-${String(p.id).padStart(5,'0')}`} • {p.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ background: 'var(--clr-surface-2)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{selectedPatient.full_name}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedPatient(null)}>Change</button>
              </div>
              <div style={{ fontSize: '.85rem', color: 'var(--clr-text-muted)' }}>
                {selectedPatient.patient_id || `PAT-${String(selectedPatient.id).padStart(5,'0')}`}
              </div>
            </div>
          )}

          <label>Assign Doctor</label>
          <select 
            className="form-control" 
            value={selectedDoctor} 
            onChange={e => setSelectedDoctor(e.target.value)}
            required
          >
            <option value="">Select Doctor...</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.specialty || 'General'})</option>
            ))}
          </select>

          <label>Reason for Visit (Optional)</label>
          <input
            type="text"
            className="form-control"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />

          <div className="modal-actions" style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!selectedPatient || !selectedDoctor || mutation.isPending}
            >
              {mutation.isPending ? 'Processing...' : 'Register Walk-In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
