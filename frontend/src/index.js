import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// No additional script needed for react-spotify-web-playback as it's an npm package
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);