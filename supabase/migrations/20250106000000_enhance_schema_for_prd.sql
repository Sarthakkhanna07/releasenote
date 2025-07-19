-- Enhanced schema migration to match PRD requirements
-- This migration enhances the existing schema with additional tables and fields

-- Add missing fields to release_notes table
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published', 'scheduled')) DEFAULT 'draft';
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS source_ticket_ids TEXT[];
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Ensure legacy content column exists for backward compatibility
ALTER TABLE release_notes ADD COLUMN IF NOT EXISTS content TEXT;

-- Now we can make it nullable
ALTER TABLE release_notes ALTER COLUMN content DROP NOT NULL;

-- Create organization_members table for team management
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, user_id)
);

-- Create templates table for release note templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create subscribers table for email notifications
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('active', 'unsubscribed', 'bounced')) DEFAULT 'active',
  UNIQUE(organization_id, email)
);

-- Create ticket_cache table for caching external ticket data
CREATE TABLE IF NOT EXISTS ticket_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'github', 'jira', 'linear'
  ticket_id TEXT NOT NULL,
  ticket_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, integration_type, ticket_id)
);

-- Create user_oauth_states table for OAuth state management
CREATE TABLE IF NOT EXISTS user_oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  state TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, provider, state)
);

CREATE TABLE IF NOT EXISTS public.release_note_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  release_note_id uuid NOT NULL,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text NULL,
  content_markdown text NULL,
  content_html text NULL,
  content_json jsonb NULL,
  created_by uuid NULL,
  change_summary text NULL,
  is_auto_save boolean NULL DEFAULT false,
  CONSTRAINT release_note_versions_pkey PRIMARY KEY (id),
  CONSTRAINT release_note_versions_release_note_id_version_number_key UNIQUE (release_note_id, version_number),
  CONSTRAINT release_note_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
  CONSTRAINT release_note_versions_release_note_id_fkey FOREIGN KEY (release_note_id) REFERENCES release_notes (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS release_note_versions_release_note_id_idx ON public.release_note_versions USING btree (release_note_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS release_note_versions_version_number_idx ON public.release_note_versions USING btree (release_note_id, version_number) TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS public.release_note_publishing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  release_note_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid NULL,
  scheduled_for timestamp with time zone NULL,
  notes text NULL,
  metadata jsonb NULL,
  CONSTRAINT release_note_publishing_history_pkey PRIMARY KEY (id),
  CONSTRAINT release_note_publishing_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users (id),
  CONSTRAINT release_note_publishing_history_release_note_id_fkey FOREIGN KEY (release_note_id) REFERENCES release_notes (id) ON DELETE CASCADE,
  CONSTRAINT release_note_publishing_history_action_check CHECK (
    (
      action = any (
        array[
          'draft_saved'::text,
          'scheduled'::text,
          'published'::text,
          'unpublished'::text,
          'archived'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS release_note_publishing_history_release_note_id_idx ON public.release_note_publishing_history USING btree (release_note_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS release_note_publishing_history_action_idx ON public.release_note_publishing_history USING btree (action) TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS public.release_note_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  release_note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NULL DEFAULT 'editor'::text,
  added_by uuid NULL,
  CONSTRAINT release_note_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT release_note_collaborators_release_note_id_user_id_key UNIQUE (release_note_id, user_id),
  CONSTRAINT release_note_collaborators_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users (id),
  CONSTRAINT release_note_collaborators_release_note_id_fkey FOREIGN KEY (release_note_id) REFERENCES release_notes (id) ON DELETE CASCADE,
  CONSTRAINT release_note_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT release_note_collaborators_role_check CHECK (
    (
      role = any (
        array['editor'::text, 'reviewer'::text, 'viewer'::text]
      )
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS release_note_collaborators_release_note_id_idx ON public.release_note_collaborators USING btree (release_note_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS release_note_collaborators_user_id_idx ON public.release_note_collaborators USING btree (user_id) TABLESPACE pg_default;

-- Add missing organization fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS release_notes_organization_id_status_idx ON release_notes(organization_id, status);
CREATE INDEX IF NOT EXISTS release_notes_author_id_idx ON release_notes(author_id);
CREATE INDEX IF NOT EXISTS release_notes_published_at_idx ON release_notes(published_at);
CREATE INDEX IF NOT EXISTS release_notes_slug_idx ON release_notes(organization_id, slug);

CREATE INDEX IF NOT EXISTS integrations_organization_id_type_idx ON integrations(organization_id, type);

CREATE INDEX IF NOT EXISTS organization_members_organization_id_idx ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS templates_organization_id_idx ON templates(organization_id);
CREATE INDEX IF NOT EXISTS templates_is_default_idx ON templates(organization_id, is_default);

CREATE INDEX IF NOT EXISTS subscribers_organization_id_status_idx ON subscribers(organization_id, status);
CREATE INDEX IF NOT EXISTS subscribers_email_idx ON subscribers(email);

-- Create index only if columns exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_cache' 
        AND column_name = 'organization_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_cache' 
        AND column_name = 'integration_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS ticket_cache_organization_id_type_idx ON ticket_cache(organization_id, integration_type);
    END IF;
END $$;
-- Create index only if column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ticket_cache' 
        AND column_name = 'expires_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS ticket_cache_expires_at_idx ON ticket_cache(expires_at);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_oauth_states_user_id_provider_idx ON user_oauth_states(user_id, provider);
CREATE INDEX IF NOT EXISTS user_oauth_states_expires_at_idx ON user_oauth_states(expires_at);

-- Update RLS policies for new tables

-- Templates policies
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates for their organizations"
  ON templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = templates.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert templates for their organizations"
  ON templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = templates.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update templates for their organizations"
  ON templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = templates.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete templates for their organizations"
  ON templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = templates.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Subscribers policies
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscribers for their organizations"
  ON subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = subscribers.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert subscribers for their organizations"
  ON subscribers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = subscribers.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update subscribers for their organizations"
  ON subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = subscribers.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete subscribers for their organizations"
  ON subscribers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = subscribers.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Ticket cache policies
ALTER TABLE ticket_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket cache for their organizations"
  ON ticket_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.id = ticket_cache.integration_id
      AND o.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert ticket cache for their organizations"
  ON ticket_cache FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.id = ticket_cache.integration_id
      AND o.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update ticket cache for their organizations"
  ON ticket_cache FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.id = ticket_cache.integration_id
      AND o.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete ticket cache for their organizations"
  ON ticket_cache FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.id = ticket_cache.integration_id
      AND o.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Organization members policies
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization members for their organizations"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert organization members for their organizations"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update organization members for their organizations"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete organization members for their organizations"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- User OAuth states policies
ALTER TABLE user_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own OAuth states"
  ON user_oauth_states FOR ALL
  USING (auth.uid() = user_id);

-- Add unique constraint for organization slug
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_idx ON organizations(slug) WHERE slug IS NOT NULL;

-- Add unique constraint for release notes slug per organization
CREATE UNIQUE INDEX IF NOT EXISTS release_notes_organization_slug_idx ON release_notes(organization_id, slug) WHERE slug IS NOT NULL;

-- Update release_notes policies to include new fields
DROP POLICY IF EXISTS "Users can view release notes for their organizations" ON release_notes;
DROP POLICY IF EXISTS "Users can insert release notes for their organizations" ON release_notes;
DROP POLICY IF EXISTS "Users can update release notes for their organizations" ON release_notes;
DROP POLICY IF EXISTS "Users can delete release notes for their organizations" ON release_notes;

CREATE POLICY "Users can view release notes for their organizations"
  ON release_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = release_notes.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert release notes for their organizations"
  ON release_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = release_notes.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update release notes for their organizations"
  ON release_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = release_notes.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete release notes for their organizations"
  ON release_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = release_notes.organization_id
      AND organizations.id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add public access policy for published release notes (for public pages)
CREATE POLICY "Anyone can view published release notes"
  ON release_notes FOR SELECT
  USING (status = 'published');

-- Clean up expired OAuth states function
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM user_oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean up expired ticket cache function
CREATE OR REPLACE FUNCTION cleanup_expired_ticket_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ticket_cache WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS policies for versioning tables (now that organization_members exists)
-- RLS policies for release_note_versions
CREATE POLICY "Users can view versions for their organization's release notes"
  ON release_note_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM release_notes
      WHERE release_notes.id = release_note_versions.release_note_id
      AND release_notes.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert versions for their organization's release notes"
  ON release_note_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM release_notes
      WHERE release_notes.id = release_note_versions.release_note_id
      AND release_notes.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for release_note_publishing_history
CREATE POLICY "Users can view publishing history for their organization's release notes"
  ON release_note_publishing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM release_notes
      WHERE release_notes.id = release_note_publishing_history.release_note_id
      AND release_notes.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert publishing history for their organization's release notes"
  ON release_note_publishing_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM release_notes
      WHERE release_notes.id = release_note_publishing_history.release_note_id
      AND release_notes.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for release_note_collaborators
CREATE POLICY "Users can view collaborators for their organization's release notes"
  ON release_note_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM release_notes
      WHERE release_notes.id = release_note_collaborators.release_note_id
      AND release_notes.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage collaborators for their organization's release notes"
  ON release_note_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM release_notes
      WHERE release_notes.id = release_note_collaborators.release_note_id
      AND release_notes.organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- backwards-compat view so later migrations won't fail
CREATE OR REPLACE VIEW integrations_legacy AS
SELECT *, organization_id AS org_id FROM integrations;