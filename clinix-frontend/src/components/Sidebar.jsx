import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, CalendarDays, UserPlus, ClipboardList,
  Settings, LogOut, Stethoscope, Activity, FileBox, Clock
} from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/',                  icon: LayoutDashboard, label: 'Dashboard',      roles: [] },
  { to: '/patients',          icon: Users,           label: 'Patients',       roles: [] },
  { to: '/appointments',      icon: CalendarDays,    label: 'Appointments',   roles: [] },
  { to: '/calendar',          icon: CalendarDays,    label: 'Calendar',       roles: [] },
  { to: '/visit-records',     icon: ClipboardList,   label: 'Visit Records',  roles: ['doctor', 'nurse', 'admin'] },
  { to: '/roster',            icon: Clock,           label: 'Staff Roster',   roles: [] },
  { to: '/inventory',         icon: FileBox,         label: 'Inventory',      roles: [] },
  { to: '/admin',             icon: Settings,        label: 'Admin',          roles: ['admin'] },
];

export default function Sidebar() {
  const { user, logout, clinicName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.full_name?.split(' ')[0]?.[0] ?? ''}${user.full_name?.split(' ')[1]?.[0] ?? ''}`.toUpperCase()
    : '?';

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.includes(user?.role)
  );

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Activity size={22} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <span className="brand-name">Clinix</span>
          <span className="brand-clinic">{clinicName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">
            {initials}
          </div>
          <div className="user-meta">
            <span className="user-name">{user?.full_name}</span>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
