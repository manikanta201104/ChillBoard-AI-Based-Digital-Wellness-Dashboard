import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';

const Landing = () => {
  const [showForm, setShowForm] = useState(null);

  const handleAuthSuccess = () => {
    setShowForm(null);
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">ChillBoard</h1>
        <h2 className="text-3xl font-semibold text-green-600 mb-2">
          Your Digital Wellness Coach
        </h2>
        <p className="text-lg text-gray-800 mb-4">
          Track your screen time, get personalized recommendations, and improve your digital habits.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Privacy Note: Webcam data stays local
        </p>
        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline mb-6 block"
        >
          Download the ChillBoard Extension
        </a>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowForm('signup')}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
          >
            Sign Up
          </button>
          <button
            onClick={() => setShowForm('login')}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
          >
            Login
          </button>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="relative">
            <button
              onClick={() => setShowForm(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <AuthForm type={showForm} onSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;