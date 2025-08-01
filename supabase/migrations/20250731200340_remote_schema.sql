create table "public"."ai_context" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "system_prompt" text not null,
    "user_prompt_template" text not null,
    "example_output" text,
    "tone" text,
    "audience" text,
    "output_format" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "language" text default 'English'::text,
    "include_emojis" boolean default false,
    "include_metrics" boolean default true,
    "brevity_level" text default 'detailed'::text
);


alter table "public"."ai_context" enable row level security;

create table "public"."css_customization_history" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "custom_css" text,
    "css_variables" jsonb,
    "applied_by" uuid,
    "applied_at" timestamp with time zone default now(),
    "is_active" boolean default false
);


alter table "public"."css_customization_history" enable row level security;

create table "public"."css_themes" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "category" text default 'custom'::text,
    "css_variables" jsonb not null,
    "custom_css" text,
    "preview_image_url" text,
    "is_public" boolean default false,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."css_themes" enable row level security;

create table "public"."domain_verifications" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "domain" text not null,
    "verification_token" text not null,
    "verification_method" text default 'dns'::text,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."domain_verifications" enable row level security;

create table "public"."integrations" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid not null,
    "type" text not null,
    "external_id" text not null,
    "encrypted_credentials" jsonb not null,
    "config" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."integrations" enable row level security;

create table "public"."oauth_states" (
    "id" uuid not null default gen_random_uuid(),
    "state" text not null,
    "provider" text not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null,
    "expires_at" timestamp with time zone not null
);


alter table "public"."oauth_states" enable row level security;

create table "public"."organization_members" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."organization_members" enable row level security;

create table "public"."organizations" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "slug" text not null,
    "logo_url" text,
    "settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "description" text,
    "plan" text default 'free'::text,
    "custom_domain" text,
    "domain_verified" boolean default false,
    "meta_title" text,
    "meta_description" text,
    "meta_image_url" text,
    "favicon_url" text,
    "brand_color" text default '#7F56D9'::text,
    "custom_css" text,
    "custom_css_enabled" boolean default false,
    "public_portal_url" text
);


alter table "public"."organizations" enable row level security;

create table "public"."release_note_categories" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "name" text not null,
    "description" text,
    "color" text default '#7F56D9'::text,
    "slug" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."release_note_categories" enable row level security;

create table "public"."release_note_collaborators" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "release_note_id" uuid not null,
    "user_id" uuid not null,
    "role" text default 'editor'::text,
    "added_by" uuid
);


create table "public"."release_note_publishing_history" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "release_note_id" uuid not null,
    "action" text not null,
    "performed_by" uuid,
    "scheduled_for" timestamp with time zone,
    "notes" text,
    "metadata" jsonb
);


create table "public"."release_note_versions" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "release_note_id" uuid not null,
    "version_number" integer not null,
    "title" text not null,
    "content" text,
    "content_markdown" text,
    "content_html" text,
    "content_json" jsonb,
    "created_by" uuid,
    "change_summary" text,
    "is_auto_save" boolean default false
);


create table "public"."release_notes" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid not null,
    "integration_id" uuid,
    "title" text not null,
    "version" text,
    "slug" text not null,
    "content_markdown" text not null,
    "content_html" text,
    "status" text not null,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "author_id" uuid,
    "source_ticket_ids" text[],
    "views" integer default 0,
    "content" text,
    "meta_title" text,
    "meta_description" text,
    "meta_image_url" text,
    "og_title" text,
    "og_description" text,
    "twitter_title" text,
    "twitter_description" text,
    "is_public" boolean default false,
    "category" text,
    "tags" text[],
    "featured_image_url" text,
    "excerpt" text
);


alter table "public"."release_notes" enable row level security;

create table "public"."ssl_certificates" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "domain" text not null,
    "certificate" text not null,
    "private_key" text not null,
    "certificate_chain" text,
    "expires_at" timestamp with time zone not null,
    "auto_renew" boolean default true,
    "provider" text default 'letsencrypt'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."ssl_certificates" enable row level security;

create table "public"."ssl_challenges" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "domain" text not null,
    "challenge_type" text default 'dns-01'::text,
    "challenge_token" text not null,
    "challenge_response" text not null,
    "status" text default 'pending'::text,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone default now(),
    "verified_at" timestamp with time zone
);


alter table "public"."ssl_challenges" enable row level security;

create table "public"."subscribers" (
    "id" uuid not null default uuid_generate_v4(),
    "organization_id" uuid not null,
    "email" text not null,
    "name" text,
    "status" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."subscribers" enable row level security;

create table "public"."templates" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "organization_id" uuid not null,
    "name" text not null,
    "content" text not null,
    "is_default" boolean default false,
    "created_by" uuid,
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "description" text,
    "category" text default 'user-focused'::text,
    "icon" text default '📝'::text,
    "system_prompt" text,
    "user_prompt_template" text,
    "output_format" text default 'markdown'::text,
    "tone" text default 'professional'::text,
    "target_audience" text default 'mixed'::text,
    "example_output" text,
    "uses_org_ai_context" boolean default true
);


alter table "public"."templates" enable row level security;

create table "public"."ticket_cache" (
    "id" uuid not null default uuid_generate_v4(),
    "integration_id" uuid not null,
    "external_ticket_id" text not null,
    "title" text not null,
    "description" text,
    "status" text,
    "type" text,
    "labels" jsonb default '[]'::jsonb,
    "url" text,
    "completed_at" timestamp with time zone,
    "fetched_at" timestamp with time zone default now(),
    "organization_id" uuid,
    "integration_type" text
);


alter table "public"."ticket_cache" enable row level security;

create table "public"."user_oauth_states" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "user_id" uuid not null,
    "provider" text not null,
    "state" text not null,
    "expires_at" timestamp with time zone not null,
    "used_at" timestamp with time zone
);


alter table "public"."user_oauth_states" enable row level security;

CREATE UNIQUE INDEX ai_context_organization_id_idx ON public.ai_context USING btree (organization_id);

CREATE UNIQUE INDEX ai_context_pkey ON public.ai_context USING btree (id);

CREATE UNIQUE INDEX css_customization_history_pkey ON public.css_customization_history USING btree (id);

CREATE UNIQUE INDEX css_themes_pkey ON public.css_themes USING btree (id);

CREATE UNIQUE INDEX domain_verifications_pkey ON public.domain_verifications USING btree (id);

CREATE INDEX idx_css_customization_history_active ON public.css_customization_history USING btree (organization_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_css_customization_history_org ON public.css_customization_history USING btree (organization_id);

CREATE INDEX idx_css_themes_category ON public.css_themes USING btree (category);

CREATE INDEX idx_css_themes_public ON public.css_themes USING btree (is_public) WHERE (is_public = true);

CREATE INDEX idx_domain_verifications_domain ON public.domain_verifications USING btree (domain);

CREATE INDEX idx_integrations_external_id ON public.integrations USING btree (type, external_id);

CREATE INDEX idx_integrations_org_id ON public.integrations USING btree (organization_id);

CREATE INDEX idx_integrations_org_type_status ON public.integrations USING btree (organization_id, type, ((config ->> 'status'::text))) WHERE ((config ->> 'status'::text) IS NOT NULL);

CREATE INDEX idx_oauth_states_expires_at ON public.oauth_states USING btree (expires_at);

CREATE INDEX idx_oauth_states_provider ON public.oauth_states USING btree (provider);

CREATE INDEX idx_oauth_states_state ON public.oauth_states USING btree (state);

CREATE INDEX idx_oauth_states_user_id ON public.oauth_states USING btree (user_id);

CREATE INDEX idx_org_members_org_role_created ON public.organization_members USING btree (organization_id, role, created_at DESC);

CREATE INDEX idx_org_members_user_role ON public.organization_members USING btree (user_id, role, organization_id);

CREATE INDEX idx_organization_members_organization_id ON public.organization_members USING btree (organization_id);

CREATE INDEX idx_organization_members_user_id ON public.organization_members USING btree (user_id);

CREATE INDEX idx_organizations_custom_domain ON public.organizations USING btree (custom_domain) WHERE (custom_domain IS NOT NULL);

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug) WHERE (slug IS NOT NULL);

