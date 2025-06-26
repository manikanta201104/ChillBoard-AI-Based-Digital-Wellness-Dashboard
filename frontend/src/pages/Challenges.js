import React, { useEffect, useState } from 'react';
import { getChallenges, joinChallenge } from '../utils/api';

const Challenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [joinedChallenges, setJoinedChallenges] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const data = await getChallenges();
        setChallenges(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch challenges');
      }
    };
    fetchChallenges();
  }, []);

  const handleJoinChallenge = async challengeId => {
    try {
      await joinChallenge(challengeId);
      setJoinedChallenges(prev => new Set(prev).add(challengeId));
      setError('Successfully joined challenge!');
    } catch (err) {
      setError(err.message || 'Failed to join challenge');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center text-green-700 mb-8">
        Digital Detox Challenges
      </h1>
      {error && <p className="text-center text-red-500 mb-4">{error}</p>}
      {challenges.length === 0 ? (
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
                    className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Challenges;