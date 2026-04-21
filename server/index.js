import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import pg from 'pg';
import { MOCK_SHIPS } from '../src/data/mockShips.js';

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
  if (!isNumericShipIdColumn()) return appShipId;
  const index = APP_SHIP_IDS.indexOf(appShipId);
  if (index === -1) return null;
  return index + 1;
}

function getAppShipIdFromDbShipId(dbShipId) {
  if (!isNumericShipIdColumn()) return String(dbShipId);
  const index = Number(dbShipId) - 1;
  return APP_SHIP_IDS[index] || null;
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
