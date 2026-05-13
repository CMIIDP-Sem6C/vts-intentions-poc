-- Reference schema for VTS scenario playback (adjust names via VTS_TBL_* env vars).
-- PostgreSQL: "time" is quoted because TIME is a reserved word.

CREATE TABLE IF NOT EXISTS scenario (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "time" INTEGER NOT NULL,
  sector_id INTEGER,
  start_coordinate JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS ship (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT,
  markertype TEXT,
  shiptype TEXT,
  destination TEXT,
  cargo TEXT,
  aisactive BOOLEAN NOT NULL DEFAULT false,
  aisstatus TEXT,
  speed DOUBLE PRECISION NOT NULL DEFAULT 5,
  route JSONB NOT NULL,
  operatornotes JSONB,
  scenarioid INTEGER NOT NULL REFERENCES scenario (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS intention (
  id SERIAL PRIMARY KEY,
  ship_id INTEGER NOT NULL REFERENCES ship (id) ON DELETE CASCADE,
  intention_route JSONB NOT NULL,
  name TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS scenario_event (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES scenario (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  trigger_time DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- Sample data (idempotent-ish: delete by scenario name first)
DELETE FROM scenario_event WHERE scenario_id IN (SELECT id FROM scenario WHERE name = 'test_scenario');
DELETE FROM intention WHERE ship_id IN (SELECT id FROM ship WHERE scenarioid IN (SELECT id FROM scenario WHERE name = 'test_scenario'));
DELETE FROM ship WHERE scenarioid IN (SELECT id FROM scenario WHERE name = 'test_scenario');
DELETE FROM scenario WHERE name = 'test_scenario';

INSERT INTO scenario (id, name, description, "time", sector_id, start_coordinate)
VALUES (
  1,
  'test_scenario',
  'Scenario om functionaliteit te testen',
  120,
  1,
  '[51.9164, 4.4930]'::jsonb
);

INSERT INTO ship (
  id, name, nationality, markertype, shiptype, destination, cargo,
  aisactive, aisstatus, speed, route, operatornotes, scenarioid
) VALUES (
  1,
  'michigan',
  'DE',
  'triangle',
  'Binnenvaart',
  'Wijnhaven',
  'Geen',
  false,
  'Active',
  5,
  '[
    [51.8937, 4.3346],
    [51.8970, 4.3501],
    [51.8989, 4.3646],
    [51.8966, 4.3841],
    [51.8976, 4.4028],
    [51.9004, 4.4158],
    [51.9016, 4.4242],
    [51.9014, 4.4352]
  ]'::jsonb,
  '[
    {"channel": "VHF60", "location": "Waalhaven", "time": "10m 05s geleden", "note": "Niks speciaals bij de Michigan, geen bijzonderheden."},
    {"channel": "VHF81", "location": "Pernis", "time": "1h 11m geleden", "note": "Michigan passeert Pernis, geen bijzonderheden."}
  ]'::jsonb,
  1
);

INSERT INTO intention (id, ship_id, intention_route, name, description) VALUES
(
  1,
  1,
  '[
    [51.8937, 4.3346],
    [51.8970, 4.3501],
    [51.8989, 4.3646],
    [51.8966, 4.3841],
    [51.8976, 4.4028],
    [51.9004, 4.4158],
    [51.9016, 4.4242],
    [51.9014, 4.4352]
  ]'::jsonb,
  'initieleroute',
  'eerste route'
),
(
  2,
  1,
  '[
    [51.8935, 4.3197],
    [51.8935, 4.3346],
    [51.8968, 4.3501],
    [51.8987, 4.3646],
    [51.8964, 4.3841],
    [51.8974, 4.4028]
  ]'::jsonb,
  'latereroute',
  'tweede route'
);

INSERT INTO scenario_event (id, scenario_id, type, subject_type, subject_id, trigger_time) VALUES
(1, 1, 'SpawnShip', 'ship', 1, 0),
(2, 1, 'HideIntention', 'ship', 1, 20),
(3, 1, 'ShowIntention', 'ship', 1, 45);

SELECT setval(pg_get_serial_sequence('scenario', 'id'), (SELECT COALESCE(MAX(id), 1) FROM scenario));
SELECT setval(pg_get_serial_sequence('ship', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ship));
SELECT setval(pg_get_serial_sequence('intention', 'id'), (SELECT COALESCE(MAX(id), 1) FROM intention));
SELECT setval(pg_get_serial_sequence('scenario_event', 'id'), (SELECT COALESCE(MAX(id), 1) FROM scenario_event));
