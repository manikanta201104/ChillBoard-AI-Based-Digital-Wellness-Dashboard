import React, { useEffect, useState } from "react";
import { getUserSettings, patchUserSettings, getUser } from "../utils/api";
import { requestNotificationPermission, scheduleNotifications } from "../utils/notifications";
import usePermission from "../hooks/usePermission";

const Settings = () => {
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [notificationFrequency, setNotificationFrequency] = useState('Off');
  const [showNameOnLeaderboard, setShowNameOnLeaderboard] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');

  // Permissions
  const cameraPerm = usePermission('camera');
  const notifPerm = usePermission('notifications');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch minimal profile to ensure session, then specific user preferences
        await getUser();
        const prefs = await getUserSettings();
        setWebcamEnabled(!!prefs.webcamEnabled);
        setNotificationFrequency(prefs.notifyEvery || 'Off');
        setShowNameOnLeaderboard(prefs.showOnLeaderboard !== false);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setMessage('Failed to load settings');
        setTimeout(() => setMessage(''), 3000);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchSettings();

    // Proactively request notification permission in background (non-blocking)
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // Schedule notifications whenever notificationFrequency changes
    scheduleNotifications(notificationFrequency);
  }, [notificationFrequency]);

  // Persist settings helper with optimistic UI
  const persistSettings = async (nextPrefs) => {
    try {
      await patchUserSettings(nextPrefs);
    } catch (e) {
      console.error('Persist error:', e);
      setMessage('Failed to save settings');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await patchUserSettings({
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
    } finally {
      setLoading(false);
    }
  };

  // Handle webcam toggle: request permission if enabling
  const onToggleWebcam = async () => {
    const next = !webcamEnabled;
    setWebcamEnabled(next);
    if (next) {
      setCameraError('');
      const granted = await cameraPerm.request();
      if (!granted && cameraPerm.state !== 'granted') {
        setWebcamEnabled(false);
        setCameraError('Camera access denied — enable it in your browser settings');
        return;
      }
    }
    persistSettings({
  webcamEnabled: next,
  notifyEvery: notificationFrequency,
  showOnLeaderboard: showNameOnLeaderboard,
});

  };

  // Handle notification frequency change
  const onChangeFrequency = async (value) => {
    setNotificationFrequency(value);
    if (value !== 'Off') {
      await requestNotificationPermission();
    }
    persistSettings({
  webcamEnabled,
  notifyEvery: value,
  showOnLeaderboard: showNameOnLeaderboard,
});

  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-700 mb-4">Settings</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Customize your digital wellness experience and preferences
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-8 space-y-8">
            {initialLoading && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">Loading settings…</div>
            )}

            {/* Webcam Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-700">Webcam Settings</h2>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <label className="flex items-start space-x-4 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={webcamEnabled}
                      onChange={onToggleWebcam}
                      className="sr-only"
                    />

                    <div className={`w-6 h-6 rounded-md border-2 transition-all duration-200 ${
                      webcamEnabled
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}>
                      {webcamEnabled && (
                        <svg className="w-4 h-4 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Enable Webcam for Mood Detection</span>
                    <p className="text-sm text-slate-500 mt-1">
                      Allow the app to access your camera for emotion-based insights and recommendations
                    </p>
                    {/* Camera permission state */}
                    {cameraPerm.state === 'denied' && (
                      <p className="text-sm text-red-600 mt-2">Camera access denied — enable it in your browser settings</p>
                    )}
                    {cameraError && (
                      <p className="text-sm text-red-600 mt-2">{cameraError}</p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5-5 5-5h-5V7a1 1 0 00-1-1H9a1 1 0 00-1 1v5h5l-5 5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-700">Notification Settings</h2>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <label className="block">
                  <span className="font-medium text-slate-700 mb-2 block">Reminder Frequency</span>
                  <select
                    value={notificationFrequency}
                    onChange={(e) => onChangeFrequency(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white text-slate-700 transition-colors duration-200"
                  >
                    <option value="Off">Off</option>
                    <option value="Every 2 hours">Every 2 hours</option>
                    <option value="Every 4 hours">Every 4 hours</option>
                  </select>
                  <p className="text-sm text-slate-500 mt-2">
                    Get gentle reminders to take breaks from your screen
                  </p>
                  {/* Notification permission hint */}
                  {notificationFrequency !== 'Off' && notifPerm.state === 'denied' && (
                    <p className="text-sm text-red-600 mt-2">Notifications blocked by browser — enable in site settings</p>
                  )}
                </label>
              </div>
            </div>

            {/* Challenge Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-700">Challenge Settings</h2>
              </div>

              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <label className="flex items-start space-x-4 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={showNameOnLeaderboard}
                      onChange={() => setShowNameOnLeaderboard(!showNameOnLeaderboard)}
                      className="sr-only"
                    />

                    <div className={`w-6 h-6 rounded-md border-2 transition-all duration-200 ${
                      showNameOnLeaderboard
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}>
                      {showNameOnLeaderboard && (
                        <svg className="w-4 h-4 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Show My Name on Leaderboard</span>
                    <p className="text-sm text-slate-500 mt-1">
                      {showNameOnLeaderboard
                        ? "Your name will be visible in challenge rankings"
                        : "Switch off for anonymous participation in challenges"
                      }
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-6 py-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg border ${
                message.includes('successfully')
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {message.includes('successfully') ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;