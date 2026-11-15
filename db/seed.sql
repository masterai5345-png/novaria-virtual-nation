-- NOVARIA founding seed data.
-- Run after schema.sql. Safe to re-run: inserts are idempotent.

-- Migrate the original otter leader into the bear mayor persona without creating a second active leader.
UPDATE city_leaders
SET leader_key = 'mayor-bear',
    display_name = 'Pak Wali Kota Beruang',
    species = 'bear',
    title = 'Mayor',
    is_active = TRUE,
    profile = '{"role":"official in-world city leader","visual_identity":"friendly bear mayor in a tailored navy civic jacket, warm red tie and gold city badge"}'::jsonb
WHERE leader_key = 'mayor-otti';

INSERT INTO city_leaders (leader_key, display_name, species, title, is_active, profile)
VALUES (
  'mayor-bear',
  'Pak Wali Kota Beruang',
  'bear',
  'Mayor',
  TRUE,
  '{"role":"official in-world city leader","visual_identity":"friendly bear mayor in a tailored navy civic jacket, warm red tie and gold city badge"}'::jsonb
)
ON CONFLICT (leader_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    species = EXCLUDED.species,
    title = EXCLUDED.title,
    is_active = TRUE,
    profile = EXCLUDED.profile;

INSERT INTO districts (slug, name, district_type, description, map_config)
VALUES
  ('city-hall', 'City Hall District', 'government', 'The civic center and office of Pak Wali Kota Beruang.', '{"starter_zone":true}'::jsonb),
  ('harbor-view', 'Harbor View', 'residential', 'The first neighborhood of modern starter and family homes.', '{"starter_zone":true}'::jsonb),
  ('market-square', 'Market Square', 'commercial', 'A walkable market and local business area.', '{"starter_zone":true}'::jsonb),
  ('green-common', 'Green Common', 'social', 'Parks, community spaces and public recreation.', '{"starter_zone":true}'::jsonb),
  ('waterfront', 'Waterfront Promenade', 'harbor', 'A coastal public promenade and harbor walkway.', '{"starter_zone":true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

UPDATE agent_definitions
SET agent_key = 'mayor-bear',
    display_name = 'Pak Wali Kota Beruang',
    description = 'Produces civic messages from verified city records.'
WHERE agent_key = 'mayor-otti';

INSERT INTO agent_definitions (agent_key, display_name, department, description, enabled)
VALUES
  ('ceo-orchestrator', 'CEO Orchestrator', 'executive', 'Routes owner instructions to scoped specialist jobs.', FALSE),
  ('mayor-bear', 'Pak Wali Kota Beruang', 'city-government', 'Produces civic messages from verified city records.', FALSE),
  ('growth-monitor', 'Growth Monitor', 'city-development', 'Reads verified social audience metrics using approved APIs.', FALSE),
  ('population-registrar', 'Population Registrar', 'city-development', 'Stores snapshots and computes verified net growth.', FALSE),
  ('urban-planner', 'Urban Planner', 'city-development', 'Plans districts, plots and streets within city rules.', FALSE),
  ('house-construction', 'House Construction', 'city-development', 'Creates idempotent construction events and house records.', FALSE),
  ('city-beautification', 'City Beautification', 'city-development', 'Proposes parks, landscaping, lighting and visual improvements.', FALSE),
  ('content-researcher', 'Content Researcher', 'media', 'Finds stories grounded in approved city events.', FALSE),
  ('scriptwriter', 'Scriptwriter', 'media', 'Drafts original episode scripts from verified facts.', FALSE),
  ('fact-checker', 'Fact Checker', 'media', 'Checks figures and claims against city records.', FALSE),
  ('video-producer', 'Video Producer', 'media', 'Prepares capture and video-render jobs.', FALSE),
  ('community-reply', 'Community Reply', 'community', 'Drafts relevant replies and escalates sensitive topics.', FALSE),
  ('fraud-detection', 'Fraud Detection', 'trust', 'Flags suspicious activity for human review.', FALSE)
ON CONFLICT (agent_key) DO NOTHING;


INSERT INTO mission_definitions (mission_key, title, detail, reward_nvc, requirement)
VALUES
  ('welcome-to-novaria', 'Welcome to NOVARIA', 'Explore the town square and meet Pak Wali Kota Beruang.', 120, '{"type":"self-confirmed-exploration"}'::jsonb),
  ('visit-the-harbor', 'Visit the Harbor', 'Explore the waterfront district and discover the harbor.', 180, '{"type":"self-confirmed-exploration"}'::jsonb),
  ('help-the-town', 'Help the Town', 'Visit City Hall and review the latest town proposal.', 250, '{"type":"self-confirmed-exploration"}'::jsonb)
ON CONFLICT (mission_key) DO UPDATE
SET title = EXCLUDED.title,
    detail = EXCLUDED.detail,
    reward_nvc = EXCLUDED.reward_nvc,
    requirement = EXCLUDED.requirement;

INSERT INTO city_events (event_key, event_type, title, description, public_facts, visibility)
VALUES (
  'novaria-founding-town-preview-v1',
  'city_founding',
  'NOVARIA opens its founding town',
  'The first NOVARIA coastal town preview introduces Pak Wali Kota Beruang, the founding districts, and the modern starter-home neighborhood.',
  '{"mayor":"Pak Wali Kota Beruang","world_status":"browser-based 3D prototype","citizens_are_fictional":"true","money_rewards_enabled":false}'::jsonb,
  'public'
)
ON CONFLICT (event_key) DO NOTHING;


-- Founding community homes give newly registered citizens somewhere to start.
-- Stable plot keys and ON CONFLICT clauses make this seed safe to re-run.
WITH harbor AS (
  SELECT id FROM districts WHERE slug = 'harbor-view' LIMIT 1
),
new_plots AS (
  INSERT INTO home_plots (district_id, plot_key, position_x, position_z, rotation_y, plot_status)
  SELECT
    harbor.id,
    'founding:' || home_number::text,
    (((home_number - 1) % 8) * 3.8 - 13.3)::numeric(10,3),
    (floor((home_number - 1) / 8.0) * 3.6 - 4.0)::numeric(10,3),
    0,
    'built'
  FROM harbor
  CROSS JOIN generate_series(1, 16) AS home_number
  ON CONFLICT (plot_key) DO NOTHING
  RETURNING id
)
INSERT INTO houses (plot_id, house_type, design_key, house_status, visual_config)
SELECT
  plots.id,
  CASE WHEN split_part(plots.plot_key, ':', 2)::integer % 4 = 0 THEN 'family' ELSE 'starter' END,
  CASE WHEN split_part(plots.plot_key, ':', 2)::integer % 4 = 0 THEN 'modern-family-01' ELSE 'modern-starter-01' END,
  'community',
  jsonb_build_object('source', 'founding-neighborhood', 'model', 'procedural-modern-home')
FROM home_plots AS plots
WHERE plots.plot_key LIKE 'founding:%'
ON CONFLICT (plot_id) DO NOTHING;
