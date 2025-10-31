import React from 'react';
import SEO from '../components/SEO';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <SEO
        title="ChillBoard Privacy Policy — Local Mood Detection and Data Minimization"
        description="Read how ChillBoard protects your privacy: local mood detection, hostname-only tracking, secure storage, and user controls."
        url="https://www.chillboard.in/privacy"
        canonical="https://www.chillboard.in/privacy"
        keywords="ChillBoard privacy policy, local mood detection, data minimization, screen time privacy"
      />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-700 mb-4">
            Privacy Policy for ChillBoard Chrome Extension
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Effective: August 17, 2025, 06:39 PM IST
          </p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Introduction
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 leading-relaxed">
                This Privacy Policy explains how the ChillBoard Chrome Extension ("the Extension") collects, uses, stores, and protects your data. The Extension is part of the ChillBoard digital wellness platform, which helps users manage screen time, monitor emotional well-being, and receive personalized recommendations. We are committed to protecting your privacy and ensuring compliance with applicable data protection laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA). By using the Extension, you agree to the practices described in this policy.
              </p>
              <p className="text-slate-700 leading-relaxed mt-4">
                The Extension tracks screen time for browser tabs and sends anonymized data to our backend server at https://chillboard-6uoj.onrender.com for processing. This data is combined with mood detection (processed locally) to provide recommendations such as breaks, messages, or music playlists via Spotify integration. All data handling is designed with privacy in mind, using minimal permissions and local processing where possible.
              </p>
            </div>
          </div>

          {/* Data We Collect */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Data We Collect
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>
                  <strong>Screen Time Data:</strong>
                  {' '}
                  Anonymized hostnames of websites visited (e.g., "example.com", extracted from tab URLs without paths, queries, or full URLs) and time spent on each tab. We also collect total daily screen time aggregated from tab activity.
                </li>
                <li>
                  <strong>User Identifiers:</strong>
                  {' '}
                  A unique user ID generated upon login to associate data with your account.
                </li>
                <li>
                  <strong>Timestamps:</strong>
                  {' '}
                  Dates and times associated with screen time tracking to calculate daily and weekly trends.
                </li>
                <li>
                  <strong>Technical Data:</strong>
                  {' '}
                  Extension logs (e.g., errors, sync status) stored locally and not sent to the backend unless required for debugging with your consent.
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                Mood detection is performed locally using your webcam and face-api.js. Only the detected mood (e.g., happy, sad, stressed) and confidence score are sent to the backend if you enable this feature. No images or video frames are stored or transmitted.
              </p>
              <p className="text-slate-700 leading-relaxed mt-2">
                We do not collect personally identifiable information (PII) such as full URLs, IP addresses, or browsing history details beyond anonymized hostnames. Spotify integration collects access and refresh tokens only if you connect your Spotify account, and these are stored securely.
              </p>
            </div>
          </div>

          {/* How We Collect Data */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  How We Collect Data
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>
                  <strong>Chrome APIs and Permissions:</strong>
                  {' '}
                  The Extension requires permissions for "tabs", "storage", "alarms", "idle", and "windows" to track active tabs, calculate time spent, detect idle states, and sync data. Specifically:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>
                      Tabs permission: Used to access tab URLs (only hostnames are extracted and anonymized) and detect when tabs are activated, updated, or removed.
                    </li>
                    <li>
                      Storage: For local caching of unsynced data and settings.
                    </li>
                    <li>Alarms: To schedule data sync every 5 minutes.</li>
                    <li>
                      Idle and Windows: To pause tracking during inactivity or when the browser is minimized/locked.
                    </li>
                  </ul>
                  Hostnames are extracted using JavaScript functions like new URL(tab.url).hostname, ensuring no full URLs are stored or sent.
                </li>
                <li>
                  <strong>Local Storage:</strong>
                  {' '}
                  Temporary data (e.g., unsynced screen time, tab usage) is stored locally using chrome.storage.local before being sent to the backend via HTTPS. Offline data is queued and synced when connectivity is restored.
                </li>
                <li>
                  <strong>Backend Sync:</strong>
                  {' '}
                  Anonymized data is sent to our secure backend server using encrypted HTTPS connections. Data is batched and synced periodically to minimize network usage.
                </li>
                <li>
                  <strong>Mood Detection:</strong>
                  {' '}
                  If enabled in the web app[](https://www.chillboard.in/), your webcam is accessed locally with face-api.js. You must explicitly consent to webcam access, and processing occurs entirely in-browser.
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                All data collection requires user authentication (login via email and password). You can control features like mood detection and notifications through settings.
              </p>
            </div>
          </div>

          {/* How We Use Your Data */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  How We Use Your Data
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 leading-relaxed">
                We use the collected data solely for digital wellness purposes. Here's a detailed explanation of why we collect tabs data, store it in the backend, and what we do with screen time data:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2">
                <li>
                  <strong>Why We Use Tabs Data:</strong>
                  {' '}
                  Tabs data (anonymized hostnames and time spent) is essential for tracking browser usage patterns. This allows us to:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>
                      Calculate accurate screen time by monitoring active tabs (using events like tabs.onActivated, tabs.onUpdated, tabs.onRemoved).
                    </li>
                    <li>
                      Provide insights into time distribution across websites (e.g., pie charts showing tab usage).
                    </li>
                    <li>
                      Detect excessive usage on specific sites to trigger recommendations (e.g., if time on a site exceeds thresholds).
                    </li>
                  </ul>
                  We only use hostnames to ensure privacy—no full URLs or content is accessed. This data helps users understand and balance their digital habits.
                </li>
                <li>
                  <strong>Why We Store Data in the Backend:</strong>
                  {' '}
                  Screen time data is stored in our backend (MongoDB Atlas) to enable cross-device access, advanced processing, and platform features:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>
                      <strong>Cross-Device Sync:</strong>
                      {' '}
                      Data is synced to allow viewing analytics and recommendations in the web dashboard[](https://www.chillboard.in/).
                    </li>
                    <li>
                      <strong>Combination with Mood Data:</strong>
                      {' '}
                      Backend combines screen time with locally detected mood (sent separately) for AI-driven recommendations (e.g., if screen time {">"} 3 hours and mood is "stressed", suggest a break or calming playlist).
                    </li>
                    <li>
                      <strong>Trends and Analytics:</strong>
                      {' '}
                      Server-side aggregation for weekly trends, charts, and baselines for challenges (e.g., average screen time over 7 days).
                    </li>
                    <li>
                      <strong>Community Features:</strong>
                      {' '}
                      Anonymized reductions in screen time are used for leaderboards and challenges, promoting healthy habits.
                    </li>
                    <li>
                      <strong>Security and Reliability:</strong>
                      {' '}
                      Backend storage ensures data persistence beyond local device limits, with encryption and access controls.
                    </li>
                  </ul>
                  Local storage is used temporarily for offline queuing, but backend storage is necessary for full functionality like recommendations and challenges.
                </li>
                <li>
                  <strong>What We Do with Screen Time Data:</strong>
                  {' '}
                  Screen time data powers the core features:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>
                      <strong>Analytics:</strong>
                      {' '}
                      Display daily totals, tab distributions, and trends via charts.
                    </li>
                    <li>
                      <strong>Recommendations:</strong>
                      {' '}
                      Rule-based engine (e.g., &gt;5 hours + stressed mood → music recommendation) generates suggestions like breaks (with timers), motivational messages, or Spotify playlists.
                    </li>
                    <li>
                      <strong>Challenges and Leaderboards:</strong>
                      {' '}
                      Calculate progress in screen time reduction challenges (e.g., daily reduction vs. baseline) and rank participants anonymously.
                    </li>
                    <li>
                      <strong>Improvements:</strong>
                      {' '}
                      Anonymized aggregates help us enhance the platform (e.g., usage trends for better rules).
                    </li>
                  </ul>
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                We do not use your data for advertising, profiling, or any purpose beyond digital wellness. Data is not sold or shared with third parties for marketing.
              </p>
            </div>
          </div>

          {/* Data Storage and Security */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823.922-4"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Data Storage and Security
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>
                  <strong>Local Storage:</strong>
                  {' '}
                  Temporary screen time data and settings are stored on your device using chrome.storage.local. Mood detection occurs entirely in-browser with no storage of images.
                </li>
                <li>
                  <strong>Backend Storage:</strong>
                  {' '}
                  Anonymized data is stored on secure servers hosted by Render (backend) and MongoDB Atlas (database) in the United States. We use encryption (TLS/HTTPS) for transmission and at-rest encryption for sensitive data like Spotify tokens.
                </li>
                <li>
                  <strong>Retention:</strong>
                  {' '}
                  Screen time and mood data is retained for up to 30 days for trends and challenges. You can request deletion at any time. Inactive accounts are deleted after 180 days.
                </li>
                <li>
                  <strong>Security Measures:</strong>
                  {' '}
                  JWT authentication, bcrypt password hashing, CORS restrictions, rate limiting, and logging with Winston. All API calls use HTTPS. Code is open-source for transparency (GitHub repositories provided in documentation).
                </li>
              </ul>
            </div>
          </div>

          {/* Your Rights and Choices */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Your Rights and Choices
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>
                  <strong>Consent:</strong>
                  {' '}
                  Explicit consent is required for webcam access (mood detection) and data syncing. You can withdraw consent via settings (e.g., disable webcamEnabled, notifications).
                </li>
                <li>
                  <strong>Access and Deletion:</strong>
                  {' '}
                  Request access to or deletion of your data by contacting us at
                  {' '}
                  <a
                    href="mailto:manikanta098@gmail.com"
                    className="text-blue-600 hover:underline"
                  >
                    manikanta098@gmail.com
                  </a>
                  . You can also unlink Spotify or delete your account via the web app.
                </li>
                <li>
                  <strong>Opt-Out:</strong>
                  {' '}
                  Exclude yourself from leaderboards (showOnLeaderboard setting) or disable notifications (notifyEvery: 'off').
                </li>
                <li>
                  <strong>Local Option:</strong>
                  {' '}
                  Screen time tracking works offline with local storage; data is only synced when you log in.
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                If you are in the EU or California, you have additional rights under GDPR or CCPA, such as data portability or opting out of data sales (not applicable, as we do not sell data).
              </p>
            </div>
          </div>

          {/* Data Sharing */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Data Sharing
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 leading-relaxed">
                We do not share your data with third parties, except:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mt-2">
                <li>
                  With service providers (e.g., Render for hosting, MongoDB Atlas for storage, Spotify API for music) who process data on our behalf under strict confidentiality agreements.
                </li>
                <li>
                  When required by law, such as in response to legal requests or to protect our rights.
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                Anonymized, aggregated data (e.g., average screen time trends) may be used for platform improvements but cannot be linked to individual users.
              </p>
            </div>
          </div>

          {/* Changes to This Privacy Policy */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Changes to This Privacy Policy
                </h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 leading-relaxed">
                We may update this Privacy Policy to reflect changes in our practices or legal requirements. The updated policy will be posted at https://www.chillboard.in/about, and the version number and effective date will be revised. We will notify users of significant changes via the Extension popup or email.
              </p>
            </div>
          </div>

          {/* Contact Us */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-700">
                  Contact Us
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>
                  <strong>Email:</strong>
                  {' '}
                  <a
                    href="mailto:manikanta098@gmail.com"
                    className="text-blue-600 hover:underline"
                  >
                    manikanta098@gmail.com
                  </a>
                </li>
                <li>
                  <strong>Website:</strong>
                  {' '}
                  <a
                    href="https://www.chillboard.in/"
                    className="text-blue-600 hover:underline"
                  >
                    https://www.chillboard.in/
                  </a>
                </li>
                <li>
                  <strong>Address:</strong> ChillBoard Team, Hyderabad, India
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
