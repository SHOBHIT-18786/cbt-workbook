/**
 * Database migration utility
 * Runs pending SQL migration files in order
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Create a PostgreSQL connection pool using environment variables
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  ssl: process.env.PGSSLMODE === 'require' ? true : false
});

async function ensureMigrationsTable() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migrations table ready');
  } catch (error) {
    console.error('Error ensuring migrations table exists:', error);
    throw error;
  }
}

async function getAppliedMigrations() {
  try {
    const result = await pool.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('Error fetching applied migrations:', error);
    throw error;
  }
}

/**
 * @param {string} migrationFile - The migration file name
 */
async function applyMigration(migrationFile) {
  const filePath = path.join(__dirname, '..', 'migrations', migrationFile);
  const sql = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Apply the migration SQL
    await client.query(sql);

    // Record that the migration was applied
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [migrationFile]
    );

    await client.query('COMMIT');
    console.log(Applied migration: ${migrationFile});
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(Failed to apply migration ${migrationFile}:, error);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();

    // Get list of migrations that have already been applied
    const appliedMigrations = await getAppliedMigrations();

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    // Determine which migrations haven't been applied yet
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return;
    }

    console.log(Found ${pendingMigrations.length} pending migrations);

    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }

    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migrations
runMigrations();