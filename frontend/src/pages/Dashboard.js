/*global chrome */

import React, { useEffect, useState, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import * as faceapi from 'face-api.js';
import { getScreenTime, saveMood, getRecommendations, updateRecommendation, initiateSpotifyLogin, getUser, savePlaylist, fetchNewPlaylist, getLatestMood, getLeaderboard, getChallenges } from '../utils/api';
import SpotifyPlayer from 'react-spotify-web-playback';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const MODEL_URL = '/models';
const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights/';

const Dashboard = () => {
  const [screenTimeData, setScreenTimeData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [extensionInstalled, setExtensionInstalled] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [detectedMood, setDetectedMood] = useState('Detecting mood...');
  const [lastSavedMood, setLastSavedMood] = useState(null);
  const [correctedMood, setCorrectedMood] = useState('');
  const [timer, setTimer] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);
  const [spotifyToken, setSpotifyToken] = useState('');
  const [currentPlaylist, setCurrentPlaylist] = useState({ id: '', name: '' });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastSentRef = useRef({ timestamp: 0, mood: null, confidence: 0 });
  const timerRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  const detectEmotions = async () => {
    if (!videoRef.current || !webcamEnabled || !modelsLoaded) {
      console.warn('Emotion detection aborted:', {
        videoReady: !!videoRef.current,
        webcamEnabled,
        modelsLoaded,
      });
      setDetectedMood('Emotion detection not ready. Check webcam and model loading.');
      return;
    }

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
          disgusted: expressions.disgusted || 0,
        };
        const emotions = Object.keys(moodMap).map(key => ({
          mood: key === 'surprised' ? 'happy' : key === 'disgusted' ? 'angry' : key,
          confidence: moodMap[key],
        }));
        const dominantEmotion = emotions.reduce((prev, current) =>
          prev.confidence > current.confidence ? prev : current,
          { mood: 'unknown', confidence: 0 }
        );

        const moodText = correctedMood || dominantEmotion.mood;
        const confidence = dominantEmotion.confidence;
        const now = Date.now();
        const timeSinceLast = (now - lastSentRef.current.timestamp) / 1000;
        const confidenceDrop = lastSentRef.current.confidence ? Math.abs(confidence - lastSentRef.current.confidence) : 0;

        if (confidence > 0.2) {
          setDetectedMood(`You seem ${moodText} (Confidence: ${(confidence * 100).toFixed(2)}%)`);
        } else {
          setDetectedMood('Low confidence in emotion detection');
        }

        if ((confidenceDrop > 0.2 || (timeSinceLast >= 30 && moodText !== lastSentRef.current.mood)) && now - lastSentRef.current.timestamp >= 5000) {
          const moodToSend = { mood: moodText, confidence };
          try {
            console.log('Sending mood:', moodToSend);
            await saveMood(moodToSend);
            console.log('Mood sent:', moodToSend);
            setLastSavedMood(moodToSend);
            lastSentRef.current = { timestamp: now, mood: moodText, confidence };
          } catch (err) {
            console.error('Error sending mood to backend:', err);
            setError('Failed to send mood data to backend.');
          }
        } else {
          console.log('Mood not sent: confidence drop < 20% or < 30s persistence or < 5s since last');
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
  };

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const challenges = await getChallenges();
      const joined = challenges.find(challenge => 
        challenge.participants.some(p => p.userId === localStorage.getItem('userId'))
      );
      if (joined) {
        const data = await getLeaderboard(joined.challengeId);
        setLeaderboard(data.slice(0, 3));
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch leaderboard');
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    const fetchScreenTime = async () => {
      try {
        const data = await getScreenTime();
        const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setScreenTimeData(sortedData);
      } catch (err) {
        setError(err.message || 'Failed to fetch screen time data');
      }
    };

    const fetchRecommendations = async () => {
      try {
        const data = await getRecommendations();
        setRecommendations(data);
        const latestRec = data.length > 0 ? data[0] : null;
        if (latestRec && latestRec.type === 'music') {
          const details = JSON.parse(latestRec.details);
          setCurrentPlaylist({ id: details.playlistId, name: details.name });
        } else {
          setCurrentPlaylist({ id: '', name: '' });
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch recommendations');
      }
    };

    const fetchUserData = async () => {
      try {
        const userData = await getUser();
        setSpotifyToken(userData.spotifyToken.accessToken || '');
      } catch (err) {
        setError(err.message || 'Failed to fetch user data');
        setSpotifyToken('');
        handleSpotifyConnect(); // Attempt re-authentication
      }
    };

    fetchScreenTime();
    fetchRecommendations();
    fetchUserData();
    fetchLeaderboard();

    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage('cohlihkpndpeoklcbgcgaobmoojpdhpg', { message: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) setExtensionInstalled(false);
      });
    } else {
      setExtensionInstalled(false);
    }

    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [localStorage.getItem('userId')]);

  useEffect(() => {
    if (webcamEnabled && modelsLoaded && videoRef.current) {
      console.log('Starting webcam');
      startWebcam();
    } else if (webcamEnabled && !modelsLoaded) {
      setError('Emotion detection models are still loading. Please wait...');
    }

    return () => {
      if (webcamEnabled) {
        console.log('Stopping webcam due to effect cleanup');
        stopWebcam();
      }
    };
  }, [webcamEnabled, modelsLoaded]);

  useEffect(() => {
    if (webcamEnabled && modelsLoaded && videoRef.current) {
      console.log('Starting emotion detection');
      detectionIntervalRef.current = setInterval(detectEmotions, 5000); // 5-second interval

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          console.log('Emotion detection stopped');
        }
      };
    }
  }, [webcamEnabled, modelsLoaded, correctedMood]);

  const startWebcam = async () => {
    if (!modelsLoaded) {
      setError('Models are still loading, please wait...');
      return;
    }

    if (!videoRef.current) {
      console.error('Video element not found in DOM');
      setError('Video element not found. Please refresh the page.');
      setWebcamEnabled(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      console.log('Webcam stream obtained:', stream);
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        videoRef.current.play().then(() => {
          console.log('Video playback started');
          setError('');
        }).catch(err => {
          console.error('Error playing video:', err);
          setError('Failed to play webcam video.');
          stopWebcam();
        });
      };
    } catch (err) {
      console.error('Error accessing webcam:', err);
      const errorMsg =
        err.name === 'NotAllowedError'
          ? 'Webcam access denied. Please grant camera permission in browser settings.'
          : err.name === 'NotFoundError'
          ? 'No webcam found. Please connect a webcam and try again.'
          : `Failed to access webcam: ${err.message}`;
      setError(errorMsg);
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
      await saveMood(moodToSend);
      console.log('Corrected mood sent:', moodToSend);
      setLastSavedMood(moodToSend);
      lastSentRef.current = { timestamp: Date.now(), mood: newMood, confidence: 1.0 };
      setDetectedMood(`You seem ${newMood} (Confidence: 100%)`);
    } catch (err) {
      console.error('Error saving corrected mood:', err);
      setError('Failed to save corrected mood');
    }
  };

  const startTimer = (duration) => {
    const minutes = parseInt(duration);
    setTimer(minutes * 60);
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimer(prev => prev <= 0 ? (clearInterval(timerRef.current), setTimerRunning(false), 0) : prev - 1), 1000);
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(null);
    setTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleRecommendationAction = async (recommendationId, accepted) => {
    try {
      await updateRecommendation(recommendationId, accepted);
      setActionStatus(accepted ? 'accepted' : 'declined');
      const updatedRecommendations = await getRecommendations();
      setRecommendations(updatedRecommendations);
    } catch (err) {
      setError('Failed to update recommendation');
    }
  };

  const handleSpotifyConnect = async () => {
    try {
      const authorizeURL = await initiateSpotifyLogin();
      window.location.href = authorizeURL;
    } catch (err) {
      setError('Failed to initiate Spotify login');
    }
  };

  const handleSavePlaylist = async () => {
    if (!currentPlaylist.id) return;
    try {
      await savePlaylist(currentPlaylist.id, { saved: true });
      setError('Playlist saved successfully!');
    } catch (err) {
      setError('Failed to save playlist');
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleSkipPlaylist = async () => {
    let mood = correctedMood || (detectedMood && detectedMood.split(' ')[2]?.toLowerCase());
    if (!mood) {
      try {
        const latestMood = await getLatestMood();
        if (latestMood && latestMood.mood) {
          mood = latestMood.mood;
          setError(`Using latest mood from collection: ${mood} to fetch a new playlist.`);
        } else {
          setError('No mood found in collection. Please enable mood detection or correct the mood.');
          return;
        }
      } catch (err) {
        setError(`Failed to fetch latest mood: ${err.message}. Falling back to local mood.`);
        if (lastSavedMood) {
          mood = lastSavedMood.mood;
          setError(`Using last saved mood: ${mood} to fetch a new playlist.`);
        }
      }
    }
    if (!mood) {
      setError('No mood detected or available to fetch a new playlist. Please enable mood detection or correct the mood.');
      return;
    }
    try {
      const newPlaylist = await fetchNewPlaylist(mood, true);
      console.log('New playlist fetched:', newPlaylist);
      setCurrentPlaylist({ id: newPlaylist.spotifyPlaylistId, name: newPlaylist.name });
      console.log('Current playlist updated to:', { id: newPlaylist.spotifyPlaylistId, name: newPlaylist.name });
      setError('New playlist loaded!');
      setIsPlaying(false);
    } catch (err) {
      setError(`Failed to fetch new playlist: ${err.message}. Attempting re-authentication...`);
      await handleSpotifyConnect(); // Trigger re-auth if fetch fails
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const barChartData = {
    labels: screenTimeData.map(entry => new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Screen Time (minutes)',
      data: screenTimeData.map(entry => Math.floor(entry.totalTime / 60)),
      backgroundColor: 'rgba(34, 197, 94, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  };

  const tabUsageMap = {};
  screenTimeData
    .filter(entry => new Date(entry.date).toISOString().split('T')[0] === today)
    .forEach(entry => 
      entry.tabs.forEach(tab => 
        tabUsageMap[tab.url] = (tabUsageMap[tab.url] || 0) + tab.timeSpent
      )
    );

  const pieChartData = {
    labels: Object.keys(tabUsageMap),
    datasets: [{
      label: 'Tab Usage (seconds)',
      data: Object.values(tabUsageMap),
      backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)'],
      borderColor: ['rgba(34, 197, 94, 1)', 'rgba(59, 130, 246, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'],
      borderWidth: 1,
    }],
  };

  const handleInstallReminder = () => {
    alert('Please install the ChillBoard Chrome extension to track your screen time!');
    window.open('https://chrome.com/webstore', '_blank');
  };

  const latestRecommendation = recommendations.length > 0 ? recommendations[0] : null;

  return (
    <div className="min-h-screen bg-green-50 p-4 md:p-6">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-700 sm:text-2xl">ChillBoard Dashboard</h1>
      {error && <p className="text-red-500 text-center mb-4 sm:text-sm">{error}</p>}
      {!extensionInstalled && (
        <div className="text-center mb-8">
          <p className="text-yellow-600 mb-2 sm:text-sm">ChillBoard extension not detected!</p>
          <button onClick={handleInstallReminder} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 sm:text-sm">Install Extension</button>
        </div>
      )}
      <div className="mb-8 text-center">
        <button onClick={webcamEnabled ? stopWebcam : () => setWebcamEnabled(true)} className={`px-4 py-2 rounded ${webcamEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`} disabled={!modelsLoaded}>{webcamEnabled ? 'Disable Mood Detection' : 'Enable Mood Detection'}</button>
      </div>
      <div className="mb-8 text-center">
        <button onClick={handleSpotifyConnect} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:text-sm">Connect Spotify</button>
      </div>
      {leaderboardLoading ? (
        <div className="mb-8 text-center bg-white p-4 rounded-lg shadow-md max-w-2xl mx-auto border border-blue-200">
          <p className="text-gray-700 sm:text-sm">Loading leaderboard...</p>
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="mb-8 text-center bg-white p-4 rounded-lg shadow-md max-w-2xl mx-auto border border-blue-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-2 sm:text-lg">Top 3 Leaders</h2>
          {leaderboard.map((entry, index) => (
            <p key={index} className="text-gray-700 mb-1 sm:text-sm">
              #{entry.rank} {entry.username}: {entry.reduction.toFixed(1)} hours
            </p>
          ))}
        </div>
      ) : (
        <div className="mb-8 text-center bg-white p-4 rounded-lg shadow-md max-w-2xl mx-auto border border-blue-200">
          <p className="text-gray-700 sm:text-sm">No leaderboard data available. Join a challenge to see rankings!</p>
        </div>
      )}
      <div className="mb-8 flex justify-center sm:w-full">
        <video ref={videoRef} autoPlay muted className={`rounded-lg shadow-md w-64 h-48 ${webcamEnabled ? 'block' : 'hidden'} border border-blue-200 sm:w-full sm:h-32`} playsInline />
      </div>
      {webcamEnabled && (
        <div className="mb-8 text-center bg-white p-4 rounded-lg shadow-md border border-blue-200">
          <p className="text-xl font-semibold text-gray-700 sm:text-lg">{detectedMood}</p>
          {detectedMood && !detectedMood.includes('No face') && !detectedMood.includes('Error') && (
            <div className="mt-4">
              <label className="text-gray-700 sm:text-sm">Not correct? Select another mood: </label>
              <select value={correctedMood} onChange={handleMoodCorrection} className="ml-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm">
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
      {latestRecommendation && (
        <div className="mb-8 sm:w-full">
          <h2 className="text-2xl font-semibold text-center mb-4 text-gray-700 sm:text-xl">Recommendation</h2>
          <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto border border-blue-200 sm:w-full sm:p-4">
            <p className="text-lg font-medium text-gray-700 sm:text-base">{latestRecommendation.details.message || JSON.parse(latestRecommendation.details).name}</p>
            <div className="mt-4 flex space-x-4 justify-center sm:flex-col sm:space-y-2 sm:space-x-0">
              <button onClick={() => handleRecommendationAction(latestRecommendation.recommendationId, true)} disabled={actionStatus !== null} className={`px-4 py-2 rounded ${actionStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'} sm:w-full`}>Accept</button>
              <button onClick={() => handleRecommendationAction(latestRecommendation.recommendationId, false)} disabled={actionStatus !== null} className={`px-4 py-2 rounded ${actionStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'} sm:w-full`}>Decline</button>
            </div>
            {actionStatus && <p className="mt-2 text-sm text-gray-700 sm:text-xs">Recommendation {actionStatus === 'accepted' ? 'accepted' : 'declined'}!</p>}
            {latestRecommendation.type === 'break' && !actionStatus && (
              <div className="mt-4 sm:w-full">
                {timer !== null ? (
                  <div>
                    <p className="text-xl font-semibold text-gray-700 sm:text-lg">{formatTime(timer)}</p>
                    <button onClick={resetTimer} className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:w-full">Reset Timer</button>
                  </div>
                ) : (
                  <button onClick={() => startTimer(latestRecommendation.details.match(/\d+/)[0])} className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:w-full">Start Timer</button>
                )}
              </div>
            )}
            {latestRecommendation.type === 'music' && (
              <div className="mt-4 sm:w-full">
                {spotifyToken ? (
                  <div>
                    <p className="text-md font-medium mb-2 text-gray-700 sm:text-sm">Playing: {currentPlaylist.name || 'Loading...'}</p>
                    <SpotifyPlayer
                      token={spotifyToken}
                      uris={[`spotify:playlist:${currentPlaylist.id}`]}
                      play={isPlaying}
                      callback={async (state) => {
                        if (state.isPlaying) console.log('Playing:', state.track.name);
                        if (state.error) {
                          console.error('Playback error:', state.error);
                          setError(`Playback failed: ${state.error.message}`);
                          if (state.error.status === 401) {
                            await handleSpotifyConnect();
                            const userData = await getUser();
                            setSpotifyToken(userData.spotifyToken.accessToken || '');
                          } else if (state.error.status === 503) {
                            setTimeout(async () => {
                              const userData = await getUser();
                              setSpotifyToken(userData.spotifyToken.accessToken || '');
                              setError('Retrying playback...');
                            }, 5000);
                          }
                        }
                      }}
                      styles={{
                        bgColor: '#e5e7eb',
                        color: '#1a202c',
                        loaderColor: '#48bb78',
                        sliderColor: '#48bb78',
                        trackNameColor: '#2d3748',
                      }}
                      className="w-full sm:w-full sm:h-32"
                    />
                    <div className="mt-4 flex space-x-4 justify-center sm:flex-col sm:space-y-2 sm:space-x-0">
                      <button onClick={handleSavePlaylist} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:w-full">Save</button>
                      <button onClick={handleSkipPlaylist} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:w-full">Skip</button>
                      {!isPlaying && (
                        <button onClick={handlePlay} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:w-full">Play</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={handleSpotifyConnect} className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 sm:text-sm">Connect Spotify to Play</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:flex-col sm:gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200 sm:w-full">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700 sm:text-xl">Daily Screen Time</h2>
          {screenTimeData.length > 0 ? (
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw} minutes` } },
                },
                scales: {
                  x: { title: { display: true, text: 'Date' } },
                  y: { title: { display: true, text: 'Minutes' }, beginAtZero: true },
                },
              }}
            />
          ) : <p className="text-gray-700 sm:text-sm">No screen time data available.</p>}
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border border-blue-200 sm:w-full">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700 sm:text-xl">Tab Usage</h2>
          {pieChartData.labels.length > 0 ? <Pie data={pieChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} /> : <p className="text-gray-700 sm:text-sm">No tab usage data available.</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;