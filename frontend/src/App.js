import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import About from './pages/About';
import Navbar from './components/Navbar';
import Privacy from './pages/Privacy';

const ProtectedLayout = () => {
  // Check if user is authenticated (e.g., userId exists in localStorage)
  const isAuthenticated = !!localStorage.getItem('userId');

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Outlet /> {/* Renders the child route (e.g., Dashboard, Challenges) */}
    </>
  );
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;