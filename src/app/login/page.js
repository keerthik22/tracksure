"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, getCurrentUser } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Demo login function
  const handleDemoLogin = (role) => {
    setLoading(true);
    // Simulate demo user data
    const demoUser = {
      id: `demo-${role}-${Date.now()}`,
      email: `demo-${role}@tracksure.com`,
      profile: {
        id: `demo-${role}-${Date.now()}`,
        full_name: role === 'admin' ? 'Demo Admin' : 'Demo Driver',
        email: `demo-${role}@tracksure.com`,
        role: role
      }
    };
    
    // Store in localStorage for demo mode
    localStorage.setItem('demoUser', JSON.stringify(demoUser));
    localStorage.setItem('demoMode', 'true');
    
    // Redirect based on role
    setTimeout(() => {
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/driver/dashboard');
      }
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Get user profile and redirect based on role
      const user = await getCurrentUser();
      
      if (user?.profile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user?.profile?.role === 'driver') {
        router.push('/driver/dashboard');
      } else {
        setError('User role not found');
        setLoading(false);
      }
    } catch (err) {
      setError('Login failed. Please try demo mode below.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-blue-600 mb-2">TrackSure</h2>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome Back
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Mode Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or try demo mode
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              className="flex items-center justify-center px-4 py-3 border border-blue-300 dark:border-blue-700 rounded-lg shadow-sm text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="mr-2">👨‍💼</span>
              Demo Admin
            </button>
            <button
              onClick={() => handleDemoLogin('driver')}
              disabled={loading}
              className="flex items-center justify-center px-4 py-3 border border-green-300 dark:border-green-700 rounded-lg shadow-sm text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="mr-2">🚗</span>
              Demo Driver
            </button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Demo mode uses mock data - no Supabase setup required
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
