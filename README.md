# 🚀 TrackSure - Delivery Tracking System

A modern web-based delivery tracking system built with **Next.js 14** and **Supabase** for small local delivery businesses.

## 📋 Features

### 🔐 Authentication
- User registration and login
- Role-based access (Admin/Driver)
- Secure session management

### 👨‍💼 Admin Features
- **Dashboard**: View total orders, delivered orders, active drivers, and total distance
- **Create Order**: Assign delivery orders to drivers with geo-coordinates
- **Live Tracking**: Real-time driver location monitoring
- **Order Management**: Track all orders and their statuses

### 🚗 Driver Features
- **Dashboard**: View assigned orders and delivery statistics
- **Live Location Tracking**: Automatic GPS location updates every 15 seconds
- **Geo-Verified Delivery**: 
  - Must be within 50 meters of drop location
  - Photo proof required
  - GPS coordinates recorded with delivery

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Maps**: Built-in geolocation (can be extended with React Leaflet)

## 📦 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API

### 3. Create Database Tables

Run these SQL queries in your Supabase SQL Editor:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  pickup_lat FLOAT NOT NULL,
  pickup_lng FLOAT NOT NULL,
  drop_lat FLOAT NOT NULL,
  drop_lng FLOAT NOT NULL,
  driver_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'delivered')),
  planned_distance FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver locations table
CREATE TABLE driver_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES profiles(id) NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery proofs table
CREATE TABLE delivery_proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) NOT NULL,
  driver_id UUID REFERENCES profiles(id) NOT NULL,
  image_url TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Orders are viewable by authenticated users" 
  ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert orders" 
  ON orders FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Orders can be updated by assigned driver or admin" 
  ON orders FOR UPDATE TO authenticated USING (
    driver_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Driver locations viewable by authenticated users" 
  ON driver_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Drivers can insert their own locations" 
  ON driver_locations FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Delivery proofs viewable by authenticated users" 
  ON delivery_proofs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Drivers can insert delivery proofs" 
  ON delivery_proofs FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
```

### 4. Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `delivery-proofs`
3. Set it to **Public**

### 5. Configure Environment Variables

Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📱 Usage

### For Admins:
1. Register with role "Admin"
2. Login and access admin dashboard
3. Create orders and assign to drivers
4. Track drivers in real-time
5. View delivery statistics

### For Drivers:
1. Register with role "Driver"
2. Login and view assigned orders
3. Location tracking starts automatically
4. Navigate to delivery location
5. Take photo proof when within 50m
6. Mark order as delivered

## 🔄 Workflow

1. **Admin creates order** → assigns pickup/drop locations and driver
2. **Driver receives order** → sees it on dashboard
3. **Driver navigates** → system tracks location every 15 seconds
4. **Admin monitors** → watches live location on map
5. **Driver arrives** → within 50m of destination
6. **Driver uploads photo** → with GPS verification
7. **Order marked delivered** → proof saved with timestamp

## 🚀 Future Enhancements

- Multi-branch support
- Customer tracking links
- AI-based route optimization
- SMS/Email notifications
- Advanced analytics
- Mobile app version

