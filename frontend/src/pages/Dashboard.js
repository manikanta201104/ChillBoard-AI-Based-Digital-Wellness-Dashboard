/*global chrome*/
import React, { useEffect, useState, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import * as faceapi from 'face-api.js';
import { getScreenTime, sendMood } from '../utils/api';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const MODEL_URL = '/models'; // Local models
const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights/'; // CDN fallback

const Dashboard = () => {
  const [screenTimeData, setScreenTimeData] = useState([]);
  const [error, setError] = useState('');
  const [extensionInstalled, setExtensionInstalled] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [detectedMood, setDetectedMood] = useState('Detecting mood...');
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [correctedMood, setCorrectedMood] = useState('');
  const [lastSavedMood, setLastSavedMood] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getScreenTime();
        setScreenTimeData(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch screen time data');
      }
    };

    fetchData();

    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage('extension_id_placeholder', { message: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setExtensionInstalled(false);
        }
      });
    } else {
      setExtensionInstalled(false);
    }

    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log('TinyFaceDetector loaded');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('FaceLandmark68Net loaded');
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log('FaceExpressionNet loaded');
        setModelsLoaded(true);
      } catch (err) {
        console.warn('Failed to load local models:', err);
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL);
          await faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL);
          await faceapi.nets.faceExpressionNet.loadFromUri(CDN_MODEL_URL);
          console.log('Face-API.js models loaded from CDN');
          setModelsLoaded(true);
        } catch (cdnErr) {
          console.error('Error loading models from CDN:', cdnErr);
          setError('Failed to load emotion detection models.');
        }
      }
    };

    loadModels();

    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    if (!modelsLoaded) {
      setError('Models are still loading, please wait...');
      return;
    }

    if (!videoRef.current) {
      console.error('Video element not found in DOM');
      setError('Video element not found. Please refresh the page.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      console.log('Webcam stream obtained:', stream);
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        videoRef.current.play().then(() => {
          console.log('Video playback started');
          setWebcamEnabled(true);
        }).catch(err => {
          console.error('Error playing video:', err);
          setError('Failed to play webcam video.');
          stopWebcam();
        });
      };
    } catch (err) {
      console.error('Error accessing webcam:', err);
      if (err.name === 'NotAllowedError') {
        setError('Webcam access denied. Please grant camera permission in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No webcam found. Please connect a webcam and try again.');
      } else {
        setError('Failed to access webcam: ' + err.message);
      }
      setWebcamEnabled(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      console.log('Webcam stream stopped');
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setWebcamEnabled(false);
    setDetectedMood('Detecting mood...');
    setDetectionAttempts(0);
    setCorrectedMood('');
    setLastSavedMood(null);
  };

  const handleMoodCorrection = async (e) => {
    const newMood = e.target.value;
    setCorrectedMood(newMood);

    if (!newMood) {
      console.log('No mood selected, skipping send.');
      return;
    }

    try {
      const moodToSend = { mood: newMood, confidence: 1.0 };
      console.log('Sending corrected mood:', moodToSend);
      await sendMood(moodToSend);
      console.log('Corrected mood sent:', moodToSend);
      setLastSavedMood(moodToSend);
      lastSentRef.current = Date.now();

      const triggerLink = {
        fromSource: 'mood',
        data: { mood: newMood, confidence: 1.0, timestamp: new Date().toISOString() },
      };
      console.log('TriggerLink:', triggerLink);

      setDetectedMood(`You seem ${newMood} (Confidence: 100%)`);
    } catch (err) {
      console.error('Error saving corrected mood:', err);
      setError('Failed to save corrected mood');
    }
  };

  useEffect(() => {
    if (webcamEnabled && videoRef.current) {
      console.log('Starting emotion detection');
      detectionIntervalRef.current = setInterval(async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
            .withFaceLandmarks()
            .withFaceExpressions();

          setDetectionAttempts(prev => prev + 1);

          if (detection && detection.expressions) {
            const expressions = detection.expressions;
            console.log('Detected expressions:', expressions);
            const moodMap = {
              happy: expressions.happy || 0,
              sad: expressions.sad || 0,
              angry: expressions.angry || 0,
              stressed: expressions.fearful || 0,
              calm: expressions.neutral || 0,
              neutral: expressions.neutral || 0,
              surprised: expressions.surprised || 0,
              disgusted: expressions.disgusted || 0
            };
            const emotions = Object.keys(moodMap).map(key => ({
              mood: key === 'surprised' ? 'happy' : key === 'disgusted' ? 'angry' : key,
              confidence: moodMap[key]
            }));
            const dominantEmotion = emotions.reduce((prev, current) =>
              prev.confidence > current.confidence ? prev : current
            );

            const moodText = correctedMood || dominantEmotion.mood;
            setDetectedMood(`You seem ${moodText} (Confidence: ${(dominantEmotion.confidence * 100).toFixed(2)}%)`);

            const now = Date.now();
            const moodToSend = { mood: moodText, confidence: dominantEmotion.confidence };

            console.log('Checking if mood should be sent...');
            console.log('Time since last send (ms):', now - lastSentRef.current);
            console.log('Last saved mood:', lastSavedMood);
            console.log('Current mood to send:', moodToSend);

            if (now - lastSentRef.current >= 10000 && JSON.stringify(moodToSend) !== JSON.stringify(lastSavedMood)) {
              try {
                console.log('Sending mood:', moodToSend);
                await sendMood(moodToSend);
                console.log('Mood sent:', moodToSend);
                setLastSavedMood(moodToSend);
                lastSentRef.current = now;

                const triggerLink = {
                  fromSource: 'mood',
                  data: { mood: moodToSend.mood, confidence: moodToSend.confidence, timestamp: new Date().toISOString() },
                };
                console.log('TriggerLink:', triggerLink);
              } catch (err) {
                console.error('Error sending mood:', err);
                setError('Failed to send mood data.');
                lastSentRef.current = now;
              }
            } else {
              console.log('Mood not sent: time threshold not met or mood unchanged');
            }

            setDetectionAttempts(0);
          } else {
            console.log('No face detected');
            setDetectedMood('No face detected. Please center your face in the frame.');

            if (detectionAttempts >= 10) {
              setDetectedMood('Still no face detected. Ensure good lighting and face the camera directly.');
            }
          }
        } catch (err) {
          console.error('Error during emotion detection:', err);
          setDetectedMood('Error detecting emotions');
        }
      }, 500);

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          console.log('Emotion detection stopped');
        }
      };
    }
  }, [webcamEnabled, detectionAttempts, correctedMood]);

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
          disabled={!modelsLoaded}
        >
          {webcamEnabled ? 'Disable Mood Detection' : 'Enable Mood Detection'}
        </button>
      </div>

      <div className="mb-8 flex justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          className={`rounded-lg shadow-md w-64 h-48 ${webcamEnabled ? 'block' : 'hidden'}`}
        />
      </div>

      {webcamEnabled && (
        <div className="mb-8 text-center bg-white p-4 rounded-lg shadow-md">
          <p className="text-xl font-semibold text-gray-800">{detectedMood}</p>
          {detectedMood && !detectedMood.includes('No face') && !detectedMood.includes('Error') && (
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
          )}
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