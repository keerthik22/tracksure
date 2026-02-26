-- ==========================================
-- TrackSure Database Setup for Supabase
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fvltvhauvfkncuwowbzn/sql/new
-- ==========================================

-- 1. Profiles table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  drop_lat DOUBLE PRECISION NOT NULL,
  drop_lng DOUBLE PRECISION NOT NULL,
  driver_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_transit', 'delivered')),
  planned_distance DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Driver locations table (for real-time GPS tracking)
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Delivery proofs table
CREATE TABLE IF NOT EXISTS delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, insert/update own
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Orders: everyone can read, admins can insert/update
CREATE POLICY "Anyone can read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update orders" ON orders FOR UPDATE USING (true);

-- Driver locations: everyone can read, drivers can insert
CREATE POLICY "Anyone can read driver_locations" ON driver_locations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert driver_locations" ON driver_locations FOR INSERT WITH CHECK (true);

-- Delivery proofs: everyone can read, drivers can insert
CREATE POLICY "Anyone can read delivery_proofs" ON delivery_proofs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert delivery_proofs" ON delivery_proofs FOR INSERT WITH CHECK (true);

-- ==========================================
-- Enable Realtime for driver_locations
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
