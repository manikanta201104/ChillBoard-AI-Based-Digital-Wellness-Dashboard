import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-slate-600 bg-slate-700 sticky bottom-0 z-40 w-full">
      <div className="max-w-6xl mx-auto px-6 py-8 grid gap-6 md:grid-cols-3 text-slate-300">
        <div>
          <h3 className="text-white font-semibold">ChillBoard</h3>
          <p className="mt-2 text-sm">AI-based digital wellness & productivity dashboard.</p>
        </div>
        <div className="text-sm">
          <h4 className="text-white font-medium">Resources</h4>
          <ul className="mt-2 space-y-2">
            <li><Link className="hover:text-white" to="/about">About</Link></li>
            <li><Link className="hover:text-white" to="/privacy">Privacy Policy</Link></li>
            <li><Link className="hover:text-white" to="/email-policy">Email Policy</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="text-white font-medium">Contact</h4>
          <ul className="mt-2 space-y-2">
            <li><a className="hover:text-white" href="mailto:support@chillboard.in">support@chillboard.in</a></li>
            <li><a className="hover:text-white" href="https://www.chillboard.in" target="_blank" rel="noreferrer">www.chillboard.in</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-600">
        <div className="max-w-6xl mx-auto px-6 py-4 text-xs text-slate-400 flex items-center justify-between">
          <span>© {year} ChillBoard. All rights reserved.</span>
          <span className="hidden sm:inline">Built with ❤️ for focus and well-being.</span>
        </div>
      </div>
    </footer>
  );
}
