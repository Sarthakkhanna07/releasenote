-- Fix organizations RLS policies to allow users to create new organizations
-- The current policy blocks INSERT operations because users aren't members yet

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "organizations_policy" ON organizations;

-- Create separate policies for different operations
-- Allow users to view organizations they are members of
CREATE POLICY "organizations_select_policy" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to insert new organizations
-- Allow users to create organizations where the org ID matches their user ID
-- OR where they will be added as a member (for future flexibility)
CREATE POLICY "organizations_insert_policy" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Allow creating org where org.id = user.id (current pattern)
      id = auth.uid()
      -- Future: could add other conditions here
    )
  );

-- Allow users to update organizations they are members of (with admin/owner role)
CREATE POLICY "organizations_update_policy" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Allow users to delete organizations they own
CREATE POLICY "organizations_delete_policy" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );