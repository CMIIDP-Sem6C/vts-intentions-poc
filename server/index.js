import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import pg from 'pg';
import { MOCK_SHIPS } from '../src/data/mockShips.js';

const SCENARIO_SHIP_ID_PREFIX = 'ship-';

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3001);
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Add it in your .env file.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(express.json());

let columns;
let shipIdDataType = 'text';
const APP_SHIP_IDS = MOCK_SHIPS.map((ship) => ship.id);

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getColumnByName(name) {
  return columns.find((col) => col.toLowerCase() === name.toLowerCase());
}

async function loadVerificationColumns() {
  const result = await pool.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Verification'
     ORDER BY ordinal_position`
  );
  columns = result.rows.map((row) => row.column_name);
  const shipIdMeta = result.rows.find((row) => row.column_name.toLowerCase() === 'ship_id');
  shipIdDataType = shipIdMeta?.data_type || 'text';
}

function isNumericShipIdColumn() {
  return shipIdDataType === 'integer' || shipIdDataType === 'bigint' || shipIdDataType === 'smallint';
}

function getDbShipIdForAppShipId(appShipId) {
  if (typeof appShipId === 'string' && appShipId.startsWith(SCENARIO_SHIP_ID_PREFIX)) {
    const num = Number(appShipId.slice(SCENARIO_SHIP_ID_PREFIX.length));
    if (Number.isFinite(num)) return isNumericShipIdColumn() ? num : String(num);
  }
  if (!isNumericShipIdColumn()) return appShipId;
  const index = APP_SHIP_IDS.indexOf(appShipId);
  if (index === -1) return null;
  return index + 1;
}

function getAppShipIdFromDbShipId(dbShipId) {
  if (dbShipId == null) return null;
  return `${SCENARIO_SHIP_ID_PREFIX}${dbShipId}`;
}

function normalizeRow(row) {
  const idColumn = getColumnByName('id');
  const shipIdColumn = getColumnByName('ship_id');
  const verifiedColumn = getColumnByName('verified');
  const destinationColumn = getColumnByName('destination');

  return {
    id: idColumn ? row[idColumn] : null,
    ship_id: shipIdColumn ? getAppShipIdFromDbShipId(row[shipIdColumn]) : null,
    verified: verifiedColumn ? Boolean(row[verifiedColumn]) : false,
    destination: destinationColumn ? row[destinationColumn] : null,
  };
}

async function bootstrapVerificationRows() {
  const shipIdColumn = getColumnByName('ship_id');
  const verifiedColumn = getColumnByName('verified');
  const destinationColumn = getColumnByName('destination');

  if (!shipIdColumn || !verifiedColumn) {
    throw new Error('Verification table is missing required columns: ship_id and verified.');
  }

  let inserted = 0;
  let skipped = 0;

  for (const ship of MOCK_SHIPS) {
    const dbShipId = getDbShipIdForAppShipId(ship.id);
    if (dbShipId == null) {
      skipped += 1;
      continue;
    }

    const existsResult = await pool.query(
      `SELECT 1
       FROM "Verification"
       WHERE ${quoteIdentifier(shipIdColumn)} = $1
       LIMIT 1`,
      [dbShipId]
    );

    if (existsResult.rowCount > 0) {
      skipped += 1;
      continue;
    }

    const insertColumns = [quoteIdentifier(shipIdColumn), quoteIdentifier(verifiedColumn)];
    const insertValues = [dbShipId, false];
    const insertParams = ['$1', '$2'];

    if (destinationColumn) {
      insertColumns.push(quoteIdentifier(destinationColumn));
      insertValues.push(ship.destination === 'Unknown' ? null : ship.destination);
      insertParams.push(`$${insertValues.length}`);
    }

    await pool.query(
      `INSERT INTO "Verification" (${insertColumns.join(', ')})
       VALUES (${insertParams.join(', ')})`,
      insertValues
    );
    inserted += 1;
  }

  return {
    totalShips: MOCK_SHIPS.length,
    inserted,
    skipped,
  };
}

function parseRouteText(routeText) {
  if (!routeText || typeof routeText !== 'string') return [];
  const cleaned = routeText.replace(/,\s*\]/g, ']').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((pt) => Array.isArray(pt) && pt.length === 2)
      .map((pt) => [Number(pt[0]), Number(pt[1])]);
  } catch {
    return [];
  }
}

function parseStartCoordinate(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/,\s*\]/g, ']').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === 'number') {
      return [Number(parsed[0]), Number(parsed[1])];
    }
    if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
      return [Number(parsed[0][0]), Number(parsed[0][1])];
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeScenarioRow(row) {
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name.trim() : row.name,
    description: row.description,
    time: row.time,
    sector_id: row.sector_id,
    start_coordinate: parseStartCoordinate(row.start_coordinate),
  };
}

function normalizeShipRow(row) {
  return {
    id: `ship-${row.id}`,
    dbId: row.id,
    name: row.name,
    nationality: row.nationality,
    markerType: row.markertype || 'triangle',
    shipType: row.shiptype,
    destination: row.destination || 'Unknown',
    cargo: row.cargo,
    aisActive: Boolean(row.aisactive),
    aisStatus: row.aisstatus,
    speed: row.speed != null ? Number(row.speed) : 5,
    waypoints: parseRouteText(row.route),
    operatorNotes: [],
    scenarioId: row.scenario_id,
  };
}

function normalizeIntentionRow(row) {
  return {
    id: row.id,
    shipId: `ship-${row.ship_id}`,
    dbShipId: row.ship_id,
    name: typeof row.name === 'string' ? row.name.trim() : row.name,
    description: row.description,
    route: parseRouteText(row.intention_route),
  };
}

function normalizeEventRow(row) {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    type: row.type,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    triggerTime: row.trigger_time,
  };
}

app.get('/api/scenarios', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, time, sector_id, start_coordinate FROM "Scenario" ORDER BY id ASC'
    );
    res.json(result.rows.map(normalizeScenarioRow));
  } catch (error) {
    console.error('Failed to fetch scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

app.get('/api/scenarios/:id', async (req, res) => {
  const scenarioId = Number(req.params.id);
  if (!Number.isFinite(scenarioId)) {
    return res.status(400).json({ error: 'Invalid scenario id' });
  }

  try {
    const scenarioResult = await pool.query(
      'SELECT id, name, description, time, sector_id, start_coordinate FROM "Scenario" WHERE id = $1',
      [scenarioId]
    );
    if (scenarioResult.rowCount === 0) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    const scenario = normalizeScenarioRow(scenarioResult.rows[0]);

    const shipsResult = await pool.query(
      'SELECT * FROM "Ship" WHERE scenario_id = $1 ORDER BY id ASC',
      [scenarioId]
    );
    const ships = shipsResult.rows.map(normalizeShipRow);
    const shipDbIds = ships.map((s) => s.dbId);

    let intentions = [];
    if (shipDbIds.length > 0) {
      const intentionResult = await pool.query(
        'SELECT id, ship_id, intention_route, name, description FROM "Intention" WHERE ship_id = ANY($1::int[]) ORDER BY id ASC',
        [shipDbIds]
      );
      intentions = intentionResult.rows.map(normalizeIntentionRow);
    }

    const eventsResult = await pool.query(
      'SELECT id, scenario_id, type, subject_type, subject_id, trigger_time FROM "Event" WHERE scenario_id = $1 ORDER BY trigger_time ASC, id ASC',
      [scenarioId]
    );
    const events = eventsResult.rows.map(normalizeEventRow);

    res.json({ scenario, ships, intentions, events });
  } catch (error) {
    console.error('Failed to fetch scenario detail:', error);
    res.status(500).json({ error: 'Failed to fetch scenario detail' });
  }
});

app.get('/api/verifications', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Verification"');
    res.json(result.rows.map(normalizeRow).filter((row) => row.ship_id));
  } catch (error) {
    console.error('Failed to fetch verifications:', error);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

app.patch('/api/verifications/:shipId', async (req, res) => {
  const appShipId = req.params.shipId;
  const { verified, destination } = req.body;

  if (verified === undefined && destination === undefined) {
    return res.status(400).json({ error: 'No updates provided.' });
  }

  try {
    const shipId = getDbShipIdForAppShipId(appShipId);
    if (shipId == null) {
      return res.status(400).json({ error: `Unknown ship id: ${appShipId}` });
    }

    const shipIdColumn = getColumnByName('ship_id');
    const verifiedColumn = getColumnByName('verified');
    const destinationColumn = getColumnByName('destination');

    if (!shipIdColumn || !verifiedColumn) {
      return res.status(500).json({ error: 'Verification table is missing required columns.' });
    }

    const updateParts = [];
    const updateValues = [];
    let param = 1;

    if (verified !== undefined) {
      updateParts.push(`${quoteIdentifier(verifiedColumn)} = $${param++}`);
      updateValues.push(Boolean(verified));
    }
    if (destination !== undefined && destinationColumn) {
      updateParts.push(`${quoteIdentifier(destinationColumn)} = $${param++}`);
      updateValues.push(destination);
    }
    if (updateParts.length === 0) {
      return res.status(400).json({ error: 'No writable columns were provided.' });
    }

    updateValues.push(shipId);
    const shipIdParam = `$${param}`;

    const updateResult = await pool.query(
      `UPDATE "Verification"
       SET ${updateParts.join(', ')}
       WHERE ${quoteIdentifier(shipIdColumn)} = ${shipIdParam}
       RETURNING *`,
      updateValues
    );

    if (updateResult.rowCount > 0) {
      return res.json(normalizeRow(updateResult.rows[0]));
    }

    const insertColumns = [quoteIdentifier(shipIdColumn), quoteIdentifier(verifiedColumn)];
    const insertValues = [shipId, Boolean(verified)];
    const insertParams = ['$1', '$2'];

    if (destinationColumn) {
      insertColumns.push(quoteIdentifier(destinationColumn));
      insertValues.push(destination ?? null);
      insertParams.push(`$${insertValues.length}`);
    }

    const insertResult = await pool.query(
      `INSERT INTO "Verification" (${insertColumns.join(', ')})
       VALUES (${insertParams.join(', ')})
       RETURNING *`,
      insertValues
    );

    return res.json(normalizeRow(insertResult.rows[0]));
  } catch (error) {
    console.error('Failed to update verification:', error);
    return res.status(500).json({ error: 'Failed to update verification' });
  }
});

app.post('/api/verifications/bootstrap', async (_req, res) => {
  try {
    const result = await bootstrapVerificationRows();
    return res.json(result);
  } catch (error) {
    console.error('Failed to bootstrap verifications:', error);
    return res.status(500).json({ error: 'Failed to bootstrap verifications' });
  }
});

loadVerificationColumns()
  .then(() => {
    app.listen(port, () => {
      console.log(`Verification API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to bootstrap API:', error);
    process.exit(1);
  });
