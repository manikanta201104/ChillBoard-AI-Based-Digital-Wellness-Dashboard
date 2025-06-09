/*global chrome*/
import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getScreenTime } from '../utils/api';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ChartDataLabels);

const Dashboard = () => {
  const [screenTimeData, setScreenTimeData] = useState([]);
  const [error, setError] = useState('');
  const [extensionInstalled, setExtensionInstalled] = useState(true);

  useEffect(() => {
    // Fetch screen time data
    const fetchData = async () => {
      try {
        const data = await getScreenTime();
        setScreenTimeData(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch screen time data');
      }
    };

    fetchData();

    // Check if extension is installed
    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage('your_extension_id_here', { message: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setExtensionInstalled(false);
        }
      });
    } else {
      setExtensionInstalled(false);
    }
  }, []);

  // Helper function to format seconds into hh:mm:ss
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs > 0 ? `${hrs}h` : '',
      mins > 0 ? `${mins}m` : '',
      `${secs}s`
    ].filter(Boolean).join(' ');
  };

  // Helper function to format seconds into hh:mm (no seconds)
  const formatTimeNoSeconds = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return [
      hrs > 0 ? `${hrs}h` : '',
      mins > 0 ? `${mins}m` : '',
    ].filter(Boolean).join(' ') || '0m';
  };

  // Summary stats for today
  const today = new Date().toLocaleDateString();
  const todayData = screenTimeData.filter(
    (entry) => new Date(entry.date).toLocaleDateString() === today
  );

  const todayScreenTime = todayData.reduce((sum, entry) => sum + entry.totalTime, 0);
  const todaySites = new Set(
    todayData.flatMap((entry) => entry.tabs.map((tab) => tab.url))
  ).size;

  // Aggregate screen time data by day for the bar chart
  const dailyScreenTimeMap = {};
  screenTimeData.forEach((entry) => {
    const date = new Date(entry.date).toLocaleDateString();
    if (dailyScreenTimeMap[date]) {
      dailyScreenTimeMap[date] += entry.totalTime;
    } else {
      dailyScreenTimeMap[date] = entry.totalTime;
    }
  });

  const barChartData = {
    labels: Object.keys(dailyScreenTimeMap),
    datasets: [
      {
        label: 'Screen Time (minutes)',
        data: Object.values(dailyScreenTimeMap).map((totalTime) => Math.floor(totalTime / 60)),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      datalabels: {
        color: '#000',
        anchor: 'end',
        align: 'top',
        formatter: (value) => `${value}m`,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const seconds = Object.values(dailyScreenTimeMap)[context.dataIndex];
            return `Screen Time: ${formatTime(seconds)}`;
          },
        },
      },
    },
  };

  // Aggregate tab usage across all ScreenTime entries for the pie chart
  const tabUsageMap = {};
  screenTimeData.forEach((entry) => {
    entry.tabs.forEach((tab) => {
      if (tabUsageMap[tab.url]) {
        tabUsageMap[tab.url] += tab.timeSpent || 0;
      } else {
        tabUsageMap[tab.url] = tab.timeSpent || 0;
      }
    });
  });

  const pieChartData = {
    labels: Object.keys(tabUsageMap),
    datasets: [
      {
        label: 'Tab Usage (seconds)',
        data: Object.values(tabUsageMap),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.4)',
          'rgba(54, 162, 235, 0.4)',
          'rgba(255, 206, 86, 0.4)',
          'rgba(75, 192, 192, 0.4)',
          'rgba(153, 102, 255, 0.4)',
          'rgba(255, 159, 64, 0.4)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
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

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      datalabels: {
        color: '#000',
        formatter: (value) => formatTime(value),
        anchor: 'center',
        align: 'center',
        font: { size: 10 },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const seconds = context.raw;
            return `${context.label}: ${formatTimeNoSeconds(seconds)}`;
          },
        },
      },
    },
  };

  const handleInstallReminder = () => {
    alert('Please install the ChillBoard Chrome extension to track your screen time!');
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    window.location.href = '/';
  };

  const handleOpenWebApp = () => {
    window.open('http://localhost:3000', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-center">ChillBoard Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

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

      {screenTimeData.length === 0 && !error ? (
        <p className="text-gray-500 text-center mb-8">
          No screen time data available. Start using the app to track your activity!
        </p>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-semibold mb-4">ChillBoard Stats (Today)</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg">
                  Screen time: {formatTimeNoSeconds(todayScreenTime)}
                </p>
                <p className="text-lg">Sites visited: {todaySites}</p>
              </div>
              <button
                onClick={handleOpenWebApp}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                Open Web App
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">Daily Screen Time (Last 7 Days)</h2>
              {barChartData.labels.length > 0 ? (
                <Bar data={barChartData} options={barChartOptions} />
              ) : (
                <p className="text-gray-500">No screen time data available.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4">Tab Usage</h2>
              {pieChartData.labels.length > 0 ? (
                <Pie data={pieChartData} options={pieChartOptions} />
              ) : (
                <p className="text-gray-500">No tab usage data available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;