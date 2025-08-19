import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getUser, getUserPlaylists, unlinkSpotify, initiateSpotifyLogin, getScreenTime } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Profile = () => {
  const [userData, setUserData] = useState({ username: '', email: '' });
  const [playlists, setPlaylists] = useState([]);
  const [spotifyToken, setSpotifyToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screenTimeData, setScreenTimeData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('last7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('jwt');
        if (!token) throw new Error('No token found');

        const userResponse = await getUser();
        setUserData(userResponse);

        const playlistResponse = await getUserPlaylists();
        setPlaylists(playlistResponse);

        const user = await getUser();
        setSpotifyToken(user.spotifyToken?.accessToken || '');

        const screenTimeResponse = await getScreenTime();
        setScreenTimeData(screenTimeResponse.sort((a, b) => new Date(a.date) - new Date(b.date)));
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const pollInterval = setInterval(fetchData, 5 * 60 * 1000); // Poll every 5 minutes
    return () => clearInterval(pollInterval);
  }, []);

  const handleLinkSpotify = async () => {
    try {
      const authorizeURL = await initiateSpotifyLogin();
      window.location.href = authorizeURL;
    } catch (err) {
      setError('Failed to initiate Spotify Login: ' + err.message);
    }
  };

  const handleUnlinkSpotify = async () => {
    try {
      await unlinkSpotify();
      setSpotifyToken('');
      setPlaylists([]);
      setError('Spotify account unlinked successfully');
    } catch (err) {
      setError('Failed to unlink Spotify account: ' + err.message);
    }
  };

  const getFilteredScreenTime = () => {
    if (!screenTimeData.length) return [];

    const today = new Date();
    let start = new Date();
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (selectedPeriod) {
      case 'today':
        start = new Date(today);
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay()); // Sunday start
        start.setHours(0, 0, 0, 0);
        break;
      case 'lastWeek':
        const startOfThisWeek = new Date(today);
        startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
        start = new Date(startOfThisWeek);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last30days':
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last90days':
        start = new Date(today);
        start.setDate(start.getDate() - 89);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last365days':
        start = new Date(today);
        start.setDate(start.getDate() - 364);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (!customStart || !customEnd) return [];
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        return [];
    }

    return screenTimeData
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const filteredScreenTime = getFilteredScreenTime();

  // Prepare screen time trend data
  const screenTimeTrend = {
    labels: filteredScreenTime.map(d => new Date(d.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })) || ['No data'],
    datasets: [{
      label: 'Screen Time (hours)',
      data: filteredScreenTime.map(d => (d.totalTime / 3600).toFixed(2)) || [0],
      backgroundColor: 'rgba(71, 85, 105, 0.6)',
      borderColor: 'rgba(71, 85, 105, 1)',
      borderWidth: 2,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#64748b' } },
      x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#64748b' } },
    },
  };

  // Define period buttons with their display names
  const periodButtons = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 3 Months' },
    { value: 'last365days', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-700 mb-4">Your Profile</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">Track your digital wellness journey and manage your preferences</p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2">
              <div className="w-4 h-4 bg-slate-400 rounded-full animate-pulse"></div>
              <span className="text-slate-600">Loading profile...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className={`p-4 rounded-lg border ${error.includes('successfully') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {error.includes('successfully') ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-700">User Details</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">{userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Username</p>
                        <p className="text-slate-700 font-semibold">{userData.username || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Email</p>
                        <p className="text-slate-700 font-semibold">{userData.email || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Time Trends Section */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-700">Screen Time Trends</h3>
                    <p className="text-slate-500 text-sm">Screen time for selected period</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {/* Period Selection Buttons */}
                <div className="mb-8">
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {periodButtons.map(period => (
                      <button
                        key={period.value}
                        onClick={() => setSelectedPeriod(period.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                          selectedPeriod === period.value
                            ? 'bg-slate-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>

                  {selectedPeriod === 'custom' && (
                    <div className="flex justify-center space-x-4 mt-4">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart */}
                {filteredScreenTime.length > 0 ? (
                  <Bar data={screenTimeTrend} options={chartOptions} />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 text-sm">No screen time data available for the selected period.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615a.625.625 0 01-.859.23c-2.355-1.438-5.324-1.766-8.82-.965a.625.625 0 01-.312-1.211c3.812-.875 7.098-.496 9.76 1.118a.625.625 0 01.23.828zm1.227-2.731a.781.781 0 01-1.074.289c-2.691-1.648-6.793-2.125-9.98-1.16a.78.78 0 11-.37-1.516c3.637-1.102 8.164-.567 11.135 1.313a.781.781 0 01.289 1.074zm.106-2.844C14.692 8.995 9.391 8.768 6.16 9.697a.937.937 0 11-.445-1.82c3.719-.97 9.647-.722 13.406 1.399a.938.938 0 01-.726 1.724z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-700">Spotify Integration</h2>
                      <p className="text-slate-500 text-sm">
                        {spotifyToken ? 'Connected - Manage your mood-based playlists' : 'Connect to create personalized playlists'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
                    <div className={`w-2 h-2 rounded-full ${spotifyToken ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                    <span className="text-xs text-slate-600 font-medium">{spotifyToken ? 'Connected' : 'Not Connected'}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-slate-700 mb-4">Your Playlists</h3>
                  {playlists.length > 0 ? (
                    <div className="space-y-3">
                      {playlists.map((playlist, index) => (
                        <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">{playlist.name}</p>
                                <p className="text-sm text-slate-500">Mood: {playlist.mood}</p>
                              </div>
                            </div>
                            <a
                              href={`https://open.spotify.com/playlist/${playlist.spotifyPlaylistId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-green-600 hover:text-green-700 transition-colors duration-200"
                            >
                              <span className="text-sm font-medium">Open in Spotify</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                      <h4 className="text-lg font-medium text-slate-700 mb-2">No Playlists Yet</h4>
                      <p className="text-slate-500">
                        {spotifyToken 
                          ? "Your mood-based playlists will appear here once created" 
                          : "Connect your Spotify account to create personalized mood playlists"
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  {spotifyToken ? (
                    <button
                      onClick={handleUnlinkSpotify}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Unlink Spotify</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleLinkSpotify}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615a.625.625 0 01-.859.23c-2.355-1.438-5.324-1.766-8.82-.965a.625.625 0 01-.312-1.211c3.812-.875 7.098-.496 9.76 1.118a.625.625 0 01.23.828zm1.227-2.731a.781.781 0 01-1.074.289c-2.691-1.648-6.793-2.125-9.98-1.16a.78.78 0 11-.37-1.516c3.637-1.102 8.164-.567 11.135 1.313a.781.781 0 01.289 1.074zm.106-2.844C14.692 8.995 9.391 8.768 6.16 9.697a.937.937 0 11-.445-1.82c3.719-.97 9.647-.722 13.406 1.399a.938.938 0 01-.726 1.724z"/>
                      </svg>
                      <span>Link Spotify Account</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;