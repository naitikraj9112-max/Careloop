import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PatientProvider } from '@/contexts/PatientContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import AcceptInvitationPage from '@/pages/auth/AcceptInvitationPage';
import ElderlyDashboard from '@/pages/elderly/ElderlyDashboard';
import FamilyDashboard from '@/pages/family/FamilyDashboard';
import CaretakerDashboard from '@/pages/caretaker/CaretakerDashboard';
import MedicationManagement from '@/pages/medications/MedicationManagement';
import ScheduleManagement from '@/pages/medications/ScheduleManagement';
import DoseConfirmation from '@/pages/medications/DoseConfirmation';
import AppointmentsPage from '@/pages/appointments/AppointmentsPage';
import CareCirclePage from '@/pages/carecircle/CareCirclePage';
import AdherencePage from '@/pages/adherence/AdherencePage';
import NotificationCentre from '@/pages/notifications/NotificationCentre';
import ActivityLog from '@/pages/activity/ActivityLog';
import ProfilePage from '@/pages/profile/ProfilePage';
import DashboardRouter from '@/pages/DashboardRouter';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite/:token" element={<AcceptInvitationPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<PatientProvider><AppLayout /></PatientProvider>}>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/elderly" element={<ElderlyDashboard />} />
                <Route path="/family" element={<FamilyDashboard />} />
                <Route path="/caretaker" element={<CaretakerDashboard />} />
                <Route path="/medications" element={<MedicationManagement />} />
                <Route path="/medications/:medicationId/schedules" element={<ScheduleManagement />} />
                <Route path="/dose-confirmation" element={<DoseConfirmation />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/carecircle" element={<CareCirclePage />} />
                <Route path="/adherence" element={<AdherencePage />} />
                <Route path="/notifications" element={<NotificationCentre />} />
                <Route path="/activity" element={<ActivityLog />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
