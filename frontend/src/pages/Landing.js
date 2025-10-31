import React, { useState, useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getApprovedReviews } from '../utils/api';
import ReviewForm from '../components/ReviewForm';
import SEO from '../components/SEO';

const Landing = () => {
  const [showForm, setShowForm] = useState(null);
  const [reviews, setReviews] = useState([]);
  const isLoggedIn = !!localStorage.getItem('jwt');

  const handleAuthSuccess = () => {
    setShowForm(null);
    window.location.href = '/dashboard'; // Redirect to dashboard after success
  };

  // Load approved reviews on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await getApprovedReviews();
        setReviews(list || []);
      } catch (e) {
        // silently ignore on landing if fetch fails
      }
    })();
  }, []);

  // Review submission moved into standalone ReviewForm component

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <SEO
        title="ChillBoard — Track Screen Time, Mood, and Wellness"
        description="Track screen time, monitor mood locally with AI, and get personalized Spotify recommendations. Start your digital wellness journey."
        url="https://www.chillboard.in/"
        canonical="https://www.chillboard.in/"
        keywords="track screen time, mood dashboard, digital wellness, AI mood detection, Spotify recommendations, productivity app"
        image="/logo512.png"
      />
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 opacity-50"></div>
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-slate-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-slate-300 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative min-h-screen p-6">
        
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-600 rounded-2xl mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-slate-800 mb-4 tracking-tight">
            ChillBoard
          </h1>
          <div className="inline-flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-semibold text-green-700">
              Your Digital Wellness Coach
            </h2>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Side - Description and Features */}
            <div className="space-y-8">
              
              {/* Description */}
              <div className="space-y-6">
                <h3 className="text-3xl font-bold text-slate-800">
                  Transform Your Digital Habits
                </h3>
                <p className="text-xl text-slate-600 leading-relaxed">
                  ChillBoard helps you achieve a balanced digital life through AI-driven wellness tools, mood detection, and personalized recommendations.
                </p>
                
                {/* Privacy Notice */}
                <div className="inline-flex items-center space-x-2 bg-slate-100 px-4 py-3 rounded-lg border border-slate-200">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-slate-700 font-medium">Privacy Protected:</span>
                  <span className="text-slate-600">Webcam data stays local</span>
                </div>
              </div>

              {/* Key Features */}
              <div className="space-y-6">
                <h4 className="text-2xl font-semibold text-slate-700">Key Features</h4>
                <div className="space-y-4">
                  {[
                    {
                      title: "Smart Screen Time Tracking",
                      description: "Automatically monitor your digital habits with detailed analytics and insights",
                      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    },
                    {
                      title: "AI-Powered Mood Detection",
                      description: "Get personalized recommendations based on your emotional state",
                      icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    },
                    {
                      title: "Community Challenges",
                      description: "Join digital wellness challenges and compete with others",
                      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    },
                    {
                      title: "Spotify Integration",
                      description: "Create mood-based playlists for enhanced wellness experience",
                      icon: "M9 19V6l12-1v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-1"
                    }
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon} />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-700 mb-1">{feature.title}</h5>
                        <p className="text-slate-600 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extension Download */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-700">Get Started</h3>
                    <p className="text-sm text-slate-500">Download our Chrome extension to begin tracking</p>
                  </div>
                </div>
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium w-full justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span>Download ChillBoard Extension</span>
                </a>
              </div>

              {/* Reviews Section */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-700">What users say</h3>
                    <p className="text-sm text-slate-500">Approved reviews from the community</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {reviews.length === 0 && (
                    <p className="text-sm text-slate-500">No reviews yet. Be the first to share your thoughts!</p>
                  )}
                  {reviews.map((r) => (
                    <div key={r._id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-700">{r.name || 'Anonymous'}</div>
                        <div className="text-amber-600">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      </div>
                      <p className="text-slate-600 text-sm mt-2">{r.text}</p>
                    </div>
                  ))}
                </div>

                {/* Submit review form for logged-in users */}
                {isLoggedIn && (<ReviewForm />)}
              </div>
            </div>

            {/* Right Side - Authentication */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                      Join ChillBoard
                    </h3>
                    <p className="text-slate-600">
                      Start your digital wellness journey today
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setShowForm('signup')}
                      className="w-full inline-flex items-center justify-center space-x-2 bg-slate-600 text-white px-6 py-4 rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium text-lg shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Create Account</span>
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-white text-slate-500">Already have an account?</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowForm('login')}
                      className="w-full inline-flex items-center justify-center space-x-2 bg-white text-slate-700 px-6 py-4 rounded-lg hover:bg-slate-50 transition-colors duration-200 font-medium text-lg border border-slate-300 shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign In</span>
                    </button>
                  </div>

                  {/* Benefits List */}
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-4">What you'll get:</p>
                    <div className="space-y-2">
                      {[
                        "Comprehensive screen time analytics",
                        "Personalized wellness recommendations", 
                        "Community challenges and leaderboards",
                        "Mood-based Spotify playlists"
                      ].map((benefit, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-slate-600">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setShowForm(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="overflow-y-auto max-h-[90vh]">
              <AuthForm type={showForm} onSuccess={handleAuthSuccess} />
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default Landing;