CREATE INDEX idx_release_notes_author_created ON public.release_notes USING btree (author_id, created_at DESC);

CREATE INDEX idx_release_notes_category ON public.release_notes USING btree (category);

CREATE INDEX idx_release_notes_integration_id ON public.release_notes USING btree (integration_id);

CREATE INDEX idx_release_notes_org_id ON public.release_notes USING btree (organization_id);

CREATE INDEX idx_release_notes_org_slug ON public.release_notes USING btree (organization_id, slug) WHERE (status = 'published'::text);

CREATE INDEX idx_release_notes_org_status_created ON public.release_notes USING btree (organization_id, status, created_at DESC) WHERE (status = ANY (ARRAY['published'::text, 'draft'::text, 'scheduled'::text]));

CREATE INDEX idx_release_notes_org_status_published ON public.release_notes USING btree (organization_id, status, published_at DESC) WHERE (status = 'published'::text);

CREATE INDEX idx_release_notes_org_version ON public.release_notes USING btree (organization_id, version) WHERE (version IS NOT NULL);

CREATE INDEX idx_release_notes_public_published ON public.release_notes USING btree (organization_id, is_public, published_at DESC) WHERE ((status = 'published'::text) AND (is_public = true));

CREATE INDEX idx_release_notes_search ON public.release_notes USING btree (title, content_html);

CREATE INDEX idx_release_notes_search_content ON public.release_notes USING gin (to_tsvector('english'::regconfig, content_markdown));

CREATE INDEX idx_release_notes_search_title ON public.release_notes USING gin (to_tsvector('english'::regconfig, title));

CREATE INDEX idx_release_notes_tags ON public.release_notes USING gin (tags);

CREATE INDEX idx_ssl_certificates_expires_at ON public.ssl_certificates USING btree (expires_at) WHERE (auto_renew = true);

CREATE INDEX idx_ssl_certificates_org_domain ON public.ssl_certificates USING btree (organization_id, domain);

CREATE INDEX idx_ssl_challenges_domain_status ON public.ssl_challenges USING btree (domain, status);

CREATE INDEX idx_ssl_challenges_expires_at ON public.ssl_challenges USING btree (expires_at);

CREATE INDEX idx_subscribers_email ON public.subscribers USING btree (email) WHERE (status = 'active'::text);

CREATE INDEX idx_subscribers_org_active ON public.subscribers USING btree (organization_id, created_at DESC) WHERE (status = 'active'::text);

CREATE INDEX idx_subscribers_org_id ON public.subscribers USING btree (organization_id);

CREATE INDEX idx_templates_ai_context ON public.templates USING btree (organization_id, uses_org_ai_context);

CREATE INDEX idx_templates_category ON public.templates USING btree (category);

CREATE INDEX idx_templates_icon ON public.templates USING btree (icon) WHERE (icon IS NOT NULL);

CREATE INDEX idx_templates_target_audience ON public.templates USING btree (target_audience);

CREATE INDEX idx_templates_tone ON public.templates USING btree (tone);

CREATE INDEX idx_ticket_cache_external_id ON public.ticket_cache USING btree (integration_id, external_ticket_id);

CREATE INDEX idx_ticket_cache_external_ticket_id ON public.ticket_cache USING btree (external_ticket_id);

CREATE INDEX idx_ticket_cache_integration_id ON public.ticket_cache USING btree (integration_id);

CREATE INDEX idx_ticket_cache_integration_status ON public.ticket_cache USING btree (integration_id, status, completed_at DESC NULLS LAST);

CREATE INDEX idx_ticket_cache_integration_type ON public.ticket_cache USING btree (integration_type);

CREATE INDEX idx_ticket_cache_organization_id ON public.ticket_cache USING btree (organization_id);

CREATE INDEX idx_ticket_cache_recent ON public.ticket_cache USING btree (integration_id, fetched_at DESC) WHERE (status = ANY (ARRAY['completed'::text, 'closed'::text, 'done'::text]));

CREATE INDEX idx_ticket_cache_type ON public.ticket_cache USING btree (integration_id, type) WHERE (type IS NOT NULL);

CREATE UNIQUE INDEX integrations_org_id_type_external_id_key ON public.integrations USING btree (organization_id, type, external_id);

CREATE INDEX integrations_organization_id_type_idx ON public.integrations USING btree (organization_id, type);

CREATE UNIQUE INDEX integrations_pkey ON public.integrations USING btree (id);

CREATE UNIQUE INDEX oauth_states_pkey ON public.oauth_states USING btree (id);

CREATE UNIQUE INDEX oauth_states_state_key ON public.oauth_states USING btree (state);

CREATE INDEX organization_members_organization_id_idx ON public.organization_members USING btree (organization_id);

CREATE UNIQUE INDEX organization_members_organization_id_user_id_key ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id);

CREATE INDEX organization_members_user_id_idx ON public.organization_members USING btree (user_id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_idx ON public.organizations USING btree (slug) WHERE (slug IS NOT NULL);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX release_note_categories_organization_id_slug_key ON public.release_note_categories USING btree (organization_id, slug);

CREATE UNIQUE INDEX release_note_categories_pkey ON public.release_note_categories USING btree (id);

CREATE UNIQUE INDEX release_note_collaborators_pkey ON public.release_note_collaborators USING btree (id);

CREATE INDEX release_note_collaborators_release_note_id_idx ON public.release_note_collaborators USING btree (release_note_id);

CREATE UNIQUE INDEX release_note_collaborators_release_note_id_user_id_key ON public.release_note_collaborators USING btree (release_note_id, user_id);

CREATE INDEX release_note_collaborators_user_id_idx ON public.release_note_collaborators USING btree (user_id);

CREATE INDEX release_note_publishing_history_action_idx ON public.release_note_publishing_history USING btree (action);

CREATE UNIQUE INDEX release_note_publishing_history_pkey ON public.release_note_publishing_history USING btree (id);

CREATE INDEX release_note_publishing_history_release_note_id_idx ON public.release_note_publishing_history USING btree (release_note_id);

CREATE UNIQUE INDEX release_note_versions_pkey ON public.release_note_versions USING btree (id);

CREATE INDEX release_note_versions_release_note_id_idx ON public.release_note_versions USING btree (release_note_id);

CREATE UNIQUE INDEX release_note_versions_release_note_id_version_number_key ON public.release_note_versions USING btree (release_note_id, version_number);

CREATE INDEX release_note_versions_version_number_idx ON public.release_note_versions USING btree (release_note_id, version_number);

CREATE INDEX release_notes_author_id_idx ON public.release_notes USING btree (author_id);

CREATE UNIQUE INDEX release_notes_org_id_slug_key ON public.release_notes USING btree (organization_id, slug);

CREATE INDEX release_notes_organization_id_status_idx ON public.release_notes USING btree (organization_id, status);

CREATE UNIQUE INDEX release_notes_organization_slug_idx ON public.release_notes USING btree (organization_id, slug) WHERE (slug IS NOT NULL);

CREATE UNIQUE INDEX release_notes_pkey ON public.release_notes USING btree (id);

CREATE INDEX release_notes_published_at_idx ON public.release_notes USING btree (published_at);

CREATE INDEX release_notes_slug_idx ON public.release_notes USING btree (organization_id, slug);

CREATE UNIQUE INDEX ssl_certificates_organization_id_domain_key ON public.ssl_certificates USING btree (organization_id, domain);

CREATE UNIQUE INDEX ssl_certificates_pkey ON public.ssl_certificates USING btree (id);

CREATE UNIQUE INDEX ssl_challenges_pkey ON public.ssl_challenges USING btree (id);

CREATE INDEX subscribers_email_idx ON public.subscribers USING btree (email);

CREATE UNIQUE INDEX subscribers_org_id_email_key ON public.subscribers USING btree (organization_id, email);

CREATE INDEX subscribers_organization_id_status_idx ON public.subscribers USING btree (organization_id, status);

CREATE UNIQUE INDEX subscribers_pkey ON public.subscribers USING btree (id);

CREATE INDEX templates_is_default_idx ON public.templates USING btree (organization_id, is_default);

CREATE INDEX templates_organization_id_idx ON public.templates USING btree (organization_id);

CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id);

