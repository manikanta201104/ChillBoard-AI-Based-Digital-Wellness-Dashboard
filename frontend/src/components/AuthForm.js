import React, { useState } from 'react';
import { signup, login } from '../utils/api';

const AuthForm = ({ type, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userData = type === 'signup'
        ? { username, email, password }
        : { email, password };

      const response = type === 'signup'
        ? await signup(userData)
        : await login(userData);

      localStorage.setItem('jwt', response.token);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  return (
    <div className='bg-white p-6 rounded-lg shadow-md w-full max-w-sm'>
      <h2 className='text-2xl font-bold mb-4 text-center'>
        {type === 'signup' ? 'Sign Up' : 'Login'}
      </h2>
      <form onSubmit={handleSubmit}>
        {type === 'signup' && (
          <input
            type='text'
            placeholder='Username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className='w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            required
          />
        )}
        <input
          type='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
          required
        />
        <input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
          required
        />
        {error && <p className='text-red-500 text-sm mb-4'>{error}</p>}
        <button
          type='submit'
          className='w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition'
        >
          {type === 'signup' ? 'Sign up' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
