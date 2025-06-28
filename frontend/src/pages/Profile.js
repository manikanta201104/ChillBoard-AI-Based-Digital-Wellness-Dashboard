import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { getUser } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Profile = () => {
  const [userData, setUserData] = useState({ username: 'User123', email: 'user@example.com' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('jwt');
      if (token) {
        try {
          const data = await getUser();
          setUserData(data);
        } catch (err) {
          setError('Failed to fetch user data');
          console.error(err);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const screenTimeTrend = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Average Screen Time (hours)',
      data: [6, 5.5, 5, 4.5],
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  };

  const moodTrend = {
    labels: ['Happy', 'Sad', 'Neutral', 'Stressed'],
    datasets: [{
      label: 'Mood Frequency',
      data: [30, 20, 40, 10],
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: false } },
  };

  return (
    <div className="min-h-screen bg-blue-100 p-6">
      <h1 className="text-4xl font-bold text-blue-800 text-center mb-8">Your Profile</h1>
      {loading && <p className="text-center text-blue-600">Loading...</p>}
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}
      {!loading && (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">User Details</h2>
          <div className="space-y-2">
            <p className="text-gray-700">Username: {userData.username}</p>
            <p className="text-gray-700">Email: {userData.email}</p>
          </div>
          <h2 className="text-2xl font-semibold text-blue-800 mt-8 mb-4">Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xl font-medium text-blue-700 mb-2">Screen Time Trends</h3>
              <p className="text-gray-600">Placeholder for weekly averages (to be implemented).</p>
              <Bar data={screenTimeTrend} options={chartOptions} />
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xl font-medium text-blue-700 mb-2">Mood Trends</h3>
              <p className="text-gray-600">Placeholder for mood frequency (to be implemented).</p>
              <Bar data={moodTrend} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;