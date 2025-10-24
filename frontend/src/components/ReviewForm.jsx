import React, { useState } from 'react';
import { submitReview } from '../utils/api';

// ReviewForm.jsx
// Standalone component to submit a review. Validates inputs and POSTs to /api/reviews.
export default function ReviewForm() {
  const [form, setForm] = useState({ name: '', email: '', rating: 5, text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const isLoggedIn = !!localStorage.getItem('jwt');

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.text || form.text.trim().length < 10) {
      setMsg('Please enter at least 10 characters in your review.');
      return false;
    }
    const rating = Number(form.rating);
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      setMsg('Rating must be between 1 and 5.');
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setMsg('Please enter a valid email.');
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!isLoggedIn) {
      setMsg('Please login to submit a review.');
      return;
    }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitReview({
        name: form.name,
        email: form.email,
        rating: Number(form.rating),
        text: form.text,
      });
      setForm({ name: '', email: '', rating: 5, text: '' });
      setMsg('Thanks! Your review is pending approval.');
    } catch (e) {
      setMsg('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            name="name"
            type="text"
            placeholder="Your name (optional)"
            value={form.name}
            onChange={onChange}
            className="border border-slate-300 rounded-lg p-3"
          />
          <input
            name="email"
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={onChange}
            className="border border-slate-300 rounded-lg p-3"
          />
          <select
            name="rating"
            value={form.rating}
            onChange={onChange}
            className="border border-slate-300 rounded-lg p-3"
          >
            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="bg-slate-600 text-white rounded-lg px-4 py-3 disabled:bg-slate-400"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
        <textarea
          name="text"
          placeholder="Share your experience..."
          value={form.text}
          onChange={onChange}
          rows={3}
          className="w-full border border-slate-300 rounded-lg p-3"
          required
        />
        {!!msg && <p className="text-sm text-slate-600">{msg}</p>}
        <p className="text-xs text-slate-500">Your review will be visible after admin approval.</p>
      </form>
    </div>
  );
}
