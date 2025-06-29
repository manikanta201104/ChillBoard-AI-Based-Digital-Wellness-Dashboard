import React, { useState } from "react";
import { sendContactMessage } from "../utils/api";

const About = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [messageStatus, setMessageStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendContactMessage(formData);
      setMessageStatus('Message sent successfully');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setMessageStatus(''), 3000);
    } catch (error) {
      setMessageStatus('Failed to send message');
      setTimeout(() => setMessageStatus(''), 3000);
      console.error('Contact error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 p-6 sm:p-2 md:p-6">
      <h1 className="text-4xl font-bold text-blue-600 text-center mb-8 sm:text-3xl">About ChillBoard & Help</h1>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md space-y-6 sm:space-y-4 sm:flex-col sm:mx-auto">
        <section className="mb-6 sm:mb-4">
          <h2 className="text-2xl font-semibold text-blue-600 mb-2 sm:text-xl">Mission Statement</h2>
          <p className="text-gray-700 sm:text-sm">
            ChillBoard aims to combat digital fatigue with AI-driven wellness tools. Our mission is to help users achieve a balanced digital life by tracking screen time, detecting moods, and offering personalized recommendations, all while fostering a supportive community through challenges.
          </p>
        </section>
        <section className="mb-6 sm:mb-4">
          <h2 className="text-2xl font-semibold text-blue-600 mb-2 sm:text-xl">Guides</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 sm:text-sm">
            <li>Install the Chrome extension to track your screen time.</li>
            <li>Enable mood detection via the Settings page to personalize your experience.</li>
            <li>Join a challenge from the Challenges page to engage with the community.</li>
            <li>Explore your Profile page for trends and saved Spotify playlists.</li>
          </ol>
        </section>
        <section className="mb-6 sm:mb-4">
          <h2 className="text-2xl font-semibold text-blue-600 mb-2 sm:text-xl">Privacy Policy</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 sm:text-sm">
            <li>Webcam data is processed locally and never stored or shared.</li>
            <li>Screen time data is encrypted and accessible only to the user.</li>
            <li>Spotify data integration is user-controlled and can be unlinked at any time.</li>
            <li>We adhere to strict data minimization and user consent principles.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl font-semibold text-blue-600 mb-2 sm:text-xl">Contact Us</h2>
          <form onSubmit={handleSubmit} className="space-y-4 border border-blue-200 p-4 rounded-lg sm:mx-auto sm:w-full">
            <div>
              <label className="block text-gray-700 sm:text-sm">Name</label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm" 
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 sm:text-sm">Email</label>
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 sm:text-sm">Message</label>
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                rows="4"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:text-sm"
            >
              Submit
            </button>
          </form>
          {messageStatus && <p className="mt-4 text-center text-green-600 sm:text-sm">{messageStatus}</p>}
        </section>
      </div>
    </div>
  );
};

export default About;