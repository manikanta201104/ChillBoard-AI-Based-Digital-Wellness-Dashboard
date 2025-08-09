import React, { useEffect, useState } from 'react';
import { getChallenges, joinChallenge, getLeaderboard } from '../utils/api';

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState(new Set());
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const userId = localStorage.getItem('userId');

  const fetchLeaderboard = async (challengeId, retries = 3) => {
    setLoading(true);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const data = await getLeaderboard(challengeId);
        setLeaderboard(data);
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

      const storedChallengeId = localStorage.getItem('selectedChallengeId');
      const latestJoined = storedChallengeId && joinedSet.has(storedChallengeId)
        ? storedChallengeId
        : joined.length > 0
        ? joined[0]
        : null;
      setSelectedChallengeId(latestJoined);
      if (latestJoined) {
        await fetchLeaderboard(latestJoined);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch challenges. Please ensure screen time data is being recorded.');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Poll challenges every 5 minutes
  useEffect(() => {
    if (!userId) return;

    fetchChallenges(); // Initial fetch
    const pollChallenges = setInterval(fetchChallenges, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(pollChallenges);
  }, [userId]);

  // Poll leaderboard every 5 minutes when a challenge is selected
  useEffect(() => {
    if (!selectedChallengeId || !userId) {
      setLeaderboard([]);
      localStorage.removeItem('selectedChallengeId');
      return;
    }

    fetchLeaderboard(selectedChallengeId); // Initial fetch
    const pollLeaderboard = setInterval(() => {
      fetchLeaderboard(selectedChallengeId);
    }, 5 * 60 * 1000); // 5 minutes

    localStorage.setItem('selectedChallengeId', selectedChallengeId);
    return () => clearInterval(pollLeaderboard);
  }, [selectedChallengeId, userId]);

  const handleJoinChallenge = async (challengeId) => {
    setLoading(true);
    try {
      const response = await joinChallenge(challengeId);
      const updatedJoined = new Set(joinedChallenges).add(challengeId);
      setJoinedChallenges(updatedJoined);
      setSelectedChallengeId(challengeId);
      await fetchLeaderboard(challengeId);
      setError('Successfully joined challenge! Progress updates daily at midnight.');
      localStorage.setItem('joinedChallenges', JSON.stringify(Array.from(updatedJoined)));
      await fetchChallenges(); // Refresh challenges to show initial reduction
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

  return (
    <div className="min-h-screen bg-blue-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-center text-green-600 mb-8 sm:text-2xl">
        Digital Detox Challenges
      </h1>
      {(loading && initialLoad) && <p className="text-center text-gray-700">Loading...</p>}
      {error && <p className="text-center text-red-500 mb-4 sm:text-sm">{error}</p>}
      {challenges.length === 0 && !loading ? (
        <p className="text-center text-gray-700 sm:text-sm">No challenges available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {challenges.map(challenge => {
            const isJoined = joinedChallenges.has(challenge.challengeId);
            const reduction = challenge.participants.find(p => p.userId === userId)?.reduction / 3600 || 0;
            return (
              <div
                key={challenge.challengeId}
                className="bg-white p-4 rounded-lg shadow-md m-4"
              >
                <h2 className="text-xl font-semibold text-green-600 sm:text-lg">
                  {challenge.title}
                </h2>
                <p className="text-gray-700 mt-2 sm:text-sm">{challenge.description || 'No description available'}</p>
                {isJoined ? (
                  <p className="mt-4 text-green-600 sm:text-sm">
                    Joined - {reduction.toFixed(1)} hours reduced (updates daily at midnight)
                  </p>
                ) : (
                  <button
                    onClick={() => handleJoinChallenge(challenge.challengeId)}
                    className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 sm:text-sm"
                    disabled={loading || isJoined}
                  >
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedChallengeId && (
        <div className="mt-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-green-600 mb-4 sm:text-xl">
            Leaderboard
          </h2>
          {loading && !leaderboard.length ? (
            <p className="text-center text-gray-700 sm:text-sm">Loading leaderboard...</p>
          ) : leaderboard.length > 0 ? (
            <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200">
              {leaderboard.map((entry, index) => (
                <p
                  key={index}
                  className={`text-gray-700 mb-2 ${index < 3 ? 'bg-green-50 p-2 rounded' : ''} sm:text-sm`}
                >
                  #{entry.rank} {entry.username}: {entry.reduction.toFixed(1)} hours
                </p>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-700 sm:text-sm">No leaderboard data available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Challenges;