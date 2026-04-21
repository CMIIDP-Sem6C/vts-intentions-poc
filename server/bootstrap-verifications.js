import 'dotenv/config';
import pg from 'pg';
import { MOCK_SHIPS } from '../src/data/mockShips.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Add it in your .env file.');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main() {
  const columnsResult = await pool.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Verification'
     ORDER BY ordinal_position`
  );
  const columns = columnsResult.rows.map((row) => row.column_name);
  const getColumnByName = (name) => columns.find((col) => col.toLowerCase() === name.toLowerCase());
  const shipIdMeta = columnsResult.rows.find((row) => row.column_name.toLowerCase() === 'ship_id');
  const shipIdDataType = shipIdMeta?.data_type || 'text';
  const isNumericShipIdColumn = ['integer', 'bigint', 'smallint'].includes(shipIdDataType);
  const appShipIds = MOCK_SHIPS.map((ship) => ship.id);

  const shipIdColumn = getColumnByName('ship_id');
  const verifiedColumn = getColumnByName('verified');
  const destinationColumn = getColumnByName('destination');

  if (!shipIdColumn || !verifiedColumn) {
    throw new Error('Verification table is missing required columns: ship_id and verified.');
  }

  let inserted = 0;
  let skipped = 0;

  for (const ship of MOCK_SHIPS) {
    const dbShipId = isNumericShipIdColumn ? appShipIds.indexOf(ship.id) + 1 : ship.id;
    if (!dbShipId) {
      skipped += 1;
      continue;
    }

    const existsResult = await pool.query(
      `SELECT 1 FROM "Verification" WHERE ${quoteIdentifier(shipIdColumn)} = $1 LIMIT 1`,
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

  console.log(
    `Bootstrap done. Total ships: ${MOCK_SHIPS.length}, inserted: ${inserted}, skipped: ${skipped}`
  );
}

main()
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
