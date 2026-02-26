"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabase, signOut } from '@/lib/supabaseClient';

export default function DriverDashboard() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0
  });
  const [locationTracking, setLocationTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
      startLocationTracking();
    }
  }, [user]);

  const checkAuth = async () => {
    // Check for demo mode
    const demoMode = typeof window !== 'undefined' && localStorage.getItem('demoMode') === 'true';
    const demoUser = typeof window !== 'undefined' && localStorage.getItem('demoUser');
    
    if (demoMode && demoUser) {
      const parsedUser = JSON.parse(demoUser);
      if (parsedUser.profile?.role !== 'driver') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
      setIsDemoMode(true);
      fetchOrders(true, parsedUser);
      setLocationTracking(true); // Simulate tracking in demo
      return;
    }

    // Regular auth check
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.profile?.role !== 'driver') {
      router.push('/login');
      return;
    }
    setUser(currentUser);
  };

  const fetchOrders = async (demoMode = false, demoUser = null) => {
    if (demoMode) {
      // Mock orders for demo
      const mockOrders = [
        {
          id: 'demo-order-1',
          pickup_address: '123 Main Street, Downtown',
          drop_address: '456 Oak Avenue, Uptown',
          pickup_lat: 40.7128,
          pickup_lng: -74.0060,
          drop_lat: 40.7589,
          drop_lng: -73.9851,
          driver_id: demoUser.id,
          status: 'assigned',
          planned_distance: 5.2,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-order-2',
          pickup_address: '789 Pine Street, Midtown',
          drop_address: '321 Elm Road, Suburb',
          pickup_lat: 40.7489,
          pickup_lng: -73.9680,
          drop_lat: 40.7614,
          drop_lng: -73.9776,
          driver_id: demoUser.id,
          status: 'delivered',
          planned_distance: 3.8,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      setOrders(mockOrders);
      setStats({ total: 2, delivered: 1, pending: 1 });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    setOrders(data || []);

    // Calculate stats
    const total = data?.length || 0;
    const delivered = data?.filter(o => o.status === 'delivered').length || 0;
    const pending = data?.filter(o => o.status === 'assigned').length || 0;

    setStats({ total, delivered, pending });
    setLoading(false);
  };

  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      setLocationTracking(true);
      
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          // Insert location into database every update
          await supabase.from('driver_locations').insert([
            {
              driver_id: user.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              recorded_at: new Date().toISOString()
            }
          ]);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      // Store watchId to clear later if needed
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  };

  const handleSignOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('demoUser');
      localStorage.removeItem('demoMode');
      router.push('/');
    } else {
      await signOut();
      router.push('/');
    }
  };

  if (!user || loading) {
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
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-blue-600">TrackSure Driver</h1>
              {isDemoMode && (
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-semibold">
                  DEMO MODE
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${locationTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {locationTracking ? 'Tracking Active' : 'Tracking Off'}
                </span>
              </div>
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
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your deliveries</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Pending</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pending}</p>
              </div>
              <div className="text-4xl">⏳</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Delivered</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.delivered}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">My Orders</h3>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 dark:text-gray-400">No orders assigned yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          Order #{order.id.substring(0, 8)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : order.status === 'assigned'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">From:</p>
                          <p className="text-gray-900 dark:text-white font-medium">{order.pickup_address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">To:</p>
                          <p className="text-gray-900 dark:text-white font-medium">{order.drop_address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Distance: {order.planned_distance} km
                          </p>
                        </div>
                      </div>
                    </div>

                    {order.status === 'assigned' && (
                      <Link
                        href={`/driver/order/${order.id}`}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Deliver
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
