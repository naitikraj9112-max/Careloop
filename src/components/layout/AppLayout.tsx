import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/contexts/PatientContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import LanguageSelector from '@/components/ui/LanguageSelector';
import {
  Home, Pill, Calendar, Users, ClipboardList, Bell, LogOut,
  Menu, X, Activity, ChevronDown, UserCheck, Plus, Heart,
} from 'lucide-react';

const elderlyLinks = [
  { to: '/elderly', label: 'Today', icon: Home },
  { to: '/dose-confirmation', label: 'Medications', icon: Pill },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/activity', label: 'Timeline', icon: Activity },
];

const familyLinks = [
  { to: '/family', label: 'Overview', icon: Home },
  { to: '/elderly', label: 'Patient Dashboard', icon: Heart },
  { to: '/medications', label: 'Medications', icon: Pill },
  { to: '/carecircle', label: 'CareCircle', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/adherence', label: 'Adherence', icon: ClipboardList },
  { to: '/activity', label: 'Activity Log', icon: Activity },
];

const caretakerLinks = [
  { to: '/caretaker', label: 'Tasks', icon: Home },
  { to: '/elderly', label: 'Patient Dashboard', icon: Heart },
  { to: '/dose-confirmation', label: 'Dose Tracking', icon: UserCheck },
  { to: '/medications', label: 'Medications', icon: Pill },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { patients, currentPatient, selectPatient, currentMembership } = usePatient();
  const { unreadCount } = useNotifications(user?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const role = currentMembership?.role;
  const navLinks = role === 'elderly' ? elderlyLinks : role === 'caretaker' ? caretakerLinks : familyLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#F9FAF7] text-neutral-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar / Desktop navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-neutral-200/80 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-2xl font-bold tracking-tight text-neutral-900">
              CareLoop
            </span>
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Selector */}
        {patients.length > 0 ? (
          <div className="p-4 border-b border-neutral-100 relative">
            <button
              onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl border border-neutral-200/80 transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">Active Care Profile</p>
                <p className="font-bold text-neutral-900 truncate text-sm">
                  {currentPatient?.name || 'Select Patient'}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${patientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {patientDropdownOpen && (
              <div className="absolute left-4 right-4 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-lg z-50 overflow-hidden py-1">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      selectPatient(p.id);
                      setPatientDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 flex items-center justify-between ${
                      currentPatient?.id === p.id ? 'bg-[#EBF7EE] text-[#1E3A2F] font-semibold' : 'text-neutral-700'
                    }`}
                  >
                    <span>{p.name}</span>
                    {currentPatient?.id === p.id && <span className="w-2 h-2 rounded-full bg-[#22C55E]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 border-b border-neutral-100">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#EBF7EE] text-[#1E3A2F] rounded-2xl border border-[#22C55E]/30 text-left hover:bg-[#d8eedf] transition-colors"
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold">No Active Profile</p>
                <p className="font-bold text-xs">+ Create Patient Profile</p>
              </div>
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#18181B] text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`
              }
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-neutral-100 space-y-1">
          <button
            onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl hover:bg-neutral-100 transition-colors"
          >
            <Avatar name={user?.displayName || ''} size="sm" />
            <div className="text-left flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 text-sm truncate">{user?.displayName}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
            </div>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-full text-xs font-semibold text-neutral-500 hover:text-red-600 hover:bg-red-50/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-neutral-100 text-neutral-700"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="lg:hidden font-serif text-xl font-bold tracking-tight text-neutral-900">
              CareLoop
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentPatient && (
              <button
                onClick={() => navigate('/elderly')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EBF7EE] text-[#1E3A2F] border border-[#22C55E]/30 text-xs font-semibold hover:bg-[#d8eedf] transition-colors cursor-pointer"
                title="View what the patient sees (PillPop Tracker)"
              >
                <Heart className="w-3.5 h-3.5 text-[#22C55E]" fill="currentColor" />
                <span>Patient Screen</span>
              </button>
            )}

            <button
              onClick={() => navigate('/medications')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#22C55E]" />
              Add Medication
            </button>

            <LanguageSelector />

            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 rounded-full hover:bg-neutral-100 transition-colors text-neutral-600"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-[#22C55E] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
