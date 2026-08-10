import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { RoleGuard } from './components/RoleGuard';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import ClinicSignup from './pages/ClinicSignup';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import RegisterPatient from './pages/RegisterPatient';
import Appointments from './pages/Appointments';
import BookAppointment from './pages/BookAppointment';
import DoctorCalendar from './pages/DoctorCalendar';
import VisitRecords from './pages/VisitRecords';
import VisitRecordForm from './pages/VisitRecordForm';
import AdminPanel from './pages/AdminPanel';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/** Layout for authenticated pages — includes sidebar */
function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<ClinicSignup />} />

            {/* Protected — any staff */}
            <Route element={<RoleGuard><AppLayout /></RoleGuard>}>
              <Route index element={<Dashboard />} />
              <Route path="patients"           element={<Patients />} />
              <Route path="patients/new"       element={<RegisterPatient />} />
              <Route path="patients/:id"       element={<PatientDetail />} />
              <Route path="appointments"       element={<Appointments />} />
              <Route path="appointments/book"  element={<BookAppointment />} />
              <Route path="calendar"           element={<DoctorCalendar />} />

              {/* Doctor / Nurse / Admin only */}
              <Route element={<RoleGuard roles={['doctor','nurse','admin']}><Outlet /></RoleGuard>}>
                <Route path="visit-records"                  element={<VisitRecords />} />
                <Route path="visit-records/:appointmentId"   element={<VisitRecordForm />} />
              </Route>

              {/* Admin only */}
              <Route element={<RoleGuard roles={['admin']}><Outlet /></RoleGuard>}>
                <Route path="admin" element={<AdminPanel />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
