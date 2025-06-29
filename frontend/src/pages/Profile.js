import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { initiateSpotifyLogin, getUser, getUserPlaylists, unlinkSpotify } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Profile = () => {
  const [userData, setUserData] = useState({ username: '', email: '' });
  const [playlists, setPlaylists] = useState([]);
  const [spotifyToken, setSpotifyToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('jwt');
        if (token) {
          const userResponse = await getUser();
          setUserData(userResponse);

          const playlistResponse = await getUserPlaylists();
          setPlaylists(playlistResponse);

          const user = await getUser();
          setSpotifyToken(user.spotifyToken?.accessToken || '');
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLinkSpotify = async () => {
    try {
      const authorizeURL = await initiateSpotifyLogin();
      window.location.href = authorizeURL;
    } catch (err) {
      setError('Failed to initiate Spotify Login');
    }
  };

  const handleUnlinkSpotify = async () => {
    try {
      await unlinkSpotify();
      setSpotifyToken('');
      setPlaylists([]);
      setError('Spotify account unlinked successfully');
    } catch (err) {
      setError('Failed to unlink Spotify account');
    }
  };

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
    <div className="min-h-screen bg-green-50 p-4 md:p-6">
      <h1 className="text-4xl font-bold text-gray-700 text-center mb-8 sm:text-3xl">Your Profile</h1>
      {loading && <p className="text-center text-gray-700">Loading...</p>}
      {error && <p className="text-center text-red-500 mb-4 sm:text-sm">{error}</p>}
      {!loading && (
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">User Details</h2>
          <div className="space-y-2 bg-blue-100 p-4 rounded-lg">
            <p className="text-gray-700">Username: {userData.username}</p>
            <p className="text-gray-700">Email: {userData.email}</p>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mt-8 mb-4">Trends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50 p-4 rounded-lg">
            <div className="bg-white p-4 rounded-lg">
              <h3 className="text-xl font-medium text-gray-700 mb-2">Screen Time Trends</h3>
              <p className="text-gray-600 sm:text-sm">Placeholder for weekly averages (to be implemented).</p>
              <Bar data={screenTimeTrend} options={chartOptions} />
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h3 className="text-xl font-medium text-gray-700 mb-2">Mood Trends</h3>
              <p className="text-gray-600 sm:text-sm">Placeholder for mood frequency (to be implemented).</p>
              <Bar data={moodTrend} options={chartOptions} />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700 mt-8 mb-4">Playlists</h2>
          {playlists.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {playlists.map((playlist, index) => (
                <li key={index} className="text-gray-700 border border-blue-200 p-2 rounded hover:bg-green-100 sm:text-sm">
                  <a
                    href={`https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >{`${playlist.name} - ${playlist.mood}`}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 sm:text-sm">No saved playlists yet.</p>
          )}
          <div className="mt-6">
            {spotifyToken ? (
              <button
                onClick={handleUnlinkSpotify}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:text-sm"
              >
                Unlink Spotify
              </button>
            ) : (
              <button
                onClick={handleLinkSpotify}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:text-sm"
              >
                Link Spotify Account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;