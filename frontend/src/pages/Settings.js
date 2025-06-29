import React,{ useState } from "react";

const Settings=()=>{
    const [webcamEnabled,setWebcamEnabled]=useState(false);
    const [notificationFrequency,setNotificationFrequency]=useState('Off');
    const [showNameOnLeaderboard, setShowNameOnLeaderboard]=useState(true);

    return(
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">Settings</h1>
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">WebCam Settings</h2>
                    <label className="flex items-center space-x-3">
                        <input
                        type='checkbox'
                        checked={webcamEnabled}
                        onChange={()=>setWebcamEnabled(!webcamEnabled)}
                        className="2-5 h-5 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-gray-600">Enable Webcam for Mood Detection</span>
                    </label>
                </div>
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Notification Settings</h2>
                    <select
                    value={notificationFrequency}
                    onChange={(e)=>setNotificationFrequency(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value='Off'>Off</option>
                        <option value='Every 2 hours'>Every 2 hours</option>
                        <option value='Every 4 hours'>Every 4 hours</option>
                    </select>
                </div>
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Challenge Settings</h2>
                    <label className="flex items-center space-x-3">
                        <input 
                            type='checkbox'
                            checked={showNameOnLeaderboard}
                            onChange={()=>setShowNameOnLeaderboard(!showNameOnLeaderboard)}
                            className="w-5 h-5 text-gray-600 focus:ring-green-500"
                        />
                        <span className="text-gray-600">Show My Name on Leaderboard</span>
                    </label>
                    {showNameOnLeaderboard && <p className="text-sm text-gray-500 mt-1">Switch off for anonymous participation.</p>}
                </div>
            </div>
        </div>
    );
};

export default Settings;