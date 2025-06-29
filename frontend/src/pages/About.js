import React,{useState} from "react";
import { sendContactMessage } from "../utils/api";

const About=()=>{
    const[formData,setFormData]=useState({name:'',email:'',message:''});
    const[messageStatus,setMessageStatus]=useState('');

    const handleChange=(e)=>{
        setFormData({...formData,[e.target.name]:e.target.value});
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await sendContactMessage(formData);
            setMessageStatus('Message sent successfully');
            setFormData({ name: '', email: '', message: '' });
            setTimeout(() => setMessageStatus(''), 3000);
        } catch (error) {
            setMessageStatus('Failed to send message');
            setTimeout(() => setMessageStatus(''), 3000);
            console.error('Contact error:', error);
        }
    }
    return(
        <div className="min-h-screen bg-white p-6">
            <h1 className="text-4xl font-bold text-blue-800 text-center mb-8">About ChillBoard & Help</h1>
            <div className="max-w-3xl mx-auto bg-gray-50 p-6 rounded-lg shadow-md">
                <section className="mb-6">
                    <h2 className="text-2xl font-semibold tedxt-blue-800 mb-2">
                        Mission Statement
                    </h2>
                    <p className="text-gray-700">
                        ChillBoard aims to combat digital fatigue with AI-driven wellness tools. Our mission is to help users achieve a balanced digital life by tracking screen time, detecting moods, and offering personalized recommendations , all while fostering a supportive community through challenges.
                    </p>
                </section>
                <section className="mb-6">
                    <h2 className="text-2xl font-semibold text-blue-800 mb-2">Guides</h2>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                        <li>Install the Chrome extension to track your screen time.</li>
                        <li>Enable mood detection via the Settings page to personalize your experience.</li>
                        <li>Join a challenge from the Challenges page to engage with the community.</li>
                        <li>Explore your Profie page for trends and saved Spotify playlists.</li>
                    </ol>
                </section>
                <section>
                    <h2 className="text-2xl font-semibold text-blue-800 mb-2">Privacy Policy</h2>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                        <li>Webcam data is processed locally and never stored or shared.</li>
                        <li>Screen time data is encrypted and accessible only to the user.</li>
                        <li>Spotify data integration is user-controlled and can be unlinked at any time.</li>
                        <li>We adhere to strict data minimixation and user consent principles.</li>
                    </ul>
                </section>
                <section>
                    <h2 className="text-2xl font-semibold text-blue-800 mb-2">Contact Us</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700">Name</label>
                            <input 
                                type='text'
                                name='name'
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700">Email</label>
                            <input 
                                type='email'
                                name='email'
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="bloc text-gray-700">Message</label>
                            <textarea 
                                name='message'
                                value={formData.message}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-blue-500"
                                rows='4'
                                required
                            />
                        </div>
                        <button
                        type="submit"
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Submit
                        </button>
                    </form>
                    {messageStatus && <p className="mt-4 text-center text-green-600">{messageStatus}</p>}
                </section>
            </div>
        </div>
    );
};

export default About;