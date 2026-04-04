-- ==========================================
-- BABYCRAFTS DATABASE FIX - RLS Policy Update
-- ==========================================

-- ==========================================
-- FIX: Allow anon to perform ALL operations on orders
-- This is needed because the app uses client-side PIN login
-- ==========================================

-- Verwijder oude policies
DROP POLICY IF EXISTS "Allow read for anon" ON orders;
DROP POLICY IF EXISTS "Allow all for authenticated" ON orders;

-- Nieuwe policy: Anon mag alles doen (nodig voor PIN-based login)
CREATE POLICY "Allow all for anon" 
    ON orders 
    FOR ALL 
    TO anon 
    USING (true) 
    WITH CHECK (true);

-- Policy voor authenticated (voor als je later echte auth toevoegt)
CREATE POLICY "Allow all for authenticated" 
    ON orders 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ==========================================
-- CHECK: Verify policies are set
-- ==========================================

SELECT 
    tablename,
    policyname,
    roles::text,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'orders';

SELECT 'RLS policies updated! Anon can now insert orders.' as resultaat;
