// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/auth';
import Login from './screens/login';
import Home from './screens/home'; 

function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Home />} />
      <Route path="*" element={<div>404: Protected Page Not Found</div>} />
    </Routes>
  );
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Login />} /> 
    </Routes>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  
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