CREATE UNIQUE INDEX ticket_cache_integration_id_external_ticket_id_key ON public.ticket_cache USING btree (integration_id, external_ticket_id);

CREATE UNIQUE INDEX ticket_cache_pkey ON public.ticket_cache USING btree (id);

CREATE INDEX user_oauth_states_expires_at_idx ON public.user_oauth_states USING btree (expires_at);

CREATE UNIQUE INDEX user_oauth_states_pkey ON public.user_oauth_states USING btree (id);

CREATE INDEX user_oauth_states_user_id_provider_idx ON public.user_oauth_states USING btree (user_id, provider);

CREATE UNIQUE INDEX user_oauth_states_user_id_provider_state_key ON public.user_oauth_states USING btree (user_id, provider, state);

alter table "public"."ai_context" add constraint "ai_context_pkey" PRIMARY KEY using index "ai_context_pkey";

alter table "public"."css_customization_history" add constraint "css_customization_history_pkey" PRIMARY KEY using index "css_customization_history_pkey";

alter table "public"."css_themes" add constraint "css_themes_pkey" PRIMARY KEY using index "css_themes_pkey";

alter table "public"."domain_verifications" add constraint "domain_verifications_pkey" PRIMARY KEY using index "domain_verifications_pkey";

alter table "public"."integrations" add constraint "integrations_pkey" PRIMARY KEY using index "integrations_pkey";

alter table "public"."oauth_states" add constraint "oauth_states_pkey" PRIMARY KEY using index "oauth_states_pkey";

alter table "public"."organization_members" add constraint "organization_members_pkey" PRIMARY KEY using index "organization_members_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."release_note_categories" add constraint "release_note_categories_pkey" PRIMARY KEY using index "release_note_categories_pkey";

alter table "public"."release_note_collaborators" add constraint "release_note_collaborators_pkey" PRIMARY KEY using index "release_note_collaborators_pkey";

alter table "public"."release_note_publishing_history" add constraint "release_note_publishing_history_pkey" PRIMARY KEY using index "release_note_publishing_history_pkey";

alter table "public"."release_note_versions" add constraint "release_note_versions_pkey" PRIMARY KEY using index "release_note_versions_pkey";

alter table "public"."release_notes" add constraint "release_notes_pkey" PRIMARY KEY using index "release_notes_pkey";

alter table "public"."ssl_certificates" add constraint "ssl_certificates_pkey" PRIMARY KEY using index "ssl_certificates_pkey";

alter table "public"."ssl_challenges" add constraint "ssl_challenges_pkey" PRIMARY KEY using index "ssl_challenges_pkey";

alter table "public"."subscribers" add constraint "subscribers_pkey" PRIMARY KEY using index "subscribers_pkey";

alter table "public"."templates" add constraint "templates_pkey" PRIMARY KEY using index "templates_pkey";

alter table "public"."ticket_cache" add constraint "ticket_cache_pkey" PRIMARY KEY using index "ticket_cache_pkey";

alter table "public"."user_oauth_states" add constraint "user_oauth_states_pkey" PRIMARY KEY using index "user_oauth_states_pkey";

alter table "public"."ai_context" add constraint "ai_context_audience_check" CHECK ((audience = ANY (ARRAY['developers'::text, 'business'::text, 'users'::text, 'mixed'::text, 'executives'::text]))) not valid;

alter table "public"."ai_context" validate constraint "ai_context_audience_check";

alter table "public"."ai_context" add constraint "ai_context_brevity_level_check" CHECK ((brevity_level = ANY (ARRAY['concise'::text, 'detailed'::text, 'comprehensive'::text]))) not valid;

alter table "public"."ai_context" validate constraint "ai_context_brevity_level_check";

alter table "public"."ai_context" add constraint "ai_context_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."ai_context" validate constraint "ai_context_organization_id_fkey";

alter table "public"."ai_context" add constraint "ai_context_output_format_check" CHECK ((output_format = ANY (ARRAY['markdown'::text, 'html'::text]))) not valid;

alter table "public"."ai_context" validate constraint "ai_context_output_format_check";

alter table "public"."ai_context" add constraint "ai_context_tone_check" CHECK ((tone = ANY (ARRAY['professional'::text, 'casual'::text, 'technical'::text, 'enthusiastic'::text, 'formal'::text]))) not valid;

alter table "public"."ai_context" validate constraint "ai_context_tone_check";

alter table "public"."css_customization_history" add constraint "css_customization_history_applied_by_fkey" FOREIGN KEY (applied_by) REFERENCES auth.users(id) not valid;

alter table "public"."css_customization_history" validate constraint "css_customization_history_applied_by_fkey";

alter table "public"."css_customization_history" add constraint "css_customization_history_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."css_customization_history" validate constraint "css_customization_history_organization_id_fkey";

alter table "public"."css_themes" add constraint "css_themes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."css_themes" validate constraint "css_themes_created_by_fkey";

alter table "public"."domain_verifications" add constraint "domain_verifications_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."domain_verifications" validate constraint "domain_verifications_organization_id_fkey";

alter table "public"."integrations" add constraint "integrations_org_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."integrations" validate constraint "integrations_org_id_fkey";

alter table "public"."integrations" add constraint "integrations_org_id_type_external_id_key" UNIQUE using index "integrations_org_id_type_external_id_key";

alter table "public"."integrations" add constraint "integrations_type_check" CHECK ((type = ANY (ARRAY['github'::text, 'jira'::text, 'linear'::text]))) not valid;

alter table "public"."integrations" validate constraint "integrations_type_check";

alter table "public"."oauth_states" add constraint "oauth_states_state_key" UNIQUE using index "oauth_states_state_key";

alter table "public"."oauth_states" add constraint "oauth_states_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."oauth_states" validate constraint "oauth_states_user_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_organization_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_organization_id_user_id_key" UNIQUE using index "organization_members_organization_id_user_id_key";

alter table "public"."organization_members" add constraint "organization_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text]))) not valid;

alter table "public"."organization_members" validate constraint "organization_members_role_check";

alter table "public"."organizations" add constraint "organizations_slug_key" UNIQUE using index "organizations_slug_key";

alter table "public"."release_note_categories" add constraint "release_note_categories_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."release_note_categories" validate constraint "release_note_categories_organization_id_fkey";

alter table "public"."release_note_categories" add constraint "release_note_categories_organization_id_slug_key" UNIQUE using index "release_note_categories_organization_id_slug_key";

alter table "public"."release_note_collaborators" add constraint "release_note_collaborators_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) not valid;

alter table "public"."release_note_collaborators" validate constraint "release_note_collaborators_added_by_fkey";

alter table "public"."release_note_collaborators" add constraint "release_note_collaborators_release_note_id_fkey" FOREIGN KEY (release_note_id) REFERENCES release_notes(id) ON DELETE CASCADE not valid;

alter table "public"."release_note_collaborators" validate constraint "release_note_collaborators_release_note_id_fkey";

alter table "public"."release_note_collaborators" add constraint "release_note_collaborators_release_note_id_user_id_key" UNIQUE using index "release_note_collaborators_release_note_id_user_id_key";

alter table "public"."release_note_collaborators" add constraint "release_note_collaborators_role_check" CHECK ((role = ANY (ARRAY['editor'::text, 'reviewer'::text, 'viewer'::text]))) not valid;

alter table "public"."release_note_collaborators" validate constraint "release_note_collaborators_role_check";

