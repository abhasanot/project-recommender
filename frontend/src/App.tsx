import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import FacultyDashboard from './components/FacultyDashboard';
import { Toaster } from './components/ui/sonner';
import TrendsPage from './components/TrendsPage';


function AppContent() {
  const { user, loading, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(true);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  // Show Welcome Page first, before login
  if (showWelcome && !user) {
    return <WelcomePage onGetStarted={() => setShowWelcome(false)} />;
  }
  
  if (!user) {
    return <LoginPage />;
  }
  
  if (user.user_type === 'faculty') {
    return <FacultyDashboard facultyName={user.name} onLogout={logout} />;
  }
  
  return <Dashboard studentName={user.name} onLogout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}