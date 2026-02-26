"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase, signOut } from '@/lib/supabaseClient';

export default function CreateOrder() {
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    dropAddress: '',
    pickupLat: '',
    pickupLng: '',
    dropLat: '',
    dropLng: '',
    driverId: '',
    plannedDistance: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchDrivers();
  }, []);

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
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const calculateDistance = () => {
    // Simple mock calculation - In production, use Google Directions API
    const lat1 = parseFloat(formData.pickupLat);
    const lng1 = parseFloat(formData.pickupLng);
    const lat2 = parseFloat(formData.dropLat);
    const lng2 = parseFloat(formData.dropLng);

    if (lat1 && lng1 && lat2 && lng2) {
      // Haversine formula for distance
      const R = 6371; // Radius of Earth in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      setFormData({
        ...formData,
        plannedDistance: distance.toFixed(2)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            pickup_address: formData.pickupAddress,
            drop_address: formData.dropAddress,
            pickup_lat: parseFloat(formData.pickupLat),
            pickup_lng: parseFloat(formData.pickupLng),
            drop_lat: parseFloat(formData.dropLat),
            drop_lng: parseFloat(formData.dropLng),
            driver_id: formData.driverId,
            status: 'assigned',
            planned_distance: parseFloat(formData.plannedDistance)
          }
        ])
        .select();

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create New Order</h2>

          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
              Order created successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pickup Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Pickup Address
              </label>
              <input
                type="text"
                name="pickupAddress"
                required
                value={formData.pickupAddress}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="123 Main Street, City"
              />
            </div>

            {/* Pickup Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Pickup Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="pickupLat"
                  required
                  value={formData.pickupLat}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="40.7128"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Pickup Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="pickupLng"
                  required
                  value={formData.pickupLng}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="-74.0060"
                />
              </div>
            </div>

            {/* Drop Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Drop Address
              </label>
              <input
                type="text"
                name="dropAddress"
                required
                value={formData.dropAddress}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="456 Oak Avenue, City"
              />
            </div>

            {/* Drop Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Drop Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="dropLat"
                  required
                  value={formData.dropLat}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="40.7580"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Drop Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="dropLng"
                  required
                  value={formData.dropLng}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="-73.9855"
                />
              </div>
            </div>

            {/* Calculate Distance Button */}
            <button
              type="button"
              onClick={calculateDistance}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Calculate Distance
            </button>

            {/* Planned Distance */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Planned Distance (km)
              </label>
              <input
                type="number"
                step="any"
                name="plannedDistance"
                required
                value={formData.plannedDistance}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Distance in km"
                readOnly
              />
            </div>

            {/* Select Driver */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Assign to Driver
              </label>
              <select
                name="driverId"
                required
                value={formData.driverId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} ({driver.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Order...' : 'Create Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