alter table "public"."release_note_collaborators" add constraint "release_note_collaborators_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."release_note_collaborators" validate constraint "release_note_collaborators_user_id_fkey";

alter table "public"."release_note_publishing_history" add constraint "release_note_publishing_history_action_check" CHECK ((action = ANY (ARRAY['draft_saved'::text, 'scheduled'::text, 'published'::text, 'unpublished'::text, 'archived'::text]))) not valid;

alter table "public"."release_note_publishing_history" validate constraint "release_note_publishing_history_action_check";

alter table "public"."release_note_publishing_history" add constraint "release_note_publishing_history_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES auth.users(id) not valid;

alter table "public"."release_note_publishing_history" validate constraint "release_note_publishing_history_performed_by_fkey";

alter table "public"."release_note_publishing_history" add constraint "release_note_publishing_history_release_note_id_fkey" FOREIGN KEY (release_note_id) REFERENCES release_notes(id) ON DELETE CASCADE not valid;

alter table "public"."release_note_publishing_history" validate constraint "release_note_publishing_history_release_note_id_fkey";

alter table "public"."release_note_versions" add constraint "release_note_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."release_note_versions" validate constraint "release_note_versions_created_by_fkey";

alter table "public"."release_note_versions" add constraint "release_note_versions_release_note_id_fkey" FOREIGN KEY (release_note_id) REFERENCES release_notes(id) ON DELETE CASCADE not valid;

alter table "public"."release_note_versions" validate constraint "release_note_versions_release_note_id_fkey";

alter table "public"."release_note_versions" add constraint "release_note_versions_release_note_id_version_number_key" UNIQUE using index "release_note_versions_release_note_id_version_number_key";

alter table "public"."release_notes" add constraint "release_notes_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) not valid;

alter table "public"."release_notes" validate constraint "release_notes_author_id_fkey";

alter table "public"."release_notes" add constraint "release_notes_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE SET NULL not valid;

alter table "public"."release_notes" validate constraint "release_notes_integration_id_fkey";

alter table "public"."release_notes" add constraint "release_notes_org_id_slug_key" UNIQUE using index "release_notes_org_id_slug_key";

alter table "public"."release_notes" add constraint "release_notes_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."release_notes" validate constraint "release_notes_organization_id_fkey";

alter table "public"."release_notes" add constraint "release_notes_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text]))) not valid;

alter table "public"."release_notes" validate constraint "release_notes_status_check";

alter table "public"."ssl_certificates" add constraint "ssl_certificates_organization_id_domain_key" UNIQUE using index "ssl_certificates_organization_id_domain_key";

alter table "public"."ssl_certificates" add constraint "ssl_certificates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."ssl_certificates" validate constraint "ssl_certificates_organization_id_fkey";

alter table "public"."ssl_challenges" add constraint "ssl_challenges_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."ssl_challenges" validate constraint "ssl_challenges_organization_id_fkey";

alter table "public"."subscribers" add constraint "subscribers_org_id_email_key" UNIQUE using index "subscribers_org_id_email_key";

alter table "public"."subscribers" add constraint "subscribers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."subscribers" validate constraint "subscribers_organization_id_fkey";

alter table "public"."subscribers" add constraint "subscribers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'unsubscribed'::text]))) not valid;

alter table "public"."subscribers" validate constraint "subscribers_status_check";

alter table "public"."templates" add constraint "check_category" CHECK ((category = ANY (ARRAY['marketing'::text, 'technical'::text, 'user-focused'::text, 'conversational'::text, 'executive'::text, 'changelog'::text, 'product'::text, 'security'::text, 'api'::text, 'mobile'::text, 'enterprise'::text, 'startup'::text, 'minimal'::text, 'detailed'::text, 'custom'::text]))) not valid;

alter table "public"."templates" validate constraint "check_category";

alter table "public"."templates" add constraint "check_output_format" CHECK ((output_format = ANY (ARRAY['markdown'::text, 'html'::text]))) not valid;

alter table "public"."templates" validate constraint "check_output_format";

alter table "public"."templates" add constraint "check_target_audience" CHECK ((target_audience = ANY (ARRAY['organization'::text, 'developers'::text, 'business'::text, 'users'::text, 'mixed'::text]))) not valid;

alter table "public"."templates" validate constraint "check_target_audience";

alter table "public"."templates" add constraint "check_tone" CHECK ((tone = ANY (ARRAY['organization'::text, 'professional'::text, 'casual'::text, 'technical'::text, 'enthusiastic'::text, 'formal'::text]))) not valid;

alter table "public"."templates" validate constraint "check_tone";

alter table "public"."templates" add constraint "templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."templates" validate constraint "templates_created_by_fkey";

alter table "public"."templates" add constraint "templates_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."templates" validate constraint "templates_organization_id_fkey";

alter table "public"."ticket_cache" add constraint "fk_ticket_cache_organization" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_cache" validate constraint "fk_ticket_cache_organization";

alter table "public"."ticket_cache" add constraint "ticket_cache_integration_id_external_ticket_id_key" UNIQUE using index "ticket_cache_integration_id_external_ticket_id_key";

alter table "public"."ticket_cache" add constraint "ticket_cache_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_cache" validate constraint "ticket_cache_integration_id_fkey";

alter table "public"."user_oauth_states" add constraint "user_oauth_states_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_oauth_states" validate constraint "user_oauth_states_user_id_fkey";

alter table "public"."user_oauth_states" add constraint "user_oauth_states_user_id_provider_state_key" UNIQUE using index "user_oauth_states_user_id_provider_state_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.apply_css_customization(org_id uuid, css_content text, css_vars jsonb, user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  history_id UUID;
BEGIN
  -- Deactivate current customization
  UPDATE css_customization_history 
  SET is_active = FALSE 
  WHERE organization_id = org_id AND is_active = TRUE;
  
  -- Insert new customization
  INSERT INTO css_customization_history (
    organization_id, 
    custom_css, 
    css_variables, 
    applied_by,
    is_active
  ) VALUES (
    org_id, 
    css_content, 
    css_vars, 
    user_id,
    TRUE
  ) RETURNING id INTO history_id;
  
  -- Update organization
  UPDATE organizations 
  SET 
    custom_css = css_content,
    custom_css_enabled = TRUE,
    updated_at = NOW()
  WHERE id = org_id;
  
  RETURN history_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clean_expired_oauth_states()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM oauth_states 
  WHERE created_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_ssl_challenges()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM ssl_challenges 
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_ticket_cache()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM ticket_cache WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_ticket_cache()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ticket_cache 
  WHERE fetched_at < NOW() - INTERVAL '30 days'
    AND status NOT IN ('open', 'in_progress');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_organization_stats(p_organization_id uuid)
 RETURNS TABLE(total_release_notes integer, published_notes integer, draft_notes integer, total_subscribers integer, active_integrations integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM release_notes WHERE organization_id = p_organization_id),
    (SELECT COUNT(*)::INTEGER FROM release_notes WHERE organization_id = p_organization_id AND status = 'published'),
    (SELECT COUNT(*)::INTEGER FROM release_notes WHERE organization_id = p_organization_id AND status = 'draft'),
    (SELECT COUNT(*)::INTEGER FROM subscribers WHERE organization_id = p_organization_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM integrations WHERE organization_id = p_organization_id AND config->>'status' = 'active');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_recent_activity(p_organization_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(activity_type text, activity_id uuid, title text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  (
    SELECT 
      'release_note'::TEXT as activity_type,
      id as activity_id,
      title,
      created_at
    FROM release_notes 
    WHERE organization_id = p_organization_id
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT 
      'subscriber'::TEXT as activity_type,
      id as activity_id,
      COALESCE(name, email) as title,
      created_at
    FROM subscribers 
    WHERE organization_id = p_organization_id
    ORDER BY created_at DESC
    LIMIT p_limit
  )
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$function$
;

create or replace view "public"."integrations_legacy" as  SELECT id,
    organization_id,
    type,
    external_id,
    encrypted_credentials,
    config,
    created_at,
    updated_at,
    organization_id AS org_id
   FROM integrations;


create or replace view "public"."organization_ssl_status" as  SELECT o.id,
    o.name,
    o.custom_domain,
    o.domain_verified,
        CASE
            WHEN ((sc.id IS NOT NULL) AND (sc.expires_at > now())) THEN true
            ELSE false
        END AS ssl_enabled,
        CASE
            WHEN (sc.id IS NULL) THEN 'no_certificate'::text
            WHEN (sc.expires_at <= now()) THEN 'expired'::text
            WHEN (sc.expires_at <= (now() + '30 days'::interval)) THEN 'expiring_soon'::text
            ELSE 'active'::text
        END AS ssl_status,
    sc.expires_at AS ssl_expires_at,
    sc.auto_renew AS ssl_auto_renew,
    sc.provider AS ssl_provider
   FROM (organizations o
     LEFT JOIN ssl_certificates sc ON (((o.id = sc.organization_id) AND (o.custom_domain = sc.domain))));


create or replace view "public"."query_performance_monitor" as  SELECT schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
   FROM pg_stat_user_indexes sui
  WHERE (idx_scan > 0)
  ORDER BY idx_scan DESC;


CREATE OR REPLACE FUNCTION public.search_release_notes(p_organization_id uuid, p_search_query text, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, slug text, content_markdown text, status text, created_at timestamp with time zone, published_at timestamp with time zone, rank real)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    rn.id,
    rn.title,
    rn.slug,
    rn.content_markdown,
    rn.status,
    rn.created_at,
    rn.published_at,
    ts_rank(
      to_tsvector('english', rn.title || ' ' || COALESCE(rn.content_markdown, '')),
      plainto_tsquery('english', p_search_query)
    ) as rank
  FROM release_notes rn
  WHERE rn.organization_id = p_organization_id
    AND (p_status IS NULL OR rn.status = p_status)
    AND (
      to_tsvector('english', rn.title) @@ plainto_tsquery('english', p_search_query)
      OR to_tsvector('english', rn.content_markdown) @@ plainto_tsquery('english', p_search_query)
    )
  ORDER BY rank DESC, rn.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

create or replace view "public"."table_size_monitor" as  SELECT schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) AS size,
    pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass) AS size_bytes
   FROM pg_tables
  WHERE (schemaname = 'public'::name)
  ORDER BY (pg_total_relation_size(((((schemaname)::text || '.'::text) || (tablename)::text))::regclass)) DESC;


