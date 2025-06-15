/*global chrome*/

import React, { useEffect, useState, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import * as faceapi from 'face-api.js';
import { getScreenTime, saveMood, getRecommendations } from '../utils/api';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const Dashboard = () => {
  const [screenTimeData, setScreenTimeData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [extensionInstalled, setExtensionInstalled] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [detectedMood, setDetectedMood] = useState('');
  const [lastSavedMood, setLastSavedMood] = useState(null);
  const [correctedMood, setCorrectedMood] = useState('');
  const [timer, setTimer] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastSentRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Fetch screen time data
    const fetchScreenTime = async () => {
      try {
        const data = await getScreenTime();
        setScreenTimeData(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch screen time data');
      }
    };

    // Fetch recommendations
    const fetchRecommendations = async () => {
      try {
        const data = await getRecommendations();
        setRecommendations(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch recommendations');
      }
    };

    fetchScreenTime();
    fetchRecommendations();

    // Check if extension is installed
    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage('extension_id_placeholder', { message: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setExtensionInstalled(false);
        }
      });
    } else {
      setExtensionInstalled(false);
    }

    // Load Face-API.js models
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        console.log('Face-API.js models loaded');
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load emotion detection models');
      }
    };

    loadModels();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setWebcamEnabled(true);

      // Start emotion detection
      videoRef.current.addEventListener('play', detectEmotions);
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Failed to access webcam. Please grant permission.');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamEnabled(false);
    setDetectedMood('');
    setCorrectedMood('');
    setLastSavedMood(null);
  };

  const detectEmotions = async () => {
    if (!videoRef.current) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (detection && detection.expressions) {
      const expressions = detection.expressions;
      const emotions = Object.keys(expressions).map(key => ({
        mood: key,
        confidence: expressions[key],
      }));
      const dominantEmotion = emotions.reduce((prev, current) =>
        prev.confidence > current.confidence ? prev : current
      );

      const moodText = correctedMood || dominantEmotion.mood;
      setDetectedMood(
        `You seem ${moodText} (Confidence: ${(dominantEmotion.confidence * 100).toFixed(2)}%)`
      );

      // Send mood to backend every 10 seconds
      const now = Date.now();
      const moodToSend = { mood: moodText, confidence: dominantEmotion.confidence };
      if (now - lastSentRef.current >= 10000 && JSON.stringify(moodToSend) !== JSON.stringify(lastSavedMood)) {
        try {
          await saveMood(moodToSend);
          console.log('Mood sent:', moodToSend);
          setLastSavedMood(moodToSend);
          lastSentRef.current = now;

          // Simulate TriggerLink
          const triggerLink = {
            fromSource: 'mood',
            data: { mood: moodToSend.mood, confidence: moodToSend.confidence },
          };
          console.log('TriggerLink:', triggerLink);
        } catch (err) {
          console.error('Error saving mood:', err);
          setError('Failed to save mood');
        }
      }
    } else {
      setDetectedMood('No face detected');
    }

    // Continue detection every 100ms
    if (webcamEnabled) {
      setTimeout(detectEmotions, 100);
    }
  };

  const handleMoodCorrection = async (e) => {
    const newMood = e.target.value;
    setCorrectedMood(newMood);

    // Send corrected mood to backend immediately
    try {
      const moodToSend = { mood: newMood, confidence: 1.0 }; // Confidence 1.0 for user-corrected moods
      await saveMood(moodToSend);
      console.log('Corrected mood sent:', moodToSend);
      setLastSavedMood(moodToSend);
      lastSentRef.current = Date.now();

      // Simulate TriggerLink
      const triggerLink = {
        fromSource: 'mood',
        data: { mood: newMood, confidence: 1.0 },
      };
      console.log('TriggerLink:', triggerLink);

      setDetectedMood(`You seem ${newMood} (Confidence: 100%)`);
    } catch (err) {
      console.error('Error saving corrected mood:', err);
      setError('Failed to save corrected mood');
    }
  };

  // Timer logic for break-type recommendations
  const startTimer = (duration) => {
    const minutes = parseInt(duration); // e.g., "5m" -> 5
    setTimer(minutes * 60); // Convert to seconds
    setTimerRunning(true);

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          clearInterval(timerRef.current);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimer(null);
    setTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Prepare data for charts (same as before)
  const barChartData = {
    labels: screenTimeData.map((entry) => new Date(entry.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Screen Time (minutes)',
        data: screenTimeData.map((entry) => Math.floor(entry.totalTime / 60)),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: [],
    datasets: [
      {
        label: 'Tab Usage (seconds)',
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const tabUsageMap = {};
  screenTimeData.forEach((entry) => {
    entry.tabs.forEach((tab) => {
      if (tabUsageMap[tab.url]) {
        tabUsageMap[tab.url] += tab.timeSpent;
      } else {
        tabUsageMap[tab.url] = tab.timeSpent;
      }
    });
  });

  pieChartData.labels = Object.keys(tabUsageMap);
  pieChartData.datasets[0].data = Object.values(tabUsageMap);

  const handleInstallReminder = () => {
    alert('Please install the ChillBoard Chrome extension to track your screen time!');
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  // Get the latest recommendation
  const latestRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-8">ChillBoard Dashboard</h1>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      {!extensionInstalled && (
        <div className="text-center mb-8">
          <p className="text-yellow-600 mb-2">ChillBoard extension not detected!</p>
          <button
            onClick={handleInstallReminder}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
          >
            Install Extension
          </button>
        </div>
      )}

      <div className="mb-8 text-center">
        <button
          onClick={webcamEnabled ? stopWebcam : startWebcam}
          className={`px-4 py-2 rounded transition ${
            webcamEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          {webcamEnabled ? 'Disable Mood Detection' : 'Enable Mood Detection'}
        </button>
      </div>

      {webcamEnabled && (
        <div className="mb-8 flex justify-center">
          <video ref={videoRef} autoPlay muted className="rounded-lg shadow-md w-64 h-48" />
        </div>
      )}

      {detectedMood && (
        <div className="mb-8 text-center">
          <p className="text-xl font-semibold">{detectedMood}</p>
          <div className="mt-4">
            <label className="text-gray-600">Not correct? Select another mood: </label>
            <select
              value={correctedMood}
              onChange={handleMoodCorrection}
              className="ml-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select mood</option>
              <option value="happy">Happy</option>
              <option value="sad">Sad</option>
              <option value="angry">Angry</option>
              <option value="stressed">Stressed</option>
              <option value="calm">Calm</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
      )}

      {latestRecommendation && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-center mb-4">Recommendation</h2>
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <p className="text-lg font-medium">{latestRecommendation.details}</p>
            {latestRecommendation.type === 'break' && (
              <div className="mt-4">
                {timer !== null ? (
                  <div>
                    <p className="text-xl font-semibold">{formatTime(timer)}</p>
                    <button
                      onClick={resetTimer}
                      className="mt-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                    >
                      Reset Timer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startTimer(latestRecommendation.details.match(/\d+/)[0])}
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Start Timer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Daily Screen Time</h2>
          {screenTimeData.length > 0 ? (
            <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          ) : (
            <p className="text-gray-500">No screen time data available.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Tab Usage</h2>
          {pieChartData.labels.length > 0 ? (
            <Pie data={pieChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          ) : (
            <p className="text-gray-500">No tab usage data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;