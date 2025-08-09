import React, { useEffect, useState } from "react";
import { getUser, saveSettings } from "../utils/api";
import { requestNotificationPermission, scheduleNotifications } from "../utils/notifications";

const Settings = () => {
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [notificationFrequency, setNotificationFrequency] = useState('Off');
  const [showNameOnLeaderboard, setShowNameOnLeaderboard] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const user = await getUser();
        const prefs = user.preferences || {};
        setWebcamEnabled(prefs.webcamEnabled || false);
        setNotificationFrequency(prefs.notifyEvery || 'Off');
        setShowNameOnLeaderboard(prefs.showOnLeaderboard !== false); // Default to true
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setMessage('Failed to load settings');
        setTimeout(() => setMessage(''), 3000);
      }
    };
    fetchSettings();

    // Request notification permission on component mount
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Schedule notifications whenever notificationFrequency changes
    scheduleNotifications(notificationFrequency);
  }, [notificationFrequency]);

  const handleSave = async () => {
    try {
      await saveSettings({
        webcamEnabled,
        notifyEvery: notificationFrequency,
        showOnLeaderboard: showNameOnLeaderboard,
      });
      setMessage('Settings saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings');
      setTimeout(() => setMessage(''), 3000);
      console.error('Save error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 p-4 md:p-6">
      <h1 className="text-4xl font-bold text-blue-600 text-center mb-8 sm:text-3xl">Settings</h1>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-2 sm:text-lg">Webcam Settings</h2>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={webcamEnabled}
              onChange={() => setWebcamEnabled(!webcamEnabled)}
              className={`w-5 h-5 ${webcamEnabled ? 'bg-green-500' : 'bg-gray-300'} focus:ring-green-500 rounded`}
            />
            <span className="text-gray-700 sm:text-sm">Enable Webcam for Mood Detection</span>
          </label>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-2 sm:text-lg">Notification Settings</h2>
          <select
            value={notificationFrequency}
            onChange={(e) => setNotificationFrequency(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          >
            <option value="Off">Off</option>
            <option value="Every 2 hours">Every 2 hours</option>
            <option value="Every 4 hours">Every 4 hours</option>
          </select>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-600 mb-2 sm:text-lg">Challenge Settings</h2>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={showNameOnLeaderboard}
              onChange={() => setShowNameOnLeaderboard(!showNameOnLeaderboard)}
              className={`w-5 h-5 ${showNameOnLeaderboard ? 'bg-green-500' : 'bg-gray-300'} focus:ring-green-500 rounded`}
            />
            <span className="text-gray-700 sm:text-sm">Show My Name on Leaderboard</span>
          </label>
          {showNameOnLeaderboard && <p className="text-sm text-gray-500 mt-1 sm:text-xs">Switch off for anonymous participation.</p>}
        </div>
        <button
          onClick={handleSave}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:text-sm"
        >
          Save
        </button>
        {message && <p className="mt-4 text-center text-green-600 sm:text-sm">{message}</p>}
      </div>
    </div>
  );
};

export default Settings;