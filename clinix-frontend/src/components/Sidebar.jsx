import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList,
  Settings, LogOut, Activity, FileBox, Clock, Stethoscope,
  UserCog, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

/**
 * Navigation structure grouped by clinical workflow.
 * Each group has a label and items with role restrictions.
 * Empty roles array = visible to all authenticated staff.
 */
const NAV_GROUPS = [
  {
    label: 'Clinic',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [] },
    ],
  },
  {
    label: 'Patient Care',
    items: [
      { to: '/patients',      icon: Users,         label: 'Patients',      roles: [] },
      { to: '/appointments',  icon: CalendarDays,  label: 'Appointments',  roles: [] },
      { to: '/calendar',      icon: Clock,         label: 'Doctor Schedule', roles: [] },
      { to: '/visit-records', icon: ClipboardList, label: 'Consultations', roles: ['doctor', 'nurse', 'admin'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/roster',    icon: UserCog,    label: 'Staff Roster', roles: [] },
      { to: '/inventory', icon: FileBox,    label: 'Inventory',    roles: [] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin', icon: Settings, label: 'Admin Panel', roles: ['admin'] },
    ],
  },
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

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Activity size={18} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <span className="brand-name">Clinix</span>
          <span className="brand-clinic">{clinicName}</span>
        </div>
      </div>

      {/* Grouped nav */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => item.roles.length === 0 || item.roles.includes(user?.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-section-label">{group.label}</div>
              {visibleItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="avatar">{initials}</div>
          <div className="user-meta">
            <span className="user-name">{user?.full_name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