CREATE OR REPLACE FUNCTION public.update_ai_context_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ssl_certificates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."ai_context" to "anon";

grant insert on table "public"."ai_context" to "anon";

grant references on table "public"."ai_context" to "anon";

grant select on table "public"."ai_context" to "anon";

grant trigger on table "public"."ai_context" to "anon";

grant truncate on table "public"."ai_context" to "anon";

grant update on table "public"."ai_context" to "anon";

grant delete on table "public"."ai_context" to "authenticated";

grant insert on table "public"."ai_context" to "authenticated";

grant references on table "public"."ai_context" to "authenticated";

grant select on table "public"."ai_context" to "authenticated";

grant trigger on table "public"."ai_context" to "authenticated";

grant truncate on table "public"."ai_context" to "authenticated";

grant update on table "public"."ai_context" to "authenticated";

grant delete on table "public"."ai_context" to "service_role";

grant insert on table "public"."ai_context" to "service_role";

grant references on table "public"."ai_context" to "service_role";

grant select on table "public"."ai_context" to "service_role";

grant trigger on table "public"."ai_context" to "service_role";

grant truncate on table "public"."ai_context" to "service_role";

grant update on table "public"."ai_context" to "service_role";

grant delete on table "public"."css_customization_history" to "anon";

grant insert on table "public"."css_customization_history" to "anon";

grant references on table "public"."css_customization_history" to "anon";

grant select on table "public"."css_customization_history" to "anon";

grant trigger on table "public"."css_customization_history" to "anon";

grant truncate on table "public"."css_customization_history" to "anon";

grant update on table "public"."css_customization_history" to "anon";

grant delete on table "public"."css_customization_history" to "authenticated";

grant insert on table "public"."css_customization_history" to "authenticated";

grant references on table "public"."css_customization_history" to "authenticated";

grant select on table "public"."css_customization_history" to "authenticated";

grant trigger on table "public"."css_customization_history" to "authenticated";

grant truncate on table "public"."css_customization_history" to "authenticated";

grant update on table "public"."css_customization_history" to "authenticated";

grant delete on table "public"."css_customization_history" to "service_role";

grant insert on table "public"."css_customization_history" to "service_role";

grant references on table "public"."css_customization_history" to "service_role";

grant select on table "public"."css_customization_history" to "service_role";

grant trigger on table "public"."css_customization_history" to "service_role";

grant truncate on table "public"."css_customization_history" to "service_role";

grant update on table "public"."css_customization_history" to "service_role";

grant delete on table "public"."css_themes" to "anon";

grant insert on table "public"."css_themes" to "anon";

grant references on table "public"."css_themes" to "anon";

grant select on table "public"."css_themes" to "anon";

grant trigger on table "public"."css_themes" to "anon";

grant truncate on table "public"."css_themes" to "anon";

grant update on table "public"."css_themes" to "anon";

grant delete on table "public"."css_themes" to "authenticated";

grant insert on table "public"."css_themes" to "authenticated";

grant references on table "public"."css_themes" to "authenticated";

grant select on table "public"."css_themes" to "authenticated";

grant trigger on table "public"."css_themes" to "authenticated";

grant truncate on table "public"."css_themes" to "authenticated";

grant update on table "public"."css_themes" to "authenticated";

grant delete on table "public"."css_themes" to "service_role";

grant insert on table "public"."css_themes" to "service_role";

grant references on table "public"."css_themes" to "service_role";

grant select on table "public"."css_themes" to "service_role";

grant trigger on table "public"."css_themes" to "service_role";

grant truncate on table "public"."css_themes" to "service_role";

grant update on table "public"."css_themes" to "service_role";

grant delete on table "public"."domain_verifications" to "anon";

grant insert on table "public"."domain_verifications" to "anon";

grant references on table "public"."domain_verifications" to "anon";

grant select on table "public"."domain_verifications" to "anon";

grant trigger on table "public"."domain_verifications" to "anon";

grant truncate on table "public"."domain_verifications" to "anon";

grant update on table "public"."domain_verifications" to "anon";

grant delete on table "public"."domain_verifications" to "authenticated";

grant insert on table "public"."domain_verifications" to "authenticated";

grant references on table "public"."domain_verifications" to "authenticated";

grant select on table "public"."domain_verifications" to "authenticated";

grant trigger on table "public"."domain_verifications" to "authenticated";

grant truncate on table "public"."domain_verifications" to "authenticated";

grant update on table "public"."domain_verifications" to "authenticated";

grant delete on table "public"."domain_verifications" to "service_role";

grant insert on table "public"."domain_verifications" to "service_role";

grant references on table "public"."domain_verifications" to "service_role";

grant select on table "public"."domain_verifications" to "service_role";

grant trigger on table "public"."domain_verifications" to "service_role";

grant truncate on table "public"."domain_verifications" to "service_role";

grant update on table "public"."domain_verifications" to "service_role";

grant delete on table "public"."integrations" to "anon";

grant insert on table "public"."integrations" to "anon";

grant references on table "public"."integrations" to "anon";

grant select on table "public"."integrations" to "anon";

grant trigger on table "public"."integrations" to "anon";

grant truncate on table "public"."integrations" to "anon";

grant update on table "public"."integrations" to "anon";

grant delete on table "public"."integrations" to "authenticated";

grant insert on table "public"."integrations" to "authenticated";

grant references on table "public"."integrations" to "authenticated";

grant select on table "public"."integrations" to "authenticated";

grant trigger on table "public"."integrations" to "authenticated";

