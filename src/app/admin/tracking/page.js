"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase, signOut } from '@/lib/supabaseClient';

export default function LiveTracking() {
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (!selectedDriver) return;

    fetchDriverLocation();

    // Subscribe to real-time location updates
    const subscription = supabase
      .channel('driver-location')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${selectedDriver}`
        },
        (payload) => {
          setDriverLocation(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDriver]);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    setUser(currentUser);
  };

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');

    if (error) {
      console.error('Error fetching drivers:', error);
      return;
    }

    setDrivers(data || []);
    setLoading(false);
  };

  const fetchDriverLocation = async () => {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', selectedDriver)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setDriverLocation(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedDriverData = drivers.find(d => d.id === selectedDriver);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/admin/dashboard" className="text-2xl font-bold text-blue-600">
                TrackSure Admin
              </Link>
              <Link href="/admin/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">
                Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">{user.profile?.full_name}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Live Driver Tracking</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor driver locations in real-time</p>
        </div>

        {/* Driver Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Select Driver to Track
          </label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">-- Select a driver --</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name} ({driver.email})
              </option>
            ))}
          </select>
        </div>

        {/* Map Container */}
        {selectedDriver && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Tracking: {selectedDriverData?.full_name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Email: {selectedDriverData?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 dark:text-green-400 font-medium">Live</span>
                </div>
              </div>
            </div>

            {/* Map View using Google Maps Embed API */}
            <div className="h-96 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {driverLocation && mapsKey ? (
                <iframe
                  title="Driver live location"
                  width="100%"
                  height="100%"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${driverLocation.latitude},${driverLocation.longitude}&zoom=15`}
                />
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">📍</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Waiting for location data...
                  </p>
                </div>
              )}
            </div>

            {/* Location Info */}
            {driverLocation && (
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Latitude</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {driverLocation.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Longitude</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {driverLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Update</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {new Date(driverLocation.recorded_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedDriver && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📍</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Select a driver from the dropdown above to start tracking
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
