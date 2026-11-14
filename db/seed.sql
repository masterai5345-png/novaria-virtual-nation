-- NOVARIA founding seed data.
-- Run after schema.sql. Safe to re-run: inserts are idempotent.

INSERT INTO city_leaders (leader_key, display_name, species, title, is_active, profile)
VALUES (
  'mayor-otti',
  'Mayor Otti',
  'otter',
  'Mayor',
  TRUE,
  '{"role":"official in-world city leader","visual_identity":"otter mayor in teal civic jacket with gold city badge"}'::jsonb
)
ON CONFLICT (leader_key) DO NOTHING;

INSERT INTO districts (slug, name, district_type, description, map_config)
VALUES
  ('city-hall', 'City Hall District', 'government', 'The civic center and office of Mayor Otti.', '{"starter_zone":true}'::jsonb),
  ('harbor-view', 'Harbor View', 'residential', 'The first neighborhood of modern starter and family homes.', '{"starter_zone":true}'::jsonb),
  ('market-square', 'Market Square', 'commercial', 'A walkable market and local business area.', '{"starter_zone":true}'::jsonb),
  ('green-common', 'Green Common', 'social', 'Parks, community spaces and public recreation.', '{"starter_zone":true}'::jsonb),
  ('waterfront', 'Waterfront Promenade', 'harbor', 'A coastal public promenade and harbor walkway.', '{"starter_zone":true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO agent_definitions (agent_key, display_name, department, description, enabled)
VALUES
  ('ceo-orchestrator', 'CEO Orchestrator', 'executive', 'Routes owner instructions to scoped specialist jobs.', FALSE),
  ('mayor-otti', 'Mayor Otti', 'city-government', 'Produces civic messages from verified city records.', FALSE),
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
  ('welcome-to-novaria', 'Welcome to NOVARIA', 'Explore the town square and meet Mayor Otti.', 120, '{"type":"self-confirmed-exploration"}'::jsonb),
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
  'The first NOVARIA coastal town preview introduces Mayor Otti, the founding districts, and the modern starter-home neighborhood.',
  '{"mayor":"Mayor Otti","world_status":"browser-based 3D prototype","citizens_are_fictional":"true","money_rewards_enabled":false}'::jsonb,
  'public'
)
ON CONFLICT (event_key) DO NOTHING;
