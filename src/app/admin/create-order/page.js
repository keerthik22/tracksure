"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase, signOut } from '@/lib/supabaseClient';

export default function CreateOrder() {
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickupGeoLoading, setPickupGeoLoading] = useState(false);
  const [dropGeoLoading, setDropGeoLoading] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
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
  const [showRouteMap, setShowRouteMap] = useState(false);
  const router = useRouter();
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  const geocodePickupAddress = async () => {
    setError('');

    if (!formData.pickupAddress) {
      setError('Please enter a pickup address first.');
      return;
    }

    if (!mapsKey) {
      setError('Google Maps API key is not configured.');
      return;
    }

    try {
      setPickupGeoLoading(true);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          formData.pickupAddress
        )}&key=${mapsKey}`
      );

      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        setError('Unable to find coordinates for this pickup address.');
        return;
      }

      const location = data.results[0].geometry.location;

      setFormData((prev) => ({
        ...prev,
        pickupLat: location.lat.toString(),
        pickupLng: location.lng.toString()
      }));
    } catch (err) {
      setError('Failed to fetch pickup coordinates. Please try again.');
      console.error('Geocoding error:', err);
    } finally {
      setPickupGeoLoading(false);
    }
  };

  const useCurrentLocationForPickup = () => {
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setCurrentLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        let resolvedAddress = formData.pickupAddress;

        if (mapsKey) {
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${mapsKey}`
            );
            const data = await res.json();
            if (data.status === 'OK' && data.results?.length) {
              resolvedAddress = data.results[0].formatted_address;
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
          }
        }

        setFormData((prev) => ({
          ...prev,
          pickupAddress: resolvedAddress || prev.pickupAddress,
          pickupLat: latitude.toString(),
          pickupLng: longitude.toString()
        }));
        setCurrentLocationLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Unable to get your current location. Please enable location services.');
        setCurrentLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const geocodeDropAddress = async () => {
    setError('');

    if (!formData.dropAddress) {
      setError('Please enter a drop address first.');
      return;
    }

    if (!mapsKey) {
      setError('Google Maps API key is not configured.');
      return;
    }

    try {
      setDropGeoLoading(true);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          formData.dropAddress
        )}&key=${mapsKey}`
      );

      const data = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        setError('Unable to find coordinates for this drop address.');
        return;
      }

      const location = data.results[0].geometry.location;

      setFormData((prev) => ({
        ...prev,
        dropLat: location.lat.toString(),
        dropLng: location.lng.toString()
      }));
    } catch (err) {
      setError('Failed to fetch drop coordinates. Please try again.');
      console.error('Geocoding error:', err);
    } finally {
      setDropGeoLoading(false);
    }
  };

  const calculateDistance = async () => {
    setError('');

    const lat1 = parseFloat(formData.pickupLat);
    const lng1 = parseFloat(formData.pickupLng);
    const lat2 = parseFloat(formData.dropLat);
    const lng2 = parseFloat(formData.dropLng);

    if (!lat1 || !lng1 || !lat2 || !lng2) {
      setError('Please set both pickup and drop locations first.');
      return;
    }

    if (!mapsKey) {
      setError('Google Maps API key is not configured.');
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lng1}&destination=${lat2},${lng2}&mode=driving&key=${mapsKey}`
      );

      const data = await response.json();

      if (data.status !== 'OK' || !data.routes?.length || !data.routes[0].legs?.length) {
        setError('Unable to calculate driving distance for this route.');
        return;
      }

      const meters = data.routes[0].legs[0].distance.value; // meters
      const km = meters / 1000;

      setFormData((prev) => ({
        ...prev,
        plannedDistance: km.toFixed(2)
      }));
    } catch (err) {
      console.error('Directions API error:', err);
      setError('Failed to calculate driving distance. Please try again.');
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
          {/* Pickup Address with auto-coordinate lookup and current location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Pickup Address
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <input
                  type="text"
                  name="pickupAddress"
                  required
                  value={formData.pickupAddress}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="123 Main Street, City"
                />
                <button
                  type="button"
                  onClick={geocodePickupAddress}
                  disabled={pickupGeoLoading}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pickupGeoLoading ? 'Using address...' : 'Use'}
                </button>
              </div>
              <button
                type="button"
                onClick={useCurrentLocationForPickup}
                disabled={currentLocationLoading}
                className="self-start px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentLocationLoading ? 'Getting current location...' : 'Current Location'}
              </button>
            </div>
          </div>

            {/* Drop Address with auto-coordinate lookup */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Drop Address
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  name="dropAddress"
                  required
                  value={formData.dropAddress}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="456 Oak Avenue, City"
                />
                <button
                  type="button"
                  onClick={geocodeDropAddress}
                  disabled={dropGeoLoading}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dropGeoLoading ? 'Using...' : 'Use'}
                </button>
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
              <button
                type="button"
                onClick={() => setShowRouteMap(true)}
                disabled={
                  !mapsKey ||
                  !formData.pickupLat ||
                  !formData.pickupLng ||
                  !formData.dropLat ||
                  !formData.dropLng
                }
                className="mt-3 px-4 py-2 bg-[#E6E6E6] text-gray-800 rounded-lg hover:bg-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Map
              </button>
            </div>

            {/* Route Map */}
            {showRouteMap && mapsKey && formData.pickupLat && formData.pickupLng && formData.dropLat && formData.dropLng && (
              <div className="mt-4 h-72 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <iframe
                  title="Planned route"
                  width="100%"
                  height="100%"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/directions?key=${mapsKey}&origin=${formData.pickupLat},${formData.pickupLng}&destination=${formData.dropLat},${formData.dropLng}&mode=driving`}
                />
              </div>
            )}

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
