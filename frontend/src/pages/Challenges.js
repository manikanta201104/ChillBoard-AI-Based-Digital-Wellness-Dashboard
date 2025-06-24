import React from 'react';

const Challenges = () => {
  const challenges = [
    {
      id: 1,
      title: '7-Day Digital Detox',
      description: 'Reduce screen time by 1 hour daily for 7 days.',
    },
    {
      id: 2,
      title: '3-Day Screen Break',
      description: 'Limit screen time to 4 hours daily for 3 days.',
    },
  ];
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center text-green-700 mb-8">
        Digital Detox Challenges
      </h1>
      {challenges.length === 0
        ? <p className="text-center text-grey-600">
            No challenges availabale at the moment.
          </p>
        : <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {challenges.map (challenge => (
              <div
                key={challenge.id}
                className="bg-white p-4 rounded-lg shadow-md m-4"
              >
                <h2 className="text-xl font-semibold text-gray-800">
                  {challenge.title}
                </h2>
                <p className="text-gray-600 mt-2">{challenge.description}</p>
                <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  Join
                </button>
              </div>
            ))}
          </div>}
    </div>
  );
};

export default Challenges;