grant truncate on table "public"."integrations" to "authenticated";

grant update on table "public"."integrations" to "authenticated";

grant delete on table "public"."integrations" to "service_role";

grant insert on table "public"."integrations" to "service_role";

grant references on table "public"."integrations" to "service_role";

grant select on table "public"."integrations" to "service_role";

grant trigger on table "public"."integrations" to "service_role";

grant truncate on table "public"."integrations" to "service_role";

grant update on table "public"."integrations" to "service_role";

grant delete on table "public"."oauth_states" to "anon";

grant insert on table "public"."oauth_states" to "anon";

grant references on table "public"."oauth_states" to "anon";

grant select on table "public"."oauth_states" to "anon";

grant trigger on table "public"."oauth_states" to "anon";

grant truncate on table "public"."oauth_states" to "anon";

grant update on table "public"."oauth_states" to "anon";

grant delete on table "public"."oauth_states" to "authenticated";

grant insert on table "public"."oauth_states" to "authenticated";

grant references on table "public"."oauth_states" to "authenticated";

grant select on table "public"."oauth_states" to "authenticated";

grant trigger on table "public"."oauth_states" to "authenticated";

grant truncate on table "public"."oauth_states" to "authenticated";

grant update on table "public"."oauth_states" to "authenticated";

grant delete on table "public"."oauth_states" to "service_role";

grant insert on table "public"."oauth_states" to "service_role";

grant references on table "public"."oauth_states" to "service_role";

grant select on table "public"."oauth_states" to "service_role";

grant trigger on table "public"."oauth_states" to "service_role";

grant truncate on table "public"."oauth_states" to "service_role";

grant update on table "public"."oauth_states" to "service_role";

grant delete on table "public"."organization_members" to "anon";

grant insert on table "public"."organization_members" to "anon";

grant references on table "public"."organization_members" to "anon";

grant select on table "public"."organization_members" to "anon";

grant trigger on table "public"."organization_members" to "anon";

grant truncate on table "public"."organization_members" to "anon";

grant update on table "public"."organization_members" to "anon";

grant delete on table "public"."organization_members" to "authenticated";

grant insert on table "public"."organization_members" to "authenticated";

grant references on table "public"."organization_members" to "authenticated";

grant select on table "public"."organization_members" to "authenticated";

grant trigger on table "public"."organization_members" to "authenticated";

grant truncate on table "public"."organization_members" to "authenticated";

grant update on table "public"."organization_members" to "authenticated";

grant delete on table "public"."organization_members" to "service_role";

grant insert on table "public"."organization_members" to "service_role";

grant references on table "public"."organization_members" to "service_role";

grant select on table "public"."organization_members" to "service_role";

grant trigger on table "public"."organization_members" to "service_role";

grant truncate on table "public"."organization_members" to "service_role";

grant update on table "public"."organization_members" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."release_note_categories" to "anon";

grant insert on table "public"."release_note_categories" to "anon";

grant references on table "public"."release_note_categories" to "anon";

grant select on table "public"."release_note_categories" to "anon";

grant trigger on table "public"."release_note_categories" to "anon";

grant truncate on table "public"."release_note_categories" to "anon";

grant update on table "public"."release_note_categories" to "anon";

grant delete on table "public"."release_note_categories" to "authenticated";

grant insert on table "public"."release_note_categories" to "authenticated";

grant references on table "public"."release_note_categories" to "authenticated";

grant select on table "public"."release_note_categories" to "authenticated";

grant trigger on table "public"."release_note_categories" to "authenticated";

grant truncate on table "public"."release_note_categories" to "authenticated";

grant update on table "public"."release_note_categories" to "authenticated";

grant delete on table "public"."release_note_categories" to "service_role";

grant insert on table "public"."release_note_categories" to "service_role";

grant references on table "public"."release_note_categories" to "service_role";

grant select on table "public"."release_note_categories" to "service_role";

grant trigger on table "public"."release_note_categories" to "service_role";

grant truncate on table "public"."release_note_categories" to "service_role";

grant update on table "public"."release_note_categories" to "service_role";

grant delete on table "public"."release_note_collaborators" to "anon";

grant insert on table "public"."release_note_collaborators" to "anon";

grant references on table "public"."release_note_collaborators" to "anon";

grant select on table "public"."release_note_collaborators" to "anon";

grant trigger on table "public"."release_note_collaborators" to "anon";

grant truncate on table "public"."release_note_collaborators" to "anon";

grant update on table "public"."release_note_collaborators" to "anon";

grant delete on table "public"."release_note_collaborators" to "authenticated";

grant insert on table "public"."release_note_collaborators" to "authenticated";

grant references on table "public"."release_note_collaborators" to "authenticated";

grant select on table "public"."release_note_collaborators" to "authenticated";

grant trigger on table "public"."release_note_collaborators" to "authenticated";

grant truncate on table "public"."release_note_collaborators" to "authenticated";

grant update on table "public"."release_note_collaborators" to "authenticated";

grant delete on table "public"."release_note_collaborators" to "service_role";

grant insert on table "public"."release_note_collaborators" to "service_role";

grant references on table "public"."release_note_collaborators" to "service_role";

grant select on table "public"."release_note_collaborators" to "service_role";

grant trigger on table "public"."release_note_collaborators" to "service_role";

grant truncate on table "public"."release_note_collaborators" to "service_role";

grant update on table "public"."release_note_collaborators" to "service_role";

grant delete on table "public"."release_note_publishing_history" to "anon";

grant insert on table "public"."release_note_publishing_history" to "anon";

grant references on table "public"."release_note_publishing_history" to "anon";

grant select on table "public"."release_note_publishing_history" to "anon";

grant trigger on table "public"."release_note_publishing_history" to "anon";

grant truncate on table "public"."release_note_publishing_history" to "anon";

grant update on table "public"."release_note_publishing_history" to "anon";

grant delete on table "public"."release_note_publishing_history" to "authenticated";

grant insert on table "public"."release_note_publishing_history" to "authenticated";

grant references on table "public"."release_note_publishing_history" to "authenticated";

grant select on table "public"."release_note_publishing_history" to "authenticated";

grant trigger on table "public"."release_note_publishing_history" to "authenticated";

grant truncate on table "public"."release_note_publishing_history" to "authenticated";

grant update on table "public"."release_note_publishing_history" to "authenticated";

grant delete on table "public"."release_note_publishing_history" to "service_role";

grant insert on table "public"."release_note_publishing_history" to "service_role";

grant references on table "public"."release_note_publishing_history" to "service_role";

grant select on table "public"."release_note_publishing_history" to "service_role";

grant trigger on table "public"."release_note_publishing_history" to "service_role";

grant truncate on table "public"."release_note_publishing_history" to "service_role";

grant update on table "public"."release_note_publishing_history" to "service_role";

grant delete on table "public"."release_note_versions" to "anon";

grant insert on table "public"."release_note_versions" to "anon";

grant references on table "public"."release_note_versions" to "anon";

grant select on table "public"."release_note_versions" to "anon";

grant trigger on table "public"."release_note_versions" to "anon";

grant truncate on table "public"."release_note_versions" to "anon";

grant update on table "public"."release_note_versions" to "anon";

grant delete on table "public"."release_note_versions" to "authenticated";

grant insert on table "public"."release_note_versions" to "authenticated";

grant references on table "public"."release_note_versions" to "authenticated";

grant select on table "public"."release_note_versions" to "authenticated";

grant trigger on table "public"."release_note_versions" to "authenticated";

grant truncate on table "public"."release_note_versions" to "authenticated";

grant update on table "public"."release_note_versions" to "authenticated";

grant delete on table "public"."release_note_versions" to "service_role";

grant insert on table "public"."release_note_versions" to "service_role";

grant references on table "public"."release_note_versions" to "service_role";

grant select on table "public"."release_note_versions" to "service_role";

grant trigger on table "public"."release_note_versions" to "service_role";

