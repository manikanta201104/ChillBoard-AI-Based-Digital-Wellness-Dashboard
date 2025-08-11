import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveMood, getLatestMood, getRecommendations } from '../utils/api';

const MODEL_URL = '/models';
const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights/';

const MoodDetection = ({ fetchRecommendations }) => {
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [detectedMood, setDetectedMood] = useState('Detecting mood...');
  const [lastSavedMood, setLastSavedMood] = useState(null);
  const [correctedMood, setCorrectedMood] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionAttempts, setDetectionAttempts] = useState(0);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastSentRef = useRef({ timestamp: 0, mood: null, confidence: 0 });
  const updateIntervalRef = useRef(null);

  const showToast = (message, type = 'success') => {
    const options = {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };
    if (type === 'success') toast.success(message, options);
    else if (type === 'error') toast.error(message, options);
    else toast.info(message, options);
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.warn('Failed to load local models:', err);
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_URL);
          await faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_URL);
          await faceapi.nets.faceExpressionNet.loadFromUri(CDN_MODEL_URL);
          setModelsLoaded(true);
          showToast('Emotion detection models loaded from CDN!');
        } catch (cdnErr) {
          console.error('Error loading models from CDN:', cdnErr);
          setError('Failed to load emotion detection models.');
          showToast('Failed to load emotion detection models', 'error');
        }
      }
    };
    loadModels();

    return () => {
      stopWebcam();
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (webcamEnabled && modelsLoaded && videoRef.current) {
      startWebcam();
      showToast('Webcam enabled for mood detection!');
    }
    return () => {
      if (webcamEnabled) stopWebcam();
    };
  }, [webcamEnabled, modelsLoaded]);

  useEffect(() => {
    if (webcamEnabled && modelsLoaded && videoRef.current) {
      updateIntervalRef.current = setInterval(detectEmotions, 10000);
      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
      };
    }
  }, [webcamEnabled, modelsLoaded, correctedMood]);

  const startWebcam = async () => {
    if (!modelsLoaded) {
      setError('Models are still loading, please wait...');
      showToast('Models are still loading', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
        setError('Failed to play webcam video.');
        showToast('Failed to play webcam video', 'error');
        stopWebcam();
      });
    } catch (err) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Webcam access denied. Please grant camera permission.'
        : err.name === 'NotFoundError'
        ? 'No webcam found. Please connect a webcam.'
        : `Failed to access webcam: ${err.message}`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setWebcamEnabled(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setWebcamEnabled(false);
    setDetectedMood('Detecting mood...');
    setDetectionAttempts(0);
    setCorrectedMood('');
    setLastSavedMood(null);
    showToast('Webcam disabled');
  };

  const detectEmotions = async () => {
    if (!videoRef.current || !webcamEnabled || !modelsLoaded) {
      console.warn('Emotion detection aborted:', { videoReady: !!videoRef.current, webcamEnabled, modelsLoaded });
      setDetectedMood('Emotion detection not ready. Check webcam and model loading.');
      showToast('Emotion detection not ready', 'error');
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
          showToast('Low confidence in emotion detection', 'error');
        }

        if ((confidenceDrop > 0.2 || (timeSinceLast >= 30 && moodText !== lastSentRef.current.mood)) && now - lastSentRef.current.timestamp >= 10000) {
          const moodToSend = { mood: moodText, confidence };
          try {
            await saveMood(moodToSend);
            setLastSavedMood(moodToSend);
            lastSentRef.current = { timestamp: now, mood: moodText, confidence };
            showToast(`Mood ${moodText} saved successfully!`);
            fetchRecommendations();
          } catch (err) {
            console.error('Error sending mood to backend:', err);
            setError('Failed to send mood data to backend.');
            showToast('Failed to send mood data', 'error');
          }
        }

        setDetectionAttempts(0);
      } else if (detectionAttempts >= 10) {
        setDetectedMood('Still no face detected. Ensure good lighting and face the camera directly.');
        showToast('Still no face detected', 'error');
      } else {
        setDetectedMood('No face detected. Please center your face in the frame.');
        showToast('No face detected', 'error');
      }
    } catch (err) {
      console.error('Error during emotion detection:', err);
      setDetectedMood('Error detecting emotions');
      showToast('Error detecting emotions', 'error');
    }
  };

  const handleMoodCorrection = async (e) => {
    const newMood = e.target.value;
    setCorrectedMood(newMood);

    if (!newMood) return;

    try {
      await saveMood({ mood: newMood, confidence: 1.0 });
      setLastSavedMood({ mood: newMood, confidence: 1.0 });
      lastSentRef.current = { timestamp: Date.now(), mood: newMood, confidence: 1.0 };
      setDetectedMood(`You seem ${newMood} (Confidence: 100%)`);
      showToast(`Corrected mood ${newMood} saved successfully!`);
      fetchRecommendations();
    } catch (err) {
      console.error('Error saving corrected mood:', err);
      setError('Failed to save corrected mood');
      showToast('Failed to save corrected mood', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 rounded-lg shadow-sm">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium text-slate-700 mb-2">Mood Detection</h2>
        <p className="text-slate-500 text-sm">Enable camera to detect and analyze your current mood</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-center text-sm">{error}</p>
        </div>
      )}

      {/* Control Button */}
      <div className="text-center mb-8">
        <button
          onClick={webcamEnabled ? stopWebcam : () => setWebcamEnabled(true)}
          className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm
            ${webcamEnabled 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-slate-600 hover:bg-slate-700 text-white'
            } 
            ${!modelsLoaded ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
          disabled={!modelsLoaded}
        >
          {!modelsLoaded ? 'Loading Models...' : webcamEnabled ? 'Disable Mood Detection' : 'Enable Mood Detection'}
        </button>
      </div>

      {/* Camera Section */}
      <div className="flex justify-center mb-8">
        {webcamEnabled ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="rounded-lg shadow-lg w-96 h-72 bg-slate-800 border-2 border-slate-300"
              playsInline
            />
            <div className="absolute top-3 right-3 bg-red-500 w-3 h-3 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="w-96 h-72 bg-slate-200 rounded-lg shadow-lg flex items-center justify-center border-2 border-dashed border-slate-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Camera Disabled</p>
              <p className="text-slate-400 text-xs mt-1">Click "Enable Mood Detection" to start</p>
            </div>
          </div>
        )}
      </div>

      {/* Mood Detection Results */}
      {webcamEnabled && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-slate-700 mb-2">Current Mood Analysis</h3>
            <div className="inline-flex items-center px-4 py-2 bg-slate-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <p className="text-slate-700 font-medium">{detectedMood}</p>
            </div>
          </div>

          {/* Mood Correction */}
          {!detectedMood.includes('No face') && !detectedMood.includes('Error') && !detectedMood.includes('not ready') && (
            <div className="border-t border-slate-200 pt-6">
              <div className="text-center">
                <label className="block text-slate-600 text-sm mb-3 font-medium">
                  Not feeling right? Correct your mood:
                </label>
                <div className="inline-flex">
                  <select
                    value={correctedMood}
                    onChange={handleMoodCorrection}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white text-slate-700 shadow-sm"
                  >
                    <option value="">Choose your actual mood</option>
                    <option value="happy">😊 Happy</option>
                    <option value="sad">😢 Sad</option>
                    <option value="angry">😠 Angry</option>
                    <option value="stressed">😰 Stressed</option>
                    <option value="calm">😌 Calm</option>
                    <option value="neutral">😐 Neutral</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default MoodDetection;