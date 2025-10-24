import React, { useState, useEffect, useCallback } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  initiateSpotifyLogin,
  savePlaylist,
  fetchNewPlaylist,
  getUser,
  startPlayback,
  getLatestMood,
  getUserPlaylists,
} from '../utils/api';

// Maintain a small cache of recently used playlist IDs to avoid repetition on "Next"
const getRecent = () => {
  try {
    return JSON.parse(localStorage.getItem('chillboardRecentPlaylists') || '[]');
  } catch {
    return [];
  }
};

const setRecent = (arr) =>
  localStorage.setItem('chillboardRecentPlaylists', JSON.stringify(arr.slice(0, 5)));

const SpotifyPlayerComponent = ({ latestRecommendation, fetchRecommendations }) => {
  const [spotifyToken, setSpotifyToken] = useState('');
  const [currentPlaylist, setCurrentPlaylist] = useState({ id: '', name: '', offset: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState('');
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '');
  const [isSaved, setIsSaved] = useState(false);

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

  const refreshUserData = useCallback(async () => {
    if (refreshingToken) return;
    setRefreshingToken(true);
    try {
      const userData = await getUser();
      setSpotifyToken(userData.spotifyToken?.accessToken || '');
      setDeviceId(userData.deviceId || '');
      if (userData.authToken) {
        setAuthToken(userData.authToken);
        localStorage.setItem('authToken', userData.authToken);
      }
    } catch (err) {
      setError(`Failed to fetch user data: ${err.message}`);
      showToast(`Failed to fetch user data: ${err.message}`, 'error');
    } finally {
      setRefreshingToken(false);
    }
  }, [refreshingToken]);

  const checkPlaylistSavedStatus = useCallback(async () => {
    if (!currentPlaylist.id || !authToken) return;
    try {
      const playlists = await getUserPlaylists();
      const playlist = playlists.find((p) => p.spotifyPlaylistId === currentPlaylist.id);
      setIsSaved(playlist?.saved || false);
    } catch (err) {
      console.error('Failed to check playlist saved status:', err);
      showToast('Failed to check playlist status', 'error');
    }
  }, [currentPlaylist.id, authToken]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const userData = await getUser();
        setSpotifyToken(userData.spotifyToken?.accessToken || '');
        setDeviceId(userData.deviceId || '');
        if (userData.authToken) {
          setAuthToken(userData.authToken);
          localStorage.setItem('authToken', userData.authToken);
        }
      } catch (err) {
        setError('Failed to fetch user data');
        showToast('Failed to fetch user data', 'error');
      }
    };
    initialize();

    const initializePlaylist = async () => {
      const playbackState = localStorage.getItem('chillboardPlaybackState');
      if (latestRecommendation?.type === 'music') {
        const details = JSON.parse(latestRecommendation.details);
        setCurrentPlaylist({ id: details.playlistId, name: details.name, offset: 0 });
        setTimeout(() => handlePlay(), 0);
      } else if (playbackState && !currentPlaylist.id) {
        const { id, offset, name } = JSON.parse(playbackState);
        setCurrentPlaylist({ id, name, offset });
        const wasPlaying = localStorage.getItem('chillboardWasPlaying') === 'true';
        if (wasPlaying) setTimeout(() => handlePlay(), 0);
      }
      await checkPlaylistSavedStatus();
    };
    initializePlaylist();

    const handleBeforeUnload = () => {
      if (isPlaying && currentPlaylist.id) {
        localStorage.setItem(
          'chillboardPlaybackState',
          JSON.stringify({ id: currentPlaylist.id, offset: currentPlaylist.offset, name: currentPlaylist.name })
        );
        localStorage.setItem('chillboardWasPlaying', 'true');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [latestRecommendation, isPlaying, currentPlaylist.id, checkPlaylistSavedStatus]);

  const handleSpotifyConnect = async () => {
    try {
      const authorizeURL = await initiateSpotifyLogin();
      window.location.href = authorizeURL;
      showToast('Spotify connection initiated!');
    } catch (err) {
      setError('Failed to initiate Spotify login');
      showToast('Failed to initiate Spotify login', 'error');
    }
  };

  const handleSavePlaylist = async () => {
    if (!currentPlaylist.id || !authToken) {
      showToast('No playlist or token available', 'error');
      return;
    }
    if (isSaved) {
      showToast('Playlist is already saved', 'info');
      return;
    }
    try {
      const response = await savePlaylist(currentPlaylist.id, { saved: true }, authToken);
      if (response.message === 'Playlist already saved') {
        setIsSaved(true);
        showToast('Playlist is already saved', 'info');
      } else {
        setIsSaved(true);
        showToast('Playlist saved successfully!');
      }
    } catch (err) {
      let errorMessage = 'Failed to save playlist';
      if (err.response?.status === 401) {
        errorMessage = 'Session expired, please reconnect Spotify';
        await handleSpotifyConnect();
      } else if (err.response?.status === 404) {
        errorMessage = 'Playlist not found';
      }
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const handlePlay = async () => {
    if (!deviceId) {
      setError('No device ID available. Please ensure Spotify is active.');
      showToast('No device ID available', 'error');
      return;
    }
    setIsPlaying(true);
    try {
      await startPlayback(deviceId, currentPlaylist.id, currentPlaylist.offset);
      const playbackState = localStorage.getItem('chillboardPlaybackState');
      const offset = playbackState ? JSON.parse(playbackState).offset || 0 : 0;
      setCurrentPlaylist((prev) => ({ ...prev, offset }));
      showToast('Playback started!');
      localStorage.setItem('chillboardWasPlaying', 'true');
    } catch (err) {
      console.error('Playback error:', err);
      setError(`Playback failed: ${err.message}`);
      showToast(`Playback failed: ${err.message}`, 'error');
      if (err.response?.status === 401 || err.response?.status === 403) {
        await handleSpotifyConnect();
      } else if (err.message.includes('token')) {
        await refreshUserData();
      }
    }
  };

  const handleSkipPlaylist = async () => {
    let mood = (await getLatestMood())?.mood?.toLowerCase();
    if (!mood) {
      setError('No mood detected or available. Enable mood detection or correct the mood.');
      showToast('No mood detected for new playlist', 'error');
      return;
    }
    try {
      let attempts = 0;
      let newPlaylist;
      const recent = new Set(getRecent());
      while (attempts < 3) {
        newPlaylist = await fetchNewPlaylist(mood, true);
        if (!recent.has(newPlaylist.spotifyPlaylistId)) break;
        attempts += 1;
      }
      const updatedRecent = [newPlaylist.spotifyPlaylistId, ...getRecent().filter((id) => id !== newPlaylist.spotifyPlaylistId)];
      setRecent(updatedRecent);

      setCurrentPlaylist({ id: newPlaylist.spotifyPlaylistId, name: newPlaylist.name, offset: 0 });
      setIsSaved(false);
      setError('');
      showToast('New playlist loaded!');
      localStorage.removeItem('chillboardPlaybackState');
      localStorage.setItem('chillboardWasPlaying', 'true');
      setIsPlaying(true);
      await handlePlay();
      fetchRecommendations();
    } catch (err) {
      setError(`Failed to fetch new playlist: ${err.message}`);
      showToast(`Failed to fetch new playlist: ${err.message}`, 'error');
      if (err.response?.status === 401) {
        await handleSpotifyConnect();
      }
    }
  };

  useEffect(() => {
    if (error && error.includes('re-authenticate')) {
      handleSpotifyConnect();
    }
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 rounded-lg shadow-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium text-slate-700 mb-2">Music Player</h2>
        <p className="text-slate-500 text-sm">Connect your Spotify to enjoy mood-based playlists</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-center text-sm">{error}</p>
        </div>
      )}

      {spotifyToken && latestRecommendation?.type === 'music' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-slate-700">Now Playing</h3>
                <p className="text-slate-500 text-sm mt-1">{currentPlaylist.name || 'Loading playlist...'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Live</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <SpotifyPlayer
                token={spotifyToken}
                uris={[`spotify:playlist:${currentPlaylist.id}`]}
                play={isPlaying}
                offset={currentPlaylist.offset}
                callback={async (state) => {
                  if (state.isPlaying) {
                    setCurrentPlaylist(prev => ({ ...prev, offset: state.progressMs / 1000 || 0 }));
                    localStorage.setItem('chillboardPlaybackState', JSON.stringify({ id: currentPlaylist.id, offset: state.progressMs / 1000, name: currentPlaylist.name }));
                    localStorage.setItem('chillboardWasPlaying', 'true');
                  }

                  if (state.error) {
                    console.error('Playback error:', state.error);
                    setError(`Playback failed: ${state.error.message}`);
                    showToast(`Playback failed: ${state.error.message}`, 'error');
                    if (state.error.status === 401 && !refreshingToken) {
                      await refreshUserData();
                    } else if (state.error.status === 503) {
                      showToast('Spotify server issue detected, retrying in 5 seconds...', 'info');
                      setTimeout(refreshUserData, 5000);
                    }
                  }
                }}
                styles={{
                  bgColor: '#f8fafc',
                  color: '#475569',
                  loaderColor: '#64748b',
                  sliderColor: '#64748b',
                  trackNameColor: '#334155',
                }}
                className="w-full"
              />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h4 className="text-md font-medium text-slate-700 mb-4">Playlist Controls</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={handleSavePlaylist}
                disabled={isSaved}
                className={`px-6 py-3 rounded-lg transition-colors duration-200 shadow-sm flex items-center justify-center space-x-2 ${
                  isSaved
                    ? 'bg-slate-400 text-white cursor-not-allowed'
                    : 'bg-slate-600 text-white hover:bg-slate-700 hover:shadow-md'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{isSaved ? 'Saved' : 'Save Playlist'}</span>
              </button>
              <button
                onClick={handleSkipPlaylist}
                className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5++)" />
</svg>
                <span>Next Playlist</span>
              </button>
              {!isPlaying && (
                <button
                  onClick={handlePlay}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-1V8a3 3 0 013-3h6a3 3 0 013 3v5" />
                  </svg>
                  <span>Resume</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mb-8">
            <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615a.625.625 0 01-.862.225c-2.359-1.439-5.328-1.764-8.828-.961a.625.625 0 11-.312-1.211c3.828-.877 7.172-.496 9.777 1.086a.625.625 0 01.225.861zm1.23-2.738a.781.781 0 01-1.078.281c-2.703-1.652-6.824-2.133-10.02-1.168a.781.781 0 11-.468-1.492c3.656-1.105 8.203-.571 11.285 1.34a.781.781 0 01.281 1.039zm.106-2.85C14.692 8.953 9.348 8.734 6.344 9.668a.937.937 0 11-.562-1.789c3.439-1.07 9.398-.813 12.898 1.461a.937.937 0 11-.937 1.625z"/>
              </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-700 mb-3">Connect Your Spotify</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Link your Spotify account to enjoy personalized music recommendations based on your current mood.
            </p>
          </div>
          <button
            onClick={handleSpotifyConnect}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-sm hover:shadow-md font-medium flex items-center justify-center space-x-3 mx-auto"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615a.625.625 0 01-.862.225c-2.359-1.439-5.328-1.764-8.828-.961a.625.625 0 11-.312-1.211c3.828-.877 7.172-.496 9.777 1.086a.625.625 0 01.225.861zm1.23-2.738a.781.781 0 01-1.078.281c-2.703-1.652-6.824-2.133-10.02-1.168a.781.781 0 11-.468-1.492c3.656-1.105 8.203-.571 11.285 1.34a.781.781 0 01.281 1.039zm.106-2.85C14.692 8.953 9.348 8.734 6.344 9.668a.937.937 0 11-.562-1.789c3.439-1.07 9.398-.813 12.898 1.461a.937.937 0 11-.937 1.625z"/>
            </svg>
            <span>Connect to Spotify</span>
          </button>
          <p className="text-xs text-slate-400 mt-4">
            Premium Spotify account required for full playback functionality
          </p>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default SpotifyPlayerComponent;