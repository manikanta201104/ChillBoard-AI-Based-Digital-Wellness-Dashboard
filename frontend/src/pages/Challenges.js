import React, { useEffect, useState } from 'react';
import { getChallenges, joinChallenge, getLeaderboard } from '../utils/api';

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState(new Set());
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = localStorage.getItem('userId');

  const fetchLeaderboard = async (challengeId) => {
    try {
      const data = await getLeaderboard(challengeId);
      setLeaderboard(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch leaderboard');
    }
  };

  useEffect(() => {
    const fetchChallenges = async () => {
      setLoading(true);
      try {
        const data = await getChallenges();
        setChallenges(data);

        // Check which challenges the user has joined
        const joined = data.filter(challenge =>
          challenge.participants.some(p => p.userId === userId)
        ).map(challenge => challenge.challengeId);
        const joinedSet = new Set(joined);
        setJoinedChallenges(joinedSet);

        if (joined.length > 0) {
          const latestJoined = joined[0]; // Use the most recently joined challenge
          setSelectedChallengeId(latestJoined);
          await fetchLeaderboard(latestJoined);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch challenges');
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [userId]);

  const handleJoinChallenge = async (challengeId) => {
    setLoading(true);
    try {
      const response = await joinChallenge(challengeId);
      const updatedJoined = new Set(joinedChallenges).add(challengeId);
      setJoinedChallenges(updatedJoined);
      setSelectedChallengeId(challengeId);
      await fetchLeaderboard(challengeId);
      setError('Successfully joined challenge!');
      // Store joined challenge in localStorage for persistence
      const joinedList = Array.from(updatedJoined);
      localStorage.setItem('joinedChallenges', JSON.stringify(joinedList));
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
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const payload = JSON.parse(jsonPayload);
      return payload.userId || payload.sub;
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  // Load joined challenges from localStorage on mount
  useEffect(() => {
    const storedJoined = localStorage.getItem('joinedChallenges');
    if (storedJoined) {
      setJoinedChallenges(new Set(JSON.parse(storedJoined)));
    }
    // Ensure userId is set if not already
    if (!userId) {
      getUserFromToken().then(id => {
        if (id) localStorage.setItem('userId', id);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-blue-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-center text-green-600 mb-8 sm:text-2xl">
        Digital Detox Challenges
      </h1>
      {loading && <p className="text-center text-gray-700">Loading...</p>}
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
                <p className="text-gray-700 mt-2 sm:text-sm">{challenge.description}</p>
                {isJoined ? (
                  <p className="mt-4 text-green-600 sm:text-sm">Joined - {reduction.toFixed(1)} hours reduced</p>
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
          {loading ? (
            <p className="text-center text-gray-700 sm:text-sm">Loading leaderboard...</p>
          ) : leaderboard.length > 0 ? (
            <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200">
              {leaderboard.map((entry, index) => (
                <p key={index} className={`text-gray-700 mb-2 ${index < 3 ? 'bg-green-50 p-2 rounded' : ''} sm:text-sm`}>
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