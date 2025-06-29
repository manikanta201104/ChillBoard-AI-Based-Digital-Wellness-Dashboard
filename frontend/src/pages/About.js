import React from "react";

const About=()=>{
    return(
        <div className="min-h-screen bg-white p-6">
            <h1 className="text-4xl font-bold text-blue-800 text-center mb-8">About ChillBoard & Help</h1>
            <div className="max-w-3xl mx-auto bg-gray-50 p-6 rounded-lg shadow-md">
                <section className="mb-6">
                    <h2 className="text-2xl font-semibold tedxt-blue-800 mb-2">
                        Mission Statement
                    </h2>
                    <p className="text-gray-700">
                        ChillBoard aims to combat digital fatigue with AI-driven wellness tools. Our mission is to help users achieve a balanced digital life by tracking screen time, detecting moods, and offering personalized recommendations , all while fostering a supportive community through challenges.
                    </p>
                </section>
                <section className="mb-6">
                    <h2 className="text-2xl font-semibold text-blue-800 mb-2">Guides</h2>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                        <li>Install the Chrome extension to track your screen time.</li>
                        <li>Enable mood detection via the Settings page to personalize your experience.</li>
                        <li>Join a challenge from the Challenges page to engage with the community.</li>
                        <li>Explore your Profie page for trends and saved Spotify playlists.</li>
                    </ol>
                </section>
                <section>
                    <h2 className="text-2xl font-semibold text-blue-800 mb-2">Privacy Policy</h2>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                        <li>Webcam data is processed locally and never stored or shared.</li>
                        <li>Screen time data is encrypted and accessible only to the user.</li>
                        <li>Spotify data integration is user-controlled and can be unlinked at any time.</li>
                        <li>We adhere to strict data minimixation and user consent principles.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default About;