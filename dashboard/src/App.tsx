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

function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Home />} />
      <Route path="/nodes" element={<Nodes />} />
      <Route path="*" element={<div>404: Protected Page Not Found</div>} />
    </Routes>
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
    return <div className="w-screen h-screen bg-[#0E091E]" />;
  }

  if (isAuthenticated === true) {
    return <ProtectedRoutes />;
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