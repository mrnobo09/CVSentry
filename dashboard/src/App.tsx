// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/auth';
import Login from './screens/login';
import Home from './screens/home';
import Signup from './screens/Signup';
import VerifyOTP from './screens/VerifyOTP';
import SignupSuccess from './screens/SignupSuccess';
import ActivateAccount from './screens/ActivateAccount';
import Nodes from './screens/Nodes';
import AlertsScreen from './screens/AlertsScreen';
import FacesScreen from './screens/FacesScreen';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';
import { useAlerts } from './hooks/useAlerts';

function ProtectedLayout() {
  const { alerts: _, latestAlert, unreadCount, clearUnread } = useAlerts();

  return (
    <>
      <Navbar unreadCount={unreadCount} />
      {latestAlert && (
        <AlertBanner
          key={latestAlert.id}
          alert={latestAlert}
          onDismiss={clearUnread}
        />
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/nodes" element={<Nodes />} />
        <Route path="/alerts" element={<AlertsScreen />} />
        <Route path="/faces" element={<FacesScreen />} />
        <Route path="*" element={<div className="pt-24 text-center text-gray-500">404: Page Not Found</div>} />
      </Routes>
    </>
  );
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signup-success" element={<SignupSuccess />} />
      <Route path="/activate/:uid/:token" element={<ActivateAccount />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="*" element={<Login />} />
    </Routes>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  // null means auth check is still in-flight
  if (isAuthenticated === null) {
    return <div className="w-screen h-screen bg-gray-950" />;
  }

  if (isAuthenticated === true) {
    return <ProtectedLayout />;
  } else {
    return <PublicRoutes />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;