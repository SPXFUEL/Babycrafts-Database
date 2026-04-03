-- ==========================================
-- BABYCRAFTS DATABASE FIXES (Aangepast)
-- ==========================================

-- ==========================================
-- FIX 1: Verwijder oude fase constraint
-- ==========================================

-- Check of constraint bestaat en verwijder deze
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_huidige_fase_check;

-- ==========================================
-- FIX 2: Voeg nieuwe constraint toe (0-16)
-- ==========================================

ALTER TABLE orders 
    ADD CONSTRAINT orders_huidige_fase_check 
    CHECK (huidige_fase >= 0 AND huidige_fase <= 16);

-- ==========================================
-- FIX 3: Zorg dat RLS aan staat voor orders
-- ==========================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FIX 4: Verwijder oude policies
-- ==========================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable all operations for authenticated users only" ON orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON orders;

-- ==========================================
-- FIX 5: Maak nieuwe policy aan
-- ==========================================

-- Policy voor anon (niet ingelogd) - alleen lezen
CREATE POLICY "Allow read for anon" 
    ON orders 
    FOR SELECT 
    TO anon 
    USING (true);

-- Policy voor authenticated - alle operaties
CREATE POLICY "Allow all for authenticated" 
    ON orders 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ==========================================
-- CHECK: Laat zien wat er is veranderd
-- ==========================================

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
AND conname = 'orders_huidige_fase_check';

SELECT 
    tablename,
    policyname,
    roles::text,
    cmd
FROM pg_policies 
WHERE tablename = 'orders';

SELECT 'Fixes toegepast! Test nu de app.' as resultaat;