grant truncate on table "public"."release_note_versions" to "service_role";

grant update on table "public"."release_note_versions" to "service_role";

grant delete on table "public"."release_notes" to "anon";

grant insert on table "public"."release_notes" to "anon";

grant references on table "public"."release_notes" to "anon";

grant select on table "public"."release_notes" to "anon";

grant trigger on table "public"."release_notes" to "anon";

grant truncate on table "public"."release_notes" to "anon";

grant update on table "public"."release_notes" to "anon";

grant delete on table "public"."release_notes" to "authenticated";

grant insert on table "public"."release_notes" to "authenticated";

grant references on table "public"."release_notes" to "authenticated";

grant select on table "public"."release_notes" to "authenticated";

grant trigger on table "public"."release_notes" to "authenticated";

grant truncate on table "public"."release_notes" to "authenticated";

grant update on table "public"."release_notes" to "authenticated";

grant delete on table "public"."release_notes" to "service_role";

grant insert on table "public"."release_notes" to "service_role";

grant references on table "public"."release_notes" to "service_role";

grant select on table "public"."release_notes" to "service_role";

grant trigger on table "public"."release_notes" to "service_role";

grant truncate on table "public"."release_notes" to "service_role";

grant update on table "public"."release_notes" to "service_role";

grant delete on table "public"."ssl_certificates" to "anon";

grant insert on table "public"."ssl_certificates" to "anon";

grant references on table "public"."ssl_certificates" to "anon";

grant select on table "public"."ssl_certificates" to "anon";

grant trigger on table "public"."ssl_certificates" to "anon";

grant truncate on table "public"."ssl_certificates" to "anon";

grant update on table "public"."ssl_certificates" to "anon";

grant delete on table "public"."ssl_certificates" to "authenticated";

grant insert on table "public"."ssl_certificates" to "authenticated";

grant references on table "public"."ssl_certificates" to "authenticated";

grant select on table "public"."ssl_certificates" to "authenticated";

grant trigger on table "public"."ssl_certificates" to "authenticated";

grant truncate on table "public"."ssl_certificates" to "authenticated";

grant update on table "public"."ssl_certificates" to "authenticated";

grant delete on table "public"."ssl_certificates" to "service_role";

grant insert on table "public"."ssl_certificates" to "service_role";

grant references on table "public"."ssl_certificates" to "service_role";

grant select on table "public"."ssl_certificates" to "service_role";

grant trigger on table "public"."ssl_certificates" to "service_role";

grant truncate on table "public"."ssl_certificates" to "service_role";

grant update on table "public"."ssl_certificates" to "service_role";

grant delete on table "public"."ssl_challenges" to "anon";

grant insert on table "public"."ssl_challenges" to "anon";

grant references on table "public"."ssl_challenges" to "anon";

grant select on table "public"."ssl_challenges" to "anon";

grant trigger on table "public"."ssl_challenges" to "anon";

grant truncate on table "public"."ssl_challenges" to "anon";

grant update on table "public"."ssl_challenges" to "anon";

grant delete on table "public"."ssl_challenges" to "authenticated";

grant insert on table "public"."ssl_challenges" to "authenticated";

grant references on table "public"."ssl_challenges" to "authenticated";

grant select on table "public"."ssl_challenges" to "authenticated";

grant trigger on table "public"."ssl_challenges" to "authenticated";

grant truncate on table "public"."ssl_challenges" to "authenticated";

grant update on table "public"."ssl_challenges" to "authenticated";

grant delete on table "public"."ssl_challenges" to "service_role";

grant insert on table "public"."ssl_challenges" to "service_role";

grant references on table "public"."ssl_challenges" to "service_role";

grant select on table "public"."ssl_challenges" to "service_role";

grant trigger on table "public"."ssl_challenges" to "service_role";

grant truncate on table "public"."ssl_challenges" to "service_role";

grant update on table "public"."ssl_challenges" to "service_role";

grant delete on table "public"."subscribers" to "anon";

grant insert on table "public"."subscribers" to "anon";

grant references on table "public"."subscribers" to "anon";

grant select on table "public"."subscribers" to "anon";

grant trigger on table "public"."subscribers" to "anon";

grant truncate on table "public"."subscribers" to "anon";

grant update on table "public"."subscribers" to "anon";

grant delete on table "public"."subscribers" to "authenticated";

grant insert on table "public"."subscribers" to "authenticated";

grant references on table "public"."subscribers" to "authenticated";

grant select on table "public"."subscribers" to "authenticated";

grant trigger on table "public"."subscribers" to "authenticated";

grant truncate on table "public"."subscribers" to "authenticated";

grant update on table "public"."subscribers" to "authenticated";

grant delete on table "public"."subscribers" to "service_role";

grant insert on table "public"."subscribers" to "service_role";

grant references on table "public"."subscribers" to "service_role";

grant select on table "public"."subscribers" to "service_role";

grant trigger on table "public"."subscribers" to "service_role";

grant truncate on table "public"."subscribers" to "service_role";

grant update on table "public"."subscribers" to "service_role";

grant delete on table "public"."templates" to "anon";

grant insert on table "public"."templates" to "anon";

grant references on table "public"."templates" to "anon";

grant select on table "public"."templates" to "anon";

grant trigger on table "public"."templates" to "anon";

grant truncate on table "public"."templates" to "anon";

grant update on table "public"."templates" to "anon";

grant delete on table "public"."templates" to "authenticated";

grant insert on table "public"."templates" to "authenticated";

grant references on table "public"."templates" to "authenticated";

grant select on table "public"."templates" to "authenticated";

grant trigger on table "public"."templates" to "authenticated";

grant truncate on table "public"."templates" to "authenticated";

grant update on table "public"."templates" to "authenticated";

grant delete on table "public"."templates" to "service_role";

grant insert on table "public"."templates" to "service_role";

grant references on table "public"."templates" to "service_role";

grant select on table "public"."templates" to "service_role";

grant trigger on table "public"."templates" to "service_role";

grant truncate on table "public"."templates" to "service_role";

grant update on table "public"."templates" to "service_role";

grant delete on table "public"."ticket_cache" to "anon";

grant insert on table "public"."ticket_cache" to "anon";

grant references on table "public"."ticket_cache" to "anon";

grant select on table "public"."ticket_cache" to "anon";

grant trigger on table "public"."ticket_cache" to "anon";

grant truncate on table "public"."ticket_cache" to "anon";

grant update on table "public"."ticket_cache" to "anon";

grant delete on table "public"."ticket_cache" to "authenticated";

grant insert on table "public"."ticket_cache" to "authenticated";

grant references on table "public"."ticket_cache" to "authenticated";

grant select on table "public"."ticket_cache" to "authenticated";

grant trigger on table "public"."ticket_cache" to "authenticated";

grant truncate on table "public"."ticket_cache" to "authenticated";

grant update on table "public"."ticket_cache" to "authenticated";

grant delete on table "public"."ticket_cache" to "service_role";

grant insert on table "public"."ticket_cache" to "service_role";

grant references on table "public"."ticket_cache" to "service_role";

grant select on table "public"."ticket_cache" to "service_role";

grant trigger on table "public"."ticket_cache" to "service_role";

grant truncate on table "public"."ticket_cache" to "service_role";

grant update on table "public"."ticket_cache" to "service_role";

grant delete on table "public"."user_oauth_states" to "anon";

grant insert on table "public"."user_oauth_states" to "anon";

grant references on table "public"."user_oauth_states" to "anon";

grant select on table "public"."user_oauth_states" to "anon";

grant trigger on table "public"."user_oauth_states" to "anon";

grant truncate on table "public"."user_oauth_states" to "anon";

grant update on table "public"."user_oauth_states" to "anon";

grant delete on table "public"."user_oauth_states" to "authenticated";

grant insert on table "public"."user_oauth_states" to "authenticated";

grant references on table "public"."user_oauth_states" to "authenticated";

grant select on table "public"."user_oauth_states" to "authenticated";

