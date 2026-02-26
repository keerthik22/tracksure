"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Redirect based on role
      if (currentUser.profile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (currentUser.profile?.role === 'driver') {
        router.push('/driver/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-blue-600 mb-2">
              🚚 TrackSure
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Real-Time Delivery Tracking System
            </p>
          </div>

          {/* Main Headline */}
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Monitor Deliveries in Real-Time
          </h2>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Affordable tracking solution for small delivery businesses. 
            Prevent fake deliveries, reduce fuel misuse, and track your drivers live.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/register"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-all"
            >
              Login
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Live Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor your drivers in real-time on an interactive map
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📸</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Geo-Verified Proof
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Delivery photos with GPS verification to prevent fraud
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Simple Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track orders, distance, and driver performance easily
              </p>
            </div>
          </div>

          {/* Target Users */}
          <div className="mt-16 bg-blue-50 dark:bg-gray-800 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect For
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 font-medium">
                🛒 Grocery Shops
              </span>
              <span className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 font-medium">
                💊 Pharmacies
              </span>
              <span className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 font-medium">
                💧 Water Suppliers
              </span>
              <span className="px-4 py-2 bg-white dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 font-medium">
                📦 Small Couriers
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
