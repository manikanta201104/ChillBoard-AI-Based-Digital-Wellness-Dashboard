import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUser,
  adminListChallenges,
  adminCreateChallenge,
  adminUpdateChallenge,
  adminDeleteChallenge,
  adminListContacts,
  adminResolveContact,
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminListReviews,
  adminApproveReview,
} from '../utils/api';

// AdminDashboard.jsx
// - Protects access by verifying user.role === 'admin' on mount
// - Manage Challenges: list/create/edit/delete
// - Manage Contact Us: list + resolve flag
// - Manage Users: list with screen time summaries, deactivate/reset

export default function AdminDashboard() {
  const nav = useNavigate();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [challenges, setChallenges] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({ title: '', goalHours: '', startDate: '', endDate: '', active: true });

  useEffect(() => {
    (async () => {
      try {
        const prof = await getUser();
        if (prof?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          nav('/dashboard');
          return;
        }
        setRoleChecked(true);
      } catch {
        nav('/');
      }
    })();
  }, [nav]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        const [ch, ct, us, rv] = await Promise.all([
          adminListChallenges(),
          adminListContacts(),
          adminListUsers(),
          adminListReviews('pending'),
        ]);
        setChallenges(ch);
        setContacts(ct);
        setUsers(us);
        setPendingReviews(rv);
      } catch (e) {
        setMessage('Failed to load admin data');
        setTimeout(() => setMessage(''), 3000);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const resetForm = () => setForm({ title: '', goalHours: '', startDate: '', endDate: '', active: true });

  const createChallenge = async () => {
    try {
      const created = await adminCreateChallenge(form);
      setChallenges(prev => [created, ...prev]);
      resetForm();
      setMessage('Challenge created');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to create challenge');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Delete a user (admin-only)
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.userId !== userId));
      setMessage('User deleted');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to delete user');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Approve review
  const approveReview = async (id) => {
    try {
      await adminApproveReview(id);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      setMessage('Review approved');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to approve review');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const saveChallenge = async (challengeId, payload) => {
    try {
      const updated = await adminUpdateChallenge(challengeId, payload);
      setChallenges(prev => prev.map(c => (c.challengeId === challengeId ? updated : c)));
      setMessage('Challenge updated');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to update challenge');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteChallenge = async (challengeId) => {
    try {
      await adminDeleteChallenge(challengeId);
      setChallenges(prev => prev.filter(c => c.challengeId !== challengeId));
      setMessage('Challenge deleted');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to delete challenge');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const resolveContact = async (id, resolved) => {
    try {
      const updated = await adminResolveContact(id, resolved);
      setContacts(prev => prev.map(c => (c._id === id ? updated : c)));
    } catch {}
  };

  const updateUser = async (userId, payload) => {
    try {
      await adminUpdateUser(userId, payload);
      setUsers(prev => prev.map(u => (u.userId === userId ? { ...u, ...payload } : u)));
      setMessage('User updated');
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('Failed to update user');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!roleChecked || loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="p-4 rounded bg-white border border-slate-200">Loading admin data…</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-slate-700">Admin Dashboard</h1>
        {message && (
          <div className={`p-3 rounded border ${message.includes('Failed') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>{message}</div>
        )}

        {/* Manage Challenges */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Manage Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <input className="border p-2 rounded" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Goal Hours" type="number" value={form.goalHours} onChange={e => setForm({ ...form, goalHours: e.target.value })} />
            <input className="border p-2 rounded" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <input className="border p-2 rounded" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            <button className="bg-slate-600 text-white rounded px-4" onClick={createChallenge}>Create</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Title</th>
                  <th className="p-2">Goal (h)</th>
                  <th className="p-2">Start</th>
                  <th className="p-2">Duration (days)</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map(ch => (
                  <tr key={ch.challengeId} className="border-b">
                    <td className="p-2">{ch.title}</td>
                    <td className="p-2">{ch.goal}</td>
                    <td className="p-2">{ch.startDate ? new Date(ch.startDate).toLocaleDateString() : '-'}</td>
                    <td className="p-2">{ch.duration}</td>
                    <td className="p-2 space-x-2">
                      <button className="px-2 py-1 rounded bg-slate-100" onClick={() => saveChallenge(ch.challengeId, { title: prompt('New title', ch.title) || ch.title })}>Edit</button>
                      <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => deleteChallenge(ch.challengeId)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manage Contact Us */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Contact Queries</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Message</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c._id} className="border-b">
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{c.email}</td>
                    <td className="p-2 max-w-lg truncate" title={c.message}>{c.message}</td>
                    <td className="p-2">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="p-2">
                      <input type="checkbox" checked={!!c.resolved} onChange={e => resolveContact(c._id, e.target.checked)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Manage Users */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">User</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Total Screen Time (s)</th>
                  <th className="p-2">Days Tracked</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId} className="border-b">
                    <td className="p-2">{u.username}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">
                      <input type="checkbox" checked={!!u.active} onChange={e => updateUser(u.userId, { active: e.target.checked })} />
                    </td>
                    <td className="p-2">{u.totalScreenTime}</td>
                    <td className="p-2">{u.daysTracked}</td>
                    <td className="p-2 space-x-2">
                      <button className="px-2 py-1 rounded bg-slate-100" onClick={() => updateUser(u.userId, { resetChallengeProgress: true })}>Reset Challenges</button>
                      <button className="px-2 py-1 rounded bg-red-600 text-white" onClick={() => deleteUser(u.userId)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reviews moderation */}
        <section className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Reviews</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">User</th>
                  <th className="p-2">Rating</th>
                  <th className="p-2">Text</th>
                  <th className="p-2">Submitted</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.map(rv => (
                  <tr key={rv._id} className="border-b">
                    <td className="p-2">{rv.name || rv.userId}</td>
                    <td className="p-2">{rv.rating}</td>
                    <td className="p-2 max-w-xl truncate" title={rv.text}>{rv.text}</td>
                    <td className="p-2">{new Date(rv.createdAt).toLocaleString()}</td>
                    <td className="p-2">
                      <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => approveReview(rv._id)}>Approve</button>
                    </td>
                  </tr>
                ))}
                {pendingReviews.length === 0 && (
                  <tr><td className="p-2 text-slate-500" colSpan="5">No pending reviews</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
