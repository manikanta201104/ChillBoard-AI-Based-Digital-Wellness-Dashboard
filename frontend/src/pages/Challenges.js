import React, { useEffect, useState } from 'react';
import { getChallenges, joinChallenge, getLeaderboard } from '../utils/api';

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState(new Set());
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

        const joined = data.find(challenge => 
          challenge.participants.some(p => p.userId === localStorage.getItem('userId'))
        );
        if (joined) {
          setSelectedChallengeId(joined.challengeId);
          await fetchLeaderboard(joined.challengeId);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch challenges');
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  const handleJoinChallenge = async (challengeId) => {
    setLoading(true);
    try {
      const response = await joinChallenge(challengeId);
      // Store userId from response or JWT if not already set
      const userId = localStorage.getItem('userId') || response.userId || (await getUserFromToken());
      if (userId) {
        localStorage.setItem('userId', userId);
      } else {
        throw new Error('Unable to determine userId');
      }
      setJoinedChallenges(prev => new Set(prev).add(challengeId));
      setSelectedChallengeId(challengeId);
      await fetchLeaderboard(challengeId);
      setError('Successfully joined challenge!');
    } catch (err) {
      setError(err.message || 'Failed to join challenge');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract userId from JWT token
  const getUserFromToken = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) throw new Error('No JWT token found');
      // Assuming the token is a JWT, decode it to get userId (simplified)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const payload = JSON.parse(jsonPayload);
      return payload.userId || payload.sub; // Adjust based on your JWT structure
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center text-green-700 mb-8">
        Digital Detox Challenges
      </h1>
      {loading && <p className="text-center text-gray-600">Loading...</p>}
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}
      {challenges.length === 0 && !loading ? (
        <p className="text-center text-gray-600">No challenges available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {challenges.map(challenge => {
            const isJoined = joinedChallenges.has(challenge.challengeId);
            return (
              <div
                key={challenge.challengeId}
                className="bg-white p-4 rounded-lg shadow-md m-4"
              >
                <h2 className="text-xl font-semibold text-gray-800">
                  {challenge.title}
                </h2>
                <p className="text-gray-600 mt-2">{challenge.description}</p>
                {isJoined ? (
                  <p className="mt-4 text-green-600">Joined - 0 hours reduced</p>
                ) : (
                  <button
                    onClick={() => handleJoinChallenge(challenge.challengeId)}
                    className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                    disabled={loading}
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
          <h2 className="text-2xl font-bold text-center text-green-700 mb-4">
            Leaderboard
          </h2>
          {loading ? (
            <p className="text-center text-gray-600">Loading leaderboard...</p>
          ) : leaderboard.length > 0 ? (
            <div className="bg-white p-4 rounded-lg shadow-md">
              {leaderboard.map((entry, index) => (
                <p key={index} className="text-gray-800 mb-2">
                  #{entry.rank} {entry.username}: {entry.reduction.toFixed(1)} hours
                </p>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">No leaderboard data available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Challenges;