grant trigger on table "public"."user_oauth_states" to "authenticated";

grant truncate on table "public"."user_oauth_states" to "authenticated";

grant update on table "public"."user_oauth_states" to "authenticated";

grant delete on table "public"."user_oauth_states" to "service_role";

grant insert on table "public"."user_oauth_states" to "service_role";

grant references on table "public"."user_oauth_states" to "service_role";

grant select on table "public"."user_oauth_states" to "service_role";

grant trigger on table "public"."user_oauth_states" to "service_role";

grant truncate on table "public"."user_oauth_states" to "service_role";

grant update on table "public"."user_oauth_states" to "service_role";

create policy "Organizations can delete their own AI context"
on "public"."ai_context"
as permissive
for delete
to public
using ((organization_id = auth.uid()));


create policy "Organizations can insert their own AI context"
on "public"."ai_context"
as permissive
for insert
to public
with check ((organization_id = auth.uid()));


create policy "Organizations can update their own AI context"
on "public"."ai_context"
as permissive
for update
to public
using ((organization_id = auth.uid()))
with check ((organization_id = auth.uid()));


create policy "Organizations can view their own AI context"
on "public"."ai_context"
as permissive
for select
to public
using ((organization_id = auth.uid()));


create policy "Users can manage CSS history for their organization"
on "public"."css_customization_history"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


create policy "Users can view CSS history for their organization"
on "public"."css_customization_history"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Anyone can view public CSS themes"
on "public"."css_themes"
as permissive
for select
to public
using ((is_public = true));


create policy "Users can create CSS themes"
on "public"."css_themes"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "Users can delete their own CSS themes"
on "public"."css_themes"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "Users can update their own CSS themes"
on "public"."css_themes"
as permissive
for update
to public
using ((created_by = auth.uid()));


create policy "Users can view their own CSS themes"
on "public"."css_themes"
as permissive
for select
to public
using ((created_by = auth.uid()));


create policy "Users can manage their own domain verifications"
on "public"."domain_verifications"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


create policy "integrations_policy"
on "public"."integrations"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can access their own oauth states"
on "public"."oauth_states"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "organization_members_delete_policy"
on "public"."organization_members"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "organization_members_insert_policy"
on "public"."organization_members"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "organization_members_select_policy"
on "public"."organization_members"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "organization_members_update_policy"
on "public"."organization_members"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "org_delete_working"
on "public"."organizations"
as permissive
for delete
to public
using (true);


create policy "org_insert_working"
on "public"."organizations"
as permissive
for insert
to public
with check (true);


create policy "org_select_working"
on "public"."organizations"
as permissive
for select
to public
using (true);


create policy "org_update_working"
on "public"."organizations"
as permissive
for update
to public
using (true);


create policy "Users can manage categories for their organization"
on "public"."release_note_categories"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text]))))));


create policy "Users can view categories for their organization"
on "public"."release_note_categories"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can manage collaborators for their organization's release"
on "public"."release_note_collaborators"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM release_notes
  WHERE ((release_notes.id = release_note_collaborators.release_note_id) AND (release_notes.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])))))))));


create policy "Users can view collaborators for their organization's release n"
on "public"."release_note_collaborators"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM release_notes
  WHERE ((release_notes.id = release_note_collaborators.release_note_id) AND (release_notes.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can insert publishing history for their organization's re"
on "public"."release_note_publishing_history"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM release_notes
  WHERE ((release_notes.id = release_note_publishing_history.release_note_id) AND (release_notes.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can view publishing history for their organization's rele"
on "public"."release_note_publishing_history"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM release_notes
  WHERE ((release_notes.id = release_note_publishing_history.release_note_id) AND (release_notes.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can insert versions for their organization's release note"
on "public"."release_note_versions"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM release_notes
  WHERE ((release_notes.id = release_note_versions.release_note_id) AND (release_notes.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can view versions for their organization's release notes"
on "public"."release_note_versions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM release_notes
  WHERE ((release_notes.id = release_note_versions.release_note_id) AND (release_notes.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Anyone can view published release notes"
on "public"."release_notes"
as permissive
for select
to public
using ((status = 'published'::text));


create policy "Users can delete release notes for their organizations"
on "public"."release_notes"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = release_notes.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can insert release notes for their organizations"
on "public"."release_notes"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = release_notes.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can update release notes for their organizations"
on "public"."release_notes"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = release_notes.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can view release notes for their organizations"
on "public"."release_notes"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = release_notes.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "release_notes_policy"
on "public"."release_notes"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can manage SSL certificates for their organization"
on "public"."ssl_certificates"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


create policy "Users can view SSL certificates for their organization"
on "public"."ssl_certificates"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can manage SSL challenges for their organization"
on "public"."ssl_challenges"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


create policy "Users can view SSL challenges for their organization"
on "public"."ssl_challenges"
as permissive
for select
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can delete subscribers for their organizations"
on "public"."subscribers"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = subscribers.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can insert subscribers for their organizations"
on "public"."subscribers"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = subscribers.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can update subscribers for their organizations"
on "public"."subscribers"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = subscribers.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can view subscribers for their organizations"
on "public"."subscribers"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = subscribers.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "subscribers_policy"
on "public"."subscribers"
as permissive
for all
to public
using ((organization_id IN ( SELECT organization_members.organization_id
   FROM organization_members
  WHERE (organization_members.user_id = auth.uid()))));


create policy "Users can delete templates for their organizations"
on "public"."templates"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = templates.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can insert templates for their organizations"
on "public"."templates"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = templates.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can manage templates in their organization"
on "public"."templates"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Users can update templates for their organizations"
on "public"."templates"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = templates.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can view templates for their organizations"
on "public"."templates"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organizations
  WHERE ((organizations.id = templates.organization_id) AND (organizations.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can access ticket cache for their organization"
on "public"."ticket_cache"
as permissive
for all
to public
using ((organization_id IN ( SELECT om.organization_id
   FROM organization_members om
  WHERE (om.user_id = auth.uid()))));


create policy "Users can delete ticket cache for their organizations"
on "public"."ticket_cache"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM (integrations i
     JOIN organizations o ON ((i.organization_id = o.id)))
  WHERE ((i.id = ticket_cache.integration_id) AND (o.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can insert ticket cache for their organizations"
on "public"."ticket_cache"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM (integrations i
     JOIN organizations o ON ((i.organization_id = o.id)))
  WHERE ((i.id = ticket_cache.integration_id) AND (o.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can update ticket cache for their organizations"
on "public"."ticket_cache"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM (integrations i
     JOIN organizations o ON ((i.organization_id = o.id)))
  WHERE ((i.id = ticket_cache.integration_id) AND (o.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "Users can view ticket cache for their organizations"
on "public"."ticket_cache"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (integrations i
     JOIN organizations o ON ((i.organization_id = o.id)))
  WHERE ((i.id = ticket_cache.integration_id) AND (o.id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = auth.uid())))))));


create policy "ticket_cache_policy"
on "public"."ticket_cache"
as permissive
for all
to public
using ((integration_id IN ( SELECT i.id
   FROM (integrations i
     JOIN organization_members om ON ((i.organization_id = om.organization_id)))
  WHERE (om.user_id = auth.uid()))));


create policy "Users can manage their own OAuth states"
on "public"."user_oauth_states"
as permissive
for all
to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_ai_context_updated_at_trigger BEFORE UPDATE ON public.ai_context FOR EACH ROW EXECUTE FUNCTION update_ai_context_updated_at();

CREATE TRIGGER update_css_themes_updated_at BEFORE UPDATE ON public.css_themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domain_verifications_updated_at BEFORE UPDATE ON public.domain_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_release_note_categories_updated_at BEFORE UPDATE ON public.release_note_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_release_notes_updated_at BEFORE UPDATE ON public.release_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ssl_certificates_updated_at BEFORE UPDATE ON public.ssl_certificates FOR EACH ROW EXECUTE FUNCTION update_ssl_certificates_updated_at();


