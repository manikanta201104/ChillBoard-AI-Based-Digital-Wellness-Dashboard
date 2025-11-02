import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data (e.g., remove userId from localStorage)
    localStorage.removeItem('userId');
    localStorage.removeItem('jwt'); // Assuming you store JWT token
    navigate('/'); // Redirect to landing page
  };

  return (
    <nav className="bg-slate-700 border-b border-slate-600 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand Section */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              {/* <div className="w-8 h-8 bg-slate-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div> */}
              <span className="text-white font-medium text-lg">ChillBoard</span>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-1">
              <Link 
                to="/dashboard" 
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link 
                to="/challenges" 
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Challenges
              </Link>
              <Link 
                to="/profile" 
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Profile
              </Link>
              <Link 
                to="/settings" 
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Settings
              </Link>
              <Link 
                to="/about" 
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                About
              </Link>
              <Link 
                to="/privacy" 
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Privacy
              </Link>
            </div>
          </div>

          {/* Right Section - Logout */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors duration-200 text-sm font-medium flex items-center space-x-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu (Hidden by default - would need state to toggle) */}
        <div className="md:hidden border-t border-slate-600 py-3 space-y-1">
          <Link 
            to="/dashboard" 
            className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm"
          >
            Dashboard
          </Link>
          <Link 
            to="/challenges" 
            className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm"
          >
            Challenges
          </Link>
          <Link 
            to="/profile" 
            className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm"
          >
            Profile
          </Link>
          <Link 
            to="/settings" 
            className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm"
          >
            Settings
          </Link>
          <Link 
            to="/about" 
            className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition-colors duration-200 text-sm"
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;