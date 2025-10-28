import React, { useEffect, useMemo, useState } from 'react';
import { forgotPasswordRequest, forgotPasswordVerify, forgotPasswordReset } from '../utils/api';
import { toast } from 'react-toastify';

// Simple password validator aligned with backend: min 8, letter + number
function validatePassword(pw) {
  return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Optional: show code expiry countdown (10 minutes from last request)
  const [expiresAt, setExpiresAt] = useState(null); // Date
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeLeft = useMemo(() => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - now;
    if (ms <= 0) return 0;
    return Math.ceil(ms / 1000);
  }, [expiresAt, now]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await forgotPasswordRequest(email.trim());
      setMessage(res?.message || 'A verification code has been sent to your email.');
      toast.success('Code sent to your email');
      setStep('code');
      // Set expiry 10 minutes from now (backend rule)
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000).toISOString());
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await forgotPasswordVerify(email.trim(), code.trim());
      setMessage(res?.message || 'Code verified. You may reset your password.');
      toast.success('Code verified');
      setStep('reset');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Code is incorrect or expired.';
      setError('Code is incorrect or expired.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    if (password !== confirm) {
      setLoading(false);
      setError('Passwords do not match');
      return;
    }
    if (!validatePassword(password)) {
      setLoading(false);
      setError('Password must be at least 8 characters and include letters and numbers');
      return;
    }
    try {
      const res = await forgotPasswordReset(email.trim(), code.trim(), password);
      setMessage(res?.message || 'Password has been updated successfully');
      toast.success('Password updated successfully');
      setStep('done');
      // After a short delay, redirect to sign-in
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reset password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await forgotPasswordRequest(email.trim());
      setMessage(res?.message || 'A verification code has been sent to your email.');
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000).toISOString());
      toast.success('Code re-sent');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to re-send code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Forgot Password</h1>
          <p className="text-slate-600 text-sm">Reset your password in three quick steps</p>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-700 font-medium text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full mt-1 px-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 disabled:bg-slate-400"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
            <div className="text-center text-sm text-slate-600">
              <a href="/" className="underline">Back to Sign In</a>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-slate-700 font-medium text-sm">Enter the 6-digit code sent to</label>
              <div className="text-slate-600 text-sm mb-2">{email}</div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                className="w-full mt-1 px-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 tracking-widest text-center text-lg"
              />
              {timeLeft !== null && (
                <div className="mt-2 text-xs text-slate-500">{timeLeft === 0 ? 'Code expired. Request a new code.' : `Code expires in ${timeLeft}s`}</div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resend}
                disabled={loading}
                className="text-slate-600 underline text-sm disabled:text-slate-400"
              >
                Resend Code
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-slate-600 text-white px-5 py-3 rounded-lg hover:bg-slate-700 disabled:bg-slate-400"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-slate-700 font-medium text-sm">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters, include letters and numbers"
                required
                className="w-full mt-1 px-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">Use at least 8 characters, including letters and numbers.</p>
            </div>
            <div>
              <label className="block text-slate-700 font-medium text-sm">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full mt-1 px-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 disabled:bg-slate-400"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Password Reset Successful</h2>
            <p className="text-slate-600 text-sm">Redirecting you to the sign in page...</p>
          </div>
        )}
      </div>
    </div>
  );
}
