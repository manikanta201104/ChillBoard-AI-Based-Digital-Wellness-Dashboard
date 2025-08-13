import React, { useEffect, useState } from 'react';
import { getChallenges, joinChallenge, getLeaderboard } from '../utils/api';

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState(new Set());
  const [leaderboards, setLeaderboards] = useState({});
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const userId = localStorage.getItem('userId');

  const fetchLeaderboard = async (challengeId, retries = 3) => {
    setLoading(true);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const data = await getLeaderboard(challengeId);
        setLeaderboards(prev => ({ ...prev, [challengeId]: data }));
        if (error) setError('');
        setLoading(false);
        return;
      } catch (err) {
        setError(`Failed to fetch leaderboard (Attempt ${attempt}/${retries}): ${err.message}`);
        if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    setLoading(false);
  };

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const data = await getChallenges();
      setChallenges(data);

      const joined = data.filter(challenge =>
        challenge.participants.some(p => p.userId === userId)
      ).map(challenge => challenge.challengeId);
      const joinedSet = new Set(joined);
      setJoinedChallenges(joinedSet);

      const durations = [...new Set(data.map(ch => ch.duration))].sort((a, b) => a - b);
      const initialDuration = durations.find(d => joinedSet.has(data.find(c => c.duration === d)?.challengeId)) || (durations.length > 0 ? durations[0] : null);
      setSelectedDuration(initialDuration);

      if (initialDuration) {
        const challengeId = data.find(c => c.duration === initialDuration && joinedSet.has(c.challengeId))?.challengeId || data.find(c => c.duration === initialDuration)?.challengeId;
        if (challengeId) await fetchLeaderboard(challengeId);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch challenges. Please ensure screen time data is being recorded.');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchChallenges();
    const pollChallenges = setInterval(fetchChallenges, 5 * 60 * 1000);

    return () => clearInterval(pollChallenges);
  }, [userId]);

  useEffect(() => {
    if (!selectedDuration || !userId) {
      setLeaderboards({});
      return;
    }

    const challengeId = challenges.find(c => c.duration === selectedDuration && joinedChallenges.has(c.challengeId))?.challengeId || challenges.find(c => c.duration === selectedDuration)?.challengeId;
    if (challengeId) {
      fetchLeaderboard(challengeId);
      const pollLeaderboard = setInterval(() => fetchLeaderboard(challengeId), 5 * 60 * 1000);
      return () => clearInterval(pollLeaderboard);
    }
  }, [selectedDuration, userId, challenges, joinedChallenges]);

  const handleJoinChallenge = async (challengeId) => {
    setLoading(true);
    try {
      const response = await joinChallenge(challengeId);
      const updatedJoined = new Set(joinedChallenges).add(challengeId);
      setJoinedChallenges(updatedJoined);
      const challenge = challenges.find(c => c.challengeId === challengeId);
      setSelectedDuration(challenge.duration);
      await fetchLeaderboard(challengeId);
      setError('Successfully joined challenge! Progress updates daily at midnight.');
      localStorage.setItem('joinedChallenges', JSON.stringify(Array.from(updatedJoined)));
      await fetchChallenges();
    } catch (err) {
      setError(err.message || 'Failed to join challenge');
    } finally {
      setLoading(false);
    }
  };

  const getUserFromToken = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) throw new Error('No JWT token found');
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const id = payload.userId || payload.sub;
      if (id) localStorage.setItem('userId', id);
      return id;
    } catch (err) {
      console.error('Error decoding token:', err);
      setError('Failed to decode JWT token. Please log in again.');
      return null;
    }
  };

  useEffect(() => {
    const storedJoined = localStorage.getItem('joinedChallenges');
    if (storedJoined) {
      setJoinedChallenges(new Set(JSON.parse(storedJoined)));
    }
    if (!userId) {
      getUserFromToken();
    }
  }, []);

  const getDurationLabel = (days) => {
    const labels = {
      7: '7 Days Challenge',
      200: '200 Days Challenge',
      365: '365 Days Challenge'
    };
    return labels[days] || `${days} Days Challenge`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-700 mb-4">Digital Detox Challenges</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Join challenges to reduce your screen time and compete with others for a healthier digital lifestyle
          </p>
        </div>

        {(loading && initialLoad) && (
          <div className="text-center py-12">
            <div className="inline-flex items-center space-x-2">
              <div className="w-4 h-4 bg-slate-400 rounded-full animate-pulse"></div>
              <span className="text-slate-600">Loading challenges...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className={`p-4 rounded-lg border ${
              error.includes('Successfully') 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {error.includes('Successfully') ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {challenges.length === 0 && !loading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">No Challenges Available</h3>
            <p className="text-slate-500">Check back later for new digital detox challenges</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {challenges.map(challenge => {
              const isJoined = joinedChallenges.has(challenge.challengeId);
              const reduction = challenge.participants.find(p => p.userId === userId)?.reduction / 3600 || 0;
              
              return (
                <div
                  key={challenge.challengeId}
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
                    isJoined ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-xl font-semibold text-slate-700">
                        {challenge.title}
                      </h2>
                      {isJoined && (
                        <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full">
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-700 font-medium">Joined</span>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                      {challenge.description || 'Take on this digital detox challenge to improve your screen time habits'}
                    </p>

                    {isJoined ? (
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Hours Reduced:</span>
                            <span className="text-lg font-semibold text-green-600">
                              {reduction.toFixed(1)}h
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          Progress updates daily at midnight
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(challenge.challengeId)}
                        className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
                        disabled={loading || isJoined}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Joining...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Join Challenge</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Challenge Duration Buttons */}
        {challenges.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[...new Set(challenges.map(c => c.duration))].sort((a, b) => a - b).map(duration => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDuration === duration
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {getDurationLabel(duration)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Sections */}
        {selectedDuration && challenges.filter(c => c.duration === selectedDuration).map(challenge => (
          <div key={challenge.challengeId} className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-700">{getDurationLabel(challenge.duration)} Leaderboard</h2>
                  <p className="text-slate-500 text-sm mt-1">Top performers in screen time reduction</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-600 font-medium">Live Rankings</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading && !leaderboards[challenge.challengeId]?.length ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2">
                    <div className="w-4 h-4 bg-slate-400 rounded-full animate-pulse"></div>
                    <span className="text-slate-600">Loading leaderboard...</span>
                  </div>
                </div>
              ) : leaderboards[challenge.challengeId]?.length > 0 ? (
                <div className="space-y-3">
                  {leaderboards[challenge.challengeId].map((entry, index) => {
                    const isTopThree = index < 3;
                    const medals = ['🥇', '🥈', '🥉'];
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                          isTopThree 
                            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                            : 'bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            isTopThree 
                              ? 'bg-white text-yellow-600 border-2 border-yellow-300' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isTopThree ? medals[index] : entry.rank}
                          </div>
                          <span className={`font-medium ${isTopThree ? 'text-slate-800' : 'text-slate-700'}`}>
                            {entry.username}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-semibold ${isTopThree ? 'text-slate-800' : 'text-slate-700'}`}>
                            {entry.reduction.toFixed(1)} hours
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No Rankings Yet</h3>
                  <p className="text-slate-500">Leaderboard will populate as participants make progress</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Challenges;