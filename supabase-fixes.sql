-- ==========================================
-- BABYCRAFTS DATABASE FIXES
-- Copy-paste dit hele script in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- FIX 1: Remove fase constraint (allows fases 0-16)
-- This fixes "Naar Bronsgieterij" button
-- ==========================================

-- First, check if the constraint exists
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_huidige_fase_check' 
        AND conrelid = 'orders'::regclass
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_huidige_fase_check;
        RAISE NOTICE 'Constraint orders_huidige_fase_check removed successfully';
    ELSE
        RAISE NOTICE 'Constraint orders_huidige_fase_check not found - may already be removed';
    END IF;
END $$;

-- Add new constraint with extended range (0-16)
-- This allows all workflow fases including:
--   13 = Bij Lemarez (spuiten)
--   14 = Terug van Lemarez  
--   15 = Bij Bronsgieterij (gieten)
--   16 = Terug van Bronsgieterij
ALTER TABLE orders 
    ADD CONSTRAINT orders_huidige_fase_check 
    CHECK (huidige_fase >= 0 AND huidige_fase <= 16);

-- ==========================================
-- FIX 2: Fix RLS policies for orders table
-- This fixes order creation
-- ==========================================

-- Enable RLS on orders table (if not already enabled)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable all operations for authenticated users only" ON orders;

-- Create policy that allows all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users only" 
    ON orders 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ==========================================
-- FIX 3: Fix RLS policies for users table
-- This fixes the "permission denied for table users" error
-- ==========================================

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all operations for authenticated users only" ON users;

-- Create policy that allows all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users only" 
    ON users 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ==========================================
-- FIX 4: Ensure required columns exist
-- ==========================================

-- Add workflow column if missing (used for Atelier-Bronze and Gegoten Brons)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'workflow'
    ) THEN
        ALTER TABLE orders ADD COLUMN workflow TEXT DEFAULT 'standard';
        RAISE NOTICE 'Added workflow column';
    END IF;
END $$;

-- ==========================================
-- VERIFICATION: Check if fixes are applied
-- ==========================================

-- Show current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname LIKE '%fase%';

-- Show RLS policies for orders
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('orders', 'users');

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
SELECT 'All fixes applied successfully! Refresh the app and test:' as status;
SELECT '1. Create a new order (should work now)' as test_1;
SELECT '2. Advance Atelier-Bronze order to fase 13 (Bij Lemarez)' as test_2;
SELECT '3. Advance Gegoten Brons order to fase 15 (Bij Bronsgieterij)' as test_3;
