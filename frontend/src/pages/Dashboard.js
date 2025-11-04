/*global chrome */

import React, { useEffect, useState, useRef, useCallback } from 'react';

import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  getScreenTime,
  getRecommendations,
  updateRecommendation,
  getUser,
  getLeaderboard,
  getChallenges,
  initiateSpotifyLogin,
} from '../utils/api';
import MoodDetection from '../components/MoodDetection';
import SpotifyPlayerComponent from '../components/SpotifyPlayerComponent';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const Dashboard = () => {
  const [screenTimeData, setScreenTimeData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);
  const timerRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const hasFetchedRecOnceRef = useRef(false);

  const showToast = (message, type = 'success') => {
    const options = {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };
    if (type === 'success') toast.success(message, options);
    else if (type === 'error') toast.error(message, options);
    else toast.info(message, options);
  };

  const fetchRecommendationsAutomatically = useCallback(async () => {
    if (!localStorage.getItem('userId')) return;

    try {
      const updatedRecommendations = await getRecommendations();
      setRecommendations(updatedRecommendations);
      if (updatedRecommendations && updatedRecommendations.length > 0) {
        hasFetchedRecOnceRef.current = true;
      }
    } catch (err) {
      setError(prev => prev || '');
      if (hasFetchedRecOnceRef.current) {
        showToast('Failed to fetch recommendations', 'error');
      }
      console.error('Recommendation fetch error:', err);
    }
  }, []);

  useEffect(() => {
    const pollData = async () => {
      try {
        const [screenTimeData, recData, userData] = await Promise.all([
          getScreenTime(),
          getRecommendations(),
          getUser(),
        ]);
        setScreenTimeData(screenTimeData.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setRecommendations(recData);
        if (recData && recData.length > 0) {
          hasFetchedRecOnceRef.current = true;
        }
        await fetchLeaderboard();
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
      }
    };

    const initialize = async () => {
      await pollData();
      updateIntervalRef.current = setInterval(pollData, 300000); // 5 minutes
    };

    initialize();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const messages = [
      'Stay consistent: a 2‑minute stretch can reset your focus.',
      'Hydrate and breathe: 10 deep breaths can boost clarity.',
      'Short walk, big impact: take 10 minutes to refresh.',
      'Protect your eyes: 20‑20‑20 rule for healthy screens.',
      'Celebrate progress, not perfection. You got this!'
    ];
    const id = setInterval(() => {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      toast.info(msg, { position: 'top-right', autoClose: 5000 });
    }, 60 * 60 * 1000); // every hour
    return () => clearInterval(id);
  }, []);

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const challenges = await getChallenges();
      const joined = challenges.find(challenge =>
        challenge.participants.some(p => p.userId === localStorage.getItem('userId'))
      );
      if (joined) {
        const data = await getLeaderboard(joined.challengeId);
        setLeaderboard(data.slice(0, 3));
      } else {
        setLeaderboard([]);
        showToast('No leaderboard data available', 'info');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch leaderboard');
      showToast(err.message || 'Failed to fetch leaderboard', 'error');
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const formatHoursHM = (hoursFloat) => {
    if (!hoursFloat || isNaN(hoursFloat)) return '0:00';
    const totalMinutes = Math.round(hoursFloat * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const startTimer = (duration) => {
    const seconds = parseInt(duration) * 60; // Convert minutes to seconds
    setTimer(seconds);
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimer(prev => prev <= 0 ? (clearInterval(timerRef.current), setTimerRunning(false), 0) : prev - 1), 1000);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(null);
    setTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleRecommendationAction = async (recommendationId, accepted) => {

    try {
      await updateRecommendation(recommendationId, accepted);
      setActionStatus(accepted ? 'accepted' : 'declined');
      const updatedRecommendations = await getRecommendations();
      setRecommendations(updatedRecommendations);
      showToast(`Recommendation ${accepted ? 'accepted' : 'declined'} successfully!`);

      const latestRec = updatedRecommendations.find(rec => rec.recommendationId === recommendationId);
      if (accepted && latestRec) {
        let parsedDetails;
        try { parsedDetails = JSON.parse(latestRec.details || '{}'); } catch (_) { parsedDetails = {}; }
        switch (latestRec.type) {
          case 'break':
            {
              let minutes = 5;
              const raw = latestRec.details;
              if (typeof raw === 'string') {
                const match = raw.match(/(\d{1,3})/);
                if (match) minutes = parseInt(match[1]);
              }
              if (parsedDetails && typeof parsedDetails === 'object') {
                if (parsedDetails.durationMinutes && Number(parsedDetails.durationMinutes) > 0) {
                  minutes = Number(parsedDetails.durationMinutes);
                } else if (typeof parsedDetails.message === 'string') {
                  const m2 = parsedDetails.message.match(/(\d{1,3})/);
                  if (m2) minutes = parseInt(m2[1]);
                }
              }
              startTimer(minutes);
            }
            break;
          case 'activity':
            {
              const msg = (parsedDetails && parsedDetails.message) ? parsedDetails.message : (typeof latestRec.details === 'string' ? latestRec.details : '');
              if (msg.includes('body stretch')) startTimer(2);
              else if (msg.includes('walk')) startTimer(10);
              else if (msg.includes('eye exercises')) startTimer(2);
              else if (msg.includes('meditation')) startTimer(5);
            }
            break;
          default:
            break;
        }
      }

    } catch (err) {
      setError('Failed to update recommendation');
      showToast('Failed to update recommendation', 'error');
    }
  };

  const handleInstallReminder = () => {
    alert('Please reinstall the ChillBoard Chrome extension to track your screen time!');
    window.open('https://chromewebstore.google.com/detail/chillboard-extension/feaegaofmcfblfmegpkliepealjhongd', '_blank');
  };

  const handleSpotifyConnect = async () => {
    try {
      const authorizeURL = await initiateSpotifyLogin();
      window.location.href = authorizeURL;
      showToast('Spotify connection initiated!');
    } catch (err) {
      setError('Failed to initiate Spotify login');
      showToast('Failed to initiate Spotify login', 'error');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

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
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ascending for chart
  };

  const filteredScreenTime = getFilteredScreenTime();

  const barChartData = {
    labels: filteredScreenTime.map(entry => new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Screen Time (minutes)',
      data: filteredScreenTime.map(entry => Math.floor(entry.totalTime / 60)),
      backgroundColor: 'rgba(71, 85, 105, 0.7)',
      borderColor: 'rgba(71, 85, 105, 1)',
      borderWidth: 1,
    }],
  };

  const tabUsageMap = {};
  screenTimeData
    .filter(entry => new Date(entry.date).toISOString().split('T')[0] === todayStr)
    .forEach(entry => entry.tabs.forEach(tab => tabUsageMap[tab.url] = (tabUsageMap[tab.url] || 0) + tab.timeSpent));

  const pieColorsBg = [
    'rgba(99, 102, 241, 0.85)',  // indigo-500
    'rgba(16, 185, 129, 0.85)',  // emerald-500
    'rgba(245, 158, 11, 0.85)',  // amber-500
    'rgba(239, 68, 68, 0.85)',   // red-500
    'rgba(59, 130, 246, 0.85)',  // blue-500
    'rgba(139, 92, 246, 0.85)',  // violet-500
    'rgba(20, 184, 166, 0.85)',  // teal-500
    'rgba(249, 115, 22, 0.85)',  // orange-500
    'rgba(34, 197, 94, 0.85)',   // green-500
    'rgba(234, 179, 8, 0.85)',   // yellow-500
  ];
  const pieColorsBorder = [
    'rgba(99, 102, 241, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(59, 130, 246, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(20, 184, 166, 1)',
    'rgba(249, 115, 22, 1)',
    'rgba(34, 197, 94, 1)',
    'rgba(234, 179, 8, 1)'
  ];

  const pieLabels = Object.keys(tabUsageMap);
  const pieDataValues = Object.values(tabUsageMap);
  const pieChartData = {
    labels: pieLabels,
    datasets: [{
      label: 'Tab Usage (seconds)',
      data: pieDataValues,
      backgroundColor: pieLabels.map((_, i) => pieColorsBg[i % pieColorsBg.length]),
      borderColor: pieLabels.map((_, i) => pieColorsBorder[i % pieColorsBorder.length]),
      borderWidth: 1,
    }],
  };

  const latestRecommendation = recommendations.length > 0 ? recommendations[0] : null;

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
    <div className="min-h-screen bg-slate-50 p-6 space-y-8">
      {/* Page Header */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-medium text-slate-700 mb-2">Dashboard</h1>
        <p className="text-slate-500">Monitor your digital wellness and get personalized recommendations</p>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-center text-sm">{error}</p>
        </div>
      )}

      {/* Mood Detection Section */}
      <MoodDetection fetchRecommendations={fetchRecommendationsAutomatically} />

      {/* Quick Connect Section */}
      <div className="max-w-4xl mx-auto text-center">
        <button
          onClick={handleSpotifyConnect}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm font-medium flex items-center justify-center space-x-2 mx-auto"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615a.625.625 0 01-.862.225c-2.359-1.439-5.328-1.764-8.828-.961a.625.625 0 11-.312-1.211c3.828-.877 7.172-.496 9.777 1.086a.625.625 0 01.225.861zm1.23-2.738a.781.781 0 01-1.078.281c-2.703-1.652-6.824-2.133-10.02-1.168a.781.781 0 11-.468-1.492c3.656-1.105 8.203-.571 11.285 1.34a.781.781 0 01.281 1.039zm.106-2.85C14.692 8.953 9.348 8.734 6.344 9.668a.937.937 0 11-.562-1.789c3.439-1.07 9.398-.813 12.898 1.461a.937.937 0 11-.937 1.625z" />
          </svg>
          <span>Quick Connect Spotify</span>
        </button>
      </div>

      {/* Leaderboard Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-medium text-slate-700 mb-2">Challenge Leaderboard</h2>
            <p className="text-slate-500 text-sm">Top performers in your current challenge</p>
          </div>

          {leaderboardLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2">
                <div className="w-4 h-4 bg-slate-400 rounded-full animate-pulse"></div>
                <span className="text-slate-600 text-sm">Loading leaderboard...</span>
              </div>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                    }`}>
                      {entry.rank}
                    </div>
                    <span className="font-medium text-slate-700">{entry.username}</span>
                  </div>
                  <div className="text-slate-600 text-sm font-medium">
                    {formatHoursHM(entry.reduction)} hours reduced
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-slate-600 text-sm">No leaderboard data available. Join a challenge to see rankings!</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      {latestRecommendation && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-slate-700 mb-2">Current Recommendation</h2>
              <p className="text-slate-500 text-sm">Personalized suggestion based on your activity</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-6">
              <p className="text-slate-700 text-center text-lg mb-4">
                {(() => {
                  try {
                    const details = JSON.parse(latestRecommendation.details);
                    return details.message || details.name || 'No specific recommendation details available.';
                  } catch (e) {
                    console.warn('Failed to parse recommendation details:', e);
                    return latestRecommendation.details || 'No specific recommendation details available.';
                  }
                })()}
              </p>

              {!actionStatus && (
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => handleRecommendationAction(latestRecommendation.recommendationId, true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm font-medium flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRecommendationAction(latestRecommendation.recommendationId, false)}
                    className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 shadow-sm font-medium flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Decline</span>
                  </button>
                </div>
              )}

              {actionStatus && (
                <div className="text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    actionStatus === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      actionStatus === 'accepted' ? 'bg-green-500' : 'bg-slate-500'
                    }`}></div>
                    Recommendation {actionStatus === 'accepted' ? 'accepted' : 'declined'}!
                  </div>
                </div>
              )}
            </div>

            {/* Timer Section */}
            {(latestRecommendation.type === 'break' || latestRecommendation.type === 'activity') && actionStatus === 'accepted' && (
              <div className="text-center border-t border-slate-200 pt-6">
                {timer !== null ? (
                  <div className="space-y-4">
                    <div className="text-4xl font-mono text-slate-700 mb-4">{formatTime(timer)}</div>
                    <button 
                      onClick={resetTimer} 
                      className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 shadow-sm font-medium"
                    >
                      Reset Timer
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Music Player */}
            {latestRecommendation.type === 'music' && actionStatus === 'accepted' && (
              <div className="border-t border-slate-200 pt-6">
                <SpotifyPlayerComponent
                  latestRecommendation={latestRecommendation}
                  fetchRecommendations={fetchRecommendationsAutomatically}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Section */}
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium text-slate-700 mb-2">Analytics Dashboard</h2>
          <p className="text-slate-500">Monitor your digital wellness progress</p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Screen Time Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-700 mb-4">Daily Screen Time</h3>
            {filteredScreenTime.length > 0 ? (
              <Bar
                data={barChartData}
                options={{
                  responsive: true,
                  plugins: { 
                    legend: { display: false }, 
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw} minutes` } } 
                  },
                  scales: { 
                    x: { title: { display: true, text: 'Date' } }, 
                    y: { title: { display: true, text: 'Minutes' }, beginAtZero: true } 
                  },
                }}
              />
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

          {/* Tab Usage Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-700 mb-4">Today's Tab Usage</h3>
            {pieChartData.labels.length > 0 ? (
              <Pie data={pieChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <p className="text-slate-600 text-sm">No tab usage data available.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Dashboard;