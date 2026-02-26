"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser, supabase, signOut } from '@/lib/supabaseClient';

export default function DeliverOrder() {
  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const router = useRouter();
  const params = useParams();
  const orderId = params.id;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrder();
      getCurrentLocation();
    }
  }, [user]);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.profile?.role !== 'driver') {
      router.push('/login');
      return;
    }
    setUser(currentUser);
  };

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      setError('Order not found');
      setLoading(false);
      return;
    }

    setOrder(data);
    setLoading(false);
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Calculate distance from drop location if order exists
          if (order) {
            calculateDistance(location, order);
          }
        },
        (error) => {
          setError('Unable to get your location. Please enable location services.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const calculateDistance = (current, orderData) => {
    // Haversine formula to calculate distance
    const R = 6371; // Earth's radius in kilometers
    const dLat = (orderData.drop_lat - current.latitude) * Math.PI / 180;
    const dLng = (orderData.drop_lng - current.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(current.latitude * Math.PI / 180) * Math.cos(orderData.drop_lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c * 1000; // Convert to meters

    setDistance(dist.toFixed(0));
  };

  useEffect(() => {
    if (currentLocation && order) {
      calculateDistance(currentLocation, order);
    }
  }, [currentLocation, order]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleMarkAsDelivered = async () => {
    setError('');

    // Check if within 50 meters
    if (distance > 50) {
      setError(`You are ${distance}m away from the delivery location. You must be within 50 meters to complete delivery.`);
      return;
    }

    if (!selectedImage) {
      setError('Please upload a delivery proof image');
      return;
    }

    setUploading(true);

    try {
      // Upload image to Supabase Storage
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${orderId}_${Date.now()}.${fileExt}`;
      const filePath = `delivery-proofs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('delivery-proofs')
        .upload(filePath, selectedImage);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('delivery-proofs')
        .getPublicUrl(filePath);

      // Insert delivery proof
      const { error: proofError } = await supabase
        .from('delivery_proofs')
        .insert([
          {
            order_id: orderId,
            driver_id: user.id,
            image_url: publicUrl,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            delivered_at: new Date().toISOString()
          }
        ]);

      if (proofError) throw proofError;

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Success - redirect to dashboard
      router.push('/driver/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to complete delivery');
    } finally {
      setUploading(false);
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

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400">Order not found</p>
          <Link href="/driver/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isWithinRange = distance !== null && distance <= 50;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6 max-w-2xl mx-auto">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/driver/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Deliver Order
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Complete the delivery process
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          {/* Order ID */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Order ID
            </label>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-lg font-mono text-gray-900 dark:text-white">
                #{order.id.substring(0, 8)}
              </p>
            </div>
          </div>

          {/* Drop Address */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Drop Address
            </label>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-900 dark:text-white">
                {order.drop_address}
              </p>
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                Lat: {order.drop_lat.toFixed(6)}, Lng: {order.drop_lng.toFixed(6)}
              </p>
            </div>
          </div>

          {/* Drop Location Map */}
          {mapsKey && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Drop Location Map
              </label>
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                <iframe
                  title="Drop location"
                  width="100%"
                  height="300"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${order.drop_lat},${order.drop_lng}&zoom=16`}
                />
              </div>
            </div>
          )}

          {/* Delivery Status */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Delivery Status
            </label>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                <p className="text-amber-800 dark:text-amber-300 font-medium">
                  {order.status === 'assigned' ? 'Out for Delivery' : order.status.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Current Location Status */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Current Location Status
            </label>
            <div className={`p-4 rounded-lg border ${
              isWithinRange 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className={`w-5 h-5 ${isWithinRange ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className={`font-medium ${isWithinRange ? 'text-green-800 dark:text-green-300' : 'text-blue-800 dark:text-blue-300'}`}>
                  {distance !== null ? (
                    distance <= 50 ? (
                      `✅ Within delivery range (${distance}m away)`
                    ) : (
                      `${distance}m away from destination`
                    )
                  ) : (
                    'Getting your location...'
                  )}
                </p>
              </div>
              {currentLocation && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Upload Delivery Proof
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
              disabled={!isWithinRange}
            />
            <label
              htmlFor="image-upload"
              className={`${isWithinRange ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} flex flex-col items-center`}
            >
              {imagePreview ? (
                <div className="mb-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded-lg shadow-md"
                  />
                </div>
              ) : (
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
              <p className="text-blue-600 dark:text-blue-400 font-medium mb-1">
                Click to upload image
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                PNG, JPG up to 10MB
              </p>
              {!isWithinRange && (
                <p className="text-red-500 text-sm mt-2">
                  Get within 50m of delivery location to upload
                </p>
              )}
            </label>
          </div>
          {selectedImage && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Selected: {selectedImage.name}
            </p>
          )}
        </div>

        {/* Mark as Delivered Button */}
        <button
          onClick={handleMarkAsDelivered}
          disabled={!isWithinRange || !selectedImage || uploading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div className="flex items-center justify-center gap-2">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Mark as Delivered</span>
              </>
            )}
          </div>
        </button>

        {(!isWithinRange || !selectedImage) && (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-3">
            {!isWithinRange && 'Get within 50m of delivery location and '}
            {!selectedImage && 'upload a photo to complete delivery'}
          </p>
        )}
      </main>
    </div>
  );
}
