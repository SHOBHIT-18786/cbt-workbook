/**
 * Database reset utility (DEVELOPMENT ONLY)
 * Drops all tables and re-runs all migrations
 */

const { Pool } = require("pg");
const { spawn } = require("child_process");
const path = require("path");

// Create a PostgreSQL connection pool using environment variables
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  ssl: process.env.PGSSLMODE === "require" ? true : false,
});

async function resetDatabase() {
  // Warning banner
  console.log("\x1b[41m\x1b[1m WARNING: THIS WILL DELETE ALL DATA! \x1b[0m");
  console.log("\x1b[33mThis script is for DEVELOPMENT use only.\x1b[0m");

  // Check if environment is production
  if (process.env.NODE_ENV === "production") {
    console.error(
      "\x1b[41m ABORT: Cannot run in production environment \x1b[0m"
    );
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log("Dropping all schemas and types...");
    await client.query(`
      DO $$
      DECLARE rec RECORD;
      BEGIN
        FOR rec IN (
          SELECT nspname
          FROM pg_namespace
          WHERE nspname NOT LIKE 'pg_%'
            AND nspname != 'information_schema'
        ) LOOP
          EXECUTE format('DROP SCHEMA %I CASCADE', rec.nspname);
        END LOOP;
      END$$;
    `);
    await client.query("CREATE SCHEMA public");

    console.log("Database reset complete!!!");
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  // Run migrations after reset
  console.log("Re-applying migrations......");
  runMigrations();
}

function runMigrations() {
  const migratePath = path.join(__dirname, "migrate.js");
  const migrate = spawn("node", [migratePath], { stdio: "inherit" });

  migrate.on("exit", (code) => {
    if (code === 0) {
      console.log("====Database reset and migrations complete====");
    } else {
      console.error("!!!!Failed to apply migrations after reset!!!!");
      process.exit(1);
    }
  });
}

// Run the reset
resetDatabase();
