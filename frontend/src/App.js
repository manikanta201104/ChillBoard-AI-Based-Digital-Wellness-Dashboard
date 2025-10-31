import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import About from './pages/About';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Privacy from './pages/Privacy';
import ForgotPassword from './pages/ForgotPassword.jsx';
import EmailPolicy from './pages/EmailPolicy.jsx';

const ProtectedLayout = () => {
  // Check if user is authenticated (e.g., userId exists in localStorage)
  const isAuthenticated = !!localStorage.getItem('userId');

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Outlet /> {/* Renders the child route (e.g., Dashboard, Challenges) */}
      <Footer />
    </>
  );
};

// Public layout for routes that don't need auth (Landing, Forgot Password)
const PublicLayout = () => {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
};

// Admin-only guard: ensures JWT exists and role is 'admin'
const AdminRoute = () => {
  const token = localStorage.getItem('jwt');
  const role = localStorage.getItem('role');
  if (!token || role !== 'admin') {
    return <Navigate to="/" replace />; // Redirect non-admins to home/login
  }
  return <Outlet />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/email-policy" element={<EmailPolicy />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;