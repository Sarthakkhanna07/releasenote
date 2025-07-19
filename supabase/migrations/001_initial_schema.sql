-- Create tables for Release Notes Generator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('github', 'jira', 'linear')),
  external_id TEXT NOT NULL,
  encrypted_credentials JSONB NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, type, external_id)
);

-- Create release_notes table
CREATE TABLE IF NOT EXISTS release_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  version TEXT,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_html TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- Create ticket_cache table
CREATE TABLE IF NOT EXISTS ticket_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  external_ticket_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  type TEXT,
  labels JSONB DEFAULT '[]'::jsonb,
  url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(integration_id, external_ticket_id)
);

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_release_notes_org_id ON release_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_release_notes_integration_id ON release_notes(integration_id);
CREATE INDEX IF NOT EXISTS idx_ticket_cache_integration_id ON ticket_cache(integration_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_org_id ON subscribers(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organizations: Users can only see organizations they are members of
CREATE POLICY organizations_policy ON organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Allow users to see organizations they are members of
CREATE POLICY organizations_select_policy ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_members.organization_id
      FROM organization_members
      WHERE organization_members.user_id = auth.uid()
    )
  );

-- Allow any authenticated user to insert new organizations
CREATE POLICY organizations_insert_policy ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Integrations: Users can only see integrations for organizations they are members of
CREATE POLICY integrations_policy ON integrations
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Release Notes: Users can only see release notes for organizations they are members of
CREATE POLICY release_notes_policy ON release_notes
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Ticket Cache: Users can only see tickets for integrations they have access to
CREATE POLICY ticket_cache_policy ON ticket_cache
  FOR ALL USING (
    integration_id IN (
      SELECT i.id FROM integrations i
      JOIN organization_members om ON i.org_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Subscribers: Users can only see subscribers for organizations they are members of
CREATE POLICY subscribers_policy ON subscribers
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Organization Members: Users can only see their own membership row (recursion-free)
CREATE POLICY organization_members_select_policy ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Organization Members: Users can only insert their own membership
CREATE POLICY organization_members_insert_policy ON organization_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Organization Members: Users can only update their own membership
CREATE POLICY organization_members_update_policy ON organization_members
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Organization Members: Users can only delete their own membership
CREATE POLICY organization_members_delete_policy ON organization_members
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_release_notes_updated_at
BEFORE UPDATE ON release